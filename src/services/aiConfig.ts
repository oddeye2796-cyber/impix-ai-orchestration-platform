/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Where the Gemini key comes from, in priority order:
 *
 *  1. a build-time key (`GEMINI_API_KEY`) — for self-hosted or local runs;
 *  2. a key the operator pasted into Settings, kept in `localStorage`;
 *  3. nothing — the platform runs in **demo mode**.
 *
 * The deployed build is a static site, so a build-time key would be readable by
 * anyone who opens the bundle. Shipping without one is deliberate: demo mode
 * keeps every AI surface working at the booth, and anyone who wants live model
 * output can supply their own key from the UI.
 */

const STORAGE_KEY = 'impix.gemini-key';

/** Replaced at build time by Vite's `define`; empty on the public deployment. */
const BUILD_TIME_KEY: string = process.env.GEMINI_API_KEY || '';

type Listener = () => void;
const listeners = new Set<Listener>();

const readStoredKey = (): string => {
  try {
    return window.localStorage.getItem(STORAGE_KEY)?.trim() ?? '';
  } catch {
    // Private-mode browsers throw on storage access.
    return '';
  }
};

/** The key to authenticate with, or `''` when the platform is in demo mode. */
export const getApiKey = (): string => BUILD_TIME_KEY || readStoredKey();

/** True when no key is available and the AI surfaces fall back to simulation. */
export const isDemoMode = (): boolean => getApiKey() === '';

/** True when the key is baked into the build and cannot be changed from the UI. */
export const isKeyFromBuild = (): boolean => BUILD_TIME_KEY !== '';

export const setApiKey = (key: string): void => {
  try {
    const trimmed = key.trim();
    if (trimmed) window.localStorage.setItem(STORAGE_KEY, trimmed);
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Best effort — the key simply will not survive a reload.
  }
  listeners.forEach(fn => fn());
};

export const clearApiKey = (): void => setApiKey('');

/** Subscribe to key changes so the UI can re-render its demo/live badge. */
export const subscribeToApiKey = (fn: Listener): (() => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

/**
 * Outcome of an AI call. Errors are values rather than silent empty results:
 * the previous version returned `[]` on failure, so a failed refresh looked
 * exactly like "no new recommendations" and the operator got no feedback.
 */
export type AiResult<T> =
  | { status: 'ok'; data: T; source: 'live' | 'demo' }
  | { status: 'error'; message: string };
