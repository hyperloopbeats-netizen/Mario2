// Generation Triad App 1: World & Level Forge (Procedural + Gemini AI Playable Stages)
import { LEVEL_HEIGHT } from '../mario/levels.js';
import { daemonSupervisor } from './daemons.js';
import { hybridScene } from './hybrid-scene.js';

function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class WorldForgeApp {
  constructor(previewCanvas, marioEngine, renderer3D) {
    this.canvas = previewCanvas;
    this.ctx = previewCanvas.getContext('2d');
    this.marioEngine = marioEngine;
    this.renderer3D = renderer3D;

    this.params = {
      name: 'Obsidian Foundry Sector',
      theme: 'overworld',
      skyColor: '#1d4ed8',
      fogColor: '#3b82f6',
      seed: 4207,
      gravity: 40,
      pitFrequency: 0.16,
      platformDensity: 0.55,
      enemyDensity: 0.52,
      coinRichness: 0.65,
      pipeCount: 4
    };

    this.currentLevel = null;
    this.rebuildWorld();
  }

  applyParams(partial) {
    Object.assign(this.params, partial);
    this.rebuildWorld();
  }

  rebuildWorld() {
    const p = this.params;
    const width = 148;
    const grid = Array.from({ length: LEVEL_HEIGHT }, () => Array(width).fill('.'));
    const rand = mulberry32(Number(p.seed) || 101);

    // Safe starting shelf
    for (let c = 0; c < 18; c++) {
      grid[13][c] = '#';
      grid[14][c] = '#';
    }

    // Generate playable floor segments with tuned pitFrequency
    let c = 18;
    while (c < width - 24) {
      const segLen = 8 + Math.floor(rand() * 14);
      const end = Math.min(width - 24, c + segLen);
      for (let x = c; x < end; x++) {
        grid[13][x] = '#';
        grid[14][x] = '#';
      }
      c = end;
      if (rand() < p.pitFrequency && c < width - 28) {
        const gap = 2 + Math.floor(rand() * 2);
        if (p.theme === 'sky' || rand() < 0.45) {
          for (let gx = c; gx < c + gap; gx++) {
            grid[11][gx] = 'P';
          }
        }
        c += gap;
      }
    }

    // Victory apron
    for (let x = width - 24; x < width; x++) {
      grid[13][x] = '#';
      grid[14][x] = '#';
    }

    if (p.theme === 'underground') {
      for (let x = 6; x < width - 22; x++) {
        grid[1][x] = 'B';
      }
    }

    // Question blocks, brick clusters, and platforms
    for (let x = 14; x < width - 28; x += 5) {
      if (rand() < p.platformDensity) {
        const span = 3 + Math.floor(rand() * 4);
        const row = rand() < 0.4 ? 6 : 9;
        for (let k = 0; k < span && x + k < width - 26; k++) {
          const rVal = rand();
          if (k === Math.floor(span / 2) && rVal < 0.35) grid[row][x + k] = 'M';
          else if (rVal < 0.28) grid[row][x + k] = '?';
          else if (rVal < 0.34) grid[row][x + k] = 'S';
          else grid[row][x + k] = p.theme === 'sky' && row === 9 ? 'P' : 'B';

          if (rand() < p.coinRichness) {
            grid[Math.max(2, row - 1)][x + k] = 'C';
          }
        }
      }
    }

    // Coin arcs
    for (let x = 22; x < width - 30; x += 11) {
      if (rand() < p.coinRichness) {
        for (let k = 0; k < 3; k++) {
          if (grid[8][x + k] === '.') grid[8][x + k] = 'C';
        }
      }
    }

    // Pipes placed strictly on solid ground segments
    const pipes = [];
    const targetPipes = Math.max(1, Math.min(8, Math.round(p.pipeCount)));
    for (let i = 0; i < targetPipes; i++) {
      const px = 22 + Math.floor((i + 0.5) * ((width - 54) / targetPipes));
      if (grid[13][px] === '#' && grid[13][px + 1] === '#') {
        const height = 2 + (i % 3);
        pipes.push({
          x: px,
          topRow: 13 - height,
          height,
          piranha: rand() < 0.6
        });
      }
    }

    // End staircase before flagpole
    const stairBase = width - 22;
    for (let i = 0; i < 5; i++) {
      for (let h = 0; h <= i; h++) {
        grid[12 - h][stairBase + i] = 'H';
      }
    }
    for (let h = 0; h < 5; h++) {
      grid[12 - h][stairBase + 5] = 'H';
    }

    // Enemies
    const enemies = [];
    const enemyStep = Math.max(4, Math.round(14 - p.enemyDensity * 10));
    for (let x = 18; x < width - 28; x += enemyStep) {
      if (grid[13][x] !== '#') continue;
      const isKoopa = rand() < 0.32;
      enemies.push({
        type: isKoopa ? 'koopa' : 'goomba',
        color: rand() < 0.5 ? 'red' : 'green',
        x,
        y: isKoopa ? 11.6 : 12
      });
    }

    const themeColors = {
      overworld: { sky: '#3b82f6', fog: '#60a5fa' },
      underground: { sky: '#070a14', fog: '#0f172a' },
      sky: { sky: '#1e3a8a', fog: '#3b82f6' }
    };

    const validHex = (s, fb) => (typeof s === 'string' && /^#[0-9a-fA-F]{6}$/.test(s) ? s : fb);
    const skyColor = validHex(p.skyColor, themeColors[p.theme]?.sky || '#3b82f6');
    const fogColor = validHex(p.fogColor, themeColors[p.theme]?.fog || '#60a5fa');

    this.currentLevel = {
      id: `FORGE-${String(p.seed).slice(-3)}`,
      name: p.name,
      theme: p.theme,
      skyColor,
      fogColor,
      gravity: Number(p.gravity) || 40,
      _customSignature: `forge_${p.seed}_${Date.now()}`,
      width,
      grid,
      pipes,
      enemies,
      flagX: width - 13,
      castleX: width - 8,
      spawn: { x: 3, y: 11 }
    };

    this.renderMinimap();
    daemonSupervisor.emit('triad-world-updated', this.params);
    return this.currentLevel;
  }

  pushToMario(autoPlay = true) {
    if (!this.currentLevel) this.rebuildWorld();
    this.marioEngine.loadCustomLevel(this.currentLevel, autoPlay);
    this.renderer3D.invalidateScene();
  }

  syncToSceneDesigner() {
    const biomeMap = {
      overworld: 'mushroom_twilight',
      underground: 'obsidian_studio',
      sky: 'arctic_glass'
    };
    hybridScene.applyBiome(biomeMap[this.params.theme] || 'obsidian_studio');
    hybridScene.applyConfig({
      fogColor: this.currentLevel?.fogColor || this.params.fogColor
    });
  }

  renderMinimap() {
    if (!this.canvas || !this.ctx || !this.currentLevel) return;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const lvl = this.currentLevel;

    ctx.fillStyle = lvl.skyColor;
    ctx.fillRect(0, 0, w, h);

    const tileW = w / lvl.width;
    const tileH = h / LEVEL_HEIGHT;

    for (let r = 0; r < LEVEL_HEIGHT; r++) {
      for (let c = 0; c < lvl.width; c++) {
        const ch = lvl.grid[r][c];
        if (ch === '.') continue;
        if (ch === '#') ctx.fillStyle = lvl.theme === 'underground' ? '#1e40af' : '#c2410c';
        else if (ch === 'B') ctx.fillStyle = '#ea580c';
        else if (ch === '?' || ch === 'M' || ch === 'S') ctx.fillStyle = '#facc15';
        else if (ch === 'H') ctx.fillStyle = '#78350f';
        else if (ch === 'P') ctx.fillStyle = '#ef4444';
        else if (ch === 'C') ctx.fillStyle = '#fef08a';
        ctx.fillRect(c * tileW, r * tileH, Math.max(1.5, tileW + 0.5), Math.max(1.5, tileH + 0.5));
      }
    }

    ctx.fillStyle = '#22c55e';
    for (const pipe of lvl.pipes) {
      ctx.fillRect(pipe.x * tileW, pipe.topRow * tileH, tileW * 2, pipe.height * tileH);
    }

    ctx.fillStyle = '#f43f5e';
    for (const e of lvl.enemies) {
      ctx.fillRect(e.x * tileW, e.y * tileH, Math.max(3, tileW), Math.max(3, tileH));
    }

    // Flagpole marker
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(lvl.flagX * tileW, 3 * tileH, Math.max(2, tileW * 0.6), 10 * tileH);
  }
}
