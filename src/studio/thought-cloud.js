// Single-Input Hyper-Awareness Matrix ("Thought Cloud")
// Reads live state across every running game & studio engine, then alters active gameplay rules, lighting,
// physics, time-scale, audio tempo, CAD centerpieces, and level layouts from one unified input window.
import { daemonSupervisor } from './daemons.js';
import { hybridScene } from './hybrid-scene.js';
import { buildSemanticAssembly } from './cad-presets.js';
import { dataVault } from './app-data-vault.js';
import { logGuardEvent } from './app-pattern-guard.js';

export const THOUGHT_SEEDS = [
  { label: 'Zero-G Moon Neon', prompt: 'zero gravity neon cyber matrix with infinite jumps' },
  { label: 'Blood Moon Apocalypse', prompt: 'blood moon scorch volcanic inferno rapid fire chaos' },
  { label: 'Bullet-Time Overdrive', prompt: 'slow bullet time cinema orbital drop titanium' },
  { label: 'Turbo Parkour Gauntlet', prompt: 'turbo parkour speed sonic glitch maze arena' },
  { label: 'Cryo Arctic Stasis', prompt: 'cryo arctic frost sapphire slow precision' },
  { label: 'Reset Standard', prompt: 'standard tactical balanced reality' }
];

export class HyperThoughtCloudApp {
  constructor(canvas, deps = {}) {
    this.canvas = canvas;
    this.ctx = canvas ? canvas.getContext('2d') : null;
    this.deps = deps;
    this.pulsePhase = 0;
    this.shockwave = 0;
    this.activeSpec = {
      prompt: 'Standard OS Reality',
      title: 'Standard Tactical Baseline',
      skyColor: '#09111e',
      fogColor: '#0c1728',
      keyColor: '#fff1d6',
      rimColor: '#38bdf8',
      accentColor: '#f97316',
      gravity: 32,
      speedMult: 1.0,
      fireRateMult: 1.0,
      damageMult: 1.0,
      timeScale: 1.0,
      wallrunSpeed: 17.5,
      infiniteJumps: false,
      titanInstant: false,
      levelStyle: 'keep',
      tempo: 145
    };
    this.history = [];
  }

  captureAwarenessSnapshot() {
    const tf2 = this.deps.titanfallGame;
    const tf = this.deps.fortressGame;
    const mario = this.deps.marioEngine;
    const cad = this.deps.cadApp;
    const daemons = daemonSupervisor.getList();
    const activeDaemons = daemons.filter((d) => d.enabled).length;

    const snap = {
      titanfall: {
        state: tf2?.state || 'OFFLINE',
        mode: tf2?.player?.mode || 'pilot',
        militia: tf2?.scores?.militia || 0,
        imc: tf2?.scores?.imc || 0,
        gravity: tf2?.gravity ?? 32
      },
      fortress: {
        state: tf?.state || 'OFFLINE',
        classId: tf?.playerClassId || 'soldier',
        red: tf?.scores?.red || 0,
        blu: tf?.scores?.blu || 0
      },
      mario: {
        state: mario?.state || 'TITLE_MENU',
        world: mario?.level?.id || '1-1',
        score: mario?.score || 0
      },
      cad: cad?.currentAssembly?.name || 'Cryo-Turbine',
      daemonsActive: activeDaemons,
      daemonsTotal: daemons.length
    };

    if (daemonSupervisor.daemons.hyperAwarenessMatrix.enabled) {
      daemonSupervisor.daemons.hyperAwarenessMatrix.syncTicks++;
    }
    return snap;
  }

