/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { SensorData } from '../types';

/**
 * A single simulated plant that every view reads from.
 *
 * The previous mock regenerated each reading with `Math.random()`, so the chart
 * was noise: values teleported, nothing correlated, and the KPI cards were
 * hardcoded strings that never moved at all. This models the plant instead —
 * values drift, they influence each other, and the line occasionally has a bad
 * minute — so the dashboard reads like a facility that is actually running.
 */

export interface PlantState {
  /** Rolling window of readings, oldest first. */
  history: SensorData[];
  vibration: number;
  temperature: number;
  current: number;
  defectRate: number;
  /** Overall equipment effectiveness, derived from the three factors below. */
  oee: number;
  availability: number;
  performance: number;
  quality: number;
  energyKw: number;
  activeAgents: number;
  /** Non-null while the plant is working through a simulated excursion. */
  excursion: Excursion | null;
  tick: number;
}

export interface Excursion {
  kind: 'temperature' | 'vibration' | 'energy';
  /** Ticks remaining before the plant settles back down. */
  remaining: number;
}

const WINDOW = 21;
const TICK_MS = 2000;

/** Nominal operating point each signal is pulled back toward. */
const NOMINAL = { vibration: 3.4, temperature: 174, current: 12.6, energy: 1240 };

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/**
 * Ornstein-Uhlenbeck style step: drift back toward `nominal` plus noise. This is
 * what makes the trace look like a sensor rather than a random number generator.
 */
const drift = (value: number, nominal: number, pull: number, noise: number) =>
  value + (nominal - value) * pull + (Math.random() - 0.5) * noise;

function nextState(prev: PlantState): PlantState {
  let { excursion } = prev;

  // Every so often the plant has a bad stretch, so the demo has something to
  // react to without anyone having to stage it.
  if (!excursion && Math.random() < 0.035) {
    const kinds: Excursion['kind'][] = ['temperature', 'vibration', 'energy'];
    excursion = { kind: kinds[Math.floor(Math.random() * kinds.length)], remaining: 8 + Math.floor(Math.random() * 8) };
  } else if (excursion) {
    excursion = excursion.remaining > 1 ? { ...excursion, remaining: excursion.remaining - 1 } : null;
  }

  const push = (kind: Excursion['kind'], amount: number) =>
    excursion?.kind === kind ? amount : 0;

  const temperature = clamp(
    drift(prev.temperature, NOMINAL.temperature + push('temperature', 6), 0.12, 1.4),
    166,
    186,
  );
  const vibration = clamp(
    drift(prev.vibration, NOMINAL.vibration + push('vibration', 1.6), 0.1, 0.28),
    2.6,
    6.2,
  );
  const current = clamp(
    drift(prev.current, NOMINAL.current + push('energy', 2.4), 0.15, 0.5),
    10.5,
    16.5,
  );

  // Quality degrades as the process drifts off its optimum — the correlation the
  // "temperature vs defect" module claims to analyse.
  const tempPenalty = Math.abs(temperature - NOMINAL.temperature) * 0.42;
  const vibPenalty = Math.max(0, vibration - 3.8) * 1.9;
  const defectRate = clamp(
    drift(prev.defectRate, 1.1 + tempPenalty + vibPenalty, 0.25, 0.35),
    0.4,
    9.5,
  );

  const quality = clamp(100 - defectRate * 1.6, 86, 99.8);
  const performance = clamp(drift(prev.performance, 94 - Math.max(0, vibration - 3.6) * 6, 0.15, 0.9), 72, 99);
  const availability = clamp(drift(prev.availability, excursion ? 91 : 96.5, 0.12, 0.7), 78, 99.5);
  const oee = (availability * performance * quality) / 10000;

  const energyKw = Math.round(clamp(drift(prev.energyKw, NOMINAL.energy + push('energy', 260), 0.18, 45), 900, 1850));

  const reading: SensorData = {
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    line: '포장1라인',
    equipment: '수축포장기-01',
    vibration,
    temperature,
    current_amp: current,
    defect_rate: defectRate,
    status: defectRate > 5 || vibration > 4.6 ? 'danger' : defectRate > 3 || vibration > 4.1 ? 'warning' : 'normal',
  };

  return {
    history: [...prev.history, reading].slice(-WINDOW),
    vibration,
    temperature,
    current,
    defectRate,
    oee,
    availability,
    performance,
    quality,
    energyKw,
    activeAgents: excursion ? 6 : 5 + (Math.random() < 0.8 ? 1 : 0),
    excursion,
    tick: prev.tick + 1,
  };
}

function seed(): PlantState {
  let state: PlantState = {
    history: [],
    vibration: NOMINAL.vibration,
    temperature: NOMINAL.temperature,
    current: NOMINAL.current,
    defectRate: 1.3,
    oee: 0.84,
    availability: 96,
    performance: 93,
    quality: 98,
    energyKw: NOMINAL.energy,
    activeAgents: 6,
    excursion: null,
    tick: 0,
  };
  // Pre-roll so the first paint already shows a populated, settled trace.
  for (let i = 0; i < WINDOW; i++) state = nextState(state);
  return state;
}

let state = seed();
const listeners = new Set<(state: PlantState) => void>();
let timer: ReturnType<typeof setInterval> | null = null;

const start = () => {
  if (timer) return;
  timer = setInterval(() => {
    state = nextState(state);
    listeners.forEach(fn => fn(state));
  }, TICK_MS);
};

const stop = () => {
  if (!timer) return;
  clearInterval(timer);
  timer = null;
};

export const getPlantState = (): PlantState => state;

/** Subscribe to the simulation. The clock only runs while someone is watching. */
export function subscribeToPlant(fn: (state: PlantState) => void): () => void {
  listeners.add(fn);
  start();
  return () => {
    listeners.delete(fn);
    if (listeners.size === 0) stop();
  };
}

/**
 * Deterministic pseudo-random in [0,1) from a string seed, so per-module charts
 * differ from each other but stay stable across re-renders of the same module.
 */
export function seededUnit(key: string, salt = 0): number {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

/**
 * A series that breathes with the simulation: the shape stays recognisable per
 * `key`, while the amplitude follows the plant's current condition.
 */
export function livingSeries(key: string, length: number, base: number, spread: number): number[] {
  const { tick, defectRate } = state;
  const stress = 1 + Math.min(1, defectRate / 6);
  return Array.from({ length }, (_, i) => {
    const wave = Math.sin((tick * 0.35 + i * 0.9 + seededUnit(key, i) * 6.28) % 6.28);
    return Math.max(0, base + wave * spread * 0.5 * stress + (seededUnit(key, i + 99) - 0.5) * spread * 0.4);
  });
}
