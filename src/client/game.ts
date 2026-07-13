import Phaser from 'phaser';
import { DungeonGenerator, SeededRandom } from '../shared/DungeonGenerator.js';
import type { BootstrapData, GameEvents, Loadout, RunSummary } from './models.js';
import { deriveDepth } from '../shared/types.js';

const TILE = 30;
const COLORS = { void: 0x090b0a, floor: 0x171a17, floorAlt: 0x1e211c, wall: 0x33372f, edge: 0xc86d3c, ember: 0xef8a4c, bone: 0xf0eadb, acid: 0xb7ce63, danger: 0xdb4f70, ghost: 0x78d8cb };

type Dir = 'U' | 'D' | 'L' | 'R';
const DELTA: Record<Dir, [number, number]> = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0] };

class DescentScene extends Phaser.Scene {
  private dungeon!: DungeonGenerator;
  private player!: Phaser.GameObjects.Container;
  private fog!: Phaser.GameObjects.Graphics;
  private expeditionData!: BootstrapData;
  private eventsApi!: GameEvents;
  private startTime = 0;
  private health = 3;
  private relics = 0;
  private warnings = 0;
  private moves: { dir: Dir; t: number }[] = [];
  private position = { x: 0, y: 0 };
  private start = { x: 0, y: 0 };
  private moving = false;
  private discovered = new Set<string>();
  private hazards = new Map<string, 'spike' | 'relic' | 'shrine'>();
  private loadout: Loadout = 'ward';

  constructor() { super('descent'); }

  init(payload: { data: BootstrapData; events: GameEvents; loadout: Loadout }) {
    this.expeditionData = payload.data; this.eventsApi = payload.events; this.loadout = payload.loadout;
  }

