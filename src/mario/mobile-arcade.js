// Full-Screen Mobile Classic Game Controller with Dual Analog Thumbsticks & Tactical Fire System
import { daemonSupervisor } from '../studio/daemons.js';

export class MobileArcadeController {
  constructor({ engine, renderer2D, renderer3D, onExit, onToggleMode }) {
    this.engine = engine;
    this.renderer2D = renderer2D;
    this.renderer3D = renderer3D;
    this.onExit = onExit || null;
    this.onToggleMode = onToggleMode || null;

    this.isFullscreen = false;
    this.sticksVisible = false;

    this.arcadeShell = document.getElementById('mobile-arcade-shell');
    this.arcadeStageSlot = document.getElementById('mobile-arcade-stage-slot');
    this.marioWindow = document.getElementById('win-mario');
    this.viewportEl = document.getElementById('mario-viewport');
    this.stickOverlayEl = document.getElementById('dual-stick-overlay');

    this.leftZone = document.getElementById('stick-left-zone');
    this.leftKnob = document.getElementById('stick-left-knob');
    this.rightZone = document.getElementById('stick-right-zone');
    this.rightKnob = document.getElementById('stick-right-knob');

    this.btnJump = document.getElementById('arcade-btn-jump');
    this.btnFire = document.getElementById('arcade-btn-fire');
    this.btnDash = document.getElementById('arcade-btn-dash');

    this.hudScore = document.getElementById('arc-score');
    this.hudCoins = document.getElementById('arc-coins');
    this.hudWorld = document.getElementById('arc-world');
    this.hudHeatFill = document.getElementById('arc-heat-fill');
    this.btnMode = document.getElementById('arc-btn-mode');
    this.btnExit = document.getElementById('arc-btn-exit');
    this.btnPause = document.getElementById('arc-btn-pause');

    this.leftPointerId = null;
    this.rightPointerId = null;

    this.bindEvents();
  }

  bindEvents() {
    this.bindThumbstick(this.leftZone, this.leftKnob, 'left');
    this.bindThumbstick(this.rightZone, this.rightKnob, 'right');

    if (this.btnJump) {
      const down = (e) => {
        e.preventDefault();
        this.btnJump.setPointerCapture?.(e.pointerId);
        this.engine.setKey('jump', true);
        this.btnJump.classList.add('is-pressed');
        daemonSupervisor.triggerHaptic(10);
      };
      const up = (e) => {
        e.preventDefault();
        this.engine.setKey('jump', false);
        this.btnJump.classList.remove('is-pressed');
      };
      this.btnJump.addEventListener('pointerdown', down);
      this.btnJump.addEventListener('pointerup', up);
      this.btnJump.addEventListener('pointercancel', up);
      this.btnJump.addEventListener('pointerleave', up);
    }

    if (this.btnFire) {
      const down = (e) => {
        e.preventDefault();
        this.btnFire.setPointerCapture?.(e.pointerId);
        this.engine.setKey('fire', true);
        this.btnFire.classList.add('is-pressed');
        daemonSupervisor.triggerHaptic(8);
      };
      const up = (e) => {
        e.preventDefault();
        this.engine.setKey('fire', false);
        this.btnFire.classList.remove('is-pressed');
      };
      this.btnFire.addEventListener('pointerdown', down);
      this.btnFire.addEventListener('pointerup', up);
      this.btnFire.addEventListener('pointercancel', up);
      this.btnFire.addEventListener('pointerleave', up);
    }

    if (this.btnDash) {
      const down = (e) => {
        e.preventDefault();
        this.btnDash.setPointerCapture?.(e.pointerId);
        this.engine.input.sprintKeyHeld = true;
        this.engine.setKey('sprint', true);
        this.engine.audio.playSfx('dash');
        this.btnDash.classList.add('is-pressed');
      };
      const up = (e) => {
        e.preventDefault();
        this.engine.input.sprintKeyHeld = false;
        this.engine.setKey('sprint', false);
        this.btnDash.classList.remove('is-pressed');
      };
      this.btnDash.addEventListener('pointerdown', down);
      this.btnDash.addEventListener('pointerup', up);
      this.btnDash.addEventListener('pointercancel', up);
      this.btnDash.addEventListener('pointerleave', up);
    }

    if (this.btnMode) {
      this.btnMode.addEventListener('click', () => {
        if (this.onToggleMode) this.onToggleMode();
      });
    }
    if (this.btnPause) {
      this.btnPause.addEventListener('click', () => {
        this.engine.togglePause();
        this.btnPause.textContent = this.engine.state === 'PAUSED' ? 'Resume' : 'Pause';
      });
    }
    if (this.btnExit) {
      this.btnExit.addEventListener('click', () => this.exitFullscreen());
    }
  }

