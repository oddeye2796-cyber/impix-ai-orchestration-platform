/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { BadgeCheck, CheckCircle2, Clock, Coins, FileSearch, Hand, Pause, Play, RotateCcw, ShieldCheck, SkipForward, UserCheck, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { t } from '../i18n';
import type { AgentDecision } from '../types';
import { EXPO } from '../config/edition';
import { useTelemetry } from '../hooks/useTelemetry';
import { setRandomExcursions, startExcursion, type Excursion } from '../services/telemetry';
import { caseValue, formatHours, trimClearedExcursions, useMoney, type ViewerRole } from '../components/RoleViews';

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

/*
 * The booth's self-running demo. Each loop plays one event that really happens
 * on packaging lines and shows the platform resolving it on its own: a sensor
 * reading turns into a detection, the supervisor AI calls in the agents that
 * matter, they work out the cause together, the fix inside the AI's authority
 * is carried out and checked, and only a change beyond that authority waits on
 * a person. The panel beside the screens narrates who did what, second by
 * second, while the screens themselves switch to the worker, manager and
 * engineer views.
 *
 * A visitor touching the screen takes over: the director stops switching views
 * and approving on their behalf, and picks the loop up again once the screen
 * has been left alone for a while. Incidents keep developing either way.
 */

type Phase = 'intro' | 'live' | 'approval' | 'results' | 'evidence';

const PHASES: { id: Phase; label: string; role: ViewerRole; sec: number | null }[] = [
  { id: 'intro', label: '사건 소개', role: 'worker', sec: 9 },
  // Ends when the plant settles, not on a timer.
  { id: 'live', label: 'AI 팀 자율 대응', role: 'worker', sec: null },
  { id: 'approval', label: '사람 결정', role: 'worker', sec: 12 },
  { id: 'results', label: '결과', role: 'manager', sec: 12 },
  { id: 'evidence', label: '판단 기록', role: 'engineer', sec: 12 },
];

/** Readings an excursion lasts, two seconds each. */
const EXCURSION_TICKS = 14;
const TICK_SEC = 2;

type Who = 'sensor' | 'supervisor' | 'quality' | 'pm' | 'production' | 'logistics' | 'energy' | 'safety' | 'human';
const WHO: Record<Who, { name: string; color: string }> = {
  sensor: { name: '센서', color: '#64748b' },
  supervisor: { name: '슈퍼바이저 AI', color: '#8b5cf6' },
  quality: { name: '품질 AI', color: '#10b981' },
  pm: { name: '설비 AI', color: '#f59e0b' },
  production: { name: '생산 AI', color: '#3b82f6' },
  logistics: { name: '물류 AI', color: '#06b6d4' },
  energy: { name: '에너지 AI', color: '#eab308' },
  safety: { name: '안전 AI', color: '#ef4444' },
  human: { name: '사람', color: '#ec4899' },
};

type StepKind = 'auto' | 'verify' | 'ask' | 'done' | 'human';
const KIND_LABEL: Record<StepKind, string> = { auto: '자율 실행', verify: '효과 확인', ask: '승인 요청', done: '자율 해결', human: '사람 결정' };

interface Step { at: number; who: Who; text: string; kind?: StepKind }

interface Scenario {
  kind: Excursion['kind'];
  title: string;
  /** Why this happens in real plants, in a sentence. */
  context: string;
  steps: Step[];
  /** Resolved without a person: the follow-up is within the AI's authority. */
  autonomous: boolean;
  humanStep?: string;
  /** How the same event usually goes without the platform. */
  without: string;
  decision: Omit<AgentDecision, 'timestamp' | 'status'>;
}

const SCENARIOS: Scenario[] = [
  {
    kind: 'temperature',
    title: '포장기 실링 온도 이상',
    context: '필름 롤을 새로 바꾼 뒤 실링 온도가 흔들리면서 포장 불량이 늘어나는, 포장 라인에서 흔히 생기는 일이에요.',
    steps: [
      { at: 0, who: 'sensor', text: '포장기-01 실링부 온도가 176°C에서 181°C로 오르기 시작' },
      { at: 1, who: 'quality', text: '실링 불량 징후 감지. 이대로면 불량률이 2.1%에서 7.3%로 오를 것으로 예측하고 슈퍼바이저에 보고' },
      { at: 3, who: 'supervisor', text: '품질·설비·생산 AI를 불러 원인 분석 시작' },
      { at: 4, who: 'pm', text: '히터와 제어기는 정상. 10분 전 필름 롤 교체 기록을 찾아냄: 새 롤의 두께 차이가 원인' },
      { at: 5, who: 'production', text: '라인 속도를 5% 줄여도 오늘 납기에는 영향이 없음을 확인' },
      { at: 6, who: 'supervisor', text: 'AI 권한 범위 안의 조치라 바로 실행: 실링 온도 2°C 낮춤, 라인 속도 5% 줄임', kind: 'auto' },
      { at: 9, who: 'quality', text: '조치 후 불량률이 7.3%에서 2.4%로 돌아온 것을 확인', kind: 'verify' },
      { at: 12, who: 'supervisor', text: '재발을 막으려면 기본 온도를 173°C로 바꿔야 함. 기본 설정 변경은 AI 권한 밖이라 현장 책임자에게 승인 요청', kind: 'ask' },
    ],
    autonomous: false,
    humanStep: '현장 책임자가 근거를 확인하고 승인. 기본 온도 173°C 적용',
    without: '보통은 불량품이 쌓인 뒤에야 발견하고, 원인을 찾아 조정하기까지 2~3시간이 걸려요.',
    decision: {
      agent: 'Quality Agent',
      action: 'adjust_temperature',
      target_equipment: '수축포장기-01',
      recommended_value: 173.0,
      level: 2,
      reasoning: '불량률이 7.3%로 상승함에 따라 최적 온도 173°C로 조정을 권장합니다. 과거 데이터 분석 결과 이 온도에서 불량률이 2.1%로 감소했습니다.',
    },
  },
  {
    kind: 'vibration',
    title: '포장기 모터 베어링 마모',
    context: '모터 베어링이 닳으면 진동이 서서히 커지다가 어느 순간 멈춰 버려요. 갑작스러운 정지는 라인 전체를 세워요.',
    steps: [
      { at: 0, who: 'sensor', text: '포장기-01 메인 모터 진동이 3.4에서 4.2mm/s로 상승 (기준 3.5 초과)' },
      { at: 1, who: 'pm', text: '진동 패턴이 베어링 마모와 일치. 72시간 안에 고장 날 확률 85%로 예측' },
      { at: 3, who: 'supervisor', text: '설비·생산·물류 AI를 불러 대응 계획 수립' },
      { at: 4, who: 'production', text: '내일 06시 계획 정지 때 정비하면 생산 손실이 없음을 확인' },
      { at: 5, who: 'logistics', text: '교체용 베어링 재고 2개 확인, 정비 시간에 맞춰 출고 예약' },
      { at: 6, who: 'supervisor', text: 'AI 권한 범위 안의 조치라 바로 실행: 모터 부하 10% 낮춰 운전, 보전 작업 오더 초안 작성', kind: 'auto' },
      { at: 9, who: 'pm', text: '감속 후 진동이 3.6mm/s로 안정. 예상 고장 시점이 계획 정지 이후로 늦춰짐', kind: 'verify' },
      { at: 12, who: 'supervisor', text: '정비 일정 확정과 인력 배정은 보전 책임자에게 승인 요청', kind: 'ask' },
    ],
    autonomous: false,
    humanStep: '보전 책임자가 승인. 작업 오더 확정, 정비 기사 배정',
    without: '보통은 설비가 고장으로 멈춘 뒤에야 알게 되고, 부품을 구하는 동안 라인이 4~8시간 서요.',
    decision: {
      agent: 'PM Agent',
      action: 'inspect_bearing',
      target_equipment: '수축포장기-01',
      recommended_value: '교체 권장',
      level: 2,
      reasoning: '진동 수치가 4.2mm/s로 임계치(3.5)를 초과했습니다. 72시간 내 베어링 파손 위험이 85%로 예측됩니다.',
    },
  },
  {
    kind: 'energy',
    title: '여름 오후 피크 전력 초과 위험',
    context: '더운 오후에 공조와 설비가 한꺼번에 돌면 계약 전력을 넘기 쉬워요. 한 번만 넘어도 1년 내내 기본요금이 올라요.',
    steps: [
      { at: 0, who: 'sensor', text: '공장 전력이 계약 전력의 92%까지 상승 (오후 2시, 바깥 기온 33°C)' },
      { at: 1, who: 'energy', text: '15분 안에 계약 전력을 넘을 가능성이 높다고 예측하고 슈퍼바이저에 보고' },
      { at: 3, who: 'supervisor', text: '에너지·생산·안전 AI를 불러 줄일 수 있는 부하 검토' },
      { at: 4, who: 'production', text: '생산 설비는 그대로 두기로. 공조·컴프레서는 20분 늦춰도 품질 영향이 없음을 확인' },
      { at: 5, who: 'safety', text: '환기·소방 설비는 줄이는 대상에서 제외' },
      { at: 6, who: 'supervisor', text: 'AI 권한 범위 안의 조치라 바로 실행: 배터리(ESS) 120kW 방전, 공조·컴프레서 부하 20분 이전', kind: 'auto' },
      { at: 9, who: 'energy', text: '전력이 계약 전력의 92%에서 81%로 내려감. 피크 시간대 무사 통과', kind: 'verify' },
      { at: 12, who: 'supervisor', text: '사람 손을 거치지 않고 해결. 관리자에게 결과만 보고하고 기록', kind: 'done' },
    ],
    autonomous: true,
    without: '보통은 전력 경보가 울린 뒤 담당자가 뛰어가 설비를 끄지만, 이미 넘은 뒤인 경우가 많아요.',
    decision: {
      agent: 'Energy Agent',
      action: 'load_balance',
      target_equipment: '유틸리티실',
      recommended_value: 'ESS 120kW 방전',
      level: 1,
      reasoning: '피크 시간대 직전마다 같은 패턴이 반복됩니다. 공조·컴프레서 부하를 피크 전에 미리 옮기는 운전 계획으로 바꾸면 계약 전력 초과를 막을 수 있습니다.',
    },
  },
];

/** The five stages an incident goes through, as on the floor map. */
const STAGES = ['감지', '분석', '조치 제안', '승인 대기', '해결'];

export function ExpoDirector({
  decisions,
  setDecisions,
  onApprove,
  setRole,
}: {
  decisions: AgentDecision[];
  setDecisions: Dispatch<SetStateAction<AgentDecision[]>>;
  onApprove: (index: number) => void;
  setRole: (role: ViewerRole) => void;
}) {
  const plant = useTelemetry();
  const money = useMoney();
  const [phase, setPhase] = useState<Phase>('intro');
  const [scenarioIndex, setScenarioIndex] = useState(0);
  /** Off when the presenter pauses the loop from the panel. */
  const [autoplay, setAutoplay] = useState(true);
  /** On while a visitor is using the screen. */
  const [touched, setTouched] = useState(false);
  const [stamp, setStamp] = useState<string | null>(null);
  const panelRef = useRef<HTMLElement>(null);
  const timelineEnd = useRef<HTMLDivElement>(null);
  const running = autoplay && !touched;
  const scenario = SCENARIOS[scenarioIndex];

  // The director stages every excursion, so the plant's own random ones stop.
  useEffect(() => {
    setRandomExcursions(false);
    return () => setRandomExcursions(true);
  }, []);

  // Any touch outside the panel hands the screen to the visitor until it goes quiet.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onInput = (e: Event) => {
      if (panelRef.current?.contains(e.target as Node)) return;
      setTouched(true);
      clearTimeout(timer);
      timer = setTimeout(() => setTouched(false), EXPO.idleResumeSec * 1000);
    };
    const events = ['pointerdown', 'keydown', 'wheel'] as const;
    events.forEach(name => window.addEventListener(name, onInput, { capture: true, passive: true }));
    return () => {
      clearTimeout(timer);
      events.forEach(name => window.removeEventListener(name, onInput, { capture: true }));
    };
  }, []);

  const phaseAt = PHASES.findIndex(p => p.id === phase);
  const step = PHASES[phaseAt];

  // While the loop is in charge, each phase shows its own audience's screen.
  useEffect(() => {
    if (running) setRole(step.role);
  }, [running, phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const index = stamp ? decisions.findIndex(d => d.timestamp === stamp) : -1;
  const proposal = index >= 0 ? decisions[index] : undefined;

  const advance = () => {
    switch (phase) {
      case 'intro':
        startExcursion(scenario.kind, EXCURSION_TICKS);
        setPhase('live');
        break;
      case 'live':
        // Let the plant settle on the next reading; the effect below moves on.
        if (plant.excursion) startExcursion(plant.excursion.kind, 1);
        break;
      case 'approval':
        if (proposal?.status === 'pending') onApprove(index);
        else setPhase('results');
        break;
      case 'results':
        setPhase('evidence');
        break;
      case 'evidence':
        startLoop((scenarioIndex + 1) % SCENARIOS.length);
        break;
    }
  };

  const startLoop = (next: number) => {
    // A demo that loops all day keeps only the last few cases, so "today" stays believable.
    trimClearedExcursions(2);
    setDecisions(prev => prev.slice(0, 3));
    setStamp(null);
    setScenarioIndex(next);
    setPhase('intro');
  };

  // Timed phases move on only while the loop is in charge. The plant re-renders
  // this every reading, so the timer is keyed to the phase and calls the
  // latest `advance` through a ref.
  const advanceRef = useRef(advance);
  advanceRef.current = advance;
  useEffect(() => {
    if (!running || step.sec === null) return;
    const timer = setTimeout(() => advanceRef.current(), step.sec * 1000);
    return () => clearTimeout(timer);
  }, [running, phase, scenarioIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  // When the plant settles, the follow-up is filed: for a person to approve, or
  // already carried out when it is within the AI's authority.
  useEffect(() => {
    if (phase !== 'live' || plant.excursion) return;
    const timestamp = new Date().toISOString();
    const status = scenario.autonomous ? 'approved' as const : 'pending' as const;
    setDecisions(prev => [{ ...scenario.decision, timestamp, status }, ...prev].slice(0, 6));
    setStamp(timestamp);
    setPhase(scenario.autonomous ? 'results' : 'approval');
  }, [phase, plant.excursion]); // eslint-disable-line react-hooks/exhaustive-deps

  // Approved or rejected, by a visitor or by the loop: show what came of it.
  useEffect(() => {
    if (phase === 'approval' && proposal && proposal.status !== 'pending') setPhase('results');
  }, [phase, proposal?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  const restart = () => {
    setAutoplay(true);
    setTouched(false);
    startLoop(0);
    setRole('worker');
  };

  /** Readings since the event started; every step is shown once the event is over. */
  const elapsed = phase === 'intro' ? -1 : phase === 'live' && plant.excursion ? EXCURSION_TICKS - plant.excursion.remaining : EXCURSION_TICKS;
  const shown = scenario.steps.filter(s => s.at <= elapsed);
  const approved = proposal?.status === 'approved' && !scenario.autonomous;
  const rejected = proposal?.status === 'rejected';
  const stage = phase === 'intro' ? -1
    : phase === 'live' ? (elapsed < 3 ? 0 : elapsed < 6 ? 1 : 2)
    : phase === 'approval' ? 3 : 4;

  useEffect(() => {
    timelineEnd.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [shown.length, approved, phase]);

  const value = caseValue(scenario.kind, scenario.decision.action);
  const firstAction = scenario.steps.find(s => s.kind === 'auto')?.at ?? 6;

  return (
    <aside
      ref={panelRef}
      data-testid="expo-director"
      aria-label={t('자동 시연')}
      className="fixed inset-x-2 bottom-2 z-40 flex max-h-[48vh] flex-col rounded-2xl border border-border bg-surface/95 shadow-2xl backdrop-blur lg:static lg:z-auto lg:max-h-none lg:w-[400px] lg:shrink-0 lg:rounded-none lg:border-y-0 lg:border-r-0 lg:shadow-none xl:w-[440px]"
    >
      {/* What the visitor is watching */}
      <div className="border-b border-border p-4">
        <div className="text-[10px] font-black tracking-wider text-accent">{t('사례 {n} / {total}', { n: scenarioIndex + 1, total: SCENARIOS.length })}</div>
        <h2 className="mt-0.5 text-lg font-black leading-snug">{t(scenario.title)}</h2>
        <p className="mt-1 text-xs leading-relaxed text-text-secondary">{t(scenario.context)}</p>
        <ol className="mt-3 flex items-start">
          {STAGES.map((label, i) => (
            <li key={label} className="relative flex flex-1 flex-col items-center">
              {i > 0 && <span className={cn('absolute right-1/2 top-[5px] h-0.5 w-full', i <= stage ? 'bg-accent' : 'bg-border')} />}
              <span className={cn('relative z-10 h-3 w-3 rounded-full border-2', i < stage || stage === 4 ? 'border-accent bg-accent' : i === stage ? 'animate-pulse border-accent bg-surface' : 'border-border bg-surface')} />
              <span className={cn('mt-1 text-center text-[9px] font-bold leading-tight', i === stage ? 'text-accent' : 'text-text-secondary')}>
                {i === 3 && scenario.autonomous ? t('승인 불필요') : t(label)}
              </span>
            </li>
          ))}
        </ol>
      </div>

      {/* Second-by-second account of who did what */}
      <div className="flex-1 space-y-2.5 overflow-y-auto p-4 custom-scrollbar" data-testid="expo-timeline">
        {phase === 'intro' && (
          <div className="rounded-xl border border-accent/30 bg-accent/5 p-4">
            <div className="flex items-center gap-2 text-sm font-black"><Zap size={16} className="text-accent" />{t('IMPIX AI 오케스트레이션')}</div>
            <p className="mt-2 text-xs leading-relaxed">{t('현장에서 실제로 생기는 사건이 터지면, 여러 AI가 한 팀처럼 원인을 찾고 권한 안의 조치는 스스로 실행해요. 사람은 꼭 필요한 결정만 내려요.')}</p>
            <p className="mt-2 text-xs leading-relaxed text-text-secondary">{t('곧 이 사건이 공장에서 일어납니다. 왼쪽 공장 지도와 이 패널을 함께 봐 주세요.')}</p>
          </div>
        )}

        {shown.map((s, i) => (
          <TimelineStep key={`${scenarioIndex}-${i}`} step={s} />
        ))}
        {phase === 'live' && shown.length < scenario.steps.length && (
          <div className="flex items-center gap-2 pl-1 text-[11px] text-text-secondary">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />{t('AI 팀이 대응 중…')}
          </div>
        )}
        {phase === 'approval' && !approved && !rejected && (
          <div className="rounded-xl border-2 border-warning/60 bg-warning/10 p-3 text-xs leading-relaxed" data-testid="expo-approval-hint">
            <div className="flex items-center gap-1.5 font-black text-warning"><UserCheck size={14} />{t('여기서부터는 사람이 결정해요')}</div>
            <p className="mt-1">{t('왼쪽 화면의 [승인] 버튼을 직접 눌러 보세요. 누르지 않으면 잠시 뒤 시연이 대신 승인해요.')}</p>
          </div>
        )}
        {approved && scenario.humanStep && <TimelineStep step={{ at: EXCURSION_TICKS + 2, who: 'human', text: scenario.humanStep, kind: 'human' }} />}
        {rejected && <TimelineStep step={{ at: EXCURSION_TICKS + 2, who: 'human', text: '사람이 반려. AI는 임시 조치만 유지하고 기록을 남김', kind: 'human' }} />}

        {(phase === 'results' || phase === 'evidence') && (
          <div className="rounded-xl border border-accent/40 bg-accent/5 p-3" data-testid="expo-result">
            <div className="mb-2 flex items-center gap-1.5 text-xs font-black text-accent"><BadgeCheck size={14} />{t('해결 완료')}</div>
            <div className="grid grid-cols-2 gap-2">
              <Fact icon={<Clock size={12} />} label={t('감지부터 첫 조치까지')} value={t('{sec}초', { sec: firstAction * TICK_SEC })} />
              <Fact icon={<UserCheck size={12} />} label={t('사람이 한 일')} value={scenario.autonomous ? t('없음 (결과 보고만)') : t('승인 1번')} />
              {value.hours > 0 && scenario.kind !== 'energy'
                ? <Fact icon={<ShieldCheck size={12} />} label={t('막은 라인 정지')} value={formatHours(value.hours)} />
                : <Fact icon={<ShieldCheck size={12} />} label={t('계약 전력 초과')} value={t('0회')} />}
              <Fact icon={<Coins size={12} />} label={t('아낀 비용 (추정)')} value={money(value.krw)} />
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-text-secondary">{t('플랫폼이 없었다면: {text}', { text: t(scenario.without) })}</p>
          </div>
        )}
        {phase === 'evidence' && (
          <div className="rounded-xl border border-border bg-surface-hover/40 p-3 text-xs leading-relaxed">
            <div className="mb-1 flex items-center gap-1.5 font-black"><FileSearch size={14} className="text-accent" />{t('모든 판단이 기록돼요')}</div>
            <p>{t('어떤 데이터를 보고, 어떤 AI가, 왜 그렇게 판단했는지, 누가 승인했는지가 모두 남아요. 지금 화면은 엔지니어용 기록이에요.')}</p>
            <p className="mt-2 text-text-secondary">{t('다음 사례: {title}', { title: t(SCENARIOS[(scenarioIndex + 1) % SCENARIOS.length].title) })}</p>
          </div>
        )}
        <div ref={timelineEnd} />
      </div>

      {/* Presenter controls */}
      <div className="border-t border-border px-4 py-2.5">
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-text-secondary">
              {running ? (
                <><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />{t('자동 데모 진행 중')}</>
              ) : touched && autoplay ? (
                <><Hand size={11} className="text-warning" /><span className="truncate">{t('직접 조작 중 · 손을 떼면 {sec}초 뒤 자동 데모로 돌아가요', { sec: EXPO.idleResumeSec })}</span></>
              ) : (
                <><Pause size={11} />{t('자동 데모 일시정지')}</>
              )}
            </div>
            <ol className="mt-1 flex flex-wrap gap-1">
              {PHASES.map((p, i) => (
                <li
                  key={p.id}
                  className={cn(
                    'rounded-full px-2 py-0.5 text-[10px] font-bold',
                    i === phaseAt ? 'bg-accent text-white' : i < phaseAt ? 'bg-accent/15 text-accent' : 'bg-surface-hover text-text-secondary',
                  )}
                >{p.id === 'approval' && scenario.autonomous ? t('승인 불필요') : t(p.label)}</li>
              ))}
            </ol>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              onClick={() => { setAutoplay(a => !a); setTouched(false); }}
              className="rounded-lg p-1.5 text-text-secondary hover:bg-surface-hover hover:text-text-primary"
              title={autoplay ? t('자동 데모 일시정지') : t('자동 데모 재생')}
              aria-label={autoplay ? t('자동 데모 일시정지') : t('자동 데모 재생')}
            >{autoplay ? <Pause size={16} /> : <Play size={16} />}</button>
            <button
              onClick={advance}
              className="rounded-lg p-1.5 text-text-secondary hover:bg-surface-hover hover:text-text-primary"
              title={t('다음 단계')}
              aria-label={t('다음 단계')}
            ><SkipForward size={16} /></button>
            <button
              onClick={restart}
              className="rounded-lg p-1.5 text-text-secondary hover:bg-surface-hover hover:text-text-primary"
              title={t('처음부터')}
              aria-label={t('처음부터')}
            ><RotateCcw size={16} /></button>
          </div>
        </div>
      </div>
    </aside>
  );
}

function TimelineStep({ step }: { step: Step }) {
  const who = WHO[step.who];
  const sec = step.at * TICK_SEC;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'rounded-xl border p-2.5',
        step.kind === 'auto' ? 'border-accent/50 bg-accent/10'
          : step.kind === 'ask' || step.kind === 'human' ? 'border-warning/50 bg-warning/10'
          : step.kind === 'done' || step.kind === 'verify' ? 'border-accent/30 bg-accent/5'
          : 'border-border bg-surface/60',
      )}
    >
      <div className="flex items-center gap-2">
        <span className="font-mono text-[10px] text-text-secondary">+{Math.floor(sec / 60)}:{String(sec % 60).padStart(2, '0')}</span>
        <span className="rounded-full px-1.5 py-0.5 text-[10px] font-black" style={{ backgroundColor: `${who.color}22`, color: who.color }}>{t(who.name)}</span>
        {step.kind && (
          <span className={cn('ml-auto flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-black', step.kind === 'ask' || step.kind === 'human' ? 'bg-warning/20 text-warning' : 'bg-accent text-white')}>
            {step.kind === 'verify' || step.kind === 'done' ? <CheckCircle2 size={10} /> : null}{t(KIND_LABEL[step.kind])}
          </span>
        )}
      </div>
      <p className="mt-1 text-xs leading-relaxed">{t(step.text)}</p>
    </motion.div>
  );
}

function Fact({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg bg-surface/70 p-2">
      <div className="flex items-center gap-1 text-[10px] font-bold text-text-secondary">{icon}{label}</div>
      <div className="mt-0.5 text-sm font-black">{value}</div>
    </div>
  );
}

/** The strip over the header that tells a passer-by what they are looking at. */
export function ExpoBanner() {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-accent/30 bg-accent/10 px-6 py-1.5 text-[11px]">
      <div className="flex min-w-0 items-center gap-2">
        <span className="flex shrink-0 items-center gap-1 rounded-full bg-danger px-2 py-0.5 text-[9px] font-black tracking-wider text-white">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />LIVE DEMO
        </span>
        <span className="truncate font-black">{t(EXPO.event)}</span>
        <span className="hidden truncate text-text-secondary sm:inline">· {t(EXPO.tagline)}</span>
      </div>
      <span className="hidden shrink-0 text-text-secondary md:inline">{t('화면을 직접 눌러 보세요. 궁금한 점은 부스 스태프에게!')}</span>
    </div>
  );
}
