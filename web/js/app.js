import { PLAN_NOTE } from './exercises.js';
import { store, save, plan, activePlan, targetText, dayKey, daysBetween } from './store.js';
import { fx, unlockAudio, keepAwake } from './feedback.js';
import { initUpdates, hasUpdate, updateVersion, applyUpdate, checkForUpdates, appVersion } from './updates.js';

const $app = document.getElementById('app');
const $sheet = document.getElementById('sheet');
const $toast = document.getElementById('toast');
const $banner = document.getElementById('update-banner');

const ui = { howOpen: false };

// ---------------------------------------------------------------- helpers
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const fmtClock = (sec) => {
  sec = Math.max(0, Math.round(sec));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};
const fmtMin = (sec) => `${Math.max(1, Math.round(sec / 60))} min`;
const fmtDate = (key) => new Date(key + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

function toast(msg) {
  $toast.textContent = msg;
  $toast.classList.add('show');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => $toast.classList.remove('show'), 2400);
}

function openSheet(html) {
  $sheet.innerHTML = `<div class="sheet-backdrop" data-act="close-sheet"></div><div class="sheet-panel">${html}</div>`;
  $sheet.classList.add('open');
}
function closeSheet() { $sheet.classList.remove('open'); $sheet.innerHTML = ''; }

function go(route) { if (location.hash !== '#' + route) location.hash = route; else render(); }
function route() { return (location.hash || '#/').slice(1) || '/'; }

function estimateSec(list) {
  const ready = store.settings.getReady;
  return list.reduce((t, ex) => {
    const sides = ex.perSide ? 2 : 1;
    let set;
    if (ex.type === 'time') set = sides * (ex.duration + ready);
    else if (ex.type === 'hold') set = sides * ex.repsMax * (ex.hold + ex.relax);
    else set = sides * (ex.repsMax || ex.repsMin) * 3.5;
    return t + ex.sets * set + (ex.sets - 1) * (store.settings.restTimer ? ex.rest : 0) + (Number(store.settings.exerciseRest) || 0);
  }, 0);
}

// ---------------------------------------------------------------- timer engine
// Runs a sequence of timed segments (get ready → hold → relax …) using wall-clock
// time so it stays correct even if the phone briefly throttles the page.
const runner = {
  segs: [], i: -1, endAt: 0, left: 0, running: false, paused: false, id: null, lastWhole: null, onDone: null,
  get seg() { return this.segs[this.i]; },
  start(segs, onDone) {
    this.stop();
    this.segs = segs.filter((s) => s.secs > 0);
    this.i = -1;
    this.onDone = onDone;
    this.running = true;
    this.paused = false;
    this.next(Date.now());
    this.id = setInterval(() => this.tick(), 100);
  },
  next(from) {
    this.i++;
    if (this.i >= this.segs.length) {
      const cb = this.onDone;
      this.stop();
      cb && cb();
      return;
    }
    const s = this.seg;
    this.endAt = from + s.secs * 1000;
    this.left = s.secs;
    this.lastWhole = Math.ceil(s.secs);
    if (s.kind === 'work' || s.kind === 'hold') fx.start();
    if (s.cue) fx.say(s.cue);
    updateTimerUI();
  },
  tick() {
    if (!this.running || this.paused) return;
    const now = Date.now();
    this.left = (this.endAt - now) / 1000;
    const whole = Math.ceil(this.left);
    if (whole !== this.lastWhole) {
      this.lastWhole = whole;
      if (whole > 0 && whole <= 3 && this.seg.secs >= 5) fx.tick();
    }
    if (this.left <= 0) {
      const lastOfKind = this.i === this.segs.length - 1;
      if (lastOfKind) fx.end();
      this.next(this.endAt);
    } else updateTimerUI();
  },
  pause() { if (!this.running) return; this.paused = true; this.left = (this.endAt - Date.now()) / 1000; renderWorkoutControls(); },
  resume() { if (!this.running) return; this.paused = false; this.endAt = Date.now() + this.left * 1000; renderWorkoutControls(); },
  add(sec) { if (!this.running) return; this.endAt += sec * 1000; this.left += sec; this.seg.secs += sec; updateTimerUI(); },
  stop() { clearInterval(this.id); this.id = null; this.running = false; this.paused = false; },
};

// ---------------------------------------------------------------- workout session
// The session object is persisted (store.current) so it survives reloads/updates.
let S = store.current;

function persist() { store.current = S; }

function sessionList() { const all = plan(); return S.ids.map((id) => all.find((e) => e.id === id)).filter(Boolean); }
function curEx() { return sessionList()[S.idx]; }
function exLog(ex) { return (S.log[ex.id] ||= { sets: [], skipped: false }); }
function sideName(ex, side) { return side ? `${cap(side)} ${ex.sideWord || 'side'}` : ''; }

function startWorkout() {
  unlockAudio();
  const list = activePlan();
  if (!list.length) { toast('No exercises enabled – check the Plan tab'); return; }
  S = { id: uid(), startedAt: Date.now(), elapsed: 0, ids: list.map((e) => e.id), idx: 0, set: 1, side: null, reps: 0, phase: 'work', log: {} };
  resetSetState(list[0]);
  persist();
  fx.say(`Let's go. ${list[0].name}`);
  go('/workout');
}

