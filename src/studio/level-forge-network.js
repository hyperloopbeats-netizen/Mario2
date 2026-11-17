// 3 Connected Level-Generating Apps + LevelForgeNetwork Orchestrator
// Zero extra WebGL contexts — renders tactical 2D blueprints & deploys live 3D arenas across all games.
import { daemonSupervisor } from './daemons.js';
import { hybridScene } from './hybrid-scene.js';
import { buildSemanticAssembly } from './cad-presets.js';
import { dataVault } from './app-data-vault.js';
import { logGuardEvent } from './app-pattern-guard.js';

function mulberry32(seed) {
  let a = (Number(seed) || 101) >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const FRONTIER_ARCHETYPES = {
  angel_city: { name: 'Angel City Rooftops', skyColor: '#09111e', fogColor: '#0c1728', accentColor: '#38bdf8' },
  boomtown: { name: 'Boomtown Foundry', skyColor: '#160b07', fogColor: '#29120b', accentColor: '#f97316' },
  glitch: { name: 'Glitch Sim Matrix', skyColor: '#04121b', fogColor: '#082f49', accentColor: '#22d3ee' },
  forwardbase: { name: 'Forwardbase Kodai', skyColor: '#0b131f', fogColor: '#1e293b', accentColor: '#94a3b8' },
  colony: { name: 'Emerald Colony Spire', skyColor: '#061a12', fogColor: '#0c3020', accentColor: '#22c55e' }
};

export const FORTRESS_ARCHETYPES = {
  '2fort': { name: '2Fort Twin Bridge', skyColor: '#070b14', fogColor: '#111827', accentColor: '#38bdf8' },
  badlands: { name: 'Badlands Spire', skyColor: '#170d08', fogColor: '#2b160c', accentColor: '#f97316' },
  dustbowl: { name: 'Dustbowl Canyon', skyColor: '#14100b', fogColor: '#261e14', accentColor: '#eab308' },
  upward: { name: 'Upward Cliffside', skyColor: '#081826', fogColor: '#122c42', accentColor: '#38bdf8' },
  nucleus: { name: 'Nucleus Core Pit', skyColor: '#060c18', fogColor: '#0f172a', accentColor: '#a855f7' }
};

export const CROSS_BIOMES = {
  cyber_matrix: {
    label: 'Cyber Matrix Grid',
    hybridBiome: 'obsidian_studio',
    marioTheme: 'underground',
    skyColor: '#040816',
    fogColor: '#082f49',
    accentColor: '#22d3ee',
    keyColor: '#38bdf8',
    rimColor: '#ec4899',
    frontierArch: 'glitch',
    fortressArch: 'nucleus',
    cadPrompt: 'Cyber Quantum Monolith Spire'
  },
  volcanic_foundry: {
    label: 'Solar Volcanic Foundry',
    hybridBiome: 'solar_foundry',
    marioTheme: 'overworld',
    skyColor: '#1c0707',
    fogColor: '#450a0a',
    accentColor: '#f97316',
    keyColor: '#fb923c',
    rimColor: '#ef4444',
    frontierArch: 'boomtown',
    fortressArch: 'badlands',
    cadPrompt: 'Thermal Plasma Reactor Core'
  },
  orbital_void: {
    label: 'Zero-G Orbital Void',
    hybridBiome: 'orbital_void',
    marioTheme: 'sky',
    skyColor: '#020617',
    fogColor: '#0f172a',
    accentColor: '#a855f7',
    keyColor: '#e2e8f0',
    rimColor: '#a855f7',
    frontierArch: 'forwardbase',
    fortressArch: 'upward',
    cadPrompt: 'Orbital Antimatter Ring'
  },
  emerald_colony: {
    label: 'Bio-Emerald Canopy',
    hybridBiome: 'mushroom_twilight',
    marioTheme: 'overworld',
    skyColor: '#052e16',
    fogColor: '#14532d',
    accentColor: '#4ade80',
    keyColor: '#86efac',
    rimColor: '#22c55e',
    frontierArch: 'colony',
    fortressArch: '2fort',
    cadPrompt: 'Bio-Kinetic Jade Tower'
  },
  arctic_glass: {
    label: 'Cryo Arctic Citadel',
    hybridBiome: 'arctic_glass',
    marioTheme: 'sky',
    skyColor: '#082f49',
    fogColor: '#0c4a6e',
    accentColor: '#7dd3fc',
    keyColor: '#e0f2fe',
    rimColor: '#38bdf8',
    frontierArch: 'angel_city',
    fortressArch: 'dustbowl',
    cadPrompt: 'Cryogenic Sapphire Prism'
  }
};

// App 1: Frontier Level Architect (Titanfall 2 Wallrun Sectors)
export class FrontierLevelForgeApp {
  constructor(canvas, deps = {}) {
    this.canvas = canvas;
    this.ctx = canvas ? canvas.getContext('2d') : null;
    this.deps = deps;
    this.params = {
      archetype: 'angel_city',
      seed: 2077,
      corridorDensity: 0.7,
      verticality: 1.0,
      jumpPadCount: 6,
      batteryCount: 4
    };
    this.layout = null;
    this.generate();
  }

  setParams(partial) {
    Object.assign(this.params, partial);
    return this.generate();
  }

  generate() {
    const p = this.params;
    const arch = FRONTIER_ARCHETYPES[p.archetype] || FRONTIER_ARCHETYPES.angel_city;
    const rand = mulberry32(p.seed);
    const blocks = [];

    if (daemonSupervisor.daemons.frontierLevelArchitect.enabled) {
      daemonSupervisor.daemons.frontierLevelArchitect.sectorsForged++;
    }

    // Twin wallrun corridors scaled by archetype & density
    const laneCount = p.corridorDensity > 0.75 ? 3 : 2;
    const wallHeight = 9.5 * p.verticality;

    if (p.archetype === 'glitch' || p.archetype === 'colony') {
      // Symmetrical diamond/gauntlet chaining walls
      [-24, 24].forEach((lx) => {
        blocks.push({ x: lx, z: -18, w: 2.2, d: 22, h: wallHeight, wallrunnable: true, kind: 'wall' });
        blocks.push({ x: lx, z: 18, w: 2.2, d: 22, h: wallHeight, wallrunnable: true, kind: 'wall' });
      });
      blocks.push({ x: 0, z: -26, w: 24, d: 2.4, h: wallHeight * 0.9, wallrunnable: true, kind: 'wall' });
      blocks.push({ x: 0, z: 26, w: 24, d: 2.4, h: wallHeight * 0.9, wallrunnable: true, kind: 'wall' });
    } else {
      for (let i = 0; i < laneCount; i++) {
        const lx = 18 + i * 13;
        const gapShift = (rand() - 0.5) * 6;
        blocks.push({ x: -lx, z: -17 + gapShift, w: 2.4, d: 20, h: wallHeight, wallrunnable: true, kind: 'wall' });
        blocks.push({ x: -lx, z: 17 - gapShift, w: 2.4, d: 20, h: wallHeight, wallrunnable: true, kind: 'wall' });
        blocks.push({ x: lx, z: -17 - gapShift, w: 2.4, d: 20, h: wallHeight, wallrunnable: true, kind: 'wall' });
        blocks.push({ x: lx, z: 17 + gapShift, w: 2.4, d: 20, h: wallHeight, wallrunnable: true, kind: 'wall' });
      }
    }

    // Tactical rooftops & corner watchtowers (keeping z=±44 center spawn completely open!)
    const towerCount = Math.max(2, Math.round(p.corridorDensity * 4));
    const corners = [[-36, -34], [36, -34], [-36, 34], [36, 34]];
    for (let i = 0; i < towerCount; i++) {
      const [tx, tz] = corners[i];
      blocks.push({
        x: tx,
        z: tz,
        w: 8 + Math.round(rand() * 3),
        d: 8 + Math.round(rand() * 3),
        h: (7.2 + rand() * 3.5) * p.verticality,
        wallrunnable: true,
        kind: 'hazard'
      });
    }

    // Mid bunkers
    const bunkerSpan = 6 + Math.round(rand() * 3);
    blocks.push({ x: -12, z: 0, w: bunkerSpan, d: 10, h: 5.8 * p.verticality, wallrunnable: true, kind: 'concrete' });
    blocks.push({ x: 12, z: 0, w: bunkerSpan, d: 10, h: 5.8 * p.verticality, wallrunnable: true, kind: 'concrete' });

    // Zip Jump Pads
    const jumpPads = [];
    const padSlots = [[-16, 32], [16, 32], [-16, -32], [16, -32], [0, 14], [0, -14], [-30, 0], [30, 0]];
    for (let i = 0; i < Math.min(padSlots.length, p.jumpPadCount); i++) {
      jumpPads.push(padSlots[i]);
    }

    // Green Batteries
    const batteries = [];
    const batSlots = [[-28, 0], [28, 0], [0, 19], [0, -19], [-20, -24], [20, 24]];
    for (let i = 0; i < Math.min(batSlots.length, p.batteryCount); i++) {
      batteries.push(batSlots[i]);
    }

    this.layout = {
      name: `${arch.name} #${String(p.seed).slice(-3)}`,
      archetype: p.archetype,
      skyColor: arch.skyColor,
      fogColor: arch.fogColor,
      accentColor: arch.accentColor,
      blocks,
      jumpPads,
      batteries
    };
    this.render();
    return this.layout;
  }

  deployToTitanfall() {
    if (!this.layout) this.generate();
    const tf2 = this.deps.titanfallGame;
    if (tf2) {
      tf2.rebuildCustomArena(this.layout);
      if (tf2.state === 'MENU') tf2.startMatch();
    }
    daemonSupervisor.emit('level-frontier-deployed', this.layout);
    dataVault.addRecord('level_frontier', this.layout.name, this.layout);
    logGuardEvent('Frontier Level Forge', 'ok', `Deployed ${this.layout.name} (${this.layout.blocks.length} walls)`, false);
    this.render();
    return this.layout;
  }

  render() {
    if (!this.canvas || !this.ctx || !this.layout) return;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    ctx.fillStyle = '#04070e';
    ctx.fillRect(0, 0, w, h);

    // Subtle grid
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= w; x += 28) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y <= h; y += 28) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    const scale = Math.min(w, h) / 136;
    const cx = w * 0.5;
    const cy = h * 0.5;

    // Arena Boundary
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.strokeRect(cx - 62 * scale, cy - 62 * scale, 124 * scale, 124 * scale);

    // Blocks
    this.layout.blocks.forEach((b) => {
      ctx.fillStyle = b.kind === 'hazard'
        ? (this.layout.accentColor || '#f97316')
        : (b.kind === 'concrete' ? '#475569' : '#38bdf8');
      ctx.globalAlpha = b.kind === 'wall' ? 0.85 : 0.7;
      ctx.fillRect(cx + (b.x - b.w * 0.5) * scale, cy + (b.z - b.d * 0.5) * scale, b.w * scale, b.d * scale);
      ctx.globalAlpha = 1;
    });

    // Jump pads
    this.layout.jumpPads.forEach(([px, pz]) => {
      ctx.fillStyle = '#22d3ee';
      ctx.beginPath();
      ctx.arc(cx + px * scale, cy + pz * scale, 4.5, 0, Math.PI * 2);
      ctx.fill();
    });

    // Batteries
    this.layout.batteries.forEach(([bx, bz]) => {
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(cx + bx * scale - 3, cy + bz * scale - 3, 6, 6);
    });

    // Center Monument
    ctx.strokeStyle = '#f8fafc';
    ctx.beginPath();
    ctx.arc(cx, cy, 7, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#f8fafc';
    ctx.font = '600 12px "JetBrains Mono", monospace';
    ctx.fillText(
      `FRONTIER: ${this.layout.name} · ${this.layout.blocks.length} Wallrun Blocks · ${this.layout.jumpPads.length} Zip Pads`,
      14,
      22
    );
  }
}

