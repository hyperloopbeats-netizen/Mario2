import * as THREE from 'three';
import { MOVIE_PRESETS } from './cad-presets.js';
import { hybridMovement } from './hybrid-movement.js';
import { hybridScene } from './hybrid-scene.js';

export class BlackGlassVideoApp {
  constructor(compositorCanvas, matrixEngine) {
    this.canvas = compositorCanvas;
    this.ctx = compositorCanvas.getContext('2d');
    this.matrix = matrixEngine;

    this.movie = JSON.parse(JSON.stringify(MOVIE_PRESETS.black_glass_promo));
    this.playing = true;
    this.recording = false;
    this.currentTime = 0;
    this.promoMode = 'monolith'; // 'monolith' | 'backdrop' | 'pip'
    this.promoElement = null;
    this.promoImageDataUrl = null;
    this.promoName = '';
    this.promoObjectUrl = null;
    this.promoTexture = null;

    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.lastExportUrl = null;
    this.exportTimerId = 0;

    this.onShotChange = null;
    this.onRecordComplete = null;
    this.onRecordProgress = null;
    this.lastShotIdx = -1;
  }

  getTotalDuration() {
    return this.movie.shots.reduce((sum, s) => sum + Math.max(1, Number(s.duration) || 3), 0);
  }

  setMovie(movieData) {
    if (!movieData || !Array.isArray(movieData.shots) || movieData.shots.length === 0) return;
    this.movie = movieData;
    this.currentTime = 0;
    this.lastShotIdx = -1;
    if (movieData.cadAssembly) {
      this.matrix.setCadAssembly(movieData.cadAssembly);
    }
    if (movieData.movement) {
      hybridMovement.applyConfig(movieData.movement);
    }
    if (movieData.scene) {
      hybridScene.applyConfig(movieData.scene);
    }
  }

  setPromoFile(file) {
    if (!file) return;
    this.promoName = file.name;
    if (this.promoObjectUrl) {
      URL.revokeObjectURL(this.promoObjectUrl);
    }
    const url = URL.createObjectURL(file);
    this.promoObjectUrl = url;

    if (this.promoTexture) {
      this.promoTexture.dispose();
      this.promoTexture = null;
    }

    if (file.type.startsWith('video/')) {
      const video = document.createElement('video');
      video.src = url;
      video.loop = true;
      video.muted = true;
      video.playsInline = true;
      video.play().catch(() => {});
      this.promoElement = video;
      this.promoImageDataUrl = null;
      this.promoTexture = new THREE.VideoTexture(video);
      this.matrix.setPromoMedia(this.promoTexture);
    } else if (file.type.startsWith('image/')) {
      const img = new Image();
      img.onload = () => {
        this.promoElement = img;
        this.promoTexture = new THREE.Texture(img);
        this.promoTexture.needsUpdate = true;
        this.matrix.setPromoMedia(this.promoTexture);

        const snap = document.createElement('canvas');
        const scale = Math.min(1, 512 / Math.max(img.width, img.height));
        snap.width = Math.max(64, Math.round(img.width * scale));
        snap.height = Math.max(64, Math.round(img.height * scale));
        snap.getContext('2d').drawImage(img, 0, 0, snap.width, snap.height);
        this.promoImageDataUrl = snap.toDataURL('image/jpeg', 0.82);
      };
      img.src = url;
    }
  }

  getActiveShot() {
    const shots = this.movie.shots;
    let elapsed = 0;
    for (let i = 0; i < shots.length; i++) {
      const dur = Math.max(1, Number(shots[i].duration) || 3);
      if (this.currentTime < elapsed + dur || i === shots.length - 1) {
        return {
          index: i,
          shot: shots[i],
          localTime: Math.max(0, this.currentTime - elapsed),
          duration: dur
        };
      }
      elapsed += dur;
    }
    return { index: 0, shot: shots[0], localTime: 0, duration: 3 };
  }

  jumpToShot(index) {
    let t = 0;
    for (let i = 0; i < index && i < this.movie.shots.length; i++) {
      t += Math.max(1, Number(this.movie.shots[i].duration) || 3);
    }
    this.currentTime = t;
    this.lastShotIdx = -1;
  }