function resetSetState(ex) {
  S.reps = ex.type === 'reps' ? (ex.repsMax || ex.repsMin) : 0;
  S.side = ex.perSide ? 'left' : null;
}

function completeSet(entry) {
  runner.stop();
  const ex = curEx();
  exLog(ex).sets.push(entry);
  if (S.set < ex.sets) {
    S.set++;
    resetSetState(ex);
    if (store.settings.restTimer && ex.rest > 0) startRest(ex.rest);
    else { S.phase = 'work'; fx.say(`Set ${S.set}`); persist(); renderWorkout(); }
  } else {
    fx.done();
    nextExercise(true);
  }
}

function startRest(secs, betweenExercises = false) {
  S.phase = 'rest';
  S.restNext = betweenExercises ? 'exercise' : 'set';
  persist();
  renderWorkout();
  runner.start([{ kind: 'rest', secs, label: 'Rest', cue: betweenExercises ? `Rest. Next: ${curEx().name}` : 'Rest' }], () => {
    S.phase = 'work';
    persist();
    fx.start();
    fx.say(betweenExercises ? `Start ${curEx().name}` : `Set ${S.set}`);
    renderWorkout();
  });
}

function nextExercise(afterFinish = false) {
  runner.stop();
  const list = sessionList();
  S.idx++;
  S.set = 1;
  S.phase = 'work';
  if (S.idx >= list.length) {
    S.idx = list.length - 1;
    S.phase = 'summary';
    persist();
    fx.say('Workout complete. Well done!');
    renderWorkout();
    return;
  }
  const ex = curEx();
  resetSetState(ex);
  ui.howOpen = false;
  const rest = Number(store.settings.exerciseRest) || 0;
  if (afterFinish && rest > 0) { startRest(rest, true); return; }
  persist();
  fx.say(`Next: ${ex.name}`);
  renderWorkout();
}

function prevExercise() {
  if (S.idx === 0) return;
  runner.stop();
  S.idx--;
  S.set = 1;
  S.phase = 'work';
  resetSetState(curEx());
  persist();
  renderWorkout();
}

function skipExercise() {
  const ex = curEx();
  const lg = exLog(ex);
  if (!lg.sets.length) lg.skipped = true;
  nextExercise();
}

function setSegments(ex) {
  const ready = store.settings.getReady;
  const sides = ex.perSide ? ['left', 'right'] : [null];
  const segs = [];
  sides.forEach((side, si) => {
    const sn = sideName(ex, side);
    const r = si === 0 ? ready : Math.max(ready, 5);
    if (r) segs.push({ kind: 'ready', secs: r, label: si === 0 ? 'Get ready' : 'Switch', sub: sn, side, cue: si === 0 ? (sn || 'Get ready') : `Switch to ${sn.toLowerCase()}` });
    if (ex.type === 'time') {
      segs.push({ kind: 'work', secs: ex.duration, label: 'Hold', sub: sn, side, cue: '' });
    } else {
      const reps = ex.repsMax || ex.repsMin;
      for (let i = 1; i <= reps; i++) {
        segs.push({ kind: 'hold', secs: ex.hold, label: 'Hold', sub: sn, side, rep: i, reps, cue: i === 1 ? 'Hold' : '' });
        if (i < reps) segs.push({ kind: 'relax', secs: ex.relax, label: 'Relax', sub: sn, side, rep: i, reps, cue: '' });
      }
    }
  });
  return segs;
}

function startTimedSet() {
  unlockAudio();
  const ex = curEx();
  const startedAt = Date.now();
  runner.start(setSegments(ex), () => {
    const secs = Math.round((Date.now() - startedAt) / 1000);
    completeSet(ex.type === 'time' ? { secs: ex.duration } : { reps: ex.repsMax, secs });
  });
  renderWorkoutControls();
}

function finishTimedEarly() {
  const ex = curEx();
  const s = runner.seg;
  let entry;
  if (ex.type === 'time') entry = { secs: s && s.kind === 'work' ? Math.round(s.secs - runner.left) : 0, partial: true };
  else entry = { reps: s && s.rep ? s.rep : 0, partial: true };
  completeSet(entry);
}

function readReps() {
  const el = document.getElementById('reps-input');
  if (!el) return;
  const n = parseInt(el.value, 10);
  S.reps = Number.isFinite(n) && n >= 0 ? Math.min(n, 999) : 0;
}

function repDone() {
  const ex = curEx();
  if (ex.perSide && S.side === 'left') {
    exLog(ex).pendingLeft = S.reps;
    S.side = 'right';
    S.reps = 0;
    fx.start();
    fx.say(`Switch to ${sideName(ex, 'right').toLowerCase()}`);
    persist();
    renderWorkout();
    return;
  }
  const left = exLog(ex).pendingLeft;
  delete exLog(ex).pendingLeft;
  completeSet(ex.perSide ? { reps: S.reps, left } : { reps: S.reps });
}

