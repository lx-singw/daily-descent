import { Position, DecodedGhostStep, DecodedGhostTrail } from '../../shared/types.js';
import { DUNGEON_HEIGHT, DUNGEON_WIDTH, MOVE_INTERVAL_MIN_MS, MAX_MOVE_LOG_BYTES, MAX_MOVE_STEPS, RUN_REQUEST_LATENCY_ALLOWANCE_MS } from '../../shared/constants.js';

export interface PathValidationResult {
  valid: boolean;
  reason?: string;
  decodedTrail?: DecodedGhostTrail;
}

/**
 * Compresses raw steps into the direction run-length encoded format with checkpoints.
 * Format: startX,startY,startTimeMs:U5:C,12,9,1200:R3:C,15,9,2000
 */
export function compressPath(
  startX: number,
  startY: number,
  startTimeMs: number,
  steps: { x: number; y: number; t: number }[]
): string {
  if (steps.length === 0) {
    return `${startX},${startY},${startTimeMs}:`;
  }

  const parts: string[] = [];
  parts.push(`${startX},${startY},${startTimeMs}`);

  let currentX = startX;
  let currentY = startY;
  let activeDirection = '';
  let activeCount = 0;
  let previousStep: { x: number; y: number; t: number } | undefined;

  const flushRun = () => {
    if (!previousStep || activeCount === 0) return;
    parts.push(`${activeDirection}${activeCount}`);
    parts.push(`C,${previousStep.x},${previousStep.y},${previousStep.t}`);
    activeCount = 0;
  };

  for (const step of steps) {
    const dx = step.x - currentX;
    const dy = step.y - currentY;
    const direction = dx === 1 && dy === 0
      ? 'R'
      : dx === -1 && dy === 0
        ? 'L'
        : dx === 0 && dy === 1
          ? 'D'
          : dx === 0 && dy === -1
            ? 'U'
            : dx === 0 && dy === 0
              ? 'W'
              : '';

    if (!direction) {
      throw new Error(`Cannot compress non-cardinal move from (${currentX}, ${currentY}) to (${step.x}, ${step.y})`);
    }

    if (activeDirection && direction !== activeDirection) flushRun();
    activeDirection = direction;
    activeCount++;
    currentX = step.x;
    currentY = step.y;
    previousStep = step;
  }

  flushRun();

  return parts.join(':');
}

/**
 * Validates and decodes a compressed move log string.
 * @param moveLog The compressed move log string.
 * @param isTileWalkable A function that returns true if a tile coordinate is walkable.
 * @param expectedEndPosition Optional expected final position of the run (to verify terminal state).
 * @param expectedDurationMs Optional overall run duration in ms.
 */
