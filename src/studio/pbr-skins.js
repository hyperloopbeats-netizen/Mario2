// Shared Procedural PBR Skin & Stencil Texture Forge (Daemon 21: pbrTextureForge)
// Zero external asset URLs — 100% CanvasTexture albedo + linear bump/roughness maps.

import * as THREE from 'three';
import { daemonSupervisor } from './daemons.js';

const textureCache = new Map();

export const SKIN_PALETTES = {
  // Titanfall 2 Authentic Chassis + Faction Liveries
  srs_bt7274: {
    id: 'srs_bt7274',
    name: 'SRS Vanguard (BT-7274)',
    primary: '#4b5d3b',
    secondary: '#e2e8f0',
    accent: '#f97316',
    visor: '#38bdf8',
    stencil: 'BT-7274',
    subStencil: 'MILITIA SRS',
    metalness: 0.62,
    roughness: 0.36
  },
  imc_factory: {
    id: 'imc_factory',
    name: 'IMC Standard Issue',
    primary: '#cbd5e1',
    secondary: '#334155',
    accent: '#0ea5e9',
    visor: '#38bdf8',
    stencil: 'IMC-01',
    subStencil: 'HAMMOND',
    metalness: 0.68,
    roughness: 0.32
  },
  apex_predators: {
    id: 'apex_predators',
    name: 'Apex Predators',
    primary: '#27272a',
    secondary: '#991b1b',
    accent: '#ef4444',
    visor: '#fb923c',
    stencil: 'APEX-9',
    subStencil: 'BLISK',
    metalness: 0.72,
    roughness: 0.28
  },
  six_four: {
    id: 'six_four',
    name: 'The 6-4 Elite',
    primary: '#1e3a5f',
    secondary: '#94a3b8',
    accent: '#38bdf8',
    visor: '#7dd3fc',
    stencil: '6-4',
    subStencil: 'FRONTIER',
    metalness: 0.66,
    roughness: 0.3
  },
  stoic_black: {
    id: 'stoic_black',
    name: 'Stoic Dark Obsidian',
    primary: '#111827',
    secondary: '#1f2937',
    accent: '#ef4444',
    visor: '#f87171',
    stencil: 'GEN-10',
    subStencil: 'BLACK GLASS',
    metalness: 0.84,
    roughness: 0.18
  },
  gold_prime: {
    id: 'gold_prime',
    name: 'Prime Australium Gold',
    primary: '#b45309',
    secondary: '#1e293b',
    accent: '#facc15',
    visor: '#fef08a',
    stencil: 'PRIME',
    subStencil: 'AEGIS-20',
    metalness: 0.92,
    roughness: 0.18
  }
};

function createCanvas(size = 256) {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  return [c, c.getContext('2d')];
}

function finalizeTexture(canvas, { srgb = true, repeatX = 1, repeatY = 1, anisotropy = 4 } = {}) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = anisotropy;
  tex.needsUpdate = true;
  if (daemonSupervisor?.daemons?.pbrTextureForge) {
    daemonSupervisor.daemons.pbrTextureForge.texturesForged++;
  }
  return tex;
}

function seededNoise(x, y, seed = 13) {
  const n = Math.sin(x * 12.9898 + y * 78.233 + seed * 37.719) * 43758.5453;
  return n - Math.floor(n);
}

/**
 * Draw authentic military Titan armor plating + panel seams + caution stripes + stencils + battle wear
 */
