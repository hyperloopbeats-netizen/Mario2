import { buildLevel, LEVEL_HEIGHT } from './levels.js';
import { daemonSupervisor } from '../studio/daemons.js';

const SOLID_TILES = new Set(['#', 'B', '?', 'M', 'S', 'U', 'X', 'H']);

function readHighScore() {
  try {
    return Number(localStorage.getItem('black_liquid_mario_hi') || 0) || 0;
  } catch {
    return 0;
  }
}

function saveHighScore(val) {
  try {
    localStorage.setItem('black_liquid_mario_hi', String(val));
  } catch {
    // Ignore storage quota / private mode restrictions
  }
}

export class MarioEngine {
  constructor(audio) {
    this.audio = audio;
    this.state = 'TITLE_MENU'; // 'TITLE_MENU' | 'PLAYING' | 'PAUSED' | 'STAGE_CLEAR' | 'GAME_OVER' | 'VICTORY'
    this.worldIndex = 0;
    this.customLevelTemplate = null;
    this.level = buildLevel(0);

    // Configurable physics parameters (live-editable in Black Liquid OS Physics Studio)
    this.config = {
      gravity: 42.0,
      moveSpeed: 9.2,
      sprintSpeed: 13.8,
      jumpVelocity: 16.4,
      stompBounce: 11.5
    };

    this.score = 0;
    this.highScore = readHighScore();
    this.coins = 0;
    this.lives = 3;
    this.timeLeft = 400;
    this.elapsed = 0;
    this.viewTiles = 22;
    this.mobileArcadeActive = false;
    this.timeBonusCarry = 0;
    this.timeScale = 1.0;
    this.infiniteJumps = false;

    this.input = {
      left: false,
      right: false,
      up: false,
      down: false,
      jump: false,
      jumpJustPressed: false,
      sprint: false,
      fireJustPressed: false,
      analogX: 0,
      aimX: 1,
      aimY: 0,
      aiming: false,
      aimFiring: false
    };

    this.fireHeat = 0;
    this.fireCooldown = 0;
    this.overheated = false;

    this.player = this.createPlayer();
    this.enemies = [];
    this.items = [];
    this.fireballs = [];
    this.particles = [];
    this.popups = [];
    this.bumpingTiles = []; // { x, y, offset, timer }
    this.cameraX = 0;
    this.flagProgress = 0;
    this.stageClearTimer = 0;
    this.hurtRespawnTimer = 0;
    this.comboCounter = 0;

    this.loadLevel(0, true);
  }

  createPlayer() {
    return {
      x: 3,
      y: 11,
      w: 0.78,
      h: 0.94,
      vx: 0,
      vy: 0,
      facing: 1,
      grounded: false,
      coyoteTimer: 0,
      jumpBufferTimer: 0,
      power: 'small', // 'small' | 'super' | 'fire'
      crouching: false,
      skidding: false,
      starTimer: 0,
      invulnTimer: 0,
      animTime: 0,
      dead: false,
      deathTimer: 0,
      onFlagpole: false,
      castleWalk: false
    };
  }

  cloneLevelData(src) {
    return {
      ...src,
      grid: src.grid.map((row) => [...row]),
      pipes: src.pipes.map((p) => ({ ...p })),
      enemies: src.enemies.map((e) => ({ ...e })),
      spawn: { ...src.spawn }
    };
  }

  loadLevel(worldIndex, resetPlayerPower = false) {
    if (worldIndex === 3 && this.customLevelTemplate) {
      this.worldIndex = 3;
      this.level = this.cloneLevelData(this.customLevelTemplate);
    } else {
      this.worldIndex = ((worldIndex % 3) + 3) % 3;
      this.level = buildLevel(this.worldIndex);
    }

    this.timeLeft = 400;
    this.timeBonusCarry = 0;
    this.cameraX = 0;
    this.flagProgress = 0;
    this.stageClearTimer = 0;
    this.hurtRespawnTimer = 0;
    this.comboCounter = 0;
    this.fireHeat = 0;
    this.fireCooldown = 0;
    this.overheated = false;

    const prevPower = resetPlayerPower ? 'small' : this.player.power;
    this.player = this.createPlayer();
    this.player.x = this.level.spawn.x;
    this.player.y = this.level.spawn.y;
    this.player.power = prevPower;
    this.player.h = prevPower === 'small' ? 0.94 : 1.82;
    if (prevPower !== 'small') {
      this.player.y -= 0.88;
    }

    this.enemies = this.level.enemies.map((e, idx) => ({
      id: idx,
      type: e.type,
      color: e.color || 'green',
      x: e.x,
      y: e.y,
      w: 0.86,
      h: e.type === 'koopa' ? 1.25 : 0.92,
      vx: -2.1,
      vy: 0,
      grounded: false,
      alive: true,
      squished: false,
      squishTimer: 0,
      shell: false,
      shellSliding: false,
      flipped: false,
      animOffset: idx * 0.7
    }));

    // Add Piranha Plants attached to pipes
    this.piranhas = this.level.pipes
      .filter((p) => p.piranha)
      .map((p, idx) => ({
        id: idx,
        pipeX: p.x,
        baseY: p.topRow,
        x: p.x + 0.55,
        y: p.topRow,
        w: 0.9,
        h: 1.25,
        phase: idx * 1.4,
        rise: 0,
        alive: true
      }));

    this.items = [];
    this.fireballs = [];
    this.particles = [];
    this.popups = [];
    this.bumpingTiles = [];
  }

