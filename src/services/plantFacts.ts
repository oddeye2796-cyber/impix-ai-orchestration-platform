/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { AgentDecision } from '../types';
import { breathe, getPlantState, type PlantState } from './telemetry';
import { getStagedCase } from '../expo/stage';
import { AGENT_STYLE, INCIDENT_STAGES, incidentSnapshot } from '../components/RoleViews';

/*
 * The plant fact sheet: one place that holds every figure the screens show,
 * so the charts and the chat assistant can never disagree. The module charts
 * read their tables from here, and the assistant answers from `buildPlantFacts`
 * (word for word in demo mode, as grounding for the model in live mode).
 */

/** Targets and limits the screens draw as reference lines. */
export const OEE_TARGET = 85;
export const YIELD_TARGET = 95;
export const CONTRACT_KW = 1600;
/** Health score bands on the equipment-status chart. */
export const HEALTH_WARN = 70;
export const HEALTH_DANGER = 50;
/** Sensor bands the dashboard colours its status with (see telemetry). */
export const DEFECT_WARN = 3;
export const DEFECT_DANGER = 5;
export const VIBRATION_WARN = 4.1;
export const VIBRATION_DANGER = 4.6;

/** A chart figure: the value it oscillates around and its oscillation slot. */
type Live = readonly [base: number, slot: number];

/** The packaging line's main machines: health score and power draw (idle, and running unless metered live). */
export const EQUIPMENT: { name: string; health: Live; run?: Live; idle: Live }[] = [
  { name: '수축포장기-01', health: [72, 112], idle: [0.6, 340] },
  { name: '케이스패커-02', health: [58, 113], run: [5.2, 341], idle: [1.9, 342] },
  { name: '컨베이어-04', health: [88, 114], run: [3.1, 343], idle: [0.2, 344] },
  { name: '로봇팔-02', health: [91, 115], run: [2.4, 345], idle: [0.3, 346] },
  { name: '모터-08', health: [46, 116], run: [4.6, 347], idle: [0.4, 348] },
];

/** Defects found today, by type; 기타 always sorts last. */
export const DEFECT_TYPES: { name: string; count: Live }[] = [
  { name: '찢김', count: [35, 83] },
  { name: '기포', count: [25, 84] },
  { name: '변색', count: [20, 85] },
  { name: '라벨누락', count: [15, 86] },
];
export const DEFECT_OTHER: Live = [5, 87];

export const BATCH_YIELD: { batch: string; yield: Live }[] = [
  { batch: 'B001', yield: [98.2, 102] },
  { batch: 'B002', yield: [94.5, 103] },
  { batch: 'B003', yield: [99.1, 104] },
  { batch: 'B004', yield: [88.4, 105] },
  { batch: 'B005', yield: [97.8, 106] },
];

/** Today's plant load by hour, against the contract power. */
export const PEAK_LOAD: { time: string; load: Live }[] = [
  { time: '10:00', load: [1180, 142] },
  { time: '11:00', load: [1290, 144] },
  { time: '12:00', load: [1420, 146] },
  { time: '13:00', load: [1650, 148] },
  { time: '14:00', load: [1450, 150] },
  { time: '15:00', load: [1310, 152] },
];

/** Today's electricity bill by time band, in KRW. */
export const ENERGY_COST: { time: string; cost: Live }[] = [
  { time: '00-06', cost: [1_200_000, 138] },
  { time: '06-12', cost: [3_500_000, 139] },
  { time: '12-18', cost: [4_200_000, 140] },
  { time: '18-24', cost: [2_800_000, 141] },
];

/** Emergency stops this month, by cause. */
export const EMERGENCY_STOPS: { cause: string; count: Live | 0 }[] = [
  { cause: '화재', count: [1, 171] },
  { cause: '충돌', count: [4, 172] },
  { cause: '수동', count: [2, 173] },
  { cause: '시스템', count: 0 },
];

/** Shrink wrapper power from its metered current: P = √3 × 380 V × I × PF 0.9. */
export const wrapperKw = (amps: number) => Number((1.732 * 0.38 * amps * 0.9).toFixed(1));

/* ----------------------------------------------------------- work orders */

export interface WorkOrder {
  id: string;
  asset: string;
  type: string;
  priority: string;
  status: string;
  user: string;
}

let workOrders: WorkOrder[] = [
  { id: 'WO-2024-001', asset: '수축포장기-01', type: 'Preventive', priority: 'Medium', status: 'In Progress', user: 'Kim Tech' },
  { id: 'WO-2024-002', asset: '로봇팔-02', type: 'Corrective', priority: 'High', status: 'Pending', user: 'Lee Eng' },
  { id: 'WO-2024-003', asset: '컨베이어-04', type: 'Inspection', priority: 'Low', status: 'Completed', user: 'Park Maint' },
  { id: 'WO-2024-004', asset: '모터-08', type: 'Corrective', priority: 'Urgent', status: 'Pending', user: 'Choi Tech' },
];

export const getWorkOrders = (): WorkOrder[] => workOrders;
/** The work-order screen reports its list here, so the assistant sees orders raised or moved on it. */
export const setWorkOrders = (next: WorkOrder[]) => { workOrders = next; };

/* ------------------------------------------------- the operator's queue */

let decisions: AgentDecision[] = [];
/** The app reports the AI proposals list here whenever it changes. */
export const setFactDecisions = (next: AgentDecision[]) => { decisions = next; };

/* ------------------------------------------------------------ the sheet */

export type Status = '정상' | '주의' | '위험';

