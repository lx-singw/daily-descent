// Grid system dimensions
export const GRID_CELL_SIZE = 1; // logical units

// Anti-cheat verification constraints
export const MAX_PLAYER_SPEED_TILES_PER_SEC = 5; // max tiles per second
export const MOVE_INTERVAL_MIN_MS = 180; // minimum duration between movements in ms (with 20ms fudge factor for client ticks)
export const RUN_REQUEST_LATENCY_ALLOWANCE_MS = 10_000;
export const DUNGEON_WIDTH = 60;
export const DUNGEON_HEIGHT = 60;
export const DEPTH_TILES_PER_LEVEL = 5;

// Storage limits
export const MAX_MOVE_LOG_BYTES = 12 * 1024; // 12KB max string limit for compressed paths
export const MAX_MOVE_STEPS = 1000;
export const MAX_LEADERBOARD_ENTRIES = 100;
export const MAX_GHOST_TRAILS_PER_SEED = 15;
export const GHOST_TRAILS_TTL_DAYS = 7;

// Redis Keyspace Prefixes
export const REDIS_PREFIX = {
  SEED: 'daily_seed:',
  LEADERBOARD: 'leaderboard:',
  GHOST_TRAILS: 'ghost_trails:',
  ROLLOVER_LOCK: 'rollover_lock:',
  TACTICAL_MARKERS: 'tactical_markers:',
  EPITAPH_STATS: 'epitaph_stats:',
  COLLECTIVE_GOAL: 'collective_goal:'
};

// Predefined warnings/markers
export const PREDEFINED_MARKERS = [
  "Trap!",
  "Dead end",
  "Heal here",
  "Boss route",
  "I regret everything"
] as const;

// Predefined death causes/epitaphs
export const PREDEFINED_DEATH_CAUSES = [
  "Greed",
  "Spike Trap",
  "Guard Corner"
] as const;

export const MAX_TACTICAL_MARKERS = 50;
export const MAX_TACTICAL_MARKERS_PER_USER_DAILY = 3;

// Key TTL values in seconds
export const TTL_DAILY_KEYS_SEC = 30 * 24 * 3600; // 30 days
export const TTL_GHOST_TRAILS_SEC = 7 * 24 * 3600; // 7 days
export const TTL_TACTICAL_MARKERS_SEC = 7 * 24 * 3600; // 7 days
export const TTL_RUN_TOKEN_SEC = 3600; // 1 hour
export const TTL_SUBMISSION_LOCK_SEC = 15;
export const TTL_MARKER_ENTITLEMENT_SEC = 15 * 60;

// Allowed card effects (from docs/03-architecture.md)
export const ALLOWED_CARD_EFFECTS = ['heal', 'damage_bonus', 'speed_bonus'] as const;
export type AllowedCardEffect = typeof ALLOWED_CARD_EFFECTS[number];
