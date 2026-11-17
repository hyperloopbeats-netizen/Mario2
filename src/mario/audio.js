// Procedural Retro Chiptune & SFX Synthesizer (Web Audio API)
import { daemonSupervisor } from '../studio/daemons.js';

const NOTE_FREQ = {
  G2: 98.00, A2: 110.00, Bb2: 116.54, B2: 123.47,
  C3: 130.81, D3: 146.83, Eb3: 155.56, E3: 164.81, F3: 174.61, Fs3: 185.00, G3: 196.00, Ab3: 207.65, A3: 220.00, Bb3: 233.08, B3: 246.94,
  C4: 261.63, Cs4: 277.18, D4: 293.66, Eb4: 311.13, E4: 329.63, F4: 349.23, Fs4: 369.99, G4: 392.00, Ab4: 415.30, A4: 440.00, Bb4: 466.16, B4: 493.88,
  C5: 523.25, Cs5: 554.37, D5: 587.33, Eb5: 622.25, E5: 659.25, F5: 698.46, Fs5: 739.99, G5: 783.99, Ab5: 830.61, A5: 880.00, Bb5: 932.33, B5: 987.77,
  C6: 1046.50, D6: 1174.66, E6: 1318.51, G6: 1567.98
};

const THEMES = {
  overworld: {
    tempo: 150,
    waveform: 'square',
    fireColor: '#f97316',
    lead: [
      'E5', 'E5', null, 'E5', null, 'C5', 'E5', null, 'G5', null, null, null, 'G4', null, null, null,
      'C5', null, null, 'G4', null, null, 'E4', null, null, 'A4', null, 'B4', null, 'Bb4', 'A4', null,
      'G4', 'E5', 'G5', 'A5', null, 'F5', 'G5', null, 'E5', null, 'C5', 'D5', 'B4', null, null, null
    ],
    bass: [
      'D3', 'D3', null, 'D3', null, 'D3', 'D3', null, 'G3', null, null, null, 'G2', null, null, null,
      'G3', null, null, 'E3', null, null, 'C3', null, null, 'F3', null, 'G3', null, 'Fs3', 'F3', null,
      'E3', 'C4', 'E4', 'F4', null, 'D4', 'E4', null, 'C4', null, 'A3', 'B3', 'G3', null, null, null
    ]
  },
  underground: {
    tempo: 145,
    waveform: 'square',
    fireColor: '#38bdf8',
    lead: [
      'C4', 'C5', 'A3', 'A4', 'Bb3', 'Bb4', null, null,
      'C4', 'C5', 'A3', 'A4', 'Bb3', 'Bb4', null, null,
      'F3', 'F4', 'D3', 'D4', 'Eb3', 'Eb4', null, null,
      'F3', 'F4', 'D3', 'D4', 'Eb3', 'Eb4', null, null
    ],
    bass: [
      'C3', null, 'A2', null, 'Bb2', null, null, null,
      'C3', null, 'A2', null, 'Bb2', null, null, null,
      'F2', null, 'D2', null, 'Eb2', null, null, null,
      'F2', null, 'D2', null, 'Eb2', null, null, null
    ]
  },
  sky: {
    tempo: 165,
    waveform: 'triangle',
    fireColor: '#a855f7',
    lead: [
      'G4', 'B4', 'D5', 'G5', 'F5', 'D5', 'E5', 'C5',
      'A4', 'C5', 'E5', 'A5', 'G5', 'E5', 'D5', null,
      'G4', 'C5', 'E5', 'G5', 'F5', 'E5', 'D5', 'B4',
      'C5', 'E5', 'G5', 'C6', null, 'G5', 'C5', null
    ],
    bass: [
      'G3', null, 'D3', null, 'G3', null, 'C3', null,
      'A3', null, 'E3', null, 'A3', null, 'D3', null,
      'C3', null, 'G3', null, 'D3', null, 'G3', null,
      'C3', null, 'G3', null, 'C4', null, 'G3', null
    ]
  },
  star: {
    tempo: 220,
    waveform: 'square',
    fireColor: '#fde047',
    lead: [
      'C5', 'C5', 'C5', 'D5', 'C5', null, 'C5', 'D5',
      'B4', 'B4', 'B4', 'C5', 'B4', null, 'B4', 'C5'
    ],
    bass: [
      'F3', 'C4', 'F3', 'C4', 'F3', 'C4', 'F3', 'C4',
      'E3', 'B3', 'E3', 'B3', 'E3', 'B3', 'E3', 'B3'
    ]
  },
  custom: {
    tempo: 148,
    waveform: 'square',
    fireColor: '#38bdf8',
    lead: ['C5', null, 'E5', null, 'G5', null, 'E5', 'G5', 'A5', null, 'G5', null, 'E5', 'D5', 'C5', null],
    bass: ['C3', null, 'G3', null, 'C3', null, 'G3', null, 'F3', null, 'C4', null, 'G3', null, 'C3', null]
  }
};

