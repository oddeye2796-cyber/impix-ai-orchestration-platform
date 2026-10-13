/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { FloorEquipment, FloorPath, FloorRoom, SiteProfile } from './siteProfile';

/*
 * A pharmaceutical packaging hall, laid out for the platform rather than
 * copied from any customer drawing: five packaging lines side by side in
 * 6 m bays, an automated warehouse to the east, utility rooms to the west and
 * an AMR aisle along the south. Only equipment the AIs act on is drawn.
 *
 * Metres; x runs east, z runs south, origin at the hall's north-west corner.
 */

const BAY = 6;
const LINE_END = 21;

const rooms: FloorRoom[] = [
  { id: 'washing', label: '세척실', kind: 'room', zoneId: 'washing', x: 0, z: 0, w: 6, d: 7 },
  { id: 'control', label: '관제실', kind: 'room', zoneId: 'control', x: 0, z: 7, w: 6, d: 7 },
  { id: 'storage', label: '유틸리티실', kind: 'storage', zoneId: 'storage', x: 0, z: 14, w: 6, d: 8 },
  { id: 'bottle1', label: '병 포장 1라인', kind: 'room', zoneId: 'bottle1', x: 6, z: 0, w: BAY, d: 22 },
  { id: 'ptp3', label: 'PTP 3라인', kind: 'room', zoneId: 'ptp3', x: 12, z: 0, w: BAY, d: 22 },
  { id: 'ptp2', label: 'PTP 2라인', kind: 'room', zoneId: 'ptp2', x: 18, z: 0, w: BAY, d: 22 },
  { id: 'ptp1', label: 'PTP 1라인', kind: 'room', zoneId: 'ptp1', x: 24, z: 0, w: BAY, d: 22 },
  { id: 'bottle2', label: '병 포장 2라인', kind: 'room', zoneId: 'bottle2', x: 30, z: 0, w: BAY, d: 22 },
  { id: 'warehouse', label: '자동창고', kind: 'warehouse', zoneId: 'warehouse', x: 36, z: 0, w: 12, d: 22 },
  { id: 'aisle', label: 'AMR 이송 통로', kind: 'corridor', zoneId: 'corridor', x: 0, z: 22, w: 48, d: 5 },
];

/**
 * One packaging line running north to south down its bay: the primary
 * packaging machine, a cartoner, the case packer, a sealer, the label
 * applicator, and the palletizing robot at the aisle end.
 */
function line(zoneId: string, bayX: number, names: { primary: string; sealer: string; packer: string; bottle?: boolean }): { equipment: FloorEquipment[]; path: FloorPath } {
  const cx = bayX + BAY / 2;
  const col = (z: number, d: number, w: number, h: number, kind: FloorEquipment['kind'], label: string): FloorEquipment =>
    ({ x: cx - w / 2, z, w, d, h, kind, label, zoneId });
  return {
    equipment: [
      col(1.2, 6.5, 2.0, 2.0, names.bottle ? 'filler' : 'machine', names.primary),
      col(8.5, 3.5, 1.6, 1.6, 'machine', '카토너'),
      col(12.6, 1.8, 2.2, 2.0, 'machine', names.packer),
      col(15.0, 1.3, 1.6, 1.6, 'machine', names.sealer),
      col(16.8, 1.2, 1.6, 1.5, 'machine', '라벨 부착기'),
      col(LINE_END - 2.6, 3.0, 3.0, 2.2, 'robot', '로봇 팔레타이저'),
    ],
    path: { kind: 'conveyor', zoneId, points: [[cx, 1.2], [cx, LINE_END - 2.6]] },
  };
}

const lines = [
  line('bottle1', 6, { primary: '병 충전·캡핑기', sealer: '상부 봉합기', packer: '자동 케이스 포장기', bottle: true }),
  line('ptp3', 12, { primary: 'PTP 포장기', sealer: '상부 봉합기', packer: '자동 케이스 포장기' }),
  line('ptp2', 18, { primary: 'PTP 포장기', sealer: '상부 봉합기', packer: '자동 케이스 포장기' }),
  line('ptp1', 24, { primary: 'PTP 포장기', sealer: '수축포장기-01', packer: '케이스패커-02' }),
  line('bottle2', 30, { primary: '병 충전·캡핑기', sealer: '상부 봉합기', packer: '자동 케이스 포장기', bottle: true }),
];

