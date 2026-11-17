// Black Liquid OS — Draggable, Minimizable, Maximizable Window Manager
export class WindowManager {
  constructor() {
    this.zCounter = 30;
    this.windows = new Map();
    this.activeDrag = null;
    this.onWindowFocus = null;
    this.onLayoutChange = null;

    window.addEventListener('pointermove', (e) => this.handlePointerMove(e));
    window.addEventListener('pointerup', () => this.handlePointerUp());
  }

  register(id, title) {
    const el = document.getElementById(id);
    if (!el) return;
    this.windows.set(id, { id, title, el, maximized: false, minimized: false });

    el.addEventListener('pointerdown', () => this.focus(id));

    const header = el.querySelector('.os-win-header');
    if (header) {
      header.addEventListener('pointerdown', (e) => {
        if (e.target.closest('button, select, input, a')) return;
        const win = this.windows.get(id);
        if (!win || win.maximized) return;
        this.focus(id);
        const rect = el.getBoundingClientRect();
        this.activeDrag = {
          el,
          offsetX: e.clientX - rect.left,
          offsetY: e.clientY - rect.top
        };
        el.classList.add('is-dragging');
      });
    }

    const btnMin = el.querySelector('[data-win-action="minimize"]');
    const btnMax = el.querySelector('[data-win-action="maximize"]');
    const btnClose = el.querySelector('[data-win-action="close"]');

    if (btnMin) btnMin.addEventListener('click', () => this.minimize(id));
    if (btnMax) btnMax.addEventListener('click', () => this.toggleMaximize(id));
    if (btnClose) btnClose.addEventListener('click', () => this.close(id));
  }

  handlePointerMove(e) {
    if (!this.activeDrag) return;
    const { el, offsetX, offsetY } = this.activeDrag;
    const maxX = Math.max(0, window.innerWidth - 120);
    const maxY = Math.max(44, window.innerHeight - 100);
    const left = Math.max(8, Math.min(maxX, e.clientX - offsetX));
    const top = Math.max(48, Math.min(maxY, e.clientY - offsetY));
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
  }

  handlePointerUp() {
    if (!this.activeDrag) return;
    this.activeDrag.el.classList.remove('is-dragging');
    this.activeDrag = null;
  }

  isMobileViewport() {
    return window.innerWidth <= 820;
  }

  focus(id) {
    const win = this.windows.get(id);
    if (!win) return;
    if (this.isMobileViewport()) {
      for (const [otherId, otherWin] of this.windows.entries()) {
        if (otherId !== id && !otherWin.el.classList.contains('is-hidden')) {
          otherWin.minimized = true;
          otherWin.el.classList.add('is-minimized');
        }
      }
    }
    this.zCounter++;
    win.el.style.zIndex = String(this.zCounter);
    if (this.onWindowFocus) this.onWindowFocus(win.title);
    this.syncDockIndicators();
  }

  open(id) {
    const win = this.windows.get(id);
    if (!win) return;
    win.minimized = false;
    win.el.classList.remove('is-hidden', 'is-minimized');
    this.focus(id);
    if (this.onLayoutChange) this.onLayoutChange(id);
  }

  minimize(id) {
    const win = this.windows.get(id);
    if (!win) return;
    win.minimized = true;
    win.el.classList.add('is-minimized');
    this.syncDockIndicators();
  }

  close(id) {
    const win = this.windows.get(id);
    if (!win) return;
    win.minimized = false;
    win.el.classList.add('is-hidden');
    this.syncDockIndicators();
  }

  toggleDock(id) {
    const win = this.windows.get(id);
    if (!win) return;
    const isHidden = win.el.classList.contains('is-hidden') || win.minimized;
    if (isHidden) {
      this.open(id);
    } else if (Number(win.el.style.zIndex || 0) === this.zCounter) {
      if (!this.isMobileViewport()) {
        this.minimize(id);
      }
    } else {
      this.focus(id);
    }
  }

  toggleMaximize(id) {
    const win = this.windows.get(id);
    if (!win) return;
    win.maximized = !win.maximized;
    win.el.classList.toggle('is-maximized', win.maximized);
    this.focus(id);
    if (this.onLayoutChange) {
      window.setTimeout(() => this.onLayoutChange(id), 40);
    }
  }

  syncDockIndicators() {
    let topId = null;
    let topZ = -1;
    for (const [id, win] of this.windows.entries()) {
      const isOpen = !win.el.classList.contains('is-hidden') && !win.minimized;
      const z = Number(win.el.style.zIndex || 0);
      if (isOpen && z >= topZ) {
        topZ = z;
        topId = id;
      }
    }
    for (const [id, win] of this.windows.entries()) {
      const dockBtn = document.querySelector(`[data-dock-target="${id}"]`);
      if (!dockBtn) continue;
      const isOpen = !win.el.classList.contains('is-hidden') && !win.minimized;
      dockBtn.classList.toggle('is-open', isOpen && (this.isMobileViewport() ? id === topId : true));
      dockBtn.classList.toggle('is-focused', id === topId);
    }
  }
}
