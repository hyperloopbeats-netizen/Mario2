import * as THREE from 'three';

const _targetVec = new THREE.Vector3();

let _cachedSoftwareGl = null;
export function isSoftwareGlDevice() {
  if (_cachedSoftwareGl !== null) return _cachedSoftwareGl;
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    if (!gl) {
      _cachedSoftwareGl = true;
      return true;
    }
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    _cachedSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    _cachedSoftwareGl = false;
  }
  return _cachedSoftwareGl;
}

/**
 * Second-order damped spring solver for physical motion continuity.
 */
export class SpringDamper {
  constructor(initial = 0, stiffness = 120, damping = 16) {
    this.position = initial;
    this.velocity = 0;
    this.target = initial;
    this.stiffness = stiffness;
    this.damping = damping;
  }

  step(dt, target = this.target) {
    this.target = target;
    const clampedDt = Math.min(0.033, Math.max(0.0005, dt));
    const substeps = clampedDt > 0.017 ? 2 : 1;
    const h = clampedDt / substeps;
    for (let i = 0; i < substeps; i++) {
      const force = -this.stiffness * (this.position - this.target);
      const damp = -this.damping * this.velocity;
      this.velocity += (force + damp) * h;
      this.position += this.velocity * h;
    }
    return this.position;
  }

  snap(value) {
    this.position = value;
    this.target = value;
    this.velocity = 0;
  }
}

/**
 * 26 Engine Daemons (6 Core + 10 Arcade/Studio Daemons + 10 Titanfall/Sentient Upgrade Daemons):
 * Temporal pacing, camera rails, CAD collision avoidance, solar framing,
 * horizon moire guard, mobile viewport scaling, thumbstick haptics,
 * ballistic fire solver, live shader bridge, audio beat sync, world seed streaming,
 * AI quota guard, Titanfall wallrun magnet, Source slide-hop & air-strafe,
 * grapple pendulum, orbital Titanfall drop, procedural PBR skin forge,
 * diegetic Titan cockpit HUD, rodeo battery bus, vortex projectile catch,
 * sentient mesh design bus, and Frontier AI director.
 */