  executeThought(prompt, remoteSpec = null) {
    const cleanPrompt = String(prompt || '').trim() || 'Hyper-Awareness Shift';
    const snapshot = this.captureAwarenessSnapshot();

    // Parse & Safety-clamp via Daemons 27 & 36
    const rawSpec = remoteSpec
      ? { ...daemonSupervisor.parseThoughtCloud(cleanPrompt, snapshot), ...remoteSpec, prompt: cleanPrompt }
      : daemonSupervisor.parseThoughtCloud(cleanPrompt, snapshot);
    const spec = daemonSupervisor.clampMutationSpec(rawSpec);
    this.activeSpec = spec;
    this.shockwave = 1.0;

    // Reset baseline if user explicitly asks for standard
    if (/standard|reset|normal/.test(cleanPrompt.toLowerCase())) {
      spec.gravity = 32;
      spec.speedMult = 1.0;
      spec.fireRateMult = 1.0;
      spec.damageMult = 1.0;
      spec.timeScale = 1.0;
      spec.wallrunSpeed = 17.5;
      spec.infiniteJumps = false;
      spec.titanInstant = false;
      spec.levelStyle = 'keep';
    }

    // 1. Live-Mutate Wallrun & Physics Daemons
    daemonSupervisor.daemons.wallrunPhysics.wallSpeed = spec.wallrunSpeed;
    daemonSupervisor.daemons.realityRuleOverwriter.timeScale = spec.timeScale;
    daemonSupervisor.daemons.realityRuleOverwriter.rulesOverwritten++;
    daemonSupervisor.daemons.biomeAtmosphereMutator.mutationsCount++;

    // 2. Live-Mutate Titanfall 2 (mid-match, no restart required!)
    if (this.deps.titanfallGame) {
      this.deps.titanfallGame.applyThoughtMutation(spec);
    }

    // 3. Live-Mutate Team Fortress 3D
    if (this.deps.fortressGame) {
      this.deps.fortressGame.applyThoughtMutation(spec);
    }

    // 4. Live-Mutate Super Mario (2D & 3D)
    if (this.deps.marioEngine) {
      this.deps.marioEngine.applyThoughtMutation(spec);
    }
    if (this.deps.marioRenderer3D) {
      this.deps.marioRenderer3D.applyThoughtMutation(spec);
    }

    // 5. Live-Mutate Hybrid Scene, Shader Lab & Matrix
    hybridScene.applyBiome(spec.biome || 'obsidian_studio');
    hybridScene.applyConfig({
      bgColor: spec.skyColor,
      fogColor: spec.fogColor,
      keyColor: spec.keyColor,
      rimColor: spec.rimColor,
      gridColor: spec.accentColor
    });
    if (this.deps.shaderLabApp) {
      this.deps.shaderLabApp.applyProfile({
        bgColor: spec.skyColor,
        rimColor: spec.rimColor,
        gridColor: spec.accentColor,
        sunColorA: spec.accentColor,
        sunColorB: spec.keyColor
      });
    }

    // 6. Optional Live Architectural Rebuild if requested (maze, gauntlet, spire, fortress)
    if (spec.levelStyle && spec.levelStyle !== 'keep' && this.deps.levelForgeNetwork) {
      const biomeKey = spec.biome === 'solar_foundry'
        ? 'volcanic_foundry'
        : (spec.biome === 'orbital_void' ? 'orbital_void' : (spec.biome === 'arctic_glass' ? 'arctic_glass' : 'cyber_matrix'));
      this.deps.levelForgeNetwork.biome.synthesizeAll(biomeKey, spec.levelStyle);
    } else if (/cad|spire|reactor|tower|dragon|titan/.test(cleanPrompt.toLowerCase())) {
      const asm = buildSemanticAssembly(cleanPrompt, Date.now());
      if (this.deps.cadApp) this.deps.cadApp.setAssembly(asm);
      if (this.deps.matrixEngine) this.deps.matrixEngine.setCadAssembly(asm);
      if (this.deps.titanfallGame) this.deps.titanfallGame.syncFromOS();
      if (this.deps.fortressGame) this.deps.fortressGame.setCenterMonument(asm);
    }

    // 7. Live-Mutate Sonic Fireball FX & Beat Tempo
    if (this.deps.sonicApp) {
      this.deps.sonicApp.applyScore({
        name: spec.title,
        tempo: spec.tempo || 148,
        fireColor: spec.accentColor || '#38bdf8'
      }, false);
    }
    daemonSupervisor.daemons.audioBeatSync.fireColor = spec.accentColor || '#38bdf8';

    this.history.unshift({ prompt: cleanPrompt, title: spec.title, ts: new Date().toLocaleTimeString() });
    if (this.history.length > 5) this.history.pop();

    daemonSupervisor.emit('thought-cloud-applied', spec);
    dataVault.addRecord('thought_cloud', spec.title || cleanPrompt, spec);
    logGuardEvent('Thought Cloud', 'ok', `Reality Shifted: ${spec.title} (g=${spec.gravity.toFixed(1)}, spd=${spec.speedMult.toFixed(2)}x, time=${spec.timeScale.toFixed(2)}x)`, false);
    this.render(0.016);
    return spec;
  }

