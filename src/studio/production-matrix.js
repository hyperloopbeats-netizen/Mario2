import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { CAD_PRESETS, buildAssemblyGroup } from './cad-presets.js';
import { daemonSupervisor, isSoftwareGlDevice } from './daemons.js';
import { hybridMovement } from './hybrid-movement.js';
import { hybridScene } from './hybrid-scene.js';

const _mat4 = new THREE.Matrix4();
const _pos = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _scl = new THREE.Vector3();
const _targetColA = new THREE.Color();
const _targetColB = new THREE.Color();
const _targetBg = new THREE.Color();
const _targetFog = new THREE.Color();
const _targetGrid = new THREE.Color();

export class ProductionMatrixEngine {
  constructor() {
    this.isSoftwareGl = isSoftwareGlDevice();
    this.glReady = false;
    this.glFailed = false;
    this.exposure = 1.15;
    const self = this;
    this.renderer = {
      get toneMappingExposure() { return self.exposure; },
      set toneMappingExposure(v) { self.exposure = Number(v) || 1.15; }
    };
    this.camera = new THREE.PerspectiveCamera(45, 16 / 9, 0.1, 200);
    this.shotKeyColor = new THREE.Color(hybridScene.config.keyColor);
    this.shotRimColor = new THREE.Color(hybridScene.config.rimColor);

    this.layers = {
      cad: true,
      sun: true,
      mario: true,
      grid: true,
      promo: true
    };

    this.cameraMode = 'orbit';
    this.cadSpinBoost = 1.0;
    this.cadSpinCurrent = 1.0;
    this.cadScale = 1.0;
    this.elapsed = 0;
    this.pendingAssembly = CAD_PRESETS.hyperloop_turbine;
    this.pendingPromoTexture = null;
  }

  ensureGl() {
    if (this.glReady) return true;
    if (this.glFailed) return false;
    try {
      this.isSoftwareGl = isSoftwareGlDevice();
      this.offscreenCanvas = document.createElement('canvas');
      this.offscreenCanvas.width = 1280;
      this.offscreenCanvas.height = 720;

      const renderer = new THREE.WebGLRenderer({
        canvas: this.offscreenCanvas,
        antialias: !this.isSoftwareGl,
        preserveDrawingBuffer: true,
        powerPreference: 'high-performance'
      });
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = this.exposure;
      renderer.shadowMap.enabled = !this.isSoftwareGl;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.renderer = renderer;

      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(hybridScene.config.bgColor);
      this.scene.fog = new THREE.FogExp2(hybridScene.config.fogColor, hybridScene.config.fogDensity);

      const pmrem = new THREE.PMREMGenerator(this.renderer);
      this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      pmrem.dispose();

      // Unified Studio Lighting Rig
      this.hemi = new THREE.HemisphereLight(0x93c5fd, 0x090d16, 0.72);
      this.scene.add(this.hemi);

      this.keyLight = new THREE.DirectionalLight(hybridScene.config.keyColor, hybridScene.config.keyIntensity);
      this.keyLight.position.set(8, 12, 10);
      this.keyLight.castShadow = !this.isSoftwareGl;
      this.keyLight.shadow.mapSize.width = 1024;
      this.keyLight.shadow.mapSize.height = 1024;
      this.keyLight.shadow.bias = -0.0005;
      this.keyLight.shadow.normalBias = 0.02;
      this.scene.add(this.keyLight);

      this.rimLight = new THREE.DirectionalLight(hybridScene.config.rimColor, hybridScene.config.rimIntensity);
      this.rimLight.position.set(-8, 6, -8);
      this.scene.add(this.rimLight);

      this.initAntiAliasedFloor();
      this.initDigitalSun();
      this.initMarioHero();
      this.initPromoScreen();

      this.cadContainer = new THREE.Group();
      this.scene.add(this.cadContainer);
      this.glReady = true;
      this.setCadAssembly(this.pendingAssembly);
      if (this.pendingPromoTexture) this.setPromoMedia(this.pendingPromoTexture);
      return true;
    } catch {
      this.glFailed = true;
      return false;
    }
  }

