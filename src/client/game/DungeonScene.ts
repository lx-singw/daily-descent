import Phaser from 'phaser';
import { DungeonGenerator } from '../../shared/DungeonGenerator.js';
import { compressPath } from '../../server/pipeline/pathValidator.js';

export class DungeonScene extends Phaser.Scene {
  private generator!: DungeonGenerator;
  private playerSprite!: Phaser.GameObjects.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<string, Phaser.Input.Keyboard.Key>;
  private pathSteps: { x: number; y: number; t: number }[] = [];
  private startTimestamp = 0;
  
  // Game session properties
  private playerX = 4;
  private playerY = 4;
  private seed = '';
  private runToken = '';
  private currentPerk = 'None';
  private leaderEndpoint: { x: number; y: number; username: string } | null = null;
  private dailyGoalProgress = 0;
  private isDead = false;
  private scoreText!: Phaser.GameObjects.Text;
  
  // Ghost and marker data
  private ghosts: { username: string; moveLog: string; deathCause?: string }[] = [];
  private markers: { x: number; y: number; markerId: number; author: string }[] = [];

  constructor() {
    super('DungeonScene');
  }

  init() {
    this.pathSteps = [];
    this.startTimestamp = Date.now();
    this.isDead = false;
  }

  async create() {
    // 1. Fetch seed & initial stats from Devvit backend
    try {
      const response = await fetch('/api/seed');
      if (!response.ok) throw new Error('Failed to load seed');
      const data = await response.json();
      
      this.seed = data.seed;
      this.runToken = data.runToken || '';
      this.dailyGoalProgress = data.todayGoalProgress || 0;
      this.leaderEndpoint = data.leaderEndpoint;
      this.currentPerk = data.collectiveGoalMet ? 'Extra Torch (+1 Light)' : 'None';
      
      // Initialize dungeon generator
      this.generator = new DungeonGenerator(this.seed);
      const startPos = this.generator.getStartPosition();
      this.playerX = startPos.x;
      this.playerY = startPos.y;
    } catch (err) {
      console.error(err);
      // Mock seed fallback for local dev sandbox
      this.seed = 'seed_local_mock_123';
      this.generator = new DungeonGenerator(this.seed);
      this.playerX = 4;
      this.playerY = 4;
    }

    // 2. Fetch ghosts and markers
    try {
      const ghostsRes = await fetch('/api/ghosts');
      if (ghostsRes.ok) {
        const data = await ghostsRes.json();
        this.ghosts = data.ghosts || [];
      }
      const markersRes = await fetch('/api/markers');
      if (markersRes.ok) {
        const data = await markersRes.json();
        this.markers = data.markers || [];
      }
    } catch (e) {
      // Ignore errors in mock/local mode
    }

    // 3. Render map (Walls and floors)
    const tileSize = 32;
    for (let y = 0; y < this.generator.height; y++) {
      for (let x = 0; x < this.generator.width; x++) {
        const tileKey = this.generator.grid[y][x] === 1 ? 'wall' : 'floor';
        this.add.sprite(x * tileSize + 16, y * tileSize + 16, tileKey);
      }
    }

    // 4. Render leader endpoint if exists
    if (this.leaderEndpoint) {
      this.add.sprite(
        this.leaderEndpoint.x * tileSize + 16,
        this.leaderEndpoint.y * tileSize + 16,
        'leader'
      ).setAlpha(0.8);
    }

    // 5. Render tactical markers
    for (const m of this.markers) {
      this.add.sprite(m.x * tileSize + 16, m.y * tileSize + 16, 'marker').setAlpha(0.9);
    }

    // 6. Spawn player sprite
    this.playerSprite = this.add.sprite(this.playerX * tileSize + 16, this.playerY * tileSize + 16, 'player');

    // 7. Setup inputs
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.wasd = {
        W: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        A: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        S: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        D: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      };
    }

    // 8. Set camera bounds & follow
    this.cameras.main.setBounds(0, 0, this.generator.width * tileSize, this.generator.height * tileSize);
    this.cameras.main.startFollow(this.playerSprite, true, 0.1, 0.1);

    // 9. Overlay HUD text
    this.scoreText = this.add.text(16, 16, `Seed: ${this.seed}\nPerk: ${this.currentPerk}\nGoal progress: ${this.dailyGoalProgress}/25`, {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#66fcf1',
      backgroundColor: '#000000a0',
      padding: { x: 8, y: 8 }
    }).setScrollFactor(0);

    // Press SPACE to manually submit a death and end the run (or test submit)
    const spaceKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    spaceKey?.on('down', () => this.die('Spike Trap'));
  }

  update(time: number, delta: number) {
    if (this.isDead || !this.playerSprite || !this.cursors) return;

    // Throttle movements to 200ms per step
    const lastStep = this.pathSteps[this.pathSteps.length - 1];
    const offset = Date.now() - this.startTimestamp;
    
    if (lastStep && (offset - lastStep.t) < 200) {
      return;
    }

    let dx = 0;
    let dy = 0;

    if (this.cursors.left.isDown || this.wasd.A.isDown) dx = -1;
    else if (this.cursors.right.isDown || this.wasd.D.isDown) dx = 1;
    else if (this.cursors.up.isDown || this.wasd.W.isDown) dy = -1;
    else if (this.cursors.down.isDown || this.wasd.S.isDown) dy = 1;

    if (dx !== 0 || dy !== 0) {
      const nextX = this.playerX + dx;
      const nextY = this.playerY + dy;

      if (this.generator.isWalkable(nextX, nextY)) {
        this.playerX = nextX;
        this.playerY = nextY;
        this.playerSprite.setPosition(this.playerX * 32 + 16, this.playerY * 32 + 16);
        
        this.pathSteps.push({
          x: this.playerX,
          y: this.playerY,
          t: offset
        });
      }
    }
  }

  async die(cause: string) {
    if (this.isDead) return;
    this.isDead = true;

    // Flash screen red on death
    this.cameras.main.flash(400, 255, 0, 0);

    const moveLogStr = compressPath(
      this.pathSteps[0]?.x || this.playerSprite.x / 32 - 0.5,
      this.pathSteps[0]?.y || this.playerSprite.y / 32 - 0.5,
      this.startTimestamp,
      this.pathSteps
    );

    // Calculate maximum depth reached (mock rooms logic)
    const maxDepth = Math.max(1, Math.floor((this.playerX + this.playerY) / 10));

    const payload = {
      runToken: this.runToken,
      depth: maxDepth,
      duration: Date.now() - this.startTimestamp,
      deathLocation: { x: this.playerX, y: this.playerY },
      deathCause: cause,
      moveLog: moveLogStr,
      seed: this.seed,
      timestamp: Date.now()
    };

    // Submit to backend API
    try {
      await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (e) {
      console.error('Failed to submit run:', e);
    }

    // Wait a brief moment and transition to ResultScene
    this.time.delayedCall(1000, () => {
      this.scene.start('ResultScene', {
        x: this.playerX,
        y: this.playerY,
        depth: maxDepth,
        seed: this.seed
      });
    });
  }
}
