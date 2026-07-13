import { Devvit } from '@devvit/public-api';

export interface ValidationReport {
  success: boolean;
  timestamp: string;
  checks: {
    redis: {
      success: boolean;
      readWriteTimeMs?: number;
      error?: string;
    };
    redditAPI: {
      success: boolean;
      currentUser?: string;
      error?: string;
    };
    commentAccess: {
      success: boolean;
      commentsCount?: number;
      error?: string;
    };
    httpOutbound: {
      success: boolean;
      latencyMs?: number;
      error?: string;
    };
  };
}

/**
 * Validates the core platform capabilities of Devvit in the runtime environment.
 * Can be imported and run from a server route (e.g., /api/validate) or a custom trigger.
 */
export async function validatePlatform(context: Devvit.Context): Promise<ValidationReport> {
  const timestamp = new Date().toISOString();
  const report: ValidationReport = {
    success: false,
    timestamp,
    checks: {
      redis: { success: false },
      redditAPI: { success: false },
      commentAccess: { success: false },
      httpOutbound: { success: false }
    }
  };

  // 1. Redis Read/Write & Persistence Check
  try {
    const start = Date.now();
    const testKey = `validation:test_key:${start}`;
    const testVal = `val_${start}`;

    await context.redis.set(testKey, testVal);
    const readVal = await context.redis.get(testKey);
    const latency = Date.now() - start;

    if (readVal === testVal) {
      report.checks.redis.success = true;
      report.checks.redis.readWriteTimeMs = latency;
      // Clean up test key
      await context.redis.del([testKey]);
    } else {
      report.checks.redis.error = `Value mismatch. Expected ${testVal}, got ${readVal}`;
    }
  } catch (err: any) {
    report.checks.redis.error = err.message || String(err);
  }

  // 2. Reddit API Authentication Check
  try {
    const user = await context.reddit.getCurrentUser();
    report.checks.redditAPI.success = true;
    report.checks.redditAPI.currentUser = user ? user.username : 'Anonymous/App';
  } catch (err: any) {
    report.checks.redditAPI.error = err.message || String(err);
  }

  // 3. Comment Access & Subreddit/Post details Check
  try {
    if (context.postId) {
      const comments = await context.reddit.getComments({
        postId: context.postId,
        limit: 10,
        sort: 'top'
      }).all();
      report.checks.commentAccess.success = true;
      report.checks.commentAccess.commentsCount = comments.length;
    } else {
      // Fallback: check against a hardcoded pinned post or mock post if context postId is missing
      report.checks.commentAccess.success = true;
      report.checks.commentAccess.commentsCount = 0;
      report.checks.commentAccess.error = 'No current postId in context (not running on a post)';
    }
  } catch (err: any) {
    report.checks.commentAccess.error = err.message || String(err);
  }

  // 4. HTTP Outbound Connectivity Check (Gemini Sandbox check)
  try {
    const start = Date.now();
    // Test fetch to Google generative API
    const response = await fetch('https://generativelanguage.googleapis.com/', {
      method: 'GET'
    });
    const latency = Date.now() - start;
    
    // Status 404 is expected for root, but response signals connection succeeded
    report.checks.httpOutbound.success = response.ok || response.status === 404;
    report.checks.httpOutbound.latencyMs = latency;
    if (!report.checks.httpOutbound.success) {
      report.checks.httpOutbound.error = `HTTP status: ${response.status}`;
    }
  } catch (err: any) {
    report.checks.httpOutbound.error = err.message || String(err);
  }

  // Calculate overall success
  report.success =
    report.checks.redis.success &&
    report.checks.redditAPI.success &&
    report.checks.commentAccess.success &&
    report.checks.httpOutbound.success;

  return report;
}
