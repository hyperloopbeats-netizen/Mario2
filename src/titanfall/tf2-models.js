// Titanfall 2 — Frontier Drop: Composite 3D Titan Chassis, Pilot Rigs, Cockpits, Drop Pods & Viewmodels
import * as THREE from 'three';
import { SKIN_PALETTES, getTitanArmorTextures, getPilotSuitTexture, getEnvironmentTexture } from '../studio/pbr-skins.js';
import { TITAN_CLASSES } from './tf2-data.js';

function resolveSkin(skinId, team = 'militia', customColors = null) {
  const base = SKIN_PALETTES[skinId] || (team === 'militia' ? SKIN_PALETTES.srs_bt7274 : SKIN_PALETTES.imc_factory);
  return {
    id: base.id,
    primary: customColors?.primary || base.primary,
    secondary: customColors?.secondary || base.secondary,
    accent: customColors?.accent || (team === 'militia' ? base.accent : '#ef4444'),
    visor: customColors?.visor || (team === 'militia' ? '#38bdf8' : '#fb923c'),
    stencil: customColors?.stencil || base.stencil,
    metalness: customColors?.metalness ?? base.metalness,
    roughness: customColors?.roughness ?? base.roughness
  };
}

function makeArmorMat(chassisLabel, skinId, team, wear = 0.35, customColors = null) {
  const pal = resolveSkin(skinId, team, customColors);
  const tex = getTitanArmorTextures(chassisLabel, skinId, wear, {
    primary: pal.primary,
    secondary: pal.secondary,
    accent: pal.accent,
    stencil: chassisLabel
  });
  return {
    pal,
    armor: new THREE.MeshStandardMaterial({
      map: tex.map,
      bumpMap: tex.bumpMap,
      bumpScale: 0.04,
      metalness: pal.metalness,
      roughness: pal.roughness
    }),
    frame: new THREE.MeshStandardMaterial({
      map: getEnvironmentTexture('gunmetal'),
      color: 0x334155,
      metalness: 0.78,
      roughness: 0.34
    }),
    accentMat: new THREE.MeshStandardMaterial({
      color: pal.accent,
      metalness: 0.45,
      roughness: 0.38
    }),
    eyeMat: new THREE.MeshStandardMaterial({
      color: pal.visor,
      emissive: pal.visor,
      emissiveIntensity: 1.45,
      roughness: 0.2
    })
  };
}

/**
 * Build one of the 7 signature Titanfall 2 Titan chassis with distinct silhouette & weapons.
 */