const band = (value: number, warn: number, danger: number, higherIsWorse = true): Status =>
  higherIsWorse
    ? value > danger ? '위험' : value > warn ? '주의' : '정상'
    : value < danger ? '위험' : value < warn ? '주의' : '정상';

export interface PlantFacts {
  kpi: {
    oee: number; availability: number; performance: number; quality: number; oeeTarget: number;
    defectRate: number; defectStatus: Status;
    energyKw: number; contractKw: number; contractPct: number;
    activeAgents: number;
  };
  sensors: { equipment: string; vibration: number; vibrationStatus: Status; temperature: number; current: number };
  equipment: { name: string; health: number; status: Status; runKw: number; idleKw: number }[];
  defects: { name: string; count: number; cumPct: number }[];
  defectTotal: number;
  batches: { batch: string; yield: number; belowTarget: boolean }[];
  peakLoad: { time: string; kw: number; over: boolean }[];
  energyCost: { time: string; krw: number }[];
  emergencyStops: { cause: string; count: number }[];
  workOrders: WorkOrder[];
  approvals: { agent: string; equipment: string; action: string; value: string; level: number; reasoning: string }[];
  incidents: {
    open: { title: string; action: string; stage: string; agent: string; task: string | null; time: string }[];
    resolvedToday: { title: string; action: string; agent: string; time: string; hours: number }[];
  };
  stagedCase: { title: string; note: string; lead: string; phase: 'before' | 'live' | 'after'; team: { agent: string; task: string }[] } | null;
}

const round = (value: number, digits = 1) => Number(value.toFixed(digits));

/** Every figure on the screens right now, computed exactly as the screens compute it. */
export function buildPlantFacts(plant: PlantState = getPlantState()): PlantFacts {
  const live = ([base, slot]: Live) => breathe(base, slot, plant.tick, plant.defectRate);

  const equipment = EQUIPMENT.map(e => {
    const health = Math.round(live(e.health));
    return {
      name: e.name,
      health,
      status: band(health, HEALTH_WARN, HEALTH_DANGER, false),
      runKw: e.run ? round(live(e.run)) : wrapperKw(plant.current),
      idleKw: round(live(e.idle)),
    };
  });

  const counted = DEFECT_TYPES.map(d => ({ name: d.name, count: Math.round(live(d.count)) }))
    .sort((a, b) => b.count - a.count);
  counted.push({ name: '기타', count: Math.round(live(DEFECT_OTHER)) });
  const defectTotal = counted.reduce((sum, d) => sum + d.count, 0) || 1;
  let running = 0;
  const defects = counted.map(d => {
    running += d.count;
    return { ...d, cumPct: round((running / defectTotal) * 100) };
  });

  const openIncidents = incidentSnapshot(plant, decisions);
  const staged = getStagedCase();

  return {
    kpi: {
      oee: round(plant.oee),
      availability: round(plant.availability),
      performance: round(plant.performance),
      quality: round(plant.quality),
      oeeTarget: OEE_TARGET,
      defectRate: round(plant.defectRate, 2),
      defectStatus: band(plant.defectRate, DEFECT_WARN, DEFECT_DANGER),
      energyKw: plant.energyKw,
      contractKw: CONTRACT_KW,
      contractPct: round((plant.energyKw / CONTRACT_KW) * 100, 0),
      activeAgents: plant.activeAgents,
    },
    sensors: {
      equipment: '수축포장기-01',
      vibration: round(plant.vibration, 2),
      vibrationStatus: band(plant.vibration, VIBRATION_WARN, VIBRATION_DANGER),
      temperature: round(plant.temperature),
      current: round(plant.current),
    },
    equipment,
    defects,
    defectTotal,
    batches: BATCH_YIELD.map(b => {
      const value = Math.min(100, live(b.yield));
      return { batch: b.batch, yield: value, belowTarget: value < YIELD_TARGET };
    }),
    peakLoad: PEAK_LOAD.map(p => {
      const kw = Math.round(live(p.load));
      return { time: p.time, kw, over: kw > CONTRACT_KW };
    }),
    energyCost: ENERGY_COST.map(c => ({ time: c.time, krw: Math.round(live(c.cost)) })),
    emergencyStops: EMERGENCY_STOPS.map(s => ({ cause: s.cause, count: s.count === 0 ? 0 : Math.round(live(s.count)) })),
    workOrders: getWorkOrders(),
    approvals: decisions.filter(d => d.status === 'pending').map(d => ({
      agent: d.agent,
      equipment: d.target_equipment,
      action: d.action,
      value: String(d.recommended_value),
      level: d.level,
      reasoning: d.reasoning,
    })),
    incidents: {
      open: openIncidents.filter(i => i.stage < 4).map(i => ({
        title: i.title, action: i.action, stage: INCIDENT_STAGES[i.stage], agent: AGENT_STYLE[i.agent].name, task: i.task, time: i.time,
      })),
      resolvedToday: openIncidents.filter(i => i.stage === 4).map(i => ({
        title: i.title, action: i.action, agent: AGENT_STYLE[i.agent].name, time: i.time, hours: i.hours,
      })),
    },
    stagedCase: staged ? {
      title: staged.leadTitle,
      note: staged.leadNote,
      lead: AGENT_STYLE[staged.lead].name,
      phase: staged.phase,
      team: Object.entries(staged.team).map(([agent, task]) => ({ agent: AGENT_STYLE[agent as keyof typeof AGENT_STYLE].name, task: task as string })),
    } : null,
  };
}
