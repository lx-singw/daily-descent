import type { BootstrapData, RunSummary, SeedResponse } from './models.js';
import type { LeaderboardEntry, TacticalMarker } from '../shared/types.js';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(path, { ...init, signal: controller.signal, headers: { 'Content-Type': 'application/json', ...init?.headers } });
    if (!response.ok) throw new Error((await response.json().catch(() => ({}))).message || `Request failed (${response.status})`);
    return await response.json() as T;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function loadBootstrap(): Promise<BootstrapData> {
  const [seed, leaderboard, ghosts, markers] = await Promise.all([
    request<SeedResponse>('/api/seed'),
    request<{ leaderboard: LeaderboardEntry[] }>('/api/leaderboard'),
    request<{ ghosts: BootstrapData['ghosts'] }>('/api/ghosts'),
    request<{ markers: TacticalMarker[] }>('/api/markers'),
  ]);
  return { seed, leaderboard: leaderboard.leaderboard, ghosts: ghosts.ghosts, markers: markers.markers };
}

export function submitRun(summary: RunSummary, seed: string, runToken: string) {
  return request<{ success: boolean }>('/api/run', {
    method: 'POST',
    body: JSON.stringify({ runToken, depth: summary.depth, duration: summary.duration, deathLocation: summary.position, deathCause: summary.cause, moveLog: summary.moves, seed }),
  });
}

export function placeMarker(markerId: number, x: number, y: number) {
  return request('/api/marker', { method: 'POST', body: JSON.stringify({ markerId, x, y, postComment: false }) });
}
