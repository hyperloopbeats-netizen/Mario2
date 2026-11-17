import * as THREE from 'three';

export const CAD_PRESETS = {
  hyperloop_turbine: {
    name: 'Hyperloop Cryo-Turbine',
    summary: 'Multi-stage magnetic levitation turbine core with titanium stator rings and sapphire housing.',
    parts: [
      { label: 'Base Pedestal', shape: 'cylinder', position: [0, 0.25, 0], rotation: [0, 0, 0], scale: [1.9, 0.45, 1.9], color: '#1e293b', metalness: 0.85, roughness: 0.25, spinSpeed: 0 },
      { label: 'Core Shaft', shape: 'cylinder', position: [0, 1.9, 0], rotation: [0, 0, 0], scale: [0.42, 3.1, 0.42], color: '#e2e8f0', metalness: 0.95, roughness: 0.14, spinSpeed: 1.6 },
      { label: 'Primary Rotor', shape: 'torus', position: [0, 2.0, 0], rotation: [Math.PI / 2, 0, 0], scale: [1.35, 1.35, 0.9], color: '#38bdf8', emissive: '#0284c7', emissiveIntensity: 0.35, metalness: 0.75, roughness: 0.18, spinSpeed: 2.2 },
      { label: 'Outer Stator Ring', shape: 'torus', position: [0, 2.0, 0], rotation: [0.35, 0.2, 0], scale: [1.85, 1.85, 0.75], color: '#94a3b8', metalness: 0.92, roughness: 0.18, spinSpeed: -0.9 },
      { label: 'Plasma Impeller', shape: 'torusKnot', position: [0, 2.0, 0], rotation: [0, 0, 0], scale: [0.55, 0.55, 0.55], color: '#f59e0b', emissive: '#b45309', emissiveIntensity: 0.45, metalness: 0.88, roughness: 0.16, spinSpeed: 1.8 },
      { label: 'Upper Crown', shape: 'cone', position: [0, 3.65, 0], rotation: [0, 0, 0], scale: [0.68, 0.85, 0.68], color: '#334155', metalness: 0.86, roughness: 0.22, spinSpeed: 0 },
      { label: 'Glass Shroud', shape: 'cylinder', position: [0, 2.0, 0], rotation: [0, 0, 0], scale: [1.55, 2.3, 1.55], color: '#bae6fd', metalness: 0.1, roughness: 0.08, opacity: 0.26, spinSpeed: 0 },
      { label: 'Support Fin L', shape: 'box', position: [-1.45, 1.4, 0], rotation: [0, 0, -0.25], scale: [0.2, 2.1, 0.55], color: '#475569', metalness: 0.82, roughness: 0.3, spinSpeed: 0 },
      { label: 'Support Fin R', shape: 'box', position: [1.45, 1.4, 0], rotation: [0, 0, 0.25], scale: [0.2, 2.1, 0.55], color: '#475569', metalness: 0.82, roughness: 0.3, spinSpeed: 0 }
    ]
  },
  black_glass_monolith: {
    name: 'Obsidian Quantum Monolith',
    summary: 'Suspended black-glass computational spire encircled by gold gyroscopic telemetry rings.',
    parts: [
      { label: 'Plinth', shape: 'box', position: [0, 0.2, 0], rotation: [0, 0, 0], scale: [2.6, 0.36, 2.6], color: '#0f172a', metalness: 0.78, roughness: 0.22, spinSpeed: 0 },
      { label: 'Obsidian Slab', shape: 'box', position: [0, 2.2, 0], rotation: [0, 0.3, 0], scale: [1.05, 3.1, 0.34], color: '#090d16', metalness: 0.25, roughness: 0.06, opacity: 0.92, spinSpeed: 0.25 },
      { label: 'Inner Core', shape: 'oct', position: [0, 2.2, 0], rotation: [0, 0, 0], scale: [0.65, 0.65, 0.65], color: '#ef4444', emissive: '#dc2626', emissiveIntensity: 0.6, metalness: 0.6, roughness: 0.15, spinSpeed: 1.4 },
      { label: 'Gyro Ring A', shape: 'torus', position: [0, 2.2, 0], rotation: [0.8, 0.2, 0], scale: [1.65, 1.65, 0.55], color: '#facc15', metalness: 0.94, roughness: 0.16, spinSpeed: 0.85 },
      { label: 'Gyro Ring B', shape: 'torus', position: [0, 2.2, 0], rotation: [-0.7, 0.5, 0.4], scale: [2.0, 2.0, 0.45], color: '#cbd5e1', metalness: 0.9, roughness: 0.2, spinSpeed: -0.65 },
      { label: 'Emitter Halo', shape: 'sphere', position: [0, 4.05, 0], rotation: [0, 0, 0], scale: [0.32, 0.32, 0.32], color: '#38bdf8', emissive: '#38bdf8', emissiveIntensity: 0.7, metalness: 0.3, roughness: 0.1, spinSpeed: 0 }
    ]
  },
  kinetic_mech_frame: {
    name: 'Mario Exo-Frame MK IV',
    summary: 'Articulated cybernetic exo-chassis with twin thrusters, visor shield, and armored pauldrons.',
    parts: [
      { label: 'Chest Chassis', shape: 'box', position: [0, 2.1, 0], rotation: [0, 0, 0], scale: [1.3, 1.35, 0.85], color: '#dc2626', metalness: 0.65, roughness: 0.24, spinSpeed: 0 },
      { label: 'Core Reactor', shape: 'cylinder', position: [0, 2.15, 0.42], rotation: [Math.PI / 2, 0, 0], scale: [0.38, 0.22, 0.38], color: '#38bdf8', emissive: '#0ea5e9', emissiveIntensity: 0.75, metalness: 0.4, roughness: 0.12, spinSpeed: 2.5 },
      { label: 'Visor Dome', shape: 'sphere', position: [0, 3.18, 0.05], rotation: [0, 0, 0], scale: [0.58, 0.54, 0.58], color: '#1d4ed8', metalness: 0.85, roughness: 0.15, spinSpeed: 0 },
      { label: 'Pauldron L', shape: 'capsule', position: [-1.05, 2.5, 0], rotation: [0, 0, 0.4], scale: [0.42, 0.55, 0.48], color: '#f8fafc', metalness: 0.7, roughness: 0.22, spinSpeed: 0 },
      { label: 'Pauldron R', shape: 'capsule', position: [1.05, 2.5, 0], rotation: [0, 0, -0.4], scale: [0.42, 0.55, 0.48], color: '#f8fafc', metalness: 0.7, roughness: 0.22, spinSpeed: 0 },
      { label: 'Leg Pillar L', shape: 'cylinder', position: [-0.45, 0.75, 0], rotation: [0, 0, 0], scale: [0.34, 1.45, 0.34], color: '#1e3a8a', metalness: 0.75, roughness: 0.28, spinSpeed: 0 },
      { label: 'Leg Pillar R', shape: 'cylinder', position: [0.45, 0.75, 0], rotation: [0, 0, 0], scale: [0.34, 1.45, 0.34], color: '#1e3a8a', metalness: 0.75, roughness: 0.28, spinSpeed: 0 },
      { label: 'Orbital Shield', shape: 'torus', position: [0, 2.1, 0], rotation: [Math.PI / 2.2, 0, 0], scale: [1.85, 1.85, 0.4], color: '#facc15', metalness: 0.92, roughness: 0.18, spinSpeed: 1.1 }
    ]
  }
};

