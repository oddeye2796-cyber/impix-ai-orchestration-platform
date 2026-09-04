/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Catalog,
  DEFAULT_LOCALE,
  Locale,
  LOCALES,
  LocaleDescriptor,
  isLocale,
} from './types';

export type { Locale, LocaleDescriptor, Catalog };
export { LOCALES, DEFAULT_LOCALE, isLocale };

const STORAGE_KEY = 'impix.locale';

/**
 * Catalogs are fetched per locale rather than bundled together: the two of them
 * are ~120 KB gzipped and a visitor only ever needs one. Korean is the
 * authoring language, so it needs no catalog at all — `t()` falls back to the
 * key, which *is* the Korean copy.
 */
const CATALOGS: Record<Locale, Catalog> = { ja: {}, en: {}, ko: {} };

const LOADERS: Record<Locale, (() => Promise<Catalog>) | null> = {
  ja: () => import('./locales/ja').then(m => m.ja),
  en: () => import('./locales/en').then(m => m.en),
  ko: null,
};

const loaded = new Set<Locale>(['ko']);

/** Fetch a locale's catalog once. Resolves immediately if it is already in. */
export async function loadCatalog(locale: Locale): Promise<void> {
  if (loaded.has(locale)) return;
  const load = LOADERS[locale];
  if (!load) return;
  try {
    CATALOGS[locale] = await load();
  } catch (error) {
    // Fall back to the Korean source copy rather than blocking the UI.
    console.error(`Failed to load the ${locale} catalog:`, error);
  }
  loaded.add(locale);
}

/**
 * Mirror of the React state, kept at module scope so that `t()` can be called
 * from plain functions and data helpers that are not React components.
 * `I18nProvider` keeps it in sync before any child renders.
 */
let currentLocale: Locale = DEFAULT_LOCALE;

/** Keys that had no entry in the active catalog — surfaced by `npm run i18n:report`. */
const missingKeys = new Set<string>();

export const getLocale = (): Locale => currentLocale;

export const getLocaleTag = (locale: Locale = currentLocale): string =>
  LOCALES.find(l => l.code === locale)?.tag ?? 'ja-JP';

export const getMissingKeys = (): string[] => [...missingKeys];

/**
 * Translate a Korean source string into the active locale.
 *
 * The Korean text is the catalog key, so untranslated copy degrades to the
 * original wording instead of showing a raw identifier. `vars` fills `{name}`
 * style placeholders after lookup, which keeps word order translatable.
 */
export function t(key: string, vars?: Record<string, string | number>): string {
  if (typeof key !== 'string' || key.length === 0) return key;

  const catalog = CATALOGS[currentLocale];
  let out = catalog[key];

  if (out === undefined) {
    // The key *is* the copy in its own source language, so only flag the cases
    // where a real translation is expected: Korean copy outside `ko`, and the
    // English copy the UI was authored in when the locale is not `en`.
    const sourceLocale: Locale = /[가-힣]/.test(key) ? 'ko' : 'en';
    if (currentLocale !== sourceLocale) missingKeys.add(key);
    out = key;
  }

  if (vars) {
    out = out.replace(/\{(\w+)\}/g, (match, name: string) =>
      Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : match,
    );
  }

  return out;
}

/**
 * Every known spelling of a key across the catalogs that have been fetched so
 * far (the Korean source always counts). In practice the operator types in the
 * language the interface is showing, which is exactly the catalog that is
 * loaded, so keyword matching still lands.
 */
export const tAll = (key: string): string[] => {
  const spellings = new Set<string>([key]);
  (Object.keys(CATALOGS) as Locale[]).forEach(code => {
    const value = CATALOGS[code][key];
    if (value) spellings.add(value);
  });
  return [...spellings];
};

/** Case-insensitive "does this free text mention the concept behind `key`?" */
export const matchesKeyword = (text: string, key: string): boolean => {
  const haystack = text.toLowerCase();
  return tAll(key).some(spelling => haystack.includes(spelling.toLowerCase()));
};

/** Translate a value that may be undefined, keeping the optionality. */
export const tOpt = (key?: string): string | undefined =>
  key === undefined ? undefined : t(key);

/** Translate a value that may also be a number (recommended set-points, ...). */
export const tValue = <T extends string | number | undefined>(value: T): string | number | undefined =>
  typeof value === 'string' ? t(value) : value;

/** Translate every string in a list (menu roles, checklists, tag rows...). */
export const tList = (keys: string[]): string[] => keys.map(k => t(k));

function detectLocale(): Locale {
  if (typeof window === 'undefined') return DEFAULT_LOCALE;

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (isLocale(stored)) return stored;
  } catch {
    // Private-mode browsers can throw on storage access; fall through to detection.
  }

  const candidates =
    (navigator.languages && navigator.languages.length
      ? navigator.languages
      : [navigator.language]) ?? [];

  for (const candidate of candidates) {
    const base = candidate.toLowerCase().split('-')[0];
    if (base === 'ja') return 'ja';
    if (base === 'en') return 'en';
    if (base === 'ko') return 'ko';
  }

  return DEFAULT_LOCALE;
}

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: typeof t;
  /** Locale tag for `Intl` / `toLocaleString` calls. */
  localeTag: string;
}

const I18nContext = createContext<I18nContextValue>({
  locale: DEFAULT_LOCALE,
  setLocale: () => undefined,
  t,
  localeTag: getLocaleTag(DEFAULT_LOCALE),
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(detectLocale);
  // Gates the *first* paint only. Later switches keep the tree mounted, so an
  // operator changing language mid-demo does not lose the tour progress, the
  // chat history or anything else held in component state.
  const [ready, setReady] = useState(() => loaded.has(detectLocale()));

  // Assigning during render (rather than in an effect) guarantees the module
  // level `t()` already sees the new locale while this subtree renders.
  currentLocale = locale;

  useEffect(() => {
    if (ready) return;
    let cancelled = false;
    loadCatalog(locale).then(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [locale, ready]);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.setAttribute('data-locale', locale);
    try {
      window.localStorage.setItem(STORAGE_KEY, locale);
    } catch {
      // Persisting the choice is best effort.
    }
  }, [locale]);

  // Load the catalog *before* flipping the locale, so the tree never renders a
  // frame of untranslated Korean and never has to unmount.
  const setLocale = useCallback((next: Locale) => {
    void loadCatalog(next).then(() => {
      currentLocale = next;
      setLocaleState(next);
    });
  }, []);

  const value = useMemo<I18nContextValue>(
    () => ({ locale, setLocale, t, localeTag: getLocaleTag(locale) }),
    [locale, setLocale],
  );

  // Holding the first paint avoids a flash of the Korean source copy while the
  // active catalog is still in flight.
  return (
    <I18nContext.Provider value={value}>{ready ? children : null}</I18nContext.Provider>
  );
}

/**
 * Subscribe a component to locale changes. Components that only call the module
 * level `t()` still re-render, because the provider re-renders the whole tree.
 */
export const useI18n = (): I18nContextValue => useContext(I18nContext);
