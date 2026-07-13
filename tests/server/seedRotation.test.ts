import { describe, test, expect, vi } from 'vitest';
import { getOrCreateDailySeed, validateRunSeed, getUtcDateKey } from '../../src/server/generation/seedRotation.js';
import { Devvit } from '@devvit/public-api';

class MockRedis {
  public store = new Map<string, string>();
  public setCalls = 0;

  async get(key: string): Promise<string | undefined> {
    return this.store.get(key);
  }

  async set(key: string, value: string, options?: { nx?: boolean; expiration?: Date }): Promise<string> {
    this.setCalls++;
    if (options?.nx && this.store.has(key)) {
      return '';
    }
    this.store.set(key, value);
    return 'OK';
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }
}

describe('Lazy Seed Rotation & Rollover Locks', () => {
  test('should generate and return seed on first load', async () => {
    const mockRedis = new MockRedis();
    const mockContext = {
      redis: mockRedis,
      postId: 't3_testpost'
    } as unknown as Devvit.Context;

    const dateKey = '2026-07-13';
    const seed = await getOrCreateDailySeed(mockRedis, 't3_testpost', dateKey);

    expect(seed).toBeDefined();
    expect(seed).toContain('2026-07-13');
    expect(mockRedis.store.has(`daily_seed:t3_testpost:${dateKey}`)).toBe(true);
    expect(mockRedis.store.get(`daily_seed:t3_testpost:${dateKey}`)).toBe(seed);
  });

  test('should return existing seed on subsequent loads without generating new one', async () => {
    const mockRedis = new MockRedis();
    const mockContext = {
      redis: mockRedis,
      postId: 't3_testpost'
    } as unknown as Devvit.Context;

    const dateKey = '2026-07-13';
    const firstSeed = await getOrCreateDailySeed(mockRedis, 't3_testpost', dateKey);
    
    mockRedis.setCalls = 0; // reset counter

    const secondSeed = await getOrCreateDailySeed(mockRedis, 't3_testpost', dateKey);
    expect(secondSeed).toBe(firstSeed);
    expect(mockRedis.setCalls).toBe(0); // getOrCreateDailySeed should return early from first get() call
  });

  test('should support mid-run midnight crossings for run validation', async () => {
    const mockRedis = new MockRedis();
    const mockContext = {
      redis: mockRedis,
      postId: 't3_testpost'
    } as unknown as Devvit.Context;

    // Simulate current time: July 13th 00:05 UTC.
    // Run started on July 12th 23:55 UTC (timestamp = July 12).
    const runTimestamp = new Date('2026-07-12T23:55:00Z').getTime();
    
    // Pre-warm the seeds
    const seedJuly12 = await getOrCreateDailySeed(mockRedis, 't3_testpost', '2026-07-12');
    const seedJuly13 = await getOrCreateDailySeed(mockRedis, 't3_testpost', '2026-07-13');

    // A run is bound to its server-derived date; a future day's seed must not validate.
    const isValidRunDay = await validateRunSeed(mockRedis, 't3_testpost', seedJuly12, runTimestamp);
    expect(isValidRunDay).toBe(true);

    const isValidFutureDay = await validateRunSeed(mockRedis, 't3_testpost', seedJuly13, runTimestamp);
    expect(isValidFutureDay).toBe(false);

    // Some random seed should be rejected
    const isValidFake = await validateRunSeed(mockRedis, 't3_testpost', 'seed_fake_123', runTimestamp);
    expect(isValidFake).toBe(false);
  });
});
