import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { daemonSupervisor, SpringDamper, isSoftwareGlDevice } from './daemons.js';

const _trajA = new THREE.Vector3();
const _trajB = new THREE.Vector3();

function easeCurveValue(u, mode) {
  const x = Math.max(0, Math.min(1, u));
  if (mode === 'cubic') {
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  }
  if (mode === 'spring') {
    return 1 - Math.exp(-5 * x) * Math.cos(x * Math.PI * 2.5);
  }
  // Default quintic S-curve (C2 continuous acceleration)
  return x * x * x * (x * (x * 6 - 15) + 10);
}

/**
 * Shared Hybrid Movement System linked across Matrix, Mario 3D Hero, Liquid CAD,
 * Black Glass Video, and Text-to-Movie.
 */
export class HybridMovementSystem {
  constructor() {
    this.config = {
      mode: 'figure_eight', // 'spline_orbit' | 'parkour_patrol' | 'figure_eight' | 'cinema_glide' | 'zero_g'
      stiffness: 115,
      damping: 16,
      smoothness: 0.78,
      pathRadius: 3.4,
      gaitSpeed: 1.0,
      easeCurve: 'quintic',
      cadBreathing: 0.35,
      cameraLag: 0.55
    };

    this.heroPos = new THREE.Vector3(-2.4, 0, 1.8);
    this.heroYaw = 0;
    this.stridePhase = 0;

    this.springX = new SpringDamper(-2.4, 115, 16);
    this.springY = new SpringDamper(0, 140, 15);
    this.springZ = new SpringDamper(1.8, 115, 16);
    this.springYaw = new SpringDamper(0, 95, 16);
    this.cadFloatSpring = new SpringDamper(0, 70, 14);
  }

  applyConfig(partial) {
    if (!partial) return;
    Object.assign(this.config, partial);
    this.springX.stiffness = this.config.stiffness;
    this.springX.damping = this.config.damping;
    this.springZ.stiffness = this.config.stiffness;
    this.springZ.damping = this.config.damping;
    daemonSupervisor.emit('movement-change', { ...this.config });
  }

  sampleTrajectory(t, outVec, originX = 0, originZ = 0) {
    const r = this.config.pathRadius;
    const w = t * 0.55 * this.config.gaitSpeed;

    if (this.config.mode === 'spline_orbit') {
      outVec.set(
        originX + Math.cos(w) * r,
        0,
        originZ + Math.sin(w) * r
      );
    } else if (this.config.mode === 'parkour_patrol') {
      const cycle = (w * 0.38) % 2;
      const u = cycle <= 1 ? cycle : 2 - cycle;
      const eased = easeCurveValue(u, this.config.easeCurve);
      const px = THREE.MathUtils.lerp(-r, r, eased);
      const jump = Math.max(0, Math.sin(u * Math.PI * 2)) * 0.85;
      outVec.set(originX + px, jump, originZ + Math.sin(w * 0.8) * 1.1);
    } else if (this.config.mode === 'cinema_glide') {
      outVec.set(
        originX + Math.sin(w * 0.7) * r * 0.9,
        0.12 + 0.12 * Math.sin(w * 1.4),
        originZ + Math.cos(w * 0.45) * (r * 0.6)
      );
    } else if (this.config.mode === 'zero_g') {
      outVec.set(
        originX + Math.cos(w * 0.5) * (r * 0.75),
        0.55 + Math.sin(w * 0.9) * 0.45,
        originZ + Math.sin(w * 0.65) * (r * 0.75)
      );
    } else {
      // figure_eight (Lissajous continuous arc)
      outVec.set(
        originX + Math.sin(w) * r,
        0,
        originZ + Math.sin(w * 2) * (r * 0.52)
      );
    }
    return outVec;
  }

  updateMarioRig(marioHero, t, dt, originX = 0, originZ = 0, cadX = 0, cadZ = 0) {
    if (!marioHero || !marioHero.root) return;

    const target = this.sampleTrajectory(t, _trajA, originX, originZ);
    const ahead = this.sampleTrajectory(t + 0.08, _trajB, originX, originZ);
    daemonSupervisor.avoidCadCollision(target, cadX, cadZ);
    daemonSupervisor.avoidCadCollision(ahead, cadX, cadZ);
    const dx = ahead.x - target.x;
    const dz = ahead.z - target.z;
    const desiredYaw = Math.atan2(-dz, dx);

    const useSpring = daemonSupervisor.daemons.kinematicsSolver.enabled;
    if (useSpring) {
      this.heroPos.x = this.springX.step(dt, target.x);
      this.heroPos.y = this.springY.step(dt, target.y);
      this.heroPos.z = this.springZ.step(dt, target.z);

      // Shortest-angle yaw unwrap
      let diff = desiredYaw - this.springYaw.position;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.heroYaw = this.springYaw.step(dt, this.springYaw.position + diff);
    } else {
      this.heroPos.copy(target);
      this.heroYaw = desiredYaw;
    }

    const velMag = Math.hypot(dx, dz) / 0.08;
    const gaitOmega = Math.max(2.2, velMag * 2.2) * this.config.gaitSpeed;
    this.stridePhase += dt * gaitOmega;

    const strideAmp = this.config.mode === 'zero_g' ? 0.25 : 0.62 * (0.65 + 0.35 * this.config.smoothness);
    const legSwing = Math.sin(this.stridePhase) * strideAmp;
    const bounce = this.config.mode === 'zero_g' ? 0 : Math.abs(Math.cos(this.stridePhase)) * 0.09;

    marioHero.root.position.set(this.heroPos.x, this.heroPos.y + bounce, this.heroPos.z);
    marioHero.root.rotation.y = this.heroYaw;

    // Smooth counter-rotating limbs (Zero static snapping)
    marioHero.legL.rotation.z = legSwing;
    marioHero.legR.rotation.z = -legSwing;
    marioHero.armL.rotation.z = -legSwing * 0.78;
    marioHero.armR.rotation.z = legSwing * 0.78;
  }