export function buildTitanRig(titanClassId = 'vanguard', team = 'militia', skinId = null, customColors = null) {
  const spec = TITAN_CLASSES[titanClassId] || TITAN_CLASSES.vanguard;
  const effectiveSkin = skinId || spec.defaultSkin;
  const { armor, frame, accentMat, eyeMat, pal } = makeArmorMat(spec.stencil, effectiveSkin, team, 0.35, customColors);

  const root = new THREE.Group();
  root.scale.setScalar(spec.scale);

  // Hydraulic Pelvis & Reverse-Joint Legs
  const pelvis = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.45, 1.0), frame);
  pelvis.position.y = 1.95;
  root.add(pelvis);

  const buildLeg = (side) => {
    const legPivot = new THREE.Group();
    legPivot.position.set(side * 0.62, 1.9, 0);

    const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.92, 0.54), armor);
    thigh.position.set(0, -0.4, 0.14);
    thigh.rotation.x = -0.22;
    legPivot.add(thigh);

    const knee = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.5, 10), frame);
    knee.rotation.z = Math.PI / 2;
    knee.position.set(0, -0.86, 0.24);
    legPivot.add(knee);

    const shin = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.96, 0.46), armor);
    shin.position.set(0, -1.35, -0.04);
    shin.rotation.x = 0.18;
    legPivot.add(shin);

    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.24, 0.88), frame);
    foot.position.set(0, -1.82, 0.14);
    legPivot.add(foot);
    return legPivot;
  };

  const leftLeg = buildLeg(-1);
  const rightLeg = buildLeg(1);
  root.add(leftLeg, rightLeg);

  // Torso Assembly (chassis-specific bulk)
  const torso = new THREE.Group();
  torso.position.y = 2.95;
  root.add(torso);

  const isOgre = spec.chassis === 'Ogre';
  const isStryder = spec.chassis === 'Stryder';
  const chestW = isOgre ? 2.15 : isStryder ? 1.48 : 1.78;
  const chestH = isOgre ? 1.55 : isStryder ? 1.25 : 1.38;
  const chestD = isOgre ? 1.55 : isStryder ? 1.1 : 1.3;

  const chest = new THREE.Mesh(new THREE.BoxGeometry(chestW, chestH, chestD), armor);
  torso.add(chest);

  // Cockpit Canopy Hatch (angled front plate + glowing Titan optic eye)
  const hatch = new THREE.Mesh(new THREE.BoxGeometry(chestW * 0.68, chestH * 0.68, 0.42), armor);
  hatch.position.set(0, 0.08, chestD * 0.48);
  hatch.rotation.x = -0.18;
  torso.add(hatch);

  const eyeRadius = titanClassId === 'ion' ? 0.24 : 0.17;
  const eyeRing = new THREE.Mesh(new THREE.CylinderGeometry(eyeRadius + 0.06, eyeRadius + 0.06, 0.12, 14), frame);
  eyeRing.rotation.x = Math.PI / 2;
  eyeRing.position.set(0, 0.16, chestD * 0.68);
  torso.add(eyeRing);

  const eye = new THREE.Mesh(new THREE.SphereGeometry(eyeRadius, 12, 10), eyeMat);
  eye.position.set(0, 0.16, chestD * 0.72);
  torso.add(eye);

  // Exposed Rear Green Battery Cell (for Rodeo steal mechanic!)
  const batterySlot = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.7, 0.35), frame);
  batterySlot.position.set(0, 0.45, -chestD * 0.52);
  torso.add(batterySlot);

  const batteryMat = new THREE.MeshStandardMaterial({
    color: 0x22c55e,
    emissive: 0x22c55e,
    emissiveIntensity: 1.3,
    roughness: 0.25
  });
  const batteryCore = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.56, 10), batteryMat);
  batteryCore.position.set(0, 0.52, -chestD * 0.62);
  torso.add(batteryCore);

  // Chassis-specific shoulder pods / wings / canisters
  if (titanClassId === 'vanguard' || titanClassId === 'tone') {
    const podSide = titanClassId === 'vanguard' ? -1 : 1;
    const pod = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.54, 0.84), armor);
    pod.position.set(podSide * (chestW * 0.52), chestH * 0.52, 0.05);
    torso.add(pod);
    const podFace = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.4, 0.08), accentMat);
    podFace.position.set(podSide * (chestW * 0.52), chestH * 0.52, 0.48);
    torso.add(podFace);
  }
  if (titanClassId === 'northstar') {
    // Signature winged VTOL flight thrusters
    [-1, 1].forEach((side) => {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.14, 0.65), armor);
      wing.position.set(side * (chestW * 0.65), 0.38, -0.35);
      wing.rotation.z = side * 0.36;
      torso.add(wing);
      const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 0.5, 10), frame);
      nozzle.position.set(side * (chestW * 0.85), 0.18, -0.5);
      torso.add(nozzle);
    });
  }
  if (titanClassId === 'scorch') {
    // Heavy thermal furnace tanks on shoulders
    [-1, 1].forEach((side) => {
      const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.95, 12), accentMat);
      tank.position.set(side * (chestW * 0.45), 0.45, -0.45);
      torso.add(tank);
    });
  }
  if (titanClassId === 'ronin') {
    // Rear Broadsword scabbard + blade
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.35, 0.36), new THREE.MeshStandardMaterial({
      color: 0xe2e8f0, metalness: 0.9, roughness: 0.18
    }));
    blade.position.set(-0.2, 0.45, -chestD * 0.68);
    blade.rotation.z = -0.52;
    torso.add(blade);
  }

  // Left Off-Arm
  const offArm = new THREE.Group();
  offArm.position.set(-(chestW * 0.64), 0.28, 0.05);
  const offPauldron = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.62), armor);
  const offForearm = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.95, 0.42), frame);
  offForearm.position.set(0, -0.58, 0.25);
  offForearm.rotation.x = -0.45;
  offArm.add(offPauldron, offForearm);
  torso.add(offArm);

  // Right Primary Weapon Arm
  const weaponArm = new THREE.Group();
  weaponArm.position.set(chestW * 0.66, 0.25, 0.05);
  const pauldron = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.56, 0.64), armor);
  weaponArm.add(pauldron);

  const gunGroup = new THREE.Group();
  gunGroup.position.set(0.08, -0.46, 0.55);
  weaponArm.add(gunGroup);

  const gunBodyLen = titanClassId === 'northstar' ? 2.4 : titanClassId === 'legion' ? 1.85 : 1.55;
  const gunBody = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.42, gunBodyLen), frame);
  gunGroup.add(gunBody);

  let barrelSpin = null;
  if (titanClassId === 'legion') {
    barrelSpin = new THREE.Group();
    barrelSpin.position.z = 1.05;
    for (let b = 0; b < 6; b++) {
      const ang = (b / 6) * Math.PI * 2;
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.35, 6), frame);
      bar.rotation.x = Math.PI / 2;
      bar.position.set(Math.cos(ang) * 0.14, Math.sin(ang) * 0.14, 0);
      barrelSpin.add(bar);
    }
    gunGroup.add(barrelSpin);
  } else {
    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.11, titanClassId === 'northstar' ? 1.8 : 1.15, 10),
      frame
    );
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.04, gunBodyLen * 0.56);
    gunGroup.add(barrel);
  }
  torso.add(weaponArm);

  // Defensive Shield Mesh (Vortex / Thermal / Gun Shield toggleable visibility)
  const shieldColor = titanClassId === 'scorch' ? 0xf97316 : titanClassId === 'legion' ? 0xfacc15 : 0x38bdf8;
  const shieldMesh = new THREE.Mesh(
    new THREE.SphereGeometry(1.45, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.55),
    new THREE.MeshBasicMaterial({
      color: shieldColor,
      transparent: true,
      opacity: 0.34,
      side: THREE.DoubleSide,
      depthWrite: false
    })
  );
  shieldMesh.rotation.x = Math.PI / 2;
  shieldMesh.position.set(0, 0.1, chestD * 0.85);
  shieldMesh.visible = false;
  torso.add(shieldMesh);

  root.traverse((c) => {
    if (c.isMesh) {
      c.castShadow = true;
      c.receiveShadow = true;
    }
  });

  return {
    root,
    torso,
    leftLeg,
    rightLeg,
    weaponArm,
    offArm,
    barrelSpin,
    batteryCore,
    shieldMesh,
    eyeMat,
    armorMat: armor,
    pal
  };
}