function finishWorkout(pain, note) {
  runner.stop();
  const list = sessionList();
  const exercises = list.map((ex) => {
    const lg = S.log[ex.id] || { sets: [], skipped: true };
    return { id: ex.id, name: ex.name, sets: lg.sets.length, target: ex.sets, skipped: !lg.sets.length };
  });
  store.addHistory({
    id: S.id, type: 'workout', date: dayKey(S.startedAt), startedAt: S.startedAt, endedAt: Date.now(),
    durationSec: S.elapsed, exercises, pain, note,
  });
  S = null;
  store.current = null;
  keepAwake(false);
  toast('Workout saved 💪');
  go('/');
}

function discardWorkout() {
  runner.stop();
  S = null;
  store.current = null;
  keepAwake(false);
  go('/');
}

// count active time while the workout screen is visible
setInterval(() => {
  if (S && route() === '/workout' && document.visibilityState === 'visible' && S.phase !== 'summary') {
    S.elapsed++;
    const el = document.getElementById('elapsed');
    if (el) el.textContent = fmtClock(S.elapsed);
    if (S.elapsed % 5 === 0) save();
  }
}, 1000);

// ---------------------------------------------------------------- views
function nav(active) {
  const item = (r, icon, label) => `<a href="#${r}" class="${active === r ? 'on' : ''}"><span class="ico">${icon}</span>${label}</a>`;
  return `<nav class="tabbar">
    ${item('/', iconHome, 'Today')}
    ${item('/plan', iconList, 'Plan')}
    ${item('/history', iconCal, 'History')}
    ${item('/settings', iconGear, 'Settings')}
  </nav>`;
}

const iconHome = '<svg viewBox="0 0 24 24"><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/></svg>';
const iconList = '<svg viewBox="0 0 24 24"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>';
const iconCal = '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>';
const iconGear = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>';

function dayStatus() {
  const today = dayKey();
  const workouts = store.history.filter((h) => h.type === 'workout');
  const last = workouts[0];
  if (last && last.date === today) return 'done';
  if (last && daysBetween(last.date, today) === 1) return 'rest';
  return 'train';
}

function viewHome() {
  const list = activePlan();
  const status = S ? 'inprogress' : dayStatus();
  const today = dayKey();
  const walkedToday = store.history.some((h) => h.type === 'walk' && h.date === today);

  let card;
  if (status === 'inprogress') {
    const ex = curEx();
    card = `<div class="card hero">
      <div class="eyebrow">Workout in progress</div>
      <h2>${esc(ex ? ex.name : '')}</h2>
      <p class="muted">Exercise ${S.idx + 1} of ${S.ids.length} · ${fmtClock(S.elapsed)} elapsed</p>
      <button class="btn primary big" data-act="resume">Resume workout</button>
      <button class="btn ghost" data-act="discard-confirm">Discard</button>
    </div>`;
  } else if (status === 'done') {
    card = `<div class="card hero done">
      <div class="eyebrow">Today</div>
      <h2>Done for today ✓</h2>
      <p class="muted">Great work. Tomorrow is a rest day – take a short walk.</p>
      ${walkedToday ? '' : '<button class="btn secondary" data-act="walk">Log a walk</button>'}
    </div>`;
  } else if (status === 'rest') {
    card = `<div class="card hero rest">
      <div class="eyebrow">Rest day</div>
      <h2>Take a short walk 🚶</h2>
      <p class="muted">You trained yesterday. The plan is every other day.</p>
      ${walkedToday ? '<p class="ok">✓ Walk logged today</p>' : '<button class="btn primary big" data-act="walk">Log a walk</button>'}
      <button class="btn ghost" data-act="start">Train anyway</button>
    </div>`;
  } else {
    card = `<div class="card hero train">
      <div class="eyebrow">Training day</div>
      <h2>Back rehab workout</h2>
      <p class="muted">${list.length} exercises · about ${fmtMin(estimateSec(list))}</p>
      <button class="btn primary big" data-act="start">Start workout</button>
      ${walkedToday ? '' : '<button class="btn ghost" data-act="walk">Log a walk instead</button>'}
    </div>`;
  }

  // last 14 days strip
  const days = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const k = dayKey(d);
    const w = store.history.some((h) => h.type === 'workout' && h.date === k);
    const wk = store.history.some((h) => h.type === 'walk' && h.date === k);
    days.push(`<div class="day ${k === today ? 'today' : ''}"><span class="dn">${d.toLocaleDateString('en-GB', { weekday: 'narrow' })}</span><span class="dot ${w ? 'w' : wk ? 'k' : ''}"></span></div>`);
  }
  const since = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return dayKey(d); };
  const w14 = store.history.filter((h) => h.type === 'workout' && h.date > since(14)).length;
  const k14 = store.history.filter((h) => h.type === 'walk' && h.date > since(14)).length;
  const total = store.history.filter((h) => h.type === 'workout').length;

  return `<header class="top"><div><div class="date">${new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</div><h1>Back Rehab</h1></div></header>
  <main class="page">
    ${card}
    <div class="card">
      <div class="row between"><h3>Last 14 days</h3><span class="legend"><span class="dot w"></span>workout <span class="dot k"></span>walk</span></div>
      <div class="strip">${days.join('')}</div>
      <div class="stats">
        <div><b>${w14}</b><span>workouts</span></div>
        <div><b>${k14}</b><span>walks</span></div>
        <div><b>${total}</b><span>total workouts</span></div>
      </div>
    </div>
    <p class="note">📋 ${esc(PLAN_NOTE)}</p>
  </main>
  ${nav('/')}`;
}

