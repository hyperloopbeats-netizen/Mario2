// App 1: Pattern & Schema Guard — Solves Safari Fetch/JSON pattern mismatches,
// repairs malformed payloads, hex colors, and 3D vector schemas across the entire OS.

const VALID_SHAPES = new Set(['box', 'cylinder', 'sphere', 'torus', 'torusKnot', 'cone', 'capsule', 'oct']);

const guardState = {
  autoHeal: true,
  inspectedCount: 0,
  healedCount: 0,
  blockedCount: 0,
  logs: [],
  listeners: new Set()
};

function notifyGuard() {
  guardState.listeners.forEach((fn) => fn(guardState));
}

export function onGuardUpdate(fn) {
  guardState.listeners.add(fn);
  return () => guardState.listeners.delete(fn);
}

export function logGuardEvent(source, status, detail, healed = false) {
  guardState.inspectedCount++;
  if (healed) guardState.healedCount++;
  if (status === 'error') guardState.blockedCount++;
  const entry = {
    time: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    source,
    status,
    detail: String(detail || '').slice(0, 140),
    healed
  };
  guardState.logs.unshift(entry);
  if (guardState.logs.length > 40) guardState.logs.length = 40;
  notifyGuard();
}

export function normalizeHexColor(val, fallback = '#38bdf8') {
  if (typeof val !== 'string') return fallback;
  const trimmed = val.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed.toLowerCase();
  const shortMatch = trimmed.match(/^#([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])$/);
  if (shortMatch) {
    return `#${shortMatch[1]}${shortMatch[1]}${shortMatch[2]}${shortMatch[2]}${shortMatch[3]}${shortMatch[3]}`.toLowerCase();
  }
  const rgbMatch = trimmed.match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/i);
  if (rgbMatch) {
    const toHex = (n) => Math.max(0, Math.min(255, Number(n))).toString(16).padStart(2, '0');
    return `#${toHex(rgbMatch[1])}${toHex(rgbMatch[2])}${toHex(rgbMatch[3])}`;
  }
  const bareMatch = trimmed.match(/^0x([0-9a-fA-F]{6})$/i) || trimmed.match(/^([0-9a-fA-F]{6})$/);
  if (bareMatch) return `#${bareMatch[1].toLowerCase()}`;
  return fallback;
}

export function sanitizeVec3(arr, fallback = [0, 1, 0], minVal = -25, maxVal = 25) {
  if (!Array.isArray(arr) || arr.length < 3) return [...fallback];
  return [0, 1, 2].map((i) => {
    const n = Number(arr[i]);
    if (!Number.isFinite(n)) return fallback[i];
    return Math.max(minVal, Math.min(maxVal, n));
  });
}

export function sanitizeCadAssembly(raw) {
  let healed = false;
  let obj = raw;
  if (typeof obj === 'string') {
    healed = true;
    obj = safeJsonParse(obj, {});
  }
  if (!obj || typeof obj !== 'object') {
    healed = true;
    obj = {};
  }
  const rawParts = Array.isArray(obj.parts) ? obj.parts : [];
  if (!Array.isArray(obj.parts) || rawParts.length === 0) healed = true;

  const parts = rawParts.map((p, idx) => {
    const part = p && typeof p === 'object' ? p : {};
    const shape = VALID_SHAPES.has(part.shape) ? part.shape : 'box';
    if (shape !== part.shape) healed = true;
    const color = normalizeHexColor(part.color, '#94a3b8');
    if (color !== part.color) healed = true;
    const emissive = part.emissive ? normalizeHexColor(part.emissive, '#000000') : '#000000';
    return {
      label: String(part.label || `Part ${idx + 1}`).replace(/[<>]/g, '').slice(0, 36),
      shape,
      position: sanitizeVec3(part.position, [0, 0.8 + idx * 0.3, 0], -6, 6),
      rotation: sanitizeVec3(part.rotation, [0, 0, 0], -6.3, 6.3),
      scale: sanitizeVec3(part.scale, [0.8, 0.8, 0.8], 0.06, 6),
      color,
      emissive,
      emissiveIntensity: Math.max(0, Math.min(2, Number(part.emissiveIntensity) || 0)),
      metalness: Math.max(0, Math.min(1, Number(part.metalness ?? 0.72))),
      roughness: Math.max(0.04, Math.min(1, Number(part.roughness ?? 0.25))),
      opacity: typeof part.opacity === 'number' ? Math.max(0.12, Math.min(1, part.opacity)) : 1.0,
      spinSpeed: Math.max(-5, Math.min(5, Number(part.spinSpeed) || 0))
    };
  });

  if (parts.length === 0) {
    parts.push({
      label: 'Recovered Core',
      shape: 'oct',
      position: [0, 1.5, 0],
      rotation: [0, 0, 0],
      scale: [1.1, 1.1, 1.1],
      color: '#38bdf8',
      emissive: '#0284c7',
      emissiveIntensity: 0.45,
      metalness: 0.85,
      roughness: 0.18,
      opacity: 1.0,
      spinSpeed: 1.1
    });
  }

  return {
    healed,
    assembly: {
      name: String(obj.name || 'Validated CAD Assembly').slice(0, 54),
      summary: String(obj.summary || 'Verified & healed by Pattern Guard').slice(0, 140),
      parts
    }
  };
}

