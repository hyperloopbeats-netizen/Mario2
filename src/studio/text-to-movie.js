import { CAD_PRESETS, MOVIE_PRESETS } from './cad-presets.js';
import { daemonSupervisor } from './daemons.js';
import { hybridMovement } from './hybrid-movement.js';
import { SCENE_BIOMES, hybridScene } from './hybrid-scene.js';

export const TEXT2MOVIE_RECIPES = {
  cyber_foundry: {
    title: 'Obsidian Reactor Genesis',
    tagline: 'Precision CAD turbine core illuminated by Solar Foundry twilight.',
    directorNotes: 'Opens on an orbital push over the turbine centerpiece, transitions to hero gantry tracking, and climbs cleanly into a wide architectural crane.',
    movement: { mode: 'figure_eight', stiffness: 120, damping: 16, smoothness: 0.85, pathRadius: 3.6, gaitSpeed: 0.95, easeCurve: 'quintic' },
    scene: { biome: 'solar_foundry', ...SCENE_BIOMES.solar_foundry, sunScale: 1.15 },
    cadAssembly: CAD_PRESETS.hyperloop_turbine,
    shots: MOVIE_PRESETS.black_glass_promo.shots
  },
  mario_odyssey: {
    title: 'Super Mario Kinetic Odyssey',
    tagline: 'Spline-stabilized 3D hero movement across the Production Matrix.',
    directorNotes: 'Combines parkour figure-8 locomotion, Mario Exo-Frame MK IV rig, and smooth Catmull-Rom hero tracking.',
    movement: { mode: 'parkour_patrol', stiffness: 140, damping: 18, smoothness: 0.9, pathRadius: 4.0, gaitSpeed: 1.15, easeCurve: 'spring' },
    scene: { biome: 'mushroom_twilight', ...SCENE_BIOMES.mushroom_twilight, sunScale: 1.0 },
    cadAssembly: CAD_PRESETS.kinetic_mech_frame,
    shots: MOVIE_PRESETS.mario_odyssey.shots
  },
  arctic_monolith: {
    title: 'Arctic Black Glass Monolith',
    tagline: 'Minimalist refractive obsidian geometry in zero-gravity orbital drift.',
    directorNotes: 'Zero-G floating cadence paired with crisp Arctic Glass directional key lighting and wide sweep rails.',
    movement: { mode: 'zero_g', stiffness: 90, damping: 14, smoothness: 0.92, pathRadius: 2.8, gaitSpeed: 0.75, easeCurve: 'cubic' },
    scene: { biome: 'arctic_glass', ...SCENE_BIOMES.arctic_glass, sunScale: 0.9 },
    cadAssembly: CAD_PRESETS.black_glass_monolith,
    shots: [
      { label: 'Shot 1 · Monolith Awaken', duration: 3, headline: 'BLACK GLASS MONOLITH', subline: 'Orbital zero-gravity architectural study', camera: 'dolly', keyColor: '#ffffff', rimColor: '#bae6fd', cadSpinBoost: 0.8, enableCad: true, enableSun: true, enableMario: false, enableGrid: true, enablePromo: true },
      { label: 'Shot 2 · Harmonic Orbit', duration: 3, headline: 'SILENT SYMMETRY', subline: 'Catmull-Rom stabilized optical sweep', camera: 'orbit', keyColor: '#e0f2fe', rimColor: '#38bdf8', cadSpinBoost: 1.3, enableCad: true, enableSun: true, enableMario: true, enableGrid: true, enablePromo: true },
      { label: 'Shot 3 · Hero Scale', duration: 3, headline: 'PRECISION MOTION', subline: 'Damped spring kinematics across all layers', camera: 'hero', keyColor: '#ffffff', rimColor: '#93c5fd', cadSpinBoost: 1.0, enableCad: true, enableSun: false, enableMario: true, enableGrid: true, enablePromo: false },
      { label: 'Shot 4 · Horizon Crane', duration: 3, headline: 'FULL HD PRODUCTION', subline: 'Exported at locked frame timing', camera: 'crane', keyColor: '#e0f2fe', rimColor: '#0284c7', cadSpinBoost: 1.1, enableCad: true, enableSun: true, enableMario: true, enableGrid: true, enablePromo: true }
    ]
  }
};

