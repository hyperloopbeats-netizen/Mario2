// Team Fortress — Black Liquid Arena: 9 Classes, 6 Team Skins, PBR Textured Mercenary & Weapon Rigs
import * as THREE from 'three';
import { getEnvironmentTexture, getTf2UniformTexture } from '../studio/pbr-skins.js';

export const TF_CLASSES = {
  scout: {
    id: 'scout',
    name: 'Scout',
    role: 'Offense · Double Jump',
    hp: 125,
    speed: 11.8,
    doubleJump: true,
    weaponType: 'scattergun',
    weaponName: 'Scattergun',
    specialName: 'Bonk Dash',
    damage: 11,
    pellets: 7,
    spread: 0.055,
    fireRate: 0.62,
    clipSize: 6,
    reloadTime: 1.15,
    specialCooldown: 5.5,
    scale: [0.92, 0.96, 0.92],
    hatType: 'cap',
    weaponColor: '#cbd5e1'
  },
  soldier: {
    id: 'soldier',
    name: 'Soldier',
    role: 'Offense · Rocket Jump',
    hp: 200,
    speed: 7.6,
    doubleJump: false,
    weaponType: 'rocket',
    weaponName: 'Rocket Launcher',
    specialName: 'Rocket Boost',
    damage: 90,
    splashRadius: 4.8,
    projectileSpeed: 29,
    fireRate: 0.8,
    clipSize: 4,
    reloadTime: 1.45,
    specialCooldown: 3.8,
    scale: [1.05, 1.04, 1.05],
    hatType: 'helmet',
    weaponColor: '#3f4d3b'
  },
  pyro: {
    id: 'pyro',
    name: 'Pyro',
    role: 'Offense · Flame & Airblast',
    hp: 175,
    speed: 8.8,
    doubleJump: false,
    weaponType: 'flame',
    weaponName: 'Flamethrower',
    specialName: 'Airblast Reflect',
    damage: 13,
    projectileSpeed: 23,
    fireRate: 0.09,
    clipSize: 100,
    reloadTime: 1.4,
    specialCooldown: 2.0,
    scale: [1.0, 1.0, 1.0],
    hatType: 'gasmask',
    weaponColor: '#ea580c'
  },
  demoman: {
    id: 'demoman',
    name: 'Demoman',
    role: 'Defense · Bouncing Grenades',
    hp: 175,
    speed: 8.4,
    doubleJump: false,
    weaponType: 'grenade',
    weaponName: 'Grenade Launcher',
    specialName: 'Cluster Burst',
    damage: 95,
    splashRadius: 4.4,
    projectileSpeed: 25,
    fireRate: 0.65,
    clipSize: 4,
    reloadTime: 1.5,
    specialCooldown: 5.2,
    scale: [1.02, 1.02, 1.02],
    hatType: 'beanie',
    weaponColor: '#334155'
  },
  heavy: {
    id: 'heavy',
    name: 'Heavy',
    role: 'Defense · Minigun & Sandvich',
    hp: 300,
    speed: 6.5,
    doubleJump: false,
    weaponType: 'minigun',
    weaponName: 'Sasha Minigun',
    specialName: 'Sandvich Heal',
    damage: 14,
    pellets: 2,
    spread: 0.045,
    fireRate: 0.1,
    clipSize: 120,
    reloadTime: 1.9,
    specialCooldown: 7.5,
    scale: [1.26, 1.12, 1.24],
    hatType: 'band',
    weaponColor: '#1e293b'
  },
  engineer: {
    id: 'engineer',
    name: 'Engineer',
    role: 'Defense · Auto-Sentry Turret',
    hp: 125,
    speed: 8.6,
    doubleJump: false,
    weaponType: 'shotgun',
    weaponName: 'Frontier Shotgun',
    specialName: 'Build Sentry',
    damage: 10,
    pellets: 6,
    spread: 0.05,
    fireRate: 0.65,
    clipSize: 6,
    reloadTime: 1.25,
    specialCooldown: 7.0,
    scale: [0.96, 0.98, 0.96],
    hatType: 'hardhat',
    weaponColor: '#b45309'
  },
  medic: {
    id: 'medic',
    name: 'Medic',
    role: 'Support · Regen & ÜberCharge',
    hp: 150,
    speed: 9.5,
    doubleJump: false,
    weaponType: 'syringe',
    weaponName: 'Syringe + Medi-Beam',
    specialName: 'ÜberCharge Invuln',
    damage: 16,
    projectileSpeed: 33,
    fireRate: 0.14,
    clipSize: 36,
    reloadTime: 1.2,
    specialCooldown: 9.5,
    scale: [0.98, 1.04, 0.98],
    hatType: 'visor',
    weaponColor: '#e2e8f0'
  },
  sniper: {
    id: 'sniper',
    name: 'Sniper',
    role: 'Support · 2.5x Headshot Scope',
    hp: 125,
    speed: 8.6,
    doubleJump: false,
    weaponType: 'sniper',
    weaponName: 'Rail Sniper Rifle',
    specialName: 'Toggle Scope',
    damage: 58,
    pellets: 1,
    spread: 0.004,
    fireRate: 1.05,
    clipSize: 5,
    reloadTime: 1.35,
    specialCooldown: 0.35,
    scale: [0.95, 1.03, 0.95],
    hatType: 'slouch',
    weaponColor: '#64748b'
  },
  spy: {
    id: 'spy',
    name: 'Spy',
    role: 'Support · Cloak & Backstab',
    hp: 125,
    speed: 9.9,
    doubleJump: false,
    weaponType: 'revolver',
    weaponName: 'Silenced Revolver',
    specialName: 'Stealth Cloak',
    damage: 38,
    pellets: 1,
    spread: 0.015,
    fireRate: 0.48,
    clipSize: 6,
    reloadTime: 1.15,
    specialCooldown: 6.5,
    scale: [0.95, 1.02, 0.95],
    hatType: 'mask',
    weaponColor: '#cbd5e1'
  }
};

