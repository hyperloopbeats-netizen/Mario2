// Network of 5 Sentient Game Design Apps — Co-Designing Skins, Rigs, Physics & AI across Titanfall 2, TF3D, Mario & CAD
import { SKIN_PALETTES, renderSkinAtlasPreview } from './pbr-skins.js';
import { TITAN_CLASSES } from '../titanfall/tf2-data.js';
import { daemonSupervisor } from './daemons.js';
import { dataVault } from './app-data-vault.js';

export class SentientArchitectApp {
  constructor(canvas, bus) {
    this.canvas = canvas;
    this.bus = bus;
    this.pulse = 0;
    this.spec = {
      title: 'Frontier Protocol // SRS-7274',
      biome: 'Angel City Night',
      primary: '#4b5d3b',
      secondary: '#e2e8f0',
      accent: '#f97316',
      visor: '#38bdf8',
      stencil: 'BT-7274',
      titanClass: 'vanguard',
      gravity: 32,
      wallSpeed: 17.5,
      airAccel: 14.0
    };
  }

  applyBlueprint(spec, pushToAll = true) {
    this.spec = { ...this.spec, ...spec };
    if (pushToAll) {
      this.bus.broadcastDesign(this.spec);
    }
    this.render(0.016);
  }

  buildLocalBlueprint(prompt = '') {
    const p = prompt.toLowerCase();
    if (/scorch|lava|inferno|fire|red/.test(p)) {
      return {
        title: 'Scorch Foundry Siege',
        biome: 'Volcanic Refinery',
        primary: '#27272a',
        secondary: '#991b1b',
        accent: '#f97316',
        visor: '#fb923c',
        stencil: 'SCORCH',
        titanClass: 'scorch',
        gravity: 30,
        wallSpeed: 19.0,
        airAccel: 15.0
      };
    }
    if (/ronin|samurai|cyber|neon|night/.test(p)) {
      return {
        title: 'Ronin Cyber District',
        biome: 'Neon Glitch City',
        primary: '#0f172a',
        secondary: '#1e293b',
        accent: '#ef4444',
        visor: '#38bdf8',
        stencil: 'RONIN-4',
        titanClass: 'ronin',
        gravity: 28,
        wallSpeed: 21.5,
        airAccel: 17.5
      };
    }
    if (/northstar|sky|flight|gold|prime/.test(p)) {
      return {
        title: 'Viper Sky-Fortress',
        biome: 'Stratosphere Docks',
        primary: '#b45309',
        secondary: '#1e293b',
        accent: '#facc15',
        visor: '#fef08a',
        stencil: 'VIPER-1',
        titanClass: 'northstar',
        gravity: 26,
        wallSpeed: 20.0,
        airAccel: 16.5
      };
    }
    return {
      title: `Sentient Protocol // ${prompt.slice(0, 18) || 'BT-7274'}`,
      biome: 'Frontier Foundry',
      primary: '#1e3a5f',
      secondary: '#cbd5e1',
      accent: '#38bdf8',
      visor: '#7dd3fc',
      stencil: '6-4',
      titanClass: 'vanguard',
      gravity: 32,
      wallSpeed: 18.5,
      airAccel: 15.0
    };
  }

