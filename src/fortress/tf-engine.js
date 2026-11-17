// Team Fortress — Black Liquid Arena (Full-System 3D Class Shooter)
// Connects: Liquid CAD, Semantic Synth, Shader Lab, Sonic Synth, World Forge,
// Data Multiplier, Data Vault, Pattern Guard, and all 16 Engine Daemons.

import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { daemonSupervisor, isSoftwareGlDevice } from '../studio/daemons.js';
import { getEnvironmentTexture } from '../studio/pbr-skins.js';
import { buildAssemblyGroup } from '../studio/cad-presets.js';
import { hybridScene } from '../studio/hybrid-scene.js';
import { logGuardEvent } from '../studio/app-pattern-guard.js';
import { FortressAudio } from './tf-audio.js';
import { TF_CLASSES, TF_SKINS, buildClassRig, buildWeaponMesh, buildSentryRig } from './tf-models.js';

export class TeamFortressGame {
  constructor(canvas, deps = {}) {
    this.canvas = canvas;
    this.cadApp = deps.cadApp || null;
    this.worldForgeApp = deps.worldForgeApp || null;
    this.dataVault = deps.dataVault || null;
    this.audio = new FortressAudio(deps.marioAudio || null);
    this.isSoftwareGl = isSoftwareGlDevice();
    this.glReady = false;
    this.glFailed = false;
    this.pendingSize = null;
    this.pendingMonument = null;

    this.renderer = null;
    this.scene = null;
    this.camera = new THREE.PerspectiveCamera(75, 16 / 9, 0.1, 180);

    // Match State
    this.mode = 'koth'; // 'koth' | 'ctf' | 'tdm'
    this.skinId = 'standard';
    this.customSkinColors = null;
    this.playerTeam = 'red';
    this.playerClassId = 'soldier';
    this.state = 'MENU'; // 'MENU' | 'PLAYING' | 'PAUSED' | 'VICTORY'
    this.active = false;

    this.botsPerTeam = 3;
    this.hpMult = 1.0;
    this.dmgMult = 1.0;
    this.worldGravity = 34.0;
    this.timeScale = 1.0;
    this.speedMult = 1.0;
    this.fireRateMult = 1.0;
    this.infiniteJumps = false;
    this.activeLayout = null;
    this.arenaGroup = null;

    this.colliders = [];
    this.ramps = [];
    this.jumpPads = [];
    this.pickups = [];
    this.sentries = [];
    this.projectiles = [];
    this.particles = [];
    this.bots = [];
    this.killfeed = [];

    this.monumentGroup = null;
    this.monumentAnchor = new THREE.Group();
    this.monumentAnchor.position.set(0, 0.1, 0);

    this.flags = {
      red: { pos: new THREE.Vector3(-34, 1.0, 0), home: new THREE.Vector3(-34, 1.0, 0), carrier: null, mesh: null },
      blu: { pos: new THREE.Vector3(34, 1.0, 0), home: new THREE.Vector3(34, 1.0, 0), carrier: null, mesh: null }
    };
    this.koth = { owner: 'neutral', progress: 0, redTime: 75, bluTime: 75, ringMesh: null };
    this.scores = { red: 0, blu: 0, winTarget: 25 };

    this.player = {
      pos: new THREE.Vector3(-28, 1.2, 0),
      vel: new THREE.Vector3(0, 0, 0),
      yaw: -Math.PI / 2,
      pitch: 0,
      hp: 200,
      maxHp: 200,
      ammo: 4,
      maxAmmo: 4,
      fireTimer: 0,
      reloadTimer: 0,
      specialTimer: 0,
      uberTimer: 0,
      cloakTimer: 0,
      scoped: false,
      grounded: false,
      jumpsLeft: 2,
      kills: 0,
      deaths: 0,
      respawnTimer: 0,
      hitmarkerTimer: 0,
      viewmodelPivot: new THREE.Group(),
      recoilOffset: 0
    };
    this.camera.add(this.player.viewmodelPivot);

    this.input = {
      moveX: 0,
      moveZ: 0,
      lookDeltaX: 0,
      lookDeltaY: 0,
      stickMoveX: 0,
      stickMoveY: 0,
      stickAimX: 0,
      stickAimY: 0,
      stickAimActive: false,
      keys: { w: false, s: false, a: false, d: false, jump: false, fire: false, special: false },
      mouseFiring: false
    };

    this.hitFlashMesh = null;
    this.onHudUpdate = null;
    this.onMatchEnd = null;
  }