  /**
   * Anti-aliased fwidth() analytical shader floor — eliminates wireframe aliasing & static shimmer.
   */
  initAntiAliasedFloor() {
    this.gridGroup = new THREE.Group();

    const floorGeo = new THREE.PlaneGeometry(80, 80, 1, 1);
    floorGeo.rotateX(-Math.PI / 2);

    this.floorShaderMat = new THREE.ShaderMaterial({
      uniforms: {
        u_time: { value: 0 },
        u_bgColor: { value: new THREE.Color(hybridScene.config.bgColor) },
        u_gridColor: { value: new THREE.Color(hybridScene.config.gridColor) },
        u_scale: { value: hybridScene.config.gridScale },
        u_moireClamp: { value: 1.0 },
        u_gridGlow: { value: 1.0 },
        u_beat: { value: 0.0 }
      },
      extensions: { derivatives: true },
      vertexShader: `
        varying vec3 vWorldPos;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        uniform float u_time;
        uniform vec3 u_bgColor;
        uniform vec3 u_gridColor;
        uniform float u_scale;
        uniform float u_moireClamp;
        uniform float u_gridGlow;
        uniform float u_beat;
        varying vec3 vWorldPos;

        float gridFactor(vec2 coord, float width, float moireClamp) {
          vec2 derivative = fwidth(coord);
          float maxDeriv = max(derivative.x, derivative.y);
          float moireFade = moireClamp > 0.5 ? (1.0 - smoothstep(0.18, 0.55, maxDeriv)) : 1.0;
          vec2 grid = abs(fract(coord - 0.5) - 0.5) / max(derivative, vec2(0.0001));
          float line = min(grid.x, grid.y);
          return (1.0 - min(line / width, 1.0)) * moireFade;
        }

        void main() {
          float dist = length(vWorldPos.xz);
          float fade = exp(-dist * 0.068);
          float pulse = 0.015 * max(0.0, sin(dist * 0.45 - u_time * 1.4)) * fade;

          float major = gridFactor(vWorldPos.xz / (u_scale * 2.0), 1.25, u_moireClamp);
          float minor = gridFactor(vWorldPos.xz / (u_scale * 0.5), 0.9, u_moireClamp) * 0.28;
          float radial = smoothstep(14.0, 0.0, dist) * 0.025;

          vec3 base = mix(u_bgColor, u_bgColor + vec3(0.006, 0.010, 0.018), radial);
          vec3 lineCol = u_gridColor * (major * 0.42 + minor * 0.20 + pulse + u_beat * 0.12 * major) * u_gridGlow;
          vec3 finalCol = mix(u_bgColor, base + lineCol, fade);
          gl_FragColor = vec4(finalCol, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `
    });

    this.floorMesh = new THREE.Mesh(floorGeo, this.floorShaderMat);
    this.floorMesh.receiveShadow = true;

    // Subtle soft contact shadow disc beneath centerpiece
    const contactMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.42,
      depthWrite: false
    });
    const contactDisc = new THREE.Mesh(new THREE.CircleGeometry(2.8, 40), contactMat);
    contactDisc.rotation.x = -Math.PI / 2;
    contactDisc.position.y = 0.01;

    this.gridGroup.add(this.floorMesh, contactDisc);
    this.scene.add(this.gridGroup);
  }

  initDigitalSun() {
    this.sunGroup = new THREE.Group();
    this.sunGroup.position.set(0, 5.2, -12.5);

    const sunMat = new THREE.ShaderMaterial({
      uniforms: {
        u_time: { value: 0 },
        u_colA: { value: new THREE.Color(hybridScene.config.sunColorA) },
        u_colB: { value: new THREE.Color(hybridScene.config.sunColorB) },
        u_beat: { value: 0.0 }
      },
      vertexShader: `
        varying vec3 vNorm;
        varying vec3 vPos;
        void main() {
          vNorm = normalize(normalMatrix * normal);
          vPos = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float u_time;
        uniform vec3 u_colA;
        uniform vec3 u_colB;
        uniform float u_beat;
        varying vec3 vNorm;
        varying vec3 vPos;
        void main() {
          float bands = sin(vPos.y * 4.0 - u_time * 1.4) * 0.5 + 0.5;
          float swirls = sin(vPos.x * 3.2 + u_time * 1.1) * cos(vPos.z * 3.2 - u_time * 0.9);
          float fresnel = pow(1.0 - clamp(abs(vNorm.z), 0.0, 1.0), 2.4);
          vec3 col = mix(u_colB, u_colA, smoothstep(0.0, 1.0, bands * 0.78 + swirls * 0.22));
          col += vec3(1.0, 0.88, 0.55) * fresnel * (0.65 + u_beat * 0.35);
          gl_FragColor = vec4(col, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `
    });
    this.sunCore = new THREE.Mesh(new THREE.SphereGeometry(2.1, 36, 28), sunMat);
    this.sunMat = sunMat;

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(3.05, 0.045, 14, 72),
      new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.42 })
    );
    ring.rotation.x = 1.18;
    this.sunRing = ring;

    // 96 smooth orbital sphere motes (replaces noisy static octahedron scatter)
    const moteCount = 96;
    this.moteCount = moteCount;
    this.motes = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.055, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xbae6fd, transparent: true, opacity: 0.72 }),
      moteCount
    );
    this.motes.frustumCulled = false;
    this.moteSeeds = Array.from({ length: moteCount }, (_, i) => ({
      radius: 3.4 + (i % 8) * 0.72,
      speed: 0.16 + (i % 5) * 0.045,
      angle: (i / moteCount) * Math.PI * 2,
      yOff: Math.sin(i * 0.7) * 1.65
    }));

    this.sunGroup.add(this.sunCore, ring, this.motes);
    this.scene.add(this.sunGroup);
  }

  initMarioHero() {
    const root = new THREE.Group();
    root.position.set(0, 0, 1.4);

    const matRed = new THREE.MeshStandardMaterial({ color: 0xe52521, roughness: 0.42 });
    const matBlue = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.55 });
    const matSkin = new THREE.MeshStandardMaterial({ color: 0xffcc99, roughness: 0.6 });
    const matHair = new THREE.MeshStandardMaterial({ color: 0x5c2c0b, roughness: 0.78 });
    const matWhite = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35 });

    const legL = new THREE.Group();
    legL.position.set(0, 0.6, -0.14);
    const legLMesh = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.45, 0.22), matBlue);
    legLMesh.position.y = -0.22;
    const bootL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.24), matHair);
    bootL.position.set(0.04, -0.48, 0);
    legL.add(legLMesh, bootL);

    const legR = new THREE.Group();
    legR.position.set(0, 0.6, 0.14);
    const legRMesh = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.45, 0.22), matBlue);
    legRMesh.position.y = -0.22;
    const bootR = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.24), matHair);
    bootR.position.set(0.04, -0.48, 0);
    legR.add(legRMesh, bootR);

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.54, 0.5), matBlue);
    torso.position.y = 0.88;
    const shirt = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.32, 0.52), matRed);
    shirt.position.y = 1.0;

    const armL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.4, 0.18), matRed);
    armL.position.set(0, 0.92, -0.35);
    const armR = armL.clone();
    armR.position.z = 0.35;

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 14), matSkin);
    head.position.y = 1.42;
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), matRed);
    cap.position.y = 1.5;
    const badge = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.04, 14), matWhite);
    badge.rotation.z = Math.PI / 2;
    badge.position.set(0.26, 1.62, 0);

    root.add(legL, legR, torso, shirt, armL, armR, head, cap, badge);
    root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    this.marioHero = { root, legL, legR, armL, armR };
    this.scene.add(root);
  }

  initPromoScreen() {
    this.promoGroup = new THREE.Group();
    this.promoGroup.position.set(3.4, 2.2, -1.6);
    this.promoGroup.rotation.y = -0.38;

    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(3.6, 2.15, 0.12),
      new THREE.MeshPhysicalMaterial({ color: 0x0b0f17, metalness: 0.85, roughness: 0.15, clearcoat: 1.0 })
    );
    frame.castShadow = true;

    const fallbackCanvas = document.createElement('canvas');
    fallbackCanvas.width = 640;
    fallbackCanvas.height = 360;
    const fctx = fallbackCanvas.getContext('2d');
    const grad = fctx.createLinearGradient(0, 0, 640, 360);
    grad.addColorStop(0, '#090d16');
    grad.addColorStop(1, '#172554');
    fctx.fillStyle = grad;
    fctx.fillRect(0, 0, 640, 360);
    fctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
    fctx.lineWidth = 4;
    fctx.strokeRect(18, 18, 604, 324);
    fctx.fillStyle = '#f8fafc';
    fctx.font = 'bold 34px Outfit, sans-serif';
    fctx.fillText('BLACK GLASS STUDIO', 46, 175);
    fctx.fillStyle = '#94a3b8';
    fctx.font = '18px monospace';
    fctx.fillText('UPLOAD PROMO IMAGE OR VIDEO TO PROJECT', 46, 218);

    this.promoDefaultTex = new THREE.CanvasTexture(fallbackCanvas);
    this.promoDefaultTex.colorSpace = THREE.SRGBColorSpace;

    this.promoScreenMat = new THREE.MeshBasicMaterial({ map: this.promoDefaultTex });
    this.promoScreenMesh = new THREE.Mesh(new THREE.PlaneGeometry(3.36, 1.9), this.promoScreenMat);
    this.promoScreenMesh.position.z = 0.07;

    this.promoGroup.add(frame, this.promoScreenMesh);
    this.scene.add(this.promoGroup);
  }

  setPromoMedia(texture) {
    this.pendingPromoTexture = texture;
    if (!this.glReady || !this.promoScreenMat) return;
    if (texture) {
      texture.colorSpace = THREE.SRGBColorSpace;
      this.promoScreenMat.map = texture;
    } else {
      this.promoScreenMat.map = this.promoDefaultTex;
    }
    this.promoScreenMat.needsUpdate = true;
  }

  setCadAssembly(assembly) {
    this.pendingAssembly = assembly || CAD_PRESETS.hyperloop_turbine;
    if (!this.glReady || !this.cadContainer) return;
    while (this.cadContainer.children.length > 0) {
      const child = this.cadContainer.children[0];
      this.cadContainer.remove(child);
      daemonSupervisor.disposeObject3D(child);
    }
    this.cadGroup = buildAssemblyGroup(this.pendingAssembly, { detail: 24 });
    this.cadContainer.add(this.cadGroup);
  }

  setOutputResolution(width, height) {
    if (!this.glReady || !this.offscreenCanvas) return;
    if (this.offscreenCanvas.width !== width || this.offscreenCanvas.height !== height) {
      this.renderer.setSize(width, height, false);
      this.camera.aspect = width / Math.max(1, height);
      this.camera.updateProjectionMatrix();
    }
  }

  applyShotConfig(shot) {
    if (!shot) return;
    this.layers.cad = Boolean(shot.enableCad);
    this.layers.sun = Boolean(shot.enableSun);
    this.layers.mario = Boolean(shot.enableMario);
    this.layers.grid = Boolean(shot.enableGrid);
    this.layers.promo = Boolean(shot.enablePromo);
    this.cameraMode = shot.camera || 'orbit';
    this.cadSpinBoost = Number(shot.cadSpinBoost || 1.0);
    if (shot.keyColor) this.shotKeyColor.set(shot.keyColor);
    if (shot.rimColor) this.shotRimColor.set(shot.rimColor);
  }

  renderToCanvas(targetCanvas, rawDt = 1 / 60, fullHd = false, isExporting = false, exportFps = 30) {
    if (!this.ensureGl()) return;
    const outW = fullHd ? 1920 : Math.max(640, targetCanvas.width || 1280);
    const outH = fullHd ? 1080 : Math.max(360, targetCanvas.height || 720);
    this.setOutputResolution(outW, outH);

    // Daemon 1: Smooth or Lockstep Delta Time
    const dt = daemonSupervisor.paceDelta(rawDt, isExporting, exportFps);
    this.elapsed += dt;
    const t = this.elapsed;

    // Synchronize Hybrid Scene Designer atmosphere & lighting smoothly (Daemon 4)
    const sc = hybridScene.config;
    const lerpAlpha = daemonSupervisor.daemons.atmosphereDaemon.enabled
      ? 1 - Math.exp(-3.5 * dt)
      : 1.0;

    _targetBg.set(sc.bgColor);
    _targetFog.set(sc.fogColor);
    _targetGrid.set(sc.gridColor);
    _targetColA.set(sc.sunColorA);
    _targetColB.set(sc.sunColorB);

    this.scene.background.lerp(_targetBg, lerpAlpha);
    this.scene.fog.color.lerp(_targetFog, lerpAlpha);
    this.scene.fog.density = THREE.MathUtils.damp(this.scene.fog.density, sc.fogDensity, 4, dt);

    this.keyLight.color.lerp(this.shotKeyColor, lerpAlpha);
    this.keyLight.intensity = THREE.MathUtils.damp(this.keyLight.intensity, sc.keyIntensity, 4, dt);
    this.keyLight.position.y = sc.keyElevation;
    this.rimLight.color.lerp(this.shotRimColor, lerpAlpha);
    this.rimLight.intensity = THREE.MathUtils.damp(this.rimLight.intensity, sc.rimIntensity, 4, dt);

    this.floorShaderMat.uniforms.u_time.value = t;
    this.floorShaderMat.uniforms.u_bgColor.value.copy(this.scene.background);
    this.floorShaderMat.uniforms.u_gridColor.value.lerp(_targetGrid, lerpAlpha);
    this.floorShaderMat.uniforms.u_scale.value = sc.gridScale;
    this.floorShaderMat.uniforms.u_moireClamp.value = daemonSupervisor.daemons.horizonMoireGuard.enabled ? 1.0 : 0.0;

    const beat = daemonSupervisor.decayBeat(dt);
    const sb = daemonSupervisor.daemons.shaderBridge;
    this.floorShaderMat.uniforms.u_gridGlow.value = sb.enabled ? sb.state.gridGlow : 1.0;
    this.floorShaderMat.uniforms.u_beat.value = beat;

    // Layer visibility
    this.cadContainer.visible = this.layers.cad;
    this.sunGroup.visible = this.layers.sun;
    this.marioHero.root.visible = this.layers.mario;
    this.gridGroup.visible = this.layers.grid;
    this.promoGroup.visible = this.layers.promo;

    // Stage Anchor Positions from Hybrid Scene Designer
    this.cadContainer.position.set(sc.cadPos[0], hybridMovement.getCadHarmonicOffset(t, dt), sc.cadPos[1]);
    this.promoGroup.position.set(sc.promoPos[0], 2.2 + Math.sin(t * 0.7) * 0.08, sc.promoPos[1]);

    // Smoothly damped CAD rotation & Shader Bridge live material sync
    this.cadSpinCurrent = THREE.MathUtils.damp(this.cadSpinCurrent, this.cadSpinBoost, 5, dt);
    if (this.cadGroup && this.layers.cad) {
      this.cadContainer.scale.setScalar(this.cadScale);
      this.cadGroup.children.forEach((mesh) => {
        if (mesh.userData.spinSpeed) {
          mesh.rotation.y += mesh.userData.spinSpeed * this.cadSpinCurrent * dt;
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
          mesh.material.emissiveIntensity = mesh.userData.baseEmissiveInt + sb.state.emissiveBoost + beat * 0.25;
        }
      });
    }

    // Smooth Digital Sun & Orbital Motes
    if (this.layers.sun) {
      this.sunGroup.scale.setScalar(sc.sunScale * (1 + beat * 0.04));
      this.sunMat.uniforms.u_time.value = t * sc.sunSpeed;
      this.sunMat.uniforms.u_colA.value.lerp(_targetColA, lerpAlpha);
      this.sunMat.uniforms.u_colB.value.lerp(_targetColB, lerpAlpha);
      this.sunMat.uniforms.u_beat.value = beat;
      this.sunRing.rotation.z = t * 0.35;
      for (let i = 0; i < this.moteCount; i++) {
        const s = this.moteSeeds[i];
        const a = s.angle + t * s.speed;
        _pos.set(Math.cos(a) * s.radius, s.yOff + Math.sin(t * 1.1 + i * 0.35) * 0.22, Math.sin(a) * s.radius);
        _scl.setScalar((0.85 + 0.25 * Math.sin(t * 1.5 + i)) * (1 + beat * 0.2));
        _mat4.compose(_pos, _quat, _scl);
        this.motes.setMatrixAt(i, _mat4);
      }
      this.motes.instanceMatrix.needsUpdate = true;
    }

    // Daemon 3 + Daemon 7 + Hybrid Movement Engine: Fluid Mario Hero Rig Locomotion with CAD Collision Guard
    if (this.layers.mario) {
      hybridMovement.updateMarioRig(this.marioHero, t, dt, sc.marioPos[0], sc.marioPos[1], sc.cadPos[0], sc.cadPos[1]);
    }

    // Daemon 2 + Daemon 8: Catmull-Rom Stabilized Camera Choreography + Solar Framing Guard
    daemonSupervisor.evaluateCamera(
      this.camera,
      this.cameraMode,
      t,
      dt,
      hybridMovement.config.cameraLag,
      this.marioHero.root.position,
      this.sunGroup.position
    );

    this.renderer.render(this.scene, this.camera);

    const ctx = targetCanvas.getContext('2d');
    if (ctx && targetCanvas.width > 0 && targetCanvas.height > 0) {
      ctx.drawImage(this.offscreenCanvas, 0, 0, targetCanvas.width, targetCanvas.height);
    }
  }
}