export const TF_SKINS = {
  standard: {
    id: 'standard',
    name: 'Standard RED/BLU',
    redBody: '#b8383b',
    bluBody: '#395c78',
    accent: '#e5c299',
    metalness: 0.25,
    roughness: 0.56,
    clearcoat: 0.15,
    emissiveBoost: 0.06
  },
  black_liquid: {
    id: 'black_liquid',
    name: 'Black Liquid Obsidian',
    redBody: '#271419',
    bluBody: '#0f1c2e',
    accent: '#ef4444',
    metalness: 0.85,
    roughness: 0.16,
    clearcoat: 0.92,
    emissiveBoost: 0.35
  },
  australium: {
    id: 'australium',
    name: 'Golden Australium',
    redBody: '#d97706',
    bluBody: '#eab308',
    accent: '#fef08a',
    metalness: 0.96,
    roughness: 0.14,
    clearcoat: 0.85,
    emissiveBoost: 0.22
  },
  cryo_chrome: {
    id: 'cryo_chrome',
    name: 'Cryo Titanium Chrome',
    redBody: '#be123c',
    bluBody: '#0284c7',
    accent: '#38bdf8',
    metalness: 0.92,
    roughness: 0.12,
    clearcoat: 0.9,
    emissiveBoost: 0.32
  },
  solar_ember: {
    id: 'solar_ember',
    name: 'Solar Plasma Ember',
    redBody: '#ea580c',
    bluBody: '#4f46e5',
    accent: '#fb923c',
    metalness: 0.68,
    roughness: 0.24,
    clearcoat: 0.7,
    emissiveBoost: 0.55
  },
  toxic_emerald: {
    id: 'toxic_emerald',
    name: 'Bio-Liquid Emerald',
    redBody: '#059669',
    bluBody: '#0d9488',
    accent: '#4ade80',
    metalness: 0.75,
    roughness: 0.22,
    clearcoat: 0.8,
    emissiveBoost: 0.45
  }
};