  /**
   * Renders one composited frame onto this.canvas.
   * When isExporting is true, caller advances currentTime by exact fixedDt.
   */
  composeFrame(dt, isExporting = false, exportFps = 30) {
    const { index, shot, localTime, duration } = this.getActiveShot();
    if (index !== this.lastShotIdx) {
      this.lastShotIdx = index;
      this.matrix.applyShotConfig(shot);
      if (this.onShotChange) this.onShotChange(index, shot);
    }

    const targetW = isExporting ? 1920 : 1280;
    const targetH = isExporting ? 1080 : 720;
    if (this.canvas.width !== targetW || this.canvas.height !== targetH) {
      this.canvas.width = targetW;
      this.canvas.height = targetH;
    }

    const ctx = this.ctx;
    const W = this.canvas.width;
    const H = this.canvas.height;

    this.matrix.renderToCanvas(this.canvas, dt, isExporting, isExporting, exportFps);

    if (this.promoElement && (this.promoMode === 'backdrop' || this.promoMode === 'pip')) {
      if (this.promoMode === 'backdrop') {
        ctx.save();
        ctx.globalAlpha = 0.28;
        this.drawMediaCover(ctx, this.promoElement, 0, 0, W, H);
        ctx.restore();
      } else if (this.promoMode === 'pip') {
        const pw = W * 0.28;
        const ph = H * 0.28;
        const px = W - pw - W * 0.04;
        const py = H * 0.14;
        ctx.save();
        ctx.fillStyle = 'rgba(6, 8, 14, 0.9)';
        ctx.fillRect(px - 6, py - 6, pw + 12, ph + 12);
        this.drawMediaCover(ctx, this.promoElement, px, py, pw, ph);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.lineWidth = 2;
        ctx.strokeRect(px - 6, py - 6, pw + 12, ph + 12);
        ctx.restore();
      }
    }

    // Cinema Matte Letterbox Bars
    const barH = Math.round(H * 0.085);
    ctx.fillStyle = '#030408';
    ctx.fillRect(0, 0, W, barH);
    ctx.fillRect(0, H - barH, W, barH);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
    ctx.fillRect(0, barH, W, 1);
    ctx.fillRect(0, H - barH - 1, W, 1);

    // Smooth ease-in-out typography fade
    const fadeIn = Math.min(1, localTime / 0.5);
    const fadeOut = Math.min(1, (duration - localTime) / 0.45);
    const alpha = Math.max(0, Math.min(fadeIn, fadeOut));
    const smoothAlpha = alpha * alpha * (3 - 2 * alpha);

    ctx.save();
    ctx.globalAlpha = smoothAlpha;

    ctx.fillStyle = 'rgba(248, 250, 252, 0.85)';
    ctx.font = `600 ${Math.round(H * 0.022)}px "Outfit", sans-serif`;
    ctx.fillText((this.movie.title || 'BLACK GLASS MOVIE').toUpperCase(), W * 0.04, barH * 0.62);

    const padX = Math.round(W * 0.02);
    const padY = Math.round(H * 0.022);
    const cardW = Math.round(W * 0.56);
    const cardH = Math.round(H * 0.13);
    const cardX = Math.round(W * 0.04);
    const cardY = H - barH - cardH - Math.round(H * 0.035);

    ctx.fillStyle = 'rgba(5, 8, 15, 0.78)';
    ctx.fillRect(cardX, cardY, cardW, cardH);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(cardX, cardY, cardW, cardH);

    ctx.save();
    ctx.beginPath();
    ctx.rect(cardX + padX, cardY, cardW - padX * 2, cardH);
    ctx.clip();

    ctx.fillStyle = '#ffffff';
    ctx.textBaseline = 'top';
    ctx.font = `700 ${Math.round(H * 0.04)}px "Outfit", sans-serif`;
    ctx.fillText(shot.headline || '', cardX + padX, cardY + padY);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = `400 ${Math.round(H * 0.021)}px "Plus Jakarta Sans", sans-serif`;
    ctx.fillText(shot.subline || '', cardX + padX, cardY + padY + Math.round(H * 0.055));
    ctx.restore();
    ctx.restore();
  }

