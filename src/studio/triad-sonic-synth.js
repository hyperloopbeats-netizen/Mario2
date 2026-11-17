// Generation Triad App 3: Sonic & FX Sequencer (16-Step Chiptune + Beat Sync to Visuals & Weapons)
import { daemonSupervisor } from './daemons.js';

export const SONIC_PRESETS = {
  cyber_foundry: {
    name: 'Cyber Foundry Drive',
    tempo: 152,
    waveform: 'square',
    fireColor: '#38bdf8',
    lead: ['C5', null, 'E5', 'G5', 'A5', null, 'G5', null, 'F5', 'E5', 'D5', null, 'C5', 'G4', 'C5', null],
    bass: ['C3', null, 'C4', null, 'A2', null, 'A3', null, 'F3', null, 'G3', null, 'C3', 'G2', 'C3', null]
  },
  solar_overdrive: {
    name: 'Solar Flare Overdrive',
    tempo: 176,
    waveform: 'sawtooth',
    fireColor: '#f97316',
    lead: ['E5', 'E5', null, 'G5', 'B5', null, 'A5', 'G5', 'E5', null, 'D5', 'E5', 'G5', null, 'B4', null],
    bass: ['E3', 'E3', 'B3', 'E3', 'D3', 'D3', 'A3', 'D3', 'C3', 'C3', 'G3', 'C3', 'B2', null, 'E3', null]
  },
  arctic_pulse: {
    name: 'Arctic Crystal Arpeggio',
    tempo: 136,
    waveform: 'triangle',
    fireColor: '#22d3ee',
    lead: ['G5', 'D5', 'B4', 'D5', 'G5', 'E5', 'C5', 'E5', 'A5', 'E5', 'C5', 'E5', 'G5', 'D5', 'B4', null],
    bass: ['G2', null, 'G3', null, 'C3', null, 'C4', null, 'A2', null, 'A3', null, 'D3', null, 'G2', null]
  }
};

export class SonicSequencerApp {
  constructor(canvas, audio) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.audio = audio;
    this.score = JSON.parse(JSON.stringify(SONIC_PRESETS.cyber_foundry));
    this.activeStep = 0;

    this.audio.onStep = (stepIdx) => {
      this.activeStep = stepIdx % 16;
    };
  }

  applyScore(sonic, autoPlay = true) {
    this.score = {
      name: sonic.name || 'Custom Triad Score',
      tempo: Math.max(85, Math.min(230, Number(sonic.tempo) || 148)),
      waveform: ['square', 'sawtooth', 'triangle'].includes(sonic.waveform) ? sonic.waveform : 'square',
      fireColor: typeof sonic.fireColor === 'string' && /^#[0-9a-fA-F]{6}$/.test(sonic.fireColor) ? sonic.fireColor : '#38bdf8',
      lead: Array.isArray(sonic.lead) ? sonic.lead.slice(0, 16) : this.score.lead,
      bass: Array.isArray(sonic.bass) ? sonic.bass.slice(0, 16) : this.score.bass
    };
    this.audio.setCustomScore(this.score);
    if (autoPlay) {
      this.audio.ensureContext();
      this.audio.startMusic('custom');
    }
    daemonSupervisor.emit('triad-sonic-updated', this.score);
    this.renderVisualizer();
  }

  renderVisualizer() {
    if (!this.canvas || !this.ctx) return;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.fillStyle = '#050811';
    ctx.fillRect(0, 0, w, h);

    const pulse = daemonSupervisor.daemons.audioBeatSync.beatPulse || 0;
    const fireColor = this.score.fireColor || '#38bdf8';

    // Background radial beat halo
    const grad = ctx.createRadialGradient(w * 0.5, h * 0.5, 8, w * 0.5, h * 0.5, w * (0.28 + pulse * 0.25));
    grad.addColorStop(0, fireColor + '44');
    grad.addColorStop(1, 'rgba(5, 8, 17, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // 16-Step Dual Track Bars
    const padX = 16;
    const colW = (w - padX * 2) / 16;
    for (let i = 0; i < 16; i++) {
      const x = padX + i * colW + 2;
      const cw = colW - 4;
      const isPlayhead = i === this.activeStep;
      const hasLead = Boolean(this.score.lead[i] && this.score.lead[i] !== '-');
      const hasBass = Boolean(this.score.bass[i] && this.score.bass[i] !== '-');

      // Lead slot
      ctx.fillStyle = hasLead
        ? (isPlayhead ? '#ffffff' : fireColor)
        : (isPlayhead ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.06)');
      const leadH = hasLead ? (isPlayhead ? h * 0.34 : h * 0.24) : h * 0.12;
      ctx.fillRect(x, h * 0.44 - leadH, cw, leadH);

      // Bass slot
      ctx.fillStyle = hasBass
        ? (isPlayhead ? '#facc15' : '#ef4444')
        : (isPlayhead ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.05)');
      const bassH = hasBass ? (isPlayhead ? h * 0.3 : h * 0.2) : h * 0.1;
      ctx.fillRect(x, h * 0.54, cw, bassH);
    }

    // Playhead indicator
    ctx.fillStyle = '#f8fafc';
    ctx.font = '600 12px "JetBrains Mono", monospace';
    ctx.fillText(
      `${this.score.name} · ${this.score.tempo} BPM · ${this.score.waveform.toUpperCase()} · Fire FX ${this.score.fireColor}`,
      16,
      22
    );
  }
}
