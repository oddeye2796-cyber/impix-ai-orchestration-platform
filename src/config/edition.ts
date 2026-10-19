/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Which build this is. The standard platform is what master deploys; an expo
 * edition is the same app tuned for a trade-show booth (`npm run build:tokyo`).
 * It is a build-time constant, so the standard bundle carries none of the
 * booth behaviour.
 */
export type Edition = 'standard' | 'tokyo';

export const EDITION: Edition = process.env.EDITION === 'tokyo' ? 'tokyo' : 'standard';

export const IS_EXPO = EDITION !== 'standard';

/** Booth details for the expo banner. Copy is Korean and translated with `t()`. */
export const EXPO = {
  /** Event name; proper noun, translated only for the season tag. */
  event: '넥스테크 위크 도쿄 2026 [가을]',
  tagline: 'AI 오케스트레이션 라이브 데모',
  /** KRW → JPY for the savings estimate. Rounded; the figures are estimates anyway. */
  jpyPerKrw: 0.11,
  /** Seconds without a touch before the self-running demo takes over again. */
  idleResumeSec: 45,
};
