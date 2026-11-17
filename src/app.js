import { initLiquidBackdrop } from './os/liquid-backdrop.js';
import { WindowManager } from './os/window-manager.js';
import { MarioAudio } from './mario/audio.js';
import { MarioEngine } from './mario/engine.js';
import { MarioRenderer2D } from './mario/renderer-2d.js';
import { MarioRenderer3D } from './mario/renderer-3d.js';
import { MobileArcadeController } from './mario/mobile-arcade.js';
import { CAD_PRESETS, MOVIE_PRESETS } from './studio/cad-presets.js';
import { daemonSupervisor } from './studio/daemons.js';
import { hybridMovement, HybridMovementApp } from './studio/hybrid-movement.js';
import { hybridScene, HybridSceneApp } from './studio/hybrid-scene.js';
import { LiquidCADApp } from './studio/liquid-cad.js';
import { ProductionMatrixEngine } from './studio/production-matrix.js';
import { BlackGlassVideoApp } from './studio/black-glass-video.js';
import { TEXT2MOVIE_RECIPES, TextToMovieApp } from './studio/text-to-movie.js';
import { WorldForgeApp } from './studio/triad-world-forge.js';
import { SHADER_PRESETS, ShaderLabApp } from './studio/triad-shader-lab.js';
import { SONIC_PRESETS, SonicSequencerApp } from './studio/triad-sonic-synth.js';
import { fetchJsonSafe, patternGuard, onGuardUpdate, logGuardEvent } from './studio/app-pattern-guard.js';
import { SemanticSynthApp } from './studio/app-semantic-synth.js';
import { DataMultiplierApp } from './studio/app-data-multiplier.js';
import { dataVault } from './studio/app-data-vault.js';
import { PipelineRouterApp } from './studio/app-pipeline.js';
import { TeamFortressGame } from './fortress/tf-engine.js';
import { TitanfallGame } from './titanfall/tf2-engine.js';
import { SentientDesignNetwork } from './studio/sentient-network.js';
import { LevelForgeNetwork } from './studio/level-forge-network.js';
import { THOUGHT_SEEDS, HyperThoughtCloudApp } from './studio/thought-cloud.js';

window.addEventListener('error', (ev) => {
  logGuardEvent('OS Runtime', 'error', ev?.message || 'Unexpected runtime error', false);
});
window.addEventListener('unhandledrejection', (ev) => {
  logGuardEvent('OS Promise', 'error', String(ev?.reason?.message || ev?.reason || 'Unhandled rejection'), false);
});

const REPO_MODULES = [
  { id: 'AIM OSx Sentient Game Generaror', title: 'AIM OS Nexus v5.0', desc: 'Sentient Game Generator OS' },
  { id: 'AIM OS V8.4', title: 'AIM OS v8.5', desc: 'Cognitive Suite & NetSphere Browser' },
  { id: 'AIM OS Brain', title: 'AIM OS Brain v1.0', desc: 'Unified App Brain & Modular Suite' },
  { id: 'PS6 Sun', title: 'Cometic Engine v26.3', desc: 'Cute Data Visual Matrix' },
  { id: 'Sun2', title: 'Sentient Sun OS', desc: 'Sovereign Desktop & Fractal Core' },
  { id: 'The Sun', title: 'Digital Sun Core', desc: 'Sovereign Mobile Fractal Core' },
  { id: 'AutoCAD', title: 'AiM CAD Kernel', desc: 'Self-Hosting CAD & DSL Workstation' },
  { id: 'Face2', title: 'Ballistic Studio v12', desc: '3D Ballistic & Fluid Viewport' },
  { id: 'AIM Cometic OS V30', title: 'AIM Cometic OS V30', desc: 'Kernel Architecture Spec (JSON)' }
];

// 1. Initialize Black Liquid Ferrofluid Backdrop
const backdropCanvas = document.getElementById('liquid-backdrop');
try {
  initLiquidBackdrop(backdropCanvas);
} catch (err) {
  logGuardEvent('Backdrop', 'error', err?.message || 'Backdrop init fallback', false);
}

// 2. Initialize Mario Audio, Game Engine & 2D/3D Renderers
const audio = new MarioAudio();
const engine = new MarioEngine(audio);

const canvas2D = document.getElementById('mario-2d-canvas');
const canvas3D = document.getElementById('mario-3d-canvas');
const renderer2D = new MarioRenderer2D(canvas2D);
const renderer3D = new MarioRenderer3D(canvas3D);
let renderMode = '2d';

// 3. Initialize Studio Engines (Liquid CAD, Movement, Scene Designer, Matrix, Video, Text2Movie, Generation Triad)
const cadCanvas = document.getElementById('cad-canvas');
const cadApp = new LiquidCADApp(cadCanvas);

const movementCanvas = document.getElementById('movement-canvas');
const movementApp = new HybridMovementApp(movementCanvas);

const sceneCanvas = document.getElementById('scene-canvas');
const sceneApp = new HybridSceneApp(sceneCanvas);

const matrixPreviewCanvas = document.getElementById('matrix-canvas');
const videoCompositorCanvas = document.getElementById('video-compositor-canvas');
const t2mPreviewCanvas = document.getElementById('t2m-canvas');

const matrixEngine = new ProductionMatrixEngine();
const videoApp = new BlackGlassVideoApp(videoCompositorCanvas, matrixEngine);
const t2mApp = new TextToMovieApp(t2mPreviewCanvas, videoApp, matrixEngine, cadApp);

const wfPreviewCanvas = document.getElementById('wf-preview-canvas');
const worldForgeApp = new WorldForgeApp(wfPreviewCanvas, engine, renderer3D);

const shaderCanvas = document.getElementById('sl-canvas');
const shaderLabApp = new ShaderLabApp(shaderCanvas);

const sonicCanvas = document.getElementById('sn-canvas');
const sonicApp = new SonicSequencerApp(sonicCanvas, audio);

const tfCanvas = document.getElementById('tf-canvas');
const fortressGame = new TeamFortressGame(tfCanvas, {
  cadApp,
  worldForgeApp,
  dataVault,
  marioAudio: audio
});

const semanticSynth = new SemanticSynthApp(cadApp, matrixEngine, fortressGame);
const dmCanvas = document.getElementById('dm-canvas');
const dataMultiplier = new DataMultiplierApp(dmCanvas, cadApp, matrixEngine, fortressGame);
const plCanvas = document.getElementById('pl-canvas');
const pipelineRouter = new PipelineRouterApp(plCanvas, {
  cadApp,
  matrixEngine,
  shaderLabApp,
  sonicApp,
  worldForgeApp,
  dataMultiplier,
  dataVault,
  fortressGame
});

const tf2Canvas = document.getElementById('tf2-canvas');
const titanfallGame = new TitanfallGame(tf2Canvas, {
  cadApp,
  dataVault,
  marioAudio: audio
});

const sentientNet = new SentientDesignNetwork({
  architect: document.getElementById('sa-canvas'),
  skins: document.getElementById('sf-canvas'),
  rig: document.getElementById('sr-canvas'),
  physics: document.getElementById('sp-canvas'),
  director: document.getElementById('sd-canvas')
}, {
  titanfallGame,
  fortressGame,
  marioEngine: engine,
  cadApp,
  matrixEngine
});

const levelForgeNet = new LevelForgeNetwork({
  frontier: document.getElementById('lf-frontier-canvas'),
  fortress: document.getElementById('lf-fortress-canvas'),
  biome: document.getElementById('lf-biome-canvas')
}, {
  titanfallGame,
  fortressGame,
  marioEngine: engine,
  worldForgeApp,
  cadApp,
  matrixEngine
});

const thoughtCloud = new HyperThoughtCloudApp(document.getElementById('tc-canvas'), {
  titanfallGame,
  fortressGame,
  marioEngine: engine,
  marioRenderer3D: renderer3D,
  cadApp,
  shaderLabApp,
  sonicApp,
  worldForgeApp,
  matrixEngine,
  levelForgeNetwork: levelForgeNet
});

// 4. Initialize Window Manager
const wm = new WindowManager();
wm.register('win-thought-cloud', 'Thought Cloud');
wm.register('win-level-frontier', 'Frontier Forge');
wm.register('win-level-fortress', 'Fortress Forge');
wm.register('win-level-biome', 'Biome Sync');
wm.register('win-titanfall', 'Titanfall 2');
wm.register('win-fortress', 'Team Fortress');
wm.register('win-sentient-architect', 'Sentient Net');
wm.register('win-sentient-skins', 'Skin Foundry');
wm.register('win-sentient-rig', 'Rig Modeler');
wm.register('win-sentient-physics', 'Physics Kernel');
wm.register('win-sentient-director', 'AI Director');
wm.register('win-mario', 'Super Mario');
wm.register('win-guard', 'Pattern Guard');
wm.register('win-synth-fallback', 'CAD Synth');
wm.register('win-data-mult', 'Multiplier');
wm.register('win-data-vault', 'Data Vault');
wm.register('win-pipeline', 'Pipeline');
wm.register('win-triad-world', 'World Forge');
wm.register('win-triad-shader', 'Shader Lab');
wm.register('win-triad-sonic', 'Sonic Synth');
wm.register('win-cad', 'Liquid CAD');
wm.register('win-movement', 'Movement');
wm.register('win-scene', 'Scene');
wm.register('win-matrix', 'Matrix');
wm.register('win-text2movie', 'Text to Movie');
wm.register('win-video', 'Video Studio');
wm.register('win-controls', 'Physics');
wm.register('win-audio', 'Audio');
wm.register('win-suite', 'AIM Suite');

function isWindowVisible(id) {
  const el = document.getElementById(id);
  return el && !el.classList.contains('is-hidden') && !el.classList.contains('is-minimized');
}

const cadViewportEl = document.getElementById('cad-viewport');
const movementViewportEl = document.getElementById('movement-viewport');
const sceneViewportEl = document.getElementById('scene-viewport');
const shaderViewportEl = document.getElementById('sl-viewport');
const tfViewportEl = document.getElementById('tf-viewport');
const tf2ViewportEl = document.getElementById('tf2-viewport');

function resizeStudioViewport(el, app) {
  if (!el || !app) return;
  const rect = el.getBoundingClientRect();
  if (rect.width > 20 && rect.height > 20) {
    app.resize(Math.floor(rect.width), Math.floor(rect.height));
  }
}

function syncStudioLoops() {
  if (isWindowVisible('win-cad')) {
    resizeStudioViewport(cadViewportEl, cadApp);
    cadApp.start();
  } else {
    cadApp.stop();
  }

  if (isWindowVisible('win-movement')) {
    resizeStudioViewport(movementViewportEl, movementApp);
    movementApp.start();
  } else {
    movementApp.stop();
  }

  if (isWindowVisible('win-scene')) {
    resizeStudioViewport(sceneViewportEl, sceneApp);
    sceneApp.start();
  } else {
    sceneApp.stop();
  }

  if (isWindowVisible('win-triad-shader')) {
    resizeStudioViewport(shaderViewportEl, shaderLabApp);
    shaderLabApp.start();
  } else {
    shaderLabApp.stop();
  }

  if (isWindowVisible('win-fortress')) {
    resizeStudioViewport(tfViewportEl, fortressGame);
  }
  if (isWindowVisible('win-titanfall')) {
    resizeStudioViewport(tf2ViewportEl, titanfallGame);
  }
  if (isWindowVisible('win-sentient-skins')) {
    sentientNet.skins.render();
  }
  if (isWindowVisible('win-sentient-rig')) {
    sentientNet.rig.render();
  }
  if (isWindowVisible('win-sentient-physics')) {
    sentientNet.physics.render();
  }
  if (isWindowVisible('win-sentient-director')) {
    sentientNet.director.render();
  }
  if (isWindowVisible('win-triad-world')) {
    worldForgeApp.renderMinimap();
  }
  if (isWindowVisible('win-triad-sonic')) {
    sonicApp.renderVisualizer();
  }
  if (isWindowVisible('win-data-mult')) {
    dataMultiplier.renderVisualizer();
  }
  if (isWindowVisible('win-pipeline')) {
    pipelineRouter.renderVisualizer();
  }
  if (isWindowVisible('win-thought-cloud')) {
    thoughtCloud.render(0.016);
  }
  if (isWindowVisible('win-level-frontier')) {
    levelForgeNet.frontier.render();
  }
  if (isWindowVisible('win-level-fortress')) {
    levelForgeNet.fortress.render();
  }
  if (isWindowVisible('win-level-biome')) {
    levelForgeNet.biome.render();
  }
}

wm.onLayoutChange = (id) => {
  if (id === 'win-mario') resizeViewports();
  if (id === 'win-cad') resizeStudioViewport(cadViewportEl, cadApp);
  if (id === 'win-movement') resizeStudioViewport(movementViewportEl, movementApp);
  if (id === 'win-scene') resizeStudioViewport(sceneViewportEl, sceneApp);
  if (id === 'win-triad-shader') resizeStudioViewport(shaderViewportEl, shaderLabApp);
  if (id === 'win-fortress') resizeStudioViewport(tfViewportEl, fortressGame);
  if (id === 'win-titanfall') resizeStudioViewport(tf2ViewportEl, titanfallGame);
  syncStudioLoops();
};
wm.focus('win-mario');