export function drawTitanPlateCanvas(ctx, size, opts = {}) {
  const {
    primary = '#4b5d3b',
    secondary = '#e2e8f0',
    accent = '#f97316',
    stencil = 'BT-7274',
    subStencil = 'SRS',
    wear = 0.35
  } = opts;

  ctx.fillStyle = primary;
  ctx.fillRect(0, 0, size, size);

  // Subtle brushed metal & mottled matte armor variation
  for (let y = 0; y < size; y += 8) {
    for (let x = 0; x < size; x += 8) {
      const n = seededNoise(x, y, 7);
      ctx.fillStyle = n > 0.5 ? `rgba(255,255,255,${0.025 + n * 0.03})` : `rgba(0,0,0,${0.04 + n * 0.04})`;
      ctx.fillRect(x, y, 8, 8);
    }
  }

  // Secondary shoulder/chest armor band
  ctx.fillStyle = secondary;
  ctx.fillRect(0, Math.round(size * 0.14), size, Math.round(size * 0.18));

  // Signature Titanfall diagonal caution stripe
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, Math.round(size * 0.68), size, Math.round(size * 0.15));
  ctx.clip();
  ctx.fillStyle = accent;
  ctx.fillRect(0, Math.round(size * 0.68), size, Math.round(size * 0.15));
  ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
  for (let sx = -size; sx < size * 2; sx += 26) {
    ctx.beginPath();
    ctx.moveTo(sx, size * 0.68);
    ctx.lineTo(sx + 12, size * 0.68);
    ctx.lineTo(sx - 10, size * 0.85);
    ctx.lineTo(sx - 22, size * 0.85);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // Panel seams & rivets
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.lineWidth = Math.max(2, size / 96);
  ctx.strokeRect(8, 8, size - 16, size - 16);
  ctx.beginPath();
  ctx.moveTo(0, size * 0.52);
  ctx.lineTo(size, size * 0.52);
  ctx.moveTo(size * 0.5, 8);
  ctx.lineTo(size * 0.5, size * 0.52);
  ctx.stroke();

  // Highlights on upper edges
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(10, 10);
  ctx.lineTo(size - 10, 10);
  ctx.moveTo(0, size * 0.52 + 2);
  ctx.lineTo(size, size * 0.52 + 2);
  ctx.stroke();

  // Corner hex bolts
  ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
  const boltPos = [
    [18, 18], [size - 18, 18],
    [18, size * 0.46], [size - 18, size * 0.46],
    [18, size - 18], [size - 18, size - 18]
  ];
  for (const [bx, by] of boltPos) {
    ctx.beginPath();
    ctx.arc(bx, by, 3.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Crisp military stencil typography
  ctx.fillStyle = '#0f172a';
  ctx.font = `700 ${Math.round(size * 0.11)}px "JetBrains Mono", monospace`;
  ctx.textAlign = 'left';
  ctx.fillText(stencil, Math.round(size * 0.08), Math.round(size * 0.26));

  ctx.fillStyle = 'rgba(248, 250, 252, 0.88)';
  ctx.font = `600 ${Math.round(size * 0.07)}px "JetBrains Mono", monospace`;
  ctx.fillText(subStencil, Math.round(size * 0.08), Math.round(size * 0.44));

  // Cooling vent louvers
  ctx.fillStyle = 'rgba(10, 14, 20, 0.85)';
  for (let v = 0; v < 4; v++) {
    ctx.fillRect(Math.round(size * 0.62), Math.round(size * (0.37 + v * 0.036)), Math.round(size * 0.28), Math.round(size * 0.018));
  }

  // Battle wear & metallic edge scratches
  if (wear > 0.02) {
    const scratchCount = Math.round(wear * 42);
    for (let i = 0; i < scratchCount; i++) {
      const sx = seededNoise(i, 3, 21) * size;
      const sy = seededNoise(i, 9, 45) * size;
      const len = 8 + seededNoise(i, 15, 9) * 24;
      ctx.strokeStyle = i % 3 === 0 ? 'rgba(226, 232, 240, 0.35)' : 'rgba(15, 23, 42, 0.45)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + len, sy + (seededNoise(i, 2, 3) - 0.5) * 6);
      ctx.stroke();
    }
  }
}

export function getTitanArmorTextures(chassisName, skinConfig, wear = 0.35, customColors = null) {
  const pal = SKIN_PALETTES[skinConfig] || SKIN_PALETTES.srs_bt7274;
  const primary = customColors?.primary || pal.primary;
  const secondary = customColors?.secondary || pal.secondary;
  const accent = customColors?.accent || pal.accent;
  const stencil = customColors?.stencil || chassisName || pal.stencil;
  const subStencil = pal.subStencil || 'FRONTIER';
  const key = `titan:${primary}:${secondary}:${accent}:${stencil}:${wear.toFixed(2)}`;
  if (textureCache.has(key)) return textureCache.get(key);

  const [c, ctx] = createCanvas(256);
  drawTitanPlateCanvas(ctx, 256, { primary, secondary, accent, stencil, subStencil, wear });

  const [bc, bctx] = createCanvas(256);
  bctx.fillStyle = '#808080';
  bctx.fillRect(0, 0, 256, 256);
  bctx.strokeStyle = '#202020';
  bctx.lineWidth = 4;
  bctx.strokeRect(8, 8, 240, 240);
  bctx.beginPath();
  bctx.moveTo(0, 132);
  bctx.lineTo(256, 132);
  bctx.stroke();
  bctx.fillStyle = '#303030';
  for (let v = 0; v < 4; v++) {
    bctx.fillRect(158, 94 + v * 9, 72, 4);
  }

  const pair = {
    map: finalizeTexture(c, { srgb: true }),
    bumpMap: finalizeTexture(bc, { srgb: false })
  };
  textureCache.set(key, pair);
  return pair;
}

export function getPilotSuitTexture(primaryHex = '#334155', accentHex = '#38bdf8') {
  const key = `pilot:${primaryHex}:${accentHex}`;
  if (textureCache.has(key)) return textureCache.get(key);
  const [c, ctx] = createCanvas(128);
  ctx.fillStyle = primaryHex;
  ctx.fillRect(0, 0, 128, 128);
  // Tactical carbon hex mesh
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.36)';
  ctx.lineWidth = 1.5;
  for (let y = 0; y < 128; y += 12) {
    for (let x = 0; x < 128; x += 12) {
      ctx.strokeRect(x + ((y / 12) % 2) * 6, y, 10, 10);
    }
  }
  // Chest rig harness + glowing jump-kit accent line
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 44, 128, 22);
  ctx.fillStyle = accentHex;
  ctx.fillRect(0, 52, 128, 5);
  const tex = finalizeTexture(c, { srgb: true });
  textureCache.set(key, tex);
  return tex;
}