  create() {
    this.cameras.main.setBackgroundColor(COLORS.void);
    this.dungeon = new DungeonGenerator(this.expeditionData.seed.seed);
    this.start = this.dungeon.getStartPosition();
    this.position = { ...this.start };
    this.drawDungeon();
    this.seedHazards();
    this.drawMarkers();
    this.drawGhosts();
    this.createPlayer();
    this.fog = this.add.graphics().setDepth(20);
    this.reveal();
    this.cameras.main.startFollow(this.player, true, .12, .12);
    this.cameras.main.setZoom(1.22);
    this.startTime = Date.now();
    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => {
      const map: Record<string, Dir> = { ArrowUp: 'U', w: 'U', W: 'U', ArrowDown: 'D', s: 'D', S: 'D', ArrowLeft: 'L', a: 'L', A: 'L', ArrowRight: 'R', d: 'R', D: 'R' };
      if (map[e.key]) { e.preventDefault(); this.step(map[e.key]); }
    });
    this.game.events.on('step', this.step, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.game.events.off('step', this.step, this));
    this.eventsApi.onMessage('Your torch catches. Every footprint here belongs to today.');
    this.eventsApi.onStats(1, this.health, this.relics);
  }

  private drawDungeon() {
    const g = this.add.graphics();
    for (let y = 0; y < this.dungeon.height; y++) for (let x = 0; x < this.dungeon.width; x++) {
      if (!this.dungeon.isWalkable(x, y)) continue;
      const alt = (x * 7 + y * 11) % 5 === 0;
      g.fillStyle(alt ? COLORS.floorAlt : COLORS.floor).fillRect(x * TILE, y * TILE, TILE, TILE);
      g.lineStyle(1, 0x2a2e28, .5).strokeRect(x * TILE, y * TILE, TILE, TILE);
      const sides: [number, number, number, number][] = [[0,-1,0,0],[0,1,0,TILE],[ -1,0,0,0],[1,0,TILE,0]];
      sides.forEach(([dx,dy,ox,oy], i) => { if (!this.dungeon.isWalkable(x+dx,y+dy)) { g.lineStyle(2, i < 2 ? COLORS.wall : 0x292d27, 1); i < 2 ? g.lineBetween(x*TILE,y*TILE+oy,x*TILE+TILE,y*TILE+oy) : g.lineBetween(x*TILE+ox,y*TILE,x*TILE+ox,y*TILE+TILE); } });
    }
    g.setDepth(0);
    if (!this.textures.exists('dust')) {
      const dust = this.make.graphics({ x: 0, y: 0 });
      dust.fillStyle(0xffffff).fillCircle(2, 2, 2).generateTexture('dust', 4, 4).destroy();
    }
    const particles = this.add.particles(0, 0, 'dust', { x: { min: 0, max: this.dungeon.width*TILE }, y: { min: 0, max: this.dungeon.height*TILE }, lifespan: 5000, speedY: { min: -3, max: -8 }, scale: { start: .8, end: 0 }, alpha: { start: .15, end: 0 }, tint: COLORS.ember, frequency: 180 });
    particles.setDepth(2);
  }

  private seedHazards() {
    const rand = new SeededRandom(`${this.expeditionData.seed.seed}:events`);
    const floors: {x:number;y:number}[] = [];
    for (let y=0;y<this.dungeon.height;y++) for(let x=0;x<this.dungeon.width;x++) if(this.dungeon.isWalkable(x,y) && Math.abs(x-this.start.x)+Math.abs(y-this.start.y)>5) floors.push({x,y});
    for(let i=0;i<28 && floors.length;i++) {
      const p=floors.splice(rand.nextInt(0,floors.length-1),1)[0];
      const kind=i%7===0?'shrine':i%3===0?'relic':'spike'; this.hazards.set(`${p.x},${p.y}`,kind);
      const symbol=kind==='spike'?'×':kind==='relic'?'◆':'◇';
      this.add.text(p.x*TILE+TILE/2,p.y*TILE+TILE/2,symbol,{fontFamily:'monospace',fontSize:kind==='spike'?'17px':'19px',color:kind==='spike'?'#db4f70':kind==='relic'?'#b7ce63':'#ef8a4c'}).setOrigin(.5).setDepth(3);
    }
  }

  private drawMarkers() {
    this.expeditionData.markers.slice(0,12).forEach((m) => {
      if (!this.dungeon.isWalkable(m.x,m.y)) return;
      const ring=this.add.circle(m.x*TILE+TILE/2,m.y*TILE+TILE/2,10,COLORS.danger,.1).setStrokeStyle(1,COLORS.danger,.8).setDepth(4);
      this.tweens.add({targets:ring,alpha:.25,scale:1.35,duration:1100,yoyo:true,repeat:-1});
    });
  }

  private drawGhosts() {
    this.expeditionData.ghosts.slice(0,6).forEach((ghost,index) => {
      const points = decodeMoves(ghost.moveLog, this.start).slice(0,120);
      if(points.length<2)return;
      const echo=this.add.circle(points[0].x*TILE+TILE/2,points[0].y*TILE+TILE/2,5,COLORS.ghost,.22).setDepth(5);
      let n=0; this.time.addEvent({delay:260+index*24,loop:true,callback:()=>{ n=(n+1)%points.length; this.tweens.add({targets:echo,x:points[n].x*TILE+TILE/2,y:points[n].y*TILE+TILE/2,duration:180}); }});
    });
  }

  private createPlayer() {
    const x=this.position.x*TILE+TILE/2,y=this.position.y*TILE+TILE/2;
    const glow=this.add.circle(0,0,21,COLORS.ember,.12);
    const body=this.add.circle(0,0,7,COLORS.bone).setStrokeStyle(2,COLORS.ember);
    const flame=this.add.triangle(7,-8,0,8,4,0,8,8,COLORS.ember);
    this.player=this.add.container(x,y,[glow,body,flame]).setDepth(12);
    this.tweens.add({targets:glow,scale:1.15,alpha:.18,duration:900,yoyo:true,repeat:-1});
  }

  private reveal() {
    for(let dy=-4;dy<=4;dy++)for(let dx=-4;dx<=4;dx++) if(dx*dx+dy*dy<=18)this.discovered.add(`${this.position.x+dx},${this.position.y+dy}`);
    this.fog.clear().fillStyle(COLORS.void,.84);
    for(let y=0;y<this.dungeon.height;y++) for(let x=0;x<this.dungeon.width;x++) {
      if(this.dungeon.isWalkable(x,y) && !this.discovered.has(`${x},${y}`)) this.fog.fillRect(x*TILE,y*TILE,TILE,TILE);
    }
  }

  step(direction: Dir) {
    if(this.moving)return;
    const [dx,dy]=DELTA[direction]; const nx=this.position.x+dx,ny=this.position.y+dy;
    if(!this.dungeon.isWalkable(nx,ny)){this.cameras.main.shake(60,.002);this.eventsApi.onMessage('Stone. Choose another way.');return;}
    this.moving=true;this.position={x:nx,y:ny};
    this.tweens.add({targets:this.player,x:nx*TILE+TILE/2,y:ny*TILE+TILE/2,duration:this.loadout==='thread'?185:200,ease:'Sine.Out',onComplete:()=>{this.moves.push({dir:direction,t:Date.now()-this.startTime});this.moving=false;this.resolveTile();this.reveal();}});
  }

  private resolveTile() {
    const event=this.hazards.get(`${this.position.x},${this.position.y}`);
    if(event==='spike') { this.hazards.delete(`${this.position.x},${this.position.y}`); this.health-=this.loadout==='ward'&&this.health===3?0:1; this.cameras.main.flash(100,219,79,112); this.cameras.main.shake(180,.007); this.eventsApi.onMessage(this.health===3?'The Ash Ward breaks. You remain standing.':'A buried mechanism drinks the light.'); }
    if(event==='relic'){this.hazards.delete(`${this.position.x},${this.position.y}`);this.relics++;this.eventsApi.onMessage('Recovered: a fallen delver’s ember. The expedition remembers.');}
    if(event==='shrine'){this.hazards.delete(`${this.position.x},${this.position.y}`);if(this.health<3)this.health++;this.eventsApi.onMessage('The Ember Shrine answers every delver differently.');}
    const depth=deriveDepth(this.start,this.position);
    this.eventsApi.onStats(depth,this.health,this.relics);
    if(this.health<=0 || depth>=12) this.finish(depth,this.health<=0?'Spike Trap':'The Twelfth Gate');
  }

  private finish(depth:number,cause:string){
    this.moving=true;this.cameras.main.fadeOut(700,9,11,10);
    const summary:RunSummary={depth,duration:Date.now()-this.startTime,cause,position:{...this.position},moves:encodeMoves(this.start,this.moves),relics:this.relics,warningsSeen:this.warnings};
    this.time.delayedCall(760,()=>this.eventsApi.onFinish(summary));
  }
}

