// App updates. The Android app checks GitHub Releases for a newer version;
// when one exists we show the "Update now" banner. In a plain browser this is a no-op.
const native = window.AndroidApp;
let available = null;
let pending = null;

export function appVersion() { return native ? native.version() : 'browser preview'; }

export function initUpdates(onAvailable) {
  window.onNativeUpdate = (version) => { available = version; onAvailable(version); };
  window.onNativeUpdateResult = (status) => { if (pending) { pending(status); pending = null; } };
}

export function hasUpdate() { return !!available; }
export function updateVersion() { return available; }

export function applyUpdate() { if (native) native.installUpdate(); }

// Resolves to 'available' | 'latest' | 'offline' | 'unsupported'
export function checkForUpdates() {
  if (!native) return Promise.resolve('unsupported');
  return new Promise((resolve) => {
    pending = resolve;
    native.checkForUpdates();
    setTimeout(() => { if (pending === resolve) { pending = null; resolve('offline'); } }, 20000);
  });
}
