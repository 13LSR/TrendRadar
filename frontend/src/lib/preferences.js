export const INTRO_KEY = 'trendradar-intro-v1';
export const THEME_KEY = 'trendradar-theme-v2';

// Fall back to session storage when persistent storage is unavailable.
const memory = new Map();
export function readPreference(key, host = globalThis) {
  for (const name of ['localStorage', 'sessionStorage']) {
    try {
      const value = host[name]?.getItem(key);
      if (value != null) return value;
    } catch { /* Browser policy can deny storage access. */ }
  }
  return memory.get(key) ?? null;
}

export function writePreference(key, value, host = globalThis) {
  memory.set(key, value);
  for (const name of ['localStorage', 'sessionStorage']) {
    try { host[name]?.setItem(key, value); } catch { /* Reading remains available. */ }
  }
}
