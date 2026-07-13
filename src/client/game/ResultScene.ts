import Phaser from 'phaser';

export class ResultScene extends Phaser.Scene {
  private deathX = 0;
  private deathY = 0;
  private depthReached = 1;
  private seed = '';
  private leaderboard: any[] = [];
  
  constructor() {
    super('ResultScene');
  }

  init(data: { x: number; y: number; depth: number; seed: string }) {
    this.deathX = data.x || 0;
    this.deathY = data.y || 0;
    this.depthReached = data.depth || 1;
    this.seed = data.seed || '';
  }

  async create() {
    this.add.text(400, 80, 'YOU DIED', {
      fontFamily: 'monospace',
      fontSize: '48px',
      color: '#ff0055'
    }).setOrigin(0.5);

    this.add.text(400, 150, `Room Depth: ${this.depthReached}\nFallen Coordinate: (${this.deathX}, ${this.deathY})`, {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#c5c6c7',
      align: 'center'
    }).setOrigin(0.5);

    // Fetch daily leaderboard
    try {
      const response = await fetch('/api/leaderboard');
      if (response.ok) {
        const data = await response.json();
        this.leaderboard = data.leaderboard || [];
      }
    } catch (e) {
      console.error(e);
    }

    // Render leaderboard entries
    this.add.text(400, 210, 'DAILY LEADERBOARD', {
      fontFamily: 'monospace',
      fontSize: '20px',
      color: '#66fcf1'
    }).setOrigin(0.5);

    let listText = '';
    const displayCount = Math.min(this.leaderboard.length, 5);
    for (let i = 0; i < displayCount; i++) {
      const entry = this.leaderboard[i];
      listText += `#${i + 1} ${entry.username} - Depth ${entry.depth} (${Math.round(entry.duration / 1000)}s)\n`;
    }
    if (listText === '') {
      listText = 'No runs submitted yet today.';
    }

    this.add.text(400, 290, listText, {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#45a29e',
      align: 'center'
    }).setOrigin(0.5);

    // Tactical Marker Buttons
    this.add.text(400, 390, 'LEAVE A TACTICAL WARNING WARNING:', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#66fcf1'
    }).setOrigin(0.5);

    const warnings = ['Trap!', 'Dead end', 'Heal here', 'Boss route', 'I regret everything'];
    warnings.forEach((txt, idx) => {
      const btn = this.add.text(400, 430 + idx * 28, `[${txt}]`, {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#ff0055'
      }).setOrigin(0.5).setInteractive();

      btn.on('pointerdown', () => this.submitMarker(idx));
      btn.on('pointerover', () => btn.setColor('#ffffff'));
      btn.on('pointerout', () => btn.setColor('#ff0055'));
    });

    const restartBtn = this.add.text(400, 575, '[RESTART GAME]', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#66fcf1'
    }).setOrigin(0.5).setInteractive();

    restartBtn.on('pointerdown', () => this.scene.start('DungeonScene'));
    restartBtn.on('pointerover', () => restartBtn.setColor('#ffffff'));
    restartBtn.on('pointerout', () => restartBtn.setColor('#66fcf1'));
  }

  async submitMarker(markerId: number) {
    try {
      const response = await fetch('/api/marker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          markerId,
          x: this.deathX,
          y: this.deathY,
          postComment: true
        })
      });
      if (response.ok) {
        alert('Marker placed on Reddit successfully!');
      } else {
        const err = await response.json();
        alert(`Failed to place marker: ${err.message || err.error}`);
      }
    } catch (e) {
      alert('Network error submitting marker.');
    }
  }
}