// Nav & Dock wiring
document.querySelectorAll('[data-open-window]').forEach((btn) => {
  btn.addEventListener('click', () => {
    wm.open(btn.dataset.openWindow);
    syncStudioLoops();
  });
});
document.querySelectorAll('[data-dock-target]').forEach((btn) => {
  btn.addEventListener('click', () => {
    wm.toggleDock(btn.dataset.dockTarget);
    syncStudioLoops();
  });
});

// 5. Populate AIM GitHub Framework Suite Grid
const suiteGrid = document.getElementById('suite-grid');
REPO_MODULES.forEach((mod) => {
  const link = document.createElement('a');
  link.href = '/' + encodeURIComponent(mod.id);
  link.className = 'suite-card';
  link.innerHTML = `<span class="suite-title">${mod.title}</span><span class="suite-desc">${mod.desc}</span>`;
  suiteGrid.appendChild(link);
});

// 6. Mario Viewport Resizing, Mode Switching & Mobile Arcade Dual-Thumbstick Controller
const viewportEl = document.getElementById('mario-viewport');
function resizeViewports() {
  const rect = viewportEl.getBoundingClientRect();
  const w = Math.max(300, Math.floor(rect.width));
  const h = Math.max(200, Math.floor(rect.height));
  renderer2D.resize(w, h);
  renderer3D.resize(w, h);
}
new ResizeObserver(() => resizeViewports()).observe(viewportEl);
new ResizeObserver(() => resizeStudioViewport(cadViewportEl, cadApp)).observe(cadViewportEl);
new ResizeObserver(() => resizeStudioViewport(movementViewportEl, movementApp)).observe(movementViewportEl);
new ResizeObserver(() => resizeStudioViewport(sceneViewportEl, sceneApp)).observe(sceneViewportEl);
new ResizeObserver(() => resizeStudioViewport(shaderViewportEl, shaderLabApp)).observe(shaderViewportEl);
new ResizeObserver(() => resizeStudioViewport(tfViewportEl, fortressGame)).observe(tfViewportEl);
new ResizeObserver(() => resizeStudioViewport(tf2ViewportEl, titanfallGame)).observe(tf2ViewportEl);
resizeViewports();

const btnMode2D = document.getElementById('btn-mode-2d');
const btnMode3D = document.getElementById('btn-mode-3d');
const cameraWrap = document.getElementById('camera-3d-wrap');
const selectCam3D = document.getElementById('select-camera-3d');

function setRenderMode(mode) {
  renderMode = mode;
  canvas2D.classList.toggle('is-hidden', mode !== '2d');
  canvas3D.classList.toggle('is-hidden', mode !== '3d');
  btnMode2D.classList.toggle('is-active', mode === '2d');
  btnMode3D.classList.toggle('is-active', mode === '3d');
  cameraWrap.classList.toggle('is-hidden', mode !== '3d');
  resizeViewports();
}
btnMode2D.addEventListener('click', () => setRenderMode('2d'));
btnMode3D.addEventListener('click', () => setRenderMode('3d'));
selectCam3D.addEventListener('change', () => renderer3D.setCameraMode(selectCam3D.value));
setRenderMode('2d');

// World Selection, Pause, Restart, Touch Pad
const selectWorld = document.getElementById('select-world');
selectWorld.addEventListener('change', () => {
  engine.selectWorld(Number(selectWorld.value));
  syncOverlays();
});
document.getElementById('btn-pause').addEventListener('click', () => {
  engine.togglePause();
  syncOverlays();
});
document.getElementById('btn-restart').addEventListener('click', () => {
  engine.startNewGame(engine.worldIndex);
  syncOverlays();
});

const btnTouchToggle = document.getElementById('btn-touch-toggle');

const mobileArcade = new MobileArcadeController({
  engine,
  renderer2D,
  renderer3D,
  onToggleMode: () => setRenderMode(renderMode === '2d' ? '3d' : '2d'),
  onExit: () => {
    btnTouchToggle.classList.remove('is-active');
    resizeViewports();
    syncOverlays();
  }
});

// Topbar Mobile Arcade CTA + Toolbar Full Screen button + Overlay button
document.getElementById('btn-os-fullscreen').addEventListener('click', () => {
  mobileArcade.enterFullscreen(true);
  syncOverlays();
});
document.getElementById('btn-arcade-fullscreen').addEventListener('click', () => {
  mobileArcade.enterFullscreen(true);
  syncOverlays();
});
document.getElementById('btn-start-arcade').addEventListener('click', () => {
  mobileArcade.enterFullscreen(true);
  syncOverlays();
});

btnTouchToggle.addEventListener('click', () => {
  const next = !mobileArcade.sticksVisible;
  mobileArcade.setSticksVisible(next);
  btnTouchToggle.classList.toggle('is-active', next);
});

const overlayTitle = document.getElementById('overlay-title');
const overlayPaused = document.getElementById('overlay-paused');
const overlayEnd = document.getElementById('overlay-end');
const endHeading = document.getElementById('end-heading');
const endSummary = document.getElementById('end-summary');

document.getElementById('btn-start-2d').addEventListener('click', () => {
  setRenderMode('2d');
  engine.startNewGame(Number(selectWorld.value));
  syncOverlays();
});
document.getElementById('btn-start-3d').addEventListener('click', () => {
  setRenderMode('3d');
  engine.startNewGame(Number(selectWorld.value));
  syncOverlays();
});
document.getElementById('btn-resume').addEventListener('click', () => {
  engine.togglePause();
  syncOverlays();
});
document.getElementById('btn-play-again').addEventListener('click', () => {
  engine.startNewGame(engine.worldIndex === 3 ? 3 : 0);
  selectWorld.value = engine.worldIndex === 3 ? '3' : '0';
  syncOverlays();
});

function syncOverlays() {
  overlayTitle.classList.toggle('is-hidden', engine.state !== 'TITLE_MENU');
  overlayPaused.classList.toggle('is-hidden', engine.state !== 'PAUSED');
  const isEnd = engine.state === 'GAME_OVER' || engine.state === 'VICTORY';
  overlayEnd.classList.toggle('is-hidden', !isEnd);
  if (isEnd) {
    endHeading.textContent = engine.state === 'VICTORY' ? 'Kingdom Restored' : 'Game Over';
    endSummary.textContent = `Final Score ${String(engine.score).padStart(6, '0')} · Coins ${engine.coins} · Best ${String(engine.highScore).padStart(6, '0')}`;
  }
  selectWorld.value = String(engine.worldIndex);
}

// 7. Keyboard Controls
const KEY_MAP = {
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  ArrowDown: 'down', KeyS: 'down',
  Space: 'jump', ArrowUp: 'jump', KeyW: 'jump', KeyZ: 'jump', KeyK: 'jump',
  ShiftLeft: 'sprint', ShiftRight: 'sprint', KeyX: 'sprint', KeyJ: 'sprint',
  KeyF: 'fire'
};

window.addEventListener('keydown', (e) => {
  if (document.activeElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;
  if (!isWindowVisible('win-mario') && !mobileArcade.isFullscreen) return;

  if (e.code === 'KeyV') {
    setRenderMode(renderMode === '2d' ? '3d' : '2d');
    return;
  }
  if (e.code === 'KeyP' || e.code === 'Escape') {
    if (e.code === 'Escape' && mobileArcade.isFullscreen) {
      mobileArcade.exitFullscreen();
      return;
    }
    if (engine.state === 'PLAYING' || engine.state === 'PAUSED') {
      engine.togglePause();
      syncOverlays();
    }
    return;
  }
  if (e.code === 'KeyR' && engine.state !== 'TITLE_MENU') {
    engine.startNewGame(engine.worldIndex);
    syncOverlays();
    return;
  }
  const action = KEY_MAP[e.code];
  if (action) {
    e.preventDefault();
    if (action === 'sprint') engine.input.sprintKeyHeld = true;
    engine.setKey(action, true);
  }
});

window.addEventListener('keyup', (e) => {
  const action = KEY_MAP[e.code];
  if (action) {
    if (action === 'sprint') engine.input.sprintKeyHeld = false;
    engine.setKey(action, false);
  }
});

// 8. Liquid CAD App Wiring
const cadSelect = document.getElementById('cad-preset-select');
const cadPrompt = document.getElementById('cad-prompt-input');
const cadBtnSynth = document.getElementById('cad-btn-synth');
const cadStatus = document.getElementById('cad-status');
const cadPartCount = document.getElementById('cad-part-count');

function updateCadMeta() {
  const asm = cadApp.currentAssembly;
  cadStatus.textContent = `${asm.name} — ${asm.summary}`;
  cadStatus.classList.remove('is-error');
  cadPartCount.textContent = `${asm.parts?.length || 0} parts`;
}
updateCadMeta();

cadSelect.addEventListener('change', () => {
  const preset = CAD_PRESETS[cadSelect.value];
  if (preset) {
    cadApp.setAssembly(preset);
    matrixEngine.setCadAssembly(preset);
    updateCadMeta();
  }
});

cadBtnSynth.addEventListener('click', async () => {
  const prompt = cadPrompt.value.trim();
  if (!prompt) {
    cadStatus.textContent = 'Enter a 3D system description first.';
    cadStatus.classList.add('is-error');
    return;
  }
  cadBtnSynth.disabled = true;
  cadBtnSynth.textContent = 'Synthesizing...';
  cadStatus.classList.remove('is-error');
  cadStatus.textContent = 'Generating parametric 3D assembly via Gemini...';
  const result = await fetchJsonSafe('/api/gemini/cad', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt })
  }, 'Liquid CAD AI');
  if (result.ok && result.data?.assembly) {
    cadApp.setAssembly(result.data.assembly);
    matrixEngine.setCadAssembly(result.data.assembly);
    fortressGame.setCenterMonument(result.data.assembly);
    updateCadMeta();
  } else {
    cadStatus.textContent = `${result.error} — Use "Local Synth" or App 2 (CAD Synth) to build "${prompt}" instantly.`;
    cadStatus.classList.add('is-error');
  }
  cadBtnSynth.disabled = false;
  cadBtnSynth.textContent = 'Prompt AI';
});

document.getElementById('cad-btn-local-synth').addEventListener('click', () => {
  const prompt = cadPrompt.value.trim() || 'Dog';
  const asm = semanticSynth.synthesize(prompt);
  semanticSynth.pushToSystem(asm);
  updateCadMeta();
});

function bindCadSlider(id, valId, paramKey, suffix = 'x', rebuild = false) {
  const slider = document.getElementById(id);
  const label = document.getElementById(valId);
  slider.addEventListener('input', () => {
    const v = Number(slider.value);
    cadApp.params[paramKey] = v;
    label.textContent = `${v.toFixed(paramKey === 'detail' ? 0 : 2)}${suffix}`;
    if (paramKey === 'scaleGlobal') matrixEngine.cadScale = v;
    if (rebuild) cadApp.rebuildAssembly();
  });
}
bindCadSlider('cad-scale-global', 'val-cad-global', 'scaleGlobal', 'x');
bindCadSlider('cad-scale-x', 'val-cad-x', 'scaleX', 'x');
bindCadSlider('cad-scale-y', 'val-cad-y', 'scaleY', 'x');
bindCadSlider('cad-scale-z', 'val-cad-z', 'scaleZ', 'x');
bindCadSlider('cad-explode', 'val-cad-explode', 'explode', 'u');
bindCadSlider('cad-spin', 'val-cad-spin', 'spinMult', 'x');
bindCadSlider('cad-detail', 'val-cad-detail', 'detail', ' seg', true);

const cadBtnWire = document.getElementById('cad-btn-wire');
cadBtnWire.addEventListener('click', () => {
  cadApp.params.wireframe = !cadApp.params.wireframe;
  cadBtnWire.classList.toggle('is-active', cadApp.params.wireframe);
  cadApp.rebuildAssembly();
});

document.getElementById('cad-btn-send-matrix').addEventListener('click', () => {
  matrixEngine.setCadAssembly(cadApp.currentAssembly);
  matrixEngine.cadScale = cadApp.params.scaleGlobal;
  wm.open('win-matrix');
  syncStudioLoops();
});

// 9. Hybrid Movement App Wiring (Linked to Matrix, Video, Text2Movie)
const mvModeSelect = document.getElementById('mv-mode-select');
const mvEaseSelect = document.getElementById('mv-ease-select');

mvModeSelect.addEventListener('change', () => {
  hybridMovement.applyConfig({ mode: mvModeSelect.value });
  movementApp.rebuildTrajectoryVisual();
});
mvEaseSelect.addEventListener('change', () => {
  hybridMovement.applyConfig({ easeCurve: mvEaseSelect.value });
  movementApp.rebuildTrajectoryVisual();
});

function bindMvSlider(id, valId, key, suffix = '', decimals = 0, rebuildSpline = false) {
  const el = document.getElementById(id);
  const valEl = document.getElementById(valId);
  el.addEventListener('input', () => {
    const v = Number(el.value);
    valEl.textContent = `${v.toFixed(decimals)}${suffix}`;
    hybridMovement.applyConfig({ [key]: v });
    if (rebuildSpline) movementApp.rebuildTrajectoryVisual();
  });
}
bindMvSlider('mv-stiffness', 'val-mv-stiff', 'stiffness', '', 0);
bindMvSlider('mv-damping', 'val-mv-damp', 'damping', '', 0);
bindMvSlider('mv-speed', 'val-mv-speed', 'gaitSpeed', 'x', 2);
bindMvSlider('mv-radius', 'val-mv-radius', 'pathRadius', 'm', 1, true);
bindMvSlider('mv-smooth', 'val-mv-smooth', 'smoothness', '', 2);
bindMvSlider('mv-breath', 'val-mv-breath', 'cadBreathing', '', 2);
bindMvSlider('mv-lag', 'val-mv-lag', 'cameraLag', '', 2);