/**
 * Single-Prompt Text-to-Movie Window Controller
 * Links directly to BlackGlassVideoApp, HybridMovement, HybridScene, LiquidCAD, and Daemons,
 * and generates 4 exportable files (.webm 1080p video, .png 1080p still, .json bundle, .txt script).
 */
export class TextToMovieApp {
  constructor(previewCanvas, videoApp, matrixEngine, cadApp) {
    this.canvas = previewCanvas;
    this.ctx = previewCanvas.getContext('2d');
    this.videoApp = videoApp;
    this.matrix = matrixEngine;
    this.cadApp = cadApp;

    this.currentPackage = JSON.parse(JSON.stringify(TEXT2MOVIE_RECIPES.cyber_foundry));
    this.urls = {
      sceneJson: null,
      scriptTxt: null,
      posterPng: null
    };
  }

  applyPackage(pkg) {
    if (!pkg || !Array.isArray(pkg.shots) || pkg.shots.length === 0) return;
    this.currentPackage = pkg;
    if (pkg.movement) hybridMovement.applyConfig(pkg.movement);
    if (pkg.scene) hybridScene.applyConfig(pkg.scene);
    if (pkg.cadAssembly && this.cadApp) {
      this.cadApp.setAssembly(pkg.cadAssembly);
    }
    this.videoApp.setMovie(pkg);
    this.videoApp.playing = true;
    this.generateTextAndJsonExports();
  }

  renderPreview() {
    if (!this.canvas || !this.videoApp.canvas) return;
    if (this.canvas.width !== 1280 || this.canvas.height !== 720) {
      this.canvas.width = 1280;
      this.canvas.height = 720;
    }
    this.ctx.drawImage(this.videoApp.canvas, 0, 0, this.canvas.width, this.canvas.height);
  }

  capturePosterPng() {
    this.videoApp.composeFrame(1 / 30, true, 30);
    const dataUrl = this.videoApp.canvas.toDataURL('image/png');
    this.videoApp.composeFrame(0.001, false, 30);
    this.renderPreview();
    return dataUrl;
  }

  generateTextAndJsonExports() {
    const pkg = this.currentPackage;
    const bundle = {
      exportedAt: new Date().toISOString(),
      title: pkg.title,
      tagline: pkg.tagline,
      directorNotes: pkg.directorNotes || '',
      daemons: daemonSupervisor.getList().map((d) => ({ id: d.id, name: d.name, enabled: d.enabled })),
      shaderProfile: { ...daemonSupervisor.daemons.shaderBridge.state },
      movement: { ...hybridMovement.config },
      scene: { ...hybridScene.config },
      cadAssembly: pkg.cadAssembly || this.cadApp?.currentAssembly,
      shots: pkg.shots
    };

    if (this.urls.sceneJson) URL.revokeObjectURL(this.urls.sceneJson);
    const jsonBlob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    this.urls.sceneJson = URL.createObjectURL(jsonBlob);

    let timeAcc = 0;
    const lines = [
      `TITLE: ${pkg.title}`,
      `TAGLINE: ${pkg.tagline}`,
      `MOVEMENT PROFILE: ${hybridMovement.config.mode} (stiffness=${hybridMovement.config.stiffness}, damping=${hybridMovement.config.damping}, radius=${hybridMovement.config.pathRadius})`,
      `SCENE BIOME: ${hybridScene.config.biome} (fog=${hybridScene.config.fogDensity}, key=${hybridScene.config.keyColor}, rim=${hybridScene.config.rimColor})`,
      `DIRECTOR NOTES: ${pkg.directorNotes || 'Unified Black Glass OS production.'}`,
      '',
      'SHOTLIST:',
      ...pkg.shots.map((s, idx) => {
        const start = timeAcc.toFixed(1);
        timeAcc += Number(s.duration) || 3;
        const end = timeAcc.toFixed(1);
        return `${idx + 1}. [${start}s - ${end}s] ${s.label} | Camera: ${s.camera} | "${s.headline}" — ${s.subline}`;
      })
    ];

    if (this.urls.scriptTxt) URL.revokeObjectURL(this.urls.scriptTxt);
    const txtBlob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    this.urls.scriptTxt = URL.createObjectURL(txtBlob);

    return { jsonUrl: this.urls.sceneJson, scriptUrl: this.urls.scriptTxt };
  }
}
