/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy, useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Briefcase,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Coins,
  Gauge,
  HardHat,
  MapPin,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  Truck,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { formatTime, getLocaleTag, t, useI18n } from '../i18n';
import type { AgentDecision } from '../types';
import type { Excursion, PlantState } from '../services/telemetry';
import { ACTIVE_SITE, type AgentKey } from '../config/siteProfile';
import { EXPO, IS_EXPO } from '../config/edition';
import ErrorBoundary from './ErrorBoundary';
import type { FloorOrchestrationState } from './FloorOrchestration';
import { ApprovalGate } from './AccessGate';

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

/* ------------------------------------------------------------------ roles */

export type ViewerRole = 'worker' | 'manager' | 'engineer';

export const VIEWER_ROLES: { id: ViewerRole; label: string; hint: string; icon: React.ReactNode }[] = [
  { id: 'worker', label: '현장 작업자·반장', hint: '어디서, 뭐가, 내가 할 일', icon: <HardHat size={15} /> },
  { id: 'manager', label: '공장장·경영진', hint: '오늘 AI가 만든 결과 요약', icon: <Briefcase size={15} /> },
  { id: 'engineer', label: '설비·IT 엔지니어', hint: '슈퍼바이저 → 에이전트 → ML/DL 근거', icon: <Wrench size={15} /> },
];

const ROLE_STORAGE_KEY = 'impix.viewerRole';

/** The viewer's role, remembered per browser so a line tablet stays on the field view. */
export function useViewerRole(): [ViewerRole, (role: ViewerRole) => void] {
  const [role, setRole] = useState<ViewerRole>(() => {
    try {
      const saved = localStorage.getItem(ROLE_STORAGE_KEY);
      if (saved === 'worker' || saved === 'manager' || saved === 'engineer') return saved;
    } catch { /* storage unavailable: fall through to the default */ }
    return 'worker';
  });
  const update = (next: ViewerRole) => {
    setRole(next);
    try { localStorage.setItem(ROLE_STORAGE_KEY, next); } catch { /* keep it for this session only */ }
  };
  return [role, update];
}

export function RoleSwitcher({ role, onChange }: { role: ViewerRole; onChange: (role: ViewerRole) => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div role="tablist" aria-label={t('보는 사람')} className="flex flex-wrap gap-1 rounded-xl border border-border bg-surface p-1">
        {VIEWER_ROLES.map(r => (
          <button
            key={r.id}
            role="tab"
            aria-selected={role === r.id}
            data-testid={`role-${r.id}`}
            onClick={() => onChange(r.id)}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-left transition-colors",
              role === r.id ? "bg-accent/15 text-accent" : "text-text-secondary hover:bg-surface-hover hover:text-text-primary",
            )}
          >
            {r.icon}
            <span>
              <span className="block text-xs font-bold">{t(r.label)}</span>
              <span className="block text-[10px] opacity-80">{t(r.hint)}</span>
            </span>
          </button>
        ))}
      </div>
      <span className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-[10px] font-bold text-text-secondary">
        <MapPin size={11} /> {t('현장')} · {t(ACTIVE_SITE.name)}
      </span>
    </div>
  );
}

/* -------------------------------------------------------------- incidents */

/** 감지 → 분석 → 조치 제안 → 승인 대기 → 해결, like a parcel tracker. */
export const INCIDENT_STAGES = ['감지', '분석', '조치 제안', '승인 대기', '해결'] as const;

export interface Incident {
  id: string;
  zoneId: string;
  agent: AgentKey;
  /** What happened, where: one short line. */
  title: string;
  /** What the AI is doing or proposes. */
  action: string;
  /** What the person on the line should do, if anything. */
  task: string | null;
  stage: 0 | 1 | 2 | 3 | 4;
  /** Line stoppage the action prevents (or prevented), in hours. */
  hours: number;
  /** Savings on top of avoided downtime (e.g. a demand-charge penalty), in KRW. */
  extraKrw: number;
  time: string;
  /** Index into the decision list when the incident waits on a human approval. */
  decisionIndex?: number;
}

export const AGENT_STYLE: Record<AgentKey, { name: string; hex: string; icon: React.ReactNode }> = {
  quality: { name: '품질 AI', hex: '#10b981', icon: <ShieldCheck size={12} /> },
  pm: { name: '예지보전 AI', hex: '#8b5cf6', icon: <Wrench size={12} /> },
  safety: { name: '안전 AI', hex: '#ef4444', icon: <ShieldAlert size={12} /> },
  production: { name: '생산 AI', hex: '#3b82f6', icon: <TrendingUp size={12} /> },
  energy: { name: '에너지 AI', hex: '#f97316', icon: <Zap size={12} /> },
  logistics: { name: '물류 AI', hex: '#eab308', icon: <Truck size={12} /> },
};

const DECISION_AGENT: Record<string, AgentKey> = {
  'Quality Agent': 'quality',
  'PM Agent': 'pm',
  'Safety Agent': 'safety',
  'Production Agent': 'production',
  'Line Monitor Agent': 'production',
  'Energy Agent': 'energy',
  'Logistics Agent': 'logistics',
};

