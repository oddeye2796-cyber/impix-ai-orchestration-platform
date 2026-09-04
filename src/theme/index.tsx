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

export type ThemePreference = 'dark' | 'light' | 'system';
export type ResolvedTheme = 'dark' | 'light';

/** Matches the key the previous deployment used, so an existing choice carries over. */
const STORAGE_KEY = 'impix-theme';

const isPreference = (value: unknown): value is ThemePreference =>
  value === 'dark' || value === 'light' || value === 'system';

const prefersLight = (): boolean =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-color-scheme: light)').matches === true;

const resolve = (preference: ThemePreference): ResolvedTheme =>
  preference === 'system' ? (prefersLight() ? 'light' : 'dark') : preference;

function readInitialPreference(): ThemePreference {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (isPreference(stored)) return stored;
  } catch {
    // Private-mode browsers throw on storage access.
  }
  return 'dark';
}

/**
 * Mirror of the resolved theme at module scope, so plain helpers — chart colour
 * lookups in particular — can read it without being React components.
 */
let currentTheme: ResolvedTheme = 'dark';

export const getTheme = (): ResolvedTheme => currentTheme;

/**
 * Chart chrome colours. Recharts takes literal colour props rather than CSS
 * variables, so the palette has to be resolved in JS to follow the theme.
 * Series colours (emerald, red, blue, amber) read well on both grounds and are
 * intentionally not themed.
 */
export interface ChartPalette {
  axis: string;
  grid: string;
  tooltipBg: string;
  tooltipText: string;
  tooltipBorder: string;
}

const CHART_PALETTES: Record<ResolvedTheme, ChartPalette> = {
  dark: {
    axis: '#94a3b8',
    grid: '#334155',
    tooltipBg: '#0f172a',
    tooltipText: '#f8fafc',
    tooltipBorder: '#334155',
  },
  light: {
    axis: '#64748b',
    grid: '#e2e8f0',
    tooltipBg: '#ffffff',
    tooltipText: '#0f172a',
    tooltipBorder: '#cbd5e1',
  },
};

export const chartPalette = (): ChartPalette => CHART_PALETTES[currentTheme];

interface ThemeContextValue {
  preference: ThemePreference;
  theme: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  preference: 'dark',
  theme: 'dark',
  setPreference: () => undefined,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(readInitialPreference);
  const [systemLight, setSystemLight] = useState(prefersLight);

  const theme: ResolvedTheme = preference === 'system' ? (systemLight ? 'light' : 'dark') : preference;

  // Assigning during render keeps the module-level getters in step with the
  // tree that is about to paint.
  currentTheme = theme;

  useEffect(() => {
    if (preference !== 'system') return;
    const query = window.matchMedia('(prefers-color-scheme: light)');
    const onChange = (e: MediaQueryListEvent) => setSystemLight(e.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, [preference]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    try {
      window.localStorage.setItem(STORAGE_KEY, preference);
    } catch {
      // Persisting the choice is best effort.
    }
  }, [theme, preference]);

  const setPreference = useCallback((next: ThemePreference) => {
    currentTheme = resolve(next);
    setPreferenceState(next);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ preference, theme, setPreference }),
    [preference, theme, setPreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = (): ThemeContextValue => useContext(ThemeContext);
