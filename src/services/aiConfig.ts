/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * How the platform reaches Gemini, in priority order:
 *
 *  1. a **proxy** (`AI_PROXY_URL`, or one set in Settings) that holds the key
 *     server-side — visitors get live AI with nothing to configure;
 *  2. a build-time key (`GEMINI_API_KEY`) — for self-hosted or local runs;
 *  3. a key the operator pasted into Settings, kept in `localStorage`;
 *  4. none of the above — the platform runs in **demo mode**.
 *
 * The deployed build is a static site, so a build-time key would be readable by
 * anyone who opens the bundle. The proxy exists precisely so the booth can show
 * real model output without publishing a credential; demo mode is the floor
 * that keeps every AI surface working when neither is configured.
 */

const STORAGE_KEY = 'impix.gemini-key';
const PROXY_STORAGE_KEY = 'impix.ai-proxy';

/** Replaced at build time by Vite's `define`; empty on the public deployment. */
const BUILD_TIME_KEY: string = process.env.GEMINI_API_KEY || '';

/** Worker/function endpoint that holds the key. Safe to ship in the bundle. */
const BUILD_TIME_PROXY: string = process.env.AI_PROXY_URL || '';

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

const readStoredProxy = (): string => {
  try {
    return window.localStorage.getItem(PROXY_STORAGE_KEY)?.trim() ?? '';
  } catch {
    return '';
  }
};

/** The key to authenticate with directly, or `''` when there is none. */
export const getApiKey = (): string => BUILD_TIME_KEY || readStoredKey();

/** Proxy endpoint to route through, or `''` to call Gemini directly. */
export const getProxyUrl = (): string => BUILD_TIME_PROXY || readStoredProxy();

/** True when the proxy is baked into the build and cannot be changed here. */
export const isProxyFromBuild = (): boolean => BUILD_TIME_PROXY !== '';

export const setProxyUrl = (url: string): void => {
  try {
    const trimmed = url.trim();
    if (trimmed) window.localStorage.setItem(PROXY_STORAGE_KEY, trimmed);
    else window.localStorage.removeItem(PROXY_STORAGE_KEY);
  } catch {
    // Best effort — the endpoint simply will not survive a reload.
  }
  listeners.forEach(fn => fn());
};

/** True when neither a proxy nor a key is available, so answers are simulated. */
export const isDemoMode = (): boolean => getProxyUrl() === '' && getApiKey() === '';

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