function exThumb(ex) {
  const map = { Legs: '🦵', Balance: '🧍', 'Upper back': '🚣', Core: '🔥', Mobility: '🐈', Stretch: '🧘', Back: '🏐', Hips: '↔️', Arms: '💪', 'Upper body': '💪' };
  return `<span class="thumb">${map[ex.area] || '•'}</span>`;
}

function viewPlan() {
  const rows = plan().map((ex, i) => `
    <a class="ex-row ${ex.enabled ? '' : 'off'}" href="#/plan/${ex.id}">
      <span class="num">${i + 1}</span>
      ${exThumb(ex)}
      <span class="grow"><b>${esc(ex.name)}</b><small>${esc(targetText(ex))}${ex.weight ? ' · ' + esc(ex.weight) : ''}${ex.enabled ? '' : ' · skipped'}</small></span>
      <span class="chev">›</span>
    </a>`).join('');
  return `<header class="top"><h1>Plan</h1></header>
  <main class="page">
    <p class="muted small">From Aktiv Fysioterapi Nittedal – "Back rehabilitation". Tap an exercise to see how to do it or change sets, reps and timers.</p>
    <div class="card list">${rows}</div>
  </main>
  ${nav('/plan')}`;
}

function numField(label, field, val, min, max, step = 1, unit = '') {
  return `<label class="field"><span>${label}</span>
    <span class="stepper">
      <button type="button" data-act="step" data-field="${field}" data-d="${-step}" data-min="${min}" data-max="${max}">−</button>
      <output id="f-${field}">${val}${unit ? ' ' + unit : ''}</output>
      <button type="button" data-act="step" data-field="${field}" data-d="${step}" data-min="${min}" data-max="${max}">+</button>
    </span></label>`;
}

function viewExercise(id) {
  const ex = plan().find((e) => e.id === id);
  if (!ex) return viewPlan();
  const edited = Object.keys(store.override(id)).length > 0;
  let fields = numField('Sets', 'sets', ex.sets, 1, 10);
  if (ex.type === 'time') fields += numField('Duration', 'duration', ex.duration, 5, 300, 5, 's');
  else {
    fields += numField(ex.type === 'hold' ? 'Reps' : 'Reps (min)', 'repsMin', ex.repsMin, 1, 50);
    if (ex.type === 'reps') fields += numField('Reps (max)', 'repsMax', ex.repsMax, 1, 50);
  }
  if (ex.type === 'hold') {
    fields += numField('Hold', 'hold', ex.hold, 1, 60, 1, 's');
    fields += numField('Relax', 'relax', ex.relax, 1, 60, 1, 's');
  }
  fields += numField('Rest between sets', 'rest', ex.rest, 0, 300, 5, 's');

  return `<header class="top"><a class="back" href="#/plan">‹ Plan</a></header>
  <main class="page">
    <div class="eyebrow">${esc(ex.area)}</div>
    <h1 class="title">${esc(ex.name)}</h1>
    <p class="target">${esc(targetText(ex))}${ex.weight ? ' · ' + esc(ex.weight) : ''}</p>
    <div class="card">
      <h3>How to do it</h3>
      <ol class="steps">${ex.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
      ${ex.tip ? `<p class="tip">💡 ${esc(ex.tip)}</p>` : ''}
    </div>
    <div class="card" data-ex="${ex.id}">
      <h3>Your settings</h3>
      ${fields}
      <label class="field"><span>Weight / note</span><input type="text" data-field="weight" value="${esc(ex.weight || '')}" placeholder="e.g. 2 × 4 kg"></label>
      <label class="field toggle"><span>Include in workout</span><input type="checkbox" data-field="enabled" ${ex.enabled ? 'checked' : ''}><i></i></label>
      ${edited ? '<button class="btn ghost" data-act="reset-ex">Reset to physio\'s plan</button>' : ''}
    </div>
  </main>
  ${nav('/plan')}`;
}

