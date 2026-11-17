// App 2: Semantic CAD & Concept Synthesizer — Instantly builds multi-part 3D PBR
// assemblies (e.g. "Dog", "Turret", "Ship", "Fortress", "Dragon", or any prompt)
// solving offline/403/429/pattern-error blocks across Liquid CAD, Matrix, and Team Fortress.

import { sanitizeCadAssembly, logGuardEvent, normalizeHexColor } from './app-pattern-guard.js';

function hashStr(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seededRand(seedObj) {
  seedObj.v = (Math.imul(seedObj.v, 1664525) + 1013904223) >>> 0;
  return seedObj.v / 4294967296;
}

const ARCHETYPES = {
  dog: (accent, primary) => ({
    name: 'Cyber-Hound K9 Companion',
    summary: 'Articulated 10-part quadruped chassis with glowing optical visor, armor plating, and kinetic tail.',
    parts: [
      { label: 'Torso Core', shape: 'capsule', position: [0, 1.35, 0], rotation: [Math.PI / 2, 0, 0], scale: [0.78, 1.35, 0.72], color: primary, metalness: 0.72, roughness: 0.25, spinSpeed: 0 },
      { label: 'Chest Armor', shape: 'box', position: [0, 1.42, 0.48], rotation: [-0.15, 0, 0], scale: [0.82, 0.68, 0.65], color: '#1e293b', metalness: 0.88, roughness: 0.2, spinSpeed: 0 },
      { label: 'Canine Cranium', shape: 'box', position: [0, 1.98, 1.08], rotation: [0.1, 0, 0], scale: [0.62, 0.56, 0.72], color: primary, metalness: 0.75, roughness: 0.22, spinSpeed: 0 },
      { label: 'Muzzle Snout', shape: 'box', position: [0, 1.85, 1.56], rotation: [0, 0, 0], scale: [0.38, 0.34, 0.44], color: '#0f172a', metalness: 0.85, roughness: 0.18, spinSpeed: 0 },
      { label: 'Optic Visor', shape: 'box', position: [0, 2.04, 1.44], rotation: [0, 0, 0], scale: [0.54, 0.14, 0.12], color: accent, emissive: accent, emissiveIntensity: 0.85, metalness: 0.3, roughness: 0.1, spinSpeed: 0 },
      { label: 'Ear Sensor L', shape: 'cone', position: [-0.24, 2.42, 0.96], rotation: [0.12, 0, 0.18], scale: [0.18, 0.42, 0.22], color: accent, metalness: 0.8, roughness: 0.2, spinSpeed: 0 },
      { label: 'Ear Sensor R', shape: 'cone', position: [0.24, 2.42, 0.96], rotation: [0.12, 0, -0.18], scale: [0.18, 0.42, 0.22], color: accent, metalness: 0.8, roughness: 0.2, spinSpeed: 0 },
      { label: 'Fore Leg L', shape: 'cylinder', position: [-0.36, 0.62, 0.62], rotation: [0.06, 0, 0], scale: [0.22, 1.15, 0.22], color: '#64748b', metalness: 0.9, roughness: 0.18, spinSpeed: 0 },
      { label: 'Fore Leg R', shape: 'cylinder', position: [0.36, 0.62, 0.62], rotation: [0.06, 0, 0], scale: [0.22, 1.15, 0.22], color: '#64748b', metalness: 0.9, roughness: 0.18, spinSpeed: 0 },
      { label: 'Hind Leg L', shape: 'cylinder', position: [-0.36, 0.6, -0.64], rotation: [-0.12, 0, 0], scale: [0.24, 1.12, 0.26], color: '#475569', metalness: 0.88, roughness: 0.22, spinSpeed: 0 },
      { label: 'Hind Leg R', shape: 'cylinder', position: [0.36, 0.6, -0.64], rotation: [-0.12, 0, 0], scale: [0.24, 1.12, 0.26], color: '#475569', metalness: 0.88, roughness: 0.22, spinSpeed: 0 },
      { label: 'Antenna Tail', shape: 'cone', position: [0, 1.72, -1.08], rotation: [-0.85, 0, 0], scale: [0.14, 0.68, 0.14], color: accent, emissive: accent, emissiveIntensity: 0.45, metalness: 0.85, roughness: 0.15, spinSpeed: 0 }
    ]
  }),
  ship: (accent, primary) => ({
    name: 'Interceptor Void Starship',
    summary: 'Aerodynamic twin-thruster orbital craft with swept delta wings and plasma core.',
    parts: [
      { label: 'Fuselage Spine', shape: 'cone', position: [0, 1.85, 0.2], rotation: [Math.PI / 2, 0, 0], scale: [0.78, 3.2, 0.56], color: primary, metalness: 0.88, roughness: 0.16, spinSpeed: 0 },
      { label: 'Glass Canopy', shape: 'capsule', position: [0, 2.12, 0.35], rotation: [Math.PI / 2.2, 0, 0], scale: [0.42, 0.72, 0.38], color: '#bae6fd', opacity: 0.36, metalness: 0.15, roughness: 0.06, spinSpeed: 0 },
      { label: 'Wing Port', shape: 'box', position: [-1.25, 1.8, -0.25], rotation: [0, 0.25, -0.1], scale: [2.1, 0.1, 0.95], color: '#1e293b', metalness: 0.85, roughness: 0.24, spinSpeed: 0 },
      { label: 'Wing Starboard', shape: 'box', position: [1.25, 1.8, -0.25], rotation: [0, -0.25, 0.1], scale: [2.1, 0.1, 0.95], color: '#1e293b', metalness: 0.85, roughness: 0.24, spinSpeed: 0 },
      { label: 'Thruster Nozzle L', shape: 'cylinder', position: [-0.65, 1.82, -1.3], rotation: [Math.PI / 2, 0, 0], scale: [0.32, 0.75, 0.32], color: accent, emissive: accent, emissiveIntensity: 0.8, metalness: 0.6, roughness: 0.2, spinSpeed: 2.2 },
      { label: 'Thruster Nozzle R', shape: 'cylinder', position: [0.65, 1.82, -1.3], rotation: [Math.PI / 2, 0, 0], scale: [0.32, 0.75, 0.32], color: accent, emissive: accent, emissiveIntensity: 0.8, metalness: 0.6, roughness: 0.2, spinSpeed: -2.2 },
      { label: 'Gyro Warp Ring', shape: 'torus', position: [0, 1.85, -0.45], rotation: [0, 0, 0], scale: [1.5, 1.5, 0.45], color: '#94a3b8', metalness: 0.94, roughness: 0.14, spinSpeed: 1.4 }
    ]
  }),
  turret: (accent, primary) => ({
    name: 'Level-3 Fortress Sentry',
    summary: 'Tripod-mounted dual gatling and missile pod turret with optical laser targeter.',
    parts: [
      { label: 'Tripod Hub', shape: 'cylinder', position: [0, 0.75, 0], rotation: [0, 0, 0], scale: [0.55, 1.1, 0.55], color: '#334155', metalness: 0.86, roughness: 0.25, spinSpeed: 0 },
      { label: 'Leg Front', shape: 'box', position: [0, 0.42, 0.65], rotation: [0.55, 0, 0], scale: [0.18, 0.95, 0.18], color: '#1e293b', metalness: 0.8, roughness: 0.3, spinSpeed: 0 },
      { label: 'Leg Left', shape: 'box', position: [-0.6, 0.42, -0.45], rotation: [-0.35, 0, -0.48], scale: [0.18, 0.95, 0.18], color: '#1e293b', metalness: 0.8, roughness: 0.3, spinSpeed: 0 },
      { label: 'Leg Right', shape: 'box', position: [0.6, 0.42, -0.45], rotation: [-0.35, 0, 0.48], scale: [0.18, 0.95, 0.18], color: '#1e293b', metalness: 0.8, roughness: 0.3, spinSpeed: 0 },
      { label: 'Chassis Head', shape: 'box', position: [0, 1.55, 0], rotation: [0, 0, 0], scale: [0.95, 0.68, 1.15], color: primary, metalness: 0.72, roughness: 0.26, spinSpeed: 0.45 },
      { label: 'Gatling Barrel L', shape: 'cylinder', position: [-0.58, 1.55, 0.65], rotation: [Math.PI / 2, 0, 0], scale: [0.22, 1.05, 0.22], color: '#94a3b8', metalness: 0.95, roughness: 0.14, spinSpeed: 3.0 },
      { label: 'Gatling Barrel R', shape: 'cylinder', position: [0.58, 1.55, 0.65], rotation: [Math.PI / 2, 0, 0], scale: [0.22, 1.05, 0.22], color: '#94a3b8', metalness: 0.95, roughness: 0.14, spinSpeed: -3.0 },
      { label: 'Missile Pod', shape: 'box', position: [0, 2.08, -0.15], rotation: [0, 0, 0], scale: [0.64, 0.36, 0.62], color: '#0f172a', metalness: 0.85, roughness: 0.2, spinSpeed: 0 },
      { label: 'Targeting Lens', shape: 'sphere', position: [0, 1.58, 0.64], rotation: [0, 0, 0], scale: [0.22, 0.22, 0.22], color: accent, emissive: accent, emissiveIntensity: 0.95, metalness: 0.2, roughness: 0.08, spinSpeed: 0 }
    ]
  }),
  fortress: (accent, primary) => ({
    name: 'Obsidian Citadel Bastion',
    summary: 'Fortified multi-tier command tower with rotating radar core and armored battlements.',
    parts: [
      { label: 'Bastion Base', shape: 'box', position: [0, 0.55, 0], rotation: [0, 0, 0], scale: [2.5, 1.1, 2.5], color: '#0f172a', metalness: 0.78, roughness: 0.32, spinSpeed: 0 },
      { label: 'Tower Column', shape: 'cylinder', position: [0, 1.85, 0], rotation: [0, 0, 0], scale: [1.1, 1.75, 1.1], color: primary, metalness: 0.75, roughness: 0.24, spinSpeed: 0 },
      { label: 'Watch Crown', shape: 'box', position: [0, 2.95, 0], rotation: [0, Math.PI / 4, 0], scale: [1.5, 0.5, 1.5], color: '#1e293b', metalness: 0.86, roughness: 0.2, spinSpeed: 0.35 },
      { label: 'Energy Spire', shape: 'oct', position: [0, 3.65, 0], rotation: [0, 0, 0], scale: [0.48, 0.68, 0.48], color: accent, emissive: accent, emissiveIntensity: 0.85, metalness: 0.4, roughness: 0.12, spinSpeed: 1.5 },
      { label: 'Shield Ring', shape: 'torus', position: [0, 2.15, 0], rotation: [Math.PI / 2, 0, 0], scale: [1.75, 1.75, 0.4], color: '#cbd5e1', metalness: 0.92, roughness: 0.16, spinSpeed: -0.9 },
      { label: 'Corner Pylon FL', shape: 'box', position: [-1.15, 1.25, 1.15], rotation: [0, 0, 0], scale: [0.35, 1.65, 0.35], color: '#475569', metalness: 0.84, roughness: 0.26, spinSpeed: 0 },
      { label: 'Corner Pylon FR', shape: 'box', position: [1.15, 1.25, 1.15], rotation: [0, 0, 0], scale: [0.35, 1.65, 0.35], color: '#475569', metalness: 0.84, roughness: 0.26, spinSpeed: 0 }
    ]
  })
};

export function synthesizeSemanticAssembly(promptText, overrideAccent = '#38bdf8', overridePrimary = '#ef4444') {
  const prompt = String(promptText || 'Cyber Prototype').trim();
  const low = prompt.toLowerCase();
  const accent = normalizeHexColor(overrideAccent, '#38bdf8');
  const primary = normalizeHexColor(overridePrimary, '#ef4444');

  let raw = null;
  if (/\b(dog|hound|wolf|puppy|pet|canine|k9)\b/.test(low)) {
    raw = ARCHETYPES.dog(accent, primary);
  } else if (/\b(ship|jet|craft|fighter|rocket|shuttle|ufo|plane)\b/.test(low)) {
    raw = ARCHETYPES.ship(accent, primary);
  } else if (/\b(turret|sentry|gun|cannon|weapon|minigun|blaster)\b/.test(low)) {
    raw = ARCHETYPES.turret(accent, primary);
  } else if (/\b(fortress|castle|tower|citadel|base|bastion|monument)\b/.test(low)) {
    raw = ARCHETYPES.fortress(accent, primary);
  } else {
    // Deterministic parametric multi-part generator seeded by prompt string
    const rng = { v: hashStr(low) };
    const shapes = ['cylinder', 'torus', 'torusKnot', 'oct', 'cone', 'capsule', 'box', 'sphere'];
    const parts = [
      {
        label: 'Anchor Plinth',
        shape: 'cylinder',
        position: [0, 0.28, 0],
        rotation: [0, 0, 0],
        scale: [1.9, 0.42, 1.9],
        color: '#0f172a',
        metalness: 0.84,
        roughness: 0.24,
        spinSpeed: 0
      },
      {
        label: 'Primary Core',
        shape: shapes[Math.floor(seededRand(rng) * 4)],
        position: [0, 1.9, 0],
        rotation: [seededRand(rng) * 0.6, seededRand(rng) * 0.6, 0],
        scale: [0.85, 0.85, 0.85],
        color: primary,
        emissive: accent,
        emissiveIntensity: 0.35,
        metalness: 0.78,
        roughness: 0.18,
        spinSpeed: 0.85
      }
    ];
    const radialCount = 4 + Math.floor(seededRand(rng) * 4);
    const radius = 1.15 + seededRand(rng) * 0.55;
    for (let i = 0; i < radialCount; i++) {
      const a = (i / radialCount) * Math.PI * 2;
      const sh = shapes[Math.floor(seededRand(rng) * shapes.length)];
      const isGlowing = i % 2 === 0;
      parts.push({
        label: `Node ${i + 1}`,
        shape: sh,
        position: [
          Number((Math.cos(a) * radius).toFixed(2)),
          Number((1.25 + seededRand(rng) * 1.45).toFixed(2)),
          Number((Math.sin(a) * radius).toFixed(2))
        ],
        rotation: [0, -a, Number((seededRand(rng) * 0.4 - 0.2).toFixed(2))],
        scale: [
          Number((0.3 + seededRand(rng) * 0.4).toFixed(2)),
          Number((0.5 + seededRand(rng) * 0.8).toFixed(2)),
          Number((0.3 + seededRand(rng) * 0.4).toFixed(2))
        ],
        color: isGlowing ? accent : '#cbd5e1',
        emissive: isGlowing ? accent : '#000000',
        emissiveIntensity: isGlowing ? 0.55 : 0,
        metalness: 0.86,
        roughness: 0.16,
        spinSpeed: i % 2 === 0 ? 1.2 : -0.7
      });
    }
    raw = {
      name: `${prompt.slice(0, 28)} (${radialCount + 2}-Part CAD)`,
      summary: `Semantic procedural synthesis generated from "${prompt}" — 100% schema validated.`,
      parts
    };
  }

  const { assembly } = sanitizeCadAssembly(raw);
  logGuardEvent('Semantic CAD Synth', 'ok', `Synthesized "${assembly.name}" (${assembly.parts.length} parts)`, false);
  return assembly;
}

export class SemanticSynthApp {
  constructor(cadApp, matrixEngine, fortressGame) {
    this.cadApp = cadApp;
    this.matrixEngine = matrixEngine;
    this.fortressGame = fortressGame;
    this.lastAssembly = synthesizeSemanticAssembly('Dog');
  }

  synthesize(prompt, accent = '#38bdf8', primary = '#ef4444') {
    this.lastAssembly = synthesizeSemanticAssembly(prompt, accent, primary);
    return this.lastAssembly;
  }

  pushToSystem(assembly = this.lastAssembly) {
    if (!assembly) return;
    if (this.cadApp) this.cadApp.setAssembly(assembly);
    if (this.matrixEngine) this.matrixEngine.setCadAssembly(assembly);
    if (this.fortressGame && typeof this.fortressGame.setCenterMonument === 'function') {
      this.fortressGame.setCenterMonument(assembly);
    }
  }
}