  loadCustomLevel(levelObj, autoPlay = true) {
    if (!levelObj || !Array.isArray(levelObj.grid)) return;
    this.customLevelTemplate = this.cloneLevelData(levelObj);
    if (Number.isFinite(levelObj.gravity)) {
      this.config.gravity = levelObj.gravity;
    }
    this.loadLevel(3, false);
    daemonSupervisor.daemons.worldSeedStream.customWorldsBuilt++;
    if (autoPlay) {
      this.state = 'PLAYING';
      this.audio.ensureContext();
      this.audio.startMusic(this.level.theme);
    }
  }

  applyThoughtMutation(mut = {}) {
    if (typeof mut.gravity === 'number') {
      // Scale TF/World gravity (~32 baseline -> Mario ~42 baseline)
      this.config.gravity = Math.max(10, Math.min(68, mut.gravity * 1.3));
    }
    if (typeof mut.speedMult === 'number') {
      this.config.moveSpeed = Math.max(4.5, Math.min(18, 9.2 * mut.speedMult));
      this.config.sprintSpeed = this.config.moveSpeed * 1.5;
    }
    if (typeof mut.timeScale === 'number') {
      this.timeScale = Math.max(0.35, Math.min(1.85, mut.timeScale));
    }
    if (typeof mut.infiniteJumps === 'boolean') {
      this.infiniteJumps = mut.infiniteJumps;
    }
    if (this.level) {
      if (mut.skyColor) this.level.skyColor = mut.skyColor;
      if (mut.fogColor) this.level.fogColor = mut.fogColor;
      if (mut.marioTheme) this.level.theme = mut.marioTheme;
    }
  }

  startNewGame(worldIndex = 0) {
    this.score = 0;
    this.coins = 0;
    this.lives = 3;
    this.loadLevel(worldIndex, true);
    this.state = 'PLAYING';
    this.audio.ensureContext();
    this.audio.startMusic(this.level.theme);
  }

  selectWorld(worldIndex) {
    const wasPlaying = this.state === 'PLAYING' || this.state === 'PAUSED';
    this.loadLevel(worldIndex, false);
    this.state = 'PLAYING';
    this.audio.ensureContext();
    if (!wasPlaying || this.audio.musicEnabled) {
      this.audio.startMusic(this.level.theme);
    }
  }

  togglePause() {
    if (this.state === 'PLAYING') {
      this.state = 'PAUSED';
      this.audio.playSfx('pause');
      this.audio.stopMusic();
    } else if (this.state === 'PAUSED') {
      this.state = 'PLAYING';
      this.audio.playSfx('pause');
      this.audio.startMusic(this.player.starTimer > 0 ? 'star' : this.level.theme);
    }
  }

  addScore(points, x = null, y = null, label = null) {
    this.score += points;
    if (this.score > this.highScore) {
      this.highScore = this.score;
      saveHighScore(this.highScore);
    }
    if (x !== null && y !== null) {
      this.popups.push({
        x,
        y,
        text: label || String(points),
        vy: -2.6,
        life: 0.85,
        maxLife: 0.85
      });
    }
  }

  addCoin(x, y) {
    this.coins++;
    this.audio.playSfx('coin');
    this.addScore(200, x, y, '200');
    if (this.coins >= 100) {
      this.coins -= 100;
      this.lives++;
      this.audio.playSfx('oneUp');
      this.popups.push({ x, y: y - 0.6, text: '1UP', vy: -2.4, life: 1.0, maxLife: 1.0 });
    }
  }

  setKey(action, pressed) {
    if (action === 'jump') {
      if (pressed && !this.input.jump) {
        this.input.jumpJustPressed = true;
      }
      this.input.jump = pressed;
    } else if (action === 'sprint') {
      if (pressed && !this.input.sprint) {
        this.input.fireJustPressed = true;
      }
      this.input.sprint = pressed;
    } else if (action === 'fire') {
      if (pressed) this.input.fireJustPressed = true;
      this.input.aimFiring = pressed;
    } else {
      this.input[action] = pressed;
    }
  }

  setAnalogMove(nx, ny) {
    const filtered = daemonSupervisor.filterThumbstick(nx, ny);
    this.input.analogX = filtered.x;
    this.input.down = filtered.y > 0.58;
    if (Math.abs(filtered.x) > 0.72) {
      this.input.sprint = true;
    } else if (!this.input.sprintKeyHeld) {
      this.input.sprint = false;
    }
  }

  setAim(ax, ay, active, firing) {
    this.input.aiming = Boolean(active);
    this.input.aimFiring = Boolean(firing);
    if (active) {
      const len = Math.hypot(ax, ay);
      if (len > 0.05) {
        this.input.aimX = ax / len;
        this.input.aimY = ay / len;
      }
    }
  }

  isSolidTileAt(tx, ty) {
    if (tx < 0 || tx >= this.level.width) return tx < 0; // Left wall blocks exit
    if (ty < 0) return false;
    if (ty >= LEVEL_HEIGHT) return false;
    const ch = this.level.grid[ty][tx];
    if (SOLID_TILES.has(ch)) return true;
    for (let i = 0; i < this.level.pipes.length; i++) {
      const p = this.level.pipes[i];
      if (tx >= p.x && tx <= p.x + 1 && ty >= p.topRow && ty < 13) {
        return true;
      }
    }
    return false;
  }

  isOneWayPlatformAt(tx, ty) {
    if (tx < 0 || tx >= this.level.width || ty < 0 || ty >= LEVEL_HEIGHT) return false;
    return this.level.grid[ty][tx] === 'P';
  }