function viewHistory() {
  const h = store.history;
  if (!h.length) {
    return `<header class="top"><h1>History</h1></header><main class="page"><div class="card empty"><p>No workouts yet.</p><p class="muted">Finished workouts and walks show up here.</p></div></main>${nav('/history')}`;
  }
  const items = h.map((e) => {
    if (e.type === 'walk') {
      return `<div class="hist walk"><div class="hd"><span>🚶 Walk</span><span class="muted">${fmtDate(e.date)}</span></div>
        <div class="bd">${e.minutes} min${e.note ? ' · ' + esc(e.note) : ''}</div>
        <button class="del" data-act="del-hist" data-id="${e.id}" aria-label="Delete">✕</button></div>`;
    }
    const done = e.exercises.filter((x) => !x.skipped).length;
    const skipped = e.exercises.filter((x) => x.skipped).map((x) => x.name);
    return `<div class="hist"><div class="hd"><span>💪 Workout</span><span class="muted">${fmtDate(e.date)}</span></div>
      <div class="bd">${done}/${e.exercises.length} exercises · ${fmtMin(e.durationSec)}${e.pain != null ? ` · back: <b class="pain p${Math.min(10, e.pain)}">${e.pain}/10</b>` : ''}</div>
      ${skipped.length ? `<div class="muted small">Skipped: ${skipped.length > 3 ? skipped.length + ' exercises' : esc(skipped.join(', '))}</div>` : ''}
      ${e.note ? `<div class="small">“${esc(e.note)}”</div>` : ''}
      <button class="del" data-act="del-hist" data-id="${e.id}" aria-label="Delete">✕</button></div>`;
  }).join('');
  const pains = h.filter((e) => e.type === 'workout' && e.pain != null).slice(0, 12).reverse();
  const chart = pains.length >= 2 ? `<div class="card"><h3>Back feeling after workouts</h3><div class="bars">${pains.map((p) => `<div class="bar" title="${fmtDate(p.date)}: ${p.pain}/10"><i style="height:${Math.max(4, p.pain * 10)}%" class="p${p.pain}"></i><span>${new Date(p.date + 'T12:00').getDate()}</span></div>`).join('')}</div><p class="muted small">0 = no pain, 10 = worst. Lower is better.</p></div>` : '';
  return `<header class="top"><h1>History</h1></header><main class="page">${chart}<div class="card list">${items}</div></main>${nav('/history')}`;
}

function toggle(label, key, desc = '') {
  return `<label class="field toggle"><span>${label}${desc ? `<small>${desc}</small>` : ''}</span><input type="checkbox" data-setting="${key}" ${store.settings[key] ? 'checked' : ''}><i></i></label>`;
}

function viewSettings() {
  const st = store.settings;
  return `<header class="top"><h1>Settings</h1></header>
  <main class="page">
    <div class="card">
      <h3>Workout</h3>
      ${toggle('Sound', 'sound', 'Beeps for countdowns and timers')}
      ${toggle('Vibration', 'vibrate')}
      ${toggle('Voice cues', 'voice', '“Hold”, “Relax”, “Switch to right leg”…')}
      ${toggle('Keep screen on', 'keepAwake', 'During workouts')}
      ${toggle('Rest timer between sets', 'restTimer', 'Length is set per exercise (default 30 s)')}
      <label class="field"><span>Rest after each exercise</span>
        <span class="seg">${[0, 15, 30, 45, 60].map((n) => `<button data-act="ex-rest" data-n="${n}" class="${st.exerciseRest === n ? 'on' : ''}">${n ? n + 's' : 'Off'}</button>`).join('')}</span></label>
      <label class="field"><span>Get-ready countdown</span>
        <span class="seg">${[0, 3, 5, 10].map((n) => `<button data-act="ready" data-n="${n}" class="${st.getReady === n ? 'on' : ''}">${n ? n + 's' : 'Off'}</button>`).join('')}</span></label>
      <button class="btn secondary" data-act="test-sound">Test sound &amp; voice</button>
    </div>
    <div class="card">
      <h3>App version</h3>
      <p class="muted small">Version <b id="ver">${esc(appVersion() || '…')}</b>. The app checks for new versions automatically each time you open it.</p>
      <button class="btn secondary" data-act="check-update">Check for updates</button>
    </div>
    <div class="card">
      <h3>Backup</h3>
      <p class="muted small">Your history is stored only on this phone. Export saves a backup file to your Downloads folder.</p>
      <div class="row gap"><button class="btn secondary" data-act="export">Export</button>
      <label class="btn secondary file">Import<input type="file" accept="application/json,.json" id="import-file"></label></div>
    </div>
    <div class="card">
      <h3>Reset</h3>
      <button class="btn danger" data-act="reset-all">Delete all data</button>
    </div>
    <p class="muted small center">Plan from Aktiv Fysioterapi Nittedal AS · Stop an exercise if it causes sharp pain and talk to your physio.</p>
  </main>
  ${nav('/settings')}`;
}

// ---- workout screen
function viewWorkout() {
  if (!S) return viewHome();
  if (S.phase === 'summary') return viewSummary();
  const list = sessionList();
  const ex = curEx();
  const lg = exLog(ex);
  const pct = ((S.idx + (lg.sets.length / ex.sets)) / list.length) * 100;
  const dots = Array.from({ length: ex.sets }, (_, i) => `<span class="${i < lg.sets.length ? 'done' : i === lg.sets.length ? 'cur' : ''}"></span>`).join('');
  const next = list[S.idx + 1];

  return `<div class="workout">
    <header class="wtop">
      <button class="icon-btn" data-act="exit" aria-label="Close">✕</button>
      <div class="wtitle">Exercise ${S.idx + 1} / ${list.length}</div>
      <div class="elapsed" id="elapsed">${fmtClock(S.elapsed)}</div>
    </header>
    <div class="progress"><i style="width:${pct}%"></i></div>
    <main class="wmain">
      <div class="eyebrow">${esc(ex.area)}</div>
      <h1 class="title">${esc(ex.name)}</h1>
      <p class="target">${esc(targetText(ex))}${ex.weight ? ' · ' + esc(ex.weight) : ''}</p>
      <details class="how" ${ui.howOpen ? 'open' : ''} id="how"><summary>How to do it</summary>
        <ol class="steps">${ex.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
        ${ex.tip ? `<p class="tip">💡 ${esc(ex.tip)}</p>` : ''}
      </details>
      <div class="setinfo"><span>${S.phase === 'rest' ? 'Next: set' : 'Set'} ${S.set} of ${ex.sets}</span><span class="dots">${dots}</span></div>
      <div id="controls" class="controls">${controlsHTML(ex)}</div>
    </main>
    <footer class="wfoot">
      <button class="btn ghost sm" data-act="prev" ${S.idx === 0 ? 'disabled' : ''}>‹ Previous</button>
      <span class="upnext">${next ? 'Up next: ' + esc(next.name) : 'Last exercise'}</span>
      <button class="btn ghost sm" data-act="skip">Skip ›</button>
    </footer>
  </div>`;
}