  render(dt = 0.016) {
    if (!this.canvas) return;
    this.pulse += dt * 2.4;
    const ctx = this.canvas.getContext('2d');
    const w = this.canvas.width;
    const h = this.canvas.height;
    ctx.fillStyle = '#04070d';
    ctx.fillRect(0, 0, w, h);

    // Neural Grid Backdrop
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 36) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y < h; y += 36) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

    const cx = w * 0.5;
    const cy = h * 0.5;

    const agents = [
      { label: '1. ARCHITECT CORE', x: cx, y: cy, col: '#ef4444', r: 34 },
      { label: '2. SKIN FOUNDRY', x: w * 0.2, y: h * 0.24, col: '#f97316', r: 24 },
      { label: '3. RIG MODELER', x: w * 0.8, y: h * 0.24, col: '#38bdf8', r: 24 },
      { label: '4. PHYSICS KERNEL', x: w * 0.2, y: h * 0.76, col: '#22c55e', r: 24 },
      { label: '5. AI DIRECTOR', x: w * 0.8, y: h * 0.76, col: '#a855f7', r: 24 },
      { label: 'TITANFALL 2', x: w * 0.5, y: h * 0.14, col: '#facc15', r: 22 },
      { label: 'TEAM FORTRESS 3D', x: w * 0.5, y: h * 0.86, col: '#f87171', r: 22 },
      { label: 'MARIO & CAD', x: w * 0.09, y: cy, col: '#60a5fa', r: 20 }
    ];

    // Links + traveling neural packet dots
    for (let i = 1; i < agents.length; i++) {
      const a = agents[i];
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.28)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(a.x, a.y);
      ctx.stroke();

      const t = (this.pulse * 0.35 + i * 0.17) % 1;
      const px = cx + (a.x - cx) * t;
      const py = cy + (a.y - cy) * t;
      ctx.fillStyle = a.col;
      ctx.beginPath();
      ctx.arc(px, py, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }

    agents.forEach((n) => {
      ctx.fillStyle = 'rgba(10, 15, 24, 0.96)';
      ctx.strokeStyle = n.col;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#f8fafc';
      ctx.font = '600 11px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(n.label, n.x, n.y + n.r + 16);
    });

    ctx.textAlign = 'left';
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px "JetBrains Mono", monospace';
    ctx.fillText(`SPEC: ${this.spec.title} · TITAN: ${this.spec.titanClass.toUpperCase()} · PACKETS: ${daemonSupervisor.daemons.sentientMeshSync.packetsRouted}`, 16, 24);
  }
}

export class SentientSkinFoundryApp {
  constructor(canvas, bus) {
    this.canvas = canvas;
    this.bus = bus;
    this.config = {
      preset: 'srs_bt7274',
      primary: '#4b5d3b',
      secondary: '#e2e8f0',
      accent: '#f97316',
      visor: '#38bdf8',
      stencil: 'BT-7274',
      metalness: 0.65,
      roughness: 0.35,
      wear: 0.35
    };
  }

  applyPreset(presetId) {
    const pal = SKIN_PALETTES[presetId];
    if (!pal) return;
    this.config = {
      ...this.config,
      preset: presetId,
      primary: pal.primary,
      secondary: pal.secondary,
      accent: pal.accent,
      visor: pal.visor,
      stencil: pal.stencil,
      metalness: pal.metalness,
      roughness: pal.roughness
    };
    this.render();
  }

  setConfig(partial) {
    this.config = { ...this.config, ...partial };
    daemonSupervisor.daemons.pbrTextureForge.wearLevel = Number(this.config.wear);
    this.render();
  }

  pushToAllGames() {
    this.bus.applySkinAcrossGames(this.config);
  }

  render() {
    renderSkinAtlasPreview(this.canvas, this.config);
  }
}

export class SentientRigModelerApp {
  constructor(canvas, bus) {
    this.canvas = canvas;
    this.bus = bus;
    this.titanId = 'vanguard';
    this.armorScale = 1.05;
    this.weaponBore = 1.0;
    this.accentColor = '#f97316';
  }

