import '@testing-library/jest-dom/vitest';
import { beforeEach } from 'vitest';
import { LOCALE_STORAGE_KEY, setActiveLocale } from '../i18n';

/**
 * Node 25+ ships its own `localStorage` global that is unusable without `--localstorage-file` and shadows
 * jsdom's. Install a small in-memory Storage whenever the global one is broken so tests run on any Node.
 */
function ensureWorkingStorage(name: 'localStorage' | 'sessionStorage'): void {
  const existing = (globalThis as Record<string, unknown>)[name] as Storage | undefined;
  if (existing && typeof existing.clear === 'function') return;

  const data = new Map<string, string>();
  const storage: Storage = {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (index) => [...data.keys()][index] ?? null,
    removeItem: (key) => void data.delete(key),
    setItem: (key, value) => void data.set(key, String(value)),
  };
  for (const target of [globalThis, window]) {
    Object.defineProperty(target, name, { value: storage, configurable: true, writable: true });
  }
}

ensureWorkingStorage('localStorage');
ensureWorkingStorage('sessionStorage');

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem(LOCALE_STORAGE_KEY, 'pl');
  setActiveLocale('pl');
  document.documentElement.lang = 'pl';
});
