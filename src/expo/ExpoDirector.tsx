/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { Hand, Pause, Play, RotateCcw, SkipForward } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { t } from '../i18n';
import type { AgentDecision } from '../types';
import { EXPO } from '../config/edition';
import { useTelemetry } from '../hooks/useTelemetry';
import { setRandomExcursions, startExcursion, type Excursion } from '../services/telemetry';
import { trimClearedExcursions, type ViewerRole } from '../components/RoleViews';

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

/*
 * The booth's self-running demo. One loop tells the whole story on the same
 * screens the platform ships with: the plant runs normally, an AI catches a
 * problem on the floor map and works it through detection, analysis and a
 * proposal, a person approves the permanent fix, then the manager sees what it
 * saved and the engineer sees why the AI decided it. Each loop uses the next
 * scenario.
 *
 * A visitor touching the screen takes over: the director stops switching views
 * and approving on their behalf, and picks the loop up again once the screen
 * has been left alone for a while. Incidents keep developing either way.
 */

type Phase = 'calm' | 'live' | 'approval' | 'results' | 'evidence';

const PHASES: { id: Phase; label: string; role: ViewerRole; sec: number | null }[] = [
  { id: 'calm', label: '정상 가동', role: 'worker', sec: 6 },
  // Ends when the plant settles, not on a timer.
  { id: 'live', label: 'AI 감지·분석', role: 'worker', sec: null },
  { id: 'approval', label: '사람이 승인', role: 'worker', sec: 14 },
  { id: 'results', label: '절감 효과', role: 'manager', sec: 12 },
  { id: 'evidence', label: 'AI 판단 근거', role: 'engineer', sec: 14 },
];

/** Readings an excursion lasts: about 6 s each of detection and analysis, then the proposal. */
const EXCURSION_TICKS = 14;

const SCENARIOS: { kind: Excursion['kind']; decision: Omit<AgentDecision, 'timestamp' | 'status'> }[] = [
  {
    kind: 'temperature',
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
    decision: {
      agent: 'PM Agent',
      action: 'inspect_bearing',
      target_equipment: '수축포장기-01',
      recommended_value: '교체 권장',
      level: 1,
      reasoning: '진동 수치가 4.2mm/s로 임계치(3.5)를 초과했습니다. 72시간 내 베어링 파손 위험이 85%로 예측됩니다.',
    },
  },
  {
    kind: 'energy',
    decision: {
      agent: 'Energy Agent',
      action: 'load_balance',
      target_equipment: '유틸리티실',
      recommended_value: 'ESS 120kW 방전',
      level: 2,
      reasoning: '피크 시간대 직전마다 같은 패턴이 반복됩니다. 공조·컴프레서 부하를 피크 전에 미리 옮기는 운전 계획으로 바꾸면 계약 전력 초과를 막을 수 있습니다.',
    },
  },
];

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
  const [phase, setPhase] = useState<Phase>('calm');
  const [scenario, setScenario] = useState(0);
  /** Off when the presenter pauses the loop from the bar. */
  const [autoplay, setAutoplay] = useState(true);
  /** On while a visitor is using the screen. */
  const [touched, setTouched] = useState(false);
  const [stamp, setStamp] = useState<string | null>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const running = autoplay && !touched;

  // The director stages every excursion, so the plant's own random ones stop.
  useEffect(() => {
    setRandomExcursions(false);
    return () => setRandomExcursions(true);
  }, []);

  // Any touch outside the bar hands the screen to the visitor until it goes quiet.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onInput = (e: Event) => {
      if (barRef.current?.contains(e.target as Node)) return;
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

  const step = PHASES.find(p => p.id === phase)!;

  // While the loop is in charge, each phase shows its own audience's screen.
  useEffect(() => {
    if (running) setRole(step.role);
  }, [running, phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const index = stamp ? decisions.findIndex(d => d.timestamp === stamp) : -1;
  const proposal = index >= 0 ? decisions[index] : undefined;

  const advance = () => {
    switch (phase) {
      case 'calm':
        startExcursion(SCENARIOS[scenario].kind, EXCURSION_TICKS);
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
        startLoop((scenario + 1) % SCENARIOS.length);
        break;
    }
  };

  const startLoop = (next: number) => {
    // A demo that loops all day keeps only the last few cases, so "today" stays believable.
    trimClearedExcursions(2);
    setDecisions(prev => prev.slice(0, 3));
    setStamp(null);
    setScenario(next);
    setPhase('calm');
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
  }, [running, phase, scenario]); // eslint-disable-line react-hooks/exhaustive-deps

  // When the plant settles, the AI files the permanent fix for a person to approve.
  useEffect(() => {
    if (phase !== 'live' || plant.excursion) return;
    const timestamp = new Date().toISOString();
    setDecisions(prev => [{ ...SCENARIOS[scenario].decision, timestamp, status: 'pending' as const }, ...prev].slice(0, 6));
    setStamp(timestamp);
    setPhase('approval');
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

  return (
    <div
      ref={barRef}
      data-testid="expo-director"
      className="fixed bottom-6 left-6 z-50 flex max-w-[calc(100vw-7rem)] items-center gap-3 rounded-2xl border border-border bg-surface/95 px-3 py-2 shadow-2xl backdrop-blur"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-text-secondary">
          {running ? (
            <><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />{t('자동 데모 진행 중')}</>
          ) : touched && autoplay ? (
            <><Hand size={11} className="text-warning" />{t('직접 조작 중 · 손을 떼면 {sec}초 뒤 자동 데모로 돌아가요', { sec: EXPO.idleResumeSec })}</>
          ) : (
            <><Pause size={11} />{t('자동 데모 일시정지')}</>
          )}
        </div>
        <ol className="mt-1 flex flex-wrap gap-1">
          {PHASES.map((p, i) => {
            const at = PHASES.findIndex(x => x.id === phase);
            return (
              <li
                key={p.id}
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-bold",
                  i === at ? "bg-accent text-white" : i < at ? "bg-accent/15 text-accent" : "bg-surface-hover text-text-secondary",
                )}
              >{t(p.label)}</li>
            );
          })}
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