/**
 * Frontier / Badlands Environment PBR Surfaces (Zero blank grids!)
 */
export function getEnvironmentTexture(kind = 'frontier_tarmac', repeatX = 1, repeatY = 1) {
  const key = `env:${kind}:${repeatX}:${repeatY}`;
  if (textureCache.has(key)) return textureCache.get(key);
  const [c, ctx] = createCanvas(256);

  if (kind === 'tf2_sandstone') {
    // Classic TF2 Badlands / Dustbowl warm canyon sandstone
    ctx.fillStyle = '#8b6343';
    ctx.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 8) {
      for (let x = 0; x < 256; x += 8) {
        const n = seededNoise(x, y, 31);
        ctx.fillStyle = n > 0.55 ? 'rgba(229, 178, 122, 0.14)' : 'rgba(67, 40, 24, 0.18)';
        ctx.fillRect(x, y, 8, 8);
      }
    }
    ctx.strokeStyle = 'rgba(58, 34, 18, 0.35)';
    ctx.lineWidth = 3;
    for (let y = 0; y < 256; y += 64) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(256, y);
      ctx.stroke();
      const offset = ((y / 64) % 2) * 64;
      for (let x = offset; x < 256; x += 128) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + 64);
        ctx.stroke();
      }
    }
  } else if (kind === 'tf2_wood') {
    // TF2 2Fort / Sawmill timber planks + nail heads
    ctx.fillStyle = '#6f4528';
    ctx.fillRect(0, 0, 256, 256);
    for (let p = 0; p < 4; p++) {
      const y = p * 64;
      ctx.fillStyle = p % 2 === 0 ? '#7c4d2d' : '#653d22';
      ctx.fillRect(0, y + 2, 256, 60);
      ctx.fillStyle = '#3e2311';
      ctx.fillRect(0, y, 256, 3);
      for (let g = 0; g < 8; g++) {
        ctx.fillStyle = 'rgba(40, 20, 8, 0.25)';
        ctx.fillRect(0, y + 8 + g * 7, 256, 2);
      }
      ctx.fillStyle = '#1e293b';
      [18, 128, 238].forEach((nx) => {
        ctx.beginPath();
        ctx.arc(nx, y + 14, 3, 0, Math.PI * 2);
        ctx.arc(nx, y + 50, 3, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  } else if (kind === 'tf2_corrugated_red' || kind === 'tf2_corrugated_blu') {
    const base = kind === 'tf2_corrugated_red' ? '#7f1d1d' : '#1e3a8a';
    const hi = kind === 'tf2_corrugated_red' ? '#b91c1c' : '#2563eb';
    const lo = kind === 'tf2_corrugated_red' ? '#450a0a' : '#172554';
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, 256, 256);
    for (let x = 0; x < 256; x += 16) {
      ctx.fillStyle = hi;
      ctx.fillRect(x, 0, 6, 256);
      ctx.fillStyle = lo;
      ctx.fillRect(x + 8, 0, 6, 256);
    }
    // Weathering grime & white stripe
    ctx.fillStyle = 'rgba(248, 250, 252, 0.85)';
    ctx.fillRect(0, 194, 256, 22);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.fillRect(0, 0, 256, 18);
  } else if (kind === 'frontier_wallrun') {
    // High-contrast Titanfall 2 Wallrun Panel (chevron directional guide + worn alloy)
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(10, 10, 236, 236);
    // Bright cyan wallrun chevrons so players immediately spot parkour lines!
    ctx.fillStyle = '#0ea5e9';
    for (let x = 24; x < 236; x += 64) {
      ctx.beginPath();
      ctx.moveTo(x, 96);
      ctx.lineTo(x + 24, 128);
      ctx.lineTo(x, 160);
      ctx.lineTo(x + 14, 160);
      ctx.lineTo(x + 38, 128);
      ctx.lineTo(x + 14, 96);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = '#f97316';
    ctx.fillRect(0, 20, 256, 10);
    ctx.fillRect(0, 226, 256, 10);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '700 18px "JetBrains Mono", monospace';
    ctx.fillText('WALLRUN // PILOT LANE', 22, 62);
  } else if (kind === 'frontier_tarmac') {
    // Angel City / Frontier military tarmac concrete + lane markings
    ctx.fillStyle = '#252c38';
    ctx.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 8) {
      for (let x = 0; x < 256; x += 8) {
        const n = seededNoise(x, y, 77);
        ctx.fillStyle = n > 0.5 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.06)';
        ctx.fillRect(x, y, 8, 8);
      }
    }
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.7)';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, 252, 252);
    ctx.fillStyle = 'rgba(249, 115, 22, 0.55)';
    ctx.fillRect(0, 122, 256, 10);
    ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
    ctx.fillRect(124, 0, 8, 256);
  } else {
    // Gunmetal weapon / chassis brushed steel
    ctx.fillStyle = '#334155';
    ctx.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 2) {
      const a = seededNoise(y, 1, 5) * 0.09;
      ctx.fillStyle = `rgba(255,255,255,${a})`;
      ctx.fillRect(0, y, 256, 1);
    }
  }

  const tex = finalizeTexture(c, { srgb: true, repeatX, repeatY });
  textureCache.set(key, tex);
  return tex;
}

