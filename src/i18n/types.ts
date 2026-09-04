/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Supported UI locales.
 *
 * Priority order for this product is Japanese first, English second, with the
 * original Korean copy kept as the source-of-truth fallback.
 */
export type Locale = 'ja' | 'en' | 'ko';

/**
 * A translation catalog. Keys are the original Korean source strings, which
 * doubles as the Korean rendering: a missing entry simply falls back to the key.
 */
export type Catalog = Record<string, string>;

export interface LocaleDescriptor {
  code: Locale;
  /** Endonym shown in the language switcher. */
  label: string;
  /** Compact label used in tight chrome (header pills, mobile). */
  short: string;
  /** BCP-47 tag used for `document.documentElement.lang` and Intl APIs. */
  tag: string;
}

export const LOCALES: LocaleDescriptor[] = [
  { code: 'ja', label: '日本語', short: 'JA', tag: 'ja-JP' },
  { code: 'en', label: 'English', short: 'EN', tag: 'en-US' },
  { code: 'ko', label: '한국어', short: 'KO', tag: 'ko-KR' },
];

export const DEFAULT_LOCALE: Locale = 'ja';

export const isLocale = (value: unknown): value is Locale =>
  typeof value === 'string' && LOCALES.some(l => l.code === value);