export class MarioAudio {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.muted = false;
    this.sfxEnabled = true;
    this.musicEnabled = true;
    this.volume = 0.45;
    this.currentTheme = 'overworld';
    this.customActive = false;
    this.stepIndex = 0;
    this.musicTimer = null;
    this.isPlayingMusic = false;
    this.onStep = null;
  }

  ensureContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : this.volume;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  setVolume(val) {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime, 0.02);
    }
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : this.volume, this.ctx.currentTime, 0.02);
    }
  }

  setMusicEnabled(enabled) {
    this.musicEnabled = enabled;
    if (!enabled) {
      this.stopMusic();
    } else if (this.isPlayingMusic) {
      this.startMusic(this.currentTheme);
    }
  }

  setCustomScore(sonic) {
    if (!sonic) return;
    const cleanArr = (arr, fallback) => {
      if (!Array.isArray(arr) || arr.length === 0) return fallback;
      return arr.slice(0, 16).map((n) => (n && n !== '-' && NOTE_FREQ[n] ? n : null));
    };
    THEMES.custom = {
      tempo: Math.max(85, Math.min(230, Number(sonic.tempo) || 148)),
      waveform: ['square', 'sawtooth', 'triangle'].includes(sonic.waveform) ? sonic.waveform : 'square',
      fireColor: typeof sonic.fireColor === 'string' && /^#[0-9a-fA-F]{6}$/.test(sonic.fireColor) ? sonic.fireColor : '#38bdf8',
      lead: cleanArr(sonic.lead, THEMES.custom.lead),
      bass: cleanArr(sonic.bass, THEMES.custom.bass)
    };
    this.customActive = true;
    daemonSupervisor.pulseBeat(1.0, THEMES.custom.fireColor);
    if (this.isPlayingMusic) {
      this.startMusic('custom');
    }
  }

  getCustomTheme() {
    return THEMES.custom;
  }

  tone(freq, startOffset, duration, type = 'square', gainVal = 0.18, endFreq = null) {
    const ctx = this.ensureContext();
    if (!ctx || this.muted) return;
    const t0 = ctx.currentTime + startOffset;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (endFreq !== null) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), t0 + duration);
    }
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(gainVal, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }

  noise(startOffset, duration, gainVal = 0.14) {
    const ctx = this.ensureContext();
    if (!ctx || this.muted) return;
    const sampleCount = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, sampleCount, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < sampleCount; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / sampleCount);
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 600;
    const g = ctx.createGain();
    const t0 = ctx.currentTime + startOffset;
    g.gain.setValueAtTime(gainVal, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.masterGain);
    src.start(t0);
  }

  playSfx(name) {
    if (!this.sfxEnabled || this.muted) return;
    this.ensureContext();
    switch (name) {
      case 'jump':
        this.tone(240, 0, 0.18, 'square', 0.16, 620);
        break;
      case 'bigJump':
        this.tone(180, 0, 0.22, 'square', 0.16, 520);
        break;
      case 'coin':
        this.tone(987.77, 0, 0.07, 'square', 0.18);
        this.tone(1318.51, 0.07, 0.24, 'square', 0.18);
        break;
      case 'bump':
        this.tone(160, 0, 0.09, 'triangle', 0.22, 85);
        break;
      case 'breakBrick':
        this.noise(0, 0.14, 0.24);
        this.tone(190, 0, 0.08, 'square', 0.15, 70);
        break;
      case 'stomp':
        this.tone(360, 0, 0.09, 'square', 0.18, 120);
        break;
      case 'kick':
        this.tone(260, 0, 0.11, 'sawtooth', 0.18, 540);
        break;
      case 'fireball':
        this.tone(680, 0, 0.09, 'square', 0.14, 210);
        daemonSupervisor.pulseBeat(0.55);
        break;
      case 'blaster':
        this.tone(860, 0, 0.07, 'sawtooth', 0.12, 240);
        daemonSupervisor.pulseBeat(0.45);
        break;
      case 'dash':
        this.noise(0, 0.09, 0.14);
        this.tone(320, 0, 0.09, 'triangle', 0.14, 580);
        break;
      case 'powerup':
        ['C4', 'E4', 'G4', 'C5', 'E5', 'G5', 'C6'].forEach((n, i) => {
          this.tone(NOTE_FREQ[n], i * 0.055, 0.09, 'square', 0.15);
        });
        break;
      case 'powerdown':
        this.tone(520, 0, 0.12, 'sawtooth', 0.18, 280);
        this.tone(380, 0.12, 0.18, 'sawtooth', 0.18, 130);
        break;
      case 'oneUp':
        ['E5', 'G5', 'E6', 'C6', 'D6', 'G6'].forEach((n, i) => {
          this.tone(NOTE_FREQ[n], i * 0.065, 0.09, 'square', 0.16);
        });
        break;
      case 'pipe':
        this.tone(330, 0, 0.08, 'square', 0.15, 160);
        this.tone(290, 0.09, 0.08, 'square', 0.15, 130);
        this.tone(250, 0.18, 0.1, 'square', 0.15, 100);
        break;
      case 'flagpole':
        ['G4', 'C5', 'E5', 'G5', 'C6', 'E6'].forEach((n, i) => {
          this.tone(NOTE_FREQ[n], i * 0.08, 0.14, 'square', 0.16);
        });
        break;
      case 'stageClear':
        [
          ['G4', 0], ['C5', 0.1], ['E5', 0.2], ['G5', 0.3],
          ['E5', 0.44], ['G5', 0.56]
        ].forEach(([n, off]) => this.tone(NOTE_FREQ[n], off, 0.14, 'square', 0.18));
        this.tone(NOTE_FREQ.C6, 0.72, 0.45, 'square', 0.2);
        break;
      case 'gameOver':
        [
          ['C5', 0], ['G4', 0.18], ['E4', 0.36],
          ['A4', 0.54], ['B4', 0.72], ['A4', 0.9], ['Ab4', 1.08], ['G4', 1.26]
        ].forEach(([n, off]) => this.tone(NOTE_FREQ[n], off, 0.18, 'triangle', 0.22));
        break;
      case 'pause':
        this.tone(660, 0, 0.06, 'square', 0.14);
        this.tone(880, 0.06, 0.08, 'square', 0.14);
        break;
    }
  }

  startMusic(themeName = 'overworld') {
    const resolved = (this.customActive && themeName !== 'star') ? 'custom' : (THEMES[themeName] ? themeName : 'overworld');
    this.currentTheme = resolved;
    this.isPlayingMusic = true;
    this.stopMusicTimer();
    if (!this.musicEnabled) return;

    const theme = THEMES[this.currentTheme];
    const stepMs = Math.round((60 / theme.tempo / 2) * 1000);
    this.stepIndex = 0;

    this.musicTimer = window.setInterval(() => {
      if (!this.musicEnabled || this.muted || !this.ctx || this.ctx.state !== 'running') return;
      const t = THEMES[this.currentTheme];
      const stepMod = this.stepIndex % Math.max(1, t.lead.length);
      const leadNote = t.lead[stepMod];
      const bassNote = t.bass[this.stepIndex % Math.max(1, t.bass.length)];

      if (leadNote && NOTE_FREQ[leadNote]) {
        this.tone(NOTE_FREQ[leadNote], 0, (stepMs / 1000) * 0.85, t.waveform || 'square', 0.065);
      }
      if (bassNote && NOTE_FREQ[bassNote]) {
        this.tone(NOTE_FREQ[bassNote] * 0.5, 0, (stepMs / 1000) * 0.9, 'triangle', 0.09);
      }
      if (this.stepIndex % 2 === 0 || leadNote) {
        daemonSupervisor.pulseBeat(bassNote ? 0.85 : 0.4, t.fireColor);
      }
      if (this.onStep) this.onStep(stepMod, leadNote, bassNote);
      this.stepIndex++;
    }, stepMs);
  }

  stopMusicTimer() {
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  stopMusic() {
    this.stopMusicTimer();
  }
}
