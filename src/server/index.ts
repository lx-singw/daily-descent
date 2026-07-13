import express from 'express';
import { createServer, getServerPort, reddit, redis, context } from '@devvit/web/server';
import { getUtcDateKey, getOrCreateDailySeed, validateRunSeed } from './generation/seedRotation.js';
import { submitRun, getDailyLeaderboard, getDailyGhostTrails } from './storage/runStore.js';
import { validateAndDecodePath } from './pipeline/pathValidator.js';
import { DungeonGenerator } from '../shared/DungeonGenerator.js';
import { REDIS_PREFIX } from '../shared/constants.js';
import { RunResult } from '../shared/types.js';

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
    const seed = await getOrCreateDailySeed(context, postId, dateKey);
    
    res.json({ seed, dateKey });
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
    const leaderboard = await getDailyLeaderboard(context, postId, dateKey);
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
    const ghosts = await getDailyGhostTrails(context, postId, dateKey);
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
    const isSeedValid = await validateRunSeed(context, postId, seed, runTimestamp);
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

    await submitRun(context, postId, dateKey, run, pathResult.valid);

    // E. Set rate limit key for today
    if (username !== 'anonymous') {
      // Expiration time set to 24 hours to cover date rollover
      await redis.set(playedCheckKey, 'true', {
        expiration: new Date(Date.now() + 86400000)
      });
    }

    res.json({ success: true, verified: pathResult.valid });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to submit run' });
  }
});

// 5. POST /api/spirit-message - Post a Spirit Message as a Reddit Comment
// Expects an explicit manual trigger from the webview client
app.post('/api/spirit-message', async (req, res) => {
  try {
    const postId = context.postId;
    const currentUser = await reddit.getCurrentUser();
    const username = currentUser ? currentUser.username : 'anonymous';

    if (!postId) {
      return res.status(400).json({ error: 'Missing postId' });
    }

    const { message, x, y, deathCause } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Missing message content' });
    }

    // Format spirit message text
    const commentText = `[Spirit Message] "${message}"\n- Died at Tile (${x}, ${y}) due to: ${deathCause || 'unknown'}`;

    // Post to Reddit as USER (runAs: 'USER') for attributable user content
    const comment = await reddit.submitComment({
      id: postId,
      text: commentText,
      runAs: 'USER'
    });

    // Also store locally in Redis to render in-game at specific coordinates
    const dateKey = getUtcDateKey();
    const messageKey = `${REDIS_PREFIX.SPIRIT_MESSAGES}${postId}:${dateKey}`;
    const localMessage = {
      id: comment.id,
      author: username,
      commentId: comment.id,
      x: parseInt(x, 10) || 0,
      y: parseInt(y, 10) || 0,
      message,
      votes: 0,
      timestamp: Date.now()
    };

    await redis.zAdd(messageKey, {
      member: JSON.stringify(localMessage),
      score: Date.now()
    });

    res.json({ success: true, commentId: comment.id });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to post spirit message' });
  }
});

// 6. GET /api/spirit-messages - Fetch today's local spirit messages
app.get('/api/spirit-messages', async (req, res) => {
  try {
    const postId = context.postId;
    if (!postId) {
      return res.status(400).json({ error: 'Missing postId' });
    }

    const dateKey = getUtcDateKey();
    const messageKey = `${REDIS_PREFIX.SPIRIT_MESSAGES}${postId}:${dateKey}`;
    
    const messagesJson = await redis.zRange(messageKey, 0, -1, { by: 'rank' });
    const messages = messagesJson.map((str) => {
      try {
        return JSON.parse(str);
      } catch {
        return null;
      }
    }).filter(Boolean);

    res.json({ messages });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch spirit messages' });
  }
});

const server = createServer(app);
server.on('error', (err) => console.error(`Server error: ${err.stack}`));
server.listen(getServerPort());