document.getElementById('mv-btn-reset').addEventListener('click', () => {
  hybridMovement.applyConfig({
    mode: 'figure_eight', stiffness: 115, damping: 16, smoothness: 0.78,
    pathRadius: 3.4, gaitSpeed: 1.0, easeCurve: 'quintic', cadBreathing: 0.35, cameraLag: 0.55
  });
  syncMovementUi();
  movementApp.rebuildTrajectoryVisual();
});

function syncMovementUi() {
  const c = hybridMovement.config;
  mvModeSelect.value = c.mode;
  mvEaseSelect.value = c.easeCurve;
  document.getElementById('mv-stiffness').value = c.stiffness;
  document.getElementById('val-mv-stiff').textContent = Math.round(c.stiffness);
  document.getElementById('mv-damping').value = c.damping;
  document.getElementById('val-mv-damp').textContent = Math.round(c.damping);
  document.getElementById('mv-speed').value = c.gaitSpeed;
  document.getElementById('val-mv-speed').textContent = `${Number(c.gaitSpeed).toFixed(2)}x`;
  document.getElementById('mv-radius').value = c.pathRadius;
  document.getElementById('val-mv-radius').textContent = `${Number(c.pathRadius).toFixed(1)}m`;
  document.getElementById('mv-smooth').value = c.smoothness;
  document.getElementById('val-mv-smooth').textContent = Number(c.smoothness).toFixed(2);
  document.getElementById('mv-breath').value = c.cadBreathing;
  document.getElementById('val-mv-breath').textContent = Number(c.cadBreathing).toFixed(2);
  document.getElementById('mv-lag').value = c.cameraLag;
  document.getElementById('val-mv-lag').textContent = Number(c.cameraLag).toFixed(2);
}

// 10. Hybrid Scene Designer Wiring (Linked to Matrix, Video, Text2Movie)
const scBiomeSelect = document.getElementById('sc-biome-select');
const scExportJsonBtn = document.getElementById('sc-btn-export-json');
let sceneJsonUrl = null;

function refreshSceneJsonLink() {
  if (sceneJsonUrl) URL.revokeObjectURL(sceneJsonUrl);
  const blob = new Blob([JSON.stringify(hybridScene.config, null, 2)], { type: 'application/json' });
  sceneJsonUrl = URL.createObjectURL(blob);
  scExportJsonBtn.href = sceneJsonUrl;
  scExportJsonBtn.download = `hybrid-scene-${hybridScene.config.biome}.json`;
}

function syncSceneUi() {
  const c = hybridScene.config;
  scBiomeSelect.value = c.biome;
  document.getElementById('sc-fog').value = c.fogDensity;
  document.getElementById('val-sc-fog').textContent = Number(c.fogDensity).toFixed(3);
  document.getElementById('sc-keyint').value = c.keyIntensity;
  document.getElementById('val-sc-keyint').textContent = Number(c.keyIntensity).toFixed(2);
  document.getElementById('sc-keyelev').value = c.keyElevation;
  document.getElementById('val-sc-keyelev').textContent = `${c.keyElevation}m`;
  document.getElementById('sc-sunscale').value = c.sunScale;
  document.getElementById('val-sc-sunscale').textContent = `${Number(c.sunScale).toFixed(2)}x`;
  document.getElementById('sc-gridscale').value = c.gridScale;
  document.getElementById('val-sc-gridscale').textContent = Number(c.gridScale).toFixed(2);
  document.getElementById('sc-mariox').value = c.marioPos[0];
  document.getElementById('val-sc-mariox').textContent = `${Number(c.marioPos[0]).toFixed(1)}m`;
  document.getElementById('sc-promox').value = c.promoPos[0];
  document.getElementById('val-sc-promox').textContent = `${Number(c.promoPos[0]).toFixed(1)}m`;
  document.getElementById('sc-rim-color').value = c.rimColor;
  document.getElementById('sc-grid-color').value = c.gridColor;
  refreshSceneJsonLink();
}
syncSceneUi();

scBiomeSelect.addEventListener('change', () => {
  hybridScene.applyBiome(scBiomeSelect.value);
  syncSceneUi();
});

function bindSceneSlider(id, valId, key, decimals = 2, suffix = '') {
  document.getElementById(id).addEventListener('input', (e) => {
    const v = Number(e.target.value);
    document.getElementById(valId).textContent = `${v.toFixed(decimals)}${suffix}`;
    hybridScene.applyConfig({ [key]: v });
    refreshSceneJsonLink();
  });
}
bindSceneSlider('sc-fog', 'val-sc-fog', 'fogDensity', 3);
bindSceneSlider('sc-keyint', 'val-sc-keyint', 'keyIntensity', 2);
bindSceneSlider('sc-keyelev', 'val-sc-keyelev', 'keyElevation', 0, 'm');
bindSceneSlider('sc-sunscale', 'val-sc-sunscale', 'sunScale', 2, 'x');
bindSceneSlider('sc-gridscale', 'val-sc-gridscale', 'gridScale', 2);

document.getElementById('sc-mariox').addEventListener('input', (e) => {
  const v = Number(e.target.value);
  document.getElementById('val-sc-mariox').textContent = `${v.toFixed(1)}m`;
  hybridScene.applyConfig({ marioPos: [v, hybridScene.config.marioPos[1]] });
  refreshSceneJsonLink();
});
document.getElementById('sc-promox').addEventListener('input', (e) => {
  const v = Number(e.target.value);
  document.getElementById('val-sc-promox').textContent = `${v.toFixed(1)}m`;
  hybridScene.applyConfig({ promoPos: [v, hybridScene.config.promoPos[1]] });
  refreshSceneJsonLink();
});
document.getElementById('sc-rim-color').addEventListener('input', (e) => {
  hybridScene.applyConfig({ rimColor: e.target.value });
  refreshSceneJsonLink();
});
document.getElementById('sc-grid-color').addEventListener('input', (e) => {
  hybridScene.applyConfig({ gridColor: e.target.value });
  refreshSceneJsonLink();
});

// 11. Concept Production Matrix & 6 Daemons Wiring
const matrixLayerChecks = {
  cad: document.getElementById('mx-layer-cad'),
  sun: document.getElementById('mx-layer-sun'),
  mario: document.getElementById('mx-layer-mario'),
  grid: document.getElementById('mx-layer-grid'),
  promo: document.getElementById('mx-layer-promo')
};
Object.entries(matrixLayerChecks).forEach(([key, chk]) => {
  chk.addEventListener('change', () => {
    matrixEngine.layers[key] = chk.checked;
  });
});

document.getElementById('mx-camera-select').addEventListener('change', (e) => {
  matrixEngine.cameraMode = e.target.value;
});
document.getElementById('mx-exposure').addEventListener('input', (e) => {
  const v = Number(e.target.value);
  matrixEngine.renderer.toneMappingExposure = v;
  document.getElementById('val-mx-exposure').textContent = v.toFixed(2);
});
document.getElementById('mx-cad-scale').addEventListener('input', (e) => {
  const v = Number(e.target.value);
  matrixEngine.cadScale = v;
  document.getElementById('val-mx-scale').textContent = `${v.toFixed(2)}x`;
});
document.getElementById('mx-spin-boost').addEventListener('input', (e) => {
  const v = Number(e.target.value);
  matrixEngine.cadSpinBoost = v;
  document.getElementById('val-mx-spin').textContent = `${v.toFixed(1)}x`;
});
document.getElementById('mx-btn-open-video').addEventListener('click', () => {
  wm.open('win-video');
  syncStudioLoops();
});

// Populate 6 Daemons Controls
const daemonListEl = document.getElementById('daemon-list');
const daemonFpsReadout = document.getElementById('daemon-fps-readout');
daemonSupervisor.getList().forEach((d) => {
  const row = document.createElement('label');
  row.className = 'daemon-row';
  row.innerHTML = `
    <div class="daemon-meta">
      <span class="daemon-name">${d.name}</span>
      <span class="daemon-desc">${d.desc}</span>
    </div>
    <input type="checkbox" ${d.enabled ? 'checked' : ''} data-daemon-id="${d.id}" />
  `;
  row.querySelector('input').addEventListener('change', (e) => {
    daemonSupervisor.toggleDaemon(d.id, e.target.checked);
  });
  daemonListEl.appendChild(row);
});

// 12. Black Glass Video Studio Wiring
const videoPrompt = document.getElementById('vid-prompt-input');
const videoBtnEvoke = document.getElementById('vid-btn-evoke');
const videoStatus = document.getElementById('vid-status');
const videoShotStrip = document.getElementById('vid-shot-strip');
const videoTimecode = document.getElementById('vid-timecode');
const videoBtnPlay = document.getElementById('vid-btn-play');
const videoBtnExport = document.getElementById('vid-btn-export');
const videoDownloadLink = document.getElementById('vid-download-link');
const videoPromoInput = document.getElementById('vid-promo-input');
const videoFpsSelect = document.getElementById('vid-fps-select');

function renderShotStrip() {
  videoShotStrip.innerHTML = '';
  const active = videoApp.getActiveShot();
  videoApp.movie.shots.forEach((s, idx) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'shot-chip' + (idx === active.index ? ' is-active' : '');
    btn.innerHTML = `<span class="shot-title">${s.label}</span><span class="shot-meta">${s.duration}s · ${s.camera}</span>`;
    btn.addEventListener('click', () => {
      videoApp.jumpToShot(idx);
      renderShotStrip();
    });
    videoShotStrip.appendChild(btn);
  });
}
renderShotStrip();

videoApp.onShotChange = () => {
  renderShotStrip();
  Object.entries(matrixLayerChecks).forEach(([k, chk]) => {
    chk.checked = Boolean(matrixEngine.layers[k]);
  });
};

document.getElementById('vid-preset-select').addEventListener('change', (e) => {
  const p = MOVIE_PRESETS[e.target.value];
  if (p) {
    videoApp.setMovie(JSON.parse(JSON.stringify(p)));
    videoStatus.classList.remove('is-error');
    videoStatus.textContent = `${p.title} — ${p.tagline}`;
    renderShotStrip();
  }
});

document.getElementById('vid-promo-btn').addEventListener('click', () => videoPromoInput.click());
videoPromoInput.addEventListener('change', (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  videoApp.setPromoFile(file);
  videoStatus.classList.remove('is-error');
  videoStatus.textContent = `Loaded promo asset: ${file.name}`;
});

document.getElementById('vid-promo-mode').addEventListener('change', (e) => {
  videoApp.promoMode = e.target.value;
});

videoBtnEvoke.addEventListener('click', async () => {
  const prompt = videoPrompt.value.trim();
  if (!prompt && !videoApp.promoImageDataUrl && !videoApp.promoName) {
    videoStatus.textContent = 'Write a movie prompt or upload a promo image/video first.';
    videoStatus.classList.add('is-error');
    return;
  }
  videoBtnEvoke.disabled = true;
  videoBtnEvoke.textContent = 'Directing...';
  videoStatus.classList.remove('is-error');
  videoStatus.textContent = 'Directing multi-shot 1080p scene with Gemini...';

  const result = await fetchJsonSafe('/api/gemini/movie', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      promoName: videoApp.promoName,
      imageDataUrl: videoApp.promoImageDataUrl
    })
  }, 'Black Glass Movie');
  if (result.ok && result.data?.movie) {
    videoApp.setMovie(result.data.movie);
    videoApp.playing = true;
    videoBtnPlay.textContent = 'Pause';
    videoStatus.textContent = `${result.data.movie.title} — ${result.data.movie.tagline}`;
    renderShotStrip();
  } else {
    videoStatus.textContent = result.error;
    videoStatus.classList.add('is-error');
  }
  videoBtnEvoke.disabled = false;
  videoBtnEvoke.textContent = 'Evoke Movie Scene';
});

videoBtnPlay.addEventListener('click', () => {
  videoApp.playing = !videoApp.playing;
  videoBtnPlay.textContent = videoApp.playing ? 'Pause' : 'Play';
});

function startMovieExport(fps) {
  if (videoApp.recording) {
    videoApp.stopRecording();
    return;
  }
  videoDownloadLink.classList.add('is-hidden');
  t2mDlWebm.classList.add('is-hidden');
  const started = videoApp.startFullHdRecording(fps);
  if (!started) {
    const msg = 'Full HD MediaRecorder is not supported in this browser.';
    videoStatus.textContent = msg;
    videoStatus.classList.add('is-error');
    t2mStatus.textContent = msg;
    t2mStatus.classList.add('is-error');
    return;
  }
  videoBtnExport.textContent = 'Stop Export';
  t2mBtnExportWebm.textContent = 'Stop Export';
}

videoBtnExport.addEventListener('click', () => {
  startMovieExport(Number(videoFpsSelect.value) || 30);
});

