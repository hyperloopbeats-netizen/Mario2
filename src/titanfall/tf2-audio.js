// Titanfall 2 — Procedural WebAudio Combat, Jump-Kit, Grapple, Titanfall & Core Sound Engine
import { daemonSupervisor } from '../studio/daemons.js';

export class TitanfallAudio {
  constructor(sharedMarioAudio = null) {
    this.sharedAudio = sharedMarioAudio;
    this.ctx = null;
    this.sfxEnabled = true;
    this.volume = 0.44;
  }

  ensureCtx() {
    if (!this.sfxEnabled) return null;
    if (this.sharedAudio && typeof this.sharedAudio.unlock === 'function') {
      this.sharedAudio.unlock();
      if (this.sharedAudio.ctx) {
        this.ctx = this.sharedAudio.ctx;
        return this.ctx;
      }
    }
    if (!this.ctx && typeof window !== 'undefined') {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) this.ctx = new AC();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  play(type, intensity = 1) {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const vol = this.volume * Math.min(1.5, intensity);

    switch (type) {
      case 'r201':
      case 'smart_pistol':
        this.noiseBurst(ctx, now, 0.055, 1900, vol * 0.36);
        this.tone(ctx, now, 420, 140, 0.05, 'sawtooth', vol * 0.32);
        break;
      case 'eva8':
      case 'leadwall':
        this.noiseBurst(ctx, now, 0.16, 820, vol * 0.65);
        this.tone(ctx, now, 140, 42, 0.14, 'triangle', vol * 0.72);
        break;
      case 'epg1':
        this.tone(ctx, now, 680, 180, 0.22, 'sine', vol * 0.52);
        this.tone(ctx, now, 340, 90, 0.2, 'sawtooth', vol * 0.34);
        break;
      case 'kraber':
        this.noiseBurst(ctx, now, 0.2, 2600, vol * 0.75);
        this.tone(ctx, now, 980, 110, 0.18, 'sawtooth', vol * 0.55);
        break;
      case 'archer':
      case 'salvo':
        this.noiseBurst(ctx, now, 0.25, 640, vol * 0.6);
        this.tone(ctx, now, 220, 62, 0.24, 'sawtooth', vol * 0.5);
        break;
      case 'chaingun':
      case 'predator':
        this.noiseBurst(ctx, now, 0.05, 1100, vol * 0.38);
        this.tone(ctx, now, 135, 58, 0.055, 'sawtooth', vol * 0.42);
        break;
      case 'railgun':
        this.tone(ctx, now, 1480, 220, 0.24, 'sawtooth', vol * 0.65);
        this.noiseBurst(ctx, now, 0.18, 2200, vol * 0.5);
        break;
      case 'thermite':
        this.tone(ctx, now, 180, 55, 0.24, 'square', vol * 0.55);
        this.noiseBurst(ctx, now, 0.28, 520, vol * 0.62);
        break;
      case 'tracker_40mm':
        this.tone(ctx, now, 260, 75, 0.14, 'square', vol * 0.55);
        this.noiseBurst(ctx, now, 0.12, 950, vol * 0.45);
        break;
      case 'jumpkit':
        this.noiseBurst(ctx, now, 0.12, 1600, vol * 0.34);
        this.tone(ctx, now, 210, 440, 0.11, 'sine', vol * 0.26);
        break;
      case 'slide':
        this.noiseBurst(ctx, now, 0.22, 900, vol * 0.28);
        break;
      case 'grapple':
        this.tone(ctx, now, 420, 1250, 0.14, 'triangle', vol * 0.42);
        this.noiseBurst(ctx, now, 0.1, 2100, vol * 0.3);
        break;
      case 'titan_dash':
        this.noiseBurst(ctx, now, 0.2, 650, vol * 0.62);
        this.tone(ctx, now, 160, 68, 0.18, 'sawtooth', vol * 0.52);
        break;
      case 'titanfall_boom':
        // Massive orbital drop impact!
        this.noiseBurst(ctx, now, 0.72, 240, vol * 1.15);
        this.tone(ctx, now, 110, 24, 0.68, 'sawtooth', vol * 1.0);
        this.tone(ctx, now + 0.08, 320, 80, 0.35, 'triangle', vol * 0.65);
        daemonSupervisor.pulseBeat(1.4);
        break;
      case 'embark':
        this.tone(ctx, now, 180, 320, 0.16, 'square', vol * 0.45);
        this.tone(ctx, now + 0.14, 340, 680, 0.2, 'sine', vol * 0.48);
        this.noiseBurst(ctx, now + 0.25, 0.15, 1400, vol * 0.3);
        break;
      case 'battery':
        this.tone(ctx, now, 520, 1040, 0.14, 'sine', vol * 0.5);
        this.tone(ctx, now + 0.12, 780, 1560, 0.16, 'triangle', vol * 0.48);
        break;
      case 'core_activate':
        this.tone(ctx, now, 280, 880, 0.38, 'sawtooth', vol * 0.65);
        this.tone(ctx, now + 0.06, 560, 1420, 0.36, 'sine', vol * 0.55);
        daemonSupervisor.pulseBeat(1.2);
        break;
      case 'eject_alarm':
        for (let k = 0; k < 3; k++) {
          this.tone(ctx, now + k * 0.11, 880, 620, 0.09, 'square', vol * 0.5);
        }
        break;
      case 'lock_chirp':
        this.tone(ctx, now, 1680, 1920, 0.04, 'sine', vol * 0.28);
        break;
      case 'hit_ding':
        this.tone(ctx, now, 1420, 1480, 0.055, 'sine', vol * 0.38);
        break;
      case 'explosion':
        this.noiseBurst(ctx, now, 0.4, 280, vol * 0.85);
        this.tone(ctx, now, 90, 26, 0.36, 'sawtooth', vol * 0.72);
        break;
      default:
        break;
    }
  }

  tone(ctx, startTime, fStart, fEnd, dur, type, vol) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, fStart), startTime);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, fEnd), startTime + dur);
    g.gain.setValueAtTime(Math.max(0.001, vol), startTime);
    g.gain.exponentialRampToValueAtTime(0.001, startTime + dur);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + dur + 0.02);
  }

  noiseBurst(ctx, startTime, dur, filterFreq, vol) {
    const len = Math.max(128, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(filterFreq, startTime);
    const g = ctx.createGain();
    g.gain.setValueAtTime(Math.max(0.001, vol), startTime);
    g.gain.exponentialRampToValueAtTime(0.001, startTime + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(ctx.destination);
    src.start(startTime);
  }
}