  generateCadAssembly() {
    const spec = TITAN_CLASSES[this.titanId] || TITAN_CLASSES.vanguard;
    const s = this.armorScale;
    const wB = this.weaponBore;
    return {
      name: `${spec.name} Chassis Blueprint`,
      summary: `Sentient Rig Modeler blueprint for ${spec.chassis}-class ${spec.name}`,
      parts: [
        { label: 'Core Pelvis', shape: 'box', position: [0, 1.3, 0], rotation: [0, 0, 0], scale: [1.3 * s, 0.45, 0.95], color: '#334155', metalness: 0.8, roughness: 0.3 },
        { label: 'Main Torso Hull', shape: 'box', position: [0, 2.25, 0], rotation: [0, 0, 0], scale: [1.65 * s, 1.25 * s, 1.2 * s], color: '#4b5d3b', metalness: 0.65, roughness: 0.35 },
        { label: 'Cockpit Optic Eye', shape: 'sphere', position: [0, 2.4, 0.68 * s], rotation: [0, 0, 0], scale: [0.24, 0.24, 0.24], color: '#38bdf8', emissive: '#38bdf8', emissiveIntensity: 1.5, metalness: 0.2, roughness: 0.1 },
        { label: 'Left Strut Leg', shape: 'box', position: [-0.62 * s, 0.65, 0], rotation: [-0.15, 0, 0], scale: [0.42, 1.3, 0.48], color: '#1e293b', metalness: 0.78, roughness: 0.35 },
        { label: 'Right Strut Leg', shape: 'box', position: [0.62 * s, 0.65, 0], rotation: [-0.15, 0, 0], scale: [0.42, 1.3, 0.48], color: '#1e293b', metalness: 0.78, roughness: 0.35 },
        { label: 'Shoulder Pod', shape: 'box', position: [-0.92 * s, 2.9, 0], rotation: [0, 0, 0], scale: [0.58, 0.48, 0.78], color: this.accentColor, metalness: 0.55, roughness: 0.36 },
        { label: 'Primary Chassis Weapon', shape: 'cylinder', position: [1.05 * s, 2.0, 0.65], rotation: [1.57, 0, 0], scale: [0.2 * wB, 1.8 * wB, 0.2 * wB], color: '#64748b', metalness: 0.88, roughness: 0.22 },
        { label: 'Green Battery Core', shape: 'cylinder', position: [0, 2.55, -0.7 * s], rotation: [0, 0, 0], scale: [0.16, 0.52, 0.16], color: '#22c55e', emissive: '#22c55e', emissiveIntensity: 1.2, metalness: 0.3, roughness: 0.2 }
      ]
    };
  }

  pushToCadAndGames() {
    const asm = this.generateCadAssembly();
    this.bus.pushCadAssembly(asm, this.titanId);
    return asm;
  }

  render() {
    if (!this.canvas) return;
    const ctx = this.canvas.getContext('2d');
    const w = this.canvas.width;
    const h = this.canvas.height;
    const spec = TITAN_CLASSES[this.titanId] || TITAN_CLASSES.vanguard;

    ctx.fillStyle = '#040914';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.14)';
    for (let x = 0; x < w; x += 28) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y < h; y += 28) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

    // Draw orthographic wireframe silhouette of selected Titan chassis
    const cx = w * 0.36;
    const base = h * 0.85;
    const sc = this.armorScale * (spec.scale || 1.0) * 1.1;

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    // Legs
    ctx.strokeRect(cx - 56 * sc, base - 110, 32, 108);
    ctx.strokeRect(cx + 24 * sc, base - 110, 32, 108);
    // Torso
    ctx.fillStyle = 'rgba(56, 189, 248, 0.12)';
    ctx.fillRect(cx - 72 * sc, base - 230, 144 * sc, 118);
    ctx.strokeRect(cx - 72 * sc, base - 230, 144 * sc, 118);
    // Optic Eye
    ctx.fillStyle = spec.eyeColor;
    ctx.beginPath();
    ctx.arc(cx, base - 180, 14, 0, Math.PI * 2);
    ctx.fill();
    // Weapon Arm
    ctx.strokeStyle = this.accentColor;
    ctx.strokeRect(cx + 76 * sc, base - 205, 42 * this.weaponBore, 96);

    // Spec readout column on right
    const rx = w * 0.62;
    ctx.fillStyle = '#f8fafc';
    ctx.font = '700 16px "Outfit", sans-serif';
    ctx.fillText(`${spec.name.toUpperCase()} (${spec.chassis})`, rx, 56);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px "JetBrains Mono", monospace';
    const lines = [
      `WEAPON: ${spec.weaponName}`,
      `ORDNANCE: ${spec.ordnanceName}`,
      `DEFENSE: ${spec.defenseName}`,
      `CORE: ${spec.coreName}`,
      `HP: ${spec.hp} · SHIELD: ${spec.shieldMax} · DASHES: ${spec.dashes}`,
      `SCALE: ${this.armorScale.toFixed(2)}x · BORE: ${this.weaponBore.toFixed(2)}x`
    ];
    lines.forEach((ln, idx) => ctx.fillText(ln, rx, 94 + idx * 28));
  }
}

export class SentientPhysicsKernelApp {
  constructor(canvas, bus) {
    this.canvas = canvas;
    this.bus = bus;
  }