  bindThumbstick(zone, knob, side) {
    if (!zone || !knob) return;
    const maxTravel = 34;

    const updateStick = (clientX, clientY) => {
      const rect = zone.getBoundingClientRect();
      const cx = rect.left + rect.width * 0.5;
      const cy = rect.top + rect.height * 0.5;
      const dx = clientX - cx;
      const dy = clientY - cy;
      const dist = Math.hypot(dx, dy);
      const clamped = Math.min(maxTravel, dist);
      const angle = Math.atan2(dy, dx);
      const kx = Math.cos(angle) * clamped;
      const ky = Math.sin(angle) * clamped;

      knob.style.transform = `translate3d(${kx.toFixed(1)}px, ${ky.toFixed(1)}px, 0)`;

      const nx = kx / maxTravel;
      const ny = ky / maxTravel;
      const filtered = daemonSupervisor.filterThumbstick(nx, ny);

      if (side === 'left') {
        this.engine.setAnalogMove(nx, ny);
      } else {
        const firing = filtered.mag > 0.28;
        this.engine.setAim(filtered.x, filtered.y, filtered.mag > 0.14, firing);
      }
    };

    const resetStick = () => {
      knob.style.transform = 'translate3d(0px, 0px, 0px)';
      knob.classList.remove('is-active');
      if (side === 'left') {
        this.leftPointerId = null;
        this.engine.setAnalogMove(0, 0);
      } else {
        this.rightPointerId = null;
        this.engine.setAim(this.engine.player.facing, 0, false, false);
      }
    };

    zone.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      zone.setPointerCapture?.(e.pointerId);
      if (side === 'left') this.leftPointerId = e.pointerId;
      else this.rightPointerId = e.pointerId;
      knob.classList.add('is-active');
      updateStick(e.clientX, e.clientY);
      daemonSupervisor.triggerHaptic(6);
    });

    zone.addEventListener('pointermove', (e) => {
      const targetId = side === 'left' ? this.leftPointerId : this.rightPointerId;
      if (e.pointerId !== targetId) return;
      e.preventDefault();
      updateStick(e.clientX, e.clientY);
    });

    const onUp = (e) => {
      const targetId = side === 'left' ? this.leftPointerId : this.rightPointerId;
      if (e.pointerId !== targetId) return;
      e.preventDefault();
      resetStick();
    };
    zone.addEventListener('pointerup', onUp);
    zone.addEventListener('pointercancel', onUp);
  }

  setSticksVisible(visible) {
    this.sticksVisible = Boolean(visible);
    if (this.stickOverlayEl) {
      this.stickOverlayEl.classList.toggle('is-hidden', !this.sticksVisible);
    }
    this.renderer2D.controlsSafeBottomPx = this.sticksVisible ? 128 : 0;
  }

  enterFullscreen(autoStartIfMenu = true) {
    if (this.isFullscreen) return;
    this.isFullscreen = true;
    this.engine.mobileArcadeActive = true;

    if (this.arcadeStageSlot && this.viewportEl) {
      this.arcadeStageSlot.appendChild(this.viewportEl);
    }
    if (this.arcadeShell) {
      this.arcadeShell.classList.remove('is-hidden');
    }
    this.setSticksVisible(true);

    if (autoStartIfMenu && (this.engine.state === 'TITLE_MENU' || this.engine.state === 'GAME_OVER' || this.engine.state === 'VICTORY')) {
      this.engine.startNewGame(this.engine.worldIndex === 3 ? 3 : this.engine.worldIndex);
    } else if (this.engine.state === 'PAUSED') {
      this.engine.togglePause();
    }

    const rect = this.viewportEl.getBoundingClientRect();
    this.renderer2D.resize(Math.max(300, rect.width), Math.max(200, rect.height));
    this.renderer3D?.resize?.(Math.max(300, rect.width), Math.max(200, rect.height));

    if (this.arcadeShell?.requestFullscreen) {
      this.arcadeShell.requestFullscreen().catch(() => {});
    }
  }

  exitFullscreen() {
    if (!this.isFullscreen) return;
    this.isFullscreen = false;
    this.engine.mobileArcadeActive = false;

    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    if (this.marioWindow && this.viewportEl) {
      this.marioWindow.appendChild(this.viewportEl);
    }
    if (this.arcadeShell) {
      this.arcadeShell.classList.add('is-hidden');
    }
    this.setSticksVisible(false);

    const rect = this.viewportEl.getBoundingClientRect();
    this.renderer2D.resize(Math.max(300, rect.width), Math.max(200, rect.height));
    this.renderer3D?.resize?.(Math.max(300, rect.width), Math.max(200, rect.height));

    if (this.onExit) this.onExit();
  }

  syncHud(renderMode) {
    if (!this.isFullscreen) return;
    if (this.hudScore) this.hudScore.textContent = String(this.engine.score).padStart(6, '0');
    if (this.hudCoins) this.hudCoins.textContent = String(this.engine.coins).padStart(2, '0');
    if (this.hudWorld) this.hudWorld.textContent = this.engine.level.id;
    if (this.btnMode) this.btnMode.textContent = renderMode === '2d' ? '3D Mode' : '2D Mode';
    if (this.btnPause) this.btnPause.textContent = this.engine.state === 'PAUSED' ? 'Resume' : 'Pause';
    if (this.hudHeatFill) {
      const pct = Math.min(100, Math.round(this.engine.fireHeat || 0));
      this.hudHeatFill.style.width = `${pct}%`;
      this.hudHeatFill.style.background = this.engine.overheated
        ? '#ef4444'
        : (daemonSupervisor.daemons.audioBeatSync.fireColor || '#f97316');
    }
  }
}