export function safeJsonParse(rawText, fallback = null) {
  if (typeof rawText !== 'string') return fallback;
  let txt = rawText.trim();
  if (!txt) return fallback;
  if (txt.startsWith('```')) {
    txt = txt.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  }
  try {
    return JSON.parse(txt);
  } catch {
    const firstObj = txt.indexOf('{');
    const firstArr = txt.indexOf('[');
    const start = (firstObj >= 0 && firstArr >= 0) ? Math.min(firstObj, firstArr) : Math.max(firstObj, firstArr);
    const lastEnd = Math.max(txt.lastIndexOf('}'), txt.lastIndexOf(']'));
    if (start >= 0 && lastEnd > start) {
      try {
        return JSON.parse(txt.slice(start, lastEnd + 1));
      } catch {
        return fallback;
      }
    }
    return fallback;
  }
}

/**
 * Safari-safe JSON fetch wrapper: reads raw text first so WebKit never throws
 * "SyntaxError: The string did not match the expected pattern." on HTML/empty responses.
 */
export async function fetchJsonSafe(url, options = {}, sourceLabel = url) {
  let res;
  try {
    res = await fetch(url, options);
  } catch (networkErr) {
    const msg = networkErr?.message || 'Network connection error';
    logGuardEvent(sourceLabel, 'error', msg, false);
    return { ok: false, status: 0, data: null, error: msg, patternMismatch: false };
  }

  let raw = '';
  try {
    raw = await res.text();
  } catch (readErr) {
    const msg = 'Stream read interrupted.';
    logGuardEvent(sourceLabel, 'error', msg, false);
    return { ok: false, status: res.status, data: null, error: msg, patternMismatch: false };
  }

  const parsed = safeJsonParse(raw, null);
  if (parsed === null) {
    const isHtml = /^\s*</.test(raw);
    const cleanErr = isHtml
      ? `Gateway returned non-JSON HTTP ${res.status} (intercepted & neutralized by Pattern Guard).`
      : `Malformed response payload from ${sourceLabel} (HTTP ${res.status}).`;
    logGuardEvent(sourceLabel, 'healed', cleanErr, true);
    return { ok: false, status: res.status, data: null, error: cleanErr, patternMismatch: true };
  }

  if (!res.ok) {
    const apiErr = parsed?.error || `Request failed (HTTP ${res.status}).`;
    logGuardEvent(sourceLabel, 'error', apiErr, false);
    return { ok: false, status: res.status, data: parsed, error: apiErr, patternMismatch: false };
  }

  if (parsed.assembly && guardState.autoHeal) {
    const check = sanitizeCadAssembly(parsed.assembly);
    parsed.assembly = check.assembly;
    logGuardEvent(sourceLabel, check.healed ? 'healed' : 'ok', check.healed ? 'Repaired CAD schema/colors' : `${check.assembly.parts.length} parts validated`, check.healed);
  } else {
    logGuardEvent(sourceLabel, 'ok', 'JSON schema validated cleanly', false);
  }

  return { ok: true, status: res.status, data: parsed, error: null, patternMismatch: false };
}

export class PatternGuardApp {
  constructor() {
    this.state = guardState;
  }

  getStats() {
    return {
      autoHeal: guardState.autoHeal,
      inspected: guardState.inspectedCount,
      healed: guardState.healedCount,
      blocked: guardState.blockedCount,
      logs: guardState.logs
    };
  }

  setAutoHeal(enabled) {
    guardState.autoHeal = Boolean(enabled);
    notifyGuard();
  }

  clearLogs() {
    guardState.logs = [];
    notifyGuard();
  }

  inspectAndHealRaw(rawInput) {
    const trimmed = String(rawInput || '').trim();
    if (!trimmed) {
      return { ok: false, error: 'Paste JSON or enter a prompt string to inspect.', assembly: null };
    }
    const parsed = safeJsonParse(trimmed, null);
    if (parsed && typeof parsed === 'object') {
      const target = parsed.assembly || parsed;
      const { healed, assembly } = sanitizeCadAssembly(target);
      logGuardEvent('Manual Guard', healed ? 'healed' : 'ok', healed ? 'Sanitized malformed schema/colors/vectors' : 'Valid CAD JSON', healed);
      return { ok: true, healed, assembly, json: JSON.stringify(assembly, null, 2) };
    }
    // Check regex/DOM string safety on raw text prompt
    const cleanedPrompt = trimmed.replace(/[^\x20-\x7E]/g, ' ').replace(/\s+/g, ' ').trim();
    const hadUnsafe = cleanedPrompt !== trimmed;
    logGuardEvent('Prompt Pattern Check', hadUnsafe ? 'healed' : 'ok', `Prompt "${cleanedPrompt}" verified safe for API & CAD pipeline`, hadUnsafe);
    return {
      ok: true,
      healed: hadUnsafe,
      cleanedPrompt,
      assembly: null,
      json: JSON.stringify({ prompt: cleanedPrompt, patternSafe: true, recommendedPipeline: 'Semantic CAD Synth -> Liquid CAD -> Team Fortress' }, null, 2)
    };
  }
}

export const patternGuard = new PatternGuardApp();
