import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  getMessages,
  LOCALE_STORAGE_KEY,
  resolveInitialLocale,
  setActiveLocale,
  type Locale,
  type Messages,
} from './index';

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Messages;
};

const I18nContext = createContext<I18nContextValue | null>(null);

type I18nProviderProps = {
  children: ReactNode;
};

export function I18nProvider({ children }: I18nProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(() => resolveInitialLocale());

  useEffect(() => {
    setActiveLocale(locale);
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  }, [locale]);

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale: setLocaleState,
      t: getMessages(locale),
    }),
    [locale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (context) return context;
  const locale = resolveInitialLocale();
  return {
    locale,
    setLocale: () => {},
    t: getMessages(locale),
  };
}
