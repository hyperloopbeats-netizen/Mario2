// Team Fortress — Black Liquid Arena: Procedural WebAudio Weapon & Objective SFX Engine
import { daemonSupervisor } from '../studio/daemons.js';

export class FortressAudio {
  constructor(marioAudio) {
    this.marioAudio = marioAudio;
    this.ctx = null;
    this.sfxEnabled = true;
    this.volume = 0.42;
  }

  ensureCtx() {
    if (!this.sfxEnabled) return null;
    if (this.marioAudio && typeof this.marioAudio.unlock === 'function') {
      this.marioAudio.unlock();
      if (this.marioAudio.ctx) {
        this.ctx = this.marioAudio.ctx;
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
    const masterGain = this.volume * Math.min(1.4, intensity);

    switch (type) {
      case 'scattergun':
      case 'shotgun':
        this.noiseBurst(ctx, now, 0.14, 720, masterGain * 0.55);
        this.tone(ctx, now, 130, 52, 0.12, 'triangle', masterGain * 0.65);
        break;
      case 'rocket':
        this.tone(ctx, now, 220, 68, 0.22, 'sawtooth', masterGain * 0.55);
        this.noiseBurst(ctx, now, 0.18, 480, masterGain * 0.35);
        break;
      case 'explosion':
        this.noiseBurst(ctx, now, 0.36, 260, masterGain * 0.85);
        this.tone(ctx, now, 95, 28, 0.34, 'sawtooth', masterGain * 0.75);
        daemonSupervisor.pulseBeat(1.0);
        break;
      case 'flame':
        this.noiseBurst(ctx, now, 0.08, 1200, masterGain * 0.22);
        break;
      case 'airblast':
        this.noiseBurst(ctx, now, 0.18, 1900, masterGain * 0.5);
        this.tone(ctx, now, 340, 820, 0.14, 'sine', masterGain * 0.35);
        break;
      case 'grenade':
        this.tone(ctx, now, 290, 110, 0.12, 'square', masterGain * 0.45);
        break;
      case 'minigun':
        this.noiseBurst(ctx, now, 0.055, 1100, masterGain * 0.28);
        this.tone(ctx, now, 165, 85, 0.05, 'sawtooth', masterGain * 0.25);
        break;
      case 'sniper':
        this.noiseBurst(ctx, now, 0.16, 2200, masterGain * 0.6);
        this.tone(ctx, now, 920, 180, 0.15, 'sawtooth', masterGain * 0.45);
        break;
      case 'revolver':
      case 'syringe':
        this.tone(ctx, now, 540, 190, 0.08, 'square', masterGain * 0.38);
        break;
      case 'backstab':
        this.tone(ctx, now, 1150, 420, 0.18, 'sawtooth', masterGain * 0.65);
        this.tone(ctx, now + 0.06, 1520, 880, 0.14, 'sine', masterGain * 0.5);
        break;
      case 'hit_ding':
        this.tone(ctx, now, 1320, 1360, 0.065, 'sine', masterGain * 0.42);
        break;
      case 'crit_ding':
        this.tone(ctx, now, 1760, 2120, 0.12, 'triangle', masterGain * 0.58);
        break;
      case 'sentry_beep':
        this.tone(ctx, now, 1840, 1840, 0.045, 'sine', masterGain * 0.24);
        break;
      case 'sentry_shoot':
        this.tone(ctx, now, 620, 240, 0.05, 'square', masterGain * 0.25);
        break;
      case 'uber':
        this.tone(ctx, now, 320, 640, 0.28, 'sawtooth', masterGain * 0.45);
        this.tone(ctx, now + 0.08, 480, 960, 0.28, 'sine', masterGain * 0.45);
        break;
      case 'cap_point':
        this.tone(ctx, now, 523.25, 523.25, 0.1, 'triangle', masterGain * 0.45);
        this.tone(ctx, now + 0.1, 659.25, 659.25, 0.1, 'triangle', masterGain * 0.45);
        this.tone(ctx, now + 0.2, 783.99, 783.99, 0.22, 'triangle', masterGain * 0.5);
        break;
      case 'jump':
        this.tone(ctx, now, 190, 390, 0.09, 'sine', masterGain * 0.28);
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
