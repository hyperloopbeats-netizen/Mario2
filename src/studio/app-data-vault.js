// App 4: Unified Data Vault — Central CRUD data manager & persistent snapshot store
// connecting CAD Assemblies, Fortress Match Stats, World Seeds, Shader Profiles & Multiplied Batches.

import { safeJsonParse, logGuardEvent } from './app-pattern-guard.js';

const STORAGE_KEY = 'black_liquid_os_vault_v1';

export class DataVaultApp {
  constructor() {
    this.records = [];
    this.selectedId = null;
    this.listeners = new Set();
    this.loadFromStorage();
  }

  onChange(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  emit() {
    this.persistToStorage();
    this.listeners.forEach((fn) => fn(this.records));
  }

  loadFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = safeJsonParse(raw, null);
      if (Array.isArray(parsed) && parsed.length > 0) {
        this.records = parsed;
        this.selectedId = this.records[0].id;
        return;
      }
    } catch {
      // Storage blocked or unavailable
    }

    // Initial curated system records
    this.records = [
      {
        id: 'vault-tf-default',
        category: 'fortress_loadout',
        name: 'TF Standard KOTH Preset',
        updatedAt: new Date().toISOString(),
        payload: { mode: 'koth', preferredClass: 'soldier', skin: 'black_liquid', botsPerTeam: 4, hpMult: 1.0 }
      },
      {
        id: 'vault-cad-k9',
        category: 'cad_assembly',
        name: 'Seed Vault: Cyber-Hound Spec',
        updatedAt: new Date().toISOString(),
        payload: { prompt: 'Dog', archetype: 'dog', scaleGlobal: 1.0 }
      }
    ];
    this.selectedId = this.records[0].id;
  }

  persistToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.records.slice(0, 60)));
    } catch {
      // Ignore quota or private mode storage restrictions
    }
  }

  addRecord(category, name, payload) {
    const rec = {
      id: `rec_${Date.now()}_${Math.floor(Math.random() * 999)}`,
      category: String(category || 'custom'),
      name: String(name || 'Untitled Snapshot').slice(0, 54),
      updatedAt: new Date().toISOString(),
      payload: payload && typeof payload === 'object' ? JSON.parse(JSON.stringify(payload)) : { value: payload }
    };
    this.records.unshift(rec);
    this.selectedId = rec.id;
    this.emit();
    logGuardEvent('Data Vault', 'ok', `Saved [${rec.category}] ${rec.name}`, false);
    return rec;
  }

  updateRecordJson(id, rawJson) {
    const rec = this.records.find((r) => r.id === id);
    if (!rec) return { ok: false, error: 'Select a record first.' };
    const parsed = safeJsonParse(rawJson, null);
    if (!parsed || typeof parsed !== 'object') {
      logGuardEvent('Data Vault', 'error', 'Invalid JSON edit blocked by Vault', false);
      return { ok: false, error: 'Invalid JSON syntax — edit blocked cleanly.' };
    }
    rec.payload = parsed;
    rec.updatedAt = new Date().toISOString();
    this.emit();
    logGuardEvent('Data Vault', 'ok', `Updated ${rec.name}`, false);
    return { ok: true, record: rec };
  }

  cloneRecord(id, multiplyTag = 'Copy') {
    const rec = this.records.find((r) => r.id === id);
    if (!rec) return null;
    return this.addRecord(rec.category, `${rec.name} (${multiplyTag})`, rec.payload);
  }

  deleteRecord(id) {
    const idx = this.records.findIndex((r) => r.id === id);
    if (idx === -1) return false;
    this.records.splice(idx, 1);
    this.selectedId = this.records[0]?.id || null;
    this.emit();
    return true;
  }

  getById(id) {
    return this.records.find((r) => r.id === id) || null;
  }

  filterRecords(category = 'all', query = '') {
    const q = String(query || '').trim().toLowerCase();
    return this.records.filter((r) => {
      if (category !== 'all' && r.category !== category) return false;
      if (!q) return true;
      return r.name.toLowerCase().includes(q) || r.category.toLowerCase().includes(q);
    });
  }

  exportAllJson() {
    return JSON.stringify({
      exportedAt: new Date().toISOString(),
      recordCount: this.records.length,
      records: this.records
    }, null, 2);
  }
}

export const dataVault = new DataVaultApp();