/** Plain-language copy for each kind of AI proposal. */
const DECISION_COPY: Record<string, { title: string; action: string; task: string; hours: number; extraKrw?: number }> = {
  adjust_temperature: { title: '불량률 상승 조짐', action: '실링 온도를 {value}로 조정', task: '승인 후 첫 10개 제품 실링 상태 확인', hours: 1 },
  replace_bearing: { title: '베어링 마모 진행', action: '다음 계획 정지 때 베어링 교체', task: '교체 베어링 재고 확인, 정비 일정 확정', hours: 4 },
  inspect_bearing: { title: '베어링 진동 임계치 초과', action: '다음 정지 때 베어링 점검 예약', task: '모터 소음·발열 육안 점검', hours: 4 },
  lubricator_operation: { title: '진동 상승 추세', action: '자동 급유 선행 가동', task: '급유기 오일 잔량 확인', hours: 2 },
  load_balance: { title: '피크 전력 접근', action: '비핵심 부하 분산', task: '공조·컴프레서 부하 이전 확인', hours: 0.5, extraKrw: 4_000_000 },
  approve_overtime: { title: '긴급 오더 대응 계획', action: '야간 잔업 편성 후 고객에게 납기 확정 회신', task: '야간 조 인원 확정', hours: 0, extraKrw: 8_000_000 },
  recall_shipped: { title: '공급사 로트 불량', action: '이미 출하된 2개 팔레트 회수, 공급사에 클레임 제기', task: '회수 대상 거래처 연락', hours: 0, extraKrw: 6_000_000 },
  switch_supplier: { title: '원자재 입고 지연', action: '대체 공급사에 필름 긴급 발주', task: '긴급 입고분 수입 검사 일정 확인', hours: 2 },
};

/** Live excursions, written for the line. */
const EXCURSION_COPY: Record<NonNullable<PlantState['excursion']>['kind'], Omit<Incident, 'id' | 'stage' | 'time'>> = {
  temperature: {
    zoneId: 'ptp1', agent: 'quality',
    title: '수축포장기-01 실링 온도 상승',
    action: '실링 온도 2°C 하향, 라인 속도 5% 감속',
    task: '실링부 열판 상태 육안 확인',
    hours: 1.5, extraKrw: 0,
  },
  vibration: {
    zoneId: 'ptp1', agent: 'pm',
    title: '수축포장기-01 메인 모터 진동 급상승',
    action: '감속 운전 유지, 다음 정지 때 베어링 점검',
    task: '모터 베어링 소음·발열 점검',
    hours: 4, extraKrw: 0,
  },
  rush_order: {
    zoneId: 'ptp3', agent: 'production',
    title: '긴급 오더 3만 개 접수 (내일 18시 납기)',
    action: '라인 3·4 작업 순서 재배치, 자재 선출고',
    task: '라인 3 품목 전환 준비',
    hours: 0, extraKrw: 20_000_000,
  },
  mass_defect: {
    zoneId: 'ptp1', agent: 'quality',
    title: '포장 1·2라인 인쇄 불량 급증 (불량률 6.8%)',
    action: '문제 필름 로트 사용 중지·격리, 의심 제품 출하 보류',
    task: '보류 팔레트 표시 확인',
    hours: 3, extraKrw: 15_000_000,
  },
  supply_delay: {
    zoneId: ACTIVE_SITE.zones.some(z => z.id === 'warehouse') ? 'warehouse' : 'storage', agent: 'logistics',
    title: '포장 필름 입고 6시간 지연 통보',
    action: '재고 있는 품목부터 생산 순서 변경',
    task: '창고 대체 자재 위치 확인',
    hours: 6, extraKrw: 0,
  },
  energy: {
    zoneId: 'storage', agent: 'energy',
    title: '피크 전력 계약치 92% 도달',
    action: 'ESS 120kW 방전, 공조 부하 이전',
    task: '비핵심 설비 대기 모드 전환 확인',
    hours: 0, extraKrw: 12_000_000,
  },
};

/** What the AI already handled earlier today on the demo plant. */
const EARLIER_TODAY: Incident[] = [
  { id: 'h1', zoneId: 'ptp1', agent: 'pm', title: '케이스패커-02 감속기 토크 이상', action: '야간 정지 시간에 감속기 점검 완료', task: null, stage: 4, hours: 6, extraKrw: 0, time: '06:20' },
  { id: 'h2', zoneId: 'ptp3', agent: 'production', title: 'PTP 실러 1 필름 장력 이상', action: '장력 자동 보정, 정지 없이 생산 유지', task: null, stage: 4, hours: 2, extraKrw: 0, time: '08:45' },
  { id: 'h3', zoneId: 'washing', agent: 'safety', title: '세척실 바닥 누수로 미끄럼 위험', action: '구역 출입 통제, 청소 작업 지시 완료', task: null, stage: 4, hours: 0, extraKrw: 0, time: '09:30' },
  { id: 'h4', zoneId: 'corridor', agent: 'logistics', title: 'AMR 2대 충전 대기로 자재 공급 지연', action: '충전 순서 재배치, 공급 간격 단축', task: null, stage: 4, hours: 1, extraKrw: 0, time: '10:10' },
];

/** Live excursions that have ended, kept for the rest of the session. */
const clearedExcursions: Incident[] = [];

/** Keep only the latest `n` ended excursions, so a demo looping all day stays believable. */
export function trimClearedExcursions(n: number) {
  clearedExcursions.splice(n);
}

