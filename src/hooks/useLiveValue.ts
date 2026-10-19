/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback } from 'react';

import { breathe } from '../services/telemetry';
import { useTelemetry } from './useTelemetry';

/**
 * Turns a static chart constant into a value that breathes with the plant.
 *
 * The module charts were fixed arrays, so every screen looked frozen next to a
 * dashboard that was ticking. Each value now oscillates around its original
 * figure — the shape of the chart is preserved, but it moves, and it moves
 * *more* when the simulated plant is having a bad minute.
 */
export function useLiveValue(): (base: number, slot: number) => number {
  const { tick, defectRate } = useTelemetry();

  return useCallback(
    (base: number, slot: number) => breathe(base, slot, tick, defectRate),
    [tick, defectRate],
  );
}
