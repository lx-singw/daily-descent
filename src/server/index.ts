import express from 'express';
import { createServer, getServerPort, reddit, redis, context } from '@devvit/web/server';
import { getUtcDateKey, getOrCreateDailySeed } from './generation/seedRotation.js';
import { submitRun, getDailyLeaderboard, getDailyGhostTrails } from './storage/runStore.js';
import { validateAndDecodePath } from './pipeline/pathValidator.js';
import { DungeonGenerator } from '../shared/DungeonGenerator.js';
import { REDIS_PREFIX, TTL_DAILY_KEYS_SEC, TTL_TACTICAL_MARKERS_SEC, TTL_RUN_TOKEN_SEC, PREDEFINED_DEATH_CAUSES } from '../shared/constants.js';
import { RunResult } from '../shared/types.js';

const app = express();
app.use(express.json());

// 1. GET /api/seed - Get today's seeded dungeon layout and issue a secure runToken
app.get('/api/seed', async (req, res) => {
  try {
    const postId = context.postId;
    if (!postId) {
      return res.status(400).json({ error: 'Missing postId in request context.' });
    }

    const currentUser = await reddit.getCurrentUser();
    const username = currentUser ? currentUser.username : 'anonymous';

    const dateKey = getUtcDateKey();
    const seed = await getOrCreateDailySeed(redis, postId, dateKey);
    await redis.expire(`${REDIS_PREFIX.SEED}${postId}:${dateKey}`, TTL_DAILY_KEYS_SEC);

    const generator = new DungeonGenerator(seed);
    const startPos = generator.getStartPosition();

    // Issue a server-managed run token valid for one hour.
    const runToken = `t_${crypto.randomUUID()}`;
    const tokenKey = `${REDIS_PREFIX.SEED}run_token:${postId}:${runToken}`;
    const tokenPayload = {
      seed,
      username,
      startTimestamp: Date.now(),
      startX: startPos.x,
      startY: startPos.y
    };

    await redis.set(tokenKey, JSON.stringify(tokenPayload), {
      expiration: new Date(Date.now() + TTL_RUN_TOKEN_SEC * 1000)
    });
    
    // Check yesterday's collective goal progress
    const yesterday = new Date(Date.now() - 86400000);
    const yesterdayKey = getUtcDateKey(yesterday);
    const goalKey = `${REDIS_PREFIX.COLLECTIVE_GOAL}${postId}:${yesterdayKey}`;
    const goalProgressStr = await redis.get(goalKey);
    const goalProgress = parseInt(goalProgressStr || '0', 10);
    const collectiveGoalMet = goalProgress >= 25;

    // Get today's leader endpoint (Last Survivor)
    const leaderEndpointKey = `${REDIS_PREFIX.SEED}leader_endpoint:${postId}:${dateKey}`;
    const leaderEndpointStr = await redis.get(leaderEndpointKey);
    let leaderEndpoint = null;
    if (leaderEndpointStr) {
      try {
        leaderEndpoint = JSON.parse(leaderEndpointStr);
      } catch {
        // Ignore
      }
    }

    // Get today's epitaph statistics
    const epitaphKey = `${REDIS_PREFIX.EPITAPH_STATS}${postId}:${dateKey}`;
    const epitaphStatsRaw = await redis.hGetAll(epitaphKey) || {};
    const epitaphStats: Record<string, number> = {};
    for (const key of Object.keys(epitaphStatsRaw)) {
      epitaphStats[key] = parseInt(epitaphStatsRaw[key] || '0', 10);
    }

    // Get today's collective goal progress count
    const todayGoalKey = `${REDIS_PREFIX.COLLECTIVE_GOAL}${postId}:${dateKey}`;
    const todayGoalProgressStr = await redis.get(todayGoalKey);
    const todayGoalProgress = parseInt(todayGoalProgressStr || '0', 10);

    res.json({
      seed,
      dateKey,
      runToken,
      startPosition: startPos,
      collectiveGoalMet,
      todayGoalProgress,
      leaderEndpoint,
      epitaphStats
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch seed' });
  }
});

// 2. GET /api/leaderboard - Get daily leaderboard
app.get('/api/leaderboard', async (req, res) => {
  try {
    const postId = context.postId;
    if (!postId) {
      return res.status(400).json({ error: 'Missing postId in request context.' });
    }

    const dateKey = getUtcDateKey();
    const leaderboard = await getDailyLeaderboard(redis, postId, dateKey);
    res.json({ leaderboard });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch leaderboard' });
  }
});

// 3. GET /api/ghosts - Get recent ghost trails
app.get('/api/ghosts', async (req, res) => {
  try {
    const postId = context.postId;
    if (!postId) {
      return res.status(400).json({ error: 'Missing postId in request context.' });
    }

    const dateKey = getUtcDateKey();
    const ghosts = await getDailyGhostTrails(redis, postId, dateKey);
    res.json({ ghosts });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch ghost trails' });
  }
});

// 4. POST /api/run - Submit completed run (fully verified server-side)
app.post('/api/run', async (req, res) => {
  try {
    const postId = context.postId;
    const currentUser = await reddit.getCurrentUser();
    const username = currentUser ? currentUser.username : 'anonymous';

    if (!postId) {
      return res.status(400).json({ error: 'Missing postId in request context.' });
    }

    const { runToken, deathLocation, deathCause, moveLog, seed } = req.body;

    if (!runToken || !moveLog || !seed) {
      return res.status(400).json({ error: 'Invalid payload: missing runToken, seed or moveLog.' });
    }

    // Validate the server-issued token to prevent replay and timestamp spoofing.
    const tokenKey = `${REDIS_PREFIX.SEED}run_token:${postId}:${runToken}`;
    const tokenDataStr = await redis.get(tokenKey);
    if (!tokenDataStr) {
      return res.status(400).json({ error: 'invalid_token', message: 'Your play session has expired or is invalid.' });
    }

    const tokenData = JSON.parse(tokenDataStr);
    if (tokenData.username !== username) {
      return res.status(403).json({ error: 'unauthorized_token', message: 'Token ownership mismatch.' });
    }

    if (tokenData.seed !== seed) {
      return res.status(400).json({ error: 'seed_mismatch', message: 'Seed does not match registered token.' });
    }

    // Consume token immediately
    await redis.del(tokenKey);

    const dateKey = getUtcDateKey(new Date(tokenData.startTimestamp));

    // B. Check rate limits atomically using SETNX for authenticated ranked players
    const playedCheckKey = `${REDIS_PREFIX.LEADERBOARD}played:${postId}:${dateKey}:${username}`;
    if (username !== 'anonymous') {
      const setnxSuccess = await redis.set(playedCheckKey, 'true', {
        nx: true,
        expiration: new Date(Date.now() + 86400000)
      });
      if (!setnxSuccess) {
        return res.status(403).json({ error: 'already_submitted', message: 'You have already submitted a ranked run today.' });
      }
    }

    // C. Reconstruct and validate path using seed-derived layout
    const generator = new DungeonGenerator(seed);
    const expectedStart = { x: tokenData.startX, y: tokenData.startY };
    const serverDuration = Date.now() - tokenData.startTimestamp;

    // Validate coordinate boundaries and deathCause values
    if (deathCause && !PREDEFINED_DEATH_CAUSES.includes(deathCause)) {
      if (username !== 'anonymous') await redis.del(playedCheckKey); // refund played key
      return res.status(400).json({ error: 'invalid_death_cause', message: 'Death cause is not supported.' });
    }

    if (deathLocation) {
      const { x, y } = deathLocation;
      if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || x >= 60 || y < 0 || y >= 60) {
        if (username !== 'anonymous') await redis.del(playedCheckKey);
        return res.status(400).json({ error: 'invalid_death_location', message: 'Death coordinates out of bounds.' });
      }
    }

    const pathResult = validateAndDecodePath(
      moveLog,
      username,
      (x, y) => generator.isWalkable(x, y),
      deathLocation,
      serverDuration,
      expectedStart
    );

    if (!pathResult.valid) {
      if (username !== 'anonymous') await redis.del(playedCheckKey);
      return res.status(400).json({ error: 'validation_failed', reason: pathResult.reason });
    }

    // D. Extract coordinates and derive statistics completely server-side
    const steps = pathResult.decodedTrail!.steps;
    const finalStep = steps[steps.length - 1];
    const derivedDepth = Math.max(1, Math.floor((finalStep.x + finalStep.y) / 10));
    const derivedDuration = finalStep.t; // time offset of the final step in the path log

    const run: RunResult = {
      username,
      depth: derivedDepth,
      duration: derivedDuration,
      deathLocation: { x: finalStep.x, y: finalStep.y },
      deathCause,
      moveLog,
      timestamp: Date.now(),
      seed
    };

    // Anonymous players can play casual runs but are excluded from ranked persistence.
    if (username !== 'anonymous') {
      await submitRun(redis, postId, dateKey, run, pathResult.valid);

      // E. Save Epitaph Statistics
      if (deathCause) {
        const epitaphKey = `${REDIS_PREFIX.EPITAPH_STATS}${postId}:${dateKey}`;
        await redis.hIncrBy(epitaphKey, deathCause, 1);
        await redis.expire(epitaphKey, TTL_DAILY_KEYS_SEC);
      }

      // F. Update Collective daily goal progress if room >= 5 (depth >= 5)
      if (run.depth >= 5) {
        const todayGoalKey = `${REDIS_PREFIX.COLLECTIVE_GOAL}${postId}:${dateKey}`;
        await redis.incrBy(todayGoalKey, 1);
        await redis.expire(todayGoalKey, TTL_DAILY_KEYS_SEC);
      }

      // G. Check if this is the new daily best run for the "Last Survivor" silhouette
      const leaderEndpointKey = `${REDIS_PREFIX.SEED}leader_endpoint:${postId}:${dateKey}`;
      const currentLeaderStr = await redis.get(leaderEndpointKey);
      let shouldUpdateLeader = true;
      if (currentLeaderStr) {
        try {
          const currentLeader = JSON.parse(currentLeaderStr);
          if (run.depth < currentLeader.depth) {
            shouldUpdateLeader = false;
          } else if (run.depth === currentLeader.depth && run.duration >= currentLeader.duration) {
            shouldUpdateLeader = false;
          }
        } catch {
          // Ignore
        }
      }
      if (shouldUpdateLeader && run.deathLocation) {
        const leaderData = {
          x: run.deathLocation.x,
          y: run.deathLocation.y,
          username,
          depth: run.depth,
          duration: run.duration
        };
        await redis.set(leaderEndpointKey, JSON.stringify(leaderData));
        await redis.expire(leaderEndpointKey, TTL_DAILY_KEYS_SEC);
      }
    }

    res.json({ success: true, verified: pathResult.valid, depth: derivedDepth, duration: derivedDuration });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to submit run' });
  }
});

// 5. POST /api/marker - Submit a Tactical Warning Marker (Authenticated only)
app.post('/api/marker', async (req, res) => {
  try {
    const postId = context.postId;
    const currentUser = await reddit.getCurrentUser();
    const username = currentUser ? currentUser.username : 'anonymous';

    if (!postId) {
      return res.status(400).json({ error: 'Missing postId' });
    }

    // Require authentication (reject anonymous markers to prevent spam)
    if (username === 'anonymous') {
      return res.status(403).json({ error: 'unauthenticated', message: 'You must be logged in to leave warnings.' });
    }

    const { markerId, x, y, postComment } = req.body;
    if (markerId === undefined || x === undefined || y === undefined) {
      return res.status(400).json({ error: 'Missing markerId, x, or y' });
    }

    const mid = parseInt(markerId, 10);
    const mx = parseInt(x, 10);
    const my = parseInt(y, 10);

    // Validate bounds and IDs
    if (isNaN(mid) || mid < 0 || mid > 4) {
      return res.status(400).json({ error: 'invalid_marker_id', message: 'Marker ID must be between 0 and 4.' });
    }
    if (isNaN(mx) || isNaN(my) || mx < 0 || mx >= 60 || my < 0 || my >= 60) {
      return res.status(400).json({ error: 'invalid_coordinates', message: 'Coordinates out of map bounds.' });
    }

    const dateKey = getUtcDateKey();
    const markerKey = `${REDIS_PREFIX.TACTICAL_MARKERS}${postId}:${dateKey}`;

    let commentId = undefined;

    // Optional: post comment to Reddit thread via User Action
    if (postComment) {
      const PREDEFINED_MARKERS = ["Trap!", "Dead end", "Heal here", "Boss route", "I regret everything"];
      const markerText = PREDEFINED_MARKERS[mid] || 'warning';
      const commentText = `[Tactical Warning] "${markerText}" left at Tile (${mx}, ${my}) by u/${username}`;
      try {
        const comment = await reddit.submitComment({
          id: postId,
          text: commentText,
          runAs: 'USER'
        });
        commentId = comment.id;
      } catch (commentErr: any) {
        console.error('Failed to post comment:', commentErr);
      }
    }

    const newMarker = {
      id: `m_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      author: username,
      commentId,
      x: mx,
      y: my,
      markerId: mid,
      timestamp: Date.now()
    };

    // Store in a sorted set (scored by timestamp)
    await redis.zAdd(markerKey, {
      member: JSON.stringify(newMarker),
      score: Date.now()
    });
    await redis.expire(markerKey, TTL_TACTICAL_MARKERS_SEC);

    // Enforce FIFO limit of 50 markers per day
    const totalMarkers = await redis.zCard(markerKey);
    if (totalMarkers > 50) {
      const overflowCount = totalMarkers - 50;
      const oldestMarkers = await redis.zRange(markerKey, 0, overflowCount - 1, { by: 'rank' });
      if (oldestMarkers.length > 0) {
        await redis.zRem(markerKey, oldestMarkers.map((entry) => entry.member));
      }
    }

    res.json({ success: true, marker: newMarker });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to submit marker' });
  }
});

// 6. GET /api/markers - Fetch today's tactical warning markers
app.get('/api/markers', async (req, res) => {
  try {
    const postId = context.postId;
    if (!postId) {
      return res.status(400).json({ error: 'Missing postId' });
    }

    const dateKey = getUtcDateKey();
    const markerKey = `${REDIS_PREFIX.TACTICAL_MARKERS}${postId}:${dateKey}`;
    
    const markersJson = await redis.zRange(markerKey, 0, -1, { by: 'rank' });
    const markers = markersJson.map((entry) => {
      try {
        return JSON.parse(entry.member);
      } catch {
        return null;
      }
    }).filter(Boolean);

    res.json({ markers });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch markers' });
  }
});


const server = createServer(app);
server.on('error', (err) => console.error(`Server error: ${err.stack}`));
server.listen(getServerPort());