export function getTf2UniformTexture(team = 'red', skinId = 'standard', classId = 'soldier', customColors = null) {
  const key = `tf2merc:${team}:${skinId}:${classId}:${customColors?.primary || ''}:${customColors?.accent || ''}`;
  if (textureCache.has(key)) return textureCache.get(key);
  const [c, ctx] = createCanvas(256);

  const isRed = team === 'red';
  let coat = isRed ? '#b8383b' : '#395c78';
  let vest = isRed ? '#5c2b29' : '#263849';
  let trim = '#e5c299';
  if (skinId === 'black_liquid') {
    coat = isRed ? '#271419' : '#0f1c2e';
    vest = '#090d14';
    trim = isRed ? '#ef4444' : '#38bdf8';
  } else if (skinId === 'australium') {
    coat = '#d97706';
    vest = '#78350f';
    trim = '#fef08a';
  } else if (skinId === 'cryo_chrome') {
    coat = isRed ? '#be123c' : '#0284c7';
    vest = '#1e293b';
    trim = '#bae6fd';
  }
  if (customColors?.primary) coat = customColors.primary;
  if (customColors?.accent) trim = customColors.accent;

  // Cloth weave texture
  ctx.fillStyle = coat;
  ctx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 4) {
    ctx.fillStyle = y % 8 === 0 ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.05)';
    ctx.fillRect(0, y, 256, 2);
  }
  // Tactical mercenary leather/kevlar vest
  ctx.fillStyle = vest;
  ctx.fillRect(0, 56, 256, 130);
  // Stitched seam lines & pockets
  ctx.strokeStyle = 'rgba(0,0,0,0.45)';
  ctx.lineWidth = 3;
  ctx.strokeRect(20, 74, 86, 54);
  ctx.strokeRect(150, 74, 86, 54);

  // Class emblem stripe
  ctx.fillStyle = trim;
  ctx.fillRect(0, 198, 256, 24);
  ctx.fillStyle = '#0f172a';
  ctx.font = '700 20px "JetBrains Mono", monospace';
  ctx.fillText(`${team.toUpperCase()} · ${classId.toUpperCase()}`, 18, 217);

  const tex = finalizeTexture(c, { srgb: true });
  textureCache.set(key, tex);
  return tex;
}