export const MOVIE_PRESETS = {
  black_glass_promo: {
    title: 'BLACK GLASS // PROJECT GENESIS',
    tagline: 'Precision 3D CAD architecture fused with real-time solar cinema.',
    moodColor: '#0ea5e9',
    fogDensity: 0.022,
    cadAssembly: CAD_PRESETS.hyperloop_turbine,
    shots: [
      { label: 'Shot 1 · Ignition', duration: 3.5, headline: 'LIQUID ARCHITECTURE', subline: 'Real-time parametric CAD systems rendered in obsidian glass', camera: 'dolly', keyColor: '#f8fafc', rimColor: '#38bdf8', cadSpinBoost: 1.0, enableCad: true, enableSun: true, enableMario: false, enableGrid: true, enablePromo: true },
      { label: 'Shot 2 · Solar Core', duration: 3.5, headline: 'CONCEPT PRODUCTION MATRIX', subline: 'Unified shaders, kinetic terrain, and live promo projection', camera: 'orbit', keyColor: '#fde68a', rimColor: '#f97316', cadSpinBoost: 2.2, enableCad: true, enableSun: true, enableMario: false, enableGrid: true, enablePromo: true },
      { label: 'Shot 3 · Hero Integration', duration: 3.5, headline: 'EVERY ENGINE UNIFIED', subline: 'Interactive 3D characters, CAD rigs, and cinema compositing', camera: 'hero', keyColor: '#ffffff', rimColor: '#ef4444', cadSpinBoost: 1.5, enableCad: true, enableSun: true, enableMario: true, enableGrid: true, enablePromo: true },
      { label: 'Shot 4 · Finale Reveal', duration: 3.5, headline: 'FULL HD CINEMA READY', subline: 'Captured at 1920×1080 directly from the Black Glass Engine', camera: 'crane', keyColor: '#e0f2fe', rimColor: '#38bdf8', cadSpinBoost: 1.2, enableCad: true, enableSun: true, enableMario: true, enableGrid: true, enablePromo: true }
    ]
  },
  mario_odyssey: {
    title: 'MUSHROOM KINGDOM OVERDRIVE',
    tagline: 'Classic platformer hero enters the Black Liquid Quantum Arena.',
    moodColor: '#ef4444',
    fogDensity: 0.018,
    cadAssembly: CAD_PRESETS.kinetic_mech_frame,
    shots: [
      { label: 'Shot 1 · Arrival', duration: 3.5, headline: 'PLAYER ONE ENGAGED', subline: 'Classic Mario 3D rig synchronized with the Production Matrix', camera: 'hero', keyColor: '#ffffff', rimColor: '#ef4444', cadSpinBoost: 1.0, enableCad: true, enableSun: false, enableMario: true, enableGrid: true, enablePromo: true },
      { label: 'Shot 2 · Exo-Frame', duration: 3.5, headline: 'PARAMETRIC EXO-CHASSIS', subline: 'Real-time scaled CAD armor orbiting the kinetic floor', camera: 'orbit', keyColor: '#fef08a', rimColor: '#3b82f6', cadSpinBoost: 1.8, enableCad: true, enableSun: true, enableMario: true, enableGrid: true, enablePromo: false },
      { label: 'Shot 3 · Eclipse', duration: 3.5, headline: 'DIGITAL SUN IGNITION', subline: 'Fractal solar core illuminating the dark glass horizon', camera: 'sweep', keyColor: '#fed7aa', rimColor: '#f59e0b', cadSpinBoost: 2.4, enableCad: true, enableSun: true, enableMario: true, enableGrid: true, enablePromo: true },
      { label: 'Shot 4 · Victory Cut', duration: 3.5, headline: 'WORLD CLEAR · 1080P', subline: 'Black Liquid OS · Unified Real-Time Film Engine', camera: 'crane', keyColor: '#ffffff', rimColor: '#ef4444', cadSpinBoost: 1.4, enableCad: true, enableSun: true, enableMario: true, enableGrid: true, enablePromo: true }
    ]
  }
};