// 13. Single-Prompt Text-to-Movie Window Wiring
const t2mPrompt = document.getElementById('t2m-prompt-input');
const t2mDurationSelect = document.getElementById('t2m-duration-select');
const t2mFpsSelect = document.getElementById('t2m-fps-select');
const t2mBtnGenerate = document.getElementById('t2m-btn-generate');
const t2mRecipeSelect = document.getElementById('t2m-recipe-select');
const t2mStatus = document.getElementById('t2m-status');
const t2mProgress = document.getElementById('t2m-progress');
const t2mBtnExportWebm = document.getElementById('t2m-btn-export-webm');
const t2mDlWebm = document.getElementById('t2m-dl-webm');
const t2mBtnExportPng = document.getElementById('t2m-btn-export-png');
const t2mDlJson = document.getElementById('t2m-dl-json');
const t2mDlTxt = document.getElementById('t2m-dl-txt');

function refreshT2mLinks() {
  const { jsonUrl, scriptUrl } = t2mApp.generateTextAndJsonExports();
  const slug = (t2mApp.currentPackage.title || 'black-glass-movie').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  t2mDlJson.href = jsonUrl;
  t2mDlJson.download = `${slug}-scene.json`;
  t2mDlTxt.href = scriptUrl;
  t2mDlTxt.download = `${slug}-script.txt`;
}
refreshT2mLinks();

t2mRecipeSelect.addEventListener('change', () => {
  const recipe = TEXT2MOVIE_RECIPES[t2mRecipeSelect.value];
  if (!recipe) return;
  t2mApp.applyPackage(JSON.parse(JSON.stringify(recipe)));
  syncMovementUi();
  syncSceneUi();
  movementApp.rebuildTrajectoryVisual();
  updateCadMeta();
  renderShotStrip();
  refreshT2mLinks();
  t2mStatus.classList.remove('is-error');
  t2mStatus.textContent = `${recipe.title} — ${recipe.tagline}`;
});

t2mBtnGenerate.addEventListener('click', async () => {
  const prompt = t2mPrompt.value.trim();
  if (!prompt) {
    t2mStatus.textContent = 'Enter a single movie prompt or choose a starter recipe.';
    t2mStatus.classList.add('is-error');
    return;
  }
  t2mBtnGenerate.disabled = true;
  t2mBtnGenerate.textContent = 'Generating...';
  t2mStatus.classList.remove('is-error');
  t2mStatus.textContent = 'Generating unified 3D scene, movement rig, CAD centerpiece & shot script...';

  const result = await fetchJsonSafe('/api/gemini/text2movie', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, duration: Number(t2mDurationSelect.value) || 12 })
  }, 'Text2Movie');
  if (result.ok && result.data?.package) {
    t2mApp.applyPackage(result.data.package);
    syncMovementUi();
    syncSceneUi();
    movementApp.rebuildTrajectoryVisual();
    updateCadMeta();
    renderShotStrip();
    refreshT2mLinks();
    t2mStatus.textContent = `${result.data.package.title} — All systems linked & export files ready.`;
  } else {
    t2mStatus.textContent = result.error;
    t2mStatus.classList.add('is-error');
  }
  t2mBtnGenerate.disabled = false;
  t2mBtnGenerate.textContent = 'Generate Movie';
});

t2mBtnExportWebm.addEventListener('click', () => {
  startMovieExport(Number(t2mFpsSelect.value) || 30);
});

t2mBtnExportPng.addEventListener('click', () => {
  const pngUrl = t2mApp.capturePosterPng();
  const a = document.createElement('a');
  const slug = (t2mApp.currentPackage.title || 'black-glass').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  a.href = pngUrl;
  a.download = `${slug}-1080p-poster.png`;
  a.click();
  t2mStatus.classList.remove('is-error');
  t2mStatus.textContent = 'Saved 1920×1080 PNG cinema poster frame.';
});

videoApp.onRecordProgress = (pct, frameIdx, totalFrames) => {
  const pctStr = `${Math.round(pct * 100)}%`;
  const msg = `Stepped 1080p Render: frame ${frameIdx}/${totalFrames} (${pctStr})`;
  videoStatus.classList.remove('is-error');
  videoStatus.textContent = msg;
  t2mStatus.classList.remove('is-error');
  t2mStatus.textContent = msg;
  t2mProgress.textContent = pctStr;
  if (isWindowVisible('win-text2movie')) t2mApp.renderPreview();
};

videoApp.onRecordComplete = (url, bytes) => {
  videoBtnExport.textContent = 'Export 1080p HD';
  t2mBtnExportWebm.textContent = 'Export 1080p Movie (.webm)';
  const mb = (bytes / (1024 * 1024)).toFixed(2);
  const fileName = `${(videoApp.movie.title || 'black-glass-movie').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-1080p.webm`;

  videoDownloadLink.href = url;
  videoDownloadLink.download = fileName;
  videoDownloadLink.textContent = `Download 1080p (${mb} MB)`;
  videoDownloadLink.classList.remove('is-hidden');

  t2mDlWebm.href = url;
  t2mDlWebm.download = fileName;
  t2mDlWebm.textContent = `Download .webm (${mb} MB)`;
  t2mDlWebm.classList.remove('is-hidden');

  const readyMsg = `Smooth 1920×1080 movie ready (${mb} MB).`;
  videoStatus.classList.remove('is-error');
  videoStatus.textContent = readyMsg;
  t2mStatus.classList.remove('is-error');
  t2mStatus.textContent = readyMsg;
  t2mProgress.textContent = `1080p Ready · ${mb} MB`;
};

// 14. Physics Studio & Audio Synth OS Windows
const sliderGravity = document.getElementById('slider-gravity');
const sliderSpeed = document.getElementById('slider-speed');
const sliderJump = document.getElementById('slider-jump');
const valGravity = document.getElementById('val-gravity');
const valSpeed = document.getElementById('val-speed');
const valJump = document.getElementById('val-jump');

sliderGravity.addEventListener('input', () => {
  engine.config.gravity = Number(sliderGravity.value);
  valGravity.textContent = `${engine.config.gravity.toFixed(0)} m/s²`;
});
sliderSpeed.addEventListener('input', () => {
  engine.config.moveSpeed = Number(sliderSpeed.value);
  engine.config.sprintSpeed = engine.config.moveSpeed * 1.5;
  valSpeed.textContent = `${engine.config.moveSpeed.toFixed(1)} u/s`;
});
sliderJump.addEventListener('input', () => {
  engine.config.jumpVelocity = Number(sliderJump.value);
  valJump.textContent = `${engine.config.jumpVelocity.toFixed(1)} u/s`;
});

document.getElementById('btn-reset-physics').addEventListener('click', () => {
  engine.config = { gravity: 42.0, moveSpeed: 9.2, sprintSpeed: 13.8, jumpVelocity: 16.4, stompBounce: 11.5 };
  sliderGravity.value = '42';
  sliderSpeed.value = '9.2';
  sliderJump.value = '16.4';
  valGravity.textContent = '42 m/s²';
  valSpeed.textContent = '9.2 u/s';
  valJump.textContent = '16.4 u/s';
});

document.querySelectorAll('[data-jump-world]').forEach((btn) => {
  btn.addEventListener('click', () => {
    engine.selectWorld(Number(btn.dataset.jumpWorld));
    syncOverlays();
  });
});

const sliderVolume = document.getElementById('slider-volume');
const valVolume = document.getElementById('val-volume');
const chkMusic = document.getElementById('chk-music');
const chkSfx = document.getElementById('chk-sfx');

sliderVolume.addEventListener('input', () => {
  const v = Number(sliderVolume.value);
  audio.setVolume(v / 100);
  valVolume.textContent = `${v}%`;
});
chkMusic.addEventListener('change', () => audio.setMusicEnabled(chkMusic.checked));
chkSfx.addEventListener('change', () => { audio.sfxEnabled = chkSfx.checked; });
document.querySelectorAll('[data-sfx-test]').forEach((btn) => {
  btn.addEventListener('click', () => audio.playSfx(btn.dataset.sfxTest));
});

// 15. Generation Triad Internal Apps (World Forge, Shader Lab, Sonic Synth)
// App 1: World Forge
const wfPrompt = document.getElementById('wf-prompt-input');
const wfBtnSynth = document.getElementById('wf-btn-synth');
const wfStatus = document.getElementById('wf-status');
const wfSeedLabel = document.getElementById('wf-seed-label');
const wfThemeSelect = document.getElementById('wf-theme-select');

function syncWorldForgeUi() {
  const p = worldForgeApp.params;
  wfThemeSelect.value = p.theme;
  document.getElementById('wf-gravity').value = p.gravity;
  document.getElementById('val-wf-grav').textContent = `${Math.round(p.gravity)} m/s²`;
  document.getElementById('wf-pits').value = p.pitFrequency;
  document.getElementById('val-wf-pits').textContent = Number(p.pitFrequency).toFixed(2);
  document.getElementById('wf-plats').value = p.platformDensity;
  document.getElementById('val-wf-plats').textContent = Number(p.platformDensity).toFixed(2);
  document.getElementById('wf-enemies').value = p.enemyDensity;
  document.getElementById('val-wf-enemies').textContent = Number(p.enemyDensity).toFixed(2);
  document.getElementById('wf-coins').value = p.coinRichness;
  document.getElementById('val-wf-coins').textContent = Number(p.coinRichness).toFixed(2);
  document.getElementById('wf-pipes').value = p.pipeCount;
  document.getElementById('val-wf-pipes').textContent = String(Math.round(p.pipeCount));
  wfSeedLabel.textContent = `Seed #${p.seed}`;
}
syncWorldForgeUi();

wfThemeSelect.addEventListener('change', () => worldForgeApp.applyParams({ theme: wfThemeSelect.value }));
document.getElementById('wf-btn-random').addEventListener('click', () => {
  worldForgeApp.applyParams({ seed: Math.floor(1000 + Math.random() * 8999) });
  syncWorldForgeUi();
});
document.getElementById('wf-btn-push-mario').addEventListener('click', () => {
  worldForgeApp.pushToMario(true);
  selectWorld.value = '3';
  syncOverlays();
  if (window.innerWidth <= 820) {
    mobileArcade.enterFullscreen(true);
  } else {
    wm.open('win-mario');
  }
});
document.getElementById('wf-btn-sync-scene').addEventListener('click', () => {
  worldForgeApp.syncToSceneDesigner();
  syncSceneUi();
  wm.open('win-scene');
  syncStudioLoops();
});

[
  ['wf-gravity', 'val-wf-grav', 'gravity', ' m/s²', 0],
  ['wf-pits', 'val-wf-pits', 'pitFrequency', '', 2],
  ['wf-plats', 'val-wf-plats', 'platformDensity', '', 2],
  ['wf-enemies', 'val-wf-enemies', 'enemyDensity', '', 2],
  ['wf-coins', 'val-wf-coins', 'coinRichness', '', 2],
  ['wf-pipes', 'val-wf-pipes', 'pipeCount', '', 0]
].forEach(([id, valId, key, suf, dec]) => {
  document.getElementById(id).addEventListener('input', (e) => {
    const v = Number(e.target.value);
    document.getElementById(valId).textContent = `${v.toFixed(dec)}${suf}`;
    worldForgeApp.applyParams({ [key]: v });
  });
});

wfBtnSynth.addEventListener('click', async () => {
  const prompt = wfPrompt.value.trim();
  if (!prompt) {
    wfStatus.textContent = 'Enter a world theme prompt first.';
    wfStatus.classList.add('is-error');
    return;
  }
  wfBtnSynth.disabled = true;
  wfBtnSynth.textContent = 'Forging...';
  wfStatus.classList.remove('is-error');
  wfStatus.textContent = 'Synthesizing world blueprint via Gemini...';
  const result = await fetchJsonSafe('/api/gemini/triad-world', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt })
  }, 'Triad World Forge');
  if (result.ok && result.data?.world) {
    worldForgeApp.applyParams({ ...result.data.world, seed: Math.floor(1000 + Math.random() * 8999) });
    syncWorldForgeUi();
    worldForgeApp.syncToSceneDesigner();
    syncSceneUi();
    wfStatus.textContent = `${result.data.world.name} — Ready to push into Mario & Arcade.`;
  } else {
    wfStatus.textContent = result.error;
    wfStatus.classList.add('is-error');
  }
  wfBtnSynth.disabled = false;
  wfBtnSynth.textContent = 'Forge with AI';
});

// App 2: Shader Lab
const slPresetSelect = document.getElementById('sl-preset-select');
const slPrompt = document.getElementById('sl-prompt-input');
const slBtnSynth = document.getElementById('sl-btn-synth');
const slStatus = document.getElementById('sl-status');

function syncShaderLabUi() {
  const p = shaderLabApp.profile;
  document.getElementById('sl-metal').value = p.metalnessOffset;
  document.getElementById('val-sl-metal').textContent = Number(p.metalnessOffset).toFixed(2);
  document.getElementById('sl-rough').value = p.roughnessOffset;
  document.getElementById('val-sl-rough').textContent = Number(p.roughnessOffset).toFixed(2);
  document.getElementById('sl-coat').value = p.clearcoat;
  document.getElementById('val-sl-coat').textContent = Number(p.clearcoat).toFixed(2);
  document.getElementById('sl-emissive').value = p.emissiveBoost;
  document.getElementById('val-sl-emissive').textContent = Number(p.emissiveBoost).toFixed(2);
  document.getElementById('sl-gridglow').value = p.gridGlow;
  document.getElementById('val-sl-gridglow').textContent = Number(p.gridGlow).toFixed(2);
  document.getElementById('sl-rim-color').value = p.rimColor || '#38bdf8';
  document.getElementById('sl-grid-color').value = p.gridColor || '#38bdf8';
}
syncShaderLabUi();