/** 24-hour clock in the interface language, not the booth machine's. */
const timeOf = (date: Date) => formatTime(date, { hour: '2-digit', minute: '2-digit', hour12: false });
const clock = () => timeOf(new Date());

/**
 * Everything happening on the plant as incidents: the live excursion (moving
 * through detection, analysis and a proposal as it develops), the AI proposals
 * waiting on a person, the ones approved, and what was handled earlier today.
 */
export function useIncidents(plant: PlantState, decisions: AgentDecision[]): Incident[] {
  const [excursionStart] = useState(() => new Map<string, string>());
  const kind = plant.excursion?.kind ?? null;

  // When an excursion ends, it becomes a resolved incident.
  const [lastKind, setLastKind] = useState<typeof kind>(kind);
  useEffect(() => {
    if (lastKind && lastKind !== kind) {
      const copy = EXCURSION_COPY[lastKind];
      clearedExcursions.unshift({ ...copy, id: `x-${lastKind}-${Date.now()}`, stage: 4, task: null, time: excursionStart.get(lastKind) ?? clock() });
      excursionStart.delete(lastKind);
    }
    if (kind && !excursionStart.has(kind)) excursionStart.set(kind, clock());
    setLastKind(kind);
  }, [kind]); // eslint-disable-line react-hooks/exhaustive-deps

  return incidentSnapshot(plant, decisions, excursionStart);
}

/**
 * The incident list for a plant state, without the hook's bookkeeping. The
 * chat assistant reads this too, so it talks about exactly what the map shows.
 */
export function incidentSnapshot(plant: PlantState, decisions: AgentDecision[], startTimes?: Map<string, string>): Incident[] {
  const incidents: Incident[] = [];

  if (plant.excursion) {
    const remaining = plant.excursion.remaining;
    const stage = remaining > 11 ? 0 : remaining > 8 ? 1 : 2;
    incidents.push({
      ...EXCURSION_COPY[plant.excursion.kind],
      id: `live-${plant.excursion.kind}`,
      stage,
      time: startTimes?.get(plant.excursion.kind) ?? clock(),
    });
  }

  decisions.forEach((d, i) => {
    if (d.status !== 'pending' && d.status !== 'approved') return;
    const agent = DECISION_AGENT[d.agent] ?? 'production';
    const copy = DECISION_COPY[d.action];
    const equipment = t(d.target_equipment);
    const zoneId = ACTIVE_SITE.equipmentZone[d.target_equipment] ?? ACTIVE_SITE.agentZone[agent];
    incidents.push({
      id: `d-${i}-${d.timestamp}`,
      zoneId,
      agent,
      title: `${equipment} ${copy ? t(copy.title) : t('AI 조치 제안')}`,
      action: copy ? t(copy.action, { value: typeof d.recommended_value === 'number' && d.action === 'adjust_temperature' ? `${d.recommended_value}°C` : String(d.recommended_value) }) : `${d.action.replace(/_/g, ' ')} · ${d.recommended_value}`,
      task: d.status === 'pending' ? (copy ? t(copy.task) : t('제안 내용 확인 후 승인')) : null,
      stage: d.status === 'pending' ? 3 : 4,
      hours: copy?.hours ?? 1,
      extraKrw: copy?.extraKrw ?? 0,
      time: timeOf(new Date(d.timestamp)),
      decisionIndex: d.status === 'pending' ? i : undefined,
    });
  });

  return [...incidents, ...clearedExcursions, ...EARLIER_TODAY];
}

/** Downtime prevented and money saved by handling one excursion and approving its follow-up decision. */
export function caseValue(kind: Excursion['kind'], action: string): { hours: number; krw: number } {
  const live = EXCURSION_COPY[kind];
  const follow = DECISION_COPY[action];
  const hours = live.hours + (follow?.hours ?? 0);
  return { hours, krw: hours * ACTIVE_SITE.downtimeCostPerHour + live.extraKrw + (follow?.extraKrw ?? 0) };
}

const savedKrw = (incident: Incident) => incident.hours * ACTIVE_SITE.downtimeCostPerHour + incident.extraKrw;

export function useMoney() {
  const { locale } = useI18n();
  // The expo edition shows yen for a Japanese audience; amounts are kept in KRW
  // and converted at the edge.
  if (IS_EXPO) {
    return (krw: number) => {
      const jpy = krw * EXPO.jpyPerKrw;
      return locale === 'en'
        ? `¥${Math.round(jpy / 1_000).toLocaleString('en-US')}k`
        : `${Math.round(jpy / 10_000).toLocaleString('ja-JP')}${locale === 'ja' ? '万円' : '만 엔'}`;
    };
  }
  return (krw: number) => locale === 'ko'
    ? `${Math.round(krw / 10_000).toLocaleString('ko-KR')}만 원`
    : `₩${(krw / 1_000_000).toFixed(1)}M`;
}

export const formatHours = (h: number) => `${Number.isInteger(h) ? h : h.toFixed(1)}${t('시간')}`;

/* ------------------------------------------------------------ shared bits */

function AgentChip({ agent }: { agent: AgentKey }) {
  const style = AGENT_STYLE[agent];
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold" style={{ backgroundColor: `${style.hex}1f`, color: style.hex }}>
      {style.icon}{t(style.name)}
    </span>
  );
}