/**
 * Build agile Titanfall 2 Pilot with visor helmet, jump-kit twin thrusters & R-201/Carbine rig
 */
export function buildPilotRig(team = 'militia', skinId = 'srs_bt7274', tacticalId = 'grapple', customColors = null) {
  const pal = resolveSkin(skinId, team, customColors);
  const suitTex = getPilotSuitTexture(pal.primary, pal.accent);
  const suitMat = new THREE.MeshStandardMaterial({
    map: suitTex,
    roughness: 0.55,
    metalness: 0.35
  });
  const armorMat = new THREE.MeshStandardMaterial({
    color: pal.secondary,
    roughness: 0.38,
    metalness: 0.65
  });
  const visorMat = new THREE.MeshStandardMaterial({
    color: pal.visor,
    emissive: pal.visor,
    emissiveIntensity: 1.5,
    roughness: 0.15
  });

  const root = new THREE.Group();

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.72, 0.34), suitMat);
  torso.position.y = 1.18;
  root.add(torso);

  // Pilot Visor Helmet
  const helmet = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.38, 0.4), armorMat);
  helmet.position.y = 1.76;
  root.add(helmet);

  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.15, 0.08), visorMat);
  visor.position.set(0, 1.78, 0.19);
  root.add(visor);

  // Signature Jump-Kit Thrusters on lower back
  const jumpPack = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.36, 0.22), armorMat);
  jumpPack.position.set(0, 1.16, -0.24);
  root.add(jumpPack);

  const jetMat = new THREE.MeshBasicMaterial({ color: team === 'militia' ? 0x38bdf8 : 0xf97316 });
  const jetL = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.22, 8), jetMat);
  jetL.position.set(-0.14, 1.0, -0.32);
  jetL.rotation.x = Math.PI * 0.85;
  const jetR = jetL.clone();
  jetR.position.x = 0.14;
  root.add(jetL, jetR);

  // Limbs
  const legGeo = new THREE.BoxGeometry(0.2, 0.76, 0.22);
  const leftLeg = new THREE.Mesh(legGeo, suitMat);
  leftLeg.position.set(-0.14, 0.42, 0);
  const rightLeg = new THREE.Mesh(legGeo, suitMat);
  rightLeg.position.set(0.14, 0.42, 0);
  root.add(leftLeg, rightLeg);

  const gunArm = new THREE.Group();
  gunArm.position.set(0.32, 1.32, 0.1);
  const sleeve = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.48), suitMat);
  sleeve.position.z = 0.18;
  const rifle = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.16, 0.72), new THREE.MeshStandardMaterial({
    color: 0x1e293b, metalness: 0.78, roughness: 0.3
  }));
  rifle.position.set(0, 0, 0.45);
  gunArm.add(sleeve, rifle);
  root.add(gunArm);

  root.traverse((c) => {
    if (c.isMesh) {
      c.castShadow = true;
      c.receiveShadow = true;
    }
  });

  return { root, leftLeg, rightLeg, gunArm, suitMat, visorMat, jetMat };
}

