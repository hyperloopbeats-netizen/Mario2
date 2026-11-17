import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { daemonSupervisor, isSoftwareGlDevice } from './daemons.js';

export const SCENE_BIOMES = {
  obsidian_studio: {
    name: 'Obsidian Studio',
    bgColor: '#03050a',
    fogColor: '#03050a',
    fogDensity: 0.02,
    keyColor: '#fff5e4',
    keyIntensity: 1.65,
    rimColor: '#38bdf8',
    rimIntensity: 1.0,
    gridColor: '#38bdf8',
    sunColorA: '#f59e0b',
    sunColorB: '#ef4444'
  },
  solar_foundry: {
    name: 'Solar Foundry',
    bgColor: '#0a0504',
    fogColor: '#120805',
    fogDensity: 0.024,
    keyColor: '#fed7aa',
    keyIntensity: 1.85,
    rimColor: '#f97316',
    rimIntensity: 1.25,
    gridColor: '#fb923c',
    sunColorA: '#fde047',
    sunColorB: '#dc2626'
  },
  mushroom_twilight: {
    name: 'Mushroom Twilight',
    bgColor: '#050816',
    fogColor: '#09112b',
    fogDensity: 0.018,
    keyColor: '#fef08a',
    keyIntensity: 1.6,
    rimColor: '#ef4444',
    rimIntensity: 1.1,
    gridColor: '#60a5fa',
    sunColorA: '#fbbf24',
    sunColorB: '#ec4899'
  },
  orbital_void: {
    name: 'Orbital Void',
    bgColor: '#020408',
    fogColor: '#030712',
    fogDensity: 0.015,
    keyColor: '#e0f2fe',
    keyIntensity: 1.75,
    rimColor: '#22d3ee',
    rimIntensity: 1.2,
    gridColor: '#22d3ee',
    sunColorA: '#38bdf8',
    sunColorB: '#6366f1'
  },
  arctic_glass: {
    name: 'Arctic Black Glass',
    bgColor: '#04080f',
    fogColor: '#07111e',
    fogDensity: 0.022,
    keyColor: '#ffffff',
    keyIntensity: 1.55,
    rimColor: '#bae6fd',
    rimIntensity: 1.05,
    gridColor: '#93c5fd',
    sunColorA: '#e0f2fe',
    sunColorB: '#0284c7'
  }
};

/**
 * Shared Hybrid Scene Designer state synchronized across Matrix, Video Studio, and Text-to-Movie.
 */
export class HybridSceneSystem {
  constructor() {
    this.config = {
      biome: 'obsidian_studio',
      ...SCENE_BIOMES.obsidian_studio,
      keyElevation: 12,
      gridScale: 1.25,
      sunScale: 1.0,
      sunSpeed: 1.0,
      cadPos: [0, 0],
      marioPos: [0, 1.4],
      promoPos: [3.4, -1.6]
    };
  }

  applyBiome(biomeKey) {
    const preset = SCENE_BIOMES[biomeKey];
    if (!preset) return;
    this.config = {
      ...this.config,
      biome: biomeKey,
      ...preset
    };
    daemonSupervisor.emit('scene-change', { ...this.config });
  }

  applyConfig(partial) {
    if (!partial) return;
    if (partial.biome && SCENE_BIOMES[partial.biome]) {
      Object.assign(this.config, SCENE_BIOMES[partial.biome]);
    }
    Object.assign(this.config, partial);
    daemonSupervisor.emit('scene-change', { ...this.config });
  }
}

export const hybridScene = new HybridSceneSystem();

/**
 * Interactive 3D Hybrid Scene Designer Preview App (#win-scene)
 */