  ensureGl() {
    if (this.glReady) return true;
    if (this.glFailed || !this.canvas) return false;
    try {
      this.isSoftwareGl = isSoftwareGlDevice();
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        antialias: !this.isSoftwareGl,
        powerPreference: 'high-performance'
      });
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.24;
      this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
      this.renderer.shadowMap.enabled = !this.isSoftwareGl;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0x050912);
      this.scene.fog = new THREE.FogExp2(0x050912, 0.011);

      const pmrem = new THREE.PMREMGenerator(this.renderer);
      this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      pmrem.dispose();

      this.scene.add(this.camera);
      this.scene.add(this.monumentAnchor);

      this.hemi = new THREE.HemisphereLight(0xcbeafe, 0x111827, 0.95);
      this.key = new THREE.DirectionalLight(0xfff1d6, 1.85);
      this.key.position.set(22, 34, 18);
      this.key.castShadow = !this.isSoftwareGl;
      this.key.shadow.mapSize.set(1024, 1024);
      this.key.shadow.camera.left = -45;
      this.key.shadow.camera.right = 45;
      this.key.shadow.camera.top = 45;
      this.key.shadow.camera.bottom = -45;
      this.key.shadow.bias = -0.0005;
      this.rim = new THREE.DirectionalLight(0x38bdf8, 1.0);
      this.rim.position.set(-24, 16, -24);
      this.scene.add(this.hemi, this.key, this.rim);

      this.glReady = true;
      this.buildArena();
      this.rebuildViewmodel();
      this.syncFromOS();
      if (this.pendingMonument) {
        this.setCenterMonument(this.pendingMonument);
      }
      if (this.pendingSize) {
        this.resize(this.pendingSize[0], this.pendingSize[1]);
      }
      return true;
    } catch {
      this.glFailed = true;
      return false;
    }
  }

  resize(width, height) {
    if (width < 10 || height < 10) return;
    this.pendingSize = [width, height];
    this.camera.aspect = width / height;
    this.camera.fov = this.player.scoped ? 32 : (width < height ? 84 : 74);
    this.camera.updateProjectionMatrix();
    if (this.glReady && this.renderer) {
      this.renderer.setSize(width, height, false);
    }
  }

  buildArena(customLayout = null) {
    if (this.arenaGroup) {
      this.scene.remove(this.arenaGroup);
      daemonSupervisor.disposeObject3D(this.arenaGroup);
    }
    this.arenaGroup = new THREE.Group();
    this.scene.add(this.arenaGroup);

    this.colliders = [];
    this.jumpPads = [];
    this.pickups = [];
    this.activeLayout = customLayout || this.activeLayout;

    // Floor: Authentic Dustbowl / 2Fort Sandstone Ground + Horizon Apron
    const floorTex = getEnvironmentTexture('tf2_sandstone', 18, 12);
    const woodTex = getEnvironmentTexture('tf2_wood', 3, 2);
    const redWallTex = getEnvironmentTexture('tf2_corrugated_red', 2, 1);
    const bluWallTex = getEnvironmentTexture('tf2_corrugated_blu', 2, 1);

    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTex,
      roughness: 0.84,
      metalness: 0.08
    });
    const floor = new THREE.Mesh(new THREE.BoxGeometry(120, 1, 76), floorMat);
    floor.position.set(0, -0.5, 0);
    floor.receiveShadow = true;
    this.arenaGroup.add(floor);

    const apron = new THREE.Mesh(
      new THREE.PlaneGeometry(340, 340),
      new THREE.MeshBasicMaterial({ color: 0x1e1b18 })
    );
    apron.rotation.x = -Math.PI / 2;
    apron.position.y = -0.55;
    this.arenaGroup.add(apron);

    // Subtle Center Timber Bridge Deck across KOTH point
    const woodMat = new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.72, metalness: 0.08 });
    const centerDeck = new THREE.Mesh(new THREE.BoxGeometry(14, 0.16, 12), woodMat);
    centerDeck.position.set(0, 0.04, 0);
    centerDeck.receiveShadow = true;
    this.arenaGroup.add(centerDeck);

    // Canyon Perimeter Cliffs
    const cliffTex = getEnvironmentTexture('tf2_sandstone', 10, 2);
    const rockMat = new THREE.MeshStandardMaterial({ map: cliffTex, color: 0xb98b68, roughness: 0.9, metalness: 0.05 });
    const addBox = (x, y, z, w, h, d, colorHex = null, emissiveHex = null, customMap = null) => {
      const mat = (colorHex || customMap)
        ? new THREE.MeshPhysicalMaterial({
            color: colorHex || 0xffffff,
            map: customMap || woodTex,
            emissive: emissiveHex || 0x000000,
            emissiveIntensity: emissiveHex ? 0.18 : 0,
            roughness: 0.62,
            metalness: 0.22,
            clearcoat: 0.15
          })
        : rockMat;
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.position.set(x, y, z);
      m.castShadow = !this.isSoftwareGl;
      m.receiveShadow = true;
      this.arenaGroup.add(m);
      this.colliders.push({ minX: x - w / 2, maxX: x + w / 2, minY: y - h / 2, maxY: y + h / 2, minZ: z - d / 2, maxZ: z + d / 2 });
      return m;
    };

    // Perimeter Canyon Cliffs
    addBox(0, 5.5, -34, 114, 11, 4);
    addBox(0, 5.5, 34, 114, 11, 4);
    addBox(-52, 5.5, 0, 4, 11, 72);
    addBox(52, 5.5, 0, 4, 11, 72);

    const layout = customLayout || null;
    if (layout && Array.isArray(layout.blocks)) {
      if (layout.skyColor && this.scene) this.scene.background.set(layout.skyColor);
      if (layout.fogColor && this.scene?.fog) this.scene.fog.color.set(layout.fogColor);
      layout.blocks.forEach((b) => {
        const tex = b.team === 'red' ? redWallTex : (b.team === 'blu' ? bluWallTex : (b.kind === 'wood' ? woodTex : null));
        const col = b.team ? 0xffffff : (b.kind === 'wood' ? 0xd4a373 : null);
        addBox(b.x, b.y, b.z, b.w, b.h, b.d, col, null, tex);
      });
    } else {
      // RED Base Fortifications (-44 to -22)
      addBox(-42, 2.5, -18, 9, 5, 11, 0xffffff, null, redWallTex);
      addBox(-42, 2.5, 18, 9, 5, 11, 0xffffff, null, redWallTex);
      addBox(-24, 1.9, -12, 2.2, 3.8, 8, 0xffffff, null, redWallTex);
      addBox(-24, 1.9, 12, 2.2, 3.8, 8, 0xffffff, null, redWallTex);
      addBox(-27, 2.2, -20, 5.0, 0.6, 8, 0xd4a373, null, woodTex);
      addBox(-27, 2.2, 20, 5.0, 0.6, 8, 0xd4a373, null, woodTex);
      addBox(-31, 0.55, -17, 2.4, 1.1, 2.4, 0xd4a373, null, woodTex);
      addBox(-31, 0.55, 17, 2.4, 1.1, 2.4, 0xd4a373, null, woodTex);

      // BLU Base Fortifications (+22 to +44)
      addBox(42, 2.5, -18, 9, 5, 11, 0xffffff, null, bluWallTex);
      addBox(42, 2.5, 18, 9, 5, 11, 0xffffff, null, bluWallTex);
      addBox(24, 1.9, -12, 2.2, 3.8, 8, 0xffffff, null, bluWallTex);
      addBox(24, 1.9, 12, 2.2, 3.8, 8, 0xffffff, null, bluWallTex);
      addBox(27, 2.2, -20, 5.0, 0.6, 8, 0xd4a373, null, woodTex);
      addBox(27, 2.2, 20, 5.0, 0.6, 8, 0xd4a373, null, woodTex);
      addBox(31, 0.55, -17, 2.4, 1.1, 2.4, 0xd4a373, null, woodTex);
      addBox(31, 0.55, 17, 2.4, 1.1, 2.4, 0xd4a373, null, woodTex);

      // Mid-Arena Sandstone Outcrops & Sawmill Timber Cover
      addBox(-11, 2.0, -14, 3.6, 4.0, 3.6);
      addBox(-11, 2.0, 14, 3.6, 4.0, 3.6);
      addBox(11, 2.0, -14, 3.6, 4.0, 3.6);
      addBox(11, 2.0, 14, 3.6, 4.0, 3.6);

      // Central Bridge Deck Timber Pillars
      addBox(-6.5, 1.6, -5.5, 1.4, 3.2, 1.4, 0xd4a373, null, woodTex);
      addBox(-6.5, 1.6, 5.5, 1.4, 3.2, 1.4, 0xd4a373, null, woodTex);
      addBox(6.5, 1.6, -5.5, 1.4, 3.2, 1.4, 0xd4a373, null, woodTex);
      addBox(6.5, 1.6, 5.5, 1.4, 3.2, 1.4, 0xd4a373, null, woodTex);
    }

    // Jump Pads
    const padPositions = (layout?.jumpPads || [[-21, 0], [21, 0], [0, -22], [0, 22]]).map(
      ([px, pz]) => new THREE.Vector3(px, 0.1, pz)
    );
    padPositions.forEach((p) => {
      const mesh = new THREE.Mesh(
        new THREE.CylinderGeometry(1.5, 1.7, 0.22, 16),
        new THREE.MeshBasicMaterial({ color: layout?.accentColor || 0x38bdf8 })
      );
      mesh.position.copy(p);
      this.arenaGroup.add(mesh);
      this.jumpPads.push({ pos: p, radius: 1.65, mesh });
    });

    // KOTH Capture Point Ring
    this.koth.ringMesh = new THREE.Mesh(
      new THREE.RingGeometry(4.2, 4.75, 48),
      new THREE.MeshBasicMaterial({ color: 0x94a3b8, side: THREE.DoubleSide })
    );
    this.koth.ringMesh.rotation.x = -Math.PI / 2;
    this.koth.ringMesh.position.set(0, 0.06, 0);
    this.arenaGroup.add(this.koth.ringMesh);

    // CTF Briefcases
    const buildFlag = (hex, pos) => {
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(0.95, 0.65, 0.35),
        new THREE.MeshPhysicalMaterial({ color: hex, emissive: hex, emissiveIntensity: 0.45, metalness: 0.7, roughness: 0.2 })
      );
      m.position.copy(pos);
      this.arenaGroup.add(m);
      return m;
    };
    this.flags.red.mesh = buildFlag(0xef4444, this.flags.red.pos);
    this.flags.blu.mesh = buildFlag(0x38bdf8, this.flags.blu.pos);

    // Health & Ammo Pickups
    const pickupDefs = layout?.pickups || [
      { type: 'health', x: -16, z: -20 },
      { type: 'health', x: 16, z: 20 },
      { type: 'health', x: 0, z: 18 },
      { type: 'health', x: 0, z: -18 },
      { type: 'ammo', x: -16, z: 20 },
      { type: 'ammo', x: 16, z: -20 }
    ];
    pickupDefs.forEach((d) => {
      const mesh = new THREE.Mesh(
        d.type === 'health' ? new THREE.BoxGeometry(0.75, 0.55, 0.75) : new THREE.CylinderGeometry(0.42, 0.42, 0.65, 10),
        new THREE.MeshStandardMaterial({
          color: d.type === 'health' ? 0x22c55e : 0xf59e0b,
          emissive: d.type === 'health' ? 0x16a34a : 0xb45309,
          emissiveIntensity: 0.45
        })
      );
      mesh.position.set(d.x, 0.75, d.z);
      this.arenaGroup.add(mesh);
      this.pickups.push({ type: d.type, pos: new THREE.Vector3(d.x, 0.75, d.z), cooldown: 0, mesh });
    });
  }

  rebuildCustomArena(layout) {
    this.activeLayout = layout;
    if (!this.glReady) return false;
    this.buildArena(layout);
    if (this.player) {
      this.player.pos.y = Math.max(this.player.pos.y, 1.0);
    }
    this.pushKillfeed('LEVEL FORGE', layout.name || 'Custom Map', this.playerTeam, 'Map Deployed');
    return true;
  }

  applyThoughtMutation(mut = {}) {
    if (typeof mut.gravity === 'number') this.worldGravity = THREE.MathUtils.clamp(mut.gravity, 6, 58);
    if (typeof mut.speedMult === 'number') this.speedMult = THREE.MathUtils.clamp(mut.speedMult, 0.45, 2.4);
    if (typeof mut.fireRateMult === 'number') this.fireRateMult = THREE.MathUtils.clamp(mut.fireRateMult, 0.4, 3.0);
    if (typeof mut.damageMult === 'number') this.dmgMult = THREE.MathUtils.clamp(mut.damageMult, 0.4, 3.5);
    if (typeof mut.timeScale === 'number') this.timeScale = THREE.MathUtils.clamp(mut.timeScale, 0.35, 1.85);
    if (typeof mut.infiniteJumps === 'boolean') this.infiniteJumps = mut.infiniteJumps;

    if (this.glReady && this.scene) {
      if (mut.skyColor) this.scene.background.set(mut.skyColor);
      if (mut.fogColor && this.scene.fog) this.scene.fog.color.set(mut.fogColor);
      if (typeof mut.fogDensity === 'number' && this.scene.fog) {
        this.scene.fog.density = THREE.MathUtils.clamp(mut.fogDensity, 0.002, 0.032);
      }
      if (mut.keyColor && this.key) this.key.color.set(mut.keyColor);
      if (mut.rimColor && this.rim) this.rim.color.set(mut.rimColor);
    }
    if (mut.title) {
      this.pushKillfeed('THOUGHT CLOUD', mut.title, this.playerTeam, 'Reality Shift');
    }
  }

  /**
   * Connected to Liquid CAD & Semantic Synthesizer!
   * Mounts the live OS 3D CAD assembly directly onto the central bridge platform.
   */
  setCenterMonument(assembly) {
    if (!assembly) return;
    this.pendingMonument = assembly;
    if (!this.glReady || !this.monumentAnchor) return;
    if (this.monumentGroup) {
      this.monumentAnchor.remove(this.monumentGroup);
      daemonSupervisor.disposeObject3D(this.monumentGroup);
    }
    const sb = daemonSupervisor.daemons.shaderBridge;
    this.monumentGroup = buildAssemblyGroup(assembly, {
      detail: 18,
      metalnessOffset: sb.enabled ? sb.state.metalnessOffset : 0,
      roughnessOffset: sb.enabled ? sb.state.roughnessOffset : 0
    });
    this.monumentGroup.scale.set(0.62, 0.62, 0.62);
    this.monumentAnchor.add(this.monumentGroup);
  }

  /**
   * Connected to World Forge, Shader Lab, Sonic Synth & CAD!
   */
  syncFromOS() {
    if (this.worldForgeApp?.params?.gravity) {
      this.worldGravity = THREE.MathUtils.clamp(this.worldForgeApp.params.gravity * 0.85, 22, 48);
    }
    if (!this.glReady || !this.scene) return;
    // 1. Center CAD Monument
    if (this.cadApp?.currentAssembly && !this.monumentGroup) {
      this.setCenterMonument(this.cadApp.currentAssembly);
    }

    // 2. Shader Lab + Hybrid Scene
    const sc = hybridScene.config;
    if (sc && this.rim) {
      this.scene.background.set(sc.bgColor || '#050912');
      this.scene.fog.color.set(sc.fogColor || '#050912');
      this.scene.fog.density = Math.max(0.004, Math.min(0.02, (sc.fogDensity || 0.015) * 0.55));
      this.rim.color.set(sc.rimColor || '#38bdf8');
    }

    this.rebuildViewmodel();
  }

  applyMultiplierSettings({ botsPerTeam, hpMult, dmgMult }) {
    if (typeof botsPerTeam === 'number') this.botsPerTeam = Math.max(1, Math.min(6, Math.round(botsPerTeam)));
    if (typeof hpMult === 'number') this.hpMult = THREE.MathUtils.clamp(hpMult, 0.5, 4.0);
    if (typeof dmgMult === 'number') this.dmgMult = THREE.MathUtils.clamp(dmgMult, 0.5, 4.0);
    if (this.state === 'PLAYING') {
      this.spawnBots();
    }
  }

  setMode(mode) {
    this.mode = ['koth', 'ctf', 'tdm'].includes(mode) ? mode : 'koth';
  }

  setSkin(skinId) {
    if (TF_SKINS[skinId]) {
      this.skinId = skinId;
      this.rebuildViewmodel();
      this.bots.forEach((b) => this.rebuildBotMesh(b));
    }
  }

  setCustomSkinColors(colors) {
    this.customSkinColors = colors || null;
    this.rebuildViewmodel();
    this.bots.forEach((b) => this.rebuildBotMesh(b));
  }

  setPlayerClass(classId) {
    if (!TF_CLASSES[classId]) return;
    this.playerClassId = classId;
    const cls = TF_CLASSES[classId];
    this.player.maxHp = Math.round(cls.hp * this.hpMult);
    this.player.hp = this.player.maxHp;
    this.player.maxAmmo = cls.clipSize;
    this.player.ammo = cls.clipSize;
    this.player.reloadTimer = 0;
    this.player.scoped = false;
    this.player.cloakTimer = 0;
    this.camera.fov = 74;
    this.camera.updateProjectionMatrix();
    this.rebuildViewmodel();
  }

  rebuildViewmodel() {
    while (this.player.viewmodelPivot.children.length) {
      const ch = this.player.viewmodelPivot.children[0];
      this.player.viewmodelPivot.remove(ch);
      daemonSupervisor.disposeObject3D(ch);
    }
    const cls = TF_CLASSES[this.playerClassId] || TF_CLASSES.soldier;
    const skin = TF_SKINS[this.skinId] || TF_SKINS.standard;
    const accentHex = this.customSkinColors?.accent || (this.playerTeam === 'red' ? 0xef4444 : 0x38bdf8);
    const bodyHex = this.customSkinColors?.primary || (this.playerTeam === 'red' ? skin.redBody : skin.bluBody);
    const trimMat = new THREE.MeshPhysicalMaterial({
      color: accentHex,
      emissive: this.playerTeam === 'red' ? 0x991b1b : 0x0284c7,
      emissiveIntensity: 0.35 + skin.emissiveBoost,
      metalness: skin.metalness,
      roughness: skin.roughness
    });
    const bodyMat = new THREE.MeshPhysicalMaterial({
      color: bodyHex,
      metalness: skin.metalness,
      roughness: skin.roughness,
      clearcoat: skin.clearcoat
    });
    const vm = buildWeaponMesh(cls, trimMat, bodyMat, this.skinId, true);
    vm.position.set(0.32, -0.26, -0.58);
    vm.rotation.y = Math.PI;
    this.player.viewmodelMesh = vm;
    this.player.viewmodelPivot.add(vm);
  }

  startMatch(mode = this.mode) {
    if (!this.ensureGl()) return;
    this.setMode(mode);
    this.state = 'PLAYING';
    this.scores = { red: 0, blu: 0, winTarget: this.mode === 'ctf' ? 3 : 25 };
    this.koth.owner = 'neutral';
    this.koth.progress = 0;
    this.koth.redTime = 75;
    this.koth.bluTime = 75;
    this.killfeed = [];

    // Clear sentries & projectiles
    this.sentries.forEach((s) => {
      this.scene.remove(s.mesh);
      daemonSupervisor.disposeObject3D(s.mesh);
    });
    this.sentries = [];
    this.projectiles.forEach((p) => this.scene.remove(p.mesh));
    this.projectiles = [];

    // Reset flags
    ['red', 'blu'].forEach((t) => {
      this.flags[t].carrier = null;
      this.flags[t].pos.copy(this.flags[t].home);
      if (this.flags[t].mesh) this.flags[t].mesh.position.copy(this.flags[t].home);
    });

    this.player.kills = 0;
    this.player.deaths = 0;
    this.respawnPlayer();
    this.spawnBots();
    this.syncFromOS();
    this.audio.ensureCtx();
  }

  respawnPlayer() {
    const cls = TF_CLASSES[this.playerClassId];
    const dir = this.playerTeam === 'red' ? -1 : 1;
    // Open courtyard spawn with clear forward sightline down center bridge
    this.player.pos.set(dir * 38, 0.25, (Math.random() - 0.5) * 10);
    this.player.vel.set(0, 0, 0);
    this.player.yaw = this.playerTeam === 'red' ? -Math.PI / 2 : Math.PI / 2;
    this.player.pitch = 0;
    this.player.maxHp = Math.round(cls.hp * this.hpMult);
    this.player.hp = this.player.maxHp;
    this.player.maxAmmo = cls.clipSize;
    this.player.ammo = cls.clipSize;
    this.player.respawnTimer = 0;
    this.player.uberTimer = 0;
    this.player.cloakTimer = 0;
    this.player.scoped = false;
  }

  spawnBots() {
    this.bots.forEach((b) => {
      this.scene.remove(b.mesh);
      daemonSupervisor.disposeObject3D(b.mesh);
    });
    this.bots = [];

    const roster = ['scout', 'soldier', 'pyro', 'demoman', 'heavy', 'engineer', 'medic', 'sniper', 'spy'];
    ['red', 'blu'].forEach((team) => {
      const count = team === this.playerTeam ? Math.max(0, this.botsPerTeam - 1) : this.botsPerTeam;
      for (let i = 0; i < count; i++) {
        const classId = roster[(i + (team === 'blu' ? 1 : 0)) % roster.length];
        const cls = TF_CLASSES[classId];
        const bot = {
          id: `${team}_${classId}_${i}`,
          name: `${team.toUpperCase()} ${cls.name}`,
          team,
          classId,
          hp: Math.round(cls.hp * this.hpMult),
          maxHp: Math.round(cls.hp * this.hpMult),
          pos: new THREE.Vector3(),
          vel: new THREE.Vector3(),
          yaw: team === 'red' ? -Math.PI / 2 : Math.PI / 2,
          fireTimer: 0.4 + Math.random() * 0.6,
          respawnTimer: 0,
          burnTimer: 0,
          strafeDir: i % 2 === 0 ? 1 : -1,
          strafeTimer: 1.5,
          gaitPhase: Math.random() * Math.PI * 2,
          mesh: null
        };
        this.placeSpawn(bot);
        this.rebuildBotMesh(bot);
        this.bots.push(bot);
      }
    });
  }

  rebuildBotMesh(bot) {
    if (bot.mesh) {
      this.scene.remove(bot.mesh);
      daemonSupervisor.disposeObject3D(bot.mesh);
    }
    const sb = daemonSupervisor.daemons.shaderBridge;
    bot.mesh = buildClassRig(bot.classId, bot.team, this.skinId, sb.enabled ? sb.state : null, this.customSkinColors);
    bot.mesh.position.copy(bot.pos);
    bot.mesh.visible = bot.respawnTimer <= 0;
    this.scene.add(bot.mesh);
  }

  placeSpawn(entity) {
    const side = entity.team === 'red' ? -1 : 1;
    entity.pos.set(side * (30 + Math.random() * 6), 0.3, (Math.random() - 0.5) * 18);
    entity.vel.set(0, 0, 0);
  }

  pushKillfeed(killerName, victimName, killerTeam, weapon) {
    this.killfeed.unshift({ killerName, victimName, killerTeam, weapon, time: 5.5 });
    if (this.killfeed.length > 5) this.killfeed.length = 5;
  }

  /**
   * Primary Attack Logic (Hitscan, Rockets, Grenades, Flames, Medic Beam, Spy Backstab)
   */
  firePlayerWeapon() {
    if (this.state !== 'PLAYING' || this.player.respawnTimer > 0) return;
    const p = this.player;
    const cls = TF_CLASSES[this.playerClassId];
    if (p.fireTimer > 0 || p.reloadTimer > 0) return;
    if (p.ammo <= 0) {
      this.triggerReload();
      return;
    }

    p.ammo--;
    p.fireTimer = cls.fireRate / Math.max(0.4, this.fireRateMult || 1);
    p.recoilOffset = 0.12;
    p.cloakTimer = 0; // Firing breaks Spy cloak

    const forward = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(p.pitch, p.yaw, 0, 'YXZ')).normalize();
    const origin = this.camera.position.clone().addScaledVector(forward, 0.7);
    const dmgScale = this.dmgMult * (cls.id === 'sniper' && p.scoped ? 1.5 : 1.0);

    if (cls.weaponType === 'rocket' || cls.weaponType === 'grenade' || cls.weaponType === 'flame' || cls.weaponType === 'syringe') {
      this.audio.play(cls.weaponType === 'flame' ? 'flame' : cls.weaponType === 'grenade' ? 'grenade' : cls.weaponType === 'syringe' ? 'syringe' : 'rocket');
      const fireHex = daemonSupervisor.daemons.audioBeatSync.enabled
        ? daemonSupervisor.daemons.audioBeatSync.fireColor
        : '#f97316';
      this.spawnProjectile({
        owner: this.player,
        ownerName: `YOU (${cls.name})`,
        team: this.playerTeam,
        kind: cls.weaponType,
        pos: origin.clone(),
        vel: forward.clone().multiplyScalar(cls.projectileSpeed || 26),
        damage: cls.damage * dmgScale,
        splashRadius: cls.splashRadius || 0,
        color: cls.weaponType === 'flame' ? '#fb923c' : fireHex,
        life: cls.weaponType === 'flame' ? 0.42 : (cls.weaponType === 'grenade' ? 2.1 : 3.2)
      });
    } else {
      // Hitscan (Scattergun, Shotgun, Minigun, Sniper, Revolver)
      this.audio.play(cls.weaponType === 'minigun' ? 'minigun' : cls.weaponType === 'sniper' ? 'sniper' : cls.weaponType === 'revolver' ? 'revolver' : 'scattergun');

      // Spy Backstab check if very close behind an enemy
      if (cls.id === 'spy') {
        const victim = this.findMeleeBackstab(origin, forward);
        if (victim) {
          this.audio.play('backstab');
          this.applyDamageToBot(victim, 350, this.player, `YOU (${cls.name})`, 'Backstab Crit');
          return;
        }
      }

      const pellets = cls.pellets || 1;
      for (let i = 0; i < pellets; i++) {
        const dir = forward.clone();
        dir.x += (Math.random() - 0.5) * (cls.spread || 0);
        dir.y += (Math.random() - 0.5) * (cls.spread || 0);
        dir.z += (Math.random() - 0.5) * (cls.spread || 0);
        dir.normalize();
        this.performHitscan(origin, dir, cls.damage * dmgScale, this.playerTeam, `YOU (${cls.name})`, cls.weaponName, cls.id === 'sniper' && p.scoped);
      }

      // Medic also heals nearby allies when shooting!
      if (cls.id === 'medic') {
        this.bots.forEach((b) => {
          if (b.team === this.playerTeam && b.respawnTimer <= 0 && b.pos.distanceTo(p.pos) < 12) {
            b.hp = Math.min(b.maxHp, b.hp + 18);
          }
        });
      }
    }

    daemonSupervisor.triggerHaptic(8);
    if (p.ammo <= 0) this.triggerReload();
  }

  findMeleeBackstab(origin, forward) {
    for (const bot of this.bots) {
      if (bot.team === this.playerTeam || bot.respawnTimer > 0) continue;
      const toBot = bot.pos.clone().setY(origin.y).sub(origin);
      if (toBot.length() < 3.4) {
        const botForward = new THREE.Vector3(Math.sin(bot.yaw), 0, Math.cos(bot.yaw));
        if (botForward.dot(forward) > 0.35) return bot;
      }
    }
    return null;
  }

  performHitscan(origin, dir, baseDmg, team, attackerName, weaponName, canHeadshot = false) {
    let bestT = 95;
    let hitBot = null;
    let hitSentry = null;
    let isHeadshot = false;

    // Wall occlusion distance
    for (const c of this.colliders) {
      const t = this.rayBoxDist(origin, dir, c);
      if (t > 0 && t < bestT) bestT = t;
    }

    // Bots
    for (const bot of this.bots) {
      if (bot.team === team || bot.respawnTimer > 0) continue;
      const bodyCenter = new THREE.Vector3(bot.pos.x, bot.pos.y + 1.05, bot.pos.z);
      const t = this.raySphereDist(origin, dir, bodyCenter, 0.78);
      if (t > 0 && t < bestT) {
        bestT = t;
        hitBot = bot;
        hitSentry = null;
        if (canHeadshot) {
          const hitPt = origin.clone().addScaledVector(dir, t);
          isHeadshot = hitPt.y >= bot.pos.y + 1.48;
        }
      }
    }

    // Enemy Sentries
    for (const s of this.sentries) {
      if (s.team === team) continue;
      const t = this.raySphereDist(origin, dir, s.pos.clone().add(new THREE.Vector3(0, 0.7, 0)), 0.85);
      if (t > 0 && t < bestT) {
        bestT = t;
        hitSentry = s;
        hitBot = null;
      }
    }

    const endPt = origin.clone().addScaledVector(dir, bestT);
    this.spawnTracer(origin, endPt, team === 'red' ? 0xf87171 : 0x38bdf8);

    if (hitBot) {
      const finalDmg = isHeadshot ? baseDmg * 2.5 : baseDmg;
      this.applyDamageToBot(hitBot, finalDmg, attackerName === `YOU (${TF_CLASSES[this.playerClassId].name})` ? this.player : null, attackerName, isHeadshot ? 'Headshot Crit' : weaponName, isHeadshot);
    } else if (hitSentry) {
      hitSentry.hp -= baseDmg;
      this.audio.play('hit_ding');
      if (hitSentry.hp <= 0) {
        this.destroySentry(hitSentry);
      }
    } else if (team !== this.playerTeam && this.player.respawnTimer <= 0 && this.player.uberTimer <= 0) {
      const pCenter = this.player.pos.clone().add(new THREE.Vector3(0, 1.0, 0));
      const tp = this.raySphereDist(origin, dir, pCenter, 0.65);
      if (tp > 0 && tp < bestT) {
        this.applyDamageToPlayer(baseDmg, attackerName, team, weaponName);
      }
    }
  }

  triggerSpecialAbility() {
    if (this.state !== 'PLAYING' || this.player.respawnTimer > 0) return;
    const p = this.player;
    const cls = TF_CLASSES[this.playerClassId];
    if (p.specialTimer > 0) return;
    p.specialTimer = cls.specialCooldown;

    const forward = new THREE.Vector3(-Math.sin(p.yaw), 0, -Math.cos(p.yaw)).normalize();

    switch (cls.id) {
      case 'scout':
        p.vel.addScaledVector(forward, 19);
        p.vel.y = Math.max(p.vel.y, 7.5);
        this.audio.play('jump');
        break;
      case 'soldier':
        // Direct upward + forward Rocket Jump!
        p.vel.y = 16.5;
        p.vel.addScaledVector(forward, 13.5);
        this.audio.play('explosion');
        this.spawnExplosion(p.pos.clone(), 3.8, this.playerTeam, this.player, 'Rocket Jump', 45, true);
        break;
      case 'pyro': {
        this.audio.play('airblast');
        const fwd = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(p.pitch, p.yaw, 0, 'YXZ')).normalize();
        daemonSupervisor.filterVortexCatch(this.projectiles, this.camera.position, fwd, this.playerTeam, 9.5);
        this.bots.forEach((b) => {
          if (b.team !== this.playerTeam && b.pos.distanceTo(p.pos) < 8.5) {
            const push = b.pos.clone().sub(p.pos).normalize();
            b.vel.addScaledVector(push, 18);
            b.vel.y = 7.5;
          }
        });
        break;
      }
      case 'demoman':
        // Fire 3-round cluster spread
        for (let k = -1; k <= 1; k++) {
          const dir = forward.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), k * 0.22);
          dir.y = 0.28;
          this.spawnProjectile({
            owner: this.player, ownerName: 'YOU (Demoman)', team: this.playerTeam,
            kind: 'grenade', pos: p.pos.clone().add(new THREE.Vector3(0, 1.35, 0)),
            vel: dir.normalize().multiplyScalar(22), damage: 85 * this.dmgMult, splashRadius: 4.5, color: '#f59e0b', life: 1.8
          });
        }
        this.audio.play('grenade');
        break;
      case 'heavy':
        p.hp = Math.min(p.maxHp, p.hp + 135);
        this.audio.play('cap_point');
        break;
      case 'engineer':
        this.deploySentry(this.playerTeam, p.pos.clone().addScaledVector(forward, 2.2));
        this.audio.play('sentry_beep');
        break;
      case 'medic':
        p.uberTimer = 5.5;
        p.hp = p.maxHp;
        this.audio.play('uber');
        break;
      case 'sniper':
        p.scoped = !p.scoped;
        this.camera.fov = p.scoped ? 32 : 74;
        this.camera.updateProjectionMatrix();
        break;
      case 'spy':
        p.cloakTimer = 5.0;
        this.audio.play('airblast');
        break;
      default:
        break;
    }
  }

  deploySentry(team, pos) {
    // Max 1 player sentry active (rebuild cleanly)
    const existing = this.sentries.find((s) => s.team === team && s.isPlayerOwned);
    if (existing) this.destroySentry(existing);

    const mesh = buildSentryRig(team, this.skinId);
    pos.y = 0;
    mesh.position.copy(pos);
    this.scene.add(mesh);
    this.sentries.push({
      team,
      isPlayerOwned: true,
      pos: pos.clone(),
      hp: 180 * this.hpMult,
      fireTimer: 0.25,
      beepTimer: 0.8,
      mesh
    });
  }

  destroySentry(s) {
    this.scene.remove(s.mesh);
    daemonSupervisor.disposeObject3D(s.mesh);
    const idx = this.sentries.indexOf(s);
    if (idx !== -1) this.sentries.splice(idx, 1);
    this.audio.play('explosion');
  }

  triggerReload() {
    if (this.player.reloadTimer > 0) return;
    if (this.player.ammo >= this.player.maxAmmo) return;
    this.player.reloadTimer = TF_CLASSES[this.playerClassId].reloadTime;
  }

  spawnProjectile(cfg) {
    const geo = cfg.kind === 'flame'
      ? new THREE.SphereGeometry(0.28, 6, 6)
      : (cfg.kind === 'grenade' ? new THREE.SphereGeometry(0.22, 8, 8) : new THREE.CylinderGeometry(0.11, 0.11, 0.55, 8));
    const mat = new THREE.MeshBasicMaterial({ color: cfg.color || '#f97316' });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(cfg.pos);
    if (cfg.kind === 'rocket') mesh.rotation.x = Math.PI / 2;
    this.scene.add(mesh);
    this.projectiles.push({ ...cfg, mesh });
  }

  spawnTracer(start, end, hex) {
    const geo = new THREE.BufferGeometry().setFromPoints([start, end]);
    const mat = new THREE.LineBasicMaterial({ color: hex, transparent: true, opacity: 0.85 });
    const line = new THREE.Line(geo, mat);
    this.scene.add(line);
    this.particles.push({ mesh: line, vel: new THREE.Vector3(), life: 0.08, maxLife: 0.08, isLine: true });
  }

  spawnExplosion(pos, radius, team, ownerRef, weaponName, damage, selfImmune = false) {
    this.audio.play('explosion');
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(radius * 0.45, 12, 10),
      new THREE.MeshBasicMaterial({ color: '#f97316', transparent: true, opacity: 0.72 })
    );
    sphere.position.copy(pos);
    this.scene.add(sphere);
    this.particles.push({ mesh: sphere, vel: new THREE.Vector3(0, 0.5, 0), life: 0.25, maxLife: 0.25, grow: true });

    // Splash enemies
    this.bots.forEach((b) => {
      if (b.team === team || b.respawnTimer > 0) return;
      const dist = b.pos.distanceTo(pos);
      if (dist <= radius) {
        const falloff = 1 - (dist / radius) * 0.65;
        const push = b.pos.clone().sub(pos).normalize();
        b.vel.addScaledVector(push, 11 * falloff);
        b.vel.y += 5 * falloff;
        this.applyDamageToBot(b, damage * falloff, ownerRef === this.player ? this.player : null, ownerRef === this.player ? `YOU` : `${team.toUpperCase()}`, weaponName);
      }
    });

    // True TF2 Rocket-Jump / Blast impulse when owner shoots near feet!
    if (ownerRef === this.player) {
      const selfDist = this.player.pos.distanceTo(pos);
      if (selfDist < radius * 1.15) {
        const push = this.player.pos.clone().add(new THREE.Vector3(0, 0.85, 0)).sub(pos).normalize();
        const strength = (1 - selfDist / (radius * 1.15)) * 16.5;
        this.player.vel.addScaledVector(push, strength);
        this.player.vel.y = Math.max(this.player.vel.y, 11.5);
        this.player.grounded = false;
      }
    }

    if (!selfImmune && team !== this.playerTeam && this.player.respawnTimer <= 0 && this.player.uberTimer <= 0) {
      const dist = this.player.pos.distanceTo(pos);
      if (dist <= radius) {
        const falloff = 1 - (dist / radius) * 0.65;
        this.applyDamageToPlayer(damage * falloff, team.toUpperCase(), team, weaponName);
      }
    }
  }

  applyDamageToBot(bot, dmg, playerOwner, attackerName, weaponName, isCrit = false) {
    if (bot.respawnTimer > 0) return;
    bot.hp -= dmg;
    if (playerOwner) {
      this.player.hitmarkerTimer = 0.16;
      this.audio.play(isCrit ? 'crit_ding' : 'hit_ding');
    }
    if (bot.hp <= 0) {
      bot.respawnTimer = 4.0;
      bot.mesh.visible = false;
      this.scores[bot.team === 'red' ? 'blu' : 'red']++;
      if (playerOwner) this.player.kills++;
      this.pushKillfeed(attackerName, bot.name, bot.team === 'red' ? 'blu' : 'red', weaponName);

      // Drop carried flag if any
      ['red', 'blu'].forEach((t) => {
        if (this.flags[t].carrier === bot) {
          this.flags[t].carrier = null;
          this.flags[t].pos.copy(bot.pos).setY(1.0);
        }
      });
      this.checkWinCondition();
    }
  }

  applyDamageToPlayer(dmg, attackerName, attackerTeam, weaponName) {
    if (this.player.uberTimer > 0 || this.player.respawnTimer > 0) return;
    this.player.hp -= dmg;
    if (this.player.hp <= 0) {
      this.player.hp = 0;
      this.player.deaths++;
      this.player.respawnTimer = 3.5;
      this.scores[attackerTeam]++;
      this.pushKillfeed(attackerName, 'YOU', attackerTeam, weaponName);
      ['red', 'blu'].forEach((t) => {
        if (this.flags[t].carrier === this.player) {
          this.flags[t].carrier = null;
          this.flags[t].pos.copy(this.player.pos).setY(1.0);
        }
      });
      this.checkWinCondition();
    }
  }

  checkWinCondition() {
    if (this.state !== 'PLAYING') return;
    let winner = null;
    if (this.mode === 'koth') {
      if (this.koth.redTime <= 0) winner = 'RED';
      else if (this.koth.bluTime <= 0) winner = 'BLU';
    } else if (this.scores.red >= this.scores.winTarget) {
      winner = 'RED';
    } else if (this.scores.blu >= this.scores.winTarget) {
      winner = 'BLU';
    }
    if (winner) {
      this.state = 'VICTORY';
      this.audio.play('cap_point');
      if (this.dataVault) {
        this.dataVault.addRecord('fortress_match', `${winner} Won (${this.mode.toUpperCase()})`, {
          mode: this.mode,
          winner,
          redScore: this.scores.red,
          bluScore: this.scores.blu,
          playerClass: this.playerClassId,
          skin: this.skinId,
          kills: this.player.kills,
          deaths: this.player.deaths
        });
      }
      logGuardEvent('Team Fortress 3D', 'ok', `${winner} Victory recorded to Data Vault`, false);
      if (this.onMatchEnd) this.onMatchEnd(winner);
    }
  }

  step(rawDt) {
    const dt = daemonSupervisor.paceDelta(rawDt) * (this.timeScale || 1.0);
    if (this.state !== 'PLAYING') return;

    // Spin central Liquid CAD Monument
    if (this.monumentGroup) {
      this.monumentGroup.rotation.y += dt * 0.45;
      this.monumentGroup.children.forEach((c) => {
        if (c.userData?.spinSpeed) c.rotation.y += c.userData.spinSpeed * dt;
      });
    }

    // Update Pickups spin & collection
    this.pickups.forEach((pk) => {
      pk.mesh.rotation.y += dt * 2.2;
      if (pk.cooldown > 0) {
        pk.cooldown -= dt;
        pk.mesh.visible = pk.cooldown <= 0;
      } else if (this.player.respawnTimer <= 0 && this.player.pos.distanceTo(pk.pos) < 1.8) {
        if (pk.type === 'health' && this.player.hp < this.player.maxHp) {
          this.player.hp = Math.min(this.player.maxHp, this.player.hp + 75);
          pk.cooldown = 7.0;
          pk.mesh.visible = false;
          this.audio.play('cap_point', 0.5);
        } else if (pk.type === 'ammo' && this.player.ammo < this.player.maxAmmo) {
          this.player.ammo = this.player.maxAmmo;
          pk.cooldown = 6.0;
          pk.mesh.visible = false;
          this.audio.play('sentry_beep', 0.8);
        }
      }
    });

    this.stepPlayer(dt);
    this.stepBots(dt);
    this.stepSentries(dt);
    this.stepProjectiles(dt);
    this.stepObjectives(dt);
    this.stepParticles(dt);

    if (this.onHudUpdate) this.onHudUpdate(this.getHudSnapshot());
  }

  stepPlayer(dt) {
    const p = this.player;
    const cls = TF_CLASSES[this.playerClassId];

    if (p.respawnTimer > 0) {
      p.respawnTimer -= dt;
      if (p.respawnTimer <= 0) this.respawnPlayer();
      return;
    }

    p.fireTimer = Math.max(0, p.fireTimer - dt);
    p.specialTimer = Math.max(0, p.specialTimer - dt);
    p.uberTimer = Math.max(0, p.uberTimer - dt);
    p.cloakTimer = Math.max(0, p.cloakTimer - dt);
    p.hitmarkerTimer = Math.max(0, p.hitmarkerTimer - dt);

    if (cls.id === 'medic') p.hp = Math.min(p.maxHp, p.hp + dt * 4.5);

    if (p.reloadTimer > 0) {
      p.reloadTimer -= dt;
      if (p.reloadTimer <= 0) p.ammo = p.maxAmmo;
    }

    // Look via Mouse Drag / PointerLock OR Right Thumbstick
    const lookSensitivity = p.scoped ? 0.0014 : 0.0028;
    p.yaw -= this.input.lookDeltaX * lookSensitivity;
    p.pitch -= this.input.lookDeltaY * lookSensitivity;
    this.input.lookDeltaX = 0;
    this.input.lookDeltaY = 0;

    if (this.input.stickAimActive) {
      p.yaw -= this.input.stickAimX * dt * 2.35;
      p.pitch -= this.input.stickAimY * dt * 1.65;
      if (Math.hypot(this.input.stickAimX, this.input.stickAimY) > 0.58) {
        this.firePlayerWeapon();
      }
    }
    p.pitch = THREE.MathUtils.clamp(p.pitch, -1.28, 1.28);

    // Movement vector (Keyboard + Left Analog Thumbstick)
    let moveFwd = (this.input.keys.w ? 1 : 0) - (this.input.keys.s ? 1 : 0) - this.input.stickMoveY;
    let moveRight = (this.input.keys.d ? 1 : 0) - (this.input.keys.a ? 1 : 0) + this.input.stickMoveX;
    const mag = Math.hypot(moveFwd, moveRight);
    if (mag > 1) {
      moveFwd /= mag;
      moveRight /= mag;
    }

    const spd = cls.speed * (p.scoped ? 0.45 : 1.0) * (p.cloakTimer > 0 ? 1.15 : 1.0) * (this.speedMult || 1.0);
    const sinY = Math.sin(p.yaw);
    const cosY = Math.cos(p.yaw);
    const wishDirX = (-sinY * moveFwd + cosY * moveRight);
    const wishDirZ = (-cosY * moveFwd - sinY * moveRight);

    // Source-engine air-strafe & bunnyhop momentum conservation (Daemon 18)
    daemonSupervisor.solveAirStrafe(p.vel, wishDirX, wishDirZ, p.grounded, spd, dt, false);
    p.vel.y -= this.worldGravity * dt;

    this.moveWithColliders(p, dt, 0.52, 1.75);

    // Jump Pads
    this.jumpPads.forEach((jp) => {
      if (p.pos.distanceTo(jp.pos) < jp.radius && p.pos.y < 1.2) {
        p.vel.y = 20.5;
        p.grounded = false;
        this.audio.play('jump');
      }
    });

    // Camera Sync + Viewmodel Bob, Spin & Recoil
    this.camera.position.set(p.pos.x, p.pos.y + 1.58, p.pos.z);
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = p.yaw;
    this.camera.rotation.x = p.pitch;

    p.recoilOffset = THREE.MathUtils.damp(p.recoilOffset, 0, 14, dt);
    p.viewmodelPivot.position.z = p.recoilOffset;
    p.viewmodelPivot.visible = !p.scoped;
    if (p.viewmodelMesh?.userData?.spinner && (this.input.mouseFiring || this.input.keys.fire)) {
      p.viewmodelMesh.userData.spinner.rotation.z += dt * 18;
    }

    if (this.input.mouseFiring || this.input.keys.fire) {
      this.firePlayerWeapon();
    }
  }

  triggerPlayerJump() {
    if (this.state !== 'PLAYING' || this.player.respawnTimer > 0) return;
    const cls = TF_CLASSES[this.playerClassId];
    if (this.player.grounded) {
      this.player.vel.y = 12.6;
      this.player.grounded = false;
      this.player.jumpsLeft = cls.doubleJump ? 1 : 0;
      this.audio.play('jump');
    } else if (this.infiniteJumps || (cls.doubleJump && this.player.jumpsLeft > 0)) {
      this.player.vel.y = 12.2;
      if (!this.infiniteJumps) this.player.jumpsLeft--;
      this.audio.play('jump');
    }
  }

  moveWithColliders(entity, dt, radius, height) {
    entity.pos.x += entity.vel.x * dt;
    this.resolveAxis(entity, 'x', radius, height);
    entity.pos.z += entity.vel.z * dt;
    this.resolveAxis(entity, 'z', radius, height);
    entity.pos.y += entity.vel.y * dt;
    entity.grounded = false;
    if (entity.pos.y <= 0) {
      entity.pos.y = 0;
      entity.vel.y = 0;
      entity.grounded = true;
    } else {
      for (const c of this.colliders) {
        if (
          entity.pos.x + radius > c.minX && entity.pos.x - radius < c.maxX &&
          entity.pos.z + radius > c.minZ && entity.pos.z - radius < c.maxZ
        ) {
          if (entity.pos.y < c.maxY && entity.pos.y + height > c.minY) {
            if (entity.vel.y <= 0 && entity.pos.y >= c.maxY - 0.65) {
              entity.pos.y = c.maxY;
              entity.vel.y = 0;
              entity.grounded = true;
            }
          }
        }
      }
    }
    entity.pos.x = THREE.MathUtils.clamp(entity.pos.x, -49, 49);
    entity.pos.z = THREE.MathUtils.clamp(entity.pos.z, -31, 31);
  }

  resolveAxis(entity, axis, r, h) {
    for (const c of this.colliders) {
      if (entity.pos.y + 0.1 < c.maxY && entity.pos.y + h > c.minY) {
        const hitX = entity.pos.x + r > c.minX && entity.pos.x - r < c.maxX;
        const hitZ = entity.pos.z + r > c.minZ && entity.pos.z - r < c.maxZ;
        if (hitX && hitZ) {
          if (axis === 'x') {
            entity.pos.x = entity.vel.x > 0 ? c.minX - r : c.maxX + r;
            entity.vel.x = 0;
          } else {
            entity.pos.z = entity.vel.z > 0 ? c.minZ - r : c.maxZ + r;
            entity.vel.z = 0;
          }
        }
      }
    }
  }

  stepBots(dt) {
    for (const bot of this.bots) {
      if (bot.respawnTimer > 0) {
        bot.respawnTimer -= dt;
        if (bot.respawnTimer <= 0) {
          bot.hp = bot.maxHp;
          this.placeSpawn(bot);
          bot.mesh.visible = true;
        }
        continue;
      }

      const cls = TF_CLASSES[bot.classId];
      bot.fireTimer = Math.max(0, bot.fireTimer - dt);
      bot.strafeTimer -= dt;
      if (bot.strafeTimer <= 0) {
        bot.strafeDir *= -1;
        bot.strafeTimer = 1.2 + Math.random() * 1.4;
      }

      // Find nearest visible enemy (either another bot or the player if not cloaked)
      let targetPos = null;
      let targetBot = null;
      let bestDist = 42;

      if (bot.team !== this.playerTeam && this.player.respawnTimer <= 0 && this.player.cloakTimer <= 0) {
        const d = bot.pos.distanceTo(this.player.pos);
        if (d < bestDist) {
          bestDist = d;
          targetPos = this.player.pos;
        }
      }
      for (const other of this.bots) {
        if (other.team !== bot.team && other.respawnTimer <= 0) {
          const d = bot.pos.distanceTo(other.pos);
          if (d < bestDist) {
            bestDist = d;
            targetPos = other.pos;
            targetBot = other;
          }
        }
      }

      const moveGoal = targetPos ? targetPos : new THREE.Vector3(0, 0, 0);
      const toGoal = moveGoal.clone().sub(bot.pos);
      const flatDist = Math.hypot(toGoal.x, toGoal.z);
      bot.yaw = Math.atan2(toGoal.x, toGoal.z);

      const preferredDist = cls.id === 'sniper' ? 22 : (cls.id === 'pyro' ? 5.5 : 10.5);
      const dirX = flatDist > 0.1 ? toGoal.x / flatDist : 0;
      const dirZ = flatDist > 0.1 ? toGoal.z / flatDist : 0;
      const forwardMult = flatDist > preferredDist ? 1 : (flatDist < preferredDist * 0.55 ? -0.5 : 0.15);

      const moveSpd = cls.speed * 0.72;
      bot.vel.x = (dirX * forwardMult + (-dirZ) * bot.strafeDir * 0.55) * moveSpd;
      bot.vel.z = (dirZ * forwardMult + dirX * bot.strafeDir * 0.55) * moveSpd;
      bot.vel.y -= this.worldGravity * dt;

      this.moveWithColliders(bot, dt, 0.5, 1.75);
      bot.mesh.position.copy(bot.pos);
      bot.mesh.rotation.y = bot.yaw;

      // Animate bot legs
      const stride = Math.hypot(bot.vel.x, bot.vel.z);
      if (stride > 0.8) {
        bot.gaitPhase += dt * stride * 1.4;
        const swing = Math.sin(bot.gaitPhase) * 0.55;
        bot.mesh.userData.legL.rotation.x = swing;
        bot.mesh.userData.legR.rotation.x = -swing;
      }

      // Bot Combat Firing
      if (targetPos && bot.fireTimer <= 0 && bestDist < (cls.id === 'pyro' ? 10 : 34)) {
        bot.fireTimer = cls.fireRate * (1.35 + Math.random() * 0.6);
        const shootOrigin = bot.pos.clone().add(new THREE.Vector3(0, 1.35, 0));
        const aimDir = targetPos.clone().add(new THREE.Vector3(0, 1.0, 0)).sub(shootOrigin).normalize();

        if (cls.weaponType === 'rocket' || cls.weaponType === 'grenade') {
          this.spawnProjectile({
            owner: bot,
            ownerName: bot.name,
            team: bot.team,
            kind: cls.weaponType,
            pos: shootOrigin.clone().addScaledVector(aimDir, 0.9),
            vel: aimDir.clone().multiplyScalar(21),
            damage: cls.damage * 0.45 * this.dmgMult,
            splashRadius: 3.4,
            color: bot.team === 'red' ? '#ef4444' : '#38bdf8',
            life: 2.5
          });
        } else {
          const hitDmg = Math.min(26, cls.damage * 0.48) * this.dmgMult;
          const accuracySpread = 0.085;
          aimDir.x += (Math.random() - 0.5) * accuracySpread;
          aimDir.z += (Math.random() - 0.5) * accuracySpread;
          aimDir.normalize();
          this.performHitscan(shootOrigin, aimDir, hitDmg, bot.team, bot.name, cls.weaponName, false);
        }
        if (targetBot && targetBot.hp <= 0) {
          // Handled inside applyDamageToBot
        }
      }
    }
  }

  stepSentries(dt) {
    for (const s of this.sentries) {
      s.fireTimer -= dt;
      s.beepTimer -= dt;
      let target = null;
      let bestDist = 26;

      if (s.team !== this.playerTeam && this.player.respawnTimer <= 0 && this.player.cloakTimer <= 0) {
        const d = s.pos.distanceTo(this.player.pos);
        if (d < bestDist) {
          bestDist = d;
          target = this.player.pos;
        }
      }
      for (const b of this.bots) {
        if (b.team !== s.team && b.respawnTimer <= 0) {
          const d = s.pos.distanceTo(b.pos);
          if (d < bestDist) {
            bestDist = d;
            target = b.pos;
          }
        }
      }

      if (target) {
        const yaw = Math.atan2(target.x - s.pos.x, target.z - s.pos.z);
        s.mesh.userData.headPivot.rotation.y = yaw;
        if (s.fireTimer <= 0) {
          s.fireTimer = 0.16;
          this.audio.play('sentry_shoot', 0.6);
          const orig = s.pos.clone().add(new THREE.Vector3(0, 0.95, 0));
          const dir = target.clone().add(new THREE.Vector3(0, 1.0, 0)).sub(orig).normalize();
          this.performHitscan(orig, dir, 14 * this.dmgMult, s.team, `${s.team.toUpperCase()} Sentry`, 'Sentry Gun', false);
        }
      } else {
        s.mesh.userData.headPivot.rotation.y += Math.sin(performance.now() * 0.002) * dt * 1.4;
        if (s.beepTimer <= 0) {
          s.beepTimer = 1.6;
          this.audio.play('sentry_beep', 0.5);
        }
      }
    }
  }

  stepProjectiles(dt) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const pr = this.projectiles[i];
      pr.life -= dt;
      if (pr.kind === 'grenade') pr.vel.y -= this.worldGravity * 0.72 * dt;
      pr.pos.addScaledVector(pr.vel, dt);
      pr.mesh.position.copy(pr.pos);

      let exploded = pr.life <= 0;
      if (pr.pos.y <= 0.1) {
        if (pr.kind === 'grenade') {
          pr.pos.y = 0.12;
          pr.vel.y = Math.abs(pr.vel.y) * 0.58;
          pr.vel.x *= 0.85;
          pr.vel.z *= 0.85;
        } else {
          exploded = true;
        }
      }

      // Check collider hit
      for (const c of this.colliders) {
        if (
          pr.pos.x > c.minX && pr.pos.x < c.maxX &&
          pr.pos.y > c.minY && pr.pos.y < c.maxY &&
          pr.pos.z > c.minZ && pr.pos.z < c.maxZ
        ) {
          if (pr.kind === 'grenade') {
            pr.vel.x *= -0.6;
            pr.vel.z *= -0.6;
          } else {
            exploded = true;
          }
          break;
        }
      }

      // Direct Hit on enemies
      if (!exploded) {
        for (const b of this.bots) {
          if (b.team !== pr.team && b.respawnTimer <= 0 && pr.pos.distanceTo(b.pos.clone().add(new THREE.Vector3(0, 1.0, 0))) < 1.05) {
            if (pr.kind === 'flame' || pr.kind === 'syringe') {
              this.applyDamageToBot(b, pr.damage, pr.owner === this.player ? this.player : null, pr.ownerName, pr.kind);
              exploded = pr.kind === 'syringe';
            } else {
              exploded = true;
            }
            break;
          }
        }
      }

      if (!exploded && pr.team !== this.playerTeam && this.player.respawnTimer <= 0 && this.player.uberTimer <= 0) {
        if (pr.pos.distanceTo(this.player.pos.clone().add(new THREE.Vector3(0, 1.0, 0))) < 0.95) {
          if (pr.kind === 'flame' || pr.kind === 'syringe') {
            this.applyDamageToPlayer(pr.damage, pr.ownerName, pr.team, pr.kind);
            exploded = true;
          } else {
            exploded = true;
          }
        }
      }

      if (exploded) {
        if (pr.splashRadius > 0) {
          this.spawnExplosion(pr.pos, pr.splashRadius, pr.team, pr.owner, pr.kind === 'rocket' ? 'Rocket' : 'Grenade', pr.damage);
        }
        this.scene.remove(pr.mesh);
        this.projectiles.splice(i, 1);
      }
    }
  }

  stepObjectives(dt) {
    if (this.mode === 'koth') {
      const origin = new THREE.Vector3(0, 0, 0);
      let redCount = (this.playerTeam === 'red' && this.player.respawnTimer <= 0 && this.player.pos.distanceTo(origin) < 5.2) ? 1 : 0;
      let bluCount = (this.playerTeam === 'blu' && this.player.respawnTimer <= 0 && this.player.pos.distanceTo(origin) < 5.2) ? 1 : 0;

      this.bots.forEach((b) => {
        if (b.respawnTimer <= 0 && b.pos.distanceTo(origin) < 5.2) {
          if (b.team === 'red') redCount++;
          else bluCount++;
        }
      });

      if (redCount > bluCount) {
        this.koth.progress = Math.min(1, this.koth.progress + dt * 0.45);
        if (this.koth.progress >= 1 && this.koth.owner !== 'red') {
          this.koth.owner = 'red';
          this.audio.play('cap_point');
        }
      } else if (bluCount > redCount) {
        this.koth.progress = Math.max(-1, this.koth.progress - dt * 0.45);
        if (this.koth.progress <= -1 && this.koth.owner !== 'blu') {
          this.koth.owner = 'blu';
          this.audio.play('cap_point');
        }
      }

      if (this.koth.owner === 'red') this.koth.redTime = Math.max(0, this.koth.redTime - dt);
      else if (this.koth.owner === 'blu') this.koth.bluTime = Math.max(0, this.koth.bluTime - dt);

      if (this.koth.ringMesh) {
        this.koth.ringMesh.material.color.set(this.koth.owner === 'red' ? 0xef4444 : (this.koth.owner === 'blu' ? 0x38bdf8 : 0x94a3b8));
      }
      this.checkWinCondition();
    } else if (this.mode === 'ctf') {
      // Carry & Capture Enemy Intel
      const tryFlag = (flagTeam, attackerTeam) => {
        const flag = this.flags[flagTeam];
        const home = this.flags[attackerTeam].home;
        if (!flag.carrier) {
          if (this.player.respawnTimer <= 0 && this.playerTeam === attackerTeam && this.player.pos.distanceTo(flag.pos) < 2.2) {
            flag.carrier = this.player;
            this.audio.play('sentry_beep');
          } else {
            for (const b of this.bots) {
              if (b.respawnTimer <= 0 && b.team === attackerTeam && b.pos.distanceTo(flag.pos) < 2.2) {
                flag.carrier = b;
                break;
              }
            }
          }
        } else {
          const cPos = flag.carrier.pos || this.player.pos;
          flag.pos.set(cPos.x, cPos.y + 2.1, cPos.z);
          if (cPos.distanceTo(home) < 3.2) {
            this.scores[attackerTeam]++;
            flag.carrier = null;
            flag.pos.copy(flag.home);
            this.audio.play('cap_point');
            this.pushKillfeed(`${attackerTeam.toUpperCase()} Team`, `${flagTeam.toUpperCase()} Intel`, attackerTeam, 'CTF Capture');
            this.checkWinCondition();
          }
        }
        if (flag.mesh) {
          flag.mesh.position.copy(flag.pos);
          flag.mesh.rotation.y += dt * 2.0;
        }
      };
      tryFlag('blu', 'red');
      tryFlag('red', 'blu');
    }
  }

  stepParticles(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.life -= dt;
      if (pt.life <= 0) {
        this.scene.remove(pt.mesh);
        if (pt.mesh.geometry) pt.mesh.geometry.dispose();
        if (pt.mesh.material) pt.mesh.material.dispose();
        this.particles.splice(i, 1);
      } else {
        if (pt.grow) {
          const s = 1 + (1 - pt.life / pt.maxLife) * 2.2;
          pt.mesh.scale.set(s, s, s);
          pt.mesh.material.opacity = (pt.life / pt.maxLife) * 0.7;
        }
      }
    }
    this.killfeed.forEach((k) => { k.time -= dt; });
    this.killfeed = this.killfeed.filter((k) => k.time > 0);
  }

  rayBoxDist(orig, dir, box) {
    let tmin = -Infinity;
    let tmax = Infinity;
    const axes = [['x', 'minX', 'maxX'], ['y', 'minY', 'maxY'], ['z', 'minZ', 'maxZ']];
    for (const [a, minK, maxK] of axes) {
      if (Math.abs(dir[a]) < 1e-6) {
        if (orig[a] < box[minK] || orig[a] > box[maxK]) return -1;
      } else {
        const inv = 1 / dir[a];
        let t1 = (box[minK] - orig[a]) * inv;
        let t2 = (box[maxK] - orig[a]) * inv;
        if (t1 > t2) [t1, t2] = [t2, t1];
        tmin = Math.max(tmin, t1);
        tmax = Math.min(tmax, t2);
        if (tmin > tmax) return -1;
      }
    }
    return tmin > 0 ? tmin : -1;
  }

  raySphereDist(orig, dir, center, r) {
    const oc = orig.clone().sub(center);
    const b = oc.dot(dir);
    const c = oc.dot(oc) - r * r;
    const disc = b * b - c;
    if (disc < 0) return -1;
    const t = -b - Math.sqrt(disc);
    return t > 0 ? t : -1;
  }

  getHudSnapshot() {
    const cls = TF_CLASSES[this.playerClassId];
    return {
      hp: Math.ceil(this.player.hp),
      maxHp: this.player.maxHp,
      ammo: this.player.ammo,
      maxAmmo: this.player.maxAmmo,
      reloading: this.player.reloadTimer > 0,
      specialReady: this.player.specialTimer <= 0,
      specialCooldown: Math.ceil(this.player.specialTimer),
      specialName: cls.specialName,
      className: cls.name,
      skinName: TF_SKINS[this.skinId].name,
      kills: this.player.kills,
      deaths: this.player.deaths,
      redScore: this.scores.red,
      bluScore: this.scores.blu,
      kothOwner: this.koth.owner,
      kothRedTime: Math.ceil(this.koth.redTime),
      kothBluTime: Math.ceil(this.koth.bluTime),
      uberActive: this.player.uberTimer > 0,
      cloakActive: this.player.cloakTimer > 0,
      scoped: this.player.scoped,
      hitmarker: this.player.hitmarkerTimer > 0,
      respawnTimer: Math.max(0, Math.ceil(this.player.respawnTimer)),
      killfeed: this.killfeed
    };
  }

  render() {
    if (!this.ensureGl()) return;
    this.renderer.render(this.scene, this.camera);
  }
}
