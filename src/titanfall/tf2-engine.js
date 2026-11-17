// Titanfall 2 — Frontier Drop: Full Parkour, Wallrun, Grapple, Rodeo/Battery, 7 Titans, Attrition AI & Dropship Evac
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { TITAN_CLASSES, PILOT_TACTICALS, PILOT_WEAPONS } from './tf2-data.js';
import { TitanfallAudio } from './tf2-audio.js';
import {
  buildTitanRig,
  buildPilotRig,
  buildPilotViewmodel,
  buildTitanCockpitViewmodel,
  buildBatteryMesh,
  buildGruntRig,
  buildEvacDropship
} from './tf2-models.js';
import { SKIN_PALETTES, getEnvironmentTexture } from '../studio/pbr-skins.js';
import { daemonSupervisor, isSoftwareGlDevice } from '../studio/daemons.js';

const ARENA_HALF = 62;

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function makeTracerMesh(colorHex, radius = 0.08, length = 1.6) {
  const geo = new THREE.BoxGeometry(radius, radius, length);
  const mat = new THREE.MeshBasicMaterial({ color: colorHex });
  return new THREE.Mesh(geo, mat);
}

export class TitanfallGame {
  constructor(canvas, deps = {}) {
    this.canvas = canvas;
    this.deps = deps;
    this.audio = new TitanfallAudio(deps.marioAudio);
    this.isSoftwareGl = isSoftwareGlDevice();
    this.glReady = false;
    this.glFailed = false;
    this.pendingSize = [900, 520];

    this.selectedTitanClass = 'vanguard';
    this.selectedTactical = 'grapple';
    this.selectedWeapon = 'r201';
    this.selectedSkin = 'srs_bt7274';
    this.customSkinColors = null;
    this.gravity = 32;
    this.timeScale = 1.0;
    this.speedMult = 1.0;
    this.fireRateMult = 1.0;
    this.damageMult = 1.0;
    this.infiniteJumps = false;
    this.activeLayout = null;

    this.state = 'MENU'; // MENU | PLAYING | EVAC | ENDED
    this.scores = { militia: 0, imc: 0, winTarget: 260 };
    this.killfeed = [];

    this.blocks = []; // { x, z, w, d, h, wallrunnable, mesh }
    this.jumpPads = [];
    this.projectiles = [];
    this.drops = [];
    this.particles = [];
    this.holoDecoys = [];
    this.grunts = [];
    this.aiPilots = [];
    this.enemyTitans = [];
    this.particleWalls = [];
    this.evacShip = null;
    this.evacTimer = 0;

    this.input = {
      keys: { w: false, s: false, a: false, d: false, fire: false, crouch: false },
      stickMoveX: 0,
      stickMoveY: 0,
      stickAimX: 0,
      stickAimY: 0,
      stickAimActive: false,
      lookDeltaX: 0,
      lookDeltaY: 0,
      mouseFiring: false
    };

    this.player = {
      team: 'militia',
      mode: 'pilot', // 'pilot' | 'titan'
      pos: new THREE.Vector3(0, 0, 44),
      vel: new THREE.Vector3(),
      yaw: 0,
      pitch: 0,
      roll: 0,
      hp: 100,
      maxHp: 100,
      grounded: true,
      doubleJumpAvail: true,
      wallNormal: null,
      wallTime: 0,
      slideTimer: 0,
      sliding: false,
      ammo: 28,
      maxAmmo: 28,
      reloading: 0,
      fireCooldown: 0,
      tacticalCooldown: 0,
      tacticalActiveTimer: 0,
      grappleAnchor: null,
      grappleTimer: 0,
      hasBattery: false,
      rodeoTarget: null,
      rodeoTimer: 0,
      titanMeter: 45, // starts 45% charged for snappy action!
      kills: 0,
      titanKills: 0,
      deaths: 0,
      respawnTimer: 0,
      hitmarkerTimer: 0,
      scoped: false,
      smartLocks: [] // projected normalized targets for Smart Pistol / Archer HUD
    };

    // Player's summoned Titan (null until Titanfall called)
    this.playerTitan = null;

    this.aiConfig = {
      pilotsPerSide: 2,
      gruntsPerSide: 4,
      enemyTitansMax: 2
    };

    this.osMonument = null;
    this.viewmodel = null;
    this.titanCockpit = null;
    this.grappleLine = null;
    this.onHudUpdate = null;
  }