slPresetSelect.addEventListener('change', () => {
  const preset = SHADER_PRESETS[slPresetSelect.value];
  if (preset) {
    shaderLabApp.applyProfile(preset);
    syncShaderLabUi();
    syncSceneUi();
    slStatus.classList.remove('is-error');
    slStatus.textContent = `${preset.name} — Synced across CAD, Matrix, Video & 3D Mario.`;
  }
});

[
  ['sl-metal', 'val-sl-metal', 'metalnessOffset'],
  ['sl-rough', 'val-sl-rough', 'roughnessOffset'],
  ['sl-coat', 'val-sl-coat', 'clearcoat'],
  ['sl-emissive', 'val-sl-emissive', 'emissiveBoost'],
  ['sl-gridglow', 'val-sl-gridglow', 'gridGlow']
].forEach(([id, valId, key]) => {
  document.getElementById(id).addEventListener('input', (e) => {
    const v = Number(e.target.value);
    document.getElementById(valId).textContent = v.toFixed(2);
    shaderLabApp.applyProfile({ [key]: v });
  });
});

document.getElementById('sl-rim-color').addEventListener('input', (e) => {
  shaderLabApp.applyProfile({ rimColor: e.target.value });
  syncSceneUi();
});
document.getElementById('sl-grid-color').addEventListener('input', (e) => {
  shaderLabApp.applyProfile({ gridColor: e.target.value });
  syncSceneUi();
});

slBtnSynth.addEventListener('click', async () => {
  const prompt = slPrompt.value.trim();
  if (!prompt) {
    slStatus.textContent = 'Enter a material or lighting aesthetic prompt.';
    slStatus.classList.add('is-error');
    return;
  }
  slBtnSynth.disabled = true;
  slBtnSynth.textContent = 'Synthesizing...';
  slStatus.classList.remove('is-error');
  slStatus.textContent = 'Synthesizing PBR shader profile via Gemini...';
  const result = await fetchJsonSafe('/api/gemini/triad-shader', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt })
  }, 'Triad Shader Lab');
  if (result.ok && result.data?.shader) {
    shaderLabApp.applyProfile(result.data.shader);
    syncShaderLabUi();
    syncSceneUi();
    fortressGame.syncFromOS();
    slStatus.textContent = `${result.data.shader.name} — Broadcast live to all 3D pipelines.`;
  } else {
    slStatus.textContent = result.error;
    slStatus.classList.add('is-error');
  }
  slBtnSynth.disabled = false;
  slBtnSynth.textContent = 'Synthesize AI';
});

// App 3: Sonic & FX Sequencer
const snPresetSelect = document.getElementById('sn-preset-select');
const snPrompt = document.getElementById('sn-prompt-input');
const snBtnSynth = document.getElementById('sn-btn-synth');
const snStatus = document.getElementById('sn-status');
const snTempo = document.getElementById('sn-tempo');
const snWave = document.getElementById('sn-wave-select');
const snFireColor = document.getElementById('sn-fire-color');

function syncSonicUi() {
  const s = sonicApp.score;
  snTempo.value = s.tempo;
  document.getElementById('val-sn-tempo').textContent = `${Math.round(s.tempo)} BPM`;
  snWave.value = s.waveform;
  snFireColor.value = s.fireColor || '#38bdf8';
}
syncSonicUi();

snPresetSelect.addEventListener('change', () => {
  const preset = SONIC_PRESETS[snPresetSelect.value];
  if (preset) {
    sonicApp.applyScore(JSON.parse(JSON.stringify(preset)), true);
    syncSonicUi();
    snStatus.classList.remove('is-error');
    snStatus.textContent = `${preset.name} — Playing & synced with Digital Sun + Fireball FX.`;
  }
});
document.getElementById('sn-btn-play').addEventListener('click', () => sonicApp.applyScore(sonicApp.score, true));
document.getElementById('sn-btn-stop').addEventListener('click', () => {
  audio.stopMusic();
  audio.isPlayingMusic = false;
});
document.getElementById('sn-btn-apply').addEventListener('click', () => sonicApp.applyScore(sonicApp.score, true));

snTempo.addEventListener('input', () => {
  const v = Number(snTempo.value);
  document.getElementById('val-sn-tempo').textContent = `${v} BPM`;
  sonicApp.applyScore({ ...sonicApp.score, tempo: v }, audio.isPlayingMusic);
});
snWave.addEventListener('change', () => sonicApp.applyScore({ ...sonicApp.score, waveform: snWave.value }, audio.isPlayingMusic));
snFireColor.addEventListener('input', () => {
  sonicApp.applyScore({ ...sonicApp.score, fireColor: snFireColor.value }, audio.isPlayingMusic);
});

snBtnSynth.addEventListener('click', async () => {
  const prompt = snPrompt.value.trim();
  if (!prompt) {
    snStatus.textContent = 'Enter a soundtrack or FX mood prompt first.';
    snStatus.classList.add('is-error');
    return;
  }
  snBtnSynth.disabled = true;
  snBtnSynth.textContent = 'Composing...';
  snStatus.classList.remove('is-error');
  snStatus.textContent = 'Composing 16-step chiptune score via Gemini...';
  const result = await fetchJsonSafe('/api/gemini/triad-sonic', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt })
  }, 'Triad Sonic Synth');
  if (result.ok && result.data?.sonic) {
    sonicApp.applyScore(result.data.sonic, true);
    syncSonicUi();
    snStatus.textContent = `${result.data.sonic.name} — Live in Mario & Matrix beat pulse.`;
  } else {
    snStatus.textContent = result.error;
    snStatus.classList.add('is-error');
  }
  snBtnSynth.disabled = false;
  snBtnSynth.textContent = 'Compose AI';
});

// 16. 5 New Connected Problem-Solving & Data Management Apps
// App 1: Pattern & Schema Guard
const pgLogList = document.getElementById('pg-log-list');
const pgStats = document.getElementById('pg-stats');
const pgStatus = document.getElementById('pg-status');
const pgRawInput = document.getElementById('pg-raw-input');
let lastRepairedCad = null;

function renderGuardLogs() {
  const s = patternGuard.getStats();
  pgStats.textContent = `Inspected ${s.inspected} · Healed ${s.healed} · Errors ${s.blocked}`;
  pgLogList.innerHTML = '';
  s.logs.forEach((l) => {
    const row = document.createElement('div');
    row.className = 'log-row';
    const col = l.status === 'error' ? '#f87171' : (l.healed ? '#facc15' : '#4ade80');
    row.innerHTML = `<span style="color:#64748b">${l.time}</span><span style="color:${col};min-width:56px;">[${l.status.toUpperCase()}]</span><strong>${l.source}</strong><span style="color:#cbd5e1">${l.detail}</span>`;
    pgLogList.appendChild(row);
  });
}
onGuardUpdate(renderGuardLogs);
renderGuardLogs();

document.getElementById('pg-chk-autoheal').addEventListener('change', (e) => patternGuard.setAutoHeal(e.target.checked));
document.getElementById('pg-btn-clear').addEventListener('click', () => patternGuard.clearLogs());
document.getElementById('pg-btn-heal').addEventListener('click', () => {
  const res = patternGuard.inspectAndHealRaw(pgRawInput.value);
  if (!res.ok) {
    pgStatus.textContent = res.error;
    pgStatus.classList.add('is-error');
    return;
  }
  pgStatus.classList.remove('is-error');
  pgRawInput.value = res.json;
  lastRepairedCad = res.assembly;
  pgStatus.textContent = res.healed ? 'Repaired schema/string patterns cleanly.' : 'Input validated with zero pattern errors.';
});
document.getElementById('pg-btn-push-cad').addEventListener('click', () => {
  if (!lastRepairedCad) {
    const asm = semanticSynth.synthesize(pgRawInput.value.trim() || 'Dog');
    semanticSynth.pushToSystem(asm);
    updateCadMeta();
    pgStatus.textContent = `Built "${asm.name}" via Semantic Synthesizer and pushed to CAD + Matrix + Fortress.`;
  } else {
    semanticSynth.pushToSystem(lastRepairedCad);
    updateCadMeta();
    pgStatus.textContent = `Pushed "${lastRepairedCad.name}" to CAD + Matrix + Fortress.`;
  }
});

// App 2: Semantic CAD Synthesizer
const ssPrompt = document.getElementById('ss-prompt-input');
const ssPrimary = document.getElementById('ss-color-primary');
const ssAccent = document.getElementById('ss-color-accent');
const ssPreview = document.getElementById('ss-json-preview');
const ssStatus = document.getElementById('ss-status');

function runSemanticBuild(pushNow = false) {
  const asm = semanticSynth.synthesize(ssPrompt.value, ssAccent.value, ssPrimary.value);
  ssPreview.textContent = JSON.stringify(asm, null, 2);
  ssStatus.textContent = `Synthesized "${asm.name}" (${asm.parts.length} parts) with zero pattern errors.`;
  if (pushNow) {
    semanticSynth.pushToSystem(asm);
    updateCadMeta();
    ssStatus.textContent = `Pushed "${asm.name}" to Liquid CAD, Matrix & Team Fortress Arena.`;
  }
}
runSemanticBuild(false);

document.getElementById('ss-btn-build').addEventListener('click', () => runSemanticBuild(false));
document.getElementById('ss-btn-push-all').addEventListener('click', () => runSemanticBuild(true));
document.getElementById('ss-btn-save-vault').addEventListener('click', () => {
  if (semanticSynth.lastAssembly) {
    dataVault.addRecord('cad_assembly', semanticSynth.lastAssembly.name, semanticSynth.lastAssembly);
    ssStatus.textContent = `Saved "${semanticSynth.lastAssembly.name}" to Data Vault.`;
  }
});
document.querySelectorAll('[data-ss-quick]').forEach((b) => {
  b.addEventListener('click', () => {
    ssPrompt.value = b.dataset.ssQuick;
    runSemanticBuild(true);
  });
});

// App 3: Data Multiplier Engine
const dmStatus = document.getElementById('dm-status');
document.getElementById('dm-domain-select').addEventListener('change', (e) => dataMultiplier.setConfig({ domain: e.target.value }));
document.getElementById('dm-factor-select').addEventListener('change', (e) => dataMultiplier.setConfig({ factor: Number(e.target.value) }));
document.getElementById('dm-bots').addEventListener('input', (e) => {
  const v = Number(e.target.value);
  document.getElementById('val-dm-bots').textContent = `${v} bots`;
  dataMultiplier.setConfig({ botScalePerTeam: v });
});
document.getElementById('dm-hp').addEventListener('input', (e) => {
  const v = Number(e.target.value);
  document.getElementById('val-dm-hp').textContent = `${v.toFixed(2)}x`;
  dataMultiplier.setConfig({ hpMultiplier: v });
});
document.getElementById('dm-dmg').addEventListener('input', (e) => {
  const v = Number(e.target.value);
  document.getElementById('val-dm-dmg').textContent = `${v.toFixed(2)}x`;
  dataMultiplier.setConfig({ damageMultiplier: v });
});
document.getElementById('dm-radius').addEventListener('input', (e) => {
  const v = Number(e.target.value);
  document.getElementById('val-dm-radius').textContent = `${v.toFixed(1)}m`;
  dataMultiplier.setConfig({ cadRingRadius: v });
});
document.getElementById('dm-btn-cad').addEventListener('click', () => {
  const asm = dataMultiplier.multiplyCurrentCad();
  if (asm) {
    updateCadMeta();
    dmStatus.textContent = `Multiplied CAD into "${asm.name}" (${asm.parts.length} parts) & synced to Fortress.`;
  }
});
document.getElementById('dm-btn-fortress').addEventListener('click', () => {
  dataMultiplier.applyToFortress();
  dmStatus.textContent = `Pushed ${dataMultiplier.config.botScalePerTeam}v${dataMultiplier.config.botScalePerTeam} (${dataMultiplier.config.hpMultiplier.toFixed(1)}x HP) squads into Team Fortress.`;
});
document.getElementById('dm-btn-vault').addEventListener('click', () => {
  const batch = dataMultiplier.computeBatch();
  dataVault.addRecord('multiplied_batch', `${dataMultiplier.config.domain} (${dataMultiplier.config.factor}x)`, { config: dataMultiplier.config, items: batch });
  dmStatus.textContent = `Committed ${batch.length} multiplied records to Data Vault.`;
});
dataMultiplier.computeBatch();
dataMultiplier.renderVisualizer();

// App 4: Unified Data Vault
const dvList = document.getElementById('dv-record-list');
const dvFilter = document.getElementById('dv-filter-select');
const dvSearch = document.getElementById('dv-search-input');
const dvEditor = document.getElementById('dv-editor');
const dvStatus = document.getElementById('dv-status');
const dvExportBtn = document.getElementById('dv-btn-export');
let dvExportUrl = null;