export function validateAndDecodePath(
  moveLog: string,
  username: string,
  isTileWalkable: (x: number, y: number) => boolean,
  expectedEndPosition?: Position,
  expectedDurationMs?: number,
  expectedStartPosition?: Position
): PathValidationResult {
  if (!moveLog) {
    return { valid: false, reason: 'Empty move log' };
  }

  if (moveLog.length > MAX_MOVE_LOG_BYTES) {
    return { valid: false, reason: `Move log size (${moveLog.length} bytes) exceeds limit` };
  }

  const segments = moveLog.split(':');
  if (segments.length < 1) {
    return { valid: false, reason: 'Invalid format: missing header' };
  }

  // Parse header
  const headerParts = segments[0].split(',');
  if (headerParts.length < 3) {
    return { valid: false, reason: 'Invalid header: must contain startX, startY, and startTime' };
  }

  const startX = parseFloat(headerParts[0]);
  const startY = parseFloat(headerParts[1]);
  const startTimeMs = parseFloat(headerParts[2]);

  if (!Number.isFinite(startX) || !Number.isFinite(startY) || !Number.isFinite(startTimeMs) || !Number.isInteger(startTimeMs) || startTimeMs < 0) {
    return { valid: false, reason: 'Invalid header values' };
  }

  // Check integer type & bounds
  if (!Number.isInteger(startX) || !Number.isInteger(startY)) {
    return { valid: false, reason: 'Header coordinates must be integers' };
  }

  if (startX < 0 || startX >= DUNGEON_WIDTH || startY < 0 || startY >= DUNGEON_HEIGHT) {
    return { valid: false, reason: 'Header coordinates out of map bounds' };
  }

  if (expectedStartPosition) {
    if (startX !== expectedStartPosition.x || startY !== expectedStartPosition.y) {
      return {
        valid: false,
        reason: `Invalid starting position. Expected (${expectedStartPosition.x}, ${expectedStartPosition.y}), got (${startX}, ${startY})`
      };
    }
  }

  // Verify starting tile is walkable
  if (!isTileWalkable(startX, startY)) {
    return { valid: false, reason: `Start position (${startX}, ${startY}) is in a wall/blocked tile` };
  }

  const decodedSteps: DecodedGhostStep[] = [];
  // Add initial step at offset 0
  decodedSteps.push({ x: startX, y: startY, t: 0 });

  let currentX = startX;
  let currentY = startY;
  let currentOffsetMs = 0;
  let totalStepsCount = 0;
  
  let lastCheckpointOffsetMs = 0;
  let movesSinceLastCheckpoint = 0;

  for (let i = 1; i < segments.length; i++) {
    const segment = segments[i];
    if (!segment) continue;

    if (segment.startsWith('C,')) {
      // Checkpoint segment: C,x,y,timeOffsetMs
      const checkpointParts = segment.split(',');
      if (checkpointParts.length < 4) {
        return { valid: false, reason: `Malformed checkpoint: ${segment}` };
      }

      const cpX = Number(checkpointParts[1]);
      const cpY = Number(checkpointParts[2]);
      const cpOffsetMs = Number(checkpointParts[3]);

      if (![cpX, cpY, cpOffsetMs].every(Number.isFinite) || ![cpX, cpY, cpOffsetMs].every(Number.isInteger) || cpOffsetMs < 0) {
        return { valid: false, reason: `Invalid checkpoint numeric values: ${segment}` };
      }
      if (movesSinceLastCheckpoint === 0) {
        return { valid: false, reason: 'Checkpoint must follow at least one move' };
      }
      if (cpOffsetMs < lastCheckpointOffsetMs) {
        return { valid: false, reason: 'Checkpoint timestamps must be monotonic' };
      }

      // 1. Verify coordinate match
      if (currentX !== cpX || currentY !== cpY) {
        return { 
          valid: false, 
          reason: `Checkpoint coordinate mismatch. Expected (${currentX}, ${currentY}), got (${cpX}, ${cpY})` 
        };
      }

      // 2. Verify turn timing
      const timeDelta = cpOffsetMs - lastCheckpointOffsetMs;
      const minRequiredTime = movesSinceLastCheckpoint * MOVE_INTERVAL_MIN_MS;

      if (timeDelta < minRequiredTime) {
        return {
          valid: false,
          reason: `Timing violation. Moves: ${movesSinceLastCheckpoint}, Time delta: ${timeDelta}ms, Minimum allowed: ${minRequiredTime}ms`
        };
      }

      currentOffsetMs = cpOffsetMs;
      lastCheckpointOffsetMs = cpOffsetMs;
      movesSinceLastCheckpoint = 0;

      // Update the timestamp offset of the step that corresponds to the checkpoint
      if (decodedSteps.length > 0) {
        decodedSteps[decodedSteps.length - 1].t = currentOffsetMs;
      }
    } else {
      // Move segment: [U/D/L/R/W][count]
      const dir = segment[0];
      const count = parseInt(segment.substring(1), 10);

      if (isNaN(count) || count <= 0) {
        return { valid: false, reason: `Malformed move segment: ${segment}` };
      }

      totalStepsCount += count;
      if (totalStepsCount > MAX_MOVE_STEPS) {
        return { valid: false, reason: `Steps count exceeds maximum allowance (${MAX_MOVE_STEPS})` };
      }

      let dx = 0;
      let dy = 0;
      if (dir === 'R') dx = 1;
      else if (dir === 'L') dx = -1;
      else if (dir === 'D') dy = 1;
      else if (dir === 'U') dy = -1;
      else if (dir === 'W') { /* no change */ }
      else {
        return { valid: false, reason: `Invalid move direction: ${dir}` };
      }

      for (let stepIdx = 0; stepIdx < count; stepIdx++) {
        currentX += dx;
        currentY += dy;
        movesSinceLastCheckpoint++;

        // Verify walkability of every intermediate tile
        if (!isTileWalkable(currentX, currentY)) {
          return { valid: false, reason: `Illegal move: collided with wall at (${currentX}, ${currentY})` };
        }

        // We temporarily set offset to -1, which will be estimated or corrected by subsequent checkpoints
        decodedSteps.push({ x: currentX, y: currentY, t: -1 });
      }
    }
  }

  if (totalStepsCount === 0 || movesSinceLastCheckpoint !== 0 || !segments.at(-1)?.startsWith('C,')) {
    return { valid: false, reason: 'Move log must end with a checkpoint after at least one move' };
  }

  // Perform linear interpolation of intermediate step timestamps between checkpoints
  let lastKnownCpIndex = 0;
  for (let idx = 0; idx < decodedSteps.length; idx++) {
    if (decodedSteps[idx].t !== -1) {
      const startT = decodedSteps[lastKnownCpIndex].t;
      const endT = decodedSteps[idx].t;
      const stepsBetween = idx - lastKnownCpIndex;
      
      if (stepsBetween > 1) {
        const timePerStep = (endT - startT) / stepsBetween;
        for (let subIdx = lastKnownCpIndex + 1; subIdx < idx; subIdx++) {
          decodedSteps[subIdx].t = Math.round(startT + timePerStep * (subIdx - lastKnownCpIndex));
        }
      }
      lastKnownCpIndex = idx;
    }
  }

  // Handle any trailing steps that might not have ended in a checkpoint (should not happen if compressPath is used, but for safety)
  for (let idx = 0; idx < decodedSteps.length; idx++) {
    if (decodedSteps[idx].t === -1) {
      decodedSteps[idx].t = decodedSteps[idx - 1].t + MOVE_INTERVAL_MIN_MS;
    }
  }

  // 3. Verify terminal state (end position)
  if (expectedEndPosition) {
    if (currentX !== expectedEndPosition.x || currentY !== expectedEndPosition.y) {
      return {
        valid: false,
        reason: `Terminal position mismatch. Path ended at (${currentX}, ${currentY}), expected (${expectedEndPosition.x}, ${expectedEndPosition.y})`
      };
    }
  }

  // Server elapsed time includes briefing time before gameplay starts. It can only
  // prove that the client path duration was not impossibly longer than the token age.
  if (expectedDurationMs !== undefined) {
    const finalOffset = decodedSteps[decodedSteps.length - 1].t;
    if (!Number.isFinite(expectedDurationMs) || expectedDurationMs < 0 || finalOffset > expectedDurationMs + RUN_REQUEST_LATENCY_ALLOWANCE_MS) {
      return {
        valid: false,
        reason: `Duration is not plausible. Server elapsed: ${expectedDurationMs}ms, Path duration: ${finalOffset}ms`
      };
    }
  }

  return {
    valid: true,
    decodedTrail: {
      username,
      steps: decodedSteps
    }
  };
}