  step(dt) {
    const clampedDt = Math.min(dt, 0.05) * (this.timeScale || 1.0);
    this.elapsed += clampedDt;

    if (this.state === 'TITLE_MENU' || this.state === 'PAUSED' || this.state === 'GAME_OVER' || this.state === 'VICTORY') {
      this.input.jumpJustPressed = false;
      this.input.fireJustPressed = false;
      return;
    }

    if (this.state === 'STAGE_CLEAR') {
      this.updateStageClear(clampedDt);
      this.updateParticlesAndPopups(clampedDt);
      this.input.jumpJustPressed = false;
      this.input.fireJustPressed = false;
      return;
    }

    // PLAYING
    if (this.player.dead) {
      this.player.deathTimer += clampedDt;
      this.player.vy += this.config.gravity * 0.75 * clampedDt;
      this.player.y += this.player.vy * clampedDt;
      this.updateParticlesAndPopups(clampedDt);
      if (this.player.deathTimer > 2.1) {
        this.lives--;
        if (this.lives <= 0) {
          this.state = 'GAME_OVER';
          this.audio.stopMusic();
        } else {
          this.loadLevel(this.worldIndex, true);
          this.audio.startMusic(this.level.theme);
        }
      }
      this.input.jumpJustPressed = false;
      this.input.fireJustPressed = false;
      return;
    }

    // Timer countdown
    this.timeLeft -= clampedDt * 1.4;
    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      this.killPlayer();
      return;
    }

    // Starman / invulnerability timers
    if (this.player.invulnTimer > 0) {
      this.player.invulnTimer = Math.max(0, this.player.invulnTimer - clampedDt);
    }
    if (this.player.starTimer > 0) {
      this.player.starTimer -= clampedDt;
      if (Math.random() < 0.35) {
        this.particles.push({
          x: this.player.x + Math.random() * this.player.w,
          y: this.player.y + Math.random() * this.player.h,
          vx: (Math.random() - 0.5) * 2,
          vy: -1 - Math.random() * 2,
          size: 0.16,
          color: ['#fde047', '#38bdf8', '#fb7185', '#4ade80'][Math.floor(Math.random() * 4)],
          life: 0.35,
          gravity: 0
        });
      }
      if (this.player.starTimer <= 0) {
        this.player.starTimer = 0;
        this.audio.startMusic(this.level.theme);
      }
    }

    this.updatePlayer(clampedDt);
    this.updateFireballs(clampedDt);
    this.updateItems(clampedDt);
    this.updateEnemies(clampedDt);
    this.updatePiranhas(clampedDt);
    this.updateBumpingTiles(clampedDt);
    this.updateParticlesAndPopups(clampedDt);
    this.updateCamera(clampedDt);

    // Check Flagpole Victory Trigger
    if (this.player.x + this.player.w >= this.level.flagX + 0.25 && !this.player.onFlagpole) {
      this.triggerFlagpole();
    }

