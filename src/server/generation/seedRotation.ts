import { redis as webRedis } from '@devvit/web/server';

type RedisClient = Pick<typeof webRedis, 'get' | 'set' | 'del'>;
import { REDIS_PREFIX } from '../../shared/constants.js';

/**
 * Helper to compute the UTC date key in YYYY-MM-DD format.
 */
export function getUtcDateKey(date = new Date()): string {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Generates a deterministic seed string using the date key, post ID, and optional app salt.
 */
function generateDeterministicSeed(dateKey: string, postId: string): string {
  // Simple deterministic hash function for string combination
  const input = `${dateKey}:${postId}:daily-descent-salt-v1`;
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Return seed in hex/string format
  const absoluteHash = Math.abs(hash);
  return `seed_${absoluteHash.toString(16)}_${dateKey}`;
}

/**
 * Resolves today's daily seed for a specific post.
 * Uses atomic Redis SETNX lock to prevent concurrent first-loads from generating competing seeds.
 */
export async function getOrCreateDailySeed(
  client: RedisClient,
  postId: string,
  dateKey: string
): Promise<string> {
  const seedKey = `${REDIS_PREFIX.SEED}${postId}:${dateKey}`;
  const lockKey = `${REDIS_PREFIX.ROLLOVER_LOCK}${postId}:${dateKey}`;

  // 1. Attempt to read seed
  let seed = await client.get(seedKey);
  if (seed) {
    return seed;
  }

  // 2. Try to acquire rollover generation lock
  // Lock expires in 10 seconds to prevent deadlocks if the generator crashes
  const lockAcquired = await client.set(lockKey, 'locked', {
    nx: true,
    expiration: new Date(Date.now() + 10000)
  });

  if (lockAcquired) {
    try {
      // Generate seed deterministically
      seed = generateDeterministicSeed(dateKey, postId);
      // Store seed indefinitely (or for a long period like 30 days)
      await client.set(seedKey, seed);
      return seed;
    } finally {
      // Release lock
      await client.del(lockKey);
    }
  } else {
    // 3. Concurrency handling: Another request is currently generating the seed.
    // Poll Redis in a loop to wait for it.
    let retries = 5;
    while (retries > 0) {
      await new Promise((resolve) => setTimeout(resolve, 200)); // sleep 200ms
      seed = await client.get(seedKey);
      if (seed) {
        return seed;
      }
      retries--;
    }

    // Fallback: If we poll and it still doesn't exist (e.g. owner crashed without releasing lock),
    // generate it deterministically on-the-fly and return it, but don't attempt to overwrite.
    return generateDeterministicSeed(dateKey, postId);
  }
}

/**
 * Validates a completed run's seed.
 * Ensures the seed was valid either for the current date or yesterday's date,
 * allowing runs that started just before midnight to complete successfully.
 */
export async function validateRunSeed(
  client: RedisClient,
  postId: string,
  submittedSeed: string,
  runTimestampMs: number
): Promise<boolean> {
  const runDate = new Date(runTimestampMs);
  const runDateKey = getUtcDateKey(runDate);
  const expectedSeedToday = await getOrCreateDailySeed(client, postId, runDateKey);

  if (submittedSeed === expectedSeedToday) {
    return true;
  }

  // Check yesterday's seed
  const yesterday = new Date(runTimestampMs - 86400000);
  const yesterdayDateKey = getUtcDateKey(yesterday);
  const expectedSeedYesterday = await getOrCreateDailySeed(client, postId, yesterdayDateKey);

  return submittedSeed === expectedSeedYesterday;
}
