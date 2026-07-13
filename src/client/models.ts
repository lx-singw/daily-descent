import type { LeaderboardEntry, Position, TacticalMarker } from '../shared/types.js';

export type Screen = 'briefing' | 'game' | 'result' | 'community';
export type Faction = 'lantern' | 'delvers' | 'keepers';
export type Loadout = 'ward' | 'thread' | 'spark';

export interface SeedResponse {
  seed: string;
  dateKey: string;
  runToken: string;
  collectiveGoalMet: boolean;
  todayGoalProgress: number;
  leaderEndpoint: (Position & { username: string; depth: number; duration: number }) | null;
  epitaphStats: Record<string, number>;
}

export interface GhostRecord { username: string; moveLog: string; deathCause?: string }

export interface BootstrapData {
  seed: SeedResponse;
  leaderboard: LeaderboardEntry[];
  ghosts: GhostRecord[];
  markers: TacticalMarker[];
}

export interface RunSummary {
  depth: number;
  duration: number;
  cause: string;
  position: Position;
  moves: string;
  relics: number;
  warningsSeen: number;
}

export interface GameEvents {
  onStats: (depth: number, health: number, relics: number) => void;
  onFinish: (summary: RunSummary) => void;
  onMessage: (message: string) => void;
}