  applyParams({ wallSpeed, slideImpulse, airAccel, pullStrength, gravity }) {
    if (wallSpeed != null) daemonSupervisor.daemons.wallrunPhysics.wallSpeed = wallSpeed;
    if (slideImpulse != null) daemonSupervisor.daemons.slideHopMomentum.slideImpulse = slideImpulse;
    if (airAccel != null) daemonSupervisor.daemons.slideHopMomentum.airAccel = airAccel;
    if (pullStrength != null) daemonSupervisor.daemons.grapplePendulum.pullStrength = pullStrength;
    if (gravity != null) this.bus.applyGravityAcrossGames(gravity);
    this.render();
  }

  render() {
    if (!this.canvas) return;
    const ctx = this.canvas.getContext('2d');
    const w = this.canvas.width;
    const h = this.canvas.height;
    ctx.fillStyle = '#04070e';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    for (let y = 40; y < h; y += 45) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

    const wallSpd = daemonSupervisor.daemons.wallrunPhysics.wallSpeed;
    const slideSpd = daemonSupervisor.daemons.slideHopMomentum.slideImpulse;
    const g = this.bus.titanfallGame?.gravity || 32;

    // Curve 1: Wallrun + Wall-Kick Velocity Curve (Cyan)
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i <= 80; i++) {
      const t = i / 80;
      const spd = t < 0.45 ? wallSpd * (0.8 + t * 0.45) : (wallSpd * 1.1 - (t - 0.45) * 4);
      const x = 32 + t * (w - 64);
      const y = h - 42 - (spd / 28) * (h - 90);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Curve 2: Slide-Hop Parabola (Orange)
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let i = 0; i <= 80; i++) {
      const t = (i / 80) * 1.4;
      const alt = Math.max(0, 14 * t - 0.5 * g * t * t * 0.45);
      const x = 32 + (i / 80) * (w - 64);
      const y = h - 42 - alt * 18;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();

    ctx.fillStyle = '#f8fafc';
    ctx.font = '600 12px "JetBrains Mono", monospace';
    ctx.fillText(`WALLRUN ${wallSpd.toFixed(1)} u/s  |  SLIDE ${slideSpd.toFixed(1)} u/s  |  GRAVITY ${g} m/s²`, 24, 28);
  }
}

export class SentientDirectorApp {
  constructor(canvas, bus) {
    this.canvas = canvas;
    this.bus = bus;
  }

  spawnEnemyTitan(classId = 'ronin') {
    const tf2 = this.bus.titanfallGame;
    if (!tf2) return;
    if (tf2.state !== 'PLAYING') tf2.startMatch();
    tf2.spawnEnemyTitan(classId, (Math.random() - 0.5) * 38, -36);
    daemonSupervisor.daemons.frontierAiDirector.wavesDispatched++;
    this.render();
  }

  grantInstantTitanfall() {
    const tf2 = this.bus.titanfallGame;
    if (!tf2) return;
    if (tf2.state !== 'PLAYING') tf2.startMatch();
    tf2.player.titanMeter = 100;
    tf2.triggerTitanfall();
    this.render();
  }

  render() {
    if (!this.canvas) return;
    const ctx = this.canvas.getContext('2d');
    const w = this.canvas.width;
    const h = this.canvas.height;
    ctx.fillStyle = '#030712';
    ctx.fillRect(0, 0, w, h);

    // Tactical Frontier Radar Grid
    const cx = w * 0.5;
    const cy = h * 0.5;
    const scale = Math.min(w, h) / 140;

    ctx.strokeStyle = 'rgba(56, 189, 248, 0.16)';
    [25, 50, 75].forEach((rad) => {
      ctx.beginPath();
      ctx.arc(cx, cy, rad * scale, 0, Math.PI * 2);
      ctx.stroke();
    });

    const tf2 = this.bus.titanfallGame;
    if (tf2 && tf2.glReady) {
      const plot = (pos, color, size) => {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(cx + pos.x * scale, cy + pos.z * scale, size, 0, Math.PI * 2);
        ctx.fill();
      };
      plot(tf2.player.pos, '#22c55e', 6);
      if (tf2.playerTitan) plot(tf2.playerTitan.pos, '#38bdf8', 9);
      tf2.enemyTitans.forEach((et) => et.respawn <= 0 && plot(et.pos, '#ef4444', 9));
      tf2.aiPilots.forEach((ap) => ap.respawn <= 0 && plot(ap.pos, ap.team === 'militia' ? '#60a5fa' : '#f97316', 4));
      tf2.batteryPickups.forEach((bp) => bp.cooldown <= 0 && plot({ x: bp.x, z: bp.z }, '#4ade80', 4));
    }

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '600 12px "JetBrains Mono", monospace';
    ctx.fillText(`FRONTIER AI DIRECTOR · WAVES ${daemonSupervisor.daemons.frontierAiDirector.wavesDispatched} · GREEN=YOU/BATTERY · RED=IMC TITAN`, 18, 24);
  }
}