  renderFrame(dt, isActiveWindow) {
    // When recording deterministically, the dedicated export pump drives rendering!
    if (this.recording || !isActiveWindow) return;

    const total = this.getTotalDuration();
    if (this.playing) {
      this.currentTime = (this.currentTime + dt) % total;
    }
    this.composeFrame(dt, false, 30);
  }

  drawMediaCover(ctx, media, x, y, w, h) {
    const mw = media.videoWidth || media.naturalWidth || media.width || w;
    const mh = media.videoHeight || media.naturalHeight || media.height || h;
    if (!mw || !mh) return;
    const scale = Math.max(w / mw, h / mh);
    const dw = mw * scale;
    const dh = mh * scale;
    const dx = x + (w - dw) * 0.5;
    const dy = y + (h - dh) * 0.5;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.drawImage(media, dx, dy, dw, dh);
    ctx.restore();
  }

  /**
   * Deterministic Stepped Frame-by-Frame Full HD 1920x1080 Recording.
   * Eliminates dropped frames and variable delta-time jitter completely.
   */
  startFullHdRecording(fps = 30) {
    if (this.recording) return false;
    if (typeof this.canvas.captureStream !== 'function' || typeof MediaRecorder === 'undefined') {
      return false;
    }

    this.canvas.width = 1920;
    this.canvas.height = 1080;
    this.currentTime = 0;
    this.lastShotIdx = -1;
    this.playing = true;
    this.recording = true;
    this.recordedChunks = [];

    const totalDuration = this.getTotalDuration();
    const totalFrames = Math.max(30, Math.round(totalDuration * fps));
    const fixedDt = 1 / fps;

    // Prefer manual frame push (captureStream(0) + track.requestFrame()) for lockstep zero-jitter output
    let stream = this.canvas.captureStream(0);
    let track = stream.getVideoTracks()[0];
    const hasRequestFrame = Boolean(track && typeof track.requestFrame === 'function');
    if (!hasRequestFrame) {
      stream = this.canvas.captureStream(fps);
      track = stream.getVideoTracks()[0];
    }

    const mimeType = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
      .find((m) => MediaRecorder.isTypeSupported(m)) || 'video/webm';

    this.mediaRecorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 12_000_000
    });

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) this.recordedChunks.push(e.data);
    };

    this.mediaRecorder.onstop = () => {
      const blob = new Blob(this.recordedChunks, { type: mimeType });
      if (this.lastExportUrl) URL.revokeObjectURL(this.lastExportUrl);
      this.lastExportUrl = URL.createObjectURL(blob);
      if (this.onRecordComplete) {
        this.onRecordComplete(this.lastExportUrl, blob.size);
      }
    };

    this.mediaRecorder.start(250);

    let frameIdx = 0;
    const stepDelay = hasRequestFrame ? 12 : Math.round(1000 / fps);

    const pumpFrame = () => {
      if (!this.recording) return;

      const t0 = performance.now();
      this.currentTime = frameIdx * fixedDt;
      this.composeFrame(fixedDt, true, fps);

      if (hasRequestFrame) {
        track.requestFrame();
      }

      frameIdx++;
      if (this.onRecordProgress) {
        this.onRecordProgress(Math.min(1, frameIdx / totalFrames), frameIdx, totalFrames);
      }

      if (frameIdx >= totalFrames) {
        // Brief flush delay so final frame is ingested cleanly into MediaRecorder
        this.exportTimerId = window.setTimeout(() => this.stopRecording(), 120);
        return;
      }

      const elapsedMs = performance.now() - t0;
      const waitMs = hasRequestFrame ? 10 : Math.max(4, stepDelay - elapsedMs);
      this.exportTimerId = window.setTimeout(pumpFrame, waitMs);
    };

    pumpFrame();
    return true;
  }

  stopRecording() {
    if (!this.recording) return;
    this.recording = false;
    window.clearTimeout(this.exportTimerId);
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
  }
}