function StageTracker({ stage }: { stage: Incident['stage'] }) {
  return (
    <ol className="flex items-start">
      {INCIDENT_STAGES.map((label, i) => {
        const done = i < stage || stage === 4;
        const current = i === stage && stage !== 4;
        return (
          <li key={label} className="relative flex flex-1 flex-col items-center">
            {i > 0 && (
              <span className={cn("absolute right-1/2 top-[7px] h-0.5 w-full", i <= stage ? "bg-accent" : "bg-border")} />
            )}
            <span className={cn(
              "relative z-10 flex h-4 w-4 items-center justify-center rounded-full border-2",
              done ? "border-accent bg-accent text-white" :
              current ? (i === 3 ? "border-warning bg-warning/20" : "border-accent bg-surface") : "border-border bg-surface",
            )}>
              {done && <CheckCircle2 size={10} />}
              {current && <span className={cn("h-1.5 w-1.5 animate-pulse rounded-full", i === 3 ? "bg-warning" : "bg-accent")} />}
            </span>
            <span className={cn(
              "mt-1 text-center text-[9px] font-bold leading-tight",
              current ? (i === 3 ? "text-warning" : "text-accent") : done ? "text-text-primary" : "text-text-secondary",
            )}>{t(label)}</span>
          </li>
        );
      })}
    </ol>
  );
}

/* --------------------------------------------------------- floor map bits */

const FloorMap3D = lazy(() => import('./FloorMap3D'));

/** Whether this browser can draw the 3D map at all; without WebGL the 2D map is used. */
export function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

interface ZoneInfo {
  state: 'alert' | 'waiting' | 'ok';
  /** The incident the zone shows: a live one first, else one waiting on approval. */
  top: Incident | undefined;
  /** The AIs watching the zone, plus whichever is acting on it. */
  watchers: AgentKey[];
}

function zoneStatus(zoneId: string, incidents: Incident[]): ZoneInfo {
  const here = incidents.filter(i => i.zoneId === zoneId);
  const live = here.filter(i => i.stage < 3);
  const waiting = here.filter(i => i.stage === 3);
  const top = live[0] ?? waiting[0];
  const watchers = (Object.keys(ACTIVE_SITE.agentZone) as AgentKey[]).filter(k => ACTIVE_SITE.agentZone[k] === zoneId);
  if (top && !watchers.includes(top.agent)) watchers.push(top.agent);
  return { state: live.length > 0 ? 'alert' : waiting.length > 0 ? 'waiting' : 'ok', top, watchers };
}

/** The AIs on a zone as icons; the one acting pulses and says what it is doing in a speech bubble. */
function ZoneAis({ watchers, top, className }: { watchers: AgentKey[]; top: Incident | undefined; className?: string }) {
  return (
    <div className={cn("flex min-w-0 items-start gap-1.5", className)}>
      {watchers.map(k => (
        <span
          key={k}
          title={t(AGENT_STYLE[k].name)}
          className={cn("relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 bg-surface shadow", top?.agent === k && "scale-110")}
          style={{ borderColor: AGENT_STYLE[k].hex, color: AGENT_STYLE[k].hex }}
        >
          {top?.agent === k && <span className="absolute inset-[-4px] animate-ping rounded-full border-2 opacity-50" style={{ borderColor: AGENT_STYLE[k].hex }} />}
          {AGENT_STYLE[k].icon}
        </span>
      ))}
      {top && (
        <span className="relative min-w-0 flex-1 rounded-lg border-2 bg-surface px-1.5 py-1 text-[9px] font-bold leading-snug text-text-primary shadow-lg" style={{ borderColor: AGENT_STYLE[top.agent].hex }}>
          <span className="absolute -left-[6px] top-2 h-2.5 w-2.5 rotate-45 border-b-2 border-l-2 bg-surface" style={{ borderColor: AGENT_STYLE[top.agent].hex }} />
          <span className="relative line-clamp-2">{t(top.action)}</span>
        </span>
      )}
    </div>
  );
}

function ZoneStatus({ state, top }: { state: ZoneInfo['state']; top: Incident | undefined }) {
  if (!top) return <div className="flex items-center gap-1 text-[9px] font-bold text-accent"><CheckCircle2 size={10} />{t('정상')}</div>;
  return (
    <div className={cn(
      "flex items-start gap-1 rounded-md px-1.5 py-1 text-[10px] font-bold leading-snug",
      state === 'alert' ? "bg-danger text-white" : "bg-warning text-white",
    )}>
      {state === 'alert' ? <AlertTriangle size={11} className="mt-0.5 shrink-0 animate-pulse" /> : <Clock size={11} className="mt-0.5 shrink-0" />}
      <span className="line-clamp-2">{t(top.title)}</span>
    </div>
  );
}

/**
 * A zone's label floating over the 3D map. A quiet zone is a small name tag
 * with its AIs; a zone with something going on opens into a card with the
 * speech bubble and what happened.
 */