export class HybridSceneApp {
  constructor(canvas) {
    this.canvas = canvas;
    this.isSoftwareGl = isSoftwareGlDevice();
    this.contextLost = false;
    this.active = false;
    this.glReady = false;
    this.glFailed = false;
    this.pendingSize = null;
    this.elapsed = 0;
    this.renderer = null;
    this.scene = null;
    this.controls = null;
    this.camera = new THREE.PerspectiveCamera(45, 16 / 10, 0.1, 140);
    this.camera.position.set(0, 6.5, 11.5);
    this.clock = new THREE.Clock();
    this.rafId = 0;
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
      this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.15;

      this.canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); this.contextLost = true; });
      this.canvas.addEventListener('webglcontextrestored', () => { this.contextLost = false; });

      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(hybridScene.config.bgColor);
      this.scene.fog = new THREE.FogExp2(hybridScene.config.fogColor, hybridScene.config.fogDensity);

      const pmrem = new THREE.PMREMGenerator(this.renderer);
      this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      pmrem.dispose();

      this.controls = new OrbitControls(this.camera, this.canvas);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.07;
      this.controls.target.set(0, 1.8, 0);

      this.hemi = new THREE.HemisphereLight(0x93c5fd, 0x090d16, 0.7);
      this.keyLight = new THREE.DirectionalLight(hybridScene.config.keyColor, hybridScene.config.keyIntensity);
      this.keyLight.position.set(8, hybridScene.config.keyElevation, 10);
      this.rimLight = new THREE.DirectionalLight(hybridScene.config.rimColor, hybridScene.config.rimIntensity);
      this.rimLight.position.set(-8, 6, -8);
      this.scene.add(this.hemi, this.keyLight, this.rimLight);

      const floor = new THREE.Mesh(
        new THREE.CircleGeometry(18, 48),
        new THREE.MeshStandardMaterial({ color: 0x060911, roughness: 0.3, metalness: 0.65 })
      );
      floor.rotation.x = -Math.PI / 2;
      this.scene.add(floor);

      this.grid = new THREE.GridHelper(24, 24, 0x38bdf8, 0x1e293b);
      this.grid.position.y = 0.02;
      this.grid.material.polygonOffset = true;
      this.grid.material.polygonOffsetFactor = -1;
      this.scene.add(this.grid);

      this.cadAnchor = new THREE.Mesh(
        new THREE.CylinderGeometry(1.1, 1.25, 2.2, 24),
        new THREE.MeshPhysicalMaterial({ color: 0x94a3b8, metalness: 0.85, roughness: 0.18, clearcoat: 0.8 })
      );
      this.cadAnchor.position.set(0, 1.1, 0);

      this.sunAnchor = new THREE.Mesh(
        new THREE.SphereGeometry(1.6, 24, 18),
        new THREE.MeshBasicMaterial({ color: 0xf59e0b })
      );
      this.sunAnchor.position.set(0, 4.4, -7.5);

      this.marioAnchor = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.38, 0.9, 6, 14),
        new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.4 })
      );
      this.marioAnchor.position.set(0, 0.85, 1.4);

      this.promoAnchor = new THREE.Mesh(
        new THREE.BoxGeometry(3.2, 1.9, 0.14),
        new THREE.MeshPhysicalMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.15 })
      );
      this.promoAnchor.position.set(3.4, 2.2, -1.6);
      this.promoAnchor.rotation.y = -0.38;

      this.scene.add(this.cadAnchor, this.sunAnchor, this.marioAnchor, this.promoAnchor);
      this.glReady = true;
      this.syncFromConfig();
      if (this.pendingSize) {
        this.resize(this.pendingSize[0], this.pendingSize[1]);
      }
      return true;
    } catch {
      this.glFailed = true;
      return false;
    }
  }

  syncFromConfig() {
    if (!this.glReady || !this.scene) return;
    const c = hybridScene.config;
    this.scene.background.set(c.bgColor);
    this.scene.fog.color.set(c.fogColor);
    this.scene.fog.density = c.fogDensity;
    this.keyLight.color.set(c.keyColor);
    this.keyLight.intensity = c.keyIntensity;
    this.keyLight.position.y = c.keyElevation;
    this.rimLight.color.set(c.rimColor);
    this.rimLight.intensity = c.rimIntensity;
    this.sunAnchor.scale.setScalar(c.sunScale);
    this.sunAnchor.material.color.set(c.sunColorA);
    this.cadAnchor.position.set(c.cadPos[0], 1.1, c.cadPos[1]);
    this.marioAnchor.position.set(c.marioPos[0], 0.85, c.marioPos[1]);
    this.promoAnchor.position.set(c.promoPos[0], 2.2, c.promoPos[1]);
  }

  resize(w, h) {
    if (w < 10 || h < 10) return;
    this.pendingSize = [w, h];
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    if (this.glReady && this.renderer) {
      this.renderer.setSize(w, h, false);
    }
  }

  start() {
    if (this.active || !this.ensureGl()) return;
    this.active = true;
    this.clock.getDelta();
    this.tick();
  }

  stop() {
    this.active = false;
    cancelAnimationFrame(this.rafId);
  }

  tick = () => {
    if (!this.active) return;
    if (!this.contextLost) {
      const dt = daemonSupervisor.paceDelta(this.clock.getDelta(), false);
      this.elapsed += dt;
      this.syncFromConfig();
      this.cadAnchor.rotation.y += dt * 0.65;
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
    }
    if (this.isSoftwareGl) {
      window.setTimeout(() => { if (this.active) this.rafId = requestAnimationFrame(this.tick); }, 65);
    } else {
      this.rafId = requestAnimationFrame(this.tick);
    }
  };
}