/**
 * First-person Pilot weapon viewmodel
 */
export function buildPilotViewmodel(weaponId = 'r201', skinId = 'srs_bt7274', customColors = null) {
  const pal = resolveSkin(skinId, 'militia', customColors);
  const g = new THREE.Group();

  const gunMetal = new THREE.MeshStandardMaterial({
    map: getEnvironmentTexture('gunmetal'),
    color: 0x475569,
    metalness: 0.82,
    roughness: 0.28
  });
  const bodyAccent = new THREE.MeshStandardMaterial({
    color: pal.primary,
    metalness: 0.55,
    roughness: 0.36
  });
  const opticGlow = new THREE.MeshBasicMaterial({
    color: weaponId === 'epg1' ? 0x38bdf8 : weaponId === 'smart_pistol' ? 0x22d3ee : pal.accent
  });

  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.56), bodyAccent);
  g.add(receiver);

  const barrelLen = weaponId === 'kraber' ? 0.82 : weaponId === 'smart_pistol' ? 0.24 : 0.44;
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.032, barrelLen, 10), gunMetal);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.03, -0.28 - barrelLen * 0.42);
  g.add(barrel);

  // Holo Sight / Smart Core strip
  const holoFrame = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.06, 0.09), gunMetal);
  holoFrame.position.set(0, 0.11, -0.05);
  const holoLens = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.035, 0.015), opticGlow);
  holoLens.position.set(0, 0.115, -0.05);
  g.add(holoFrame, holoLens);

  if (weaponId === 'epg1' || weaponId === 'archer') {
    const core = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.26, 10), opticGlow);
    core.rotation.x = Math.PI / 2;
    core.position.set(0, 0.02, -0.25);
    g.add(core);
  }

  // Gloved hand
  const glove = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.11, 0.24), new THREE.MeshStandardMaterial({
    color: 0x0f172a, roughness: 0.72
  }));
  glove.position.set(0.02, -0.1, 0.18);
  g.add(glove);

  g.position.set(0.28, -0.26, -0.45);
  return g;
}

/**
 * Diegetic Titan Cockpit Viewmodel (Canopy Frame Struts + Chassis Weapon + Defensive Shield)
 */