function renderVault() {
  const items = dataVault.filterRecords(dvFilter.value, dvSearch.value);
  dvList.innerHTML = '';
  items.forEach((rec) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'shot-chip' + (rec.id === dataVault.selectedId ? ' is-active' : '');
    btn.innerHTML = `<span class="shot-title">${rec.name}</span><span class="shot-meta">${rec.category} · ${rec.updatedAt.slice(11, 19)}</span>`;
    btn.addEventListener('click', () => {
      dataVault.selectedId = rec.id;
      dvEditor.value = JSON.stringify(rec.payload, null, 2);
      renderVault();
    });
    dvList.appendChild(btn);
  });
  const sel = dataVault.getById(dataVault.selectedId);
  if (sel && document.activeElement !== dvEditor) {
    dvEditor.value = JSON.stringify(sel.payload, null, 2);
  }
  if (dvExportUrl) URL.revokeObjectURL(dvExportUrl);
  dvExportUrl = URL.createObjectURL(new Blob([dataVault.exportAllJson()], { type: 'application/json' }));
  dvExportBtn.href = dvExportUrl;
  dvExportBtn.download = 'black-liquid-os-vault.json';
}
dataVault.onChange(renderVault);
renderVault();

dvFilter.addEventListener('change', renderVault);
dvSearch.addEventListener('input', renderVault);
document.getElementById('dv-btn-snapshot').addEventListener('click', () => {
  dataVault.addRecord('cad_assembly', `Snapshot: ${cadApp.currentAssembly?.name || 'CAD'}`, cadApp.currentAssembly);
  dvStatus.textContent = 'Captured live CAD assembly snapshot into Data Vault.';
});
document.getElementById('dv-btn-clone').addEventListener('click', () => {
  const cloned = dataVault.cloneRecord(dataVault.selectedId, '2x Clone');
  if (cloned) dvStatus.textContent = `Cloned "${cloned.name}".`;
});
document.getElementById('dv-btn-delete').addEventListener('click', () => {
  if (dataVault.deleteRecord(dataVault.selectedId)) dvStatus.textContent = 'Deleted record.';
});
document.getElementById('dv-btn-save-edit').addEventListener('click', () => {
  const res = dataVault.updateRecordJson(dataVault.selectedId, dvEditor.value);
  dvStatus.textContent = res.ok ? 'Saved validated JSON payload.' : res.error;
  dvStatus.classList.toggle('is-error', !res.ok);
});

// App 5: Pipeline & Telemetry Router
const plStatus = document.getElementById('pl-status');
[
  ['pl-route-guard', 'guardAutoHeal'],
  ['pl-route-cad', 'cadToFortressMonument'],
  ['pl-route-shader', 'shaderToFortressArena'],
  ['pl-route-sonic', 'sonicToCombatTempo'],
  ['pl-route-mult', 'multiplierToSquads'],
  ['pl-route-world', 'worldForgeToGravity']
].forEach(([id, key]) => {
  document.getElementById(id).addEventListener('change', (e) => {
    pipelineRouter.toggleRoute(key, e.target.checked);
    pipelineRouter.renderVisualizer();
  });
});
document.getElementById('pl-btn-sync-all').addEventListener('click', () => {
  pipelineRouter.broadcastFullSync();
  plStatus.textContent = `Broadcast Sync #${pipelineRouter.totalSyncs} complete — CAD, Shader, Sonic, Multiplier & Fortress linked.`;
});
pipelineRouter.renderVisualizer();

// 17. Team Fortress 3D Game Controls, Dual Thumbsticks & Full OS Integration
const tfOverlay = document.getElementById('tf-overlay-menu');
const tfScopeRing = document.getElementById('tf-scope-ring');
const tfCrosshair = document.getElementById('tf-crosshair');
const tfKillfeed = document.getElementById('tf-killfeed');
const tfDualStick = document.getElementById('tf-dual-stick');
const tfBtnSticks = document.getElementById('tf-btn-sticks');

document.getElementById('tf-mode-select').addEventListener('change', (e) => fortressGame.setMode(e.target.value));
document.getElementById('tf-class-select').addEventListener('change', (e) => fortressGame.setPlayerClass(e.target.value));
document.getElementById('tf-skin-select').addEventListener('change', (e) => fortressGame.setSkin(e.target.value));
document.getElementById('tf-btn-sync').addEventListener('click', () => {
  pipelineRouter.broadcastFullSync();
  fortressGame.syncFromOS();
});

function launchFortress(withSticks = false) {
  tfOverlay.classList.add('is-hidden');
  resizeStudioViewport(tfViewportEl, fortressGame);
  fortressGame.startMatch(document.getElementById('tf-mode-select').value);
  if (withSticks) {
    tfDualStick.classList.remove('is-hidden');
    tfBtnSticks.classList.add('is-active');
  }
}
document.getElementById('tf-btn-start').addEventListener('click', () => launchFortress(!tfDualStick.classList.contains('is-hidden')));
document.getElementById('tf-btn-play-now').addEventListener('click', () => launchFortress(false));
document.getElementById('tf-btn-play-mobile').addEventListener('click', () => launchFortress(true));
tfBtnSticks.addEventListener('click', () => {
  const next = tfDualStick.classList.contains('is-hidden');
  tfDualStick.classList.toggle('is-hidden', !next);
  tfBtnSticks.classList.toggle('is-active', next);
});

// Pointer Lock / Drag Look on TF Canvas
let tfDragging = false;
let tfLastPtr = { x: 0, y: 0 };
tfCanvas.addEventListener('pointerdown', (e) => {
  if (fortressGame.state !== 'PLAYING') return;
  tfDragging = true;
  tfLastPtr = { x: e.clientX, y: e.clientY };
  if (e.pointerType === 'mouse' && e.button === 0) {
    fortressGame.input.mouseFiring = true;
  }
});
window.addEventListener('pointermove', (e) => {
  if (!tfDragging || fortressGame.state !== 'PLAYING') return;
  fortressGame.input.lookDeltaX += (e.clientX - tfLastPtr.x) * 1.35;
  fortressGame.input.lookDeltaY += (e.clientY - tfLastPtr.y) * 1.1;
  tfLastPtr = { x: e.clientX, y: e.clientY };
});
window.addEventListener('pointerup', () => {
  tfDragging = false;
  fortressGame.input.mouseFiring = false;
});
tfCanvas.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  if (fortressGame.state === 'PLAYING') fortressGame.triggerSpecialAbility();
});

// TF Keyboard Bindings (WASD + Space + F + Q/E + R + 1-9)
const TF_CLASS_KEYS = ['scout', 'soldier', 'pyro', 'demoman', 'heavy', 'engineer', 'medic', 'sniper', 'spy'];
window.addEventListener('keydown', (e) => {
  if (!isWindowVisible('win-fortress')) return;
  if (document.activeElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;
  if (e.code === 'KeyW') fortressGame.input.keys.w = true;
  if (e.code === 'KeyS') fortressGame.input.keys.s = true;
  if (e.code === 'KeyA') fortressGame.input.keys.a = true;
  if (e.code === 'KeyD') fortressGame.input.keys.d = true;
  if (e.code === 'Space') { e.preventDefault(); fortressGame.triggerPlayerJump(); }
  if (e.code === 'KeyF') fortressGame.input.keys.fire = true;
  if (e.code === 'KeyQ' || e.code === 'KeyE') fortressGame.triggerSpecialAbility();
  if (e.code === 'KeyR') fortressGame.triggerReload();
  if (e.code.startsWith('Digit')) {
    const idx = Number(e.code.replace('Digit', '')) - 1;
    if (TF_CLASS_KEYS[idx]) {
      fortressGame.setPlayerClass(TF_CLASS_KEYS[idx]);
      document.getElementById('tf-class-select').value = TF_CLASS_KEYS[idx];
    }
  }
});
window.addEventListener('keyup', (e) => {
  if (e.code === 'KeyW') fortressGame.input.keys.w = false;
  if (e.code === 'KeyS') fortressGame.input.keys.s = false;
  if (e.code === 'KeyA') fortressGame.input.keys.a = false;
  if (e.code === 'KeyD') fortressGame.input.keys.d = false;
  if (e.code === 'KeyF') fortressGame.input.keys.fire = false;
});

// TF Dual Thumbsticks Wiring
function bindTfThumbstick(zoneId, knobId, onMove) {
  const zone = document.getElementById(zoneId);
  const knob = document.getElementById(knobId);
  let activePtr = null;
  const maxR = 32;
  const update = (cx, cy) => {
    const r = zone.getBoundingClientRect();
    const dx = cx - (r.left + r.width / 2);
    const dy = cy - (r.top + r.height / 2);
    const dist = Math.hypot(dx, dy);
    const clampD = Math.min(maxR, dist);
    const ang = Math.atan2(dy, dx);
    const kx = dist > 0.1 ? Math.cos(ang) * clampD : 0;
    const ky = dist > 0.1 ? Math.sin(ang) * clampD : 0;
    knob.style.transform = `translate(${kx.toFixed(1)}px, ${ky.toFixed(1)}px)`;
    onMove(kx / maxR, ky / maxR, true);
  };
  zone.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    activePtr = e.pointerId;
    zone.setPointerCapture?.(e.pointerId);
    knob.classList.add('is-active');
    update(e.clientX, e.clientY);
  });
  zone.addEventListener('pointermove', (e) => {
    if (e.pointerId === activePtr) update(e.clientX, e.clientY);
  });
  const reset = (e) => {
    if (e.pointerId !== activePtr) return;
    activePtr = null;
    knob.classList.remove('is-active');
    knob.style.transform = 'translate(0px, 0px)';
    onMove(0, 0, false);
  };
  zone.addEventListener('pointerup', reset);
  zone.addEventListener('pointercancel', reset);
}
bindTfThumbstick('tf-stick-left', 'tf-knob-left', (nx, ny) => {
  fortressGame.input.stickMoveX = nx;
  fortressGame.input.stickMoveY = ny;
});
bindTfThumbstick('tf-stick-right', 'tf-knob-right', (ax, ay, active) => {
  fortressGame.input.stickAimX = ax;
  fortressGame.input.stickAimY = ay;
  fortressGame.input.stickAimActive = active;
});
document.getElementById('tf-pad-jump').addEventListener('pointerdown', (e) => { e.preventDefault(); fortressGame.triggerPlayerJump(); });
document.getElementById('tf-pad-special').addEventListener('pointerdown', (e) => { e.preventDefault(); fortressGame.triggerSpecialAbility(); });
document.getElementById('tf-pad-reload').addEventListener('pointerdown', (e) => { e.preventDefault(); fortressGame.triggerReload(); });

fortressGame.onHudUpdate = (snap) => {
  document.getElementById('tf-hud-class').textContent = snap.uberActive ? `${snap.className} (UBER!)` : (snap.cloakActive ? `${snap.className} (CLOAK)` : snap.className);
  document.getElementById('tf-hud-hp').textContent = snap.respawnTimer > 0 ? `Respawn ${snap.respawnTimer}s` : `${snap.hp}/${snap.maxHp}`;
  document.getElementById('tf-hud-ammo').textContent = snap.reloading ? 'Reload...' : `${snap.ammo}/${snap.maxAmmo}`;
  document.getElementById('tf-hud-special').textContent = snap.specialReady ? snap.specialName : `${snap.specialCooldown}s`;
  document.getElementById('tf-hud-red').textContent = String(snap.redScore);
  document.getElementById('tf-hud-blu').textContent = String(snap.bluScore);
  document.getElementById('tf-hud-obj').textContent = fortressGame.mode === 'koth'
    ? `KOTH ${snap.kothOwner.toUpperCase()} R:${snap.kothRedTime}s B:${snap.kothBluTime}s`
    : `${fortressGame.mode.toUpperCase()} First to ${fortressGame.scores.winTarget}`;
  document.getElementById('tf-hud-kd').textContent = `${snap.kills}/${snap.deaths}`;
  tfScopeRing.classList.toggle('is-hidden', !snap.scoped);
  tfCrosshair.classList.toggle('is-hit', snap.hitmarker);

  tfKillfeed.innerHTML = '';
  snap.killfeed.forEach((k) => {
    const el = document.createElement('div');
    el.className = 'tf-kill-entry';
    el.textContent = `${k.killerName} [${k.weapon}] ${k.victimName}`;
    tfKillfeed.appendChild(el);
  });
};

// 18. HUD & Telemetry Sync
const hudScore = document.getElementById('hud-score');
const hudHigh = document.getElementById('hud-high');
const hudCoins = document.getElementById('hud-coins');
const hudWorld = document.getElementById('hud-world');
const hudPower = document.getElementById('hud-power');
const hudTime = document.getElementById('hud-time');
const hudLives = document.getElementById('hud-lives');
const telPos = document.getElementById('tel-pos');
const telVel = document.getElementById('tel-vel');
const telState = document.getElementById('tel-state');

function updateHud() {
  hudScore.textContent = String(engine.score).padStart(6, '0');
  hudHigh.textContent = String(engine.highScore).padStart(6, '0');
  hudCoins.textContent = String(engine.coins).padStart(2, '0');
  hudWorld.textContent = engine.level.id;
  const powerName = engine.player.starTimer > 0 ? 'Star' : (engine.player.power === 'fire' ? 'Fire' : engine.player.power === 'super' ? 'Super' : 'Small');
  hudPower.textContent = powerName;
  hudTime.textContent = String(Math.ceil(engine.timeLeft)).padStart(3, '0');
  hudLives.textContent = String(engine.lives);

  telPos.textContent = `${engine.player.x.toFixed(1)}, ${engine.player.y.toFixed(1)}`;
  telVel.textContent = `${engine.player.vx.toFixed(1)}, ${engine.player.vy.toFixed(1)}`;
  telState.textContent = `${engine.state} · ${renderMode.toUpperCase()}`;

  const totalDur = videoApp.getTotalDuration();
  videoTimecode.textContent = `${videoApp.currentTime.toFixed(1)}s / ${totalDur.toFixed(1)}s`;
  daemonFpsReadout.textContent = `${daemonSupervisor.daemons.framePacer.fps} fps`;

  mobileArcade.syncHud(renderMode);
}

