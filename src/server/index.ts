import express from 'express';
import { createServer, getServerPort, reddit, redis, context } from '@devvit/web/server';
import { getUtcDateKey, getOrCreateDailySeed, validateRunSeed } from './generation/seedRotation.js';
import { submitRun, getDailyLeaderboard, getDailyGhostTrails } from './storage/runStore.js';
import { validateAndDecodePath } from './pipeline/pathValidator.js';
import { DungeonGenerator } from '../shared/DungeonGenerator.js';
import { REDIS_PREFIX } from '../shared/constants.js';
import { RunResult } from '../shared/types.js';
import { seedDemoData } from '../../scripts/seed-demo-data.js';

const app = express();
app.use(express.json());

// 1. GET /api/seed - Get today's seeded dungeon layout parameters
app.get('/api/seed', async (req, res) => {
  try {
    const postId = context.postId;
    if (!postId) {
      return res.status(400).json({ error: 'Missing postId in request context.' });
    }

    const dateKey = getUtcDateKey();
    const seed = await getOrCreateDailySeed(redis, postId, dateKey);
    
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

// 4. POST /api/run - Submit completed run
app.post('/api/run', async (req, res) => {
  try {
    const postId = context.postId;
    const currentUser = await reddit.getCurrentUser();
    const username = currentUser ? currentUser.username : 'anonymous';

    if (!postId) {
      return res.status(400).json({ error: 'Missing postId in request context.' });
    }

    const { depth, duration, deathLocation, deathCause, moveLog, seed, timestamp } = req.body;

    if (!seed || !moveLog) {
      return res.status(400).json({ error: 'Invalid payload: missing seed or moveLog.' });
    }

    // A. Validate seed validity (today or yesterday)
    const runTimestamp = timestamp || Date.now();
    const isSeedValid = await validateRunSeed(redis, postId, seed, runTimestamp);
    if (!isSeedValid) {
      return res.status(400).json({ error: 'Run submitted on expired or invalid seed.' });
    }

    const dateKey = getUtcDateKey(new Date(runTimestamp));

    // B. Rate limit: check if user already submitted a ranked run today
    const playedCheckKey = `${REDIS_PREFIX.LEADERBOARD}played:${postId}:${dateKey}:${username}`;
    const alreadyPlayed = await redis.get(playedCheckKey);
    if (alreadyPlayed && username !== 'anonymous') {
      return res.status(403).json({ error: 'already_submitted', message: 'You have already submitted a ranked run today.' });
    }

    // C. Reconstruct and validate path using seed-derived layout
    const generator = new DungeonGenerator(seed);
    const pathResult = validateAndDecodePath(
      moveLog,
      username,
      (x, y) => generator.isWalkable(x, y),
      deathLocation,
      duration
    );

    if (!pathResult.valid) {
      return res.status(400).json({ error: 'validation_failed', reason: pathResult.reason });
    }

    // D. Store the run result
    const run: RunResult = {
      username,
      depth: parseInt(depth, 10) || 1,
      duration: parseInt(duration, 10) || 0,
      deathLocation,
      deathCause,
      moveLog,
      timestamp: runTimestamp,
      seed
    };

    await submitRun(redis, postId, dateKey, run, pathResult.valid);

    // E. Save Epitaph Statistics
    if (deathCause) {
      const epitaphKey = `${REDIS_PREFIX.EPITAPH_STATS}${postId}:${dateKey}`;
      await redis.hIncrBy(epitaphKey, deathCause, 1);
    }

    // F. Update Collective daily goal progress if room >= 5 (depth >= 5)
    if (run.depth >= 5) {
      const todayGoalKey = `${REDIS_PREFIX.COLLECTIVE_GOAL}${postId}:${dateKey}`;
      await redis.incrBy(todayGoalKey, 1);
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
    if (shouldUpdateLeader && deathLocation) {
      const leaderData = {
        x: deathLocation.x,
        y: deathLocation.y,
        username,
        depth: run.depth,
        duration: run.duration
      };
      await redis.set(leaderEndpointKey, JSON.stringify(leaderData));
    }

    // H. Set rate limit key for today
    if (username !== 'anonymous') {
      await redis.set(playedCheckKey, 'true', {
        expiration: new Date(Date.now() + 86400000)
      });
    }

    res.json({ success: true, verified: pathResult.valid });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to submit run' });
  }
});

// 5. POST /api/marker - Submit a Tactical Warning Marker
app.post('/api/marker', async (req, res) => {
  try {
    const postId = context.postId;
    const currentUser = await reddit.getCurrentUser();
    const username = currentUser ? currentUser.username : 'anonymous';

    if (!postId) {
      return res.status(400).json({ error: 'Missing postId' });
    }

    const { markerId, x, y, postComment } = req.body;
    if (markerId === undefined || x === undefined || y === undefined) {
      return res.status(400).json({ error: 'Missing markerId, x, or y' });
    }

    const dateKey = getUtcDateKey();
    const markerKey = `${REDIS_PREFIX.TACTICAL_MARKERS}${postId}:${dateKey}`;

    const mid = parseInt(markerId, 10);
    const mx = parseInt(x, 10) || 0;
    const my = parseInt(y, 10) || 0;

    let commentId = undefined;

    // Optional: post comment to Reddit thread via User Action
    if (postComment && username !== 'anonymous') {
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

// 7. POST /api/seed-demo - Populate daily seeds, ghosts, and stats with mock demo data
app.post('/api/seed-demo', async (req, res) => {
  try {
    const postId = context.postId;
    if (!postId) {
      return res.status(400).json({ error: 'Missing postId' });
    }

    const success = await seedDemoData(redis, postId);
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to seed demo data' });
  }
});

const server = createServer(app);
server.on('error', (err) => console.error(`Server error: ${err.stack}`));
server.listen(getServerPort());
