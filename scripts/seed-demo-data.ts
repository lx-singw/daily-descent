import { Devvit } from '@devvit/public-api';
import { REDIS_PREFIX } from '../src/shared/constants.js';
import { getUtcDateKey } from '../src/server/generation/seedRotation.js';
import { LeaderboardEntry } from '../src/shared/types.js';

/**
 * Seeds mock data for today and yesterday to populate leaderboards,
 * ghost trails, tactical warning markers, epitaph stats, and collective goals.
 */
export async function seedDemoData(context: Devvit.Context, postId: string): Promise<boolean> {
  try {
    const dateKey = getUtcDateKey();
    
    // Compute yesterday's date key
    const yesterday = new Date(Date.now() - 86400000);
    const yesterdayKey = getUtcDateKey(yesterday);

    // 1. Seed yesterday's collective goal progress to 30 (Goal met)
    const yesterdayGoalKey = `${REDIS_PREFIX.COLLECTIVE_GOAL}${postId}:${yesterdayKey}`;
    await context.redis.set(yesterdayGoalKey, '30');

    // 2. Seed today's collective goal progress to 12
    const todayGoalKey = `${REDIS_PREFIX.COLLECTIVE_GOAL}${postId}:${dateKey}`;
    await context.redis.set(todayGoalKey, '12');

    // 3. Seed today's leaderboard scores and details
    const scoresKey = `${REDIS_PREFIX.LEADERBOARD}scores:${postId}:${dateKey}`;
    const detailsKey = `${REDIS_PREFIX.LEADERBOARD}details:${postId}:${dateKey}`;

    const mockPlayers = [
      { username: 'dungeon_master', depth: 8, duration: 120000 },
      { username: 'rogue_snoo', depth: 6, duration: 155000 },
      { username: 'explorer_x', depth: 5, duration: 98000 },
      { username: 'speedrun_hero', depth: 4, duration: 42000 },
      { username: 'first_descent', depth: 2, duration: 180000 }
    ];

    const BASE_FACTOR = 1_000_000_000;
    for (const player of mockPlayers) {
      const score = player.depth * BASE_FACTOR + (BASE_FACTOR - player.duration);
      await context.redis.zAdd(scoresKey, { member: player.username, score });

      const detailsEntry: LeaderboardEntry = {
        username: player.username,
        depth: player.depth,
        duration: player.duration,
        timestamp: Date.now() - player.duration,
        verified: true
      };
      await context.redis.hSet(detailsKey, {
        [player.username]: JSON.stringify(detailsEntry)
      });
    }

    // 4. Seed today's Last Survivor silhouette (Leader Endpoint)
    const leaderEndpointKey = `${REDIS_PREFIX.SEED}leader_endpoint:${postId}:${dateKey}`;
    const leaderData = {
      x: 12,
      y: 9,
      username: 'dungeon_master',
      depth: 8,
      duration: 120000
    };
    await context.redis.set(leaderEndpointKey, JSON.stringify(leaderData));

    // 5. Seed today's ghost trails
    const ghostTrailsKey = `${REDIS_PREFIX.GHOST_TRAILS}${postId}:${dateKey}`;
    
    // Pre-seed 3 mock trails using valid formats: startX,startY,startTimeMs:U5:C,12,9,1200
    const mockTrails = [
      {
        username: 'rogue_snoo',
        moveLog: '12,9,0:R3D2L1:C,14,11,4500',
        deathCause: 'Spike Trap',
        timestamp: Date.now() - 600000
      },
      {
        username: 'explorer_x',
        moveLog: '12,9,0:R1D4R3D2:C,16,15,8200',
        deathCause: 'Guard Corner',
        timestamp: Date.now() - 1200000
      },
      {
        username: 'speedrun_hero',
        moveLog: '12,9,0:R4R4D1D1:C,20,11,3500',
        deathCause: 'Greed',
        timestamp: Date.now() - 1800000
      }
    ];

    for (const trail of mockTrails) {
      const ghostEntry = {
        username: trail.username,
        moveLog: trail.moveLog,
        deathCause: trail.deathCause,
        timestamp: trail.timestamp
      };
      await context.redis.zAdd(ghostTrailsKey, {
        member: JSON.stringify(ghostEntry),
        score: trail.timestamp
      });
    }

    // 6. Seed today's tactical warning markers
    const markerKey = `${REDIS_PREFIX.TACTICAL_MARKERS}${postId}:${dateKey}`;
    
    const mockMarkers = [
      { id: 'm_seed_1', author: 'rogue_snoo', x: 14, y: 11, markerId: 0, timestamp: Date.now() - 500000 }, // Trap!
      { id: 'm_seed_2', author: 'explorer_x', x: 16, y: 15, markerId: 1, timestamp: Date.now() - 1100000 }, // Dead end
      { id: 'm_seed_3', author: 'speedrun_hero', x: 20, y: 11, markerId: 4, timestamp: Date.now() - 1700000 } // I regret everything
    ];

    for (const marker of mockMarkers) {
      await context.redis.zAdd(markerKey, {
        member: JSON.stringify(marker),
        score: marker.timestamp
      });
    }

    // 7. Seed today's Epitaph Statistics
    const epitaphKey = `${REDIS_PREFIX.EPITAPH_STATS}${postId}:${dateKey}`;
    await context.redis.hSet(epitaphKey, {
      'Greed': '12',
      'Spike Trap': '8',
      'Guard Corner': '5'
    });

    return true;
  } catch (err) {
    console.error('Failed to seed demo data:', err);
    return false;
  }
}