function ZoneBadge3D({ zoneId, info, selected, onClick }: { zoneId: string; info: ZoneInfo; selected: boolean; onClick: () => void }) {
  const zone = ACTIVE_SITE.zones.find(z => z.id === zoneId);
  const { state, top, watchers } = info;
  return (
    <button
      type="button"
      data-testid={`zone-${zoneId}`}
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "select-none rounded-lg border-2 text-left shadow-lg backdrop-blur transition-all",
        top ? "flex w-[180px] flex-col gap-1 p-1.5" : "flex items-center gap-1.5 whitespace-nowrap px-2 py-1",
        state === 'alert' ? "border-danger bg-surface/95 shadow-[0_0_24px_rgba(239,68,68,0.45)]" :
        state === 'waiting' ? "border-warning bg-surface/95" : "border-border bg-surface/85 hover:border-accent/60",
        selected && "ring-2 ring-accent ring-offset-1 ring-offset-bg",
      )}
    >
      {top ? (
        <>
          <div className="text-[11px] font-black leading-tight">{t(zone?.name ?? zoneId)}</div>
          <ZoneAis watchers={watchers} top={top} />
          <ZoneStatus state={state} top={top} />
        </>
      ) : (
        <>
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          <span className="text-[10px] font-black">{t(zone?.name ?? zoneId)}</span>
          {watchers.map(k => (
            <span key={k} title={t(AGENT_STYLE[k].name)} className="flex h-4 w-4 items-center justify-center rounded-full border" style={{ borderColor: AGENT_STYLE[k].hex, color: AGENT_STYLE[k].hex }}>
              {AGENT_STYLE[k].icon}
            </span>
          ))}
        </>
      )}
    </button>
  );
}

/* ------------------------------------------------------ AI team over the map */

/** The AIs the supervisor calls in, besides the lead, for each kind of plant event. */
const EXCURSION_TEAM: Record<Excursion['kind'], AgentKey[]> = {
  temperature: ['pm', 'production'],
  vibration: ['production', 'quality'],
  energy: ['production', 'safety'],
  rush_order: ['logistics', 'pm', 'quality'],
  mass_defect: ['logistics', 'pm', 'production'],
  supply_delay: ['production', 'quality'],
};

const SUPERVISOR_STATUS = ['이상 보고 접수', 'AI 팀 소집 · 함께 분석 중', '조치 실행 중', '사람 승인 대기'];
const LEAD_STATUS = ['이상 감지 · 보고', '원인 분석', '조치 실행', '승인 요청'];
const TEAM_STATUS = ['', '소집됨 · 분석', '조치 지원', ''];

/**
 * What the AI team over the 3D map shows for the incidents on it: the live
 * plant event first, else the newest proposal waiting on a person.
 */
function floorOrchestration(incidents: Incident[]): FloorOrchestrationState | null {
  const floor = ACTIVE_SITE.floor;
  if (!floor) return null;
  const roomOf = (zoneId: string) => floor.rooms.find(r => r.zoneId === zoneId);
  const middle = (zoneId: string): [number, number] | null => {
    const room = roomOf(zoneId);
    return room ? [room.x + room.w / 2, room.z + room.d / 2] : null;
  };
  const xs = floor.rooms.flatMap(r => [r.x, r.x + r.w]);
  const zs = floor.rooms.flatMap(r => [r.z, r.z + r.d]);
  // The supervisor floats at the edge of the control room, or mid-hall without one.
  const control = roomOf('control');
  const center: [number, number] = control ? [control.x + control.w, control.z + control.d / 2] : [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...zs) + Math.max(...zs)) / 2];

  // Each AI floats over its home zone; AIs sharing a zone stand side by side.
  const keys = Object.keys(ACTIVE_SITE.agentZone) as AgentKey[];
  const agents = keys.flatMap(key => {
    const zoneId = ACTIVE_SITE.agentZone[key];
    const room = roomOf(zoneId);
    if (!room) return [];
    // Over the far end of the zone, clear of the incident cards on the near side.
    const at: [number, number] = [room.x + room.w / 2, room.z + Math.min(2, room.d / 2)];
    const mates = keys.filter(k => ACTIVE_SITE.agentZone[k] === zoneId);
    const index = mates.indexOf(key);
    const shift = (index - (mates.length - 1) / 2) * 3;
    return [{ key, name: t(AGENT_STYLE[key].name), hex: AGENT_STYLE[key].hex, at: [at[0] + shift, at[1]] as [number, number], lift: index * 1.6 }];
  });

  const top = incidents.find(i => i.stage < 3) ?? incidents.find(i => i.stage === 3);
  const target = top && middle(top.zoneId);
  const stage = top?.stage as 0 | 1 | 2 | 3 | undefined;
  const kind = top?.id.startsWith('live-') ? (top.id.slice(5) as Excursion['kind']) : null;
  // The team is called in once the supervisor has the report.
  const team = top && kind && stage !== undefined && stage >= 1 ? EXCURSION_TEAM[kind].filter(k => k !== top.agent) : [];

  const agentStatus: Record<string, string> = {};
  if (top && stage !== undefined) {
    agentStatus[top.agent] = t(LEAD_STATUS[stage]);
    team.forEach(k => { if (TEAM_STATUS[stage]) agentStatus[k] = t(TEAM_STATUS[stage]); });
  }

  return {
    agents,
    center,
    incident: top && target && stage !== undefined ? { lead: top.agent, team, target, stage } : null,
    label: {
      supervisor: t('슈퍼바이저 AI'),
      status: stage === undefined ? t('공장 전체 감시 중') : t(SUPERVISOR_STATUS[stage]),
      agentStatus,
    },
  };
}