export function buildClassRig(classId, team = 'red', skinId = 'standard', shaderState = null, customColors = null) {
  const cls = TF_CLASSES[classId] || TF_CLASSES.soldier;
  const skin = TF_SKINS[skinId] || TF_SKINS.standard;
  const armorTex = getTf2UniformTexture(team, skinId, classId, customColors);

  const mOff = shaderState ? Number(shaderState.metalnessOffset || 0) : 0;
  const rOff = shaderState ? Number(shaderState.roughnessOffset || 0) : 0;
  const coat = shaderState ? Number(shaderState.clearcoat ?? skin.clearcoat) : skin.clearcoat;

  const bodyMat = new THREE.MeshPhysicalMaterial({
    map: armorTex,
    metalness: THREE.MathUtils.clamp(skin.metalness + mOff, 0.05, 1),
    roughness: THREE.MathUtils.clamp(skin.roughness + rOff, 0.08, 1),
    clearcoat: coat,
    clearcoatRoughness: 0.16
  });

  const trouserMat = new THREE.MeshStandardMaterial({
    color: team === 'red' ? 0x452220 : 0x1e2c3d,
    roughness: 0.78,
    metalness: 0.08
  });

  const trimMat = new THREE.MeshPhysicalMaterial({
    color: customColors?.accent || (team === 'red' ? 0xef4444 : 0x38bdf8),
    emissive: team === 'red' ? 0x991b1b : 0x0284c7,
    emissiveIntensity: 0.3 + skin.emissiveBoost,
    metalness: 0.65,
    roughness: 0.2
  });

  const bootMat = new THREE.MeshStandardMaterial({ color: 0x171412, metalness: 0.25, roughness: 0.72 });
  const skinMat = new THREE.MeshStandardMaterial({
    color: cls.id === 'pyro' ? 0x1e293b : (cls.id === 'demoman' ? 0x7c4a2d : 0xeab696),
    metalness: 0.05,
    roughness: 0.62
  });

  const group = new THREE.Group();
  const root = new THREE.Group();
  root.scale.set(cls.scale[0], cls.scale[1], cls.scale[2]);
  group.add(root);

  // Articulated Legs + Combat Boots
  const makeLeg = (xOff) => {
    const legPivot = new THREE.Group();
    legPivot.position.set(xOff, 0.76, 0);
    const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.11, 0.44, 10), trouserMat);
    thigh.position.y = -0.22;
    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.34, 0.32), bootMat);
    boot.position.set(0, -0.56, 0.04);
    thigh.castShadow = true;
    boot.castShadow = true;
    legPivot.add(thigh, boot);
    return legPivot;
  };
  const legL = makeLeg(-0.18);
  const legR = makeLeg(0.18);
  root.add(legL, legR);

  // Broad Stylized Mercenary Torso + Belt + Class Backpack/Bandolier
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.29, 0.74, 10), bodyMat);
  torso.scale.set(1.1, 1, 0.74);
  torso.position.set(0, 1.14, 0);
  torso.castShadow = true;
  root.add(torso);

  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.11, 0.46), bootMat);
  belt.position.set(0, 0.82, 0);
  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.48), trimMat);
  buckle.position.set(0, 0.82, 0);
  root.add(belt, buckle);

  // Class-Specific Silhouette Accessories
  if (cls.id === 'pyro') {
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.62, 10), trimMat);
    tank.position.set(0, 1.18, -0.32);
    root.add(tank);
  } else if (cls.id === 'medic') {
    const coat = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.4, 0.45, 10), new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.75 }));
    coat.position.set(0, 0.66, 0);
    const pack = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.56, 0.22), bootMat);
    pack.position.set(0, 1.18, -0.3);
    root.add(coat, pack);
  } else if (cls.id === 'heavy' || cls.id === 'demoman') {
    const sash = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.06, 6, 14), new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.85, roughness: 0.28 }));
    sash.rotation.set(0.5, 0.3, 0.7);
    sash.position.set(0, 1.16, 0);
    root.add(sash);
  } else {
    const collar = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 0.38), bootMat);
    collar.position.set(0, 1.48, -0.04);
    root.add(collar);
  }

  // Sculpted Head + Iconic Class Headgear
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 12), skinMat);
  head.scale.set(0.95, 1.12, 1.0);
  head.position.set(0, 1.72, 0);
  head.castShadow = true;
  root.add(head);

  if (cls.id === 'pyro') {
    const snout = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 0.18, 10), bootMat);
    snout.rotation.x = Math.PI / 2;
    snout.position.set(0, 1.66, 0.22);
    const lensL = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.05, 10), new THREE.MeshBasicMaterial({ color: 0xbae6fd }));
    lensL.rotation.x = Math.PI / 2;
    lensL.position.set(-0.08, 1.76, 0.2);
    const lensR = lensL.clone();
    lensR.position.x = 0.08;
    root.add(snout, lensL, lensR);
  } else if (cls.hatType === 'helmet' || cls.hatType === 'hardhat') {
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(0.26, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.56),
      cls.hatType === 'hardhat'
        ? new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.28, metalness: 0.25 })
        : new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5, metalness: 0.45 })
    );
    dome.position.set(0, 1.76, 0);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.3, 0.04, 14), dome.material);
    rim.position.set(0, 1.78, 0.02);
    root.add(dome, rim);
  } else if (cls.hatType === 'cap') {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.52), trimMat);
    cap.position.set(0, 1.78, 0);
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.04, 0.18), trimMat);
    visor.position.set(0, 1.8, 0.22);
    const mic = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.14, 0.14), bootMat);
    mic.position.set(-0.22, 1.72, 0.06);
    root.add(cap, visor, mic);
  } else if (cls.hatType === 'slouch') {
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.16, 12), bootMat);
    crown.position.set(0, 1.92, 0);
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.03, 14), bootMat);
    brim.position.set(0, 1.84, 0);
    const shades = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.07, 0.12), new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.1, metalness: 0.8 }));
    shades.position.set(0, 1.76, 0.18);
    root.add(crown, brim, shades);
  } else {
    const goggles = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.09, 0.12), trimMat);
    goggles.position.set(0, 1.76, 0.18);
    root.add(goggles);
  }

  // Arms + Gloved Hands + Detailed Weapon
  const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.58, 8), bodyMat);
  armL.position.set(-0.44, 1.12, 0.08);
  const armR = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.58, 8), bodyMat);
  armR.position.set(0.44, 1.14, 0.24);
  armR.rotation.x = -1.15;
  root.add(armL, armR);

  const weaponGroup = buildWeaponMesh(cls, trimMat, bodyMat, skinId);
  weaponGroup.position.set(0.42, 1.16, 0.54);
  root.add(weaponGroup);

  group.userData = { legL, legR, armL, armR, weaponGroup, head, bodyMat, trimMat };
  return group;
}