// App 2: Fortress Symmetrical Arena Builder (Team Fortress 3D)
export class FortressMapForgeApp {
  constructor(canvas, deps = {}) {
    this.canvas = canvas;
    this.ctx = canvas ? canvas.getContext('2d') : null;
    this.deps = deps;
    this.params = {
      archetype: '2fort',
      seed: 4410,
      symmetryCover: 0.65,
      elevation: 1.0,
      jumpPadCount: 4
    };
    this.layout = null;
    this.generate();
  }

  setParams(partial) {
    Object.assign(this.params, partial);
    return this.generate();
  }

  generate() {
    const p = this.params;
    const arch = FORTRESS_ARCHETYPES[p.archetype] || FORTRESS_ARCHETYPES['2fort'];
    const rand = mulberry32(p.seed);
    const blocks = [];

    if (daemonSupervisor.daemons.fortressArenaBuilder.enabled) {
      daemonSupervisor.daemons.fortressArenaBuilder.mapsForged++;
    }

    // Symmetrical RED (-x) & BLU (+x) bases keeping spawn (x=±38, z=±5) wide open!
    const baseDepth = 9 + Math.round(rand() * 2);
    const battlementH = 2.2 * p.elevation;
    [-1, 1].forEach((side) => {
      const team = side < 0 ? 'red' : 'blu';
      blocks.push({ x: side * 42, y: 2.5, z: -18, w: baseDepth, h: 5, d: 11, team });
      blocks.push({ x: side * 42, y: 2.5, z: 18, w: baseDepth, h: 5, d: 11, team });
      blocks.push({ x: side * 24, y: 1.9, z: -12, w: 2.4, h: 3.8, d: 8, team });
      blocks.push({ x: side * 24, y: 1.9, z: 12, w: 2.4, h: 3.8, d: 8, team });
      blocks.push({ x: side * 27, y: battlementH, z: -20, w: 5.5, h: 0.65, d: 8.5, kind: 'wood' });
      blocks.push({ x: side * 27, y: battlementH, z: 20, w: 5.5, h: 0.65, d: 8.5, kind: 'wood' });
      blocks.push({ x: side * 31, y: 0.55, z: -17, w: 2.4, h: 1.1, d: 2.4, kind: 'wood' });
      blocks.push({ x: side * 31, y: 0.55, z: 17, w: 2.4, h: 1.1, d: 2.4, kind: 'wood' });
    });

    // Mid-field tactical cover (mirrored for competitive balance!)
    const pairs = p.symmetryCover > 0.7 ? 3 : 2;
    for (let i = 0; i < pairs; i++) {
      const mx = 10 + i * 7 + rand() * 3;
      const mz = 11 + i * 4 + (rand() - 0.5) * 4;
      const mh = (3.4 + rand() * 1.8) * p.elevation;
      blocks.push({ x: -mx, y: mh * 0.5, z: -mz, w: 3.6, h: mh, d: 3.6, kind: 'rock' });
      blocks.push({ x: -mx, y: mh * 0.5, z: mz, w: 3.6, h: mh, d: 3.6, kind: 'rock' });
      blocks.push({ x: mx, y: mh * 0.5, z: -mz, w: 3.6, h: mh, d: 3.6, kind: 'rock' });
      blocks.push({ x: mx, y: mh * 0.5, z: mz, w: 3.6, h: mh, d: 3.6, kind: 'rock' });
    }

    // Center Bridge Pillars
    [[-6.5, -5.5], [-6.5, 5.5], [6.5, -5.5], [6.5, 5.5]].forEach(([px, pz]) => {
      blocks.push({ x: px, y: 1.6, z: pz, w: 1.4, h: 3.2, d: 1.4, kind: 'wood' });
    });

    const jumpPads = [];
    const padPool = [[-21, 0], [21, 0], [0, -22], [0, 22], [-15, -18], [15, 18]];
    for (let i = 0; i < Math.min(padPool.length, p.jumpPadCount); i++) {
      jumpPads.push(padPool[i]);
    }

    const pickups = [
      { type: 'health', x: -16, z: -20 },
      { type: 'health', x: 16, z: 20 },
      { type: 'health', x: 0, z: 18 },
      { type: 'health', x: 0, z: -18 },
      { type: 'ammo', x: -16, z: 20 },
      { type: 'ammo', x: 16, z: -20 }
    ];

    this.layout = {
      name: `${arch.name} #${String(p.seed).slice(-3)}`,
      archetype: p.archetype,
      skyColor: arch.skyColor,
      fogColor: arch.fogColor,
      accentColor: arch.accentColor,
      blocks,
      jumpPads,
      pickups
    };
    this.render();
    return this.layout;
  }

