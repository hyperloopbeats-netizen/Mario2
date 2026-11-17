// App 3: Data Multiplier Engine — Multiplies CAD structures, Team Fortress squads,
// World Forge entities, and Data Vault batches with linear, exponential, or radial transforms.

import { sanitizeCadAssembly, logGuardEvent } from './app-pattern-guard.js';

export class DataMultiplierApp {
  constructor(canvas, cadApp, matrixEngine, fortressGame = null) {
    this.canvas = canvas;
    this.ctx = canvas ? canvas.getContext('2d') : null;
    this.cadApp = cadApp;
    this.matrixEngine = matrixEngine;
    this.fortressGame = fortressGame;

    this.config = {
      domain: 'fortress_squads', // 'fortress_squads' | 'cad_radial' | 'world_loot' | 'shader_matrix'
      factor: 4,                 // 1, 2, 4, 8, 16, 32
      curve: 'linear',           // 'linear' | 'exponential' | 'radial'
      botScalePerTeam: 4,
      hpMultiplier: 1.0,
      damageMultiplier: 1.0,
      cadRingRadius: 2.2
    };

    this.lastBatch = [];
    this.listeners = new Set();
  }

  onChange(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  setConfig(partial) {
    Object.assign(this.config, partial);
    this.computeBatch();
    this.renderVisualizer();
    this.listeners.forEach((fn) => fn(this.config, this.lastBatch));
  }

  computeBatch() {
    const { domain, factor, curve, hpMultiplier, damageMultiplier, cadRingRadius } = this.config;
    const count = Math.max(1, Math.min(32, Math.round(factor)));
    const batch = [];

    if (domain === 'fortress_squads') {
      const classes = ['scout', 'soldier', 'pyro', 'demoman', 'heavy', 'engineer', 'medic', 'sniper', 'spy'];
      for (let i = 0; i < count; i++) {
        const growth = curve === 'exponential' ? Math.pow(1.06, i) : 1 + i * 0.03;
        batch.push({
          slot: i + 1,
          team: i % 2 === 0 ? 'RED' : 'BLU',
          classId: classes[i % classes.length],
          hpMult: Number((hpMultiplier * growth).toFixed(2)),
          dmgMult: Number((damageMultiplier * (0.95 + (i % 4) * 0.05)).toFixed(2))
        });
      }
    } else if (domain === 'cad_radial') {
      const baseParts = this.cadApp?.currentAssembly?.parts || [];
      const srcCount = Math.max(1, baseParts.length);
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        batch.push({
          instance: i + 1,
          angleDeg: Math.round((angle * 180) / Math.PI),
          x: Number((Math.cos(angle) * cadRingRadius).toFixed(2)),
          z: Number((Math.sin(angle) * cadRingRadius).toFixed(2)),
          partRefCount: srcCount
        });
      }
    } else {
      for (let i = 0; i < count; i++) {
        const mult = curve === 'exponential' ? Number(Math.pow(1.15, i).toFixed(2)) : Number((1 + i * 0.25).toFixed(2));
        batch.push({
          id: `${domain}_${i + 1}`,
          weight: mult,
          seed: 1000 + i * 137
        });
      }
    }

    this.lastBatch = batch;
    return batch;
  }