export function createGame(parent:string,data:BootstrapData,events:GameEvents,loadout:Loadout) {
  const game=new Phaser.Game({type:Phaser.AUTO,parent,width:900,height:620,backgroundColor:'#090b0a',pixelArt:true,antialias:true,scale:{mode:Phaser.Scale.RESIZE,autoCenter:Phaser.Scale.CENTER_BOTH},scene:DescentScene,physics:{default:'arcade'},render:{powerPreference:'high-performance'}});
  game.scene.start('descent',{data,events,loadout}); return game;
}

export function encodeMoves(start:{x:number;y:number},moves:{dir:Dir;t:number}[]) {
  let x=start.x,y=start.y;
  const parts=[`${x},${y},${Date.now()-Math.max(0,moves.at(-1)?.t||0)}`];
  moves.forEach((move)=>{const[dx,dy]=DELTA[move.dir];x+=dx;y+=dy;parts.push(`${move.dir}1`,`C,${x},${y},${move.t}`);});
  return parts.join(':');
}
export function decodeMoves(log:string,fallback:{x:number;y:number}) {
  if(log.includes('|')) { const [head,raw='']=log.split('|');const [sx,sy]=head.split(',').map(Number);let p={x:Number.isFinite(sx)?sx:fallback.x,y:Number.isFinite(sy)?sy:fallback.y};const points=[{...p}];for(const d of raw){if(!(d in DELTA))continue;const[dx,dy]=DELTA[d as Dir];p={x:p.x+dx,y:p.y+dy};points.push({...p});}return points; }
  const [header,...segments]=log.split(':');const [sx,sy]=header.split(',').map(Number);let p={x:Number.isFinite(sx)?sx:fallback.x,y:Number.isFinite(sy)?sy:fallback.y};const points=[{...p}];for(const segment of segments){const dir=segment[0] as Dir;if(!(dir in DELTA))continue;const count=Number(segment.slice(1))||0;for(let i=0;i<count;i++){const[dx,dy]=DELTA[dir];p={x:p.x+dx,y:p.y+dy};points.push({...p});}}return points;
}