  deployToFortress() {
    if (!this.layout) this.generate();
    const tf = this.deps.fortressGame;
    if (tf) {
      tf.rebuildCustomArena(this.layout);
      if (tf.state === 'MENU') tf.startMatch();
    }
    daemonSupervisor.emit('level-fortress-deployed', this.layout);
    dataVault.addRecord('level_fortress', this.layout.name, this.layout);
    logGuardEvent('Fortress Map Forge', 'ok', `Deployed ${this.layout.name} (${this.layout.blocks.length} mirrored structures)`, false);
    this.render();
    return this.layout;
  }

  render() {
    if (!this.canvas || !this.ctx || !this.layout) return;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    ctx.fillStyle = '#05070d';
    ctx.fillRect(0, 0, w, h);

    const sx = (w - 40) / 108;
    const sy = (h - 48) / 72;
    const scale = Math.min(sx, sy);
    const cx = w * 0.5;
    const cy = h * 0.54;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.strokeRect(cx - 52 * scale, cy - 34 * scale, 104 * scale, 68 * scale);

    this.layout.blocks.forEach((b) => {
      ctx.fillStyle = b.team === 'red' ? '#ef4444' : (b.team === 'blu' ? '#38bdf8' : (b.kind === 'wood' ? '#d4a373' : '#94a3b8'));
      ctx.fillRect(cx + (b.x - b.w * 0.5) * scale, cy + (b.z - b.d * 0.5) * scale, b.w * scale, b.d * scale);
    });

    this.layout.jumpPads.forEach(([px, pz]) => {
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(cx + px * scale, cy + pz * scale, 4, 0, Math.PI * 2);
      ctx.fill();
    });

    // KOTH point ring
    ctx.strokeStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(cx, cy, 4.5 * scale, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#f8fafc';
    ctx.font = '600 12px "JetBrains Mono", monospace';
    ctx.fillText(
      `FORTRESS: ${this.layout.name} · Symmetric RED/BLU · ${this.layout.blocks.length} Structures`,
      14,
      22
    );
  }
}

// App 3: Cross-Biome Level Cross-Synthesizer (Unified Across Every Game & Studio App)
export class CrossBiomeLevelApp {
  constructor(canvas, frontierApp, fortressApp, deps = {}) {
    this.canvas = canvas;
    this.ctx = canvas ? canvas.getContext('2d') : null;
    this.frontierApp = frontierApp;
    this.fortressApp = fortressApp;
    this.deps = deps;
    this.selectedBiome = 'cyber_matrix';
    this.seed = 9001;
    this.chaosFactor = 0.55;
    this.lastSyncSummary = 'Ready to cross-synthesize synchronized levels across all OS engines.';
    this.render();
  }