function ring(fraction, big, label, sub) {
  const r = 88;
  const c = 2 * Math.PI * r;
  return `<div class="ring">
    <svg viewBox="0 0 200 200"><circle cx="100" cy="100" r="${r}" class="track"/><circle id="t-ring" cx="100" cy="100" r="${r}" class="bar" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - fraction)}"/></svg>
    <div class="ring-in"><div class="rlabel" id="t-label">${label}</div><div class="rbig" id="t-num">${big}</div><div class="rsub" id="t-sub">${sub}</div></div>
  </div>`;
}

function controlsHTML(ex) {
  if (S.phase === 'rest') {
    const s = runner.seg;
    const left = runner.running ? runner.left : ex.rest;
    const sub = S.restNext === 'exercise' ? 'Get ready for the next exercise' : (S.side ? sideName(ex, S.side) : '');
    return `${ring(s ? left / s.secs : 1, fmtClock(left), 'Rest', sub)}
      <div class="row gap center">
        <button class="btn secondary" data-act="rest-add">+15 s</button>
        <button class="btn primary" data-act="rest-skip">Skip rest</button>
      </div>`;
  }

  if (ex.type === 'reps') {
    const target = ex.repsMin === ex.repsMax ? ex.repsMin : `${ex.repsMin}–${ex.repsMax}`;
    const hit = S.reps >= ex.repsMin;
    return `${S.side ? `<div class="side-badge">${esc(sideName(ex, S.side))}</div>` : ''}
      <div class="reps-entry ${hit ? 'hit' : ''}">
        <button class="btn secondary round" data-act="rep-minus" aria-label="One less">−</button>
        <label class="reps-box"><input id="reps-input" type="number" inputmode="numeric" pattern="[0-9]*" min="0" max="999" value="${S.reps}" aria-label="Reps done"><span>reps</span></label>
        <button class="btn secondary round" data-act="rep-plus" aria-label="One more">+</button>
      </div>
      <p class="muted small center reps-hint">Target ${target} reps. Change the number if you did fewer or more.</p>
      <button class="btn primary big" data-act="set-done">${ex.perSide && S.side === 'left' ? `Done → ${esc(sideName(ex, 'right'))}` : 'Set done ✓'}</button>`;
  }

  // timed (time / hold)
  if (!runner.running) {
    const total = ex.type === 'time' ? ex.duration : ex.hold;
    return `${ring(1, ex.type === 'time' ? fmtClock(total) : `${ex.repsMax}×`, ex.type === 'time' ? 'Hold' : `${ex.hold}s hold`, ex.perSide ? 'Left, then right' : '')}
      <div class="row gap center"><button class="btn primary big" data-act="timer-start">▶ Start set ${S.set}</button></div>
      <div class="row center"><button class="btn ghost sm" data-act="timer-skip-set">Mark set done without timer</button></div>`;
  }
  return `${timerRingHTML()}
    <div class="row gap center">
      <button class="btn secondary" data-act="${runner.paused ? 'timer-resume' : 'timer-pause'}">${runner.paused ? '▶ Resume' : '❚❚ Pause'}</button>
      <button class="btn primary" data-act="timer-finish">Finish set</button>
    </div>`;
}

function timerRingHTML() {
  const s = runner.seg;
  if (!s) return ring(1, '', '', '');
  return ring(runner.left / s.secs, s.kind === 'work' ? fmtClock(runner.left) : Math.ceil(runner.left), s.label, timerSub(s));
}

function timerSub(s) {
  const parts = [];
  if (s.rep) parts.push(`Rep ${s.rep} of ${s.reps}`);
  if (s.sub) parts.push(s.sub);
  return parts.join(' · ');
}

function updateTimerUI() {
  const s = runner.seg;
  const ringEl = document.getElementById('t-ring');
  if (!s || !ringEl) return;
  const c = 2 * Math.PI * 88;
  ringEl.setAttribute('stroke-dashoffset', String(c * (1 - Math.max(0, runner.left) / s.secs)));
  ringEl.setAttribute('class', `bar k-${s.kind}`);
  const num = document.getElementById('t-num');
  num.textContent = s.kind === 'work' || s.kind === 'rest' ? fmtClock(runner.left) : Math.max(0, Math.ceil(runner.left));
  document.getElementById('t-label').textContent = s.label;
  document.getElementById('t-sub').textContent = s.kind === 'rest'
    ? (S && S.restNext === 'exercise' ? 'Get ready for the next exercise' : (S && S.side ? sideName(curEx(), S.side) : ''))
    : timerSub(s);
}

