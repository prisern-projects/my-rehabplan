// Sounds, vibration, voice cues and screen wake lock.
import { store } from './store.js';

const native = window.AndroidApp;
let ctx = null;

// Must be called from a user tap (iOS only allows audio after a gesture).
export function unlockAudio() {
  try {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
  } catch { /* no audio */ }
}

function tone(freq, ms, when = 0, vol = 0.25) {
  if (!ctx || !store.settings.sound) return;
  const t = ctx.currentTime + when;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'sine';
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000);
  o.connect(g).connect(ctx.destination);
  o.start(t);
  o.stop(t + ms / 1000 + 0.02);
}

function buzz(pattern) {
  if (!store.settings.vibrate) return;
  const p = Array.isArray(pattern) ? pattern : [pattern];
  if (native) native.vibrate(p.join(','));
  else if (navigator.vibrate) navigator.vibrate(p);
}

export const fx = {
  tick() { tone(880, 90); buzz(30); },
  start() { tone(1320, 220); buzz(120); },
  end() { tone(660, 180); tone(990, 300, 0.2); buzz([150, 80, 150]); },
  tap() { tone(1200, 40, 0, 0.12); buzz(15); },
  done() { tone(660, 150); tone(880, 150, 0.15); tone(1320, 350, 0.3); buzz([100, 60, 100, 60, 200]); },
  say(text) {
    if (!store.settings.voice) return;
    if (native) { native.speak(text); return; }
    if (!('speechSynthesis' in window)) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US';
      u.rate = 1.05;
      speechSynthesis.speak(u);
    } catch { /* ignore */ }
  },
};

// ---- wake lock: keep the screen on during a workout ----
let lock = null;
let wanted = false;

export async function keepAwake(on) {
  wanted = on && store.settings.keepAwake;
  if (native) { native.keepAwake(wanted); return; }
  try {
    if (wanted && 'wakeLock' in navigator && !lock) {
      lock = await navigator.wakeLock.request('screen');
      lock.addEventListener('release', () => { lock = null; });
    } else if (!wanted && lock) {
      await lock.release();
      lock = null;
    }
  } catch { lock = null; }
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && wanted) keepAwake(true);
});
