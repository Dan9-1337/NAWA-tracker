import '@testing-library/jest-dom/vitest';
import { beforeEach } from 'vitest';
import { LOCALE_STORAGE_KEY, setActiveLocale } from '../i18n';

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem(LOCALE_STORAGE_KEY, 'pl');
  setActiveLocale('pl');
  document.documentElement.lang = 'pl';
});