export class SentientDesignNetwork {
  constructor(canvases, deps) {
    this.deps = deps;
    this.titanfallGame = deps.titanfallGame;
    this.fortressGame = deps.fortressGame;
    this.cadApp = deps.cadApp;
    this.matrixEngine = deps.matrixEngine;

    this.architect = new SentientArchitectApp(canvases.architect, this);
    this.skins = new SentientSkinFoundryApp(canvases.skins, this);
    this.rig = new SentientRigModelerApp(canvases.rig, this);
    this.physics = new SentientPhysicsKernelApp(canvases.physics, this);
    this.director = new SentientDirectorApp(canvases.director, this);
  }

  broadcastDesign(spec) {
    this.skins.setConfig({
      primary: spec.primary,
      secondary: spec.secondary,
      accent: spec.accent,
      visor: spec.visor,
      stencil: spec.stencil
    });
    this.applySkinAcrossGames(this.skins.config);

    if (spec.titanClass && this.titanfallGame) {
      this.titanfallGame.setTitanClass(spec.titanClass);
      this.rig.titanId = spec.titanClass;
      this.rig.render();
    }
    this.physics.applyParams({
      wallSpeed: spec.wallSpeed,
      airAccel: spec.airAccel,
      gravity: spec.gravity
    });
    const cadAsm = this.rig.generateCadAssembly();
    this.pushCadAssembly(cadAsm, spec.titanClass);
    daemonSupervisor.broadcastBlueprint('SentientArchitect', spec);
    dataVault.addRecord('sentient_blueprint', spec.title, spec);
  }

  applySkinAcrossGames(skinCfg) {
    const custom = {
      primary: skinCfg.primary,
      secondary: skinCfg.secondary,
      accent: skinCfg.accent,
      visor: skinCfg.visor,
      stencil: skinCfg.stencil,
      metalness: skinCfg.metalness,
      roughness: skinCfg.roughness
    };
    this.titanfallGame?.setCustomSkinColors(custom);
    this.fortressGame?.setCustomSkinColors?.(custom);
    daemonSupervisor.daemons.shaderBridge.state.metalnessOffset = (skinCfg.metalness - 0.65) * 0.6;
    daemonSupervisor.daemons.shaderBridge.state.roughnessOffset = (skinCfg.roughness - 0.35) * 0.6;
    daemonSupervisor.broadcastBlueprint('SentientSkinFoundry', custom);
  }

  pushCadAssembly(asm, titanClass = null) {
    if (this.cadApp && typeof this.cadApp.setAssembly === 'function') this.cadApp.setAssembly(asm);
    if (this.matrixEngine && typeof this.matrixEngine.setCadAssembly === 'function') this.matrixEngine.setCadAssembly(asm);
    this.titanfallGame?.syncFromOS();
    this.fortressGame?.setCenterMonument?.(asm);
    this.fortressGame?.syncFromOS();
    if (titanClass && this.titanfallGame) {
      this.titanfallGame.setTitanClass(titanClass);
    }
    dataVault.addRecord('cad_assembly', asm.name, asm);
    daemonSupervisor.broadcastBlueprint('SentientRigModeler', { name: asm.name, parts: asm.parts.length });
  }

  applyGravityAcrossGames(g) {
    if (this.titanfallGame) this.titanfallGame.gravity = g;
    if (this.fortressGame) this.fortressGame.worldGravity = g;
    if (this.deps.marioEngine?.config) this.deps.marioEngine.config.gravity = g + 10;
    daemonSupervisor.broadcastBlueprint('SentientPhysicsKernel', { gravity: g });
  }

  renderVisible(dt, isVisibleFn) {
    if (isVisibleFn('win-sentient-architect')) this.architect.render(dt);
    if (isVisibleFn('win-sentient-director')) this.director.render();
  }
}