function renderWorkoutControls() {
  const el = document.getElementById('controls');
  if (el && S) { el.innerHTML = controlsHTML(curEx()); updateTimerUI(); }
}

function renderWorkout() {
  if (route() === '/workout') render();
}

function viewSummary() {
  const list = sessionList();
  const done = list.filter((ex) => (S.log[ex.id]?.sets.length || 0) > 0);
  const sets = done.reduce((t, ex) => t + S.log[ex.id].sets.length, 0);
  return `<div class="workout summary">
    <main class="wmain">
      <div class="big-emoji">🎉</div>
      <h1 class="title center">Workout complete!</h1>
      <div class="stats big">
        <div><b>${fmtClock(S.elapsed)}</b><span>time</span></div>
        <div><b>${done.length}/${list.length}</b><span>exercises</span></div>
        <div><b>${sets}</b><span>sets</span></div>
      </div>
      <div class="card">
        <h3>How does your back feel?</h3>
        <div class="pain-scale" id="pain">${Array.from({ length: 11 }, (_, i) => `<button data-act="pain" data-n="${i}" class="p${i}">${i}</button>`).join('')}</div>
        <div class="row between muted small"><span>No pain</span><span>Worst</span></div>
        <textarea id="note" rows="3" placeholder="Notes (optional) – e.g. what felt good or hard"></textarea>
      </div>
      <button class="btn primary big" data-act="save-workout">Save workout</button>
      <button class="btn ghost" data-act="back-to-workout">Back to exercises</button>
    </main>
  </div>`;
}

// ---------------------------------------------------------------- render
function render() {
  const r = route();
  closeSheet();
  if (r !== '/workout') { runner.stop(); keepAwake(false); }
  let html;
  if (r === '/workout') {
    if (!S) { go('/'); return; }
    html = viewWorkout();
    keepAwake(S.phase !== 'summary');
  } else if (r === '/plan') html = viewPlan();
  else if (r.startsWith('/plan/')) html = viewExercise(r.slice(6));
  else if (r === '/history') html = viewHistory();
  else if (r === '/settings') html = viewSettings();
  else html = viewHome();
  $app.innerHTML = html;
  document.body.classList.toggle('in-workout', r === '/workout');
  if (r === '/workout') updateTimerUI();
  window.scrollTo(0, 0);
}

// If the app was closed mid-rest, resume the set rather than an orphaned rest timer.
if (S && S.phase === 'rest') { S.phase = 'work'; persist(); }