  getCadHarmonicOffset(t, dt) {
    const targetFloat = Math.sin(t * 1.15 * this.config.gaitSpeed) * 0.14 * this.config.cadBreathing;
    if (!daemonSupervisor.daemons.kinematicsSolver.enabled) return targetFloat;
    return this.cadFloatSpring.step(dt, targetFloat);
  }
}

export const hybridMovement = new HybridMovementSystem();

/**
 * Interactive Hybrid Movement Studio Viewport App (#win-movement)
 */
export class HybridMovementApp {
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
    this.camera = new THREE.PerspectiveCamera(44, 16 / 10, 0.1, 100);
    this.camera.position.set(0, 6.2, 8.8);
    this.splineLine = null;
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
      this.scene.background = new THREE.Color(0x050810);
      this.scene.fog = new THREE.FogExp2(0x050810, 0.03);

      const pmrem = new THREE.PMREMGenerator(this.renderer);
      this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      pmrem.dispose();

      this.controls = new OrbitControls(this.camera, this.canvas);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.07;
      this.controls.target.set(0, 0.9, 0);

      this.scene.add(new THREE.HemisphereLight(0x93c5fd, 0x090d16, 0.75));
      const key = new THREE.DirectionalLight(0xfff5e4, 1.5);
      key.position.set(5, 9, 6);
      this.scene.add(key);

      const grid = new THREE.GridHelper(16, 16, 0x38bdf8, 0x1e293b);
      grid.material.polygonOffset = true;
      grid.material.polygonOffsetFactor = -1;
      this.scene.add(grid);

      this.actor = this.buildPreviewRig();
      this.scene.add(this.actor.root);

      this.glReady = true;
      this.rebuildTrajectoryVisual();
      if (this.pendingSize) {
        this.resize(this.pendingSize[0], this.pendingSize[1]);
      }
      return true;
    } catch {
      this.glFailed = true;
      return false;
    }
  }

  buildPreviewRig() {
    const root = new THREE.Group();
    const matRed = new THREE.MeshStandardMaterial({ color: 0xe52521, roughness: 0.4 });
    const matBlue = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.5 });
    const matSkin = new THREE.MeshStandardMaterial({ color: 0xffcc99, roughness: 0.6 });
    const matGold = new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.8, roughness: 0.25 });

    const legL = new THREE.Group();
    legL.position.set(0, 0.55, -0.14);
    const lMesh = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.52, 0.22), matBlue);
    lMesh.position.y = -0.26;
    legL.add(lMesh);

    const legR = new THREE.Group();
    legR.position.set(0, 0.55, 0.14);
    const rMesh = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.52, 0.22), matBlue);
    rMesh.position.y = -0.26;
    legR.add(rMesh);

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.62, 0.5), matRed);
    torso.position.y = 0.88;
    const armL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.42, 0.18), matRed);
    armL.position.set(0, 0.92, -0.36);
    const armR = armL.clone();
    armR.position.z = 0.36;

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 16, 12), matSkin);
    head.position.y = 1.42;
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), matRed);
    cap.position.y = 1.49;

    const halo = new THREE.Mesh(new THREE.TorusGeometry(0.65, 0.03, 10, 40), matGold);
    halo.rotation.x = Math.PI / 2;
    halo.position.y = 0.04;

    root.add(legL, legR, torso, armL, armR, head, cap, halo);
    return { root, legL, legR, armL, armR };
  }

  rebuildTrajectoryVisual() {
    if (!this.glReady || !this.scene) return;
    if (this.splineLine) {
      this.scene.remove(this.splineLine);
      this.splineLine.geometry.dispose();
      this.splineLine.material.dispose();
    }
    const pts = [];
    const sampleVec = new THREE.Vector3();
    for (let i = 0; i <= 96; i++) {
      const t = (i / 96) * 14;
      hybridMovement.sampleTrajectory(t, sampleVec, 0, 0);
      pts.push(sampleVec.clone().add(new THREE.Vector3(0, 0.06, 0)));
    }
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.78 });
    this.splineLine = new THREE.Line(geo, mat);
    this.scene.add(this.splineLine);
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
      hybridMovement.updateMarioRig(this.actor, this.elapsed, dt, 0, 0);
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