export class DaemonSupervisor {
  constructor() {
    this.daemons = {
      // --- 6 Core Daemons ---
      framePacer: {
        id: 'framePacer',
        name: 'Temporal Frame Pacer',
        desc: 'Lockstep delta smoothing & zero-drop 1080p export clock',
        enabled: true,
        smoothedDt: 1 / 60,
        fps: 60
      },
      cameraStabilizer: {
        id: 'cameraStabilizer',
        name: 'Catmull-Rom Camera Stabilizer',
        desc: 'Spline rail interpolation & exponential cross-shot damping',
        enabled: true,
        blendFactor: 1.0,
        lastShotSwitchTime: 0
      },
      kinematicsSolver: {
        id: 'kinematicsSolver',
        name: 'Spring Kinematics & Gait Solver',
        desc: '2nd-order hip/arm spring rig & harmonic CAD breathing',
        enabled: true
      },
      atmosphereDaemon: {
        id: 'atmosphereDaemon',
        name: 'Anti-Static Shader & Atmosphere',
        desc: 'fwidth() grid filtering, horizon fog & 3-point light lerp',
        enabled: true
      },
      resourceWatchdog: {
        id: 'resourceWatchdog',
        name: 'WebGL Watchdog & GC Guard',
        desc: 'GPU geometry disposal & dynamic 1080p buffer balancing',
        enabled: true,
        disposedCount: 0
      },
      systemBus: {
        id: 'systemBus',
        name: 'Unified System Sync Bus',
        desc: 'Real-time state link across all OS apps & Triad generators',
        enabled: true,
        syncTicks: 0
      },

      // --- 10 New Upgrade Daemons ---
      collisionAvoidance: {
        id: 'collisionAvoidance',
        name: 'Spatial CAD Collision Guard',
        desc: 'Signed-distance repulsion keeps Hero Rig clear of CAD core',
        enabled: true,
        clearanceRadius: 2.35
      },
      solarFraming: {
        id: 'solarFraming',
        name: 'Solar Eclipse & Framing Guard',
        desc: 'Prevents camera rails from clipping into the Digital Sun sphere',
        enabled: true,
        minSunDistance: 5.6
      },
      horizonMoireGuard: {
        id: 'horizonMoireGuard',
        name: 'Horizon Moiré & fwidth Clamp',
        desc: 'Attenuates grazing-angle grid derivatives for obsidian contrast',
        enabled: true
      },
      mobileViewportScaler: {
        id: 'mobileViewportScaler',
        name: 'Mobile Aspect & Safe-Zone Scaler',
        desc: 'Auto-adapts 2D/3D viewTiles and HUD clearance on portrait displays',
        enabled: true,
        viewTiles: 22
      },
      thumbstickHaptics: {
        id: 'thumbstickHaptics',
        name: 'Dual-Stick Curve & Haptics',
        desc: 'Radial deadzone shaping, sprint threshold & touch micro-vibe',
        enabled: true,
        deadzone: 0.14
      },
      ballisticSolver: {
        id: 'ballisticSolver',
        name: 'Aimed Ballistic Fire Solver',
        desc: '360° vector fireball launch, wall ricochet & hit-stop pulse',
        enabled: true,
        hitStop: 0
      },
      shaderBridge: {
        id: 'shaderBridge',
        name: 'Live PBR Shader Bridge',
        desc: 'Streams Shader Lab metalness, roughness & emissive across 3D rigs',
        enabled: true,
        state: {
          metalnessOffset: 0,
          roughnessOffset: 0,
          clearcoat: 0.45,
          emissiveBoost: 0,
          gridGlow: 1.0
        }
      },
      audioBeatSync: {
        id: 'audioBeatSync',
        name: 'Sonic Beat & FX Sync',
        desc: 'Couples chiptune synth beat envelope to solar glow & particles',
        enabled: true,
        beatPulse: 0,
        fireColor: '#f97316'
      },
      worldSeedStream: {
        id: 'worldSeedStream',
        name: 'Procedural World Streamer',
        desc: 'Validates & hot-swaps World Forge layouts into Mario 2D/3D',
        enabled: true,
        customWorldsBuilt: 0
      },
      aiQuotaGuard: {
        id: 'aiQuotaGuard',
        name: 'AI Queue & Rate-Limit Guard',
        desc: 'Debounces concurrent AI prompts & formats clean quota recovery',
        enabled: true,
        inFlight: false,
        cooldownUntil: 0
      },

      // --- 10 New Titanfall 2, Authentic Skin & Sentient Design Daemons ---
      wallrunPhysics: {
        id: 'wallrunPhysics',
        name: 'Titanfall Wallrun & Magnet Solver',
        desc: 'Surface normal latching, ±14° camera roll & wall-kick boost impulses',
        enabled: true,
        wallSpeed: 17.5,
        tiltDeg: 14.0,
        kickUp: 11.8,
        kickOut: 11.2
      },
      slideHopMomentum: {
        id: 'slideHopMomentum',
        name: 'Source Slide-Hop & Air-Strafe Clock',
        desc: 'Low-friction slide boost, bunnyhop momentum & Source air-accel',
        enabled: true,
        slideImpulse: 18.5,
        airAccel: 14.0,
        slideFriction: 0.96
      },
      grapplePendulum: {
        id: 'grapplePendulum',
        name: 'Grapple Tether & Pendulum Solver',
        desc: 'Elastic winch tension curve, swing arc assist & Titan reel-in',
        enabled: true,
        pullStrength: 44.0,
        maxRange: 44.0
      },
      titanfallDrop: {
        id: 'titanfallDrop',
        name: 'Orbital Titanfall Entry & Shockwave',
        desc: 'Atmospheric drop-pod trajectory, Dome Shield & radial blast impact',
        enabled: true,
        dropSpeed: 74.0,
        domeDuration: 6.5
      },
      pbrTextureForge: {
        id: 'pbrTextureForge',
        name: 'Procedural PBR Skin & Decal Forge',
        desc: 'Generates BT-7274 SRS, IMC, RED/BLU camo, metalness & wear maps',
        enabled: true,
        wearLevel: 0.35,
        texturesForged: 0
      },
      cockpitDiegeticHud: {
        id: 'cockpitDiegeticHud',
        name: 'Titan Cockpit & Embark Bridge',
        desc: 'Diegetic chassis canopy struts, core FOV ramp & Embark/Eject blend',
        enabled: true,
        fovSpring: 76
      },
      rodeoBatteryBus: {
        id: 'rodeoBatteryBus',
        name: 'Titan Rodeo & Battery Shield Bus',
        desc: 'Pilot hull magnet rodeo, green battery pull & +2000 shield transfer',
        enabled: true,
        stealsCount: 0
      },
      vortexProjectileCatch: {
        id: 'vortexProjectileCatch',
        name: 'Vortex & Ballistic Reflector',
        desc: 'Catches incoming shells in Ion Vortex / Pyro Airblast cone & reflects',
        enabled: true,
        reflectedCount: 0
      },
      sentientMeshSync: {
        id: 'sentientMeshSync',
        name: 'Sentient App Mesh-Design Bus',
        desc: 'Routes live Architect, Skin, Rig & Physics blueprints across engines',
        enabled: true,
        packetsRouted: 0
      },
      frontierAiDirector: {
        id: 'frontierAiDirector',
        name: 'Frontier Attrition & Bot Director',
        desc: 'Orchestrates wallrunning AI Pilots, Grunt squads, Titans & Evac ship',
        enabled: true,
        aggression: 0.78,
        wavesDispatched: 0
      },

      // --- 10 New Hyper-Awareness Thought Cloud & Level Generator Daemons ---
      thoughtCloudParser: {
        id: 'thoughtCloudParser',
        name: 'Hyper-Awareness Thought Parser',
        desc: 'Decodes single-input prompts into gravity, time, chaos & biome vectors',
        enabled: true,
        thoughtsProcessed: 0
      },
      hyperAwarenessMatrix: {
        id: 'hyperAwarenessMatrix',
        name: 'Internal Hyper-Awareness Matrix',
        desc: 'Live cross-game state graph linking Mario, TF3D, Titanfall 2 & CAD',
        enabled: true,
        coherence: 1.0
      },
      frontierLevelArchitect: {
        id: 'frontierLevelArchitect',
        name: 'Frontier Parkour Level Architect',
        desc: 'Procedural wallrun corridors, rooftops, zip pads & Titan chokepoints',
        enabled: true,
        levelsBuilt: 0
      },
      fortressArenaBuilder: {
        id: 'fortressArenaBuilder',
        name: 'Fortress Symmetry Arena Builder',
        desc: 'Mirrored RED/BLU battlements, bridges, sniper towers & KOTH spires',
        enabled: true,
        arenasBuilt: 0
      },
      marioTileTopology: {
        id: 'marioTileTopology',
        name: 'Mario Topology & Verticality Gen',
        desc: 'Syncs pit-safe platform elevation & coin arcs from Thought Cloud',
        enabled: true
      },
      biomeAtmosphereMutator: {
        id: 'biomeAtmosphereMutator',
        name: 'Cross-Engine Sky & Fog Mutator',
        desc: 'Live-rewrites WebGL sky, fog, sun & rim lighting across playing games',
        enabled: true
      },
      realityRuleOverwriter: {
        id: 'realityRuleOverwriter',
        name: 'Live Ruleset & Time-Warp Solver',
        desc: 'Mutates live gravity, timeScale, fire rate & speed mid-match',
        enabled: true,
        timeScale: 1.0
      },
      proceduralPropPopulator: {
        id: 'proceduralPropPopulator',
        name: 'Cover, Jump-Pad & Battery Placer',
        desc: 'Scatters tactical cover, jump pads, medkits & Green Batteries safely',
        enabled: true
      },
      crossGamePortalSync: {
        id: 'crossGamePortalSync',
        name: 'Cross-Game Level & CAD Link',
        desc: 'Projects active level layouts & CAD monuments across every viewport',
        enabled: true
      },
      cognitiveMutationGuard: {
        id: 'cognitiveMutationGuard',
        name: 'Safe Live-Mutation & Nav Guard',
        desc: 'Clamps extreme physics warps & spawn clearance to avoid soft-locks',
        enabled: true,
        clampedCount: 0
      }
    };

    this.listeners = new Set();
    this.camPos = new THREE.Vector3(0, 4.2, 10.5);
    this.camTarget = new THREE.Vector3(0, 2.0, 0);
    this.fovSpring = new SpringDamper(45, 90, 18);

    // Safe closed spline rails kept clear of Digital Sun at (0, 5.2, -12.5)
    this.orbitRail = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 3.8, 9.2),
      new THREE.Vector3(7.6, 4.2, 4.6),
      new THREE.Vector3(7.4, 3.8, -3.4),
      new THREE.Vector3(0, 4.8, -5.2),
      new THREE.Vector3(-7.4, 4.0, -3.2),
      new THREE.Vector3(-7.6, 3.7, 4.8)
    ], true, 'catmullrom', 0.5);

    this.sweepRail = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-8.5, 4.8, 7.6),
      new THREE.Vector3(-3.2, 3.4, 9.6),
      new THREE.Vector3(3.4, 3.5, 9.4),
      new THREE.Vector3(8.6, 5.0, 7.0),
      new THREE.Vector3(4.5, 5.6, 3.2),
      new THREE.Vector3(-4.2, 5.4, 3.4)
    ], true, 'catmullrom', 0.5);
  }

  onChange(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  emit(eventType, payload) {
    if (!this.daemons.systemBus.enabled) return;
    this.daemons.systemBus.syncTicks++;
    this.listeners.forEach((fn) => fn(eventType, payload));
  }

  toggleDaemon(id, enabled) {
    if (this.daemons[id]) {
      this.daemons[id].enabled = Boolean(enabled);
      this.emit('daemon-toggle', { id, enabled: this.daemons[id].enabled });
    }
  }

  getList() {
    return Object.values(this.daemons);
  }

  /**
   * Daemon 1: Temporal Frame Pacer
   */
  paceDelta(rawDt, isExporting = false, exportFps = 30) {
    if (isExporting) {
      const fixed = 1 / Math.max(24, exportFps);
      this.daemons.framePacer.smoothedDt = fixed;
      this.daemons.framePacer.fps = exportFps;
      return fixed;
    }

    const safeDt = Math.min(0.05, Math.max(0.001, rawDt));
    if (!this.daemons.framePacer.enabled) {
      this.daemons.framePacer.smoothedDt = safeDt;
      this.daemons.framePacer.fps = Math.round(1 / safeDt);
      return safeDt;
    }

    this.daemons.framePacer.smoothedDt =
      this.daemons.framePacer.smoothedDt * 0.82 + safeDt * 0.18;
    this.daemons.framePacer.fps = Math.round(1 / Math.max(0.004, this.daemons.framePacer.smoothedDt));
    return this.daemons.framePacer.smoothedDt;
  }

  /**
   * Daemon 7: Spatial CAD Collision Guard
   * Keeps dynamic actors smoothly deflected outside the CAD centerpiece radius.
   */
  avoidCadCollision(vec, cadX = 0, cadZ = 0) {
    if (!this.daemons.collisionAvoidance.enabled) return vec;
    const minR = this.daemons.collisionAvoidance.clearanceRadius;
    const dx = vec.x - cadX;
    const dz = vec.z - cadZ;
    const dist = Math.hypot(dx, dz);
    if (dist < minR) {
      const angle = dist > 0.001 ? Math.atan2(dz, dx) : 0.7;
      vec.x = cadX + Math.cos(angle) * minR;
      vec.z = cadZ + Math.sin(angle) * minR;
    }
    return vec;
  }

  /**
   * Daemon 2 + Daemon 8: Catmull-Rom Camera Stabilizer + Solar Framing Guard
   */
  evaluateCamera(camera, mode, t, dt, lagFactor = 0.65, heroFocusPos = null, sunPos = null) {
    let desiredX = 0;
    let desiredY = 3.8;
    let desiredZ = 9.0;
    let lookX = 0;
    let lookY = 2.0;
    let lookZ = 0;
    let desiredFov = 45;

    if (mode === 'orbit') {
      const u = (t * 0.045) % 1;
      this.orbitRail.getPointAt(u, _targetVec);
      desiredX = _targetVec.x;
      desiredY = _targetVec.y;
      desiredZ = _targetVec.z;
    } else if (mode === 'dolly') {
      const wave = 0.5 - 0.5 * Math.cos(t * 0.55);
      desiredX = Math.sin(t * 0.28) * 1.65;
      desiredY = 2.55 + Math.sin(t * 0.36) * 0.45;
      desiredZ = 11.4 - wave * 4.4;
      lookY = 2.05;
      desiredFov = 43 + wave * 3;
    } else if (mode === 'crane') {
      const rise = 0.5 - 0.5 * Math.cos(t * 0.48);
      desiredX = Math.sin(t * 0.32) * 4.5;
      desiredY = 2.1 + rise * 4.6;
      desiredZ = 9.4 - rise * 1.4;
      lookY = 1.9 + rise * 0.3;
    } else if (mode === 'hero') {
      const hx = heroFocusPos ? heroFocusPos.x : -2.2;
      const hz = heroFocusPos ? heroFocusPos.z : 1.6;
      desiredX = hx - 2.4 + Math.sin(t * 0.42) * 1.4;
      desiredY = 2.35 + Math.sin(t * 0.6) * 0.25;
      desiredZ = Math.max(4.5, hz + 5.0);
      lookX = hx * 0.65;
      lookY = 1.45;
      lookZ = hz * 0.65;
      desiredFov = 42;
    } else if (mode === 'sweep') {
      const u = (t * 0.055) % 1;
      this.sweepRail.getPointAt(u, _targetVec);
      desiredX = _targetVec.x;
      desiredY = _targetVec.y;
      desiredZ = _targetVec.z;
      desiredFov = 47;
    }

    // Daemon 8: Solar Framing Guard — keep camera out of Sun sphere
    if (this.daemons.solarFraming.enabled && sunPos) {
      const sdx = desiredX - sunPos.x;
      const sdy = desiredY - sunPos.y;
      const sdz = desiredZ - sunPos.z;
      const sDist = Math.hypot(sdx, sdy, sdz);
      const minSun = this.daemons.solarFraming.minSunDistance;
      if (sDist < minSun && sDist > 0.001) {
        const push = minSun / sDist;
        desiredX = sunPos.x + sdx * push;
        desiredY = sunPos.y + sdy * push;
        desiredZ = Math.max(sunPos.z + minSun, sunPos.z + sdz * push);
      }
    }

    if (!this.daemons.cameraStabilizer.enabled) {
      this.camPos.set(desiredX, desiredY, desiredZ);
      this.camTarget.set(lookX, lookY, lookZ);
      camera.fov = desiredFov;
      camera.updateProjectionMatrix();
      camera.position.copy(this.camPos);
      camera.lookAt(this.camTarget);
      return;
    }

    const lambda = THREE.MathUtils.lerp(7.5, 2.2, Math.min(1, Math.max(0, lagFactor)));
    this.camPos.x = THREE.MathUtils.damp(this.camPos.x, desiredX, lambda, dt);
    this.camPos.y = THREE.MathUtils.damp(this.camPos.y, desiredY, lambda, dt);
    this.camPos.z = THREE.MathUtils.damp(this.camPos.z, desiredZ, lambda, dt);

    this.camTarget.x = THREE.MathUtils.damp(this.camTarget.x, lookX, lambda * 1.25, dt);
    this.camTarget.y = THREE.MathUtils.damp(this.camTarget.y, lookY, lambda * 1.25, dt);
    this.camTarget.z = THREE.MathUtils.damp(this.camTarget.z, lookZ, lambda * 1.25, dt);

    const fov = this.fovSpring.step(dt, desiredFov);
    if (Math.abs(camera.fov - fov) > 0.05) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }

    camera.position.copy(this.camPos);
    camera.lookAt(this.camTarget);
  }

  /**
   * Daemon 11: Dual-Stick Radial Deadzone & Response Curve
   */
  filterThumbstick(nx, ny) {
    const mag = Math.hypot(nx, ny);
    if (!this.daemons.thumbstickHaptics.enabled) {
      return { x: Math.max(-1, Math.min(1, nx)), y: Math.max(-1, Math.min(1, ny)), mag: Math.min(1, mag) };
    }
    const dz = this.daemons.thumbstickHaptics.deadzone;
    if (mag < dz) return { x: 0, y: 0, mag: 0 };
    const normMag = Math.min(1, (mag - dz) / (1 - dz));
    const curved = normMag * normMag * 0.35 + normMag * 0.65;
    const scale = curved / Math.max(0.0001, mag);
    return { x: nx * scale, y: ny * scale, mag: curved };
  }

  triggerHaptic(ms = 10) {
    if (!this.daemons.thumbstickHaptics.enabled) return;
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try { navigator.vibrate(ms); } catch { /* ignore */ }
    }
  }

  /**
   * Daemon 12: Aimed Ballistic Fire Solver
   */
  computeBallisticVector(aimX, aimY, facing) {
    if (!this.daemons.ballisticSolver.enabled) {
      return { vx: facing * 15.5, vy: 3.2 };
    }
    const len = Math.hypot(aimX, aimY);
    if (len < 0.2) {
      return { vx: facing * 16.0, vy: 3.0 };
    }
    const nx = aimX / len;
    const ny = aimY / len;
    const speed = 17.5;
    return {
      vx: nx * speed,
      vy: ny * speed
    };
  }

  /**
   * Daemon 13: Live PBR Shader Bridge
   */
  updateShaderBridge(partial) {
    Object.assign(this.daemons.shaderBridge.state, partial);
    this.emit('shader-change', { ...this.daemons.shaderBridge.state });
  }

  /**
   * Daemon 14: Sonic Beat & FX Sync
   */
  pulseBeat(intensity = 1.0, fireColor = null) {
    if (!this.daemons.audioBeatSync.enabled) return;
    this.daemons.audioBeatSync.beatPulse = Math.max(this.daemons.audioBeatSync.beatPulse, intensity);
    if (fireColor) this.daemons.audioBeatSync.fireColor = fireColor;
  }

  decayBeat(dt) {
    this.daemons.audioBeatSync.beatPulse = Math.max(
      0,
      this.daemons.audioBeatSync.beatPulse - dt * 4.5
    );
    return this.daemons.audioBeatSync.enabled ? this.daemons.audioBeatSync.beatPulse : 0;
  }

  /**
   * Daemon 5: Safely dispose Three.js subtrees without leaking GPU buffers.
   */
  disposeObject3D(root) {
    if (!root) return;
    let count = 0;
    root.traverse((obj) => {
      if (obj.isMesh) {
        if (obj.geometry) {
          obj.geometry.dispose();
          count++;
        }
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m?.dispose?.());
        } else if (obj.material) {
          obj.material.dispose();
        }
      }
    });
    this.daemons.resourceWatchdog.disposedCount += count;
  }

  /**
   * Daemon 17: Titanfall Wallrun & Magnet Solver
   */
  solveWallrun(vel, wallNormal, lookForward, dt, boostMult = 1.0) {
    if (!this.daemons.wallrunPhysics.enabled || !wallNormal) {
      return { active: false, targetRoll: 0 };
    }
    const cfg = this.daemons.wallrunPhysics;
    // Project look direction onto the wall tangent plane
    const dotN = lookForward.x * wallNormal.x + lookForward.z * wallNormal.z;
    let tx = lookForward.x - wallNormal.x * dotN;
    let tz = lookForward.z - wallNormal.z * dotN;
    const tLen = Math.hypot(tx, tz);
    if (tLen < 0.05) {
      tx = -wallNormal.z;
      tz = wallNormal.x;
    } else {
      tx /= tLen;
      tz /= tLen;
    }

    const speed = cfg.wallSpeed * boostMult;
    vel.x = THREE.MathUtils.damp(vel.x, tx * speed - wallNormal.x * 1.4, 10, dt);
    vel.z = THREE.MathUtils.damp(vel.z, tz * speed - wallNormal.z * 1.4, 10, dt);
    // Low gravity counter-lift along wall
    vel.y = Math.max(-1.6, vel.y * 0.88);

    // Cross product of lookForward & wallNormal determines left vs right wall tilt
    const side = lookForward.x * wallNormal.z - lookForward.z * wallNormal.x;
    const rollSign = side >= 0 ? 1 : -1;
    return {
      active: true,
      targetRoll: rollSign * THREE.MathUtils.degToRad(cfg.tiltDeg),
      tangentX: tx,
      tangentZ: tz
    };
  }

  /**
   * Daemon 18: Source Slide-Hop & Air-Strafe Clock
   */
  solveAirStrafe(vel, wishX, wishZ, grounded, baseSpeed, dt, sliding = false) {
    if (!this.daemons.slideHopMomentum.enabled) {
      vel.x = THREE.MathUtils.damp(vel.x, wishX * baseSpeed, 12, dt);
      vel.z = THREE.MathUtils.damp(vel.z, wishZ * baseSpeed, 12, dt);
      return;
    }
    const cfg = this.daemons.slideHopMomentum;
    if (sliding && grounded) {
      // Preserve speed with gentle friction decay while crouch-sliding
      const decay = Math.pow(cfg.slideFriction, dt * 60);
      vel.x *= decay;
      vel.z *= decay;
      vel.x += wishX * baseSpeed * 0.65 * dt;
      vel.z += wishZ * baseSpeed * 0.65 * dt;
      return;
    }
    if (grounded) {
      vel.x = THREE.MathUtils.damp(vel.x, wishX * baseSpeed, 13, dt);
      vel.z = THREE.MathUtils.damp(vel.z, wishZ * baseSpeed, 13, dt);
      return;
    }
    // Authentic Source air-strafe: project current speed along wish dir so high bunnyhop velocity isn't lost!
    const wishLen = Math.hypot(wishX, wishZ);
    if (wishLen > 0.05) {
      const nx = wishX / wishLen;
      const nz = wishZ / wishLen;
      const airCap = Math.min(baseSpeed * 1.15, 11.5);
      const currentAlong = vel.x * nx + vel.z * nz;
      const addSpeed = airCap - currentAlong;
      if (addSpeed > 0) {
        const accel = Math.min(addSpeed, cfg.airAccel * baseSpeed * dt * 0.28);
        vel.x += nx * accel;
        vel.z += nz * accel;
      }
    }
  }

  /**
   * Daemon 19: Grapple Tether & Pendulum Solver
   */
  solveGrapple(pos, vel, anchor, dt) {
    if (!this.daemons.grapplePendulum.enabled || !anchor) return false;
    const dx = anchor.x - pos.x;
    const dy = anchor.y - pos.y;
    const dz = anchor.z - pos.z;
    const dist = Math.hypot(dx, dy, dz);
    if (dist < 2.2) return false;
    const pull = this.daemons.grapplePendulum.pullStrength;
    const nx = dx / dist;
    const ny = dy / dist;
    const nz = dz / dist;
    vel.x += nx * pull * dt;
    vel.y += (ny * pull + 14.0) * dt;
    vel.z += nz * pull * dt;
    // Cap runaway reel speed
    const spd = Math.hypot(vel.x, vel.y, vel.z);
    if (spd > 34) {
      const s = 34 / spd;
      vel.x *= s;
      vel.y *= s;
      vel.z *= s;
    }
    return true;
  }

  /**
   * Daemon 20: Orbital Titanfall Entry & Shockwave
   */
  stepOrbitalDrops(drops, dt, onLand = null) {
    if (!this.daemons.titanfallDrop.enabled) return;
    const speed = this.daemons.titanfallDrop.dropSpeed;
    for (let i = drops.length - 1; i >= 0; i--) {
      const d = drops[i];
      d.y -= speed * dt;
      if (d.y <= 0) {
        d.y = 0;
        if (onLand) onLand(d);
        drops.splice(i, 1);
      }
    }
  }

  /**
   * Daemon 23: Titan Rodeo & Battery Shield Bus
   */
  evalRodeoBattery(pilotPos, titanPos, heightOffset = 3.8) {
    if (!this.daemons.rodeoBatteryBus.enabled) return null;
    const dx = titanPos.x - pilotPos.x;
    const dz = titanPos.z - pilotPos.z;
    const flatD = Math.hypot(dx, dz);
    const dy = Math.abs(pilotPos.y - (titanPos.y + heightOffset));
    if (flatD < 2.45 && dy < 2.4) {
      return {
        x: titanPos.x,
        y: titanPos.y + heightOffset + 0.55,
        z: titanPos.z
      };
    }
    return null;
  }

  /**
   * Daemon 24: Vortex & Ballistic Reflector Daemon
   */
  filterVortexCatch(projectiles, shieldPos, shieldForward, ownerTeam, range = 9.5) {
    if (!this.daemons.vortexProjectileCatch.enabled) return 0;
    let caught = 0;
    for (const pr of projectiles) {
      if (pr.team === ownerTeam || pr.vortexCaptured) continue;
      const dist = pr.pos.distanceTo(shieldPos);
      if (dist < range) {
        pr.vortexCaptured = true;
        pr.team = ownerTeam;
        pr.vel.copy(shieldForward).multiplyScalar(Math.max(26, pr.vel.length() * 1.2));
        pr.damage = Math.max(45, (pr.damage || 30) * 1.35);
        pr.life = Math.max(pr.life, 2.5);
        caught++;
      }
    }
    if (caught > 0) this.daemons.vortexProjectileCatch.reflectedCount += caught;
    return caught;
  }

  /**
   * Daemon 25: Sentient App Mesh-Design Bus
   */
  broadcastBlueprint(sourceNode, blueprint) {
    if (!this.daemons.sentientMeshSync.enabled) return;
    this.daemons.sentientMeshSync.packetsRouted++;
    this.emit('sentient-blueprint', { sourceNode, blueprint, seq: this.daemons.sentientMeshSync.packetsRouted });
  }

  /**
   * Daemons 27 & 36: Hyper-Awareness Thought Cloud Parser & Safety Guard
   */
  clampMutationSpec(spec = {}) {
    const out = { ...spec };
    if (this.daemons.cognitiveMutationGuard.enabled) {
      out.gravity = THREE.MathUtils.clamp(Number(out.gravity ?? 32), 6, 58);
      out.speedMult = THREE.MathUtils.clamp(Number(out.speedMult ?? 1.0), 0.45, 2.4);
      out.fireRateMult = THREE.MathUtils.clamp(Number(out.fireRateMult ?? 1.0), 0.4, 3.0);
      out.damageMult = THREE.MathUtils.clamp(Number(out.damageMult ?? 1.0), 0.4, 3.5);
      out.timeScale = THREE.MathUtils.clamp(Number(out.timeScale ?? 1.0), 0.35, 1.85);
      out.fogDensity = THREE.MathUtils.clamp(Number(out.fogDensity ?? 0.009), 0.002, 0.032);
      out.wallrunSpeed = THREE.MathUtils.clamp(Number(out.wallrunSpeed ?? 17.5), 11, 30);
      this.daemons.cognitiveMutationGuard.clampedCount++;
    }
    this.daemons.realityRuleOverwriter.timeScale = out.timeScale;
    return out;
  }

  parseThoughtCloud(prompt = '', awarenessSnapshot = {}) {
    this.daemons.thoughtCloudParser.thoughtsProcessed++;
    const p = String(prompt || '').toLowerCase();

    let skyColor = '#09111e';
    let fogColor = '#0c1728';
    let keyColor = '#fff1d6';
    let rimColor = '#38bdf8';
    let accentColor = '#f97316';
    let themeName = 'Hyper-Awareness Shift';
    let biome = 'obsidian_studio';
    let marioTheme = 'overworld';
    let gravity = 32;
    let speedMult = 1.0;
    let fireRateMult = 1.0;
    let damageMult = 1.0;
    let timeScale = 1.0;
    let wallrunSpeed = 17.5;
    let infiniteJumps = false;
    let titanInstant = false;
    let levelStyle = 'keep';

    if (/zero.?g|moon|space|low grav|float|astronaut|orbit/.test(p)) {
      gravity = 11.5;
      infiniteJumps = true;
      skyColor = '#020617';
      fogColor = '#0f172a';
      rimColor = '#a855f7';
      accentColor = '#38bdf8';
      biome = 'orbital_void';
      marioTheme = 'sky';
      themeName = 'Zero-G Orbital Drift';
    }
    if (/neon|cyber|synth|matrix|glitch|tron|hacker/.test(p)) {
      skyColor = '#040816';
      fogColor = '#082f49';
      keyColor = '#38bdf8';
      rimColor = '#ec4899';
      accentColor = '#22d3ee';
      biome = 'obsidian_studio';
      marioTheme = 'underground';
      speedMult = Math.max(speedMult, 1.45);
      wallrunSpeed = 23.0;
      themeName = 'Cyber Matrix Overclock';
    }
    if (/lava|blood|hell|doom|scorch|inferno|volcan|apocalypse|fire/.test(p)) {
      skyColor = '#1c0707';
      fogColor = '#450a0a';
      keyColor = '#fb923c';
      rimColor = '#ef4444';
      accentColor = '#f97316';
      biome = 'solar_foundry';
      fireRateMult = 1.75;
      damageMult = 1.65;
      themeName = 'Blood Moon Scorch Apocalypse';
    }
    if (/ice|arctic|frozen|snow|cryo|frost/.test(p)) {
      skyColor = '#082f49';
      fogColor = '#0c4a6e';
      keyColor = '#e0f2fe';
      rimColor = '#7dd3fc';
      accentColor = '#bae6fd';
      biome = 'arctic_glass';
      timeScale = 0.85;
      themeName = 'Cryo Arctic Stasis';
    }
    if (/gold|prime|royal|emerald|toxic|jungle|green/.test(p)) {
      const isGreen = /emerald|toxic|jungle|green/.test(p);
      skyColor = isGreen ? '#052e16' : '#1c1204';
      fogColor = isGreen ? '#14532d' : '#451a03';
      keyColor = isGreen ? '#86efac' : '#fef08a';
      rimColor = isGreen ? '#22c55e' : '#facc15';
      accentColor = isGreen ? '#4ade80' : '#f59e0b';
      themeName = isGreen ? 'Bio-Emerald Overgrowth' : 'Prime Australium Dominion';
    }
    if (/slow|bullet time|cinema/.test(p)) {
      timeScale = 0.5;
    }
    if (/fast|turbo|hyper|speed|sonic|parkour|bunny/.test(p)) {
      speedMult = 1.75;
      wallrunSpeed = 25.5;
      fireRateMult = Math.max(fireRateMult, 1.4);
    }
    if (/chaos|rapid|mayhem|infinite|overdrive|arcade/.test(p)) {
      fireRateMult = 2.4;
      damageMult = 1.85;
      infiniteJumps = true;
      titanInstant = true;
    }
    if (/titan|mech|drop/.test(p)) {
      titanInstant = true;
    }
    if (/maze|fort|tower|bridge|gauntlet|rebuild|new level|arena|map/.test(p)) {
      levelStyle = /maze|gauntlet/.test(p) ? 'gauntlet' : (/tower|spire/.test(p) ? 'spire' : 'fortress');
    }

    return this.clampMutationSpec({
      prompt: prompt || 'Hyper-Awareness Pulse',
      title: themeName,
      skyColor,
      fogColor,
      keyColor,
      rimColor,
      accentColor,
      biome,
      marioTheme,
      gravity,
      speedMult,
      fireRateMult,
      damageMult,
      timeScale,
      wallrunSpeed,
      infiniteJumps,
      titanInstant,
      levelStyle,
      tempo: Math.round(135 * speedMult),
      awarenessTargets: Object.keys(awarenessSnapshot)
    });
  }
}

export const daemonSupervisor = new DaemonSupervisor();
