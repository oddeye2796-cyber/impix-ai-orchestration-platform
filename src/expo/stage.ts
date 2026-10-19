/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useSyncExternalStore } from 'react';
import type { Excursion } from '../services/telemetry';

/*
 * The case the booth director is playing, shared with the engineer's screens
 * so the control hierarchy and the agent-coordination replay show the same
 * event the worker sees on the floor map, at an engineer's level of detail:
 * which agent leads it, what each agent it calls in is working on, and how
 * their positions were argued out into a decision. Outside the booth build
 * nothing is staged and those screens run their own generic loops.
 */

export type StageAgent = 'quality' | 'pm' | 'safety' | 'production' | 'energy' | 'logistics';

export interface StageCoordination {
  title: string;
  description: string;
  /** Coordination ids: prod, qual, pm, energy, safety, logistics, supervisor. */
  timeline: { fromAgent: string; toAgent: 'supervisor' | 'all'; type: 'proposal' | 'critique' | 'info' | 'agreement'; content: string; reasoning?: string }[];
}

export interface StagedCase {
  kind: Excursion['kind'];
  /** Where the demo is in the case: not started, unfolding, or dealt with. */
  phase: 'before' | 'live' | 'after';
  /** The agent that owns the event, shown as escalated to the supervisor. */
  lead: StageAgent;
  leadTitle: string;
  leadNote: string;
  /** What each agent the supervisor called in is doing for this case. */
  team: Partial<Record<StageAgent, string>>;
  coordination: StageCoordination;
}

interface StageState {
  staged: StagedCase | null;
  /** Bumped to ask the engineer screen to show (and replay) the coordination. */
  replay: number;
}

let state: StageState = { staged: null, replay: 0 };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(fn => fn());

export function setStagedCase(staged: StagedCase | null) {
  state = { ...state, staged };
  emit();
}

/** Switch the engineer screen to the coordination replay of the staged case, from its start. */
export function replayCoordination() {
  state = { ...state, replay: state.replay + 1 };
  emit();
}

export function useStage(): StageState {
  return useSyncExternalStore(
    fn => { listeners.add(fn); return () => listeners.delete(fn); },
    () => state,
  );
}

/** The staged case outside React, for the chat assistant's fact sheet. */
export const getStagedCase = (): StagedCase | null => state.staged;
