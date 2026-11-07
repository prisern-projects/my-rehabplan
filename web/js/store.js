// Local persistence. Everything lives in this phone's browser storage.
import { EXERCISES } from './exercises.js';

const KEY = 'rehab-app-v1';

const DEFAULT_SETTINGS = {
  sound: true,
  vibrate: true,
  voice: true,
  getReady: 3,      // seconds of "get ready" countdown before timed sets
  restTimer: true,  // rest countdown between sets
  exerciseRest: 30, // seconds of rest after finishing an exercise (0 = off)
  keepAwake: true,
};

function blank() {
  return { settings: { ...DEFAULT_SETTINGS }, overrides: {}, history: [], current: null, lastReps: {} };
}

let data = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return blank();
    const d = JSON.parse(raw);
    return {
      ...blank(),
      ...d,
      settings: { ...DEFAULT_SETTINGS, ...(d.settings || {}) },
    };
  } catch {
    return blank();
  }
}

export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* storage full or blocked */ }
}

export const store = {
  get settings() { return data.settings; },
  get history() { return data.history; },
  get current() { return data.current; },
  set current(v) { data.current = v; save(); },
  setSetting(k, v) { data.settings[k] = v; save(); },
  override(id) { return data.overrides[id] || {}; },
  setOverride(id, patch) {
    data.overrides[id] = { ...(data.overrides[id] || {}), ...patch };
    save();
  },
  resetOverride(id) { delete data.overrides[id]; save(); },
  addHistory(entry) { data.history.unshift(entry); save(); },
  updateHistory(id, patch) {
    const e = data.history.find((h) => h.id === id);
    if (e) { Object.assign(e, patch); save(); }
  },
  removeHistory(id) { data.history = data.history.filter((h) => h.id !== id); save(); },
  exportJSON() { return JSON.stringify({ app: 'rehab', exportedAt: new Date().toISOString(), ...data }, null, 2); },
  importJSON(text) {
    const d = JSON.parse(text);
    if (!d || !Array.isArray(d.history)) throw new Error('Not a valid backup file');
    data = { ...blank(), settings: { ...DEFAULT_SETTINGS, ...(d.settings || {}) }, overrides: d.overrides || {}, history: d.history, current: null, lastReps: d.lastReps || {} };
    save();
  },
  // Reps done last time, per exercise and per set/side (key like "2" or "2R").
  lastReps(id, key) {
    const m = data.lastReps[id];
    if (!m) return null;
    if (m[key] != null) return m[key];
    const side = key.replace(/^\d+/, '');
    const keys = Object.keys(m).filter((k) => k.replace(/^\d+/, '') === side).sort();
    return keys.length ? m[keys[keys.length - 1]] : null;
  },
  setLastReps(id, key, reps) {
    (data.lastReps[id] ||= {})[key] = reps;
    save();
  },
  resetAll() { data = blank(); save(); },
};

// The plan as the user sees it: defaults from exercises.js merged with the user's edits.
export function plan() {
  return EXERCISES.map((ex) => ({ enabled: true, ...ex, ...store.override(ex.id) }));
}

export function activePlan() {
  return plan().filter((e) => e.enabled);
}

export function targetText(ex) {
  const reps = ex.repsMin === ex.repsMax || !ex.repsMax ? `${ex.repsMin}` : `${ex.repsMin}–${ex.repsMax}`;
  const side = ex.perSide ? ` each ${ex.sideWord || 'side'}` : '';
  if (ex.type === 'time') return `${ex.sets} × ${ex.duration} s${side}`;
  if (ex.type === 'hold') return `${ex.sets} × ${reps} reps · hold ${ex.hold} s${side}`;
  return `${ex.sets} × ${reps} reps${side}`;
}

// ---- dates ----
export function dayKey(d = new Date()) {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
}

export function daysBetween(a, b) {
  const da = new Date(a + 'T12:00:00');
  const db = new Date(b + 'T12:00:00');
  return Math.round((db - da) / 86400000);
}