export function buildTitanCockpitViewmodel(titanClassId = 'vanguard', skinId = 'srs_bt7274', customColors = null) {
  const spec = TITAN_CLASSES[titanClassId] || TITAN_CLASSES.vanguard;
  const pal = resolveSkin(skinId || spec.defaultSkin, 'militia', customColors);
  const root = new THREE.Group();

  const strutMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.85,
    roughness: 0.3
  });
  const trimMat = new THREE.MeshBasicMaterial({ color: pal.visor });

  // Diegetic angled cockpit canopy A-pillars at screen periphery (never block center crosshair!)
  const leftStrut = new THREE.Mesh(new THREE.BoxGeometry(0.075, 1.35, 0.08), strutMat);
  leftStrut.position.set(-0.78, 0.05, -0.82);
  leftStrut.rotation.z = -0.22;
  const rightStrut = leftStrut.clone();
  rightStrut.position.x = 0.78;
  rightStrut.rotation.z = 0.22;

  const topBrow = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.08, 0.1), strutMat);
  topBrow.position.set(0, 0.56, -0.82);
  const browGlow = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.014, 0.02), trimMat);
  browGlow.position.set(0, 0.51, -0.78);
  root.add(leftStrut, rightStrut, topBrow, browGlow);

  // Massive Right-Hand Titan Weapon
  const gunGroup = new THREE.Group();
  gunGroup.position.set(0.46, -0.34, -0.72);
  const gunMetal = new THREE.MeshStandardMaterial({
    map: getEnvironmentTexture('gunmetal'),
    color: 0x334155,
    metalness: 0.84,
    roughness: 0.26
  });
  const armorPaint = new THREE.MeshStandardMaterial({
    color: pal.primary,
    metalness: pal.metalness,
    roughness: pal.roughness
  });

  const casing = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.24, 0.78), armorPaint);
  gunGroup.add(casing);

  let barrelSpin = null;
  if (titanClassId === 'legion') {
    barrelSpin = new THREE.Group();
    barrelSpin.position.set(0, 0.02, -0.6);
    for (let b = 0; b < 6; b++) {
      const a = (b / 6) * Math.PI * 2;
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.65, 6), gunMetal);
      bar.rotation.x = Math.PI / 2;
      bar.position.set(Math.cos(a) * 0.07, Math.sin(a) * 0.07, 0);
      barrelSpin.add(bar);
    }
    gunGroup.add(barrelSpin);
  } else {
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.055, 0.75, 10), gunMetal);
    bar.rotation.x = Math.PI / 2;
    bar.position.set(0, 0.03, -0.58);
    gunGroup.add(bar);
  }
  root.add(gunGroup);

  // Left-side Defensive Shield Emitter (Vortex / Thermal / Gun / Particle)
  const shieldColor = titanClassId === 'scorch' ? 0xf97316 : titanClassId === 'legion' ? 0xfacc15 : 0x38bdf8;
  const shieldMesh = new THREE.Mesh(
    new THREE.RingGeometry(0.22, 0.56, 20),
    new THREE.MeshBasicMaterial({
      color: shieldColor,
      transparent: true,
      opacity: 0.42,
      side: THREE.DoubleSide
    })
  );
  shieldMesh.position.set(-0.22, -0.06, -0.74);
  shieldMesh.visible = false;
  root.add(shieldMesh);

  // Ronin Broadsword left-hand blade
  let swordMesh = null;
  if (titanClassId === 'ronin') {
    swordMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.78, 0.14),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.92, roughness: 0.16 })
    );
    swordMesh.position.set(-0.44, -0.18, -0.68);
    swordMesh.rotation.set(-0.35, 0.25, -0.4);
    root.add(swordMesh);
  }

  return { root, gunGroup, barrelSpin, shieldMesh, swordMesh };
}

export function buildBatteryMesh() {
  const g = new THREE.Group();
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.68, 12), new THREE.MeshStandardMaterial({
    color: 0x22c55e,
    emissive: 0x22c55e,
    emissiveIntensity: 1.4,
    roughness: 0.25
  }));
  const ring = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.18, 0.46), new THREE.MeshStandardMaterial({
    color: 0x1e293b, metalness: 0.8, roughness: 0.3
  }));
  g.add(cap, ring);
  return g;
}

export function buildGruntRig(team = 'imc') {
  const color = team === 'militia' ? 0x4b5d3b : 0x94a3b8;
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.66, 0.28), new THREE.MeshStandardMaterial({ color, roughness: 0.75 }));
  body.position.y = 1.08;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.3, 0.28), new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6 }));
  head.position.y = 1.62;
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.72, 0.24), new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85 }));
  legs.position.y = 0.38;
  g.add(body, head, legs);
  return g;
}

export function buildEvacDropship() {
  const g = new THREE.Group();
  const hullMat = new THREE.MeshStandardMaterial({
    map: getTitanArmorTextures('EVAC-64', 'six_four', 0.25).map,
    metalness: 0.68,
    roughness: 0.32
  });
  const hull = new THREE.Mesh(new THREE.BoxGeometry(4.2, 2.2, 9.5), hullMat);
  const cockpit = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.3, 2.4), new THREE.MeshStandardMaterial({
    color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.9, metalness: 0.9, roughness: 0.15
  }));
  cockpit.position.set(0, 0.2, 5.1);
  const wingL = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.4, 2.8), hullMat);
  wingL.position.set(-4.2, 0.6, -1.0);
  const wingR = wingL.clone();
  wingR.position.x = 4.2;
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(4.2, 4.7, 24),
    new THREE.MeshBasicMaterial({ color: 0x22c55e, side: THREE.DoubleSide })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = -3.8;
  g.add(hull, cockpit, wingL, wingR, ring);
  return g;
}