function createGeometryForShape(shape, detail = 24) {
  const seg = Math.max(10, Math.round(detail));
  switch (shape) {
    case 'cylinder':
      return new THREE.CylinderGeometry(0.5, 0.5, 1, seg);
    case 'sphere':
      return new THREE.SphereGeometry(0.5, seg, Math.max(8, Math.round(seg * 0.75)));
    case 'torus':
      return new THREE.TorusGeometry(0.5, 0.14, Math.max(10, Math.round(seg * 0.6)), seg * 2);
    case 'torusKnot':
      return new THREE.TorusKnotGeometry(0.42, 0.12, seg * 3, Math.max(8, Math.round(seg * 0.5)));
    case 'cone':
      return new THREE.ConeGeometry(0.5, 1, seg);
    case 'capsule':
      return new THREE.CapsuleGeometry(0.32, 0.65, 6, seg);
    case 'oct':
      return new THREE.OctahedronGeometry(0.55, 0);
    case 'box':
    default:
      return new THREE.BoxGeometry(1, 1, 1);
  }
}

export function buildAssemblyGroup(assembly, options = {}) {
  const detail = options.detail || 24;
  const wireframe = Boolean(options.wireframe);
  const metalOverride = typeof options.metalnessOffset === 'number' ? options.metalnessOffset : 0;
  const roughOverride = typeof options.roughnessOffset === 'number' ? options.roughnessOffset : 0;

  const group = new THREE.Group();
  group.name = assembly?.name || 'CAD Assembly';
  const parts = Array.isArray(assembly?.parts) ? assembly.parts : CAD_PRESETS.hyperloop_turbine.parts;

  const center = new THREE.Vector3(0, 2.0, 0);

  parts.forEach((p, idx) => {
    const geo = createGeometryForShape(p.shape, detail);
    const opacity = typeof p.opacity === 'number' ? Math.max(0.12, Math.min(1, p.opacity)) : 1.0;
    const isTransparent = opacity < 0.99;

    const mat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(p.color || '#94a3b8'),
      emissive: new THREE.Color(p.emissive || '#000000'),
      emissiveIntensity: Number(p.emissiveIntensity || 0),
      metalness: THREE.MathUtils.clamp(Number(p.metalness ?? 0.7) + metalOverride, 0, 1),
      roughness: THREE.MathUtils.clamp(Number(p.roughness ?? 0.25) + roughOverride, 0.04, 1),
      clearcoat: isTransparent ? 1.0 : 0.35,
      clearcoatRoughness: 0.12,
      transparent: isTransparent,
      opacity,
      depthWrite: !isTransparent,
      wireframe
    });

    const mesh = new THREE.Mesh(geo, mat);
    const pos = Array.isArray(p.position) && p.position.length === 3 ? p.position : [0, 1 + idx * 0.35, 0];
    const rot = Array.isArray(p.rotation) && p.rotation.length === 3 ? p.rotation : [0, 0, 0];
    const scl = Array.isArray(p.scale) && p.scale.length === 3 ? p.scale : [1, 1, 1];

    mesh.position.set(Number(pos[0]) || 0, Number(pos[1]) || 0, Number(pos[2]) || 0);
    mesh.rotation.set(Number(rot[0]) || 0, Number(rot[1]) || 0, Number(rot[2]) || 0);
    mesh.scale.set(
      Math.max(0.05, Number(scl[0]) || 1),
      Math.max(0.05, Number(scl[1]) || 1),
      Math.max(0.05, Number(scl[2]) || 1)
    );
    mesh.castShadow = !isTransparent;
    mesh.receiveShadow = true;

    const dir = mesh.position.clone().sub(center);
    if (dir.lengthSq() < 0.01) dir.set(0, 1, 0);
    dir.normalize();

    mesh.userData = {
      basePos: mesh.position.clone(),
      explodeDir: dir,
      spinSpeed: Number(p.spinSpeed || 0),
      label: p.label || `Part ${idx + 1}`
    };

    group.add(mesh);
  });

  return group;
}