export function buildWeaponMesh(cls, trimMat, bodyMat, skinId = 'standard', includeGloves = false) {
  const g = new THREE.Group();
  const metalTex = getEnvironmentTexture('gunmetal');
  const woodTex = getEnvironmentTexture('tf2_wood');
  const gunMetal = new THREE.MeshStandardMaterial({
    color: skinId === 'australium' ? 0xfacc15 : (cls.weaponColor || '#475569'),
    map: metalTex,
    metalness: skinId === 'australium' ? 0.96 : 0.82,
    roughness: skinId === 'australium' ? 0.16 : 0.26
  });
  const darkSteel = new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.85, roughness: 0.28 });
  const woodMat = new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.65, metalness: 0.08 });

  if (cls.weaponType === 'rocket') {
    // Detailed Soldier Bazooka: olive/steel tube + flared bell + rear vent + wooden grip + sight post
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 1.02, 16), gunMetal);
    tube.rotation.x = Math.PI / 2;
    const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.11, 0.18, 16), darkSteel);
    bell.rotation.x = Math.PI / 2;
    bell.position.z = 0.52;
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.125, 0.022, 8, 16), trimMat);
    collar.position.z = 0.32;
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.22, 0.1), woodMat);
    grip.position.set(0, -0.15, -0.06);
    grip.rotation.x = 0.25;
    const sight = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.1, 0.08), darkSteel);
    sight.position.set(0, 0.14, 0.28);
    g.add(tube, bell, collar, grip, sight);
  } else if (cls.weaponType === 'grenade') {
    // Demoman 4-chamber rotary drum launcher
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.28, 12), darkSteel);
    drum.rotation.x = Math.PI / 2;
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.55, 12), gunMetal);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.05, 0.36);
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.16, 0.34), woodMat);
    stock.position.set(0, -0.04, -0.26);
    g.add(drum, barrel, stock);
  } else if (cls.weaponType === 'minigun') {
    // Heavy's Sasha: ammo drum + 6 individual rotary barrels + cooling collar
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.38, 14), bodyMat);
    drum.rotation.x = Math.PI / 2;
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.025, 8, 14), darkSteel);
    handle.position.set(0, 0.2, -0.05);
    const spinner = new THREE.Group();
    spinner.position.z = 0.55;
    for (let b = 0; b < 6; b++) {
      const ang = (b / 6) * Math.PI * 2;
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.88, 8), gunMetal);
      bar.rotation.x = Math.PI / 2;
      bar.position.set(Math.cos(ang) * 0.075, Math.sin(ang) * 0.075, 0);
      spinner.add(bar);
    }
    const clamp = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.024, 8, 16), trimMat);
    clamp.position.z = 0.28;
    spinner.add(clamp);
    g.userData.spinner = spinner;
    g.add(drum, handle, spinner);
  } else if (cls.weaponType === 'sniper') {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.13, 0.65), woodMat);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.032, 0.82, 10), darkSteel);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.04, 0.62);
    const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.036, 0.38, 12), gunMetal);
    scope.rotation.x = Math.PI / 2;
    scope.position.set(0, 0.13, 0.12);
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.02, 12), trimMat);
    lens.rotation.x = Math.PI / 2;
    lens.position.set(0, 0.13, 0.31);
    g.add(body, barrel, scope, lens);
  } else if (cls.weaponType === 'scattergun' || cls.weaponType === 'shotgun') {
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.13, 0.38), woodMat);
    stock.position.set(0, -0.03, -0.2);
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.14, 0.36), darkSteel);
    body.position.set(0, 0.02, 0.1);
    const b1 = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.034, 0.56, 10), gunMetal);
    b1.rotation.x = Math.PI / 2;
    b1.position.set(-0.028, 0.05, 0.42);
    const b2 = b1.clone();
    b2.position.x = 0.028;
    const lever = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.06, 0.22), trimMat);
    lever.position.set(0, -0.07, 0.28);
    g.add(stock, body, b1, b2, lever);
  } else {
    // Flame / Syringe / Revolver
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.34, 10), trimMat);
    tank.rotation.x = Math.PI / 2;
    tank.position.set(0, -0.06, 0.08);
    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.15, 0.54), gunMetal);
    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.038, 0.5, 10), darkSteel);
    nozzle.rotation.x = Math.PI / 2;
    nozzle.position.set(0, 0.04, 0.38);
    g.add(tank, receiver, nozzle);
  }

  if (includeGloves) {
    const gloveMat = new THREE.MeshStandardMaterial({ color: 0x1e1b18, roughness: 0.72, metalness: 0.12 });
    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.13, 0.2), gloveMat);
    hand.position.set(0.04, -0.14, -0.18);
    g.add(hand);
  }
  return g;
}