  ensureGl() {
    if (this.glReady || this.glFailed || !this.canvas) return this.glReady;
    try {
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        antialias: !this.isSoftwareGl,
        powerPreference: 'high-performance'
      });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.isSoftwareGl ? 1 : 2));
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.15;
      this.renderer.shadowMap.enabled = !this.isSoftwareGl;

      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color('#09111e');
      this.scene.fog = new THREE.FogExp2('#0c1728', 0.0085);

      this.camera = new THREE.PerspectiveCamera(78, 16 / 9, 0.1, 260);
      this.camera.rotation.order = 'YXZ';
      this.scene.add(this.camera);

      const pmrem = new THREE.PMREMGenerator(this.renderer);
      this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      pmrem.dispose();

      // Atmospheric Frontier Daylight / Dusk 3-Point Rig
      this.hemi = new THREE.HemisphereLight(0x7dd3fc, 0x1e293b, 0.9);
      this.sun = new THREE.DirectionalLight(0xfff1d6, 1.9);
      this.sun.position.set(34, 52, 26);
      if (!this.isSoftwareGl) {
        this.sun.castShadow = true;
        this.sun.shadow.mapSize.set(1024, 1024);
        const d = 58;
        this.sun.shadow.camera.left = -d;
        this.sun.shadow.camera.right = d;
        this.sun.shadow.camera.top = d;
        this.sun.shadow.camera.bottom = -d;
      }
      this.rim = new THREE.DirectionalLight(0x38bdf8, 0.65);
      this.rim.position.set(-32, 24, -40);
      this.scene.add(this.hemi, this.sun, this.rim);

      this.buildFrontierArena();
      this.rebuildViewmodels();

      // Grapple 3D Tether Line
      const lineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
      this.grappleLine = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: 0x38bdf8 }));
      this.grappleLine.visible = false;
      this.scene.add(this.grappleLine);

      this.glReady = true;
      this.resize(this.pendingSize[0], this.pendingSize[1]);
      return true;
    } catch {
      this.glFailed = true;
      return false;
    }
  }

  resize(w, h) {
    this.pendingSize = [w, h];
    if (!this.glReady || !this.renderer || !this.camera) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = Math.max(0.4, w / Math.max(1, h));
    this.camera.updateProjectionMatrix();
  }

  buildFrontierArena(customLayout = null) {
    if (this.arenaGroup) {
      this.scene.remove(this.arenaGroup);
      daemonSupervisor.disposeObject3D(this.arenaGroup);
    }
    this.arenaGroup = new THREE.Group();
    this.scene.add(this.arenaGroup);
    this.blocks = [];
    this.jumpPads = [];
    this.batteryPickups = [];
    this.activeLayout = customLayout || this.activeLayout;

    const layout = customLayout || {
      name: 'Angel City Sector',
      skyColor: '#09111e',
      fogColor: '#0c1728',
      accentColor: '#38bdf8',
      blocks: [
        { x: -22, z: -18, w: 2.2, d: 24, h: 10.5, wallrunnable: true, kind: 'wall' },
        { x: -22, z: 18, w: 2.2, d: 24, h: 10.5, wallrunnable: true, kind: 'wall' },
        { x: 22, z: -18, w: 2.2, d: 24, h: 10.5, wallrunnable: true, kind: 'wall' },
        { x: 22, z: 18, w: 2.2, d: 24, h: 10.5, wallrunnable: true, kind: 'wall' },
        { x: -40, z: 0, w: 2.6, d: 36, h: 12.0, wallrunnable: true, kind: 'wall' },
        { x: 40, z: 0, w: 2.6, d: 36, h: 12.0, wallrunnable: true, kind: 'wall' },
        { x: -12, z: 0, w: 7, d: 10, h: 6.2, wallrunnable: true, kind: 'wall' },
        { x: 12, z: 0, w: 7, d: 10, h: 6.2, wallrunnable: true, kind: 'wall' },
        { x: 0, z: -34, w: 16, d: 6, h: 5.2, wallrunnable: true, kind: 'concrete' },
        { x: 0, z: 34, w: 16, d: 6, h: 5.2, wallrunnable: true, kind: 'concrete' },
        { x: -34, z: -34, w: 9, d: 9, h: 8.5, wallrunnable: true, kind: 'hazard' },
        { x: 34, z: -34, w: 9, d: 9, h: 8.5, wallrunnable: true, kind: 'hazard' },
        { x: -34, z: 34, w: 9, d: 9, h: 8.5, wallrunnable: true, kind: 'hazard' },
        { x: 34, z: 34, w: 9, d: 9, h: 8.5, wallrunnable: true, kind: 'hazard' }
      ],
      jumpPads: [[-16, 32], [16, 32], [-16, -32], [16, -32], [0, 14], [0, -14]],
      batteries: [[-28, 0], [28, 0], [0, 19], [0, -19]]
    };

    if (layout.skyColor && this.scene) this.scene.background.set(layout.skyColor);
    if (layout.fogColor && this.scene?.fog) this.scene.fog.color.set(layout.fogColor);

    const tarmacTex = getEnvironmentTexture('frontier_tarmac', 16, 16);
    const wallrunTex = getEnvironmentTexture('frontier_wallrun', 3, 1);
    const sandstoneTex = getEnvironmentTexture('tf2_sandstone', 4, 2);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(ARENA_HALF * 2, ARENA_HALF * 2),
      new THREE.MeshStandardMaterial({ map: tarmacTex, roughness: 0.78, metalness: 0.16 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.arenaGroup.add(floor);

    const wallMat = new THREE.MeshStandardMaterial({ map: wallrunTex, roughness: 0.42, metalness: 0.48 });
    const concreteMat = new THREE.MeshStandardMaterial({ map: sandstoneTex, color: 0x64748b, roughness: 0.85, metalness: 0.12 });
    const hazardMat = new THREE.MeshStandardMaterial({ color: layout.accentColor || 0xf97316, roughness: 0.45, metalness: 0.3 });

    const addBox = (x, z, w, d, h, { wallrunnable = true, yBase = 0, mat = null } = {}) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat || (wallrunnable ? wallMat : concreteMat));
      m.position.set(x, yBase + h * 0.5, z);
      m.castShadow = true;
      m.receiveShadow = true;
      this.arenaGroup.add(m);
      this.blocks.push({ x, z, w, d, h, yBase, wallrunnable, mesh: m });
      return m;
    };

    (layout.blocks || []).forEach((b) => {
      const mat = b.kind === 'hazard' ? hazardMat : (b.kind === 'concrete' ? concreteMat : wallMat);
      addBox(b.x, b.z, b.w, b.d, b.h, { wallrunnable: b.wallrunnable !== false, yBase: b.yBase || 0, mat });
    });

    (layout.jumpPads || []).forEach(([px, pz]) => {
      const pad = new THREE.Mesh(
        new THREE.CylinderGeometry(1.7, 2.0, 0.35, 16),
        new THREE.MeshBasicMaterial({ color: layout.accentColor || 0x38bdf8 })
      );
      pad.position.set(px, 0.18, pz);
      this.arenaGroup.add(pad);
      this.jumpPads.push({ x: px, z: pz, radius: 2.1, boostY: 22 });
    });

    // Sentient CAD Centerpiece Monument pedestal at (0, 0)
    this.osMonument = new THREE.Group();
    this.osMonument.position.set(0, 2.4, 0);
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 3.2, 0.6, 16), concreteMat);
    ped.position.y = -2.1;
    this.osMonument.add(ped);
    this.arenaGroup.add(this.osMonument);
    this.syncFromOS();

    // Floating Green Battery Pickups
    (layout.batteries || [[-28, 0], [28, 0], [0, 19], [0, -19]]).forEach(([bx, bz]) => {
      const mesh = buildBatteryMesh();
      mesh.position.set(bx, 1.3, bz);
      this.arenaGroup.add(mesh);
      this.batteryPickups.push({ x: bx, z: bz, mesh, cooldown: 0 });
    });
  }

  rebuildCustomArena(layout) {
    this.activeLayout = layout;
    if (!this.glReady) return false;
    this.buildFrontierArena(layout);
    // Lift player cleanly out of newly generated block volumes
    if (this.player) {
      this.player.pos.y = Math.max(this.player.pos.y, 1.0);
      this.resolvePilotArenaCollisions();
    }
    this.addKillfeed('LEVEL FORGE', 'SECTOR', `${layout.name || 'Custom Sector'} Deployed Live`);
    return true;
  }

  applyThoughtMutation(mut = {}) {
    if (typeof mut.gravity === 'number') this.gravity = clamp(mut.gravity, 6, 58);
    if (typeof mut.speedMult === 'number') this.speedMult = clamp(mut.speedMult, 0.45, 2.4);
    if (typeof mut.fireRateMult === 'number') this.fireRateMult = clamp(mut.fireRateMult, 0.4, 3.0);
    if (typeof mut.damageMult === 'number') this.damageMult = clamp(mut.damageMult, 0.4, 3.5);
    if (typeof mut.timeScale === 'number') this.timeScale = clamp(mut.timeScale, 0.35, 1.85);
    if (typeof mut.infiniteJumps === 'boolean') this.infiniteJumps = mut.infiniteJumps;

    if (this.glReady && this.scene) {
      if (mut.skyColor) this.scene.background.set(mut.skyColor);
      if (mut.fogColor && this.scene.fog) this.scene.fog.color.set(mut.fogColor);
      if (typeof mut.fogDensity === 'number' && this.scene.fog) {
        this.scene.fog.density = clamp(mut.fogDensity, 0.002, 0.032);
      }
      if (mut.keyColor && this.sun) this.sun.color.set(mut.keyColor);
      if (mut.rimColor && this.rim) this.rim.color.set(mut.rimColor);
    }

    if (mut.titanInstant && this.state === 'PLAYING' && !this.playerTitan) {
      this.player.titanMeter = 100;
      this.triggerTitanfall();
    }
    if (mut.title) {
      this.addKillfeed('THOUGHT CLOUD', 'REALITY SHIFT', mut.title);
    }
    this.emitHud();
  }

  syncFromOS() {
    if (!this.osMonument) return;
    // Mirror Liquid CAD assembly as central holographic Frontier beacon
    while (this.osMonument.children.length > 1) {
      this.osMonument.remove(this.osMonument.children[this.osMonument.children.length - 1]);
    }
    const cadAsm = this.deps.cadApp?.currentAssembly;
    if (cadAsm && Array.isArray(cadAsm.parts)) {
      cadAsm.parts.slice(0, 8).forEach((p) => {
        const s = p.scale || [1, 1, 1];
        const m = new THREE.Mesh(
          new THREE.BoxGeometry(Math.max(0.25, s[0] * 0.7), Math.max(0.25, s[1] * 0.7), Math.max(0.25, s[2] * 0.7)),
          new THREE.MeshStandardMaterial({
            color: p.color || '#38bdf8',
            emissive: p.emissive || '#0ea5e9',
            emissiveIntensity: 0.45,
            metalness: clamp(Number(p.metalness ?? 0.65) + (daemonSupervisor.daemons.shaderBridge.state.metalnessOffset || 0), 0, 1),
            roughness: clamp(Number(p.roughness ?? 0.32) + (daemonSupervisor.daemons.shaderBridge.state.roughnessOffset || 0), 0.05, 1)
          })
        );
        const pos = p.position || [0, 1, 0];
        m.position.set(pos[0] * 0.65, pos[1] * 0.65, pos[2] * 0.65);
        this.osMonument.add(m);
      });
    }
  }

  setTitanClass(id) {
    if (!TITAN_CLASSES[id]) return;
    this.selectedTitanClass = id;
    if (this.glReady && this.player.mode === 'titan') {
      this.rebuildViewmodels();
    }
  }

  setTactical(id) {
    if (!PILOT_TACTICALS[id]) return;
    this.selectedTactical = id;
    this.player.tacticalCooldown = 0;
  }

  setWeapon(id) {
    if (!PILOT_WEAPONS[id]) return;
    this.selectedWeapon = id;
    const spec = PILOT_WEAPONS[id];
    this.player.maxAmmo = spec.clipSize;
    this.player.ammo = spec.clipSize;
    this.player.reloading = 0;
    this.player.scoped = false;
    if (this.glReady) this.rebuildViewmodels();
  }

  setSkin(skinId, customColors = null) {
    this.selectedSkin = skinId || 'srs_bt7274';
    if (customColors !== undefined) this.customSkinColors = customColors;
    if (this.glReady) {
      this.rebuildViewmodels();
      if (this.playerTitan) {
        const idx = this.playerTitan.mesh;
        const pos = idx.position.clone();
        const rotY = idx.rotation.y;
        this.scene.remove(idx);
        const rig = buildTitanRig(this.playerTitan.classId, 'militia', this.selectedSkin, this.customSkinColors);
        rig.root.position.copy(pos);
        rig.root.rotation.y = rotY;
        this.scene.add(rig.root);
        this.playerTitan.mesh = rig.root;
        this.playerTitan.rig = rig;
      }
    }
  }

  setCustomSkinColors(colors) {
    this.setSkin(this.selectedSkin, colors);
  }

  setAiScale({ botsPerTeam, hpMult, dmgMult } = {}) {
    if (botsPerTeam != null) {
      this.aiConfig.pilotsPerSide = clamp(Math.round(botsPerTeam * 0.6), 1, 5);
      this.aiConfig.gruntsPerSide = clamp(botsPerTeam, 2, 8);
    }
    this.aiConfig.hpMult = hpMult || 1.0;
    this.aiConfig.dmgMult = dmgMult || 1.0;
  }

  rebuildViewmodels() {
    if (!this.camera) return;
    if (this.viewmodel) this.camera.remove(this.viewmodel);
    if (this.titanCockpit?.root) this.camera.remove(this.titanCockpit.root);

    this.viewmodel = buildPilotViewmodel(this.selectedWeapon, this.selectedSkin, this.customSkinColors);
    this.titanCockpit = buildTitanCockpitViewmodel(this.selectedTitanClass, this.selectedSkin, this.customSkinColors);

    this.viewmodel.visible = this.player.mode === 'pilot';
    this.titanCockpit.root.visible = this.player.mode === 'titan';
    this.camera.add(this.viewmodel);
    this.camera.add(this.titanCockpit.root);
  }

  clearDynamicEntities() {
    if (!this.scene) return;
    [
      ...this.projectiles,
      ...this.drops,
      ...this.particles,
      ...this.holoDecoys,
      ...this.grunts,
      ...this.aiPilots,
      ...this.enemyTitans,
      ...this.particleWalls
    ].forEach((e) => {
      if (e.mesh) this.scene.remove(e.mesh);
    });
    if (this.playerTitan?.mesh) this.scene.remove(this.playerTitan.mesh);
    if (this.playerTitan?.domeMesh) this.scene.remove(this.playerTitan.domeMesh);
    if (this.evacShip?.mesh) this.scene.remove(this.evacShip.mesh);

    this.projectiles = [];
    this.drops = [];
    this.particles = [];
    this.holoDecoys = [];
    this.grunts = [];
    this.aiPilots = [];
    this.enemyTitans = [];
    this.particleWalls = [];
    this.playerTitan = null;
    this.evacShip = null;
  }

  startMatch() {
    if (!this.ensureGl()) return false;
    this.clearDynamicEntities();
    this.scores = { militia: 0, imc: 0, winTarget: 260 };
    this.killfeed = [];
    this.state = 'PLAYING';
    this.evacTimer = 0;

    this.player.mode = 'pilot';
    this.player.pos.set(0, 0, 44);
    this.player.vel.set(0, 0, 0);
    this.player.yaw = 0;
    this.player.pitch = 0;
    this.player.roll = 0;
    this.player.hp = 100;
    this.player.maxHp = 100;
    this.player.titanMeter = 65; // Quick initial Titanfall
    this.player.hasBattery = false;
    this.player.rodeoTarget = null;
    this.player.kills = 0;
    this.player.titanKills = 0;
    this.player.deaths = 0;
    this.player.respawnTimer = 0;
    this.setWeapon(this.selectedWeapon);
    this.rebuildViewmodels();

    // Spawn Militia & IMC Pilot squads + Grunts + Initial IMC Enemy Titan
    const militiaCount = this.aiConfig.pilotsPerSide;
    const imcCount = this.aiConfig.pilotsPerSide + 1;
    for (let i = 0; i < militiaCount; i++) this.spawnAiPilot('militia', i);
    for (let i = 0; i < imcCount; i++) this.spawnAiPilot('imc', i);
    for (let i = 0; i < this.aiConfig.gruntsPerSide; i++) {
      this.spawnGrunt('militia', i);
      this.spawnGrunt('imc', i);
    }

    this.spawnEnemyTitan('ion', -16, -24);
    this.spawnEnemyTitan('scorch', 18, -28);

    this.addKillfeed('FRONTIER', 'DROP', 'Attrition Match Live — Stand by for Titanfall!');
    this.emitHud();
    return true;
  }

  spawnAiPilot(team, idx) {
    const z = team === 'militia' ? 38 : -38;
    const x = (idx - 1) * 14;
    const rig = buildPilotRig(team, team === 'militia' ? this.selectedSkin : 'imc_factory');
    rig.root.position.set(x, 0, z);
    this.scene.add(rig.root);
    this.aiPilots.push({
      id: `${team}-pilot-${idx}`,
      name: `${team.toUpperCase()} Pilot ${idx + 1}`,
      team,
      pos: rig.root.position,
      vel: new THREE.Vector3(),
      hp: 100,
      maxHp: 100,
      mesh: rig.root,
      rig,
      fireCd: 0.6 + Math.random(),
      wallPref: idx % 2 === 0 ? -1 : 1,
      respawn: 0
    });
  }

  spawnGrunt(team, idx) {
    const z = team === 'militia' ? 28 : -28;
    const x = (idx - 1.5) * 10;
    const mesh = buildGruntRig(team);
    mesh.position.set(x, 0, z);
    this.scene.add(mesh);
    this.grunts.push({
      name: `${team.toUpperCase()} Grunt`,
      team,
      pos: mesh.position,
      hp: 55,
      mesh,
      fireCd: 1.0 + Math.random(),
      respawn: 0
    });
  }

  spawnEnemyTitan(classId, x, z) {
    const spec = TITAN_CLASSES[classId] || TITAN_CLASSES.ion;
    const skin = classId === 'scorch' ? 'apex_predators' : 'imc_factory';
    const rig = buildTitanRig(classId, 'imc', skin);
    rig.root.position.set(x, 0, z);
    this.scene.add(rig.root);
    this.enemyTitans.push({
      id: `imc-titan-${Math.random().toString(36).slice(2, 6)}`,
      name: `IMC ${spec.name}`,
      classId,
      spec,
      team: 'imc',
      pos: rig.root.position,
      vel: new THREE.Vector3(),
      hp: Math.round(spec.hp * 0.72),
      maxHp: spec.hp,
      shield: 1200,
      shieldMax: spec.shieldMax,
      hasBattery: true,
      mesh: rig.root,
      rig,
      fireCd: 1.1,
      defenseCd: 4.5,
      defenseTimer: 0,
      clip: spec.clipSize,
      reloading: 0,
      respawn: 0
    });
  }

  // --- Player Movement & Actions ---
  triggerJump() {
    if (this.state !== 'PLAYING' || this.player.respawnTimer > 0) return;

    // Titan Dash / Northstar VTOL Hover instead of Pilot jump
    if (this.player.mode === 'titan' && this.playerTitan) {
      this.triggerTitanDash();
      return;
    }

    // Disengage Rodeo jump off
    if (this.player.rodeoTarget) {
      this.player.rodeoTarget = null;
      this.player.vel.y = 14.5;
      this.audio.play('jumpkit', 1.1);
      return;
    }

    const p = this.player;
    p.sliding = false;

    if (p.wallNormal) {
      // Signature Titanfall Wall-Kick!
      const cfg = daemonSupervisor.daemons.wallrunPhysics;
      const forward = this.getLookForward();
      p.vel.y = cfg.kickUp;
      p.vel.x += p.wallNormal.x * cfg.kickOut + forward.x * 5.2;
      p.vel.z += p.wallNormal.z * cfg.kickOut + forward.z * 5.2;
      p.wallNormal = null;
      p.wallTime = 0.18;
      p.doubleJumpAvail = true;
      this.audio.play('jumpkit', 1.25);
      return;
    }

    if (p.grounded) {
      p.vel.y = 12.2;
      p.grounded = false;
      this.audio.play('jumpkit', 0.9);
    } else if (p.doubleJumpAvail || this.infiniteJumps) {
      p.vel.y = 11.4;
      if (!this.infiniteJumps) p.doubleJumpAvail = false;
      this.audio.play('jumpkit', 1.15);
    }
  }

  triggerSlideOrCrouch() {
    if (this.state !== 'PLAYING' || this.player.mode !== 'pilot') return;
    const p = this.player;
    if (p.sliding) return;
    const flatSpd = Math.hypot(p.vel.x, p.vel.z);
    const forward = this.getLookForward();
    const boost = Math.max(flatSpd, daemonSupervisor.daemons.slideHopMomentum.slideImpulse);
    const fx = flatSpd > 3 ? p.vel.x / flatSpd : forward.x;
    const fz = flatSpd > 3 ? p.vel.z / flatSpd : forward.z;
    p.vel.x = fx * boost;
    p.vel.z = fz * boost;
    p.sliding = true;
    p.slideTimer = 0.85;
    this.audio.play('slide', 1.0);
  }

  triggerTactical() {
    if (this.state !== 'PLAYING' || this.player.respawnTimer > 0) return;

    // In Titan mode, Tactical button triggers Titan Ordnance!
    if (this.player.mode === 'titan' && this.playerTitan) {
      this.triggerTitanOrdnance();
      return;
    }

    const p = this.player;
    if (p.tacticalCooldown > 0) return;
    const spec = PILOT_TACTICALS[this.selectedTactical];
    p.tacticalCooldown = spec.cooldown;

    if (this.selectedTactical === 'grapple') {
      const origin = p.pos.clone().add(new THREE.Vector3(0, 1.65, 0));
      const dir = this.getAimDir();
      const hit = this.raycastArenaAndTitans(origin, dir, daemonSupervisor.daemons.grapplePendulum.maxRange);
      if (hit) {
        p.grappleAnchor = hit.point.clone();
        p.grappleTimer = 1.65;
        this.audio.play('grapple', 1.1);
      } else {
        // Elastic sky-hook point ahead so grapple never feels dead
        p.grappleAnchor = origin.clone().addScaledVector(dir, 26).add(new THREE.Vector3(0, 6, 0));
        p.grappleTimer = 0.9;
        this.audio.play('grapple', 0.95);
      }
    } else if (this.selectedTactical === 'stim') {
      p.tacticalActiveTimer = 4.2;
      p.hp = Math.min(p.maxHp, p.hp + 35);
      this.audio.play('jumpkit', 1.3);
    } else if (this.selectedTactical === 'phase') {
      p.tacticalActiveTimer = 2.4;
      this.audio.play('core_activate', 0.7);
    } else if (this.selectedTactical === 'cloak') {
      p.tacticalActiveTimer = 5.5;
      this.audio.play('slide', 0.8);
    } else if (this.selectedTactical === 'holo') {
      const rig = buildPilotRig('militia', this.selectedSkin);
      rig.root.position.copy(p.pos);
      const fwd = this.getLookForward();
      rig.root.rotation.y = Math.atan2(fwd.x, fwd.z);
      this.scene.add(rig.root);
      this.holoDecoys.push({
        pos: rig.root.position,
        vel: new THREE.Vector3(fwd.x * 13, 0, fwd.z * 13),
        mesh: rig.root,
        life: 5.0
      });
      this.audio.play('battery', 0.7);
    }
  }

  triggerTitanfall() {
    if (this.state !== 'PLAYING' || this.player.mode !== 'pilot') return;
    if (this.playerTitan || this.player.titanMeter < 100) return;

    this.player.titanMeter = 0;
    const fwd = this.getLookForward();
    const tx = clamp(this.player.pos.x + fwd.x * 12, -ARENA_HALF + 8, ARENA_HALF - 8);
    const tz = clamp(this.player.pos.z + fwd.z * 12, -ARENA_HALF + 8, ARENA_HALF - 8);

    // Spawn falling Orbital Drop Pod beacon
    const podGroup = new THREE.Group();
    const hull = new THREE.Mesh(
      new THREE.CylinderGeometry(1.1, 1.5, 4.4, 12),
      new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.85, roughness: 0.25 })
    );
    const trail = new THREE.Mesh(
      new THREE.ConeGeometry(1.2, 6.5, 10),
      new THREE.MeshBasicMaterial({ color: 0xf97316, transparent: true, opacity: 0.72 })
    );
    trail.position.y = 4.5;
    podGroup.add(hull, trail);
    podGroup.position.set(tx, 64, tz);
    this.scene.add(podGroup);

    this.drops.push({
      x: tx,
      y: 64,
      z: tz,
      mesh: podGroup,
      classId: this.selectedTitanClass
    });
    this.addKillfeed('SRS TITANFALL', 'ORBITAL', `${TITAN_CLASSES[this.selectedTitanClass].name} Inbound!`);
    this.audio.play('core_activate', 1.1);
  }

  landPlayerTitan(drop) {
    this.scene.remove(drop.mesh);
    const spec = TITAN_CLASSES[drop.classId] || TITAN_CLASSES.vanguard;
    const rig = buildTitanRig(drop.classId, 'militia', this.selectedSkin, this.customSkinColors);
    rig.root.position.set(drop.x, 0, drop.z);
    this.scene.add(rig.root);

    // Translucent Protective Dome Shield
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(5.2, 20, 14),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.22, wireframe: true })
    );
    dome.position.set(drop.x, 1.2, drop.z);
    this.scene.add(dome);

    this.playerTitan = {
      classId: drop.classId,
      spec,
      hp: spec.hp,
      maxHp: spec.hp,
      shield: spec.shieldMax,
      shieldMax: spec.shieldMax,
      dashes: spec.dashes,
      dashMax: spec.dashes,
      dashRecharge: 0,
      clip: spec.clipSize,
      reloading: 0,
      fireCd: 0,
      ordCd: 0,
      defCd: 0,
      defActive: 0,
      coreCharge: 18,
      coreActive: 0,
      domeTimer: daemonSupervisor.daemons.titanfallDrop.domeDuration,
      domeMesh: dome,
      hasBattery: true,
      mesh: rig.root,
      rig,
      pos: rig.root.position,
      vel: new THREE.Vector3(),
      fireCdAi: 0.7
    };

    // Shockwave blast damage to nearby IMC units!
    const epicenter = new THREE.Vector3(drop.x, 1.2, drop.z);
    this.applySplashDamage(epicenter, 9.5, 2200, 'militia', 'Titanfall Impact');
    this.spawnBurst(epicenter, 0xf97316, 14);
    this.audio.play('titanfall_boom', 1.3);
  }

  triggerEmbarkOrDisembark() {
    if (this.state !== 'PLAYING' || this.player.respawnTimer > 0) return;

    if (this.player.mode === 'titan' && this.playerTitan) {
      // Disembark back to Pilot — Titan switches to Auto-Titan AI!
      this.player.mode = 'pilot';
      this.player.pos.copy(this.playerTitan.pos).add(new THREE.Vector3(2.4, 0, 2.4));
      this.player.vel.set(0, 7, 0);
      this.playerTitan.mesh.visible = true;
      this.rebuildViewmodels();
      this.audio.play('embark', 0.9);
      this.addKillfeed('PILOT', 'AI', `${this.playerTitan.spec.name} guarding Follow/Engage`);
      return;
    }

    if (this.playerTitan) {
      const dist = this.player.pos.distanceTo(this.playerTitan.pos);
      if (dist < 7.8) {
        this.player.mode = 'titan';
        this.player.pos.copy(this.playerTitan.pos);
        this.player.vel.set(0, 0, 0);
        this.player.roll = 0;
        this.playerTitan.mesh.visible = false;
        this.playerTitan.domeTimer = 0;
        if (this.playerTitan.domeMesh) this.playerTitan.domeMesh.visible = false;

        // If carrying a stolen Green Battery, auto-insert for Shield & +20% Core!
        if (this.player.hasBattery) {
          this.player.hasBattery = false;
          this.playerTitan.shield = Math.min(this.playerTitan.shieldMax, this.playerTitan.shield + 2200);
          this.playerTitan.hp = Math.min(this.playerTitan.maxHp, this.playerTitan.hp + 900);
          this.playerTitan.coreCharge = Math.min(100, this.playerTitan.coreCharge + 22);
          this.audio.play('battery', 1.2);
          this.addKillfeed('BATTERY', 'SHIELD+', 'Stolen Battery Installed (+2200 Shield & +22% Core)');
        }
        this.rebuildViewmodels();
        this.audio.play('embark', 1.2);
      }
    }
  }

  triggerTitanDash() {
    const t = this.playerTitan;
    if (!t || t.dashes <= 0) return;
    t.dashes--;
    const wish = this.getWishDir();
    const fwd = this.getLookForward();
    const dx = Math.hypot(wish.x, wish.z) > 0.1 ? wish.x : fwd.x;
    const dz = Math.hypot(wish.x, wish.z) > 0.1 ? wish.z : fwd.z;
    const len = Math.hypot(dx, dz) || 1;
    t.vel.x += (dx / len) * 24;
    t.vel.z += (dz / len) * 24;
    if (t.classId === 'northstar') t.vel.y = 9.5;
    this.audio.play('titan_dash', 1.1);
  }

  triggerTitanDefense() {
    const t = this.playerTitan;
    if (!t || this.player.mode !== 'titan') {
      if (this.selectedWeapon === 'kraber' && this.player.mode === 'pilot') {
        this.player.scoped = !this.player.scoped;
      }
      return;
    }
    if (t.defCd > 0) return;
    t.defCd = t.spec.defenseCooldown;
    t.defActive = 3.2;

    if (t.classId === 'tone') {
      // Deploy Particle Wall shield in front of Tone
      const fwd = this.getLookForward();
      const wallPos = this.player.pos.clone().addScaledVector(fwd, 3.6);
      const wall = new THREE.Mesh(
        new THREE.PlaneGeometry(5.5, 4.4),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.36, side: THREE.DoubleSide })
      );
      wall.position.set(wallPos.x, 2.2, wallPos.z);
      wall.rotation.y = this.player.yaw;
      this.scene.add(wall);
      this.particleWalls.push({ mesh: wall, pos: wall.position, life: 6.5, team: 'militia' });
    } else if (t.classId === 'ronin') {
      this.triggerTitanDash();
    } else if (t.classId === 'vanguard') {
      // Energy Siphon beam steals shield
      t.shield = Math.min(t.shieldMax, t.shield + 1200);
    }
    this.audio.play('battery', 0.9);
  }

  triggerTitanOrdnance() {
    const t = this.playerTitan;
    if (!t || this.player.mode !== 'titan' || t.ordCd > 0) return;
    t.ordCd = t.spec.ordnanceCooldown;
    const origin = this.camera.getWorldPosition(new THREE.Vector3());
    const dir = this.getAimDir();

    if (t.classId === 'ion') {
      // High-damage instant Shoulder Laser Shot
      this.fireHitscan(origin, dir, 1450, 'militia', 'Laser Shot', 0x38bdf8, 85);
      this.audio.play('railgun', 1.2);
    } else if (t.classId === 'ronin') {
      // Arc Wave + Broadsword cleave
      this.applySplashDamage(origin.clone().addScaledVector(dir, 5.5), 7.5, 1350, 'militia', 'Broadsword');
      if (this.titanCockpit?.swordMesh) this.titanCockpit.swordMesh.rotation.z = -1.35;
      this.audio.play('leadwall', 1.2);
    } else if (t.classId === 'northstar') {
      // VTOL Hover + Cluster Missile
      this.player.vel.y = 11.5;
      this.spawnProjectile(origin, dir, 40, 1250, 7.0, 'militia', 'Cluster Missile', 0x22d3ee);
      this.audio.play('salvo', 1.1);
    } else {
      // Multi-rocket Ordnance salvo
      for (let i = -1; i <= 1; i++) {
        const d = dir.clone();
        d.x += i * 0.06;
        d.y += 0.03;
        d.normalize();
        this.spawnProjectile(origin, d, 38, 620, 4.5, 'militia', t.spec.ordnanceName, 0xf97316);
      }
      this.audio.play('salvo', 1.15);
    }
  }

  triggerTitanCore() {
    const t = this.playerTitan;
    if (!t || this.player.mode !== 'titan' || t.coreCharge < 100) return;
    t.coreCharge = 0;
    t.coreActive = 5.5;
    t.clip = t.spec.clipSize;
    t.shield = t.shieldMax;
    this.audio.play('core_activate', 1.4);
    this.addKillfeed(t.spec.name, 'CORE ONLINE', t.spec.coreName);

    const origin = this.camera.getWorldPosition(new THREE.Vector3());
    const dir = this.getAimDir();
    if (t.classId === 'scorch') {
      // Flame Core seismic wave
      this.applySplashDamage(origin.clone().addScaledVector(dir, 9), 12, 3400, 'militia', 'Flame Core');
      this.spawnBurst(origin.clone().addScaledVector(dir, 7), 0xf97316, 18);
    } else if (t.classId === 'tone' || t.classId === 'northstar') {
      // Salvo / Flight Core rocket swarm
      for (let i = 0; i < 8; i++) {
        const d = dir.clone();
        d.x += (Math.random() - 0.5) * 0.18;
        d.y += (Math.random() - 0.5) * 0.14;
        d.normalize();
        this.spawnProjectile(origin, d, 44, 520, 5.0, 'militia', t.spec.coreName, 0xfacc15);
      }
    }
  }

  triggerNuclearEject() {
    const t = this.playerTitan;
    if (!t || this.player.mode !== 'titan') return;
    const blastPos = this.player.pos.clone();
    this.player.mode = 'pilot';
    this.player.pos.y = 5.5;
    this.player.vel.set(0, 32, 0); // Sky-high Titanfall eject!
    this.player.doubleJumpAvail = true;
    this.scene.remove(t.mesh);
    if (t.domeMesh) this.scene.remove(t.domeMesh);
    this.playerTitan = null;
    this.rebuildViewmodels();

    this.applySplashDamage(blastPos, 14.0, 4800, 'militia', 'Nuclear Eject');
    this.spawnBurst(blastPos, 0xfacc15, 22);
    this.audio.play('eject_alarm', 1.2);
    this.audio.play('explosion', 1.4);
    this.addKillfeed('PILOT', 'NUCLEAR EJECT', 'Titan Core Detonated!');
  }

  triggerReload() {
    if (this.player.mode === 'titan' && this.playerTitan) {
      if (this.playerTitan.reloading <= 0) this.playerTitan.reloading = this.playerTitan.spec.reloadTime;
      return;
    }
    if (this.player.reloading <= 0) {
      this.player.reloading = PILOT_WEAPONS[this.selectedWeapon].reloadTime;
    }
  }

  getLookForward() {
    return new THREE.Vector3(-Math.sin(this.player.yaw), 0, -Math.cos(this.player.yaw)).normalize();
  }

  getAimDir() {
    const dir = new THREE.Vector3(0, 0, -1);
    dir.applyEuler(new THREE.Euler(this.player.pitch, this.player.yaw, 0, 'YXZ'));
    return dir.normalize();
  }

  getWishDir() {
    let f = 0;
    let r = 0;
    if (this.input.keys.w) f += 1;
    if (this.input.keys.s) f -= 1;
    if (this.input.keys.d) r += 1;
    if (this.input.keys.a) r -= 1;
    f -= this.input.stickMoveY;
    r += this.input.stickMoveX;
    const forward = this.getLookForward();
    const right = new THREE.Vector3(Math.cos(this.player.yaw), 0, -Math.sin(this.player.yaw));
    const wx = forward.x * f + right.x * r;
    const wz = forward.z * f + right.z * r;
    const len = Math.hypot(wx, wz);
    return len > 1 ? { x: wx / len, z: wz / len } : { x: wx, z: wz };
  }

  // --- Combat, Projectiles & Hitscan ---
  firePlayerWeapon() {
    const p = this.player;
    if (p.mode === 'titan' && this.playerTitan) {
      const t = this.playerTitan;
      if (t.fireCd > 0 || t.reloading > 0) return;
      if (t.clip <= 0) { t.reloading = t.spec.reloadTime; return; }
      t.clip--;
      const rateScale = 1 / Math.max(0.4, this.fireRateMult || 1);
      t.fireCd = (t.coreActive > 0 ? t.spec.fireRate * 0.6 : t.spec.fireRate) * rateScale;
      const origin = this.camera.getWorldPosition(new THREE.Vector3());
      const dir = this.getAimDir();
      const dmg = t.spec.damage * (this.damageMult || 1);
      this.audio.play(t.spec.weaponType, 1.0);

      if (t.classId === 'ion' && t.coreActive > 0) {
        this.fireHitscan(origin, dir, 420 * (this.damageMult || 1), 'militia', 'Laser Core', 0xef4444, 70);
      } else if (t.classId === 'scorch') {
        this.spawnProjectile(origin, dir, 36, dmg, 4.8, 'militia', 'T-203 Thermite', 0xf97316);
      } else if (t.classId === 'tone') {
        this.spawnProjectile(origin, dir, 56, dmg, 2.2, 'militia', '40mm Tracker', 0xfacc15);
      } else if (t.classId === 'ronin') {
        for (let k = 0; k < 6; k++) {
          const d = dir.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.09, (Math.random() - 0.5) * 0.06, 0)).normalize();
          this.fireHitscan(origin, d, dmg, 'militia', 'Leadwall', 0x38bdf8, 28);
        }
      } else {
        // XO-16 / Splitter / Railgun / Legion Predator (Smart Core locks onto targets!)
        const lockTarget = t.coreActive > 0 ? this.findNearestHostileInCone(origin, dir, 0.35) : null;
        const shotDir = lockTarget ? lockTarget.clone().sub(origin).normalize() : dir;
        this.fireHitscan(origin, shotDir, dmg, 'militia', t.spec.weaponName, t.spec.eyeColor, 80);
      }
      if (t.clip <= 0) t.reloading = t.spec.reloadTime;
      return;
    }

    // Pilot Weapon Fire
    const w = PILOT_WEAPONS[this.selectedWeapon];
    if (p.fireCooldown > 0 || p.reloading > 0) return;
    if (p.ammo <= 0) { p.reloading = w.reloadTime; return; }
    p.ammo--;
    p.fireCooldown = w.fireRate / Math.max(0.4, this.fireRateMult || 1);
    const dmgScale = this.damageMult || 1;
    this.audio.play(w.id, 1.0);

    const origin = this.camera.getWorldPosition(new THREE.Vector3());
    const dir = this.getAimDir();

    if (w.kind === 'smart') {
      // Smart Pistol locks onto up to 3 enemies inside view!
      const targets = this.findSmartLockTargets(origin, dir, 3);
      if (targets.length > 0) {
        targets.forEach((tgt) => {
          const aim = tgt.worldPos.clone().sub(origin).normalize();
          this.fireHitscan(origin, aim, w.damage * dmgScale, 'militia', w.name, '#38bdf8', 55, w.titanDamage * dmgScale);
        });
      } else {
        this.fireHitscan(origin, dir, w.damage * dmgScale, 'militia', w.name, '#38bdf8', 55, w.titanDamage * dmgScale);
      }
    } else if (w.kind === 'projectile' || w.kind === 'at_rocket') {
      this.spawnProjectile(origin, dir, w.speed, w.damage * dmgScale, w.splashRadius, 'militia', w.name, w.color, w.titanDamage * dmgScale);
    } else {
      const count = w.pellets || 1;
      for (let i = 0; i < count; i++) {
        const d = dir.clone();
        d.x += (Math.random() - 0.5) * w.spread;
        d.y += (Math.random() - 0.5) * w.spread;
        d.z += (Math.random() - 0.5) * w.spread;
        d.normalize();
        this.fireHitscan(origin, d, w.damage * dmgScale, 'militia', w.name, w.color, 95, w.titanDamage * dmgScale);
      }
    }

    if (p.ammo <= 0) p.reloading = w.reloadTime;
  }

  fireHitscan(origin, dir, damage, team, weaponName, colorHex, maxDist = 80, titanDamage = null) {
    // Visual tracer beam
    const endPos = origin.clone().addScaledVector(dir, Math.min(28, maxDist));
    const tracer = makeTracerMesh(colorHex, 0.05, 8);
    tracer.position.copy(origin).addScaledVector(dir, 5);
    tracer.lookAt(endPos);
    this.scene.add(tracer);
    this.particles.push({ mesh: tracer, vel: new THREE.Vector3(), life: 0.06 });

    // Check against Enemy Pilots, Grunts & Titans
    let bestT = maxDist;
    let hitEntity = null;
    let hitKind = null;

    const testSphere = (center, radius, entity, kind) => {
      const oc = center.clone().sub(origin);
      const proj = oc.dot(dir);
      if (proj < 0 || proj > bestT) return;
      const d2 = oc.lengthSq() - proj * proj;
      if (d2 <= radius * radius) {
        bestT = proj;
        hitEntity = entity;
        hitKind = kind;
      }
    };

    const arenaHit = this.raycastArenaAndTitans(origin, dir, maxDist, false);
    if (arenaHit) bestT = arenaHit.dist;

    if (team === 'militia') {
      this.aiPilots.forEach((ap) => ap.respawn <= 0 && ap.team !== team && testSphere(ap.pos.clone().add(new THREE.Vector3(0, 1.1, 0)), 0.85, ap, 'pilot'));
      this.grunts.forEach((gr) => gr.respawn <= 0 && gr.team !== team && testSphere(gr.pos.clone().add(new THREE.Vector3(0, 0.9, 0)), 0.85, gr, 'grunt'));
      this.enemyTitans.forEach((et) => et.respawn <= 0 && et.team !== team && testSphere(et.pos.clone().add(new THREE.Vector3(0, 2.5, 0)), 2.25, et, 'titan'));
    }

    if (hitEntity) {
      const dmg = hitKind === 'titan' && titanDamage ? titanDamage : damage;
      this.damageEntity(hitEntity, hitKind, dmg, 'militia', weaponName);
    }
  }

  spawnProjectile(origin, dir, speed, damage, radius, team, weaponName, colorHex, titanDamage = null) {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(radius > 3.5 ? 0.24 : 0.16, 10, 8),
      new THREE.MeshBasicMaterial({ color: colorHex })
    );
    mesh.position.copy(origin).addScaledVector(dir, 1.2);
    this.scene.add(mesh);
    this.projectiles.push({
      pos: mesh.position,
      vel: dir.clone().multiplyScalar(speed),
      damage,
      titanDamage: titanDamage || damage,
      radius,
      team,
      weaponName,
      mesh,
      life: 3.5
    });
  }

  damageEntity(entity, kind, dmg, attackerTeam, weaponName) {
    if (kind === 'titan') {
      // Vortex or Thermal shield reflection!
      if (entity.defenseTimer > 0 && entity.classId === 'ion') {
        daemonSupervisor.daemons.vortexProjectileCatch.reflectedCount++;
        return;
      }
      if (entity.shield > 0) {
        const absorb = Math.min(entity.shield, dmg);
        entity.shield -= absorb;
        dmg -= absorb;
      }
      entity.hp -= dmg;
      if (attackerTeam === 'militia') {
        this.player.hitmarkerTimer = 0.14;
        this.player.titanMeter = Math.min(100, this.player.titanMeter + 4.5);
        if (this.playerTitan) this.playerTitan.coreCharge = Math.min(100, this.playerTitan.coreCharge + 6);
        this.audio.play('hit_ding', 0.85);
      }
      if (entity.hp <= 0) {
        entity.respawn = 12.0;
        entity.mesh.visible = false;
        this.spawnBurst(entity.pos.clone().add(new THREE.Vector3(0, 2.4, 0)), 0xf97316, 16);
        this.audio.play('explosion', 1.2);
        if (attackerTeam === 'militia') {
          this.scores.militia += 25;
          this.player.titanKills++;
          this.player.kills++;
          this.player.titanMeter = Math.min(100, this.player.titanMeter + 25);
          this.addKillfeed('YOU', weaponName, entity.name);
        }
      }
    } else {
      entity.hp -= dmg;
      if (attackerTeam === 'militia') {
        this.player.hitmarkerTimer = 0.14;
        this.audio.play('hit_ding', 1.0);
      }
      if (entity.hp <= 0) {
        entity.respawn = kind === 'pilot' ? 5.5 : 7.0;
        entity.mesh.visible = false;
        if (attackerTeam === 'militia') {
          const pts = kind === 'pilot' ? 10 : 3;
          this.scores.militia += pts;
          this.player.kills++;
          this.player.titanMeter = Math.min(100, this.player.titanMeter + (kind === 'pilot' ? 14 : 6));
          if (this.playerTitan) this.playerTitan.coreCharge = Math.min(100, this.playerTitan.coreCharge + 8);
          this.addKillfeed('YOU', weaponName, entity.name);
        } else {
          this.scores.imc += kind === 'pilot' ? 10 : 3;
        }
      }
    }
  }

  applySplashDamage(center, radius, dmg, team, weaponName) {
    const check = (ent, kind, yOff) => {
      if (ent.respawn > 0 || ent.team === team) return;
      const d = center.distanceTo(ent.pos.clone().add(new THREE.Vector3(0, yOff, 0)));
      if (d < radius) {
        const scale = 1 - (d / radius) * 0.65;
        this.damageEntity(ent, kind, dmg * scale, team, weaponName);
      }
    };
    this.aiPilots.forEach((ap) => check(ap, 'pilot', 1.1));
    this.grunts.forEach((gr) => check(gr, 'grunt', 0.9));
    this.enemyTitans.forEach((et) => check(et, 'titan', 2.4));

    // Pilot EPG rocket jump impulse
    if (this.player.mode === 'pilot') {
      const pd = center.distanceTo(this.player.pos.clone().add(new THREE.Vector3(0, 1.0, 0)));
      if (pd < radius) {
        const push = this.player.pos.clone().sub(center).normalize();
        this.player.vel.x += push.x * 11;
        this.player.vel.y = Math.max(this.player.vel.y, 12.5);
        this.player.vel.z += push.z * 11;
      }
    }
  }

  raycastArenaAndTitans(origin, dir, maxDist, includeTitans = true) {
    let bestDist = maxDist;
    let bestPoint = null;
    for (const b of this.blocks) {
      const minX = b.x - b.w / 2;
      const maxX = b.x + b.w / 2;
      const minZ = b.z - b.d / 2;
      const maxZ = b.z + b.d / 2;
      const maxY = b.yBase + b.h;
      const steps = 16;
      for (let s = 1; s <= steps; s++) {
        const dist = (s / steps) * bestDist;
        const px = origin.x + dir.x * dist;
        const py = origin.y + dir.y * dist;
        const pz = origin.z + dir.z * dist;
        if (px >= minX && px <= maxX && pz >= minZ && pz <= maxZ && py >= b.yBase && py <= maxY) {
          bestDist = dist;
          bestPoint = new THREE.Vector3(px, py, pz);
          break;
        }
      }
    }
    if (includeTitans) {
      for (const et of this.enemyTitans) {
        if (et.respawn > 0) continue;
        const center = et.pos.clone().add(new THREE.Vector3(0, 2.8, 0));
        const d = origin.distanceTo(center);
        if (d < bestDist && origin.clone().addScaledVector(dir, d).distanceTo(center) < 2.8) {
          bestDist = d;
          bestPoint = center;
        }
      }
    }
    return bestPoint ? { dist: bestDist, point: bestPoint } : null;
  }

  findNearestHostileInCone(origin, dir, maxAngleRad = 0.35) {
    let best = null;
    let bestAngle = maxAngleRad;
    const candidates = [
      ...this.enemyTitans.filter((t) => t.respawn <= 0).map((t) => t.pos.clone().add(new THREE.Vector3(0, 2.4, 0))),
      ...this.aiPilots.filter((a) => a.respawn <= 0 && a.team === 'imc').map((a) => a.pos.clone().add(new THREE.Vector3(0, 1.1, 0)))
    ];
    for (const c of candidates) {
      const to = c.clone().sub(origin);
      if (to.length() > 65) continue;
      const ang = dir.angleTo(to.normalize());
      if (ang < bestAngle) {
        bestAngle = ang;
        best = c;
      }
    }
    return best;
  }

  findSmartLockTargets(origin, dir, limit = 3) {
    const hits = [];
    const list = [
      ...this.aiPilots.filter((a) => a.respawn <= 0 && a.team === 'imc').map((a) => a.pos.clone().add(new THREE.Vector3(0, 1.1, 0))),
      ...this.grunts.filter((g) => g.respawn <= 0 && g.team === 'imc').map((g) => g.pos.clone().add(new THREE.Vector3(0, 0.9, 0))),
      ...this.enemyTitans.filter((t) => t.respawn <= 0).map((t) => t.pos.clone().add(new THREE.Vector3(0, 2.4, 0)))
    ];
    for (const wp of list) {
      const to = wp.clone().sub(origin);
      const dist = to.length();
      if (dist < 42 && dir.angleTo(to.normalize()) < 0.38) {
        const proj = wp.clone().project(this.camera);
        if (proj.z < 1) {
          hits.push({
            worldPos: wp,
            sx: (proj.x * 0.5 + 0.5) * 100,
            sy: (-proj.y * 0.5 + 0.5) * 100
          });
        }
      }
      if (hits.length >= limit) break;
    }
    return hits;
  }

  spawnBurst(center, colorHex, count = 10) {
    if (!this.scene) return;
    for (let i = 0; i < count; i++) {
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, 0.24, 0.24),
        new THREE.MeshBasicMaterial({ color: colorHex })
      );
      m.position.copy(center);
      this.scene.add(m);
      this.particles.push({
        mesh: m,
        vel: new THREE.Vector3((Math.random() - 0.5) * 16, Math.random() * 12 + 3, (Math.random() - 0.5) * 16),
        life: 0.45 + Math.random() * 0.25
      });
    }
  }

  addKillfeed(killer, weapon, victim) {
    this.killfeed.unshift({ killer, weapon, victim });
    if (this.killfeed.length > 4) this.killfeed.pop();
  }

  // --- Main Step & Physics Solvers ---
  step(dt) {
    if (!this.glReady || (this.state !== 'PLAYING' && this.state !== 'EVAC')) return;
    const stepDt = Math.min(0.05, dt * (this.timeScale || 1.0));

    if (this.osMonument) this.osMonument.rotation.y += stepDt * 0.55;

    // 1. Update Look Rotation
    const aimSens = 0.0024 * (this.player.scoped ? 0.42 : 1.0);
    this.player.yaw -= this.input.lookDeltaX * aimSens;
    this.player.pitch = clamp(this.player.pitch - this.input.lookDeltaY * aimSens, -1.35, 1.35);
    this.input.lookDeltaX = 0;
    this.input.lookDeltaY = 0;

    if (this.input.stickAimActive) {
      this.player.yaw -= this.input.stickAimX * 2.5 * stepDt;
      this.player.pitch = clamp(this.player.pitch - this.input.stickAimY * 1.9 * stepDt, -1.35, 1.35);
    }

    // 2. Step Orbital Titanfalls (Daemon 20)
    daemonSupervisor.stepOrbitalDrops(this.drops, stepDt, (drop) => this.landPlayerTitan(drop));
    for (const d of this.drops) {
      d.mesh.position.set(d.x, d.y + 2.2, d.z);
    }

    // 3. Step Player Physics (Pilot Parkour vs Titan Cockpit)
    if (this.player.respawnTimer > 0) {
      this.player.respawnTimer = Math.max(0, this.player.respawnTimer - stepDt);
      if (this.player.respawnTimer === 0) {
        this.player.hp = this.player.maxHp;
        this.player.pos.set((Math.random() - 0.5) * 18, 0, 44);
        this.player.vel.set(0, 0, 0);
      }
    } else if (this.player.mode === 'pilot') {
      this.stepPilotPhysics(stepDt);
    } else if (this.playerTitan) {
      this.stepPlayerTitanPhysics(stepDt);
    }

    // 4. Firing & Weapon Cooldowns
    this.player.fireCooldown = Math.max(0, this.player.fireCooldown - stepDt);
    this.player.tacticalCooldown = Math.max(0, this.player.tacticalCooldown - stepDt);
    this.player.tacticalActiveTimer = Math.max(0, this.player.tacticalActiveTimer - stepDt);
    this.player.hitmarkerTimer = Math.max(0, this.player.hitmarkerTimer - stepDt);
    if (this.player.reloading > 0) {
      this.player.reloading = Math.max(0, this.player.reloading - stepDt);
      if (this.player.reloading === 0) {
        this.player.ammo = this.player.maxAmmo;
      }
    }
    if (!this.playerTitan) {
      this.player.titanMeter = Math.min(100, this.player.titanMeter + stepDt * 1.85);
    }

    const wantFire = this.input.keys.fire || this.input.mouseFiring || (this.input.stickAimActive && Math.hypot(this.input.stickAimX, this.input.stickAimY) > 0.35);
    if (wantFire && this.player.respawnTimer <= 0) {
      this.firePlayerWeapon();
    }

    // Smart Pistol reticle targets preview
    if (this.player.mode === 'pilot' && (this.selectedWeapon === 'smart_pistol' || this.selectedWeapon === 'archer')) {
      this.player.smartLocks = this.findSmartLockTargets(this.camera.getWorldPosition(new THREE.Vector3()), this.getAimDir(), 3);
    } else {
      this.player.smartLocks = [];
    }

    // 5. Step Auto-Titan (when disembarked) & Enemy Titans / AI Pilots / Grunts
    this.stepAutoTitan(stepDt);
    this.stepEnemyTitans(stepDt);
    this.stepAiUnits(stepDt);
    this.stepProjectiles(stepDt);
    this.stepParticles(stepDt);

    // 6. Battery Pickups
    for (const bp of this.batteryPickups) {
      if (bp.cooldown > 0) {
        bp.cooldown = Math.max(0, bp.cooldown - stepDt);
        bp.mesh.visible = bp.cooldown === 0;
      } else {
        bp.mesh.rotation.y += stepDt * 2.2;
        if (!this.player.hasBattery && this.player.mode === 'pilot' && Math.hypot(this.player.pos.x - bp.x, this.player.pos.z - bp.z) < 2.2) {
          this.player.hasBattery = true;
          bp.cooldown = 16;
          bp.mesh.visible = false;
          this.audio.play('battery', 1.1);
          this.addKillfeed('BATTERY', 'PICKUP', 'Green Titan Battery Acquired!');
        }
      }
    }

    // 7. Match Win / Dropship Evac Trigger
    if (this.state === 'PLAYING' && (this.scores.militia >= this.scores.winTarget || this.scores.imc >= this.scores.winTarget)) {
      this.startEvacFinale();
    } else if (this.state === 'EVAC') {
      this.evacTimer = Math.max(0, this.evacTimer - stepDt);
      if (this.evacShip) {
        this.evacShip.mesh.position.y = THREE.MathUtils.damp(this.evacShip.mesh.position.y, 7.5, 2.2, stepDt);
        if (this.player.pos.distanceTo(this.evacShip.mesh.position) < 7.5) {
          this.scores.militia += 40;
          this.state = 'ENDED';
          this.audio.play('core_activate', 1.4);
          this.addKillfeed('EVAC SUCCESS', 'DROPSHIP', 'Pilot Extracted Safely!');
        }
      }
      if (this.evacTimer <= 0 && this.state === 'EVAC') {
        this.state = 'ENDED';
      }
    }

    // 8. Camera Transform & Viewmodel Bob/Spin
    this.updateCameraRig(stepDt);
    this.emitHud();
  }

  stepPilotPhysics(dt) {
    const p = this.player;
    const isStim = this.selectedTactical === 'stim' && p.tacticalActiveTimer > 0;
    const speedMult = (isStim ? 1.65 : 1.0) * (this.speedMult || 1.0);

    // 1. Rodeo Magnet Check (Daemon 23)
    if (p.rodeoTarget) {
      const t = p.rodeoTarget;
      if (t.respawn > 0) {
        p.rodeoTarget = null;
      } else {
        p.pos.set(t.pos.x, t.pos.y + 4.4, t.pos.z);
        p.vel.set(0, 0, 0);
        p.rodeoTimer += dt;
        if (p.rodeoTimer >= 1.35) {
          // Pull Green Battery or drop frag grenade!
          if (t.hasBattery) {
            t.hasBattery = false;
            if (t.rig?.batteryCore) t.rig.batteryCore.visible = false;
            p.hasBattery = true;
            daemonSupervisor.daemons.rodeoBatteryBus.stealsCount++;
            this.audio.play('battery', 1.3);
            this.addKillfeed('RODEO', 'BATTERY PULL', `Stole Green Battery from ${t.name}!`);
          }
          this.damageEntity(t, 'titan', 1800, 'militia', 'Rodeo Charge');
          p.rodeoTarget = null;
          p.vel.y = 14.5;
          p.vel.x = (Math.random() - 0.5) * 14;
          p.vel.z = (Math.random() - 0.5) * 14;
        }
        return;
      }
    }

    // Check Rodeo latch onto Enemy Titan when airborne near hull top
    if (!p.grounded && p.vel.y < 8) {
      for (const et of this.enemyTitans) {
        if (et.respawn > 0) continue;
        const dock = daemonSupervisor.evalRodeoBattery(p.pos, et.pos, 3.8);
        if (dock) {
          p.rodeoTarget = et;
          p.rodeoTimer = 0;
          p.grappleAnchor = null;
          this.addKillfeed('RODEO', 'LATCHED', `Rodeoing ${et.name}...`);
          return;
        }
      }
    }

    // 2. Grapple Hook Reel (Daemon 19)
    if (p.grappleAnchor && p.grappleTimer > 0) {
      p.grappleTimer -= dt;
      const stillActive = daemonSupervisor.solveGrapple(p.pos, p.vel, p.grappleAnchor, dt);
      if (!stillActive || p.grappleTimer <= 0) {
        p.grappleAnchor = null;
      }
    }
    if (this.grappleLine) {
      this.grappleLine.visible = Boolean(p.grappleAnchor);
      if (p.grappleAnchor) {
        const hand = p.pos.clone().add(new THREE.Vector3(0, 1.45, 0));
        this.grappleLine.geometry.setFromPoints([hand, p.grappleAnchor]);
      }
    }

    // 3. Slide decay
    if (p.sliding) {
      p.slideTimer -= dt;
      if (p.slideTimer <= 0) p.sliding = false;
    }

    // 4. Detect nearby Wallrun surface normal when airborne
    p.wallTime = Math.max(0, p.wallTime - dt);
    p.wallNormal = null;
    let targetRoll = 0;
    const wish = this.getWishDir();
    const forward = this.getLookForward();

    if (!p.grounded && p.wallTime === 0) {
      const wallN = this.detectNearbyWallNormal(p.pos);
      if (wallN && Math.hypot(p.vel.x, p.vel.z) > 4.2) {
        const res = daemonSupervisor.solveWallrun(p.vel, wallN, forward, dt, speedMult);
        if (res.active) {
          p.wallNormal = wallN;
          p.doubleJumpAvail = true;
          targetRoll = res.targetRoll;
        }
      }
    }

    // 5. Horizontal movement & Source Air-Strafe (Daemon 18)
    if (!p.wallNormal) {
      daemonSupervisor.solveAirStrafe(p.vel, wish.x, wish.z, p.grounded, 11.4 * speedMult, dt, p.sliding);
    }

    // 6. Gravity & Integration
    if (!p.grounded && !p.wallNormal) {
      p.vel.y -= this.gravity * dt;
    }
    p.pos.x += p.vel.x * dt;
    p.pos.y += p.vel.y * dt;
    p.pos.z += p.vel.z * dt;

    // 7. Resolve Arena Rooftops, Wall Collisions & Jump Pads
    this.resolvePilotArenaCollisions();
    for (const pad of this.jumpPads) {
      if (Math.hypot(p.pos.x - pad.x, p.pos.z - pad.z) < pad.radius && p.pos.y < 1.2) {
        p.vel.y = pad.boostY;
        p.grounded = false;
        p.doubleJumpAvail = true;
        this.audio.play('jumpkit', 1.25);
      }
    }

    // Smoothly bank camera ±14° while wallrunning!
    p.roll = THREE.MathUtils.damp(p.roll, targetRoll, 11, dt);

    // Health regeneration out of Stim / combat
    if (isStim) {
      p.hp = Math.min(p.maxHp, p.hp + 26 * dt);
    } else if (p.hp < p.maxHp) {
      p.hp = Math.min(p.maxHp, p.hp + 7 * dt);
    }
  }

  stepPlayerTitanPhysics(dt) {
    const t = this.playerTitan;
    const p = this.player;
    t.fireCd = Math.max(0, t.fireCd - dt);
    t.ordCd = Math.max(0, t.ordCd - dt);
    t.defCd = Math.max(0, t.defCd - dt);
    t.defActive = Math.max(0, t.defActive - dt);
    t.coreActive = Math.max(0, t.coreActive - dt);

    if (t.reloading > 0) {
      t.reloading = Math.max(0, t.reloading - dt);
      if (t.reloading === 0) t.clip = t.spec.clipSize;
    }
    if (t.dashes < t.dashMax) {
      t.dashRecharge += dt;
      if (t.dashRecharge >= t.spec.dashCooldown) {
        t.dashes++;
        t.dashRecharge = 0;
      }
    }

    // Shield Vortex Catch (Daemon 24)
    if (this.titanCockpit?.shieldMesh) {
      this.titanCockpit.shieldMesh.visible = t.defActive > 0;
    }
    if (t.defActive > 0 && t.classId === 'ion') {
      const shieldPos = p.pos.clone().add(new THREE.Vector3(0, 2.8, 0)).addScaledVector(this.getLookForward(), 2.8);
      daemonSupervisor.filterVortexCatch(this.projectiles, shieldPos, this.getAimDir(), 'militia', 7.5);
    }

    const wish = this.getWishDir();
    const spd = t.spec.speed * (t.coreActive > 0 && t.classId === 'ronin' ? 1.45 : 1.0) * (this.speedMult || 1.0);
    t.vel.x = THREE.MathUtils.damp(t.vel.x, wish.x * spd, 8, dt);
    t.vel.z = THREE.MathUtils.damp(t.vel.z, wish.z * spd, 8, dt);
    t.vel.y = p.pos.y > 0 ? t.vel.y - this.gravity * 0.85 * dt : 0;

    p.pos.x = clamp(p.pos.x + t.vel.x * dt, -ARENA_HALF + 3, ARENA_HALF - 3);
    p.pos.z = clamp(p.pos.z + t.vel.z * dt, -ARENA_HALF + 3, ARENA_HALF - 3);
    p.pos.y = Math.max(0, p.pos.y + t.vel.y * dt);

    for (const b of this.blocks) {
      const hw = b.w * 0.5 + 1.8;
      const hd = b.d * 0.5 + 1.8;
      const dx = p.pos.x - b.x;
      const dz = p.pos.z - b.z;
      if (Math.abs(dx) < hw && Math.abs(dz) < hd) {
        if (hw - Math.abs(dx) < hd - Math.abs(dz)) p.pos.x = b.x + Math.sign(dx || 1) * hw;
        else p.pos.z = b.z + Math.sign(dz || 1) * hd;
      }
    }

    t.pos.copy(p.pos);
    p.roll = THREE.MathUtils.damp(p.roll, 0, 10, dt);
    if (t.coreActive > 0 && t.classId === 'northstar' && p.pos.y < 8.5) {
      t.vel.y = 6.5;
    }
  }

  stepAutoTitan(dt) {
    const t = this.playerTitan;
    if (!t) return;
    if (t.domeTimer > 0) {
      t.domeTimer = Math.max(0, t.domeTimer - dt);
      if (t.domeMesh) {
        t.domeMesh.visible = t.domeTimer > 0;
        t.domeMesh.rotation.y += dt * 0.8;
      }
    }
    if (this.player.mode !== 'pilot') return;

    // Auto-Titan escorts Pilot & fires at nearest IMC Titan/Pilot!
    const target = this.enemyTitans.find((e) => e.respawn <= 0) || this.aiPilots.find((a) => a.respawn <= 0 && a.team === 'imc');
    if (target) {
      const to = target.pos.clone().sub(t.pos);
      const dist = to.length();
      t.mesh.rotation.y = Math.atan2(to.x, to.z);
      if (dist > 14) {
        to.y = 0;
        to.normalize();
        t.pos.x += to.x * t.spec.speed * 0.55 * dt;
        t.pos.z += to.z * t.spec.speed * 0.55 * dt;
      }
      t.fireCdAi -= dt;
      if (t.fireCdAi <= 0 && dist < 44) {
        t.fireCdAi = 0.65;
        const origin = t.pos.clone().add(new THREE.Vector3(0, 3.2, 0));
        const aim = target.pos.clone().add(new THREE.Vector3(0, 1.8, 0)).sub(origin).normalize();
        this.spawnProjectile(origin, aim, 48, 320, 2.5, 'militia', `${t.spec.name} (Auto)`, t.spec.eyeColor);
      }
    }
  }

  stepEnemyTitans(dt) {
    for (const et of this.enemyTitans) {
      if (et.respawn > 0) {
        et.respawn = Math.max(0, et.respawn - dt);
        if (et.respawn === 0) {
          et.hp = et.maxHp;
          et.shield = 1200;
          et.hasBattery = true;
          if (et.rig?.batteryCore) et.rig.batteryCore.visible = true;
          et.pos.set((Math.random() - 0.5) * 32, 0, -42);
          et.mesh.visible = true;
        }
        continue;
      }

      et.defenseTimer = Math.max(0, et.defenseTimer - dt);
      et.defenseCd = Math.max(0, et.defenseCd - dt);
      if (et.rig?.shieldMesh) et.rig.shieldMesh.visible = et.defenseTimer > 0;
      if (et.hp < et.maxHp * 0.65 && et.defenseCd <= 0) {
        et.defenseTimer = 2.4;
        et.defenseCd = 7.0;
      }

      const tgtPos = this.playerTitan ? this.playerTitan.pos : this.player.pos;
      const to = tgtPos.clone().sub(et.pos);
      const dist = to.length();
      et.mesh.rotation.y = Math.atan2(to.x, to.z);
      if (dist > 14) {
        to.y = 0;
        to.normalize();
        et.pos.x = clamp(et.pos.x + to.x * et.spec.speed * 0.55 * dt, -ARENA_HALF + 4, ARENA_HALF - 4);
        et.pos.z = clamp(et.pos.z + to.z * et.spec.speed * 0.55 * dt, -ARENA_HALF + 4, ARENA_HALF - 4);
      }
      if (et.rig?.barrelSpin) et.rig.barrelSpin.rotation.z += dt * 12;

      const playerCloaked = this.player.mode === 'pilot' && this.selectedTactical === 'cloak' && this.player.tacticalActiveTimer > 0;
      et.fireCd -= dt;
      if (et.fireCd <= 0 && dist < 48 && !playerCloaked) {
        et.fireCd = et.classId === 'legion' ? 0.28 : 1.05;
        const origin = et.pos.clone().add(new THREE.Vector3(0, 3.0, 0));
        const aim = tgtPos.clone().add(new THREE.Vector3(0, 1.4, 0)).sub(origin).normalize();
        this.spawnProjectile(origin, aim, 40, 180 * (this.aiConfig.dmgMult || 1), 2.8, 'imc', et.spec.weaponName, et.spec.eyeColor);
      }
    }
  }

  stepAiUnits(dt) {
    const stepActor = (u, isPilot) => {
      if (u.respawn > 0) {
        u.respawn = Math.max(0, u.respawn - dt);
        if (u.respawn === 0) {
          u.hp = isPilot ? 100 : 55;
          u.pos.set((Math.random() - 0.5) * 34, 0, u.team === 'militia' ? 40 : -40);
          u.mesh.visible = true;
        }
        return;
      }
      const enemyList = u.team === 'militia'
        ? this.aiPilots.filter((x) => x.team === 'imc' && x.respawn <= 0)
        : [this.player, ...this.aiPilots.filter((x) => x.team === 'militia' && x.respawn <= 0)];
      const tgt = enemyList[0];
      if (!tgt) return;

      const tgtPos = tgt.pos || this.player.pos;
      const to = tgtPos.clone().sub(u.pos);
      const dist = to.length();
      u.mesh.rotation.y = Math.atan2(to.x, to.z);
      if (dist > 11) {
        to.y = 0;
        to.normalize();
        const spd = isPilot ? 8.5 : 4.2;
        u.pos.x = clamp(u.pos.x + to.x * spd * dt, -ARENA_HALF + 3, ARENA_HALF - 3);
        u.pos.z = clamp(u.pos.z + to.z * spd * dt, -ARENA_HALF + 3, ARENA_HALF - 3);
      }
      u.fireCd -= dt;
      if (u.fireCd <= 0 && dist < 34) {
        u.fireCd = isPilot ? 0.95 : 1.6;
        const origin = u.pos.clone().add(new THREE.Vector3(0, 1.4, 0));
        const aim = tgtPos.clone().add(new THREE.Vector3(0, 1.1, 0)).sub(origin).normalize();
        this.spawnProjectile(origin, aim, 36, isPilot ? 11 : 6, 0.8, u.team, isPilot ? 'R-201' : 'Rifle', u.team === 'militia' ? '#38bdf8' : '#ef4444');
      }
    };

    this.aiPilots.forEach((ap) => stepActor(ap, true));
    this.grunts.forEach((gr) => stepActor(gr, false));

    for (let i = this.holoDecoys.length - 1; i >= 0; i--) {
      const h = this.holoDecoys[i];
      h.life -= dt;
      h.pos.addScaledVector(h.vel, dt);
      if (h.life <= 0) {
        this.scene.remove(h.mesh);
        this.holoDecoys.splice(i, 1);
      }
    }
  }

  stepProjectiles(dt) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const pr = this.projectiles[i];
      pr.life -= dt;
      pr.pos.addScaledVector(pr.vel, dt);

      let exploded = pr.life <= 0 || pr.pos.y <= 0;
      if (!exploded) {
        for (const b of this.blocks) {
          if (Math.abs(pr.pos.x - b.x) < b.w * 0.5 && Math.abs(pr.pos.z - b.z) < b.d * 0.5 && pr.pos.y <= b.yBase + b.h) {
            exploded = true;
            break;
          }
        }
      }
      if (!exploded && pr.team !== 'militia' && this.player.respawnTimer <= 0) {
        const phased = this.player.mode === 'pilot' && this.selectedTactical === 'phase' && this.player.tacticalActiveTimer > 0;
        if (!phased) {
          const hitRadius = this.player.mode === 'titan' ? 2.4 : 0.95;
          const playerCenter = this.player.pos.clone().add(new THREE.Vector3(0, this.player.mode === 'titan' ? 2.5 : 1.1, 0));
          if (pr.pos.distanceTo(playerCenter) < hitRadius) {
            exploded = true;
            this.damagePlayer(pr.damage, pr.weaponName);
          }
        }
      }
      if (!exploded && pr.team === 'militia') {
        for (const et of this.enemyTitans) {
          if (et.respawn <= 0 && pr.pos.distanceTo(et.pos.clone().add(new THREE.Vector3(0, 2.5, 0))) < 2.6) {
            exploded = true;
            this.damageEntity(et, 'titan', pr.titanDamage, 'militia', pr.weaponName);
            break;
          }
        }
      }

      if (exploded) {
        if (pr.radius >= 2.2) {
          this.applySplashDamage(pr.pos, pr.radius, pr.damage * 0.65, pr.team, pr.weaponName);
          this.spawnBurst(pr.pos, 0xf97316, 6);
        }
        this.scene.remove(pr.mesh);
        this.projectiles.splice(i, 1);
      }
    }
  }

  damagePlayer(dmg, weaponName) {
    if (this.player.mode === 'titan' && this.playerTitan) {
      const t = this.playerTitan;
      if (t.defActive > 0 && t.classId === 'ion') return; // Vortex absorbed!
      if (t.shield > 0) {
        const ab = Math.min(t.shield, dmg);
        t.shield -= ab;
        dmg -= ab;
      }
      t.hp -= dmg;
      if (t.hp <= 0) {
        this.triggerNuclearEject();
      }
      return;
    }
    this.player.hp -= dmg;
    if (this.player.hp <= 0) {
      this.player.hp = 0;
      this.player.deaths++;
      this.player.respawnTimer = 3.2;
      this.scores.imc += 10;
      this.addKillfeed('IMC', weaponName, 'YOU');
    }
  }

  stepParticles(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.life -= dt;
      pt.mesh.position.addScaledVector(pt.vel, dt);
      pt.vel.y -= 18 * dt;
      if (pt.life <= 0) {
        this.scene.remove(pt.mesh);
        this.particles.splice(i, 1);
      }
    }
  }

  detectNearbyWallNormal(pos) {
    const reach = 1.35;
    for (const b of this.blocks) {
      if (!b.wallrunnable) continue;
      if (pos.y < b.yBase + 0.3 || pos.y > b.yBase + b.h - 0.5) continue;
      const hw = b.w * 0.5;
      const hd = b.d * 0.5;
      const dx = pos.x - b.x;
      const dz = pos.z - b.z;
      if (Math.abs(dz) < hd + 0.2 && Math.abs(Math.abs(dx) - hw) < reach) {
        return new THREE.Vector3(Math.sign(dx || 1), 0, 0);
      }
      if (Math.abs(dx) < hw + 0.2 && Math.abs(Math.abs(dz) - hd) < reach) {
        return new THREE.Vector3(0, 0, Math.sign(dz || 1));
      }
    }
    return null;
  }

  resolvePilotArenaCollisions() {
    const p = this.player;
    p.pos.x = clamp(p.pos.x, -ARENA_HALF + 1.5, ARENA_HALF - 1.5);
    p.pos.z = clamp(p.pos.z, -ARENA_HALF + 1.5, ARENA_HALF - 1.5);
    let floorY = 0;

    for (const b of this.blocks) {
      const hw = b.w * 0.5 + 0.55;
      const hd = b.d * 0.5 + 0.55;
      const dx = p.pos.x - b.x;
      const dz = p.pos.z - b.z;
      const top = b.yBase + b.h;
      if (Math.abs(dx) < hw && Math.abs(dz) < hd) {
        if (p.pos.y >= top - 0.65 && p.vel.y <= 0) {
          floorY = Math.max(floorY, top);
        } else if (p.pos.y < top - 0.65) {
          if (hw - Math.abs(dx) < hd - Math.abs(dz)) {
            p.pos.x = b.x + Math.sign(dx || 1) * hw;
            p.vel.x = 0;
          } else {
            p.pos.z = b.z + Math.sign(dz || 1) * hd;
            p.vel.z = 0;
          }
        }
      }
    }

    if (p.pos.y <= floorY) {
      p.pos.y = floorY;
      p.vel.y = 0;
      p.grounded = true;
      p.doubleJumpAvail = true;
    } else {
      p.grounded = false;
    }
  }

  startEvacFinale() {
    this.state = 'EVAC';
    this.evacTimer = 15.0;
    const ship = buildEvacDropship();
    ship.position.set(0, 42, -32);
    this.scene.add(ship);
    this.evacShip = { mesh: ship };
    this.addKillfeed('EVAC DROPSHIP', 'INBOUND', 'Reach the Dropship at North Ridge in 15s!');
    this.audio.play('titanfall_boom', 0.9);
  }

  updateCameraRig(dt) {
    const p = this.player;
    const targetEye = p.mode === 'titan' ? 4.15 : (p.sliding ? 0.95 : 1.72);
    this.camera.position.set(p.pos.x, p.pos.y + targetEye, p.pos.z);
    this.camera.rotation.set(p.pitch, p.yaw, p.roll, 'YXZ');

    const baseFov = p.mode === 'titan' ? 76 : (p.scoped ? 36 : (p.wallNormal || p.sliding ? 88 : 78));
    this.camera.fov = THREE.MathUtils.damp(this.camera.fov, baseFov, 9, dt);
    this.camera.updateProjectionMatrix();

    if (this.viewmodel) this.viewmodel.visible = p.mode === 'pilot';
    if (this.titanCockpit?.root) {
      this.titanCockpit.root.visible = p.mode === 'titan';
      if (this.titanCockpit.barrelSpin && this.playerTitan?.coreActive > 0) {
        this.titanCockpit.barrelSpin.rotation.z += dt * 22;
      }
      if (this.titanCockpit.swordMesh) {
        this.titanCockpit.swordMesh.rotation.z = THREE.MathUtils.damp(this.titanCockpit.swordMesh.rotation.z, -0.4, 8, dt);
      }
    }
  }

  emitHud() {
    if (!this.onHudUpdate) return;
    const p = this.player;
    const t = this.playerTitan;
    const inTitan = p.mode === 'titan' && t;
    this.onHudUpdate({
      state: this.state,
      mode: p.mode,
      titanName: t ? t.spec.name : TITAN_CLASSES[this.selectedTitanClass].name,
      hp: Math.max(0, Math.round(inTitan ? t.hp : p.hp)),
      maxHp: inTitan ? t.maxHp : p.maxHp,
      shield: inTitan ? Math.round(t.shield) : 0,
      shieldMax: inTitan ? t.shieldMax : 0,
      ammo: inTitan ? t.clip : p.ammo,
      maxAmmo: inTitan ? t.spec.clipSize : p.maxAmmo,
      reloading: inTitan ? t.reloading > 0 : p.reloading > 0,
      titanMeter: Math.round(p.titanMeter),
      hasTitan: Boolean(t),
      canEmbark: Boolean(t && p.mode === 'pilot' && p.pos.distanceTo(t.pos) < 7.8),
      coreCharge: t ? Math.round(t.coreCharge) : 0,
      hasBattery: p.hasBattery,
      wallrunning: Boolean(p.wallNormal),
      rodeoing: Boolean(p.rodeoTarget),
      tacticalCd: p.tacticalCooldown > 0 ? p.tacticalCooldown.toFixed(1) : 'READY',
      militiaScore: this.scores.militia,
      imcScore: this.scores.imc,
      winTarget: this.scores.winTarget,
      kills: p.kills,
      titanKills: p.titanKills,
      respawnTimer: p.respawnTimer > 0 ? p.respawnTimer.toFixed(1) : 0,
      scoped: p.scoped,
      hitmarker: p.hitmarkerTimer > 0,
      smartLocks: p.smartLocks,
      evacTimer: this.state === 'EVAC' ? Math.ceil(this.evacTimer) : 0,
      killfeed: this.killfeed
    });
  }

  render() {
    if (!this.glReady || !this.renderer) return;
    this.renderer.render(this.scene, this.camera);
  }
}
