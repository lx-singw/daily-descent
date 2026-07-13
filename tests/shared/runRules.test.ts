import { describe, expect, test } from 'vitest';
import { DungeonGenerator } from '../../src/shared/DungeonGenerator.js';
import { deriveDepth } from '../../src/shared/types.js';

describe('shared run rules', () => {
  test('derives depth relative to the issued start position', () => {
    const start = { x: 30, y: 30 };
    expect(deriveDepth(start, start)).toBe(1);
    expect(deriveDepth(start, { x: 35, y: 30 })).toBe(2);
    expect(deriveDepth(start, { x: 25, y: 35 })).toBe(3);
  });

  test('generates the same dungeon and walkable start for a seed', () => {
    const first = new DungeonGenerator('2026-07-13:test');
    const second = new DungeonGenerator('2026-07-13:test');
    const firstStart = first.getStartPosition();
    const secondStart = second.getStartPosition();

    expect(secondStart).toEqual(firstStart);
    expect(first.isWalkable(firstStart.x, firstStart.y)).toBe(true);
    expect(second.isWalkable(secondStart.x, secondStart.y)).toBe(true);

    for (let y = 0; y < first.height; y += 5) {
      for (let x = 0; x < first.width; x += 5) {
        expect(second.isWalkable(x, y)).toBe(first.isWalkable(x, y));
      }
    }
  });
});