/** Seven stacker-crane racks, running north to south. */
const racks: FloorEquipment[] = [37, 38.4, 40.2, 41.6, 43.4, 44.8, 46.2]
  .map(x => ({ x, z: 1, w: 1.2, d: 17, h: 4.5, kind: 'rack' as const, zoneId: 'warehouse' }));

const equipment: FloorEquipment[] = [
  ...lines.flatMap(l => l.equipment),
  ...racks,
  { x: 1, z: 2, w: 2.4, d: 3, h: 2.0, kind: 'machine', label: '세척기 No.11/12', zoneId: 'washing' },
  { x: 1, z: 9, w: 2.0, d: 1.2, h: 2.0, kind: 'machine', label: 'AI 슈퍼바이저 서버', zoneId: 'control' },
  { x: 1, z: 15.5, w: 3.6, d: 2.0, h: 2.0, kind: 'machine', label: 'ESS 120kW', zoneId: 'storage' },
  { x: 1, z: 19, w: 4.0, d: 1.6, h: 0.3, kind: 'machine', label: 'AMR 충전 도크', zoneId: 'storage' },
];

const paths: FloorPath[] = [
  ...lines.map(l => l.path),
  // Warehouse outfeed, down to the aisle.
  { kind: 'conveyor', zoneId: 'warehouse', points: [[39.3, 19], [39.3, 23.5], [36, 23.5]] },
  // AMRs bring materials along the aisle to the line ends and charge in the utility room.
  { kind: 'amr', zoneId: 'corridor', points: [[35, 25.2], [4, 25.2], [4, 21]] },
  { kind: 'amr', zoneId: 'corridor', points: [[9, 23.5], [33, 23.5]] },
];

export const PHARMA_SITE: SiteProfile = {
  id: 'pharma',
  name: '제약 포장동',
  zones: [
    { id: 'washing', name: '세척실', equipment: '세척기 No.11/12', x: 2, y: 3, w: 15, h: 22 },
    { id: 'control', name: '관제실', equipment: 'AI 슈퍼바이저 서버', x: 2, y: 27, w: 15, h: 22 },
    { id: 'storage', name: '유틸리티실', equipment: 'ESS 120kW · AMR 충전 도크', x: 2, y: 51, w: 15, h: 26 },
    { id: 'bottle1', name: '병 포장 1라인', equipment: '병 충전·캡핑기 · 팔레타이저', x: 19, y: 3, w: 11.5, h: 74 },
    { id: 'ptp3', name: 'PTP 3라인', equipment: 'PTP 포장기 · 카토너', x: 31.5, y: 3, w: 11.5, h: 74 },
    { id: 'ptp2', name: 'PTP 2라인', equipment: 'PTP 포장기 · 카토너', x: 44, y: 3, w: 11.5, h: 74 },
    { id: 'ptp1', name: 'PTP 1라인', equipment: '수축포장기-01 · 케이스패커-02', x: 56.5, y: 3, w: 11.5, h: 74 },
    { id: 'bottle2', name: '병 포장 2라인', equipment: '병 충전·캡핑기 · 팔레타이저', x: 69, y: 3, w: 11.5, h: 74 },
    { id: 'warehouse', name: '자동창고', equipment: '스태커 크레인 · 출고 컨베이어', x: 81.5, y: 3, w: 16.5, h: 74 },
    { id: 'corridor', name: 'AMR 이송 통로', equipment: 'AMR 이송 라인', x: 2, y: 80, w: 96, h: 17 },
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
  floor: {
    rooms,
    equipment,
    paths,
    // Name tags alternate between two rows so the narrow bays don't overlap.
    anchors: {
      washing: [3, 3.5],
      control: [3, 10.5],
      storage: [3, 14.8],
      bottle1: [9, 3],
      ptp3: [15, 6.5],
      ptp2: [21, 3],
      ptp1: [27, 6.5],
      bottle2: [33, 3],
      warehouse: [42, 10],
      corridor: [20, 25.2],
    },
    callouts: {
      washing: [3, 4],
      control: [3, 11],
      storage: [3, 18],
      bottle1: [9, 19],
      ptp3: [15, 19],
      ptp2: [21, 19],
      ptp1: [27, 19],
      bottle2: [33, 19],
      warehouse: [42, 12],
      corridor: [20, 24.5],
    },
  },
};
