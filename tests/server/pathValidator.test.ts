import { describe, test, expect } from 'vitest';
import { compressPath, validateAndDecodePath } from '../../src/server/pipeline/pathValidator.js';

describe('Path Compressor and Validator', () => {
  // Simple 5x5 layout:
  // 0 = walkable, 1 = wall
  // 0,0,0,0,0
  // 0,1,1,1,0
  // 0,1,0,0,0
  // 0,1,1,1,0
  // 0,0,0,0,0
  const layout = [
    [0, 0, 0, 0, 0],
    [0, 1, 1, 1, 0],
    [0, 1, 0, 0, 0],
    [0, 1, 1, 1, 0],
    [0, 0, 0, 0, 0]
  ];

  const isTileWalkable = (x: number, y: number) => {
    if (x < 0 || x >= 5 || y < 0 || y >= 5) return false;
    return layout[y][x] === 0;
  };

  test('should successfully compress, validate and decode a valid path', () => {
    const startX = 0;
    const startY = 0;
    const startTime = 1000;

    // Moves: R4, D4, L4 (all floors, no walls crossed)
    const steps = [
      { x: 1, y: 0, t: 200 },
      { x: 2, y: 0, t: 400 },
      { x: 3, y: 0, t: 600 },
      { x: 4, y: 0, t: 800 },
      { x: 4, y: 1, t: 1000 },
      { x: 4, y: 2, t: 1200 },
      { x: 4, y: 3, t: 1400 },
      { x: 4, y: 4, t: 1600 },
      { x: 3, y: 4, t: 1800 },
      { x: 2, y: 4, t: 2000 },
      { x: 1, y: 4, t: 2200 },
      { x: 0, y: 4, t: 2400 }
    ];

    const moveLog = compressPath(startX, startY, startTime, steps);
    expect(moveLog).toBe('0,0,1000:R4:C,4,0,800:D4:C,4,4,1600:L4:C,0,4,2400');

    const result = validateAndDecodePath(
      moveLog,
      'test_user',
      isTileWalkable,
      { x: 0, y: 4 },
      2400
    );

    expect(result.valid).toBe(true);
    expect(result.decodedTrail).toBeDefined();
    expect(result.decodedTrail?.username).toBe('test_user');
    expect(result.decodedTrail?.steps.length).toBe(13); // includes start pos
    expect(result.decodedTrail?.steps[12]).toEqual({ x: 0, y: 4, t: 2400 });
  });

  test('should detect and reject paths that collide with walls', () => {
    // Attempting to walk from (0,0) down through the wall at (0,1)
    // Moves: D2 (0,0 -> 0,1 -> 0,2) where (0,1) is wall in our layout? Wait, 0,1 is walkable (layout[1][0] is 0).
    // Let's check layout:
    // [0] is [0, 0, 0, 0, 0] -> layout[0][1] is 0 (walkable)
    // [1] is [0, 1, 1, 1, 0] -> layout[1][1] is 1 (wall), but layout[1][0] is 0 (walkable)
    // To cross wall: let's walk R3 (0,0 -> 1,0 -> 2,0 -> 3,0) then D2 (3,0 -> 3,1 -> 3,2).
    // layout[1][3] is 1 (wall). So D1 (from 3,0 to 3,1) should hit a wall.
    const startX = 3;
    const startY = 0;
    const startTime = 1000;
    const steps = [
      { x: 3, y: 1, t: 200 } // Wall!
    ];

    const moveLog = compressPath(startX, startY, startTime, steps);
    const result = validateAndDecodePath(moveLog, 'test_user', isTileWalkable);

    expect(result.valid).toBe(false);
    expect(result.reason).toContain('Illegal move: collided with wall at (3, 1)');
  });

  test('should detect and reject timing violations (speed hack)', () => {
    const startX = 0;
    const startY = 0;
    const startTime = 1000;

    // 4 moves in 300ms. Minimum time for 4 moves is 4 * 180ms = 720ms.
    const steps = [
      { x: 1, y: 0, t: 50 },
      { x: 2, y: 0, t: 100 },
      { x: 3, y: 0, t: 150 },
      { x: 4, y: 0, t: 300 }
    ];

    const moveLog = compressPath(startX, startY, startTime, steps);
    const result = validateAndDecodePath(moveLog, 'test_user', isTileWalkable);

    expect(result.valid).toBe(false);
    expect(result.reason).toContain('Timing violation');
  });

  test('should detect and reject terminal state mismatches', () => {
    const startX = 0;
    const startY = 0;
    const startTime = 1000;
    const steps = [
      { x: 1, y: 0, t: 200 }
    ];

    const moveLog = compressPath(startX, startY, startTime, steps);
    
    // We expect end position to be (2, 0) but path ends at (1, 0)
    const result = validateAndDecodePath(
      moveLog,
      'test_user',
      isTileWalkable,
      { x: 2, y: 0 }
    );

    expect(result.valid).toBe(false);
    expect(result.reason).toContain('Terminal position mismatch');
  });
});
