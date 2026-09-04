/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback } from 'react';

import { seededUnit } from '../services/telemetry';
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
    (base: number, slot: number) => {
      // Percentages and rates should not wander outside their natural range.
      const amplitude = base <= 1 ? base * 0.12 : base <= 100 ? base * 0.05 : base * 0.06;
      const stress = 1 + Math.min(1, defectRate / 8);
      const phase = seededUnit(String(slot)) * 6.28;
      const wave = Math.sin(tick * 0.3 + phase) * 0.6 + Math.sin(tick * 0.11 + phase * 2) * 0.4;
      const next = base + wave * amplitude * stress;
      const decimals = base < 10 ? 2 : base < 1000 ? 1 : 0;
      return Math.max(0, Number(next.toFixed(decimals)));
    },
    [tick, defectRate],
  );
}
