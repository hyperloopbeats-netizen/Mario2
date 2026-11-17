// App 5: Pipeline & Telemetry Router — Connects all OS subsystems (Pattern Guard,
// Semantic Synth, Data Multiplier, Data Vault, CAD, Triad, Matrix, Video, Mario, Team Fortress).

import { daemonSupervisor } from './daemons.js';
import { logGuardEvent } from './app-pattern-guard.js';

export class PipelineRouterApp {
  constructor(canvas, systems = {}) {
    this.canvas = canvas;
    this.ctx = canvas ? canvas.getContext('2d') : null;
    this.systems = systems;

    this.routes = {
      guardAutoHeal: true,
      cadToFortressMonument: true,
      shaderToFortressArena: true,
      sonicToCombatTempo: true,
      multiplierToSquads: true,
      worldForgeToGravity: true
    };

    this.totalSyncs = 0;
    this.pulsePhase = 0;
  }

  attachSystems(systems) {
    Object.assign(this.systems, systems);
  }

  toggleRoute(key, val) {
    if (key in this.routes) {
      this.routes[key] = Boolean(val);
    }
  }

  broadcastFullSync() {
    const {
      cadApp,
      matrixEngine,
      shaderLabApp,
      sonicApp,
      worldForgeApp,
      dataMultiplier,
      dataVault,
      fortressGame
    } = this.systems;

    // 1. CAD -> Matrix & Team Fortress Monument
    if (this.routes.cadToFortressMonument && cadApp?.currentAssembly) {
      if (matrixEngine) matrixEngine.setCadAssembly(cadApp.currentAssembly);
      if (fortressGame) fortressGame.setCenterMonument(cadApp.currentAssembly);
    }

    // 2. Shader Lab -> PBR ShaderBridge + Fortress Lighting/Materials
    if (this.routes.shaderToFortressArena && shaderLabApp?.profile) {
      daemonSupervisor.updateShaderBridge(shaderLabApp.profile);
      if (fortressGame) fortressGame.syncFromOS();
    }

    // 3. Sonic Synth -> AudioBeatSync + Fireball/Projectile colors
    if (this.routes.sonicToCombatTempo && sonicApp?.score) {
      daemonSupervisor.pulseBeat(0.9, sonicApp.score.fireColor);
    }

    // 4. Data Multiplier -> Team Fortress squads & HP/DMG scaling
    if (this.routes.multiplierToSquads && dataMultiplier) {
      dataMultiplier.applyToFortress();
    }

    // 5. World Forge -> TF Gravity & Fog
    if (this.routes.worldForgeToGravity && worldForgeApp?.params && fortressGame) {
      fortressGame.syncFromOS();
    }

    // 6. Snapshot state summary in Data Vault
    if (dataVault) {
      dataVault.addRecord('pipeline_sync', `OS Broadcast #${this.totalSyncs + 1}`, {
        cadName: cadApp?.currentAssembly?.name || 'None',
        shaderName: shaderLabApp?.profile?.name || 'Default',
        sonicTempo: sonicApp?.score?.tempo || 150,
        multiplierFactor: dataMultiplier?.config?.factor || 4,
        fortressMode: fortressGame?.mode || 'koth',
        daemonsActive: daemonSupervisor.getList().filter((d) => d.enabled).length
      });
    }

    this.totalSyncs++;
    logGuardEvent('Pipeline Router', 'ok', `Synced all OS pipelines & Team Fortress (#${this.totalSyncs})`, false);
    this.renderVisualizer();
  }

  renderVisualizer(dt = 0.016) {
    if (!this.ctx || !this.canvas) return;
    this.pulsePhase += dt * 2.2;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.fillStyle = '#03050a';
    ctx.fillRect(0, 0, w, h);

    const nodes = [
      { label: 'Pattern Guard', x: 0.16, y: 0.25, on: this.routes.guardAutoHeal, color: '#22c55e' },
      { label: 'Semantic CAD', x: 0.16, y: 0.52, on: this.routes.cadToFortressMonument, color: '#38bdf8' },
      { label: 'Data Multiplier', x: 0.16, y: 0.78, on: this.routes.multiplierToSquads, color: '#f59e0b' },
      { label: 'Shader + Sonic', x: 0.5, y: 0.28, on: this.routes.shaderToFortressArena, color: '#a855f7' },
      { label: 'Data Vault', x: 0.5, y: 0.72, on: true, color: '#e2e8f0' },
      { label: 'Team Fortress 3D', x: 0.84, y: 0.5, on: true, color: '#ef4444' }
    ];

    const edges = [
      [0, 3], [0, 4], [1, 3], [1, 5], [2, 4], [2, 5], [3, 5], [4, 5]
    ];

    edges.forEach(([aIdx, bIdx], idx) => {
      const a = nodes[aIdx];
      const b = nodes[bIdx];
      const active = a.on && b.on;
      ctx.strokeStyle = active ? 'rgba(56, 189, 248, 0.35)' : 'rgba(148, 163, 184, 0.12)';
      ctx.lineWidth = active ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(a.x * w, a.y * h);
      ctx.lineTo(b.x * w, b.y * h);
      ctx.stroke();

      if (active) {
        const u = ((this.pulsePhase * 0.4 + idx * 0.17) % 1);
        const px = (a.x + (b.x - a.x) * u) * w;
        const py = (a.y + (b.y - a.y) * u) * h;
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(px, py, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    nodes.forEach((n) => {
      const nx = n.x * w;
      const ny = n.y * h;
      ctx.fillStyle = '#090e18';
      ctx.strokeStyle = n.on ? n.color : '#475569';
      ctx.lineWidth = 2;
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(nx - 66, ny - 22, 132, 44, 8);
      } else {
        ctx.rect(nx - 66, ny - 22, 132, 44);
      }
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = n.on ? '#f8fafc' : '#64748b';
      ctx.font = '600 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(n.label, nx, ny + 4);
    });
  }
}