    this.input.jumpJustPressed = false;
    this.input.fireJustPressed = false;
  }

  updatePlayer(dt) {
    const p = this.player;
    const isBig = p.power !== 'small';

    // Crouch handling
    const wantsCrouch = isBig && this.input.down && p.grounded;
    if (wantsCrouch && !p.crouching) {
      p.crouching = true;
      p.y += 0.72;
      p.h = 1.1;
    } else if (!wantsCrouch && p.crouching) {
      // Ensure headroom before uncrouching
      const testY = p.y - 0.72;
      const leftTx = Math.floor(p.x + 0.06);
      const rightTx = Math.floor(p.x + p.w - 0.06);
      const topTy = Math.floor(testY);
      if (!this.isSolidTileAt(leftTx, topTy) && !this.isSolidTileAt(rightTx, topTy)) {
        p.crouching = false;
        p.y = testY;
        p.h = 1.82;
      }
    }

    // Horizontal movement (supports both discrete keys & analog thumbstick axis)
    const discreteDir = (this.input.right ? 1 : 0) - (this.input.left ? 1 : 0);
    const moveAxis = Math.abs(this.input.analogX) > 0.05 ? this.input.analogX : discreteDir;
    const moveDir = Math.sign(moveAxis);
    const speedMag = Math.min(1, Math.abs(moveAxis));
    const baseMax = (this.input.sprint || speedMag > 0.78) ? this.config.sprintSpeed : this.config.moveSpeed;
    const maxSpeed = baseMax * Math.max(0.35, speedMag);
    const accel = p.grounded ? 38 : 24;
    const decel = p.grounded ? 32 : 12;

    if (moveDir !== 0 && !p.crouching) {
      p.facing = moveDir;
      p.skidding = p.grounded && Math.sign(p.vx) !== 0 && Math.sign(p.vx) !== moveDir && Math.abs(p.vx) > 2.5;
      const turnMult = p.skidding ? 2.1 : 1.0;
      p.vx += moveAxis * accel * turnMult * dt;
      if (Math.abs(p.vx) > maxSpeed) {
        p.vx = moveDir * maxSpeed;
      }
    } else {
      p.skidding = false;
      if (Math.abs(p.vx) <= decel * dt) {
        p.vx = 0;
      } else {
        p.vx -= Math.sign(p.vx) * decel * dt;
      }
    }

    // Coyote time & jump buffering
    if (p.grounded) {
      p.coyoteTimer = 0.095;
      this.comboCounter = 0;
    } else {
      p.coyoteTimer = Math.max(0, p.coyoteTimer - dt);
    }

    if (this.input.jumpJustPressed) {
      p.jumpBufferTimer = 0.11;
    } else {
      p.jumpBufferTimer = Math.max(0, p.jumpBufferTimer - dt);
    }

    if (p.jumpBufferTimer > 0 && (p.coyoteTimer > 0 || this.infiniteJumps)) {
      const speedBonus = Math.min(2.2, Math.abs(p.vx) * 0.14);
      p.vy = -(this.config.jumpVelocity + speedBonus);
      p.grounded = false;
      p.coyoteTimer = 0;
      p.jumpBufferTimer = 0;
      this.audio.playSfx(isBig ? 'bigJump' : 'jump');
      daemonSupervisor.triggerHaptic(10);
    }

    // Variable jump height (release jump early to cut upward velocity)
    if (!this.input.jump && p.vy < -5.5) {
      p.vy += this.config.gravity * 1.45 * dt;
    }

    // Upgraded Tactical Fire System (Aimed Ballistic Fireballs & Rapid Plasma Sparks)
    this.fireCooldown = Math.max(0, this.fireCooldown - dt);
    if (this.overheated) {
      this.fireHeat = Math.max(0, this.fireHeat - dt * 42);
      if (this.fireHeat <= 15) this.overheated = false;
    } else {
      this.fireHeat = Math.max(0, this.fireHeat - dt * 28);
    }

    const wantsFire = (this.input.fireJustPressed || this.input.aimFiring) && !p.crouching;
    const isFireForm = p.power === 'fire';
    const cooldownTarget = isFireForm ? 0.18 : 0.28;
    const maxShots = isFireForm ? 5 : 3;

    if (wantsFire && this.fireCooldown <= 0 && !this.overheated && this.fireballs.length < maxShots) {
      const aimDirX = this.input.aiming ? this.input.aimX : p.facing;
      const aimDirY = this.input.aiming ? this.input.aimY : 0.16;
      const vel = daemonSupervisor.computeBallisticVector(aimDirX, aimDirY, p.facing);
      const fireColor = daemonSupervisor.daemons.audioBeatSync.fireColor || '#f97316';
      const spawnX = (aimDirX >= 0 ? p.x + p.w + 0.05 : p.x - 0.42);
      const spawnY = p.y + p.h * 0.42;

      this.fireballs.push({
        x: spawnX,
        y: spawnY,
        w: isFireForm ? 0.44 : 0.36,
        h: isFireForm ? 0.44 : 0.36,
        vx: vel.vx,
        vy: vel.vy,
        gravityScale: isFireForm ? 0.72 : 0.32,
        bouncesLeft: isFireForm ? 5 : 2,
        color: fireColor,
        life: 2.6
      });

      this.fireCooldown = cooldownTarget;
      this.fireHeat = Math.min(100, this.fireHeat + (isFireForm ? 14 : 20));
      if (this.fireHeat >= 98) this.overheated = true;

      // Muzzle spark burst
      for (let m = 0; m < 4; m++) {
        this.particles.push({
          x: spawnX + 0.2,
          y: spawnY + 0.2,
          vx: vel.vx * 0.25 + (Math.random() - 0.5) * 3,
          vy: vel.vy * 0.25 + (Math.random() - 0.5) * 3,
          size: 0.16,
          color: m % 2 === 0 ? fireColor : '#fef08a',
          life: 0.18,
          gravity: 0
        });
      }

      this.audio.playSfx(isFireForm ? 'fireball' : 'blaster');
      daemonSupervisor.triggerHaptic(8);
    }

    // Gravity
    p.vy += this.config.gravity * dt;
    if (p.vy > 26) p.vy = 26;

    // Move X & resolve solid X collisions
    p.x += p.vx * dt;
    if (p.x < 0) {
      p.x = 0;
      p.vx = 0;
    }
    if (p.x + p.w > this.level.width) {
      p.x = this.level.width - p.w;
      p.vx = 0;
    }

    const topTileY = Math.floor(p.y + 0.05);
    const botTileY = Math.floor(p.y + p.h - 0.05);

    if (p.vx > 0) {
      const rightTx = Math.floor(p.x + p.w);
      for (let ty = topTileY; ty <= botTileY; ty++) {
        if (this.isSolidTileAt(rightTx, ty)) {
          p.x = rightTx - p.w - 0.001;
          p.vx = 0;
          break;
        }
      }
    } else if (p.vx < 0) {
      const leftTx = Math.floor(p.x);
      for (let ty = topTileY; ty <= botTileY; ty++) {
        if (this.isSolidTileAt(leftTx, ty)) {
          p.x = leftTx + 1 + 0.001;
          p.vx = 0;
          break;
        }
      }
    }

    // Move Y & resolve solid + one-way platform Y collisions
    const prevBottom = p.y + p.h;
    p.y += p.vy * dt;
    p.grounded = false;

    const leftTx = Math.floor(p.x + 0.06);
    const rightTx = Math.floor(p.x + p.w - 0.06);

    if (p.vy >= 0) {
      const feetTy = Math.floor(p.y + p.h);
      for (let tx = leftTx; tx <= rightTx; tx++) {
        const hitSolid = this.isSolidTileAt(tx, feetTy);
        const hitOneWay = this.isOneWayPlatformAt(tx, feetTy) && prevBottom <= feetTy + 0.22;
        if (hitSolid || hitOneWay) {
          p.y = feetTy - p.h - 0.0005;
          p.vy = 0;
          p.grounded = true;
          break;
        }
      }
    } else if (p.vy < 0) {
      const headTy = Math.floor(p.y);
      let hitTileX = null;
      let hitDist = Infinity;
      const playerCenterX = p.x + p.w * 0.5;
      for (let tx = leftTx; tx <= rightTx; tx++) {
        if (this.isSolidTileAt(tx, headTy)) {
          const dist = Math.abs((tx + 0.5) - playerCenterX);
          if (dist < hitDist) {
            hitDist = dist;
            hitTileX = tx;
          }
        }
      }
      if (hitTileX !== null) {
        p.y = headTy + 1 + 0.001;
        p.vy = 1.5;
        this.hitBlockFromBelow(hitTileX, headTy);
      }
    }

    // Floating coin collection
    const cLeft = Math.floor(p.x);
    const cRight = Math.floor(p.x + p.w);
    const cTop = Math.floor(p.y);
    const cBot = Math.floor(p.y + p.h);
    for (let ty = cTop; ty <= cBot; ty++) {
      if (ty < 0 || ty >= LEVEL_HEIGHT) continue;
      for (let tx = cLeft; tx <= cRight; tx++) {
        if (tx < 0 || tx >= this.level.width) continue;
        if (this.level.grid[ty][tx] === 'C') {
          this.level.grid[ty][tx] = '.';
          this.addCoin(tx + 0.5, ty);
        }
      }
    }

    // Pit death check
    if (p.y > LEVEL_HEIGHT + 1.2) {
      this.killPlayer(true);
    }

    if (Math.abs(p.vx) > 0.3 && p.grounded) {
      p.animTime += dt * (Math.abs(p.vx) * 1.1);
    } else {
      p.animTime = 0;
    }
  }

  hitBlockFromBelow(tx, ty) {
    if (ty < 0 || ty >= LEVEL_HEIGHT || tx < 0 || tx >= this.level.width) return;
    const ch = this.level.grid[ty][tx];

    // Hurt enemies standing directly on top of bumped tile
    for (const e of this.enemies) {
      if (!e.alive || e.flipped) continue;
      if (e.x + e.w > tx && e.x < tx + 1 && Math.abs((e.y + e.h) - ty) < 0.35) {
        this.flipEnemy(e, Math.sign(e.x - tx) || 1);
      }
    }

    if (ch === 'B') {
      if (this.player.power !== 'small') {
        this.level.grid[ty][tx] = '.';
        this.audio.playSfx('breakBrick');
        this.addScore(50);
        const dirs = [[-3.5, -11], [3.5, -11], [-2.5, -7], [2.5, -7]];
        for (const [vx, vy] of dirs) {
          this.particles.push({
            x: tx + 0.5,
            y: ty + 0.5,
            vx,
            vy,
            size: 0.32,
            color: this.level.theme === 'underground' ? '#38bdf8' : '#c84c0c',
            life: 0.9,
            gravity: 34,
            spin: (Math.random() - 0.5) * 12
          });
        }
      } else {
        this.audio.playSfx('bump');
        this.bumpingTiles.push({ x: tx, y: ty, timer: 0.16, offset: 0 });
      }
    } else if (ch === '?' || ch === 'M' || ch === 'S' || ch === 'U') {
      this.level.grid[ty][tx] = 'X';
      this.bumpingTiles.push({ x: tx, y: ty, timer: 0.18, offset: 0 });

      if (ch === '?') {
        this.addCoin(tx + 0.5, ty - 0.5);
        this.particles.push({
          x: tx + 0.5,
          y: ty - 0.2,
          vx: 0,
          vy: -9.5,
          size: 0.45,
          color: '#fbbf24',
          life: 0.42,
          gravity: 28,
          isCoinBurst: true
        });
      } else if (ch === 'M') {
        const spawnType = this.player.power === 'small' ? 'mushroom' : 'flower';
        this.audio.playSfx('powerup');
        this.items.push({
          type: spawnType,
          x: tx + 0.08,
          y: ty - 0.9,
          w: 0.84,
          h: 0.84,
          vx: spawnType === 'mushroom' ? 3.4 : 0,
          vy: -2.0,
          emergeTimer: 0.25
        });
      } else if (ch === 'S') {
        this.audio.playSfx('powerup');
        this.items.push({
          type: 'star',
          x: tx + 0.08,
          y: ty - 0.9,
          w: 0.84,
          h: 0.84,
          vx: 4.5,
          vy: -8.0,
          emergeTimer: 0.2
        });
      } else if (ch === 'U') {
        this.audio.playSfx('powerup');
        this.items.push({
          type: 'oneUp',
          x: tx + 0.08,
          y: ty - 0.9,
          w: 0.84,
          h: 0.84,
          vx: 3.4,
          vy: -2.0,
          emergeTimer: 0.25
        });
      }
    } else if (ch === 'X' || ch === 'H') {
      this.audio.playSfx('bump');
    }
  }

  updateItems(dt) {
    const p = this.player;
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      if (it.emergeTimer > 0) {
        it.emergeTimer -= dt;
        continue;
      }

      if (it.type !== 'flower') {
        it.vy += this.config.gravity * 0.72 * dt;
        it.x += it.vx * dt;

        // Horizontal bounce off walls/pipes
        const topTy = Math.floor(it.y + 0.1);
        const botTy = Math.floor(it.y + it.h - 0.1);
        if (it.vx > 0) {
          const rTx = Math.floor(it.x + it.w);
          for (let ty = topTy; ty <= botTy; ty++) {
            if (this.isSolidTileAt(rTx, ty)) {
              it.x = rTx - it.w - 0.01;
              it.vx = -Math.abs(it.vx);
              break;
            }
          }
        } else if (it.vx < 0) {
          const lTx = Math.floor(it.x);
          for (let ty = topTy; ty <= botTy; ty++) {
            if (this.isSolidTileAt(lTx, ty)) {
              it.x = lTx + 1 + 0.01;
              it.vx = Math.abs(it.vx);
              break;
            }
          }
        }

        const prevBot = it.y + it.h;
        it.y += it.vy * dt;
        const lTx = Math.floor(it.x + 0.08);
        const rTx = Math.floor(it.x + it.w - 0.08);
        const fTy = Math.floor(it.y + it.h);
        if (it.vy >= 0) {
          for (let tx = lTx; tx <= rTx; tx++) {
            if (this.isSolidTileAt(tx, fTy) || (this.isOneWayPlatformAt(tx, fTy) && prevBot <= fTy + 0.2)) {
              it.y = fTy - it.h - 0.001;
              it.vy = it.type === 'star' ? -11.5 : 0;
              break;
            }
          }
        }
      }

      if (it.y > LEVEL_HEIGHT + 2) {
        this.items.splice(i, 1);
        continue;
      }

      // Player collection
      if (this.aabb(p, it)) {
        if (it.type === 'mushroom') {
          if (p.power === 'small') {
            p.power = 'super';
            p.y -= 0.88;
            p.h = 1.82;
          }
          this.audio.playSfx('powerup');
          this.addScore(1000, it.x, it.y, '1000');
        } else if (it.type === 'flower') {
          if (p.power === 'small') {
            p.y -= 0.88;
            p.h = 1.82;
          }
          p.power = 'fire';
          this.audio.playSfx('powerup');
          this.addScore(1000, it.x, it.y, '1000');
        } else if (it.type === 'star') {
          p.starTimer = 10.5;
          this.audio.playSfx('powerup');
          this.audio.startMusic('star');
          this.addScore(1000, it.x, it.y, 'STAR');
        } else if (it.type === 'oneUp') {
          this.lives++;
          this.audio.playSfx('oneUp');
          this.popups.push({ x: it.x, y: it.y, text: '1UP', vy: -2.5, life: 1.0, maxLife: 1.0 });
        }
        this.items.splice(i, 1);
      }
    }
  }

  updateFireballs(dt) {
    for (let i = this.fireballs.length - 1; i >= 0; i--) {
      const fb = this.fireballs[i];
      fb.life -= dt;
      if (fb.life <= 0 || fb.y > LEVEL_HEIGHT + 2 || fb.y < -4) {
        this.fireballs.splice(i, 1);
        continue;
      }

      fb.vy += this.config.gravity * (fb.gravityScale ?? 0.8) * dt;
      fb.x += fb.vx * dt;

      // Hit wall -> burst
      const topTy = Math.floor(fb.y + 0.08);
      const botTy = Math.floor(fb.y + fb.h - 0.08);
      const checkTx = Math.floor(fb.vx > 0 ? fb.x + fb.w : fb.x);
      if (this.isSolidTileAt(checkTx, topTy) || this.isSolidTileAt(checkTx, botTy)) {
        this.spawnFirePop(fb.x, fb.y, fb.color);
        this.fireballs.splice(i, 1);
        continue;
      }

      fb.y += fb.vy * dt;
      const fTy = Math.floor(fb.y + fb.h);
      const lx = Math.floor(fb.x + 0.06);
      const rx = Math.floor(fb.x + fb.w - 0.06);
      const hitFloor =
        this.isSolidTileAt(lx, fTy) || this.isOneWayPlatformAt(lx, fTy) ||
        this.isSolidTileAt(rx, fTy) || this.isOneWayPlatformAt(rx, fTy);
      if (fb.vy > 0 && hitFloor) {
        fb.y = fTy - fb.h - 0.01;
        if ((fb.bouncesLeft ?? 2) > 0) {
          fb.bouncesLeft = (fb.bouncesLeft ?? 2) - 1;
          fb.vy = -10.2;
        } else {
          this.spawnFirePop(fb.x, fb.y, fb.color);
          this.fireballs.splice(i, 1);
          continue;
        }
      }

      // Ceiling collision
      if (fb.vy < 0) {
        const cTy = Math.floor(fb.y);
        if (this.isSolidTileAt(lx, cTy) || this.isSolidTileAt(rx, cTy)) {
          fb.y = cTy + 1 + 0.01;
          fb.vy = Math.abs(fb.vy) * 0.6;
        }
      }

      // Enemy hit check
      let consumed = false;
      for (const e of this.enemies) {
        if (!e.alive || e.squished || e.flipped) continue;
        if (this.aabb(fb, e)) {
          this.flipEnemy(e, Math.sign(fb.vx) || 1);
          this.spawnFirePop(fb.x, fb.y, fb.color);
          daemonSupervisor.triggerHaptic(14);
          consumed = true;
          break;
        }
      }
      if (!consumed) {
        for (const pir of this.piranhas) {
          if (!pir.alive || pir.rise < 0.25) continue;
          const box = { x: pir.x, y: pir.baseY - pir.rise * pir.h, w: pir.w, h: pir.rise * pir.h };
          if (this.aabb(fb, box)) {
            pir.alive = false;
            this.addScore(200, pir.x, box.y, '200');
            this.audio.playSfx('kick');
            this.spawnFirePop(fb.x, fb.y, fb.color);
            daemonSupervisor.triggerHaptic(14);
            consumed = true;
            break;
          }
        }
      }
      if (consumed) {
        this.fireballs.splice(i, 1);
      }
    }
  }

  spawnFirePop(x, y, baseColor = '#fb923c') {
    for (let k = 0; k < 6; k++) {
      const a = (Math.PI * 2 * k) / 6;
      this.particles.push({
        x: x + 0.2,
        y: y + 0.2,
        vx: Math.cos(a) * 4.5,
        vy: Math.sin(a) * 4.5,
        size: 0.2,
        color: k % 2 === 0 ? (baseColor || '#fb923c') : '#fef08a',
        life: 0.28,
        gravity: 0
      });
    }
  }

  updateEnemies(dt) {
    const p = this.player;
    for (const e of this.enemies) {
      if (!e.alive) continue;

      // Activate only when near camera
      if (e.x > this.cameraX + 26 || e.x < this.cameraX - 10) {
        if (!e.shellSliding) continue;
      }

      if (e.squished) {
        e.squishTimer -= dt;
        if (e.squishTimer <= 0) e.alive = false;
        continue;
      }

      if (e.flipped) {
        e.vy += this.config.gravity * 0.85 * dt;
        e.x += e.vx * dt;
        e.y += e.vy * dt;
        if (e.y > LEVEL_HEIGHT + 2) e.alive = false;
        continue;
      }

      e.vy += this.config.gravity * 0.85 * dt;
      if (e.vy > 22) e.vy = 22;

      const speed = e.shell ? (e.shellSliding ? 14.5 : 0) : (e.type === 'koopa' ? 2.4 : 2.1);
      if (e.shell && !e.shellSliding) {
        e.vx = 0;
      } else if (e.vx === 0) {
        e.vx = -speed;
      } else {
        e.vx = Math.sign(e.vx) * speed;
      }

      e.x += e.vx * dt;

      // Wall collision
      const topTy = Math.floor(e.y + 0.1);
      const botTy = Math.floor(e.y + e.h - 0.12);
      if (e.vx > 0) {
        const rTx = Math.floor(e.x + e.w);
        for (let ty = topTy; ty <= botTy; ty++) {
          if (this.isSolidTileAt(rTx, ty)) {
            e.x = rTx - e.w - 0.01;
            e.vx = -Math.abs(e.vx);
            if (e.shellSliding) this.audio.playSfx('bump');
            break;
          }
        }
      } else if (e.vx < 0) {
        const lTx = Math.floor(e.x);
        for (let ty = topTy; ty <= botTy; ty++) {
          if (this.isSolidTileAt(lTx, ty)) {
            e.x = lTx + 1 + 0.01;
            e.vx = Math.abs(e.vx);
            if (e.shellSliding) this.audio.playSfx('bump');
            break;
          }
        }
      }

      // Vertical ground collision
      const prevBot = e.y + e.h;
      e.y += e.vy * dt;
      e.grounded = false;
      const lTx = Math.floor(e.x + 0.08);
      const rTx = Math.floor(e.x + e.w - 0.08);
      const fTy = Math.floor(e.y + e.h);
      if (e.vy >= 0) {
        for (let tx = lTx; tx <= rTx; tx++) {
          if (this.isSolidTileAt(tx, fTy) || (this.isOneWayPlatformAt(tx, fTy) && prevBot <= fTy + 0.22)) {
            e.y = fTy - e.h - 0.001;
            e.vy = 0;
            e.grounded = true;
            break;
          }
        }
      }

      // Red Koopa smart ledge turn
      if (e.type === 'koopa' && e.color === 'red' && !e.shell && e.grounded) {
        const probeX = e.vx > 0 ? Math.floor(e.x + e.w + 0.05) : Math.floor(e.x - 0.05);
        const belowTy = Math.floor(e.y + e.h + 0.2);
        if (!this.isSolidTileAt(probeX, belowTy) && !this.isOneWayPlatformAt(probeX, belowTy)) {
          e.vx = -e.vx;
        }
      }

      if (e.y > LEVEL_HEIGHT + 2) {
        e.alive = false;
        continue;
      }

      // Sliding Koopa shell bowls through other enemies
      if (e.shell && e.shellSliding) {
        for (const other of this.enemies) {
          if (other === e || !other.alive || other.squished || other.flipped) continue;
          if (this.aabb(e, other)) {
            this.flipEnemy(other, Math.sign(e.vx) || 1);
          }
        }
      }

      // Player vs Enemy collision
      if (!p.dead && this.aabb(p, e)) {
        if (p.starTimer > 0) {
          this.flipEnemy(e, Math.sign(e.x - p.x) || 1);
          continue;
        }

        const playerPrevBottom = (p.y + p.h) - p.vy * dt;
        const isStomp = p.vy > 0 && playerPrevBottom <= e.y + e.h * 0.55;

        if (isStomp) {
          if (e.type === 'goomba') {
            e.squished = true;
            e.squishTimer = 0.45;
            e.vx = 0;
            this.audio.playSfx('stomp');
            this.comboCounter++;
            const pts = [100, 200, 400, 800, 1000][Math.min(this.comboCounter - 1, 4)];
            this.addScore(pts, e.x + 0.4, e.y, String(pts));
          } else if (e.type === 'koopa') {
            if (!e.shell) {
              e.shell = true;
              e.shellSliding = false;
              e.y += 0.35;
              e.h = 0.88;
              this.audio.playSfx('stomp');
              this.addScore(100, e.x + 0.4, e.y, '100');
            } else if (!e.shellSliding) {
              e.shellSliding = true;
              e.vx = (p.x + p.w * 0.5 < e.x + e.w * 0.5) ? 14.5 : -14.5;
              this.audio.playSfx('kick');
              this.addScore(400, e.x + 0.4, e.y, '400');
            } else {
              e.shellSliding = false;
              e.vx = 0;
              this.audio.playSfx('stomp');
            }
          }
          p.vy = -(this.input.jump ? this.config.jumpVelocity * 0.92 : this.config.stompBounce);
          p.grounded = false;
        } else {
          // Stationary shell gets kicked instead of hurting Mario
          if (e.shell && !e.shellSliding) {
            e.shellSliding = true;
            e.vx = (p.x + p.w * 0.5 < e.x + e.w * 0.5) ? 14.5 : -14.5;
            e.x += Math.sign(e.vx) * 0.25;
            this.audio.playSfx('kick');
            this.addScore(400, e.x + 0.4, e.y, '400');
          } else {
            this.damagePlayer();
          }
        }
      }
    }
  }

  flipEnemy(e, dir) {
    e.flipped = true;
    e.vx = dir * 3.2;
    e.vy = -9.5;
    this.audio.playSfx('kick');
    this.addScore(200, e.x + 0.4, e.y, '200');
  }

  updatePiranhas(dt) {
    const p = this.player;
    for (const pir of this.piranhas) {
      if (!pir.alive) continue;
      const nearPipe = Math.abs((p.x + p.w * 0.5) - (pir.pipeX + 1.0)) < 1.35 && pir.rise < 0.1;
      if (!nearPipe) {
        pir.phase += dt * 1.45;
      }
      const wave = Math.sin(pir.phase);
      pir.rise = Math.max(0, wave);

      if (pir.rise > 0.28 && !p.dead) {
        const box = {
          x: pir.x + 0.1,
          y: pir.baseY - pir.rise * pir.h + 0.1,
          w: pir.w - 0.2,
          h: pir.rise * pir.h - 0.1
        };
        if (this.aabb(p, box)) {
          if (p.starTimer > 0) {
            pir.alive = false;
            this.audio.playSfx('kick');
            this.addScore(200, pir.x, box.y, '200');
          } else {
            this.damagePlayer();
          }
        }
      }
    }
  }

  damagePlayer() {
    const p = this.player;
    if (p.invulnTimer > 0 || p.starTimer > 0 || p.dead) return;
    if (p.power !== 'small') {
      const prevH = p.h;
      p.power = 'small';
      p.crouching = false;
      p.h = 0.94;
      p.y += (prevH - 0.94);
      p.invulnTimer = 2.0;
      this.audio.playSfx('powerdown');
      daemonSupervisor.triggerHaptic(22);
    } else {
      this.killPlayer(false);
    }
  }

  killPlayer(fellInPit = false) {
    const p = this.player;
    if (p.dead) return;
    p.dead = true;
    p.deathTimer = 0;
    p.vx = 0;
    p.vy = fellInPit ? -6 : -14.5;
    this.audio.stopMusic();
    this.audio.playSfx('gameOver');
    daemonSupervisor.triggerHaptic(35);
  }

  triggerFlagpole() {
    const p = this.player;
    p.onFlagpole = true;
    p.vx = 0;
    p.vy = 0;
    p.x = this.level.flagX - p.w * 0.55;
    this.state = 'STAGE_CLEAR';
    this.stageClearTimer = 0;
    this.flagProgress = 0;
    this.audio.stopMusic();
    this.audio.playSfx('flagpole');

    const heightBonus = Math.max(100, Math.round((13 - p.y) * 400 / 100) * 100);
    this.addScore(heightBonus, p.x, p.y, String(heightBonus));
  }

  updateStageClear(dt) {
    const p = this.player;
    this.stageClearTimer += dt;

    if (this.stageClearTimer < 1.15) {
      // Slide down flagpole
      this.flagProgress = Math.min(1, this.stageClearTimer / 1.0);
      p.y = Math.min(12 - p.h + 1, p.y + dt * 7.2);
    } else {
      if (!p.castleWalk) {
        p.castleWalk = true;
        this.audio.playSfx('stageClear');
      }
      // Walk toward castle door
      if (p.x < this.level.castleX + 1.5) {
        p.x += dt * 4.5;
        p.animTime += dt * 5.0;
        p.y = 13 - p.h;
      } else {
        // Convert remaining time into score accurately
        if (this.timeLeft > 0) {
          const tick = Math.min(this.timeLeft, dt * 120);
          this.timeLeft -= tick;
          this.timeBonusCarry += tick;
          const whole = Math.floor(this.timeBonusCarry);
          if (whole >= 1) {
            this.timeBonusCarry -= whole;
            this.addScore(whole * 50);
          }
        } else if (this.stageClearTimer > 3.6) {
          if (this.worldIndex < 2) {
            this.loadLevel(this.worldIndex + 1, false);
            this.state = 'PLAYING';
            this.audio.startMusic(this.level.theme);
          } else {
            this.state = 'VICTORY';
          }
        }
      }
    }
  }

  updateBumpingTiles(dt) {
    for (let i = this.bumpingTiles.length - 1; i >= 0; i--) {
      const b = this.bumpingTiles[i];
      b.timer -= dt;
      if (b.timer <= 0) {
        this.bumpingTiles.splice(i, 1);
      } else {
        b.offset = -Math.sin((b.timer / 0.18) * Math.PI) * 0.28;
      }
    }
  }

  updateParticlesAndPopups(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.life -= dt;
      if (pt.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      pt.vy += (pt.gravity || 0) * dt;
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
    }

    for (let i = this.popups.length - 1; i >= 0; i--) {
      const pop = this.popups[i];
      pop.life -= dt;
      if (pop.life <= 0) {
        this.popups.splice(i, 1);
        continue;
      }
      pop.y += pop.vy * dt;
    }
  }

  updateCamera(dt) {
    const viewTiles = Math.max(8, Math.min(30, this.viewTiles || 22));
    const leadOffset = viewTiles * 0.36;
    const targetCamX = Math.max(0, Math.min(Math.max(0, this.level.width - viewTiles), this.player.x - leadOffset));
    this.cameraX += (targetCamX - this.cameraX) * Math.min(1, dt * 8.5);
  }

  aabb(a, b) {
    return (
      a.x < b.x + b.w &&
      a.x + a.w > b.x &&
      a.y < b.y + b.h &&
      a.y + a.h > b.y
    );
  }
}