  /**
   * Multiply the current Liquid CAD assembly radially or linearly and push to CAD/Matrix/Fortress
   */
  multiplyCurrentCad() {
    const base = this.cadApp?.currentAssembly;
    if (!base || !Array.isArray(base.parts)) return null;

    const ringCount = Math.max(2, Math.min(8, Math.round(this.config.factor)));
    const r = Number(this.config.cadRingRadius) || 2.1;
    const outParts = [];

    // Keep central hub
    base.parts.slice(0, 3).forEach((p, idx) => {
      outParts.push({ ...p, label: `Core ${p.label || idx + 1}` });
    });

    const coreSample = base.parts[0] || { shape: 'oct', color: '#38bdf8', metalness: 0.85, roughness: 0.18 };
    for (let i = 0; i < ringCount; i++) {
      const angle = (i / ringCount) * Math.PI * 2;
      const sample = base.parts[i % base.parts.length] || coreSample;
      outParts.push({
        label: `M${i + 1} ${sample.label || 'Node'}`,
        shape: sample.shape,
        position: [
          Number((Math.cos(angle) * r).toFixed(2)),
          Number(Math.max(0.45, Math.min(3.5, sample.position?.[1] || 1.4)).toFixed(2)),
          Number((Math.sin(angle) * r).toFixed(2))
        ],
        rotation: [0, -angle, 0],
        scale: [
          Math.max(0.18, (sample.scale?.[0] || 0.7) * 0.65),
          Math.max(0.22, (sample.scale?.[1] || 0.8) * 0.75),
          Math.max(0.18, (sample.scale?.[2] || 0.7) * 0.65)
        ],
        color: sample.color || '#38bdf8',
        emissive: sample.emissive || '#000000',
        emissiveIntensity: sample.emissiveIntensity || 0.25,
        metalness: sample.metalness ?? 0.82,
        roughness: sample.roughness ?? 0.2,
        spinSpeed: i % 2 === 0 ? 1.1 : -1.1
      });
    }

    const { assembly } = sanitizeCadAssembly({
      name: `${base.name} [x${ringCount} Array]`,
      summary: `Data Multiplier generated ${ringCount}x radial CAD matrix (${outParts.length} total parts).`,
      parts: outParts
    });

    if (typeof this.cadApp?.setAssembly === 'function') this.cadApp.setAssembly(assembly);
    if (typeof this.matrixEngine?.setCadAssembly === 'function') this.matrixEngine.setCadAssembly(assembly);
    if (typeof this.fortressGame?.setCenterMonument === 'function') {
      this.fortressGame.setCenterMonument(assembly);
    }
    logGuardEvent('Data Multiplier', 'ok', `Multiplied CAD into ${ringCount}x radial array`, false);
    this.renderVisualizer();
    return assembly;
  }

  applyToFortress() {
    if (!this.fortressGame) return;
    this.fortressGame.applyMultiplierSettings({
      botsPerTeam: Math.max(1, Math.min(6, Math.round(this.config.botScalePerTeam))),
      hpMult: this.config.hpMultiplier,
      dmgMult: this.config.damageMultiplier
    });
    logGuardEvent('Data Multiplier', 'ok', `Pushed ${this.config.botScalePerTeam}v${this.config.botScalePerTeam} (${this.config.hpMultiplier}x HP) to Team Fortress`, false);
  }

  renderVisualizer() {
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    ctx.fillStyle = '#03060c';
    ctx.fillRect(0, 0, w, h);

    // Grid
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.14)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 48) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y < h; y += 48) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    const batch = this.lastBatch.length ? this.lastBatch : this.computeBatch();
    const cx = w * 0.5;
    const cy = h * 0.52;
    const maxR = Math.min(w, h) * 0.34;

    // Central seed core
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, maxR, 0, Math.PI * 2);
    ctx.stroke();

    batch.forEach((item, idx) => {
      const a = (idx / Math.max(1, batch.length)) * Math.PI * 2 - Math.PI / 2;
      const dist = maxR * (0.55 + (idx % 3) * 0.18);
      const px = cx + Math.cos(a) * dist;
      const py = cy + Math.sin(a) * dist;

      ctx.strokeStyle = item.team === 'BLU' ? 'rgba(56, 189, 248, 0.45)' : 'rgba(239, 68, 68, 0.45)';
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(px, py);
      ctx.stroke();

      ctx.fillStyle = item.team === 'BLU' ? '#38bdf8' : (item.team === 'RED' ? '#ef4444' : '#f59e0b');
      ctx.beginPath();
      ctx.arc(px, py, 9, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#f8fafc';
      ctx.font = '600 10px monospace';
      ctx.textAlign = 'center';
      const label = item.classId ? item.classId.slice(0, 4).toUpperCase() : `#${idx + 1}`;
      ctx.fillText(label, px, py - 14);
    });

    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.arc(cx, cy, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#030508';
    ctx.font = '700 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${this.config.factor}x`, cx, cy + 4);
  }
}
