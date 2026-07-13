import { DEPTH_TILES_PER_LEVEL } from './constants.js';

export interface Position {
  x: number;
  y: number;
}

export function deriveDepth(start: Position, end: Position): number {
  const distance = Math.abs(end.x - start.x) + Math.abs(end.y - start.y);
  return Math.max(1, Math.floor(distance / DEPTH_TILES_PER_LEVEL) + 1);
}

export interface RunResult {
  username: string;
  depth: number;
  duration: number; // Duration of run in milliseconds
  deathLocation?: Position;
  deathCause?: string;
  moveLog: string; // Delta-compressed directional move log
  timestamp: number; // UTC timestamp of run completion
  seed: string; // The seed this run was played on
}

export interface DecodedGhostStep {
  x: number;
  y: number;
  t: number; // Milliseconds offset from run start
}

export interface DecodedGhostTrail {
  username: string;
  steps: DecodedGhostStep[];
  deathCause?: string;
}

export interface LeaderboardEntry {
  username: string;
  depth: number;
  duration: number; // ms
  timestamp: number; // ms
  verified: boolean; // anti-cheat verification status
}

export interface TacticalMarker {
  id: string;
  author: string;
  commentId?: string; // Reddit comment ID if posted to Reddit
  x: number;
  y: number;
  markerId: number; // index of PREDEFINED_MARKERS
  timestamp: number;
}

export interface Card {
  id: string;
  name: string;
  effect: 'heal' | 'damage_bonus' | 'speed_bonus';
  value: number;
  creator?: string;
  votes?: number;
}