export function buildSentryRig(team = 'red', skinId = 'standard') {
  const skin = TF_SKINS[skinId] || TF_SKINS.standard;
  const g = new THREE.Group();
  const teamMat = new THREE.MeshPhysicalMaterial({
    color: team === 'red' ? 0xdc2626 : 0x2563eb,
    emissive: team === 'red' ? 0x7f1d1d : 0x0369a1,
    emissiveIntensity: 0.28,
    metalness: skin.metalness,
    roughness: skin.roughness,
    clearcoat: 0.65
  });
  const steelMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, map: getEnvironmentTexture('gunmetal'), metalness: 0.88, roughness: 0.22 });

  const leg1 = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.72, 8), steelMat);
  leg1.position.set(-0.28, 0.32, 0.28);
  leg1.rotation.set(0.25, 0, -0.25);
  const leg2 = leg1.clone();
  leg2.position.set(0.28, 0.32, 0.28);
  leg2.rotation.set(0.25, 0, 0.25);
  const leg3 = leg1.clone();
  leg3.position.set(0, 0.32, -0.34);
  leg3.rotation.set(-0.3, 0, 0);
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.25, 12), steelMat);
  collar.position.y = 0.62;
  g.add(leg1, leg2, leg3, collar);

  const headPivot = new THREE.Group();
  headPivot.position.y = 0.92;
  const pod = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.44, 0.76), teamMat);
  const rocketPod = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.24, 0.36), steelMat);
  rocketPod.position.set(0, 0.32, -0.08);
  const barrelL = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.66, 8), steelMat);
  barrelL.rotation.x = Math.PI / 2;
  barrelL.position.set(-0.18, 0, 0.52);
  const barrelR = barrelL.clone();
  barrelR.position.x = 0.18;
  const eye = new THREE.Mesh(
    new THREE.SphereGeometry(0.11, 10, 8),
    new THREE.MeshBasicMaterial({ color: team === 'red' ? 0xfca5a5 : 0x7dd3fc })
  );
  eye.position.set(0, 0.12, 0.38);

  headPivot.add(pod, rocketPod, barrelL, barrelR, eye);
  g.add(headPivot);
  g.userData.headPivot = headPivot;
  return g;
}