  synthesizeAll(biomeId = this.selectedBiome, customStyle = null) {
    this.selectedBiome = CROSS_BIOMES[biomeId] ? biomeId : 'cyber_matrix';
    const b = CROSS_BIOMES[this.selectedBiome];
    this.seed = Math.floor(1000 + Math.random() * 8999);

    if (daemonSupervisor.daemons.crossGamePortalSync.enabled) {
      daemonSupervisor.daemons.crossGamePortalSync.crossSyncs++;
    }
    if (daemonSupervisor.daemons.marioTileTopology.enabled) {
      daemonSupervisor.daemons.marioTileTopology.levelsSynthesized++;
    }

    // 1. Update Frontier Level Forge & deploy if Titanfall is initialized
    const wallArch = customStyle === 'spire' ? 'colony' : (customStyle === 'gauntlet' ? 'glitch' : b.frontierArch);
    const frontierLayout = this.frontierApp.setParams({
      archetype: wallArch,
      seed: this.seed,
      corridorDensity: Math.min(1, 0.5 + this.chaosFactor * 0.5),
      verticality: 0.9 + this.chaosFactor * 0.45
    });
    frontierLayout.skyColor = b.skyColor;
    frontierLayout.fogColor = b.fogColor;
    frontierLayout.accentColor = b.accentColor;
    if (this.deps.titanfallGame?.glReady) {
      this.deps.titanfallGame.rebuildCustomArena(frontierLayout);
    }

    // 2. Update Fortress Map Forge & deploy if Fortress is initialized
    const fortLayout = this.fortressApp.setParams({
      archetype: b.fortressArch,
      seed: this.seed + 7,
      symmetryCover: Math.min(1, 0.4 + this.chaosFactor * 0.55),
      elevation: 0.9 + this.chaosFactor * 0.35
    });
    fortLayout.skyColor = b.skyColor;
    fortLayout.fogColor = b.fogColor;
    fortLayout.accentColor = b.accentColor;
    if (this.deps.fortressGame?.glReady) {
      this.deps.fortressGame.rebuildCustomArena(fortLayout);
    }

    // 3. Synchronize World Forge & Mario 2D/3D (load custom level safely)
    if (this.deps.worldForgeApp) {
      this.deps.worldForgeApp.applyParams({
        name: `${b.label} Stage`,
        theme: b.marioTheme,
        skyColor: b.skyColor,
        fogColor: b.fogColor,
        seed: this.seed,
        platformDensity: 0.45 + this.chaosFactor * 0.4,
        enemyDensity: 0.35 + this.chaosFactor * 0.45
      });
      this.deps.worldForgeApp.pushToMario(false);
    }

    // 4. Synchronize CAD Centerpiece + Hybrid Scene + Production Matrix
    const cadAsm = buildSemanticAssembly(b.cadPrompt, this.seed);
    if (this.deps.cadApp) this.deps.cadApp.setAssembly(cadAsm);
    if (this.deps.matrixEngine) this.deps.matrixEngine.setCadAssembly(cadAsm);
    if (this.deps.titanfallGame) this.deps.titanfallGame.syncFromOS();
    if (this.deps.fortressGame) this.deps.fortressGame.setCenterMonument(cadAsm);

    hybridScene.applyBiome(b.hybridBiome);
    hybridScene.applyConfig({
      bgColor: b.skyColor,
      fogColor: b.fogColor,
      keyColor: b.keyColor,
      rimColor: b.rimColor,
      gridColor: b.accentColor
    });

    daemonSupervisor.emit('biome-cross-synced', { biome: this.selectedBiome, seed: this.seed, cad: cadAsm.name });
    dataVault.addRecord('cross_biome_sync', `${b.label} #${this.seed}`, { biome: this.selectedBiome, seed: this.seed });
    this.lastSyncSummary = `Synced "${b.label}" (#${this.seed}) -> Titanfall 2, Team Fortress, Mario, CAD & Matrix.`;
    this.render();
    return this.lastSyncSummary;
  }