/* ------------------------------------------------------------ worker view */

/**
 * For operators and shift leads: the floor plan lights up where something is
 * happening, and the tracker says what it is and what to do about it. No agent
 * or model names beyond a small tag on each incident.
 */
export function WorkerView({
  incidents,
  onApprove,
  onReject,
  onEvidence,
}: {
  incidents: Incident[];
  onApprove: (decisionIndex: number) => void;
  onReject: (decisionIndex: number) => void;
  onEvidence: () => void;
}) {
  const [zone, setZone] = useState<string | null>(null);
  const toggleZone = (id: string) => setZone(current => (current === id ? null : id));
  const [can3D] = useState(() => Boolean(ACTIVE_SITE.floor) && hasWebGL());
  const [mapMode, setMapMode] = useState<'3d' | '2d'>('3d');
  const [showTeam, setShowTeam] = useState(true);
  const use3D = can3D && mapMode === '3d';
  const zoneInfo = (id: string) => zoneStatus(id, incidents);
  const open = incidents.filter(i => i.stage < 4);
  const myTasks = open.filter(i => i.task);
  const shown = incidents.filter(i => !zone || i.zoneId === zone);
  const zoneName = (id: string) => t(ACTIVE_SITE.zones.find(z => z.id === id)?.name ?? id);

  return (
    <div className="space-y-4">
      <div className={cn(
        "flex flex-wrap items-center gap-3 rounded-xl border p-3",
        myTasks.length > 0 ? "border-warning/40 bg-warning/10" : "border-accent/30 bg-accent/10",
      )}>
        {myTasks.length > 0 ? <ClipboardCheck size={20} className="text-warning" /> : <CheckCircle2 size={20} className="text-accent" />}
        <div className="flex-1">
          <div className="text-sm font-black">
            {myTasks.length > 0 ? t('지금 내가 할 일 {n}건', { n: myTasks.length }) : t('지금 할 일이 없어요')}
          </div>
          <div className="text-[11px] text-text-secondary">
            {myTasks.length > 0
              ? myTasks.map(i => `${zoneName(i.zoneId)}: ${t(i.task!)}`).join(' · ')
              : t('라인이 정상입니다. 이상이 생기면 배치도에 표시돼요.')}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        {/* Floor map */}
        <div className="dashboard-card">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-bold"><MapPin size={16} className="text-accent" />{t('공장 배치도')}</h3>
            <div className="flex items-center gap-2">
              {zone && (
                <button onClick={() => setZone(null)} className="text-[10px] font-bold text-accent hover:underline">{t('전체 보기')}</button>
              )}
              {use3D && (
                <button
                  type="button"
                  aria-pressed={showTeam}
                  onClick={() => setShowTeam(v => !v)}
                  className={cn("rounded-md border px-2 py-0.5 text-[10px] font-bold", showTeam ? "border-accent/50 bg-accent/15 text-accent" : "border-border text-text-secondary hover:text-text-primary")}
                >{t('AI 조율')}</button>
              )}
              {can3D && (
                <div className="flex rounded-md border border-border p-0.5 text-[10px] font-bold" role="group" aria-label={t('배치도 보기 방식')}>
                  {(['3d', '2d'] as const).map(mode => (
                    <button
                      key={mode}
                      type="button"
                      data-testid={`map-mode-${mode}`}
                      aria-pressed={mapMode === mode}
                      onClick={() => setMapMode(mode)}
                      className={cn("rounded px-2 py-0.5", mapMode === mode ? "bg-accent text-white" : "text-text-secondary hover:text-text-primary")}
                    >{mode.toUpperCase()}</button>
                  ))}
                </div>
              )}
            </div>
          </div>
          {use3D ? (
            <div className="relative h-[460px] overflow-hidden rounded-xl border border-border" data-testid="floor-3d">
              <ErrorBoundary fallback={<div className="flex h-full items-center justify-center text-[11px] text-text-secondary">{t('3D 배치도를 그릴 수 없어 2D로 봐 주세요')}</div>}>
                <Suspense fallback={<div className="flex h-full items-center justify-center text-[11px] text-text-secondary">{t('3D 배치도 불러오는 중…')}</div>}>
                  <FloorMap3D
                    floor={ACTIVE_SITE.floor!}
                    zoneState={Object.fromEntries(ACTIVE_SITE.zones.map(z => [z.id, zoneInfo(z.id).state]))}
                    selected={zone}
                    onSelect={toggleZone}
                    renderBadge={zoneId => <ZoneBadge3D zoneId={zoneId} info={zoneInfo(zoneId)} selected={zone === zoneId} onClick={() => toggleZone(zoneId)} />}
                    orchestration={showTeam ? floorOrchestration(incidents) : null}
                  />
                </Suspense>
              </ErrorBoundary>
              <div className="pointer-events-none absolute bottom-2 left-2 text-[9px] text-text-secondary">
                <span className="rounded bg-surface/80 px-1.5 py-0.5">{t('드래그: 회전 · 휠: 확대 · 우클릭 드래그: 이동')}</span>
              </div>
            </div>
          ) : (
          <div className="relative h-[460px] overflow-hidden rounded-xl border border-border bg-bg/50"
            style={{ backgroundImage: 'radial-gradient(color-mix(in srgb, var(--color-text-secondary) 20%, transparent) 1px, transparent 1px)', backgroundSize: '16px 16px' }}>
            {ACTIVE_SITE.zones.map(z => {
              const { state, top, watchers } = zoneInfo(z.id);
              const flat = z.h < 20;
              return (
                <button
                  key={z.id}
                  type="button"
                  data-testid={`zone-${z.id}`}
                  onClick={() => toggleZone(z.id)}
                  aria-pressed={zone === z.id}
                  className={cn(
                    "absolute flex rounded-lg border-2 p-2 text-left transition-all",
                    flat ? "flex-row items-center gap-3" : "flex-col justify-between gap-1.5",
                    state === 'alert' ? "border-danger bg-danger/10 shadow-[0_0_24px_rgba(239,68,68,0.35)]" :
                    state === 'waiting' ? "border-warning bg-warning/10" : "border-border bg-surface/70 hover:border-accent/50",
                    zone === z.id && "ring-2 ring-accent ring-offset-2 ring-offset-bg",
                  )}
                  style={{ left: `${z.x}%`, top: `${z.y}%`, width: `${z.w}%`, height: `${z.h}%` }}
                >
                  <div className={cn(flat && "shrink-0")}>
                    <div className="text-[11px] font-black leading-tight">{t(z.name)}</div>
                    <div className="text-[9px] text-text-secondary">{t(z.equipment)}</div>
                  </div>
                  <ZoneAis watchers={watchers} top={top} className={cn(flat && "flex-1")} />
                  <ZoneStatus state={state} top={top} />
                </button>
              );
            })}
          </div>
          )}
          <div className="mt-2 flex flex-wrap gap-3 text-[10px] font-bold text-text-secondary">
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-danger" />{t('이상 발생')}</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-warning" />{t('승인 대기')}</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm border border-border bg-surface" />{t('정상')}</span>
          </div>
        </div>

        {/* Incident tracker */}
        <div className="dashboard-card flex flex-col">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold">
            <ClipboardCheck size={16} className="text-accent" />
            {t('사건 트래커')}
            {zone && <span className="text-[11px] font-medium text-text-secondary">· {zoneName(zone)}</span>}
          </h3>
          <div className="max-h-[510px] flex-1 space-y-2.5 overflow-y-auto pr-1 custom-scrollbar">
            {shown.length === 0 && (
              <div className="rounded-lg border border-dashed border-border py-8 text-center text-[11px] text-text-secondary">{t('이 구역에는 오늘 사건이 없어요')}</div>
            )}
            {shown.map(incident => (
              <div
                key={incident.id}
                data-testid="incident"
                className={cn(
                  "rounded-xl border p-3",
                  incident.stage < 3 ? "border-danger/40 bg-danger/5" : incident.stage === 3 ? "border-warning/40 bg-warning/5" : "border-border bg-surface-hover/30",
                )}
              >
                <div className="flex items-center justify-between gap-2 text-[10px]">
                  <span className="flex items-center gap-1 font-bold text-text-secondary"><MapPin size={10} />{zoneName(incident.zoneId)}</span>
                  <span className="flex items-center gap-1.5"><AgentChip agent={incident.agent} /><span className="font-mono text-text-secondary">{incident.time}</span></span>
                </div>
                <div className="mt-1 text-[13px] font-black leading-snug">{t(incident.title)}</div>
                <div className="mt-2.5"><StageTracker stage={incident.stage} /></div>
                <div className="mt-2.5 text-[11px] text-text-secondary"><span className="font-bold text-text-primary">{t('AI 조치')}</span> · {t(incident.action)}</div>
                {incident.task && (
                  <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-warning/15 px-2 py-1.5 text-[11px] font-bold text-warning">
                    <HardHat size={12} className="mt-0.5 shrink-0" />{t('내가 할 일')}: {t(incident.task)}
                  </div>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {incident.decisionIndex !== undefined && (
                    <ApprovalGate agent={incident.agent}>
                      <button onClick={() => onApprove(incident.decisionIndex!)} className="flex items-center gap-1 rounded-md bg-accent px-3 py-1.5 text-[11px] font-bold text-white hover:bg-accent-hover">
                        <CheckCircle2 size={12} />{t('승인')}
                      </button>
                      <button onClick={() => onReject(incident.decisionIndex!)} className="flex items-center gap-1 rounded-md border border-border bg-surface px-3 py-1.5 text-[11px] font-bold hover:border-danger/40 hover:bg-danger/10">
                        <X size={12} />{t('반려')}
                      </button>
                    </ApprovalGate>
                  )}
                  <button onClick={onEvidence} className="ml-auto flex items-center gap-1 text-[10px] font-bold text-text-secondary hover:text-accent">
                    {t('근거 보기')} <ArrowRight size={10} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------- manager view */

/**
 * For plant managers and executives: what the AI delivered today in hours and
 * money, what needs a signature, and one sentence per incident in cause →
 * effect → value form.
 */
export function ManagerView({
  plant,
  incidents,
  onApprove,
  onReject,
  onEvidence,
}: {
  plant: PlantState;
  incidents: Incident[];
  onApprove: (decisionIndex: number) => void;
  onReject: (decisionIndex: number) => void;
  onEvidence: () => void;
}) {
  const money = useMoney();
  const resolved = incidents.filter(i => i.stage === 4);
  const pending = incidents.filter(i => i.stage === 3);
  const open = incidents.filter(i => i.stage < 3);
  const hoursSaved = resolved.reduce((sum, i) => sum + i.hours, 0);
  const krwSaved = resolved.reduce((sum, i) => sum + savedKrw(i), 0);
  const krwAtStake = pending.reduce((sum, i) => sum + savedKrw(i), 0);

  const cards = [
    { label: '오늘 AI가 막은 정지 시간', value: formatHours(hoursSaved), sub: t('해결 {n}건 기준', { n: resolved.length }), icon: <Clock size={18} />, tone: 'text-accent' },
    { label: '오늘 절감 비용 (추정)', value: money(krwSaved), sub: t('정지 1시간당 {cost} 기준', { cost: money(ACTIVE_SITE.downtimeCostPerHour) }), icon: <Coins size={18} />, tone: 'text-accent' },
    { label: '승인 대기', value: String(pending.length), sub: pending.length > 0 ? t('승인 시 {krw} 추가 절감', { krw: money(krwAtStake) }) : t('결재할 건이 없어요'), icon: <ClipboardCheck size={18} />, tone: pending.length > 0 ? 'text-warning' : 'text-accent' },
    { label: '현재 설비종합효율', value: `${plant.oee.toFixed(1)}%`, sub: open.length > 0 ? t('AI 대응 중 {n}건', { n: open.length }) : t('전 라인 정상'), icon: <Gauge size={18} />, tone: open.length > 0 ? 'text-danger' : 'text-accent' },
  ];

  /** Cause, then effect and value in one sentence: proposed (still to approve) or done. */
  const sentence = (i: Incident, done: boolean) => {
    const vars = { effect: t(i.action), hours: formatHours(i.hours), krw: money(savedKrw(i)) };
    if (done) {
      if (i.hours > 0) return t('{effect}해서 {hours} 정지를 막고 약 {krw}을 아꼈어요.', vars);
      if (i.extraKrw > 0) return t('{effect}해서 약 {krw}을 아꼈어요.', vars);
      return t('{effect}해서 안전사고를 예방했어요.', vars);
    }
    if (i.hours > 0) return t('{effect}하면 {hours} 정지를 막고 약 {krw}을 아낄 수 있어요.', vars);
    return t('{effect}하면 약 {krw}을 아낄 수 있어요.', vars);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(card => (
          <div key={card.label} data-testid="result-card" className="dashboard-card">
            <div className="flex items-center justify-between text-text-secondary">
              <span className="text-[11px] font-bold">{t(card.label)}</span>
              <span className={card.tone}>{card.icon}</span>
            </div>
            <div className={cn("mt-2 text-3xl font-black", card.tone)}>{card.value}</div>
            <div className="mt-1 text-[11px] text-text-secondary">{card.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="dashboard-card">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold"><ClipboardCheck size={16} className="text-warning" />{t('결재가 필요한 AI 제안')}</h3>
          <div className="space-y-2.5">
            {pending.length === 0 && <div className="rounded-lg border border-dashed border-border py-6 text-center text-[11px] text-text-secondary">{t('결재할 건이 없어요')}</div>}
            {pending.map(i => {
              return (
                <div key={i.id} className="rounded-xl border border-warning/40 bg-warning/5 p-3">
                  <p className="text-[13px] leading-relaxed">
                    <span className="font-black">{t(i.title)}.</span>{' '}
                    {sentence(i, false)}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <ApprovalGate agent={i.agent}>
                      <button onClick={() => onApprove(i.decisionIndex!)} className="flex items-center gap-1 rounded-md bg-accent px-3 py-1.5 text-[11px] font-bold text-white hover:bg-accent-hover"><CheckCircle2 size={12} />{t('승인')}</button>
                      <button onClick={() => onReject(i.decisionIndex!)} className="flex items-center gap-1 rounded-md border border-border bg-surface px-3 py-1.5 text-[11px] font-bold hover:bg-danger/10"><X size={12} />{t('반려')}</button>
                    </ApprovalGate>
                    <button onClick={onEvidence} className="ml-auto flex items-center gap-1 text-[10px] font-bold text-text-secondary hover:text-accent">{t('근거 보기')} <ArrowRight size={10} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="dashboard-card">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold"><CheckCircle2 size={16} className="text-accent" />{t('오늘 AI가 해결한 일')}</h3>
          <div className="space-y-2">
            {open.map(i => (
              <div key={i.id} className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/5 p-2.5 text-[12px]">
                <AlertTriangle size={14} className="mt-0.5 shrink-0 animate-pulse text-danger" />
                <span><span className="font-bold">{t(i.title)}</span> · {t('AI 대응 중')}: {t(i.action)}</span>
              </div>
            ))}
            {resolved.map(i => {
              return (
                <div key={i.id} className="flex items-start gap-2 rounded-lg border border-border bg-surface-hover/30 p-2.5 text-[12px] leading-relaxed">
                  <span className="mt-0.5 shrink-0 font-mono text-[10px] text-text-secondary">{i.time}</span>
                  <span>
                    <span className="font-bold">{t(i.title)}.</span>{' '}
                    {sentence(i, true)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
