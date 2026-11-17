import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { LEVEL_HEIGHT } from './levels.js';
import { daemonSupervisor, isSoftwareGlDevice } from '../studio/daemons.js';

const _mat4 = new THREE.Matrix4();
const _vec3 = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _scale = new THREE.Vector3(1, 1, 1);

function toWorldY(gridY, height = 0) {
  // Grid y=13 is ground top -> map y=13 to 3D Y=0
  return (13 - gridY) - height;
}

function makeProceduralTexture(maxAniso, drawFn) {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext('2d');
  drawFn(ctx, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  tex.magFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  return tex;
}

export class MarioRenderer3D {
  constructor(canvas) {
    this.canvas = canvas;
    this.isSoftwareGl = isSoftwareGlDevice();
    this.cameraMode = 'chase'; // 'side' | 'chase' | 'hero'
    this.contextLost = false;
    this.glReady = false;
    this.glFailed = false;
    this.pendingSize = null;
    this.renderer = null;
    this.scene = null;
    this.camera = new THREE.PerspectiveCamera(46, 16 / 10, 0.1, 220);
    this.camPos = new THREE.Vector3(6, 5.5, 16);
    this.camTarget = new THREE.Vector3(6, 2.5, 0);
    this.tileMeshes = new Map();
    this.coinMeshes = new Map();
    this.enemyGroups = new Map();
    this.piranhaGroups = new Map();
    this.itemGroups = new Map();
    this.fireballPool = [];
    this.particlePool = [];
    this.builtWorldSignature = null;
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
      this.renderer.toneMappingExposure = 1.08;
      this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
      this.renderer.shadowMap.enabled = !this.isSoftwareGl;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

      this.canvas.addEventListener('webglcontextlost', (e) => {
        e.preventDefault();
        this.contextLost = true;
      });
      this.canvas.addEventListener('webglcontextrestored', () => {
        this.contextLost = false;
      });

      this.scene = new THREE.Scene();

      const pmrem = new THREE.PMREMGenerator(this.renderer);
      this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      pmrem.dispose();

      // 3-Point Lighting Rig
      this.hemiLight = new THREE.HemisphereLight(0xbae6fd, 0x1e293b, 0.72);
      this.scene.add(this.hemiLight);

      this.keyLight = new THREE.DirectionalLight(0xfff1d6, 1.55);
      this.keyLight.position.set(14, 24, 16);
      this.keyLight.castShadow = !this.isSoftwareGl;
      this.keyLight.shadow.mapSize.width = 1024;
      this.keyLight.shadow.mapSize.height = 1024;
      this.keyLight.shadow.camera.near = 2;
      this.keyLight.shadow.camera.far = 75;
      const d = 18;
      this.keyLight.shadow.camera.left = -d;
      this.keyLight.shadow.camera.right = d;
      this.keyLight.shadow.camera.top = d;
      this.keyLight.shadow.camera.bottom = -d;
      this.keyLight.shadow.bias = -0.0005;
      this.keyLight.shadow.normalBias = 0.02;
      this.scene.add(this.keyLight);
      this.scene.add(this.keyLight.target);

      this.rimLight = new THREE.DirectionalLight(0x93c5fd, 0.48);
      this.rimLight.position.set(-10, 10, -14);
      this.scene.add(this.rimLight);

      this.initMaterials();
      this.levelGroup = new THREE.Group();
      this.dynamicGroup = new THREE.Group();
      this.scene.add(this.levelGroup);
      this.scene.add(this.dynamicGroup);

      this.marioGroup = this.createMarioModel();
      this.scene.add(this.marioGroup.root);
      this.glReady = true;

      if (this.pendingSize) {
        this.resize(this.pendingSize[0], this.pendingSize[1]);
      }
      return true;
    } catch {
      this.glFailed = true;
      return false;
    }
  }

  initMaterials() {
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();

    const texGroundOver = makeProceduralTexture(maxAniso, (ctx) => {
      ctx.fillStyle = '#c2410c';
      ctx.fillRect(0, 0, 64, 64);
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(0, 0, 64, 14);
      ctx.fillStyle = '#15803d';
      ctx.fillRect(0, 13, 64, 4);
      ctx.fillStyle = '#7c2d12';
      ctx.fillRect(6, 24, 22, 14);
      ctx.fillRect(36, 24, 22, 14);
      ctx.fillRect(20, 44, 26, 14);
    });

    const texGroundUnder = makeProceduralTexture(maxAniso, (ctx) => {
      ctx.fillStyle = '#0f2942';
      ctx.fillRect(0, 0, 64, 64);
      ctx.fillStyle = '#1e4e79';
      ctx.fillRect(2, 2, 28, 28);
      ctx.fillRect(34, 2, 28, 28);
      ctx.fillRect(2, 34, 28, 28);
      ctx.fillRect(34, 34, 28, 28);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(4, 4, 24, 4);
      ctx.fillRect(36, 4, 24, 4);
    });

    const texBrickOver = makeProceduralTexture(maxAniso, (ctx) => {
      ctx.fillStyle = '#c84c0c';
      ctx.fillRect(0, 0, 64, 64);
      ctx.fillStyle = '#1e1b18';
      ctx.fillRect(0, 30, 64, 4);
      ctx.fillRect(0, 60, 64, 4);
      ctx.fillRect(30, 0, 4, 32);
      ctx.fillRect(14, 32, 4, 32);
      ctx.fillRect(46, 32, 4, 32);
      ctx.fillStyle = '#fb923c';
      ctx.fillRect(2, 2, 26, 4);
      ctx.fillRect(36, 2, 26, 4);
    });

    const texBrickUnder = makeProceduralTexture(maxAniso, (ctx) => {
      ctx.fillStyle = '#1d4ed8';
      ctx.fillRect(0, 0, 64, 64);
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 30, 64, 4);
      ctx.fillRect(0, 60, 64, 4);
      ctx.fillRect(30, 0, 4, 32);
      ctx.fillRect(14, 32, 4, 32);
      ctx.fillRect(46, 32, 4, 32);
      ctx.fillStyle = '#60a5fa';
      ctx.fillRect(2, 2, 26, 4);
      ctx.fillRect(36, 2, 26, 4);
    });

    const texQBlock = makeProceduralTexture(maxAniso, (ctx) => {
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(0, 0, 64, 64);
      ctx.fillStyle = '#92400e';
      ctx.fillRect(0, 0, 64, 4);
      ctx.fillRect(0, 60, 64, 4);
      ctx.fillRect(0, 0, 4, 64);
      ctx.fillRect(60, 0, 4, 64);
      ctx.fillRect(8, 8, 4, 4);
      ctx.fillRect(52, 8, 4, 4);
      ctx.fillRect(8, 52, 4, 4);
      ctx.fillRect(52, 52, 4, 4);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(20, 14, 24, 7);
      ctx.fillRect(16, 18, 7, 8);
      ctx.fillRect(37, 18, 7, 12);
      ctx.fillRect(27, 29, 12, 8);
      ctx.fillRect(27, 44, 9, 8);
    });

    const texUsed = makeProceduralTexture(maxAniso, (ctx) => {
      ctx.fillStyle = '#78350f';
      ctx.fillRect(0, 0, 64, 64);
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = 4;
      ctx.strokeRect(2, 2, 60, 60);
    });

    const texHard = makeProceduralTexture(maxAniso, (ctx) => {
      ctx.fillStyle = '#9a3412';
      ctx.fillRect(0, 0, 64, 64);
      ctx.fillStyle = '#fed7aa';
      ctx.fillRect(0, 0, 64, 5);
      ctx.fillRect(0, 0, 5, 64);
      ctx.fillStyle = '#431407';
      ctx.fillRect(0, 59, 64, 5);
      ctx.fillRect(59, 0, 5, 64);
    });

    this.mats = {
      groundOver: new THREE.MeshStandardMaterial({ map: texGroundOver, roughness: 0.85, metalness: 0.05 }),
      groundUnder: new THREE.MeshStandardMaterial({ map: texGroundUnder, roughness: 0.65, metalness: 0.15 }),
      brickOver: new THREE.MeshStandardMaterial({ map: texBrickOver, roughness: 0.82, metalness: 0.05 }),
      brickUnder: new THREE.MeshStandardMaterial({ map: texBrickUnder, roughness: 0.65, metalness: 0.15 }),
      qblock: new THREE.MeshStandardMaterial({ map: texQBlock, roughness: 0.38, metalness: 0.25, emissive: 0x451a03, emissiveIntensity: 0.25 }),
      used: new THREE.MeshStandardMaterial({ map: texUsed, roughness: 0.88, metalness: 0.1 }),
      hard: new THREE.MeshStandardMaterial({ map: texHard, roughness: 0.72, metalness: 0.1 }),
      platform: new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.55, metalness: 0.08 }),
      pipe: new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.28, metalness: 0.2 }),
      pipeDark: new THREE.MeshStandardMaterial({ color: 0x041208, roughness: 0.95, metalness: 0.0 }),
      coin: new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.18, metalness: 0.85, emissive: 0x713f12, emissiveIntensity: 0.2 })
    };

    this.boxGeo = new THREE.BoxGeometry(1, 1, 1);
    this.coinGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.1, 18);
    this.coinGeo.rotateX(Math.PI / 2);
  }

  createMarioModel() {
    const root = new THREE.Group();
    const rig = new THREE.Group();
    root.add(rig);

    const matRed = new THREE.MeshStandardMaterial({ color: 0xe52521, roughness: 0.45, metalness: 0.05 });
    const matBlue = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.58, metalness: 0.05 });
    const matSkin = new THREE.MeshStandardMaterial({ color: 0xffcc99, roughness: 0.65, metalness: 0.0 });
    const matHair = new THREE.MeshStandardMaterial({ color: 0x5c2c0b, roughness: 0.8, metalness: 0.0 });
    const matWhite = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.38, metalness: 0.08 });
    const matGold = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.2, metalness: 0.8 });
    const matEye = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2, metalness: 0.1 });

    // Legs & Boots (pivot at hip y=0.68)
    const leftLegPivot = new THREE.Group();
    leftLegPivot.position.set(0, 0.68, -0.14);
    const lLeg = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.36, 0.24), matBlue);
    lLeg.position.y = -0.22;
    const lBoot = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.22, 0.26), matHair);
    lBoot.position.set(0.05, -0.5, 0);
    leftLegPivot.add(lLeg, lBoot);

    const rightLegPivot = new THREE.Group();
    rightLegPivot.position.set(0, 0.68, 0.14);
    const rLeg = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.36, 0.24), matBlue);
    rLeg.position.y = -0.22;
    const rBoot = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.22, 0.26), matHair);
    rBoot.position.set(0.05, -0.5, 0);
    rightLegPivot.add(rLeg, rBoot);

    // Torso (Overalls + Shirt + Buttons)
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.56, 0.52), matBlue);
    torso.position.y = 0.94;
    const chest = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.34, 0.54), matRed);
    chest.position.y = 1.06;
    const btn1 = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.06, 10), matGold);
    btn1.rotation.z = Math.PI / 2;
    btn1.position.set(0.25, 0.94, 0.13);
    const btn2 = btn1.clone();
    btn2.position.z = -0.13;

    // Arms + White Gloves
    const leftArmPivot = new THREE.Group();
    leftArmPivot.position.set(0, 1.15, -0.34);
    const lArm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.38, 0.18), matRed);
    lArm.position.y = -0.18;
    const lGlove = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 10), matWhite);
    lGlove.position.y = -0.38;
    leftArmPivot.add(lArm, lGlove);

    const rightArmPivot = new THREE.Group();
    rightArmPivot.position.set(0, 1.15, 0.34);
    const rArm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.38, 0.18), matRed);
    rArm.position.y = -0.18;
    const rGlove = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 10), matWhite);
    rGlove.position.y = -0.38;
    rightArmPivot.add(rArm, rGlove);

    // Head + Face + Iconic Cap
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.48, 0);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.29, 16, 14), matSkin);
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 10), matSkin);
    nose.position.set(0.27, -0.02, 0);
    const stache = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.28), matHair);
    stache.position.set(0.24, -0.1, 0);
    const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.09, 0.06), matEye);
    eyeL.position.set(0.25, 0.06, -0.11);
    const eyeR = eyeL.clone();
    eyeR.position.z = 0.11;

    const capDome = new THREE.Mesh(new THREE.SphereGeometry(0.31, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.56), matRed);
    capDome.position.y = 0.08;
    const capBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.05, 14, 1, false, -0.8, 1.6), matRed);
    capBrim.position.set(0.16, 0.14, 0);
    capBrim.rotation.y = Math.PI / 2;
    const capBadge = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.04, 12), matWhite);
    capBadge.rotation.z = Math.PI / 2;
    capBadge.position.set(0.28, 0.22, 0);

    headGroup.add(head, nose, stache, eyeL, eyeR, capDome, capBrim, capBadge);
    rig.add(leftLegPivot, rightLegPivot, torso, chest, btn1, btn2, leftArmPivot, rightArmPivot, headGroup);

    // Contact shadow disc
    const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.32, depthWrite: false });
    const contactShadow = new THREE.Mesh(new THREE.CircleGeometry(0.42, 16), shadowMat);
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.y = 0.02;
    root.add(contactShadow);

    rig.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });

    return {
      root,
      rig,
      leftLegPivot,
      rightLegPivot,
      leftArmPivot,
      rightArmPivot,
      headGroup,
      contactShadow,
      matRed,
      matBlue
    };
  }

  createGoombaModel() {
    const g = new THREE.Group();
    const matCap = new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.72, metalness: 0.05 });
    const matStem = new THREE.MeshStandardMaterial({ color: 0xf5deb3, roughness: 0.68, metalness: 0.0 });
    const matFoot = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.85, metalness: 0.0 });
    const matEye = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
    const matPupil = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2 });

    const body = new THREE.Group();
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.3, 0.42, 12), matStem);
    stem.position.y = 0.36;
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.46, 14, 12), matCap);
    cap.scale.set(1, 0.78, 1);
    cap.position.y = 0.65;

    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.07, 0.42), matFoot);
    brow.position.set(0.36, 0.68, 0);
    const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 0.11), matEye);
    eyeL.position.set(0.38, 0.58, -0.14);
    const eyeR = eyeL.clone();
    eyeR.position.z = 0.14;
    const pupL = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.08, 0.05), matPupil);
    pupL.position.set(0.4, 0.57, -0.13);
    const pupR = pupL.clone();
    pupR.position.z = 0.13;

    const footL = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.18, 0.22), matFoot);
    footL.position.set(0.04, 0.09, -0.16);
    const footR = footL.clone();
    footR.position.z = 0.16;

    body.add(stem, cap, brow, eyeL, eyeR, pupL, pupR, footL, footR);
    body.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    g.add(body);
    return { root: g, body, footL, footR };
  }

  createKoopaModel(color) {
    const g = new THREE.Group();
    const shellCol = color === 'red' ? 0xdc2626 : 0x16a34a;
    const matShell = new THREE.MeshStandardMaterial({ color: shellCol, roughness: 0.32, metalness: 0.15 });
    const matRim = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.6, metalness: 0.05 });
    const matSkin = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.55, metalness: 0.05 });
    const matBoot = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.5, metalness: 0.05 });
    const matEye = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2 });

    const body = new THREE.Group();
    const shell = new THREE.Mesh(new THREE.SphereGeometry(0.42, 14, 12), matShell);
    shell.scale.set(1.05, 1.15, 0.92);
    shell.position.set(-0.04, 0.56, 0);

    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.43, 0.43, 0.14, 14), matRim);
    rim.position.set(-0.04, 0.28, 0);

    const headGroup = new THREE.Group();
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.28, 10), matSkin);
    neck.position.set(0.28, 0.78, 0);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), matSkin);
    head.position.set(0.34, 0.98, 0);
    const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.09, 0.06), matEye);
    eyeL.position.set(0.5, 1.02, -0.09);
    const eyeR = eyeL.clone();
    eyeR.position.z = 0.09;
    headGroup.add(neck, head, eyeL, eyeR);

    const footL = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.18, 0.2), matBoot);
    footL.position.set(0.04, 0.09, -0.18);
    const footR = footL.clone();
    footR.position.z = 0.18;

    body.add(shell, rim, headGroup, footL, footR);
    body.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    g.add(body);
    return { root: g, body, headGroup, footL, footR, shell };
  }

  createPiranhaModel() {
    const g = new THREE.Group();
    const matStalk = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.45 });
    const matHead = new THREE.MeshStandardMaterial({ color: 0xe11d48, roughness: 0.38 });
    const matSpot = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });

    const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.8, 10), matStalk);
    stalk.position.y = 0.4;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.36, 12, 12), matHead);
    head.position.y = 0.92;
    const teeth = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.07, 8, 12), matSpot);
    teeth.rotation.x = Math.PI / 2;
    teeth.position.y = 1.05;
    const spot1 = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), matSpot);
    spot1.position.set(0.3, 0.92, 0.12);
    const spot2 = spot1.clone();
    spot2.position.set(-0.28, 0.85, 0.15);

    g.add(stalk, head, teeth, spot1, spot2);
    return g;
  }

  createItemModel(type) {
    const g = new THREE.Group();
    if (type === 'mushroom' || type === 'oneUp') {
      const capCol = type === 'oneUp' ? 0x16a34a : 0xef4444;
      const cap = new THREE.Mesh(
        new THREE.SphereGeometry(0.42, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.62),
        new THREE.MeshStandardMaterial({ color: capCol, roughness: 0.35 })
      );
      cap.position.y = 0.45;
      const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.24, 0.28, 0.4, 12),
        new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.65 })
      );
      stem.position.y = 0.22;
      const spot = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 })
      );
      spot.position.set(0, 0.72, 0.34);
      const spot2 = spot.clone();
      spot2.position.set(0.3, 0.62, 0.1);
      const spot3 = spot.clone();
      spot3.position.set(-0.3, 0.62, 0.1);
      g.add(cap, stem, spot, spot2, spot3);
    } else if (type === 'flower') {
      const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.08, 0.48, 8),
        new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.5 })
      );
      stem.position.y = 0.24;
      const petal = new THREE.Mesh(
        new THREE.TorusGeometry(0.24, 0.1, 10, 16),
        new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.35, emissive: 0x7c2d12, emissiveIntensity: 0.3 })
      );
      petal.position.y = 0.66;
      const core = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 12, 12),
        new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.3, emissive: 0xfacc15, emissiveIntensity: 0.35 })
      );
      core.position.y = 0.66;
      g.add(stem, petal, core);
    } else {
      // Starman extruded 5-point star
      const shape = new THREE.Shape();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? 0.42 : 0.18;
        const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
        if (i === 0) shape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        else shape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      shape.closePath();
      const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.16, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 2 });
      geo.center();
      const starMesh = new THREE.Mesh(
        geo,
        new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.2, metalness: 0.65, emissive: 0xca8a04, emissiveIntensity: 0.45 })
      );
      starMesh.position.y = 0.45;
      g.add(starMesh);
    }
    return g;
  }

  invalidateScene() {
    this.builtWorldSignature = null;
  }

  buildLevelScene(engine) {
    const level = engine.level;
    const signature = `${level.id}_${level.theme}_${level._customSignature || 'std'}`;
    if (this.builtWorldSignature === signature) return;
    this.builtWorldSignature = signature;

    // Clear & properly dispose old level geometry via WebGL Watchdog daemon
    while (this.levelGroup.children.length > 0) {
      const child = this.levelGroup.children[0];
      this.levelGroup.remove(child);
      daemonSupervisor.disposeObject3D(child);
    }
    this.tileMeshes.clear();
    this.coinMeshes.clear();
    this.enemyGroups.forEach((eg) => {
      this.dynamicGroup.remove(eg.root);
      daemonSupervisor.disposeObject3D(eg.root);
    });
    this.enemyGroups.clear();
    this.piranhaGroups.forEach((pg) => {
      this.dynamicGroup.remove(pg);
      daemonSupervisor.disposeObject3D(pg);
    });
    this.piranhaGroups.clear();
    this.itemGroups.forEach((ig) => {
      this.dynamicGroup.remove(ig);
      daemonSupervisor.disposeObject3D(ig);
    });
    this.itemGroups.clear();

    this.scene.background = new THREE.Color(level.skyColor);
    this.scene.fog = new THREE.FogExp2(level.fogColor, level.theme === 'underground' ? 0.016 : 0.0085);

    // Count static ground & hard blocks for InstancedMesh batching
    const groundPositions = [];
    const hardPositions = [];

    for (let r = 0; r < LEVEL_HEIGHT; r++) {
      for (let c = 0; c < level.width; c++) {
        const ch = level.grid[r][c];
        if (ch === '#') groundPositions.push([c + 0.5, toWorldY(r + 0.5)]);
        else if (ch === 'H') hardPositions.push([c + 0.5, toWorldY(r + 0.5)]);
        else if (ch === 'B' || ch === '?' || ch === 'M' || ch === 'S' || ch === 'U' || ch === 'X') {
          const mat = ch === 'B'
            ? (level.theme === 'underground' ? this.mats.brickUnder : this.mats.brickOver)
            : (ch === 'X' ? this.mats.used : this.mats.qblock);
          const mesh = new THREE.Mesh(this.boxGeo, mat);
          mesh.position.set(c + 0.5, toWorldY(r + 0.5), 0);
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          this.levelGroup.add(mesh);
          this.tileMeshes.set(`${c},${r}`, mesh);
        } else if (ch === 'P') {
          const plat = new THREE.Mesh(new THREE.BoxGeometry(1, 0.35, 1.5), this.mats.platform);
          plat.position.set(c + 0.5, toWorldY(r + 0.18), 0);
          plat.castShadow = true;
          plat.receiveShadow = true;
          this.levelGroup.add(plat);
        } else if (ch === 'C') {
          const coin = new THREE.Mesh(this.coinGeo, this.mats.coin);
          coin.position.set(c + 0.5, toWorldY(r + 0.5), 0);
          this.levelGroup.add(coin);
          this.coinMeshes.set(`${c},${r}`, coin);
        }
      }
    }

    // Instanced ground blocks (4.8 units deep in Z so stage reads as substantial 3D terrain)
    if (groundPositions.length > 0) {
      const groundMat = level.theme === 'underground' ? this.mats.groundUnder : this.mats.groundOver;
      const instGround = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 4.8), groundMat, groundPositions.length);
      instGround.receiveShadow = true;
      groundPositions.forEach(([x, y], i) => {
        _vec3.set(x, y, 0);
        _mat4.compose(_vec3, _quat, _scale);
        instGround.setMatrixAt(i, _mat4);
      });
      instGround.computeBoundingSphere();
      this.levelGroup.add(instGround);
    }

    if (hardPositions.length > 0) {
      const instHard = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1.4), this.mats.hard, hardPositions.length);
      instHard.castShadow = true;
      instHard.receiveShadow = true;
      hardPositions.forEach(([x, y], i) => {
        _vec3.set(x, y, 0);
        _mat4.compose(_vec3, _quat, _scale);
        instHard.setMatrixAt(i, _mat4);
      });
      instHard.computeBoundingSphere();
      this.levelGroup.add(instHard);
    }

    // Deep background horizon terrace (placed at z = -8.5..-28 so pits remain legible at z = 0)
    const horizonGeo = new THREE.BoxGeometry(level.width + 80, 3.0, 26);
    const horizonMat = new THREE.MeshStandardMaterial({
      color: level.theme === 'underground' ? 0x06101f : (level.theme === 'sky' ? 0x1e3a8a : 0x15803d),
      roughness: 0.92,
      metalness: 0.04
    });
    const horizonShelf = new THREE.Mesh(horizonGeo, horizonMat);
    horizonShelf.position.set(level.width * 0.5, -3.2, -16);
    horizonShelf.receiveShadow = true;
    this.levelGroup.add(horizonShelf);

    // 3D Pipes
    for (const p of level.pipes) {
      const pipeGroup = new THREE.Group();
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.84, 0.84, p.height, 20), this.mats.pipe);
      shaft.position.set(p.x + 1.0, toWorldY(p.topRow + p.height * 0.5), 0);
      shaft.castShadow = true;
      shaft.receiveShadow = true;
      const lip = new THREE.Mesh(new THREE.CylinderGeometry(0.98, 0.98, 0.65, 20), this.mats.pipe);
      lip.position.set(p.x + 1.0, toWorldY(p.topRow + 0.32), 0);
      lip.castShadow = true;
      lip.receiveShadow = true;
      const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.76, 0.76, 0.06, 18), this.mats.pipeDark);
      hole.position.set(p.x + 1.0, toWorldY(p.topRow) + 0.01, 0);
      pipeGroup.add(shaft, lip, hole);
      this.levelGroup.add(pipeGroup);
    }

    // 3D Flagpole + Flag + Castle
    const poleMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.25, metalness: 0.85 });
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 9.2, 12), poleMat);
    pole.position.set(level.flagX + 0.5, 5.6, 0);
    pole.castShadow = true;
    const finial = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 12), this.mats.pipe);
    finial.position.set(level.flagX + 0.5, 10.3, 0);
    this.flagMesh = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 0.72, 0.08),
      new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.45 })
    );
    this.flagMesh.position.set(level.flagX - 0.1, 9.5, 0);
    this.levelGroup.add(pole, finial, this.flagMesh);

    const castleGroup = new THREE.Group();
    const keep = new THREE.Mesh(new THREE.BoxGeometry(4.4, 3.6, 3.2), this.mats.hard);
    keep.position.set(level.castleX + 2.2, 1.8, -0.4);
    keep.castShadow = true;
    keep.receiveShadow = true;
    const upper = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.8, 2.2), this.mats.hard);
    upper.position.set(level.castleX + 2.2, 4.5, -0.4);
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.8, 0.2), this.mats.pipeDark);
    door.position.set(level.castleX + 2.2, 0.9, 1.15);
    castleGroup.add(keep, upper, door);
    this.levelGroup.add(castleGroup);

    // Grounded Conical/Layered 3D Hills & Distant Clouds (anchored onto horizonShelf, no floating balloons)
    if (level.theme !== 'underground') {
      const hillMat = new THREE.MeshStandardMaterial({
        color: level.theme === 'sky' ? 0x1d4ed8 : 0x16a34a,
        roughness: 0.88
      });
      const hillCapMat = new THREE.MeshStandardMaterial({
        color: level.theme === 'sky' ? 0x3b82f6 : 0x22c55e,
        roughness: 0.85
      });
      const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.92 });

      for (let x = 2; x < level.width; x += 16) {
        const mound = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 4.6, 5.4, 18), hillMat);
        mound.scale.set(1.3, 1.0, 0.7);
        mound.position.set(x + 2, 0.2, -10.5);
        const cap = new THREE.Mesh(new THREE.SphereGeometry(1.12, 14, 10), hillCapMat);
        cap.scale.set(1.3, 0.85, 0.7);
        cap.position.set(x + 2, 2.9, -10.5);
        this.levelGroup.add(mound, cap);

        const cloud = new THREE.Group();
        const c1 = new THREE.Mesh(new THREE.SphereGeometry(0.9, 12, 10), cloudMat);
        const c2 = new THREE.Mesh(new THREE.SphereGeometry(1.15, 12, 10), cloudMat);
        c2.position.set(0.9, 0.35, 0);
        const c3 = new THREE.Mesh(new THREE.SphereGeometry(0.85, 12, 10), cloudMat);
        c3.position.set(1.85, 0.0, 0);
        cloud.add(c1, c2, c3);
        cloud.position.set(x + 4, 9.6 + (x % 3), -8.5);
        this.levelGroup.add(cloud);
      }
    }
  }

  resize(width, height) {
    this.pendingSize = [width, height];
    const aspect = Math.max(0.45, width / Math.max(1, height));
    this.camera.aspect = aspect;
    // Widen vertical FOV slightly on portrait viewports so mobile horizontal framing stays comfortable
    this.camera.fov = aspect < 0.9 ? Math.min(64, 46 / Math.pow(aspect, 0.42)) : 46;
    this.camera.updateProjectionMatrix();
    if (this.glReady && this.renderer) {
      this.renderer.setSize(width, height, false);
    }
  }

  setCameraMode(mode) {
    this.cameraMode = mode;
  }

  applyThoughtMutation(mut = {}) {
    if (!this.glReady || !this.scene) return;
    if (mut.skyColor) this.scene.background = new THREE.Color(mut.skyColor);
    if (mut.fogColor) {
      const density = typeof mut.fogDensity === 'number' ? mut.fogDensity : 0.0095;
      this.scene.fog = new THREE.FogExp2(mut.fogColor, density);
    }
    if (mut.keyColor && this.keyLight) this.keyLight.color.set(mut.keyColor);
    if (mut.rimColor && this.rimLight) this.rimLight.color.set(mut.rimColor);
  }

  render(engine, dt = 0.016) {
    if (this.contextLost || !this.ensureGl()) return;
    this.buildLevelScene(engine);

    const level = engine.level;

    // Sync breakable/bumpable tiles & collected coins
    const bumpMap = new Map();
    for (const b of engine.bumpingTiles) {
      bumpMap.set(`${b.x},${b.y}`, b.offset);
    }

    for (const [key, mesh] of this.tileMeshes.entries()) {
      const [cx, ry] = key.split(',').map(Number);
      const ch = level.grid[ry][cx];
      if (ch === '.') {
        mesh.visible = false;
      } else {
        mesh.visible = true;
        if (ch === 'X' && mesh.material !== this.mats.used) {
          mesh.material = this.mats.used;
        }
        const off = bumpMap.get(key) || 0;
        mesh.position.y = toWorldY(ry + 0.5) - off;
      }
    }

    for (const [key, coinMesh] of this.coinMeshes.entries()) {
      const [cx, ry] = key.split(',').map(Number);
      if (level.grid[ry][cx] !== 'C') {
        coinMesh.visible = false;
      } else {
        coinMesh.visible = true;
        coinMesh.rotation.y = engine.elapsed * 4.5 + cx * 0.4;
      }
    }

    // Update flagpole flag drop
    if (this.flagMesh) {
      this.flagMesh.position.y = 9.5 - engine.flagProgress * 7.2;
    }

    // Sync Mario 3D composite rig
    const p = engine.player;
    const m = this.marioGroup;
    m.root.visible = !(p.invulnTimer > 0 && Math.floor(engine.elapsed * 20) % 2 === 0);
    const scaleY = p.power === 'small' ? 0.64 : (p.crouching ? 0.66 : 1.04);
    const scaleXZ = p.power === 'small' ? 0.72 : 1.0;

    m.root.position.set(p.x + p.w * 0.5, toWorldY(p.y + p.h), 0);
    m.rig.scale.set(scaleXZ, scaleY, scaleXZ);
    const targetRotY = p.facing >= 0 ? 0 : Math.PI;
    m.rig.rotation.y = THREE.MathUtils.damp(m.rig.rotation.y, targetRotY, 16, dt);

    // Fire / Star colors
    if (p.starTimer > 0) {
      const hue = (engine.elapsed * 2.5) % 1;
      m.matRed.color.setHSL(hue, 0.95, 0.55);
      m.matBlue.color.setHSL((hue + 0.4) % 1, 0.9, 0.5);
    } else if (p.power === 'fire') {
      m.matRed.color.setHex(0xf8fafc);
      m.matBlue.color.setHex(0xdc2626);
    } else {
      m.matRed.color.setHex(0xe52521);
      m.matBlue.color.setHex(0x1d4ed8);
    }

    // Limb animation
    if (!p.grounded) {
      m.leftLegPivot.rotation.z = 0.55;
      m.rightLegPivot.rotation.z = -0.45;
      m.leftArmPivot.rotation.z = 2.1;
      m.rightArmPivot.rotation.z = -0.4;
    } else if (Math.abs(p.vx) > 0.35) {
      const swing = Math.sin(p.animTime * 2.4) * 0.8;
      m.leftLegPivot.rotation.z = swing;
      m.rightLegPivot.rotation.z = -swing;
      m.leftArmPivot.rotation.z = -swing * 0.85;
      m.rightArmPivot.rotation.z = swing * 0.85;
    } else {
      m.leftLegPivot.rotation.z = 0;
      m.rightLegPivot.rotation.z = 0;
      m.leftArmPivot.rotation.z = 0;
      m.rightArmPivot.rotation.z = 0;
    }

    // Sync Enemies
    for (const e of engine.enemies) {
      let eg = this.enemyGroups.get(e.id);
      if (!eg) {
        eg = e.type === 'koopa' ? this.createKoopaModel(e.color) : this.createGoombaModel();
        this.enemyGroups.set(e.id, eg);
        this.dynamicGroup.add(eg.root);
      }
      if (!e.alive) {
        eg.root.visible = false;
        continue;
      }
      eg.root.visible = true;
      eg.root.position.set(e.x + e.w * 0.5, toWorldY(e.y + e.h), 0);
      if (e.flipped) {
        eg.body.rotation.x = Math.PI;
        eg.body.position.y = e.h;
      } else {
        eg.body.rotation.x = 0;
        eg.body.position.y = 0;
      }

      if (e.type === 'goomba') {
        if (e.squished) {
          eg.body.scale.set(1.2, 0.24, 1.2);
        } else {
          eg.body.scale.set(1, 1, 1);
          const waddle = Math.sin(engine.elapsed * 12 + e.animOffset) * 0.35;
          eg.footL.rotation.z = waddle;
          eg.footR.rotation.z = -waddle;
        }
      } else {
        eg.body.rotation.y = e.vx >= 0 ? 0 : Math.PI;
        if (e.shell) {
          eg.headGroup.visible = false;
          eg.footL.visible = false;
          eg.footR.visible = false;
          eg.shell.position.y = 0.44;
          if (e.shellSliding) {
            eg.shell.rotation.y += dt * 18;
          }
        } else {
          eg.headGroup.visible = true;
          eg.footL.visible = true;
          eg.footR.visible = true;
          eg.shell.position.y = 0.56;
          const waddle = Math.sin(engine.elapsed * 10 + e.animOffset) * 0.35;
          eg.footL.rotation.z = waddle;
          eg.footR.rotation.z = -waddle;
        }
      }
    }

    // Sync Piranha Plants
    for (const pir of engine.piranhas) {
      let pg = this.piranhaGroups.get(pir.id);
      if (!pg) {
        pg = this.createPiranhaModel();
        this.piranhaGroups.set(pir.id, pg);
        this.dynamicGroup.add(pg);
      }
      if (!pir.alive || pir.rise <= 0.04) {
        pg.visible = false;
      } else {
        pg.visible = true;
        pg.position.set(pir.x + 0.45, toWorldY(pir.baseY) - (1 - pir.rise) * pir.h, 0);
      }
    }

    // Sync Items
    const activeItemIds = new Set();
    engine.items.forEach((it, idx) => {
      if (!it._uid) it._uid = `${it.type}_${Math.round(it.x * 10)}_${idx}_${Date.now()}`;
      activeItemIds.add(it._uid);
      let ig = this.itemGroups.get(it._uid);
      if (!ig) {
        ig = this.createItemModel(it.type);
        this.itemGroups.set(it._uid, ig);
        this.dynamicGroup.add(ig);
      }
      ig.position.set(it.x + it.w * 0.5, toWorldY(it.y + it.h), 0);
      if (it.type === 'star' || it.type === 'flower') {
        ig.rotation.y = engine.elapsed * 3.2;
      }
    });
    for (const [uid, ig] of this.itemGroups.entries()) {
      if (!activeItemIds.has(uid)) {
        this.dynamicGroup.remove(ig);
        this.itemGroups.delete(uid);
      }
    }

    // Sync Fireballs (with live Sonic/Shader fireColor)
    const activeFireCol = daemonSupervisor.daemons.audioBeatSync.fireColor || '#f97316';
    while (this.fireballPool.length < engine.fireballs.length) {
      const fb = new THREE.Mesh(
        new THREE.SphereGeometry(0.22, 10, 10),
        new THREE.MeshStandardMaterial({ color: 0xf97316, emissive: 0xfacc15, emissiveIntensity: 0.9, roughness: 0.2 })
      );
      this.dynamicGroup.add(fb);
      this.fireballPool.push(fb);
    }
    this.fireballPool.forEach((mesh, idx) => {
      const fb = engine.fireballs[idx];
      if (!fb) {
        mesh.visible = false;
      } else {
        mesh.visible = true;
        mesh.material.color.set(fb.color || activeFireCol);
        mesh.material.emissive.set(fb.color || activeFireCol);
        mesh.position.set(fb.x + fb.w * 0.5, toWorldY(fb.y + fb.h * 0.5), 0);
      }
    });

    // Live Shader Bridge sync on interactive 3D coins & blocks
    if (daemonSupervisor.daemons.shaderBridge.enabled) {
      const sb = daemonSupervisor.daemons.shaderBridge.state;
      this.mats.coin.emissiveIntensity = THREE.MathUtils.clamp(0.2 + sb.emissiveBoost * 0.4, 0.05, 1.5);
      this.mats.qblock.emissiveIntensity = THREE.MathUtils.clamp(0.25 + sb.emissiveBoost * 0.3, 0.05, 1.2);
    }

    // Sync Particles
    while (this.particlePool.length < engine.particles.length) {
      const pm = new THREE.Mesh(
        new THREE.BoxGeometry(0.26, 0.26, 0.26),
        new THREE.MeshStandardMaterial({ color: 0xfb923c, roughness: 0.5 })
      );
      this.dynamicGroup.add(pm);
      this.particlePool.push(pm);
    }
    this.particlePool.forEach((mesh, idx) => {
      const pt = engine.particles[idx];
      if (!pt) {
        mesh.visible = false;
      } else {
        mesh.visible = true;
        mesh.position.set(pt.x, toWorldY(pt.y), 0);
        mesh.material.color.set(pt.color);
        mesh.rotation.x += dt * 8;
        mesh.rotation.y += dt * 8;
      }
    });

    // Update Shadow Light anchor near Mario
    this.keyLight.position.set(p.x + 10, 22, 16);
    this.keyLight.target.position.set(p.x + 2, 1, 0);

    // Smooth Damped 3D Camera Presets (aligned at spawn to avoid diagonal tilt)
    const focusX = p.x + (p.facing > 0 ? 1.8 : -0.6);
    const focusY = Math.max(1.8, toWorldY(p.y + p.h) + 1.3);

    let desiredX = focusX;
    let desiredY = 4.6;
    let desiredZ = 15.2;
    let lookX = focusX;
    let lookY = 2.8;

    if (this.cameraMode === 'side') {
      desiredX = engine.cameraX + Math.max(6, (engine.viewTiles || 22) * 0.45);
      desiredY = 5.0;
      desiredZ = 16.5;
      lookX = desiredX;
      lookY = 4.2;
    } else if (this.cameraMode === 'chase') {
      desiredX = focusX - 1.35;
      desiredY = focusY + 3.0;
      desiredZ = 13.6;
      lookX = focusX + 0.9;
      lookY = focusY - 0.35;
    } else if (this.cameraMode === 'hero') {
      desiredX = p.x - p.facing * 4.8;
      desiredY = focusY + 2.5;
      desiredZ = 9.8;
      lookX = p.x + p.facing * 3.5;
      lookY = focusY;
    }

    this.camPos.x = THREE.MathUtils.damp(this.camPos.x, desiredX, 6.5, dt);
    this.camPos.y = THREE.MathUtils.damp(this.camPos.y, desiredY, 5.5, dt);
    this.camPos.z = THREE.MathUtils.damp(this.camPos.z, desiredZ, 6.5, dt);

    this.camTarget.x = THREE.MathUtils.damp(this.camTarget.x, lookX, 8.0, dt);
    this.camTarget.y = THREE.MathUtils.damp(this.camTarget.y, lookY, 6.0, dt);

    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camTarget);

    this.renderer.render(this.scene, this.camera);
  }

  afterDraw(cb) {
    if (!this.glReady || !this.renderer || !this.isSoftwareGl) {
      requestAnimationFrame(cb);
      return;
    }
    const gl = this.renderer.getContext();
    if (gl && typeof gl.fenceSync === 'function') {
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          window.setTimeout(cb, 80);
        }
      };
      window.setTimeout(poll, 5);
    } else {
      window.setTimeout(cb, 80);
    }
  }

  dispose() {
    this.renderer?.dispose();
  }
}