// 19. Master Animation Loop
let lastTime = performance.now();
let accumulator = 0;
const FIXED_DT = 1 / 60;
let prevEngineState = engine.state;

function tick(now) {
  const frameDt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
  lastTime = now;

  daemonSupervisor.decayBeat(frameDt);

  const marioVisible = isWindowVisible('win-mario') || mobileArcade.isFullscreen;
  if (marioVisible) {
    accumulator += frameDt;
    while (accumulator >= FIXED_DT) {
      engine.step(FIXED_DT);
      accumulator -= FIXED_DT;
    }
    if (engine.state !== prevEngineState) {
      prevEngineState = engine.state;
      syncOverlays();
    }
  }

  try {
    // Step & Render Team Fortress 3D when visible
    if (isWindowVisible('win-fortress')) {
      fortressGame.step(frameDt);
      fortressGame.render();
    }

    // Step & Render Titanfall 2 when visible
    if (isWindowVisible('win-titanfall')) {
      titanfallGame.step(frameDt);
      titanfallGame.render();
    }

    // Render live 2D Sentient Network visualizations when visible
    sentientNet.renderVisible(frameDt, isWindowVisible);

    if (isWindowVisible('win-pipeline')) {
      pipelineRouter.renderVisualizer(frameDt);
    }

    if (isWindowVisible('win-thought-cloud')) {
      thoughtCloud.render(frameDt);
    }

    // Render Production Matrix preview if open and not locked by deterministic export
    if (isWindowVisible('win-matrix') && !videoApp.recording) {
      matrixEngine.renderToCanvas(matrixPreviewCanvas, frameDt, false, false, 30);
    }

    // Render Sonic Synth live beat visualizer when open
    if (isWindowVisible('win-triad-sonic')) {
      sonicApp.renderVisualizer();
    }

    // Render Black Glass Video or Text2Movie live preview
    const videoVisible = isWindowVisible('win-video');
    const t2mVisible = isWindowVisible('win-text2movie');
    if (!videoApp.recording && (videoVisible || t2mVisible)) {
      videoApp.renderFrame(frameDt, true);
      if (t2mVisible) t2mApp.renderPreview();
    }

    updateHud();
  } catch (err) {
    logGuardEvent('Master Loop', 'error', err?.message || 'Subsystem render fault recovered', false);
  }

  // Always reschedule RAF for Mario 2D/3D
  if (marioVisible && renderMode === '3d') {
    renderer3D.render(engine, frameDt);
    renderer3D.afterDraw(() => tick(performance.now()));
  } else {
    if (marioVisible) renderer2D.render(engine);
    requestAnimationFrame(tick);
  }
}

// 20. Titanfall 2 Controls, Dual-Thumbsticks & 5 Sentient Network App Wiring
const tf2Overlay = document.getElementById('tf2-overlay-menu');
const tf2DualStick = document.getElementById('tf2-dual-stick');
const tf2BtnSticks = document.getElementById('tf2-btn-sticks');
const tf2Crosshair = document.getElementById('tf2-crosshair');
const tf2ScopeRing = document.getElementById('tf2-scope-ring');
const tf2SmartLocks = document.getElementById('tf2-smart-locks');
const tf2PromptBanner = document.getElementById('tf2-prompt-banner');
const tf2Killfeed = document.getElementById('tf2-killfeed');

document.getElementById('tf2-titan-select').addEventListener('change', (e) => titanfallGame.setTitanClass(e.target.value));
document.getElementById('tf2-tact-select').addEventListener('change', (e) => titanfallGame.setTactical(e.target.value));
document.getElementById('tf2-weapon-select').addEventListener('change', (e) => titanfallGame.setWeapon(e.target.value));
document.getElementById('tf2-skin-select').addEventListener('change', (e) => titanfallGame.setSkin(e.target.value));
document.getElementById('tf2-btn-sync').addEventListener('click', () => {
  titanfallGame.syncFromOS();
  sentientNet.applySkinAcrossGames(sentientNet.skins.config);
});

function launchTitanfall(withSticks = false) {
  tf2Overlay.classList.add('is-hidden');
  resizeStudioViewport(tf2ViewportEl, titanfallGame);
  titanfallGame.startMatch();
  if (withSticks) {
    tf2DualStick.classList.remove('is-hidden');
    tf2BtnSticks.classList.add('is-active');
  }
}
document.getElementById('tf2-btn-start').addEventListener('click', () => launchTitanfall(!tf2DualStick.classList.contains('is-hidden')));
document.getElementById('tf2-btn-play-now').addEventListener('click', () => launchTitanfall(false));
document.getElementById('tf2-btn-play-mobile').addEventListener('click', () => launchTitanfall(true));
tf2BtnSticks.addEventListener('click', () => {
  const next = tf2DualStick.classList.contains('is-hidden');
  tf2DualStick.classList.toggle('is-hidden', !next);
  tf2BtnSticks.classList.toggle('is-active', next);
});

let tf2Dragging = false;
let tf2LastPtr = { x: 0, y: 0 };
tf2Canvas.addEventListener('pointerdown', (e) => {
  if (titanfallGame.state !== 'PLAYING' && titanfallGame.state !== 'EVAC') return;
  tf2Dragging = true;
  tf2LastPtr = { x: e.clientX, y: e.clientY };
  if (e.pointerType === 'mouse' && e.button === 0) {
    titanfallGame.input.mouseFiring = true;
  }
});
window.addEventListener('pointermove', (e) => {
  if (!tf2Dragging || (titanfallGame.state !== 'PLAYING' && titanfallGame.state !== 'EVAC')) return;
  titanfallGame.input.lookDeltaX += (e.clientX - tf2LastPtr.x) * 1.4;
  titanfallGame.input.lookDeltaY += (e.clientY - tf2LastPtr.y) * 1.15;
  tf2LastPtr = { x: e.clientX, y: e.clientY };
});
window.addEventListener('pointerup', () => {
  tf2Dragging = false;
  titanfallGame.input.mouseFiring = false;
});
tf2Canvas.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  titanfallGame.triggerTitanDefense();
});

window.addEventListener('keydown', (e) => {
  if (!isWindowVisible('win-titanfall')) return;
  if (document.activeElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;
  if (e.code === 'KeyW') titanfallGame.input.keys.w = true;
  if (e.code === 'KeyS') titanfallGame.input.keys.s = true;
  if (e.code === 'KeyA') titanfallGame.input.keys.a = true;
  if (e.code === 'KeyD') titanfallGame.input.keys.d = true;
  if (e.code === 'Space') { e.preventDefault(); titanfallGame.triggerJump(); }
  if (e.code === 'ShiftLeft' || e.code === 'KeyC') titanfallGame.triggerSlideOrCrouch();
  if (e.code === 'KeyQ' || e.code === 'KeyE') titanfallGame.triggerTactical();
  if (e.code === 'KeyV') titanfallGame.triggerTitanfall();
  if (e.code === 'KeyF') titanfallGame.triggerEmbarkOrDisembark();
  if (e.code === 'KeyG') titanfallGame.triggerTitanDefense();
  if (e.code === 'KeyZ') titanfallGame.triggerTitanCore();
  if (e.code === 'KeyX') titanfallGame.triggerNuclearEject();
  if (e.code === 'KeyR') titanfallGame.triggerReload();
});
window.addEventListener('keyup', (e) => {
  if (e.code === 'KeyW') titanfallGame.input.keys.w = false;
  if (e.code === 'KeyS') titanfallGame.input.keys.s = false;
  if (e.code === 'KeyA') titanfallGame.input.keys.a = false;
  if (e.code === 'KeyD') titanfallGame.input.keys.d = false;
});

bindTfThumbstick('tf2-stick-left', 'tf2-knob-left', (nx, ny) => {
  titanfallGame.input.stickMoveX = nx;
  titanfallGame.input.stickMoveY = ny;
});
bindTfThumbstick('tf2-stick-right', 'tf2-knob-right', (ax, ay, active) => {
  titanfallGame.input.stickAimX = ax;
  titanfallGame.input.stickAimY = ay;
  titanfallGame.input.stickAimActive = active;
});

document.getElementById('tf2-pad-jump').addEventListener('pointerdown', (e) => { e.preventDefault(); titanfallGame.triggerJump(); });
document.getElementById('tf2-pad-slide').addEventListener('pointerdown', (e) => { e.preventDefault(); titanfallGame.triggerSlideOrCrouch(); });
document.getElementById('tf2-pad-tact').addEventListener('pointerdown', (e) => { e.preventDefault(); titanfallGame.triggerTactical(); });
document.getElementById('tf2-pad-core').addEventListener('pointerdown', (e) => {
  e.preventDefault();
  if (titanfallGame.player.mode === 'titan') titanfallGame.triggerTitanCore();
  else titanfallGame.triggerTitanDefense();
});
const tf2PadTitanBtn = document.getElementById('tf2-pad-titan');
tf2PadTitanBtn.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  if (titanfallGame.player.mode === 'titan' || titanfallGame.playerTitan) {
    titanfallGame.triggerEmbarkOrDisembark();
  } else {
    titanfallGame.triggerTitanfall();
  }
});

titanfallGame.onHudUpdate = (s) => {
  document.getElementById('tf2-hud-unit').textContent = s.mode === 'titan' ? s.titanName.toUpperCase() : 'PILOT';
  document.getElementById('tf2-hud-hp').textContent = s.respawnTimer > 0
    ? `Drop ${s.respawnTimer}s`
    : (s.shieldMax > 0 ? `${s.hp} (+${s.shield})` : `${s.hp}/${s.maxHp}`);
  document.getElementById('tf2-hud-ammo').textContent = s.reloading ? 'Reload...' : `${s.ammo}/${s.maxAmmo}`;
  document.getElementById('tf2-hud-tact').textContent = s.tacticalCd === 'READY' ? 'READY' : `${s.tacticalCd}s`;
  document.getElementById('tf2-hud-meter').textContent = s.hasTitan ? 'DEPLOYED' : `${s.titanMeter}%`;
  document.getElementById('tf2-hud-core').textContent = `${s.coreCharge}%`;
  document.getElementById('tf2-hud-militia').textContent = String(s.militiaScore);
  document.getElementById('tf2-hud-imc').textContent = String(s.imcScore);
  document.getElementById('tf2-hud-bat').textContent = s.hasBattery ? 'GREEN BATTERY' : 'NONE';

  tf2ScopeRing.classList.toggle('is-hidden', !s.scoped);
  tf2Crosshair.classList.toggle('is-hit', s.hitmarker);

  // Smart Pistol / Archer dynamic HUD lock reticles
  tf2SmartLocks.innerHTML = '';
  s.smartLocks.forEach((lk) => {
    const box = document.createElement('div');
    box.className = 'tf2-lock-box';
    box.style.left = `${lk.sx.toFixed(1)}%`;
    box.style.top = `${lk.sy.toFixed(1)}%`;
    tf2SmartLocks.appendChild(box);
  });

  // Contextual Prompt & Touch Button Label
  let bannerText = '';
  if (s.evacTimer > 0) bannerText = `EVAC DROPSHIP INBOUND (${s.evacTimer}s) — REACH NORTH RIDGE!`;
  else if (s.rodeoing) bannerText = 'RODEOING ENEMY TITAN — PULLING GREEN BATTERY!';
  else if (s.wallrunning) bannerText = 'WALLRUN ENGAGED · JUMP TO WALL-KICK';
  else if (s.canEmbark) bannerText = 'TITAN READY — PRESS F OR [EMBARK]';
  else if (!s.hasTitan && s.titanMeter >= 100) bannerText = 'TITANFALL READY — PRESS V OR [TITANFALL]';
  tf2PromptBanner.textContent = bannerText;
  tf2PromptBanner.classList.toggle('is-hidden', !bannerText);

  tf2PadTitanBtn.textContent = s.mode === 'titan' ? 'EXIT' : (s.canEmbark ? 'EMBARK' : 'TITAN');

  tf2Killfeed.innerHTML = '';
  s.killfeed.forEach((k) => {
    const el = document.createElement('div');
    el.className = 'tf-kill-entry';
    el.textContent = `${k.killer} [${k.weapon}] ${k.victim}`;
    tf2Killfeed.appendChild(el);
  });
};

// Sentient Network App 1: Neural Architect Core
const saStatus = document.getElementById('sa-status');
document.getElementById('sa-btn-design').addEventListener('click', async () => {
  const prompt = document.getElementById('sa-prompt-input').value.trim();
  const btn = document.getElementById('sa-btn-design');
  btn.disabled = true;
  btn.textContent = 'Co-Designing...';
  let spec = null;
  if (prompt) {
    const res = await fetchJsonSafe('/api/gemini/sentient-game', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    }, 'Sentient Architect');
    if (res.ok && res.data?.blueprint) spec = res.data.blueprint;
  }
  if (!spec) spec = sentientNet.architect.buildLocalBlueprint(prompt);
  sentientNet.architect.applyBlueprint(spec, true);
  saStatus.textContent = `Co-Designed "${spec.title}" (${spec.titanClass.toUpperCase()}) — Broadcast across all 5 Sentient Agents & OS Games.`;
  btn.disabled = false;
  btn.textContent = 'Autonomous Co-Design';
});

