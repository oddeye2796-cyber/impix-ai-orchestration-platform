/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * What changes from one plant to the next: the floor layout the field view
 * draws, which zone each agent's work lands in, and the numbers the results
 * summary turns hours into money with.
 *
 * Only the demo plant is defined here. A customer site (한국기능공사, 한독)
 * gets its own profile built from its real line layout and cost figures, and
 * `ACTIVE_SITE` points at it; nothing else in the app needs to change.
 *
 * Copy is written in Korean and translated where it is rendered with `t()`.
 */

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

export interface SiteProfile {
  id: string;
  name: string;
  zones: SiteZone[];
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
    { id: 'washing', name: '세척실 [2102]', equipment: '세척기 No.11/12', x: 3, y: 4, w: 30, h: 34 },
    { id: 'ptp3', name: 'PTP III 포장실 [2112/2118]', equipment: 'PTP 실러 1 · 카토너', x: 36, y: 4, w: 61, h: 34 },
    { id: 'corridor', name: '이송 통로 [2111]', equipment: 'AMR 이송 라인', x: 3, y: 42, w: 94, h: 12 },
    { id: 'control', name: '중앙 관제실', equipment: 'AI 슈퍼바이저 서버', x: 3, y: 58, w: 22, h: 38 },
    { id: 'ptp1', name: '포장1라인 [2109]', equipment: '수축포장기-01 · 케이스패커-02', x: 28, y: 58, w: 42, h: 38 },
    { id: 'storage', name: '포장라인 보관실 [2129]', equipment: 'ESS 120kW · AMR 충전 도크', x: 73, y: 58, w: 24, h: 38 },
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

export const ACTIVE_SITE: SiteProfile = DEMO_SITE;