  render() {
    if (!this.canvas || !this.ctx) return;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const b = CROSS_BIOMES[this.selectedBiome] || CROSS_BIOMES.cyber_matrix;

    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, b.skyColor);
    grad.addColorStop(1, b.fogColor);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    const nodes = [
      { label: 'CROSS-BIOME', x: w * 0.5, y: h * 0.5, col: b.accentColor },
      { label: 'TITANFALL 2', x: w * 0.2, y: h * 0.26, col: '#f97316' },
      { label: 'FORTRESS 3D', x: w * 0.8, y: h * 0.26, col: '#ef4444' },
      { label: 'SUPER MARIO', x: w * 0.2, y: h * 0.76, col: '#38bdf8' },
      { label: 'CAD & MATRIX', x: w * 0.8, y: h * 0.76, col: '#22c55e' }
    ];

    const hub = nodes[0];
    nodes.slice(1).forEach((n) => {
      ctx.strokeStyle = b.accentColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(hub.x, hub.y);
      ctx.lineTo(n.x, n.y);
      ctx.stroke();
    });

    nodes.forEach((n, idx) => {
      ctx.fillStyle = '#060a12';
      ctx.strokeStyle = n.col;
      ctx.lineWidth = idx === 0 ? 3 : 2;
      ctx.beginPath();
      ctx.arc(n.x, n.y, idx === 0 ? 44 : 32, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#f8fafc';
      ctx.font = '600 10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(n.label, n.x, n.y + 4);
    });
    ctx.textAlign = 'left';

    ctx.fillStyle = '#f8fafc';
    ctx.font = '600 12px "JetBrains Mono", monospace';
    ctx.fillText(`${b.label} · Seed #${this.seed}`, 14, 22);
  }
}

export class LevelForgeNetwork {
  constructor(canvases, deps = {}) {
    this.deps = deps;
    this.frontier = new FrontierLevelForgeApp(canvases.frontier, deps);
    this.fortress = new FortressMapForgeApp(canvases.fortress, deps);
    this.biome = new CrossBiomeLevelApp(canvases.biome, this.frontier, this.fortress, deps);
  }
}