// ---------------------------------------------------------------- events
const actions = {
  'close-sheet': closeSheet,
  start: () => { if (S) go('/workout'); else startWorkout(); },
  resume: () => { unlockAudio(); go('/workout'); },
  'discard-confirm': () => openSheet(`<h3>Discard this workout?</h3><p class="muted">Progress in this session will be lost.</p>
    <button class="btn danger" data-act="discard">Discard workout</button><button class="btn ghost" data-act="close-sheet">Cancel</button>`),
  discard: discardWorkout,
  exit: () => openSheet(`<h3>Leave workout?</h3>
    <button class="btn primary" data-act="pause-leave">Pause – continue later</button>
    <button class="btn secondary" data-act="end-now">Finish now &amp; save</button>
    <button class="btn danger" data-act="discard">Discard workout</button>
    <button class="btn ghost" data-act="close-sheet">Keep going</button>`),
  'pause-leave': () => { if (S.phase === 'rest') S.phase = 'work'; persist(); go('/'); },
  'end-now': () => { runner.stop(); S.phase = 'summary'; persist(); render(); },
  'back-to-workout': () => { S.phase = 'work'; persist(); render(); },
  'rep-plus': () => { unlockAudio(); readReps(); S.reps++; fx.tap(); persist(); renderWorkoutControls(); },
  'rep-minus': () => { unlockAudio(); readReps(); if (S.reps > 0) { S.reps--; fx.tap(); persist(); renderWorkoutControls(); } },
  'set-done': () => { unlockAudio(); readReps(); repDone(); },
  'timer-start': startTimedSet,
  'timer-pause': () => runner.pause(),
  'timer-resume': () => runner.resume(),
  'timer-finish': finishTimedEarly,
  'timer-skip-set': () => { const ex = curEx(); completeSet(ex.type === 'time' ? { secs: ex.duration, manual: true } : { reps: ex.repsMax, manual: true }); },
  'rest-add': () => runner.add(15),
  'rest-skip': () => { runner.stop(); S.phase = 'work'; persist(); fx.start(); renderWorkout(); },
  prev: prevExercise,
  skip: skipExercise,
  pain: (el) => {
    document.querySelectorAll('#pain button').forEach((b) => b.classList.toggle('on', b === el));
    ui.pain = Number(el.dataset.n);
  },
  'save-workout': () => {
    const note = document.getElementById('note').value.trim();
    finishWorkout(ui.pain ?? null, note);
    ui.pain = undefined;
  },
  walk: () => openSheet(`<h3>Log a walk 🚶</h3>
    <div class="chips">${[10, 15, 20, 30, 45, 60].map((m) => `<button class="chip" data-act="walk-min" data-n="${m}">${m} min</button>`).join('')}</div>
    <input type="text" id="walk-note" placeholder="Note (optional)">
    <button class="btn ghost" data-act="close-sheet">Cancel</button>`),
  'walk-min': (el) => {
    const note = document.getElementById('walk-note')?.value.trim() || '';
    store.addHistory({ id: uid(), type: 'walk', date: dayKey(), at: Date.now(), minutes: Number(el.dataset.n), note });
    closeSheet();
    toast('Walk logged 👍');
    render();
  },
  'del-hist': (el) => openSheet(`<h3>Delete this entry?</h3><button class="btn danger" data-act="del-hist-yes" data-id="${el.dataset.id}">Delete</button><button class="btn ghost" data-act="close-sheet">Cancel</button>`),
  'del-hist-yes': (el) => { store.removeHistory(el.dataset.id); render(); },
  step: (el) => {
    const id = el.closest('[data-ex]').dataset.ex;
    const ex = plan().find((e) => e.id === id);
    const f = el.dataset.field;
    let v = Number(ex[f]) + Number(el.dataset.d);
    v = Math.min(Number(el.dataset.max), Math.max(Number(el.dataset.min), v));
    const patch = { [f]: v };
    if (f === 'repsMin' && (ex.type === 'hold' || v > ex.repsMax)) patch.repsMax = v;
    if (f === 'repsMax' && v < ex.repsMin) patch.repsMin = v;
    store.setOverride(id, patch);
    render();
  },
  'reset-ex': () => { const id = route().slice(6); store.resetOverride(id); toast('Reset to the original plan'); render(); },
  'ex-rest': (el) => { store.setSetting('exerciseRest', Number(el.dataset.n)); render(); },
  ready: (el) => { store.setSetting('getReady', Number(el.dataset.n)); render(); },
  'test-sound': () => { unlockAudio(); fx.tick(); setTimeout(() => fx.start(), 400); setTimeout(() => fx.say('Switch to right leg'), 900); },
  'check-update': async (el) => {
    el.disabled = true; el.textContent = 'Checking…';
    const r = await checkForUpdates();
    el.disabled = false; el.textContent = 'Check for updates';
    toast({ available: 'New version found – tap Update now', latest: 'You have the latest version', offline: 'Could not check – are you online?', unsupported: 'Updates work in the installed app' }[r]);
  },
  export: () => {
    if (window.AndroidApp) { window.AndroidApp.saveFile(`rehab-backup-${dayKey()}.json`, store.exportJSON()); return; }
    const blob = new Blob([store.exportJSON()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `rehab-backup-${dayKey()}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  },
  'reset-all': () => openSheet(`<h3>Delete all data?</h3><p class="muted">History, settings and plan changes will be removed from this phone.</p>
    <button class="btn danger" data-act="reset-all-yes">Delete everything</button><button class="btn ghost" data-act="close-sheet">Cancel</button>`),
  'reset-all-yes': () => { runner.stop(); store.resetAll(); S = null; toast('All data deleted'); go('/'); },
  update: applyUpdate,
};

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el || el.disabled) return;
  const fn = actions[el.dataset.act];
  if (fn) { e.preventDefault(); fn(el); }
});

document.addEventListener('toggle', (e) => { if (e.target.id === 'how') ui.howOpen = e.target.open; }, true);

document.addEventListener('change', (e) => {
  const el = e.target;
  if (el.dataset.setting) { store.setSetting(el.dataset.setting, el.checked); return; }
  if (el.id === 'import-file' && el.files[0]) {
    el.files[0].text().then((t) => {
      try { store.importJSON(t); S = null; toast('Backup imported'); render(); } catch (err) { toast(err.message || 'Import failed'); }
    });
    return;
  }
  const exEl = el.closest('[data-ex]');
  if (exEl && el.dataset.field) {
    const v = el.type === 'checkbox' ? el.checked : el.value.trim();
    store.setOverride(exEl.dataset.ex, { [el.dataset.field]: v });
    if (el.type === 'checkbox') render();
  }
});

document.addEventListener('focusin', (e) => { if (e.target.id === 'reps-input') setTimeout(() => e.target.select(), 0); });
document.addEventListener('input', (e) => {
  if (e.target.id === 'reps-input' && S) {
    readReps();
    persist();
    const ex = curEx();
    e.target.closest('.reps-entry')?.classList.toggle('hit', S.reps >= ex.repsMin);
  }
});
document.addEventListener('keydown', (e) => {
  if (e.target.id === 'reps-input' && e.key === 'Enter') { e.preventDefault(); e.target.blur(); }
});

window.addEventListener('hashchange', render);

// ---------------------------------------------------------------- updates
function showUpdateBanner() {
  $banner.innerHTML = `<span>Version ${esc(updateVersion() || '')} is available.</span><button data-act="update">Update now</button>`;
  $banner.classList.add('show');
}
initUpdates(showUpdateBanner);
if (hasUpdate()) showUpdateBanner();

if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

render();