// Sentient Network App 2: PBR Skin Foundry
const sfSyncInputs = () => {
  const c = sentientNet.skins.config;
  document.getElementById('sf-col-primary').value = c.primary;
  document.getElementById('sf-col-secondary').value = c.secondary;
  document.getElementById('sf-col-accent').value = c.accent;
  document.getElementById('sf-col-visor').value = c.visor;
  document.getElementById('sf-stencil-input').value = c.stencil;
  document.getElementById('sf-metal').value = c.metalness;
  document.getElementById('val-sf-metal').textContent = `${Math.round(c.metalness * 100)}%`;
  document.getElementById('sf-rough').value = c.roughness;
  document.getElementById('val-sf-rough').textContent = `${Math.round(c.roughness * 100)}%`;
  document.getElementById('sf-wear').value = c.wear;
  document.getElementById('val-sf-wear').textContent = `${Math.round(c.wear * 100)}%`;
};
document.getElementById('sf-preset-select').addEventListener('change', (e) => {
  sentientNet.skins.applyPreset(e.target.value);
  sfSyncInputs();
});
['primary', 'secondary', 'accent', 'visor'].forEach((k) => {
  document.getElementById(`sf-col-${k}`).addEventListener('input', (e) => sentientNet.skins.setConfig({ [k]: e.target.value }));
});
document.getElementById('sf-stencil-input').addEventListener('input', (e) => sentientNet.skins.setConfig({ stencil: e.target.value || 'BT-7274' }));
document.getElementById('sf-metal').addEventListener('input', (e) => {
  const v = Number(e.target.value);
  document.getElementById('val-sf-metal').textContent = `${Math.round(v * 100)}%`;
  sentientNet.skins.setConfig({ metalness: v });
});
document.getElementById('sf-rough').addEventListener('input', (e) => {
  const v = Number(e.target.value);
  document.getElementById('val-sf-rough').textContent = `${Math.round(v * 100)}%`;
  sentientNet.skins.setConfig({ roughness: v });
});
document.getElementById('sf-wear').addEventListener('input', (e) => {
  const v = Number(e.target.value);
  document.getElementById('val-sf-wear').textContent = `${Math.round(v * 100)}%`;
  sentientNet.skins.setConfig({ wear: v });
});
document.getElementById('sf-btn-push').addEventListener('click', () => {
  sentientNet.skins.pushToAllGames();
  document.getElementById('sf-status').textContent = `Pushed custom "${sentientNet.skins.config.stencil}" PBR skin maps live into Titanfall 2, TF3D & Matrix.`;
});

// Sentient Network App 3: Rig Modeler
document.getElementById('sr-titan-select').addEventListener('change', (e) => {
  sentientNet.rig.titanId = e.target.value;
  sentientNet.rig.render();
});
document.getElementById('sr-scale').addEventListener('input', (e) => {
  const v = Number(e.target.value);
  sentientNet.rig.armorScale = v;
  document.getElementById('val-sr-scale').textContent = `${v.toFixed(2)}x`;
  sentientNet.rig.render();
});
document.getElementById('sr-bore').addEventListener('input', (e) => {
  const v = Number(e.target.value);
  sentientNet.rig.weaponBore = v;
  document.getElementById('val-sr-bore').textContent = `${v.toFixed(2)}x`;
  sentientNet.rig.render();
});
document.getElementById('sr-accent').addEventListener('input', (e) => {
  sentientNet.rig.accentColor = e.target.value;
  sentientNet.rig.render();
});
document.getElementById('sr-btn-push').addEventListener('click', () => {
  sentientNet.rig.pushToCadAndGames();
  updateCadMeta();
});

// Sentient Network App 4: Physics Kernel
document.getElementById('sp-wall').addEventListener('input', (e) => {
  const v = Number(e.target.value);
  document.getElementById('val-sp-wall').textContent = `${v.toFixed(1)} u/s`;
  sentientNet.physics.applyParams({ wallSpeed: v });
});
document.getElementById('sp-slide').addEventListener('input', (e) => {
  const v = Number(e.target.value);
  document.getElementById('val-sp-slide').textContent = `${v.toFixed(1)} u/s`;
  sentientNet.physics.applyParams({ slideImpulse: v });
});
document.getElementById('sp-air').addEventListener('input', (e) => {
  const v = Number(e.target.value);
  document.getElementById('val-sp-air').textContent = v.toFixed(1);
  sentientNet.physics.applyParams({ airAccel: v });
});
document.getElementById('sp-grapple').addEventListener('input', (e) => {
  const v = Number(e.target.value);
  document.getElementById('val-sp-grapple').textContent = v.toFixed(1);
  sentientNet.physics.applyParams({ pullStrength: v });
});
document.getElementById('sp-grav').addEventListener('input', (e) => {
  const v = Number(e.target.value);
  document.getElementById('val-sp-grav').textContent = `${v} m/s²`;
  sentientNet.physics.applyParams({ gravity: v });
});

// Sentient Network App 5: Frontier AI Director
document.getElementById('sd-btn-drop-player').addEventListener('click', () => {
  sentientNet.director.grantInstantTitanfall();
  wm.open('win-titanfall');
  tf2Overlay.classList.add('is-hidden');
  syncStudioLoops();
});
document.getElementById('sd-btn-drop-imc').addEventListener('click', () => sentientNet.director.spawnEnemyTitan('ronin'));
document.getElementById('sd-btn-drop-scorch').addEventListener('click', () => sentientNet.director.spawnEnemyTitan('scorch'));

// 21. Single-Input Hyper-Awareness Matrix ("Thought Cloud") Wiring
const tcPromptInput = document.getElementById('tc-prompt-input');
const tcBtnAlter = document.getElementById('tc-btn-alter');
const tcStatus = document.getElementById('tc-status');
const tcSeedBar = document.getElementById('tc-seed-bar');

function syncUiAfterThoughtMutation() {
  sliderGravity.value = String(Math.round(engine.config.gravity));
  valGravity.textContent = `${Math.round(engine.config.gravity)} m/s²`;
  sliderSpeed.value = String(Number(engine.config.moveSpeed).toFixed(1));
  valSpeed.textContent = `${Number(engine.config.moveSpeed).toFixed(1)} u/s`;
  syncSceneUi();
  syncShaderLabUi();
  syncWorldForgeUi();
  updateCadMeta();
}

async function runThoughtCloudPrompt(promptText) {
  const prompt = String(promptText || '').trim();
  if (!prompt) {
    tcStatus.textContent = 'Enter a thought or pick a quick seed to alter all playing games live.';
    return;
  }
  tcBtnAlter.disabled = true;
  tcBtnAlter.textContent = 'Altering...';
  tcStatus.textContent = 'Reading live Hyper-Awareness Matrix & broadcasting mutation across active games...';

  const snapshot = thoughtCloud.captureAwarenessSnapshot();
  let remoteSpec = null;
  const res = await fetchJsonSafe('/api/gemini/thought-cloud', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, awareness: snapshot })
  }, 'Thought Cloud');
  if (res.ok && res.data?.mutation) {
    remoteSpec = res.data.mutation;
  }

  const applied = thoughtCloud.executeThought(prompt, remoteSpec);
  syncUiAfterThoughtMutation();
  tcStatus.textContent = `Active Reality: ${applied.title} · Grav ${applied.gravity.toFixed(1)} · Speed ${applied.speedMult.toFixed(2)}x · ROF ${applied.fireRateMult.toFixed(2)}x · Time ${applied.timeScale.toFixed(2)}x`;
  tcBtnAlter.disabled = false;
  tcBtnAlter.textContent = 'Alter Active Games';
}

THOUGHT_SEEDS.forEach((seed) => {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'tool-btn';
  btn.textContent = seed.label;
  btn.addEventListener('click', () => {
    tcPromptInput.value = seed.prompt;
    runThoughtCloudPrompt(seed.prompt);
  });
  tcSeedBar.appendChild(btn);
});

tcBtnAlter.addEventListener('click', () => runThoughtCloudPrompt(tcPromptInput.value));
tcPromptInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    runThoughtCloudPrompt(tcPromptInput.value);
  }
});

// 22. Level Forge Network (3 Connected Level-Generating Apps) Wiring
// App 1: Frontier Wallrun Sector Architect
const lfFrSeedLabel = document.getElementById('lf-fr-seed');
const lfFrStatus = document.getElementById('lf-fr-status');
document.getElementById('lf-fr-arch').addEventListener('change', (e) => {
  const layout = levelForgeNet.frontier.setParams({ archetype: e.target.value });
  lfFrStatus.textContent = `Forged blueprint: ${layout.name} (${layout.blocks.length} walls).`;
});
document.getElementById('lf-fr-btn-random').addEventListener('click', () => {
  const seed = Math.floor(1000 + Math.random() * 8999);
  const layout = levelForgeNet.frontier.setParams({ seed });
  lfFrSeedLabel.textContent = `Seed #${seed}`;
  lfFrStatus.textContent = `Generated ${layout.name} (${layout.blocks.length} blocks).`;
});
[
  ['lf-fr-density', 'val-lf-fr-dens', 'corridorDensity', 2, ''],
  ['lf-fr-vert', 'val-lf-fr-vert', 'verticality', 2, 'x'],
  ['lf-fr-pads', 'val-lf-fr-pads', 'jumpPadCount', 0, ''],
  ['lf-fr-bats', 'val-lf-fr-bats', 'batteryCount', 0, '']
].forEach(([id, valId, key, dec, suf]) => {
  document.getElementById(id).addEventListener('input', (e) => {
    const v = Number(e.target.value);
    document.getElementById(valId).textContent = `${v.toFixed(dec)}${suf}`;
    levelForgeNet.frontier.setParams({ [key]: v });
  });
});
document.getElementById('lf-fr-btn-deploy').addEventListener('click', () => {
  const layout = levelForgeNet.frontier.deployToTitanfall();
  lfFrStatus.textContent = `Deployed live to Titanfall 2: ${layout.name}!`;
  wm.open('win-titanfall');
  tf2Overlay.classList.add('is-hidden');
  syncStudioLoops();
});

// App 2: Fortress Symmetric Map Builder
const lfTfSeedLabel = document.getElementById('lf-tf-seed');
const lfTfStatus = document.getElementById('lf-tf-status');
document.getElementById('lf-tf-arch').addEventListener('change', (e) => {
  const layout = levelForgeNet.fortress.setParams({ archetype: e.target.value });
  lfTfStatus.textContent = `Forged symmetric layout: ${layout.name}.`;
});
document.getElementById('lf-tf-btn-random').addEventListener('click', () => {
  const seed = Math.floor(1000 + Math.random() * 8999);
  const layout = levelForgeNet.fortress.setParams({ seed });
  lfTfSeedLabel.textContent = `Seed #${seed}`;
  lfTfStatus.textContent = `Generated ${layout.name} (${layout.blocks.length} symmetric structures).`;
});
[
  ['lf-tf-cover', 'val-lf-tf-cov', 'symmetryCover', 2, ''],
  ['lf-tf-elev', 'val-lf-tf-elev', 'elevation', 2, 'x'],
  ['lf-tf-pads', 'val-lf-tf-pads', 'jumpPadCount', 0, '']
].forEach(([id, valId, key, dec, suf]) => {
  document.getElementById(id).addEventListener('input', (e) => {
    const v = Number(e.target.value);
    document.getElementById(valId).textContent = `${v.toFixed(dec)}${suf}`;
    levelForgeNet.fortress.setParams({ [key]: v });
  });
});
const tfOverlayMenuEl = document.getElementById('tf-overlay-menu');
document.getElementById('lf-tf-btn-deploy').addEventListener('click', () => {
  const layout = levelForgeNet.fortress.deployToFortress();
  lfTfStatus.textContent = `Deployed live to Team Fortress 3D: ${layout.name}!`;
  wm.open('win-fortress');
  if (tfOverlayMenuEl) tfOverlayMenuEl.classList.add('is-hidden');
  syncStudioLoops();
});

// App 3: Cross-Biome Level Synthesizer
const lfBmSelect = document.getElementById('lf-bm-select');
const lfBmStatus = document.getElementById('lf-bm-status');
lfBmSelect.addEventListener('change', (e) => {
  levelForgeNet.biome.selectedBiome = e.target.value;
  levelForgeNet.biome.render();
});
document.getElementById('lf-bm-chaos').addEventListener('input', (e) => {
  const v = Number(e.target.value);
  document.getElementById('val-lf-bm-chaos').textContent = v.toFixed(2);
  levelForgeNet.biome.chaosFactor = v;
});
document.getElementById('lf-bm-btn-sync').addEventListener('click', () => {
  const summary = levelForgeNet.biome.synthesizeAll(lfBmSelect.value);
  lfBmStatus.textContent = summary;
  lfFrSeedLabel.textContent = `Seed #${levelForgeNet.frontier.params.seed}`;
  lfTfSeedLabel.textContent = `Seed #${levelForgeNet.fortress.params.seed}`;
  syncSceneUi();
  syncWorldForgeUi();
  updateCadMeta();
});

syncOverlays();
requestAnimationFrame(tick);