  render(dt = 0.016) {
    if (!this.canvas || !this.ctx) return;
    this.pulsePhase += dt * 2.2;
    this.shockwave = Math.max(0, this.shockwave - dt * 1.4);

    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const s = this.activeSpec;
    const snap = this.captureAwarenessSnapshot();

    ctx.fillStyle = '#04070e';
    ctx.fillRect(0, 0, w, h);

    // Subtle Thought Aura Gradient
    const cx = w * 0.5;
    const cy = h * 0.48;
    const accent = s.accentColor || '#38bdf8';
    const grad = ctx.createRadialGradient(cx, cy, 12, cx, cy, w * (0.34 + this.shockwave * 0.25));
    grad.addColorStop(0, accent + '48');
    grad.addColorStop(1, 'rgba(4, 7, 14, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Expanding shockwave ring on thought execution
    if (this.shockwave > 0.01) {
      ctx.strokeStyle = accent;
      ctx.lineWidth = 2;
      ctx.globalAlpha = this.shockwave;
      ctx.beginPath();
      ctx.arc(cx, cy, (1 - this.shockwave) * Math.min(w, h) * 0.46, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    const targets = [
      { name: 'TITANFALL 2', sub: `${snap.titanfall.state} · ${snap.titanfall.mode.toUpperCase()}`, x: w * 0.18, y: h * 0.24, col: '#f97316' },
      { name: 'TEAM FORTRESS', sub: `${snap.fortress.state} · ${snap.fortress.classId.toUpperCase()}`, x: w * 0.82, y: h * 0.24, col: '#ef4444' },
      { name: 'SUPER MARIO', sub: `${snap.mario.state} · W${snap.mario.world}`, x: w * 0.16, y: h * 0.72, col: '#38bdf8' },
      { name: 'LEVEL FORGE', sub: '3 Generators Synced', x: w * 0.84, y: h * 0.72, col: '#22c55e' },
      { name: 'CAD & SHADERS', sub: snap.cad.slice(0, 18), x: w * 0.5, y: h * 0.15, col: '#a855f7' },
      { name: '36 DAEMONS', sub: `${snap.daemonsActive}/${snap.daemonsTotal} Online`, x: w * 0.5, y: h * 0.84, col: '#facc15' }
    ];

    // Neural Connections
    targets.forEach((t, i) => {
      const pulse = 0.35 + Math.sin(this.pulsePhase + i * 0.9) * 0.25;
      ctx.strokeStyle = accent;
      ctx.lineWidth = 1.6;
      ctx.globalAlpha = pulse;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(t.x, t.y);
      ctx.stroke();
      ctx.globalAlpha = 1;
    });

    // Central Hyper-Awareness Thought Cloud Core
    const coreR = 54 + Math.sin(this.pulsePhase) * 3;
    ctx.fillStyle = '#070b14';
    ctx.strokeStyle = accent;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#f8fafc';
    ctx.font = '700 11px "JetBrains Mono", monospace';
    ctx.fillText('THOUGHT CLOUD', cx, cy - 10);
    ctx.fillStyle = accent;
    ctx.font = '600 10px "JetBrains Mono", monospace';
    ctx.fillText(`GRAV ${Number(s.gravity).toFixed(1)} · TIME ${Number(s.timeScale).toFixed(2)}x`, cx, cy + 7);
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText(`SPD ${Number(s.speedMult).toFixed(2)}x · ROF ${Number(s.fireRateMult).toFixed(2)}x`, cx, cy + 22);

    // Connected Nodes
    targets.forEach((t) => {
      ctx.fillStyle = 'rgba(7, 11, 20, 0.94)';
      ctx.strokeStyle = t.col;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.roundRect(t.x - 76, t.y - 20, 152, 40, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#f8fafc';
      ctx.font = '600 10px "JetBrains Mono", monospace';
      ctx.fillText(t.name, t.x, t.y - 3);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '500 9px "JetBrains Mono", monospace';
      ctx.fillText(t.sub, t.x, t.y + 11);
    });
    ctx.textAlign = 'left';

    ctx.fillStyle = '#f8fafc';
    ctx.font = '600 11px "JetBrains Mono", monospace';
    ctx.fillText(
      `ACTIVE REALITY: ${s.title}${s.infiniteJumps ? ' · INF JUMP' : ''}${s.titanInstant ? ' · INSTANT TITAN' : ''}`,
      14,
      20
    );
  }
}
