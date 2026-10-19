/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * What changes from one plant to the next: the floor layout the field view
 * draws, which zone each agent's work lands in, and the numbers the results
 * summary turns hours into money with.
 *
 * Each site gets its own profile with its line layout and cost figures;
 * `ACTIVE_SITE` picks one and nothing else in the app needs to change. A
 * profile with a `floor` plan is drawn in 3D; the zone boxes stay as the 2D
 * fallback. Layouts here are generalised, never copied from a customer's
 * drawing: the repository is public.
 *
 * Copy is written in Korean and translated where it is rendered with `t()`.
 */

import { PHARMA_SITE } from './pharmaSite';
import { IS_EXPO } from './edition';

export type AgentKey = 'quality' | 'pm' | 'safety' | 'production' | 'energy' | 'logistics';

export interface SiteZone {
  id: string;
  name: string;
  /** Main equipment in the zone, shown on the floor map. */
  equipment: string;
  /** Position and size on the floor map, in % of the map box. */
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A rectangle on the plant floor, in metres. x runs west → east, z north → south. */
export interface FloorRect {
  x: number;
  z: number;
  w: number;
  d: number;
}

export interface FloorRoom extends FloorRect {
  id: string;
  /** Room name, e.g. 'PTP 1라인'. */
  label: string;
  kind: 'room' | 'corridor' | 'storage' | 'warehouse';
  /** Zone the room belongs to; rooms without one are drawn as context only. */
  zoneId?: string;
}

export interface FloorEquipment extends FloorRect {
  /** Height in metres. */
  h: number;
  kind: 'machine' | 'robot' | 'rack' | 'filler';
  label?: string;
  zoneId?: string;
}

export interface FloorPath {
  /** Polyline in metres, [x, z] pairs. */
  points: [number, number][];
  /** A fixed conveyor, or the route an AMR drives. */
  kind: 'conveyor' | 'amr';
  zoneId?: string;
}

/** A floor plan for the 3D map. */
export interface FloorPlan {
  rooms: FloorRoom[];
  equipment: FloorEquipment[];
  paths: FloorPath[];
  /** Where each zone's name tag sits, in metres. */
  anchors: Record<string, [number, number]>;
  /**
   * Where a zone's card (speech bubble and what happened) points when something
   * is going on there. The card rises north of this point, so it is placed where
   * covering the neighbouring zone hides no name tag.
   */
  callouts: Record<string, [number, number]>;
}

export interface SiteProfile {
  id: string;
  name: string;
  zones: SiteZone[];
  /** Floor plan for the 3D map; without one the 2D zone map is shown. */
  floor?: FloorPlan;
  /** Zone an agent's incidents are pinned to when the event names no equipment. */
  agentZone: Record<AgentKey, string>;
  /** Zone for a piece of equipment named in an AI decision. */
  equipmentZone: Record<string, string>;
  /** Lost margin per hour of line stoppage, in KRW. Used for the savings estimate. */
  downtimeCostPerHour: number;
}

export const DEMO_SITE: SiteProfile = {
  id: 'demo',
  name: '전시 데모 공장',
  zones: [
    { id: 'washing', name: '세척실', equipment: '세척기 No.11/12', x: 3, y: 4, w: 30, h: 34 },
    { id: 'ptp3', name: 'PTP III 포장실', equipment: 'PTP 실러 1 · 카토너', x: 36, y: 4, w: 61, h: 34 },
    { id: 'corridor', name: '이송 통로', equipment: 'AMR 이송 라인', x: 3, y: 42, w: 94, h: 12 },
    { id: 'control', name: '중앙 관제실', equipment: 'AI 슈퍼바이저 서버', x: 3, y: 58, w: 22, h: 38 },
    { id: 'ptp1', name: '포장1라인', equipment: '수축포장기-01 · 케이스패커-02', x: 28, y: 58, w: 42, h: 38 },
    { id: 'storage', name: '포장라인 보관실', equipment: 'ESS 120kW · AMR 충전 도크', x: 73, y: 58, w: 24, h: 38 },
  ],
  agentZone: {
    quality: 'ptp1',
    pm: 'ptp1',
    safety: 'washing',
    production: 'ptp3',
    energy: 'storage',
    logistics: 'corridor',
  },
  equipmentZone: {
    '수축포장기-01': 'ptp1',
    '케이스패커-02': 'ptp1',
    '포장1라인': 'ptp1',
  },
  downtimeCostPerHour: 3_000_000,
};

const SITES: Record<string, SiteProfile> = { demo: DEMO_SITE, pharma: PHARMA_SITE };

/**
 * The plant this deployment shows: the packaging hall with the 3D floor plan,
 * unless the URL asks for another (`?site=demo` for the earlier demo plant).
 */
function pickSite(): SiteProfile {
  let requested: string | null = null;
  try { requested = new URLSearchParams(window.location.search).get('site'); } catch { /* no window */ }
  const site = (requested && SITES[requested]) || PHARMA_SITE;
  // At a trade show the hall is introduced as a demo plant, not a named site.
  return IS_EXPO ? { ...site, name: '전시 데모 공장' } : site;
}

export const ACTIVE_SITE: SiteProfile = pickSite();
