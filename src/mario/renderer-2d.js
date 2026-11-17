import { LEVEL_HEIGHT } from './levels.js';
import { createSpriteSheet } from './sprites-2d.js';
import { daemonSupervisor } from '../studio/daemons.js';

export class MarioRenderer2D {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.sprites = createSpriteSheet();
    this.tilePx = 32;
    this.controlsSafeBottomPx = 0;
  }

  resize(width, height) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.max(300, Math.floor(width * dpr));
    this.canvas.height = Math.max(200, Math.floor(height * dpr));
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.viewWidth = width;
    this.viewHeight = height;
    this.tilePx = Math.max(16, height / LEVEL_HEIGHT);
  }

  render(engine) {
    const ctx = this.ctx;
    const w = this.viewWidth || this.canvas.clientWidth || 800;
    const h = this.viewHeight || this.canvas.clientHeight || 480;

    // Reserve clean bedrock safe-zone below floor whenever mobile thumbsticks or touch pad are open
    const scalerEnabled = daemonSupervisor.daemons.mobileViewportScaler.enabled;
    const safeBottom = scalerEnabled ? Math.min(h * 0.34, this.controlsSafeBottomPx || 0) : 0;
    const playableH = Math.max(180, h - safeBottom);
    const T = playableH / LEVEL_HEIGHT;

    if (scalerEnabled) {
      const visibleTiles = Math.max(10, Math.min(28, w / Math.max(1, T)));
      engine.viewTiles = visibleTiles;
      daemonSupervisor.daemons.mobileViewportScaler.viewTiles = Math.round(visibleTiles);
    }

    const level = engine.level;
    const camX = engine.cameraX;

    ctx.imageSmoothingEnabled = false;

    // Sky / Cavern Backdrop
    ctx.fillStyle = level.skyColor;
    ctx.fillRect(0, 0, w, h);

    if (level.theme !== 'underground') {
      this.drawScenery(ctx, w, playableH, T, camX, level.theme);
    } else {
      // Architectural cavern archways instead of harsh flat dark bars
      const step = 12 * T;
      const offset = -((camX * 0.42 * T) % step);
      ctx.fillStyle = '#0c1628';
      for (let x = offset - step; x < w + step; x += step) {
        ctx.fillRect(x, 2 * T, T * 1.15, 11 * T);
        ctx.fillStyle = '#112038';
        ctx.fillRect(x + T * 0.15, 2 * T, T * 0.25, 11 * T);
        ctx.fillStyle = '#0c1628';
        ctx.beginPath();
        ctx.arc(x + step * 0.5, 4.2 * T, step * 0.4, Math.PI, 0);
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
        ctx.lineWidth = Math.max(2, T * 0.14);
        ctx.stroke();
      }
    }

    const startCol = Math.max(0, Math.floor(camX) - 1);
    const endCol = Math.min(level.width - 1, Math.ceil(camX + w / T) + 1);

    // Draw Piranha Plants behind pipe lips
    for (const pir of engine.piranhas) {
      if (!pir.alive || pir.rise <= 0.02) continue;
      const px = (pir.x - camX) * T;
      const py = (pir.baseY - pir.rise * pir.h) * T;
      ctx.save();
      ctx.beginPath();
      ctx.rect(px - 2, (pir.baseY - 2) * T, pir.w * T + 4, 2 * T);
      ctx.clip();
      ctx.drawImage(this.sprites.piranha, px, py, pir.w * T, pir.h * T);
      ctx.restore();
    }

    // Draw Pipes
    for (const pipe of level.pipes) {
      if (pipe.x + 2 < startCol || pipe.x > endCol) continue;
      this.drawPipe(ctx, (pipe.x - camX) * T, pipe.topRow * T, pipe.height * T, T);
    }

    // Draw Flagpole & Castle
    this.drawFlagpole(ctx, (level.flagX - camX) * T, T, engine.flagProgress);
    this.drawCastle(ctx, (level.castleX - camX) * T, T);

    // Draw Tile Grid
    const bumpMap = new Map();
    for (const b of engine.bumpingTiles) {
      bumpMap.set(`${b.x},${b.y}`, b.offset);
    }

    const groundSprite = level.theme === 'underground' ? this.sprites.ground_underground : this.sprites.ground_overworld;
    const brickSprite = level.theme === 'underground' ? this.sprites.brick_underground : this.sprites.brick_overworld;

    for (let r = 0; r < LEVEL_HEIGHT; r++) {
      for (let c = startCol; c <= endCol; c++) {
        const ch = level.grid[r][c];
        if (ch === '.') continue;
        const dx = (c - camX) * T;
        const bumpOffset = bumpMap.get(`${c},${r}`) || 0;
        const dy = (r + bumpOffset) * T;

        if (ch === '#') {
          ctx.drawImage(groundSprite, dx, dy, T + 0.5, T + 0.5);
        } else if (ch === 'B') {
          ctx.drawImage(brickSprite, dx, dy, T + 0.5, T + 0.5);
        } else if (ch === '?' || ch === 'M' || ch === 'S' || ch === 'U') {
          ctx.drawImage(this.sprites.qblock, dx, dy, T + 0.5, T + 0.5);
          if (Math.sin(engine.elapsed * 5 + c) > 0.6) {
            ctx.fillStyle = 'rgba(255,255,255,0.22)';
            ctx.fillRect(dx + 2, dy + 2, T - 4, 3);
          }
        } else if (ch === 'X') {
          ctx.drawImage(this.sprites.used, dx, dy, T + 0.5, T + 0.5);
        } else if (ch === 'H') {
          ctx.drawImage(this.sprites.hard, dx, dy, T + 0.5, T + 0.5);
        } else if (ch === 'P') {
          ctx.drawImage(this.sprites.platform, dx, dy, T + 0.5, T + 0.5);
        } else if (ch === 'C') {
          this.drawCoin(ctx, dx + T * 0.5, dy + T * 0.5, T * 0.34, engine.elapsed);
        }
      }
    }

    // Extend bedrock / control deck apron cleanly below level bottom when safeBottom > 0
    if (safeBottom > 2) {
      const deckY = LEVEL_HEIGHT * T;
      ctx.fillStyle = level.theme === 'underground' ? '#040812' : '#090d14';
      ctx.fillRect(0, deckY, w, h - deckY);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.fillRect(0, deckY, w, 1.5);
    }

    // Draw Items
    for (const it of engine.items) {
      const ix = (it.x - camX) * T;
      const iy = it.y * T;
      const spr = it.type === 'flower' ? this.sprites.flower
        : it.type === 'star' ? this.sprites.star
        : it.type === 'oneUp' ? this.sprites.oneUp
        : this.sprites.mushroom;
      ctx.drawImage(spr, ix, iy, it.w * T, it.h * T);
    }

    // Draw Enemies
    for (const e of engine.enemies) {
      if (!e.alive) continue;
      const ex = (e.x - camX) * T;
      const ey = e.y * T;
      let spr = this.sprites.goomba;
      if (e.type === 'goomba') {
        spr = e.squished ? this.sprites.goomba_squish : this.sprites.goomba;
      } else {
        spr = e.shell ? this.sprites[`shell_${e.color}`] : this.sprites[`koopa_${e.color}`];
      }

      ctx.save();
      ctx.translate(ex + (e.w * T) * 0.5, ey + (e.h * T) * 0.5);
      if (e.flipped) ctx.scale(1, -1);
      if (e.vx > 0 && !e.shell) ctx.scale(-1, 1);
      if (!e.squished && !e.shell && Math.sin(engine.elapsed * 12 + e.animOffset) > 0) {
        ctx.scale(e.type === 'goomba' ? -1 : 1, 1);
      }
      ctx.drawImage(spr, -(e.w * T) * 0.5, -(e.h * T) * 0.5, e.w * T, e.h * T);
      ctx.restore();
    }

    // Draw Fireballs with synced Sonic/Shader fireColor & outer glow
    for (const fb of engine.fireballs) {
      const fx = (fb.x - camX) * T + fb.w * T * 0.5;
      const fy = fb.y * T + fb.h * T * 0.5;
      const col = fb.color || '#f97316';
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(fx, fy, T * 0.36, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(fx, fy, T * 0.22, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fef9c3';
      ctx.beginPath();
      ctx.arc(fx, fy, T * 0.11, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Draw Directional Aim Reticle when Right Thumbstick / Aim is active
    if (engine.input.aiming && !engine.player.dead) {
      const p = engine.player;
      const cx = (p.x + p.w * 0.5 - camX) * T;
      const cy = (p.y + p.h * 0.42) * T;
      const fireCol = daemonSupervisor.daemons.audioBeatSync.fireColor || '#f97316';
      ctx.save();
      ctx.strokeStyle = fireCol;
      ctx.fillStyle = fireCol;
      ctx.lineWidth = 1.6;
      for (let d = 1; d <= 4; d++) {
        const rx = cx + engine.input.aimX * d * T * 0.85;
        const ry = cy + engine.input.aimY * d * T * 0.85;
        ctx.globalAlpha = 1 - d * 0.16;
        ctx.beginPath();
        ctx.arc(rx, ry, d === 4 ? T * 0.16 : T * 0.08, 0, Math.PI * 2);
        if (d === 4) ctx.stroke();
        else ctx.fill();
      }
      ctx.restore();
    }

    // Draw Mario
    this.drawMario(ctx, engine.player, camX, T, engine.elapsed);

    // Draw Particles
    for (const pt of engine.particles) {
      const px = (pt.x - camX) * T;
      const py = pt.y * T;
      if (pt.isCoinBurst) {
        this.drawCoin(ctx, px, py, T * 0.3, engine.elapsed * 2);
      } else {
        ctx.fillStyle = pt.color;
        const s = pt.size * T;
        ctx.fillRect(px - s * 0.5, py - s * 0.5, s, s);
      }
    }

    // Draw Floating Score Popups
    ctx.font = `700 ${Math.max(11, Math.round(T * 0.42))}px "JetBrains Mono", monospace`;
    ctx.textAlign = 'center';
    for (const pop of engine.popups) {
      const px = (pop.x - camX) * T;
      const py = pop.y * T;
      ctx.globalAlpha = Math.max(0, pop.life / pop.maxLife);
      ctx.fillStyle = '#0f172a';
      ctx.fillText(pop.text, px + 1, py + 1);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(pop.text, px, py);
    }
    ctx.globalAlpha = 1;
  }

  drawScenery(ctx, w, h, T, camX, theme) {
    // Layered rolling hills
    const hillSpan = 18 * T;
    const hillOffset = -((camX * 0.28 * T) % hillSpan);
    ctx.fillStyle = theme === 'sky' ? '#1e3a8a' : '#16a34a';
    for (let x = hillOffset - hillSpan; x < w + hillSpan; x += hillSpan) {
      ctx.beginPath();
      ctx.arc(x + 4 * T, 13 * T, 3.8 * T, Math.PI, 0);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + 11 * T, 13 * T, 2.5 * T, Math.PI, 0);
      ctx.fill();
    }

    // Fluffy pixel-styled clouds
    const cloudSpan = 14 * T;
    const cloudOffset = -((camX * 0.18 * T) % cloudSpan);
    ctx.fillStyle = theme === 'sky' ? 'rgba(255,255,255,0.75)' : '#ffffff';
    for (let x = cloudOffset - cloudSpan; x < w + cloudSpan; x += cloudSpan) {
      const y = 2.4 * T;
      ctx.beginPath();
      ctx.arc(x + 2 * T, y + T * 0.5, T * 0.6, 0, Math.PI * 2);
      ctx.arc(x + 2.8 * T, y + T * 0.25, T * 0.8, 0, Math.PI * 2);
      ctx.arc(x + 3.7 * T, y + T * 0.5, T * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawPipe(ctx, x, y, h, T) {
    const pw = 2 * T;
    // Shaft
    ctx.fillStyle = '#16a34a';
    ctx.fillRect(x + 3, y + T * 0.7, pw - 6, h - T * 0.7);
    ctx.fillStyle = '#4ade80';
    ctx.fillRect(x + 7, y + T * 0.7, T * 0.35, h - T * 0.7);
    ctx.fillStyle = '#14532d';
    ctx.fillRect(x + pw - T * 0.45, y + T * 0.7, T * 0.28, h - T * 0.7);

    // Lip
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(x, y, pw, T * 0.72);
    ctx.fillStyle = '#86efac';
    ctx.fillRect(x + 4, y + 2, T * 0.42, T * 0.65);
    ctx.strokeStyle = '#052e16';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, pw, T * 0.72);
  }

  drawFlagpole(ctx, x, T, progress) {
    const topY = 3.2 * T;
    const botY = 12 * T;
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(x + T * 0.42, topY, T * 0.16, botY - topY);
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.arc(x + T * 0.5, topY, T * 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Flag
    const flagY = topY + 0.3 * T + progress * (botY - topY - 1.5 * T);
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(x + T * 0.42, flagY);
    ctx.lineTo(x - T * 0.7, flagY + T * 0.45);
    ctx.lineTo(x + T * 0.42, flagY + T * 0.9);
    ctx.closePath();
    ctx.fill();

    // Pedestal
    ctx.drawImage(this.sprites.hard, x, botY, T, T);
  }

  drawCastle(ctx, x, T) {
    const baseY = 13 * T;
    // Main keep
    ctx.fillStyle = '#9a3412';
    ctx.fillRect(x, baseY - 3.5 * T, 4.4 * T, 3.5 * T);
    // Battlements
    for (let i = 0; i < 5; i++) {
      ctx.fillRect(x + i * 0.92 * T, baseY - 4.1 * T, 0.62 * T, 0.6 * T);
    }
    // Upper tower
    ctx.fillStyle = '#b45309';
    ctx.fillRect(x + 1.1 * T, baseY - 5.2 * T, 2.2 * T, 1.7 * T);
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(x + (1.1 + i * 0.8) * T, baseY - 5.7 * T, 0.55 * T, 0.5 * T);
    }
    // Doorway
    ctx.fillStyle = '#090d16';
    ctx.fillRect(x + 1.65 * T, baseY - 1.8 * T, 1.1 * T, 1.8 * T);
    ctx.beginPath();
    ctx.arc(x + 2.2 * T, baseY - 1.8 * T, 0.55 * T, Math.PI, 0);
    ctx.fill();
  }

  drawCoin(ctx, cx, cy, r, t) {
    const spin = Math.max(0.22, Math.abs(Math.cos(t * 5.2)));
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(spin, 1);
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(-r * 0.16, -r * 0.45, r * 0.32, r * 0.9);
    ctx.restore();
  }

  drawMario(ctx, p, camX, T, elapsed) {
    if (p.invulnTimer > 0 && Math.floor(elapsed * 20) % 2 === 0) return;

    let palKey = p.power;
    if (p.starTimer > 0 && Math.floor(elapsed * 16) % 2 === 0) {
      palKey = 'star';
    }

    let pose = 'idle';
    if (p.crouching && p.power !== 'small') {
      pose = 'crouch';
    } else if (!p.grounded) {
      pose = 'jump';
    } else if (Math.abs(p.vx) > 0.35) {
      pose = Math.floor(p.animTime * 2) % 2 === 0 ? 'walk1' : 'walk2';
    }

    const sprKey = `mario_${palKey === 'star' ? 'star' : p.power}_${pose === 'crouch' && p.power === 'small' ? 'idle' : pose}`;
    const spr = this.sprites[sprKey] || this.sprites.mario_small_idle;

    const mx = (p.x - camX) * T;
    const my = p.y * T;
    const mw = p.w * T * 1.2;
    const mh = p.h * T * 1.04;

    ctx.save();
    ctx.translate(mx + (p.w * T) * 0.5, my + (p.h * T) * 0.5);
    if (p.facing < 0) ctx.scale(-1, 1);
    ctx.drawImage(spr, -mw * 0.5, -mh * 0.5, mw, mh);
    ctx.restore();
  }
}
