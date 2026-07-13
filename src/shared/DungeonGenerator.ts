/**
 * A simple seeded pseudo-random number generator (Mulberry32).
 * Ensures deterministic random values across client and server.
 */
export class SeededRandom {
  private state: number;

  constructor(seedStr: string) {
    // Generate a simple numeric hash from the seed string
    let h = 2166136261;
    for (let i = 0; i < seedStr.length; i++) {
      h = Math.imul(h ^ seedStr.charCodeAt(i), 16777619);
    }
    this.state = h >>> 0;
  }

  /**
   * Returns a pseudo-random float between 0 (inclusive) and 1 (exclusive).
   */
  next(): number {
    let t = this.state += 0x6d2b79f5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Returns a pseudo-random integer between min (inclusive) and max (inclusive).
   */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
}

/**
 * Deterministic Dungeon Generator shared between Client and Server.
 * Generates a simple grid layout of connected rooms.
 */
export class DungeonGenerator {
  public width = 60; // Total dungeon width in tiles
  public height = 60; // Total dungeon height in tiles
  public grid: number[][]; // 0 = floor/walkable, 1 = wall/blocked
  private rand: SeededRandom;
  private startPosition: { x: number; y: number } = { x: 4, y: 4 };

  constructor(seed: string) {
    this.rand = new SeededRandom(seed);
    this.grid = Array(this.height).fill(null).map(() => Array(this.width).fill(1));
    this.generate();
  }

  private generate(): void {
    const rooms: { x: number; y: number; w: number; h: number }[] = [];
    const minSize = 6;
    const maxSize = 12;
    const roomCount = 12;

    // 1. Generate random non-overlapping rooms
    for (let i = 0; i < roomCount; i++) {
      const w = this.rand.nextInt(minSize, maxSize);
      const h = this.rand.nextInt(minSize, maxSize);
      // Leave borders
      const x = this.rand.nextInt(2, this.width - w - 2);
      const y = this.rand.nextInt(2, this.height - h - 2);

      // Check overlap
      let overlap = false;
      for (const r of rooms) {
        if (x < r.x + r.w && x + w > r.x && y < r.y + r.h && y + h > r.y) {
          overlap = true;
          break;
        }
      }

      if (!overlap) {
        rooms.push({ x, y, w, h });
        // Carve floor
        for (let ry = y; ry < y + h; ry++) {
          for (let rx = x; rx < x + w; rx++) {
            this.grid[ry][rx] = 0;
          }
        }
      }
    }

    // Determine a dynamic, valid start position (center of first room).
    if (rooms.length > 0) {
      this.startPosition = {
        x: Math.floor(rooms[0].x + rooms[0].w / 2),
        y: Math.floor(rooms[0].y + rooms[0].h / 2)
      };
    }

    // 2. Connect rooms with simple L-shaped corridors
    for (let i = 0; i < rooms.length - 1; i++) {
      const roomA = rooms[i];
      const roomB = rooms[i + 1];

      const startX = Math.floor(roomA.x + roomA.w / 2);
      const startY = Math.floor(roomA.y + roomA.h / 2);
      const endX = Math.floor(roomB.x + roomB.w / 2);
      const endY = Math.floor(roomB.y + roomB.h / 2);

      // Horizontal connection
      const xMin = Math.min(startX, endX);
      const xMax = Math.max(startX, endX);
      for (let x = xMin; x <= xMax; x++) {
        this.grid[startY][x] = 0;
      }

      // Vertical connection
      const yMin = Math.min(startY, endY);
      const yMax = Math.max(startY, endY);
      for (let y = yMin; y <= yMax; y++) {
        this.grid[y][endX] = 0;
      }
    }
  }

  /**
   * Checks if a logical tile position is walkable.
   */
  public isWalkable(x: number, y: number): boolean {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return false;
    }
    return this.grid[y][x] === 0;
  }

  /**
   * Gets a valid starting position (the center of the first generated room).
   */
  public getStartPosition(): { x: number; y: number } {
    return { ...this.startPosition };
  }
}
