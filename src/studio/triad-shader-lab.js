import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { daemonSupervisor, isSoftwareGlDevice } from './daemons.js';
import { hybridScene } from './hybrid-scene.js';

export const SHADER_PRESETS = {
  obsidian_glass: {
    name: 'Obsidian Black Glass',
    metalnessOffset: 0.15,
    roughnessOffset: -0.18,
    clearcoat: 0.9,
    emissiveBoost: 0.25,
    gridGlow: 1.05,
    rimColor: '#38bdf8',
    gridColor: '#38bdf8',
    sunColorA: '#ef4444',
    sunColorB: '#f59e0b',
    bgColor: '#04060b'
  },
  liquid_mercury: {
    name: 'Liquid Mercury Chrome',
    metalnessOffset: 0.35,
    roughnessOffset: -0.32,
    clearcoat: 1.0,
    emissiveBoost: 0.1,
    gridGlow: 0.9,
    rimColor: '#e2e8f0',
    gridColor: '#94a3b8',
    sunColorA: '#bae6fd',
    sunColorB: '#38bdf8',
    bgColor: '#070b12'
  },
  solar_plasma: {
    name: 'Solar Foundry Plasma',
    metalnessOffset: 0.05,
    roughnessOffset: 0.05,
    clearcoat: 0.55,
    emissiveBoost: 0.85,
    gridGlow: 1.45,
    rimColor: '#fb923c',
    gridColor: '#f97316',
    sunColorA: '#ef4444',
    sunColorB: '#fde047',
    bgColor: '#0c0503'
  },
  cryo_sapphire: {
    name: 'Cryo Sapphire Core',
    metalnessOffset: 0.2,
    roughnessOffset: -0.22,
    clearcoat: 0.85,
    emissiveBoost: 0.45,
    gridGlow: 1.35,
    rimColor: '#22d3ee',
    gridColor: '#38bdf8',
    sunColorA: '#2563eb',
    sunColorB: '#22d3ee',
    bgColor: '#020914'
  }
};

export class ShaderLabApp {
  constructor(canvas) {
    this.canvas = canvas;
    this.running = false;
    this.rafId = null;
    this.elapsed = 0;
    this.glReady = false;
    this.glFailed = false;
    this.pendingSize = null;
    this.renderer = null;
    this.scene = null;
    this.camera = new THREE.PerspectiveCamera(42, 16 / 10, 0.1, 60);
    this.camera.position.set(0, 1.4, 5.2);
    this.camera.lookAt(0, 0.2, 0);

    this.profile = { ...SHADER_PRESETS.obsidian_glass };
    this.applyProfile(this.profile);
  }

  ensureGl() {
    if (this.glReady) return true;
    if (this.glFailed || !this.canvas) return false;
    try {
      const sw = isSoftwareGlDevice();
      this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: !sw, powerPreference: 'high-performance' });
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.25;
      this.renderer.setPixelRatio(sw ? 1 : Math.min(window.devicePixelRatio || 1, 2));

      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(this.profile.bgColor);

      const pmrem = new THREE.PMREMGenerator(this.renderer);
      this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      pmrem.dispose();

      this.hemi = new THREE.HemisphereLight(0xe0f2fe, 0x090d16, 0.9);
      this.key = new THREE.DirectionalLight(0xfff1d6, 1.8);
      this.key.position.set(5, 8, 6);
      this.rim = new THREE.DirectionalLight(0x38bdf8, 1.2);
      this.rim.position.set(-5, 3, -5);
      this.scene.add(this.hemi, this.key, this.rim);

      this.heroMat = new THREE.MeshPhysicalMaterial({
        color: 0x0f172a,
        metalness: 0.85,
        roughness: 0.14,
        clearcoat: 0.9,
        clearcoatRoughness: 0.1,
        emissive: 0x0ea5e9,
        emissiveIntensity: 0.25
      });

      this.coreMat = new THREE.MeshStandardMaterial({
        color: 0xf97316,
        metalness: 0.3,
        roughness: 0.2,
        emissive: 0xef4444,
        emissiveIntensity: 0.7
      });

      this.knot = new THREE.Mesh(new THREE.TorusKnotGeometry(1.05, 0.32, 128, 24), this.heroMat);
      this.knot.position.y = 0.35;
      this.core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.45, 2), this.coreMat);
      this.core.position.y = 0.35;

      this.gridHelper = new THREE.GridHelper(14, 24, 0x38bdf8, 0x1e293b);
      this.gridHelper.position.y = -1.25;

      this.scene.add(this.knot, this.core, this.gridHelper);
      this.glReady = true;
      this.applyProfile(this.profile);
      if (this.pendingSize) {
        this.resize(this.pendingSize[0], this.pendingSize[1]);
      }
      return true;
    } catch {
      this.glFailed = true;
      return false;
    }
  }

  applyProfile(partial) {
    Object.assign(this.profile, partial);
    const p = this.profile;

    if (this.glReady && this.heroMat && this.coreMat && this.rim && this.scene) {
      this.heroMat.metalness = THREE.MathUtils.clamp(0.7 + (Number(p.metalnessOffset) || 0), 0, 1);
      this.heroMat.roughness = THREE.MathUtils.clamp(0.24 + (Number(p.roughnessOffset) || 0), 0.04, 1);
      this.heroMat.clearcoat = THREE.MathUtils.clamp(Number(p.clearcoat) ?? 0.8, 0, 1);
      this.heroMat.emissive.set(p.rimColor || '#38bdf8');
      this.heroMat.emissiveIntensity = THREE.MathUtils.clamp(Number(p.emissiveBoost) || 0.2, 0, 1.8);

      this.coreMat.color.set(p.sunColorB || '#f59e0b');
      this.coreMat.emissive.set(p.sunColorA || '#ef4444');
      this.rim.color.set(p.rimColor || '#38bdf8');
      this.scene.background.set(p.bgColor || '#04060b');
    }

    // Sync live across Black Liquid OS via Shader Bridge Daemon & Hybrid Scene Designer
    daemonSupervisor.updateShaderBridge({
      metalnessOffset: Number(p.metalnessOffset) || 0,
      roughnessOffset: Number(p.roughnessOffset) || 0,
      clearcoat: Number(p.clearcoat) ?? 0.5,
      emissiveBoost: Number(p.emissiveBoost) || 0,
      gridGlow: Number(p.gridGlow) ?? 1.0
    });

    hybridScene.applyConfig({
      rimColor: p.rimColor,
      gridColor: p.gridColor,
      sunColorA: p.sunColorA,
      sunColorB: p.sunColorB,
      bgColor: p.bgColor
    });
  }

  resize(width, height) {
    if (width <= 0 || height <= 0) return;
    this.pendingSize = [width, height];
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    if (this.glReady && this.renderer) {
      this.renderer.setSize(width, height, false);
    }
  }

  start() {
    if (this.running || !this.ensureGl()) return;
    this.running = true;
    let last = performance.now();
    const loop = (now) => {
      if (!this.running) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      this.elapsed += dt;
      this.knot.rotation.y += dt * 0.65;
      this.knot.rotation.x = Math.sin(this.elapsed * 0.7) * 0.25;
      this.core.rotation.y -= dt * 1.1;
      const pulse = 1 + daemonSupervisor.daemons.audioBeatSync.beatPulse * 0.14;
      this.core.scale.setScalar(pulse);
      this.renderer.render(this.scene, this.camera);
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
}
