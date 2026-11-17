import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { CAD_PRESETS, buildAssemblyGroup } from './cad-presets.js';
import { daemonSupervisor, isSoftwareGlDevice } from './daemons.js';

export class LiquidCADApp {
  constructor(canvas) {
    this.canvas = canvas;
    this.isSoftwareGl = isSoftwareGlDevice();
    this.contextLost = false;
    this.active = false;
    this.glReady = false;
    this.glFailed = false;
    this.pendingSize = null;
    this.renderer = null;
    this.scene = null;
    this.controls = null;
    this.camera = new THREE.PerspectiveCamera(45, 16 / 10, 0.1, 120);
    this.camera.position.set(4.5, 3.6, 5.4);

    this.params = {
      scaleGlobal: 1.0,
      scaleX: 1.0,
      scaleY: 1.0,
      scaleZ: 1.0,
      explode: 0.0,
      detail: 24,
      spinMult: 1.0,
      wireframe: false
    };

    this.currentAssembly = CAD_PRESETS.hyperloop_turbine;
    this.assemblyGroup = null;
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
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.38;
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
      this.scene.background = new THREE.Color(0x060a12);
      this.scene.fog = new THREE.FogExp2(0x060a12, 0.02);

      const pmrem = new THREE.PMREMGenerator(this.renderer);
      this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      pmrem.dispose();

      this.controls = new OrbitControls(this.camera, this.canvas);
      this.controls.enableDamping = !this.isSoftwareGl;
      this.controls.dampingFactor = 0.07;
      this.controls.target.set(0, 1.85, 0);
      this.controls.minDistance = 2.0;
      this.controls.maxDistance = 22;

      // 3-Point Studio Lighting (calibrated so dark obsidian parts retain crisp edge separation)
      this.scene.add(new THREE.HemisphereLight(0xcbeafe, 0x1e293b, 0.95));

      const key = new THREE.DirectionalLight(0xfff5e4, 2.0);
      key.position.set(6, 10, 7);
      key.castShadow = !this.isSoftwareGl;
      key.shadow.mapSize.width = 1024;
      key.shadow.mapSize.height = 1024;
      key.shadow.bias = -0.0005;
      key.shadow.normalBias = 0.02;
      this.scene.add(key);

      const rim = new THREE.DirectionalLight(0x38bdf8, 1.1);
      rim.position.set(-7, 5, -6);
      this.scene.add(rim);

      // CAD Floor + Precision Grid (polygonOffset to prevent Z-fighting)
      const floorMat = new THREE.MeshStandardMaterial({
        color: 0x070b12,
        roughness: 0.42,
        metalness: 0.55
      });
      const floor = new THREE.Mesh(new THREE.CircleGeometry(18, 48), floorMat);
      floor.rotation.x = -Math.PI / 2;
      floor.receiveShadow = true;
      this.scene.add(floor);

      const grid = new THREE.GridHelper(24, 24, 0x38bdf8, 0x1e293b);
      grid.position.y = 0.015;
      grid.material.polygonOffset = true;
      grid.material.polygonOffsetFactor = -1;
      grid.material.polygonOffsetUnits = -1;
      this.scene.add(grid);

      this.glReady = true;
      this.rebuildAssembly();
      if (this.pendingSize) {
        this.resize(this.pendingSize[0], this.pendingSize[1]);
      }
      return true;
    } catch {
      this.glFailed = true;
      return false;
    }
  }

  setAssembly(assembly) {
    this.currentAssembly = assembly;
    this.rebuildAssembly();
  }

  rebuildAssembly() {
    if (!this.glReady || !this.scene) return;
    if (this.assemblyGroup) {
      this.scene.remove(this.assemblyGroup);
      this.assemblyGroup.traverse((obj) => {
        if (obj.isMesh) {
          obj.geometry.dispose();
          obj.material.dispose();
        }
      });
    }
    this.assemblyGroup = buildAssemblyGroup(this.currentAssembly, {
      detail: this.params.detail,
      wireframe: this.params.wireframe
    });
    this.scene.add(this.assemblyGroup);
  }

  resize(width, height) {
    if (width < 10 || height < 10) return;
    this.pendingSize = [width, height];
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    if (this.glReady && this.renderer) {
      this.renderer.setSize(width, height, false);
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
    const dt = Math.min(0.05, this.clock.getDelta());

    if (!this.contextLost && this.assemblyGroup) {
      const targetSX = this.params.scaleGlobal * this.params.scaleX;
      const targetSY = this.params.scaleGlobal * this.params.scaleY;
      const targetSZ = this.params.scaleGlobal * this.params.scaleZ;

      this.assemblyGroup.scale.x = THREE.MathUtils.damp(this.assemblyGroup.scale.x, targetSX, 12, dt);
      this.assemblyGroup.scale.y = THREE.MathUtils.damp(this.assemblyGroup.scale.y, targetSY, 12, dt);
      this.assemblyGroup.scale.z = THREE.MathUtils.damp(this.assemblyGroup.scale.z, targetSZ, 12, dt);

      const sb = daemonSupervisor.daemons.shaderBridge;
      this.assemblyGroup.children.forEach((mesh) => {
        const { basePos, explodeDir, spinSpeed } = mesh.userData;
        if (basePos && explodeDir) {
          mesh.position.x = basePos.x + explodeDir.x * this.params.explode;
          mesh.position.y = basePos.y + explodeDir.y * this.params.explode;
          mesh.position.z = basePos.z + explodeDir.z * this.params.explode;
        }
        if (spinSpeed) {
          mesh.rotation.y += spinSpeed * this.params.spinMult * dt;
        }
        if (sb.enabled && mesh.material && mesh.material.isMeshPhysicalMaterial) {
          if (mesh.userData.baseMetal === undefined) {
            mesh.userData.baseMetal = mesh.material.metalness;
            mesh.userData.baseRough = mesh.material.roughness;
            mesh.userData.baseEmissiveInt = mesh.material.emissiveIntensity;
          }
          mesh.material.metalness = THREE.MathUtils.clamp(mesh.userData.baseMetal + sb.state.metalnessOffset, 0, 1);
          mesh.material.roughness = THREE.MathUtils.clamp(mesh.userData.baseRough + sb.state.roughnessOffset, 0.04, 1);
          mesh.material.clearcoat = sb.state.clearcoat;
          mesh.material.emissiveIntensity = mesh.userData.baseEmissiveInt + sb.state.emissiveBoost;
        }
      });

      this.controls.update();
      this.renderer.render(this.scene, this.camera);
    }

    if (this.isSoftwareGl) {
      window.setTimeout(() => {
        if (this.active) this.rafId = requestAnimationFrame(this.tick);
      }, 65);
    } else {
      this.rafId = requestAnimationFrame(this.tick);
    }
  };
}
