import { Devvit } from '@devvit/public-api';
import { RunResult, LeaderboardEntry, DecodedGhostTrail } from '../../shared/types.js';
import { REDIS_PREFIX, MAX_LEADERBOARD_ENTRIES, MAX_GHOST_TRAILS_PER_SEED } from '../../shared/constants.js';

/**
 * Calculates a single numeric score for Redis sorted sets combining depth and duration.
 * Depth takes absolute precedence. Duration tie-breaker (lower duration is better).
 */
function calculateCombinedScore(depth: number, durationMs: number): number {
  const BASE_FACTOR = 1_000_000_000;
  // Limit duration to max 24 hours (86,400,000 ms) to prevent overflow
  const cappedDuration = Math.min(durationMs, 86_400_000);
  return depth * BASE_FACTOR + (BASE_FACTOR - cappedDuration);
}

/**
 * Submits a validated run result to the daily leaderboard and ghost trail storage.
 */
export async function submitRun(
  context: Devvit.Context,
  postId: string,
  dateKey: string,
  run: RunResult,
  verified: boolean
): Promise<void> {
  const scoresKey = `${REDIS_PREFIX.LEADERBOARD}scores:${postId}:${dateKey}`;
  const detailsKey = `${REDIS_PREFIX.LEADERBOARD}details:${postId}:${dateKey}`;
  const ghostTrailsKey = `${REDIS_PREFIX.GHOST_TRAILS}${postId}:${dateKey}`;

  const username = run.username;
  const score = calculateCombinedScore(run.depth, run.duration);

  // 1. Save score to leaderboard sorted set
  // Check if player already has an entry
  const existingScore = await context.redis.zScore(scoresKey, username);
  if (existingScore === undefined || score > existingScore) {
    // Save/update score
    await context.redis.zAdd(scoresKey, { member: username, score });

    // Save details to hash
    const detailsEntry: LeaderboardEntry = {
      username,
      depth: run.depth,
      duration: run.duration,
      timestamp: run.timestamp,
      verified
    };
    await context.redis.hSet(detailsKey, {
      [username]: JSON.stringify(detailsEntry)
    });
  }

  // 2. Save compressed ghost trail (scored by timestamp to track recency)
  const ghostEntry = {
    username,
    moveLog: run.moveLog,
    deathCause: run.deathCause,
    timestamp: run.timestamp
  };
  
  await context.redis.zAdd(ghostTrailsKey, {
    member: JSON.stringify(ghostEntry),
    score: run.timestamp
  });

  // Limit number of stored ghost trails to prevent unbounded memory growth
  const totalTrails = await context.redis.zCard(ghostTrailsKey);
  if (totalTrails > MAX_GHOST_TRAILS_PER_SEED) {
    // Fetch oldest trails (index 0 to overflow offset)
    const overflowCount = totalTrails - MAX_GHOST_TRAILS_PER_SEED;
    const oldestTrails = await context.redis.zRange(ghostTrailsKey, 0, overflowCount - 1, { by: 'rank' });
    if (oldestTrails.length > 0) {
      await context.redis.zRem(ghostTrailsKey, oldestTrails);
    }
  }
}

/**
 * Gets the sorted daily leaderboard for a given post and day.
 */
export async function getDailyLeaderboard(
  context: Devvit.Context,
  postId: string,
  dateKey: string
): Promise<LeaderboardEntry[]> {
  const scoresKey = `${REDIS_PREFIX.LEADERBOARD}scores:${postId}:${dateKey}`;
  const detailsKey = `${REDIS_PREFIX.LEADERBOARD}details:${postId}:${dateKey}`;

  // Get top players from sorted set (descending order of combined score)
  // zRange options in Devvit: by default returns ascending. Reverse using index range isn't direct,
  // so we fetch all (up to cap) and reverse in memory, or use negative indices if supported.
  // To be safe, fetch all sorted elements up to MAX_LEADERBOARD_ENTRIES and sort in memory.
  const players = await context.redis.zRange(scoresKey, 0, MAX_LEADERBOARD_ENTRIES - 1, { by: 'rank' });
  if (players.length === 0) {
    return [];
  }

  const detailsMap = await context.redis.hGetAll(detailsKey);
  
  const entries: LeaderboardEntry[] = [];
  for (const username of players) {
    const detailsJson = detailsMap[username];
    if (detailsJson) {
      try {
        entries.push(JSON.parse(detailsJson) as LeaderboardEntry);
      } catch {
        // Ignore parse error
      }
    }
  }

  // Sort entries: primary sort depth (descending), secondary sort duration (ascending)
  return entries.sort((a, b) => {
    if (b.depth !== a.depth) {
      return b.depth - a.depth;
    }
    return a.duration - b.duration;
  });
}

/**
 * Gets recent ghost trails for a given seed/day.
 */
export async function getDailyGhostTrails(
  context: Devvit.Context,
  postId: string,
  dateKey: string
): Promise<{ username: string; moveLog: string; deathCause?: string }[]> {
  const ghostTrailsKey = `${REDIS_PREFIX.GHOST_TRAILS}${postId}:${dateKey}`;
  
  // Get recent trails (ordered by timestamp ascending, so we take the end of the range)
  const trailsJsonList = await context.redis.zRange(ghostTrailsKey, 0, -1, { by: 'rank' });
  
  const results: { username: string; moveLog: string; deathCause?: string }[] = [];
  for (const jsonStr of trailsJsonList) {
    try {
      const parsed = JSON.parse(jsonStr);
      results.push({
        username: parsed.username,
        moveLog: parsed.moveLog,
        deathCause: parsed.deathCause
      });
    } catch {
      // Ignore
    }
  }
  
  // Return reversed so most recent runs are first
  return results.reverse();
}