/**
 * Renders live PBR Texture UV Atlas + Palette Swatch Preview into Sentient Skin Foundry 2D Canvas
 */
export function renderSkinAtlasPreview(canvas, config = {}) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  ctx.fillStyle = '#05080f';
  ctx.fillRect(0, 0, w, h);

  // Left half: Main Titan/Mech UV Plate
  const plateSize = Math.min(Math.floor(h * 0.84), Math.floor(w * 0.44));
  const [tmp, tctx] = createCanvas(256);
  drawTitanPlateCanvas(tctx, 256, {
    primary: config.primary || '#4b5d3b',
    secondary: config.secondary || '#e2e8f0',
    accent: config.accent || '#f97316',
    stencil: config.stencil || 'BT-7274',
    subStencil: config.subStencil || 'MILITIA SRS',
    wear: Number(config.wear ?? 0.35)
  });
  ctx.drawImage(tmp, 24, 24, plateSize, plateSize);
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.strokeRect(24, 24, plateSize, plateSize);

  // Right half top: Pilot / TF2 Mercenary Weave Swatch
  const rx = 44 + plateSize;
  const rw = Math.max(120, w - rx - 24);
  ctx.fillStyle = config.primary || '#4b5d3b';
  ctx.fillRect(rx, 24, rw, 90);
  ctx.fillStyle = config.accent || '#f97316';
  ctx.fillRect(rx, 92, rw, 16);
  ctx.fillStyle = '#f8fafc';
  ctx.font = '600 13px "JetBrains Mono", monospace';
  ctx.fillText(`ALBEDO UV · ${config.stencil || 'BT-7274'}`, rx + 12, 54);
  ctx.fillStyle = '#cbd5e1';
  ctx.font = '12px "JetBrains Mono", monospace';
  ctx.fillText(`METAL ${(Number(config.metalness ?? 0.65) * 100).toFixed(0)}% · ROUGH ${(Number(config.roughness ?? 0.35) * 100).toFixed(0)}% · WEAR ${(Number(config.wear ?? 0.35) * 100).toFixed(0)}%`, rx + 12, 76);

  // Right half bottom: Specular/Visor/Decal Channels
  const bars = [
    { label: 'PRIMARY ARMOR', hex: config.primary || '#4b5d3b' },
    { label: 'SECONDARY TRIM', hex: config.secondary || '#e2e8f0' },
    { label: 'HAZARD STRIPE', hex: config.accent || '#f97316' },
    { label: 'OPTIC VISOR', hex: config.visor || '#38bdf8' }
  ];
  bars.forEach((b, i) => {
    const by = 136 + i * 44;
    if (by + 34 > h - 14) return;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(rx, by, rw, 34);
    ctx.fillStyle = b.hex;
    ctx.fillRect(rx + 6, by + 6, 48, 22);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '600 11px "JetBrains Mono", monospace';
    ctx.fillText(`${b.label} (${b.hex.toUpperCase()})`, rx + 66, by + 22);
  });
}
