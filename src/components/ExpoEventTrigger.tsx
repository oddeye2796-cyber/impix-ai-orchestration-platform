/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Flame, Zap, AlertTriangle, Thermometer, Wind, 
  Activity, CheckCircle2, X, ChevronRight, Cpu,
  Radio, TrendingUp, TrendingDown, Clock
} from 'lucide-react';

interface TriggerEvent {
  id: string;
  icon: React.ReactNode;
  label: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
  agentResponse: string;
  severity: 'warning' | 'critical' | 'info';
  affectedAgents: string[];
  aiDecision: string;
  impact: string;
}

interface ActiveEvent {
  event: TriggerEvent;
  triggeredAt: Date;
  phase: 'detecting' | 'analyzing' | 'responding' | 'resolved';
  phaseProgress: number;
}

interface ExpoEventTriggerProps {
  scenarioIdx: number;
  onEventTriggered?: (eventId: string) => void;
  onScoreUpdate?: (delta: number) => void;
}

const SCENARIO_EVENTS: Record<number, TriggerEvent[]> = {
  0: [
    {
      id: 'oee_drop',
      icon: <TrendingDown size={20} />,
      label: 'OEE 급락',
      description: '라인 2 가동률 갑자기 15% 하락',
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-orange-500/40',
      agentResponse: '생산 최적화 에이전트가 병목 구간을 분석하고 속도를 재조정합니다.',
      severity: 'warning',
      affectedAgents: ['생산', '품질'],
      aiDecision: '라인 2 속도 12% 증속 + 병목 설비 우선 점검 스케줄링',
      impact: 'OEE +8% 예상 회복',
    },
    {
      id: 'rush_order',
      icon: <TrendingUp size={20} />,
      label: '긴급 주문 입고',
      description: '500개 추가 주문, 납기 4시간',
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/40',
      agentResponse: '물류 에이전트가 우선순위를 재편성하고 라인을 재배치합니다.',
      severity: 'info',
      affectedAgents: ['생산', '물류', '품질'],
      aiDecision: '라인 3 전환 + 야간 교대 사전 알림 발송',
      impact: '납기 준수율 94% 달성 예상',
    },
    {
      id: 'quality_alert',
      icon: <AlertTriangle size={20} />,
      label: '품질 이상 감지',
      description: '불량률 2.1% 초과 — 기준치 1.5%',
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/40',
      agentResponse: '품질 에이전트가 비전 검사 민감도를 높이고 샘플링 빈도를 증가시킵니다.',
      severity: 'warning',
      affectedAgents: ['품질', '생산'],
      aiDecision: '인라인 비전 검사 강화 + 원인 분석 자동 개시',
      impact: '불량률 1.2% 이하 목표',
    },
  ],
  1: [
    {
      id: 'gas_leak',
      icon: <Wind size={20} />,
      label: '가스 누출 감지',
      description: 'Zone B-4 가스 농도 위험 수준 초과',
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/40',
      agentResponse: '안전 에이전트가 즉시 해당 구역 설비를 정지하고 환기 시스템을 가동합니다.',
      severity: 'critical',
      affectedAgents: ['안전', '생산', '물류'],
      aiDecision: '긴급 정지 + 환기 가동 + 작업자 대피 알림',
      impact: '안전 확보 최우선 — 생산 일시 중단',
    },
    {
      id: 'fire_detected',
      icon: <Flame size={20} />,
      label: '화재 감지',
      description: 'CCTV AI — Zone C-2 연기 감지 92%',
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/40',
      agentResponse: '안전 에이전트가 스프링클러를 가동하고 소방서에 자동 신고합니다.',
      severity: 'critical',
      affectedAgents: ['안전'],
      aiDecision: '스프링클러 가동 + 비상구 개방 + 119 자동 신고',
      impact: '초기 진압 성공 시 피해 최소화',
    },
    {
      id: 'equipment_vibration',
      icon: <Activity size={20} />,
      label: '설비 진동 이상',
      description: '수축포장기-01 진동값 임계치 초과',
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-orange-500/40',
      agentResponse: '예지보전 에이전트가 즉시 점검 작업지시를 생성하고 속도를 낮춥니다.',
      severity: 'warning',
      affectedAgents: ['예지보전', '생산'],
      aiDecision: '설비 속도 30% 감속 + 긴급 점검 작업지시 발행',
      impact: '예상 고장 방지 — 수리비 ₩12M 절감',
    },
  ],
  2: [
    {
      id: 'peak_power',
      icon: <Zap size={20} />,
      label: '전력 피크 발생',
      description: '현재 소비 전력 계약 한도의 95%',
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/40',
      agentResponse: '에너지 에이전트가 비핵심 설비 전력을 순차적으로 감소시킵니다.',
      severity: 'warning',
      affectedAgents: ['에너지', '생산'],
      aiDecision: 'ESS 방전 개시 + 비핵심 설비 20% 감전',
      impact: '피크 요금 ₩3.2M 절감 예상',
    },
    {
      id: 'ess_discharge',
      icon: <Cpu size={20} />,
      label: 'ESS 방전 최적화',
      description: 'ESS 잔량 45% — 방전 타이밍 최적화',
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/40',
      agentResponse: '에너지 에이전트가 전력 요금 패턴을 분석하여 방전 스케줄을 최적화합니다.',
      severity: 'info',
      affectedAgents: ['에너지'],
      aiDecision: '피크 시간대 ESS 방전 스케줄 자동 조정',
      impact: '에너지 비용 월 ₩8.5M 절감',
    },
    {
      id: 'temp_spike',
      icon: <Thermometer size={20} />,
      label: '온도 급등',
      description: '전기실 온도 38°C 초과 — 냉각 필요',
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/40',
      agentResponse: '에너지 에이전트가 냉각 시스템을 강화하고 발열 설비 부하를 분산합니다.',
      severity: 'warning',
      affectedAgents: ['에너지', '안전'],
      aiDecision: '냉각 시스템 100% 가동 + 발열 설비 부하 분산',
      impact: '설비 과열 방지 — 가동 중단 예방',
    },
  ],
  3: [
    {
      id: 'speed_quality_conflict',
      icon: <AlertTriangle size={20} />,
      label: '속도 vs 품질 충돌',
      description: '생산 에이전트: 속도↑ vs 품질 에이전트: 품질↓ 경고',
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/40',
      agentResponse: 'AI 슈퍼바이저가 두 에이전트의 의견을 조율하여 최적 균형점을 찾습니다.',
      severity: 'warning',
      affectedAgents: ['슈퍼바이저', '생산', '품질'],
      aiDecision: '속도 8% 증속 + 인라인 검사 강화로 품질 유지',
      impact: '납기 준수 + 불량률 1.8% 이하 유지',
    },
    {
      id: 'material_shortage',
      icon: <Radio size={20} />,
      label: '원자재 부족',
      description: '포장재 재고 2시간 분량만 남음',
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-orange-500/40',
      agentResponse: '물류 에이전트가 긴급 발주를 자동 생성하고 대체 자재를 검색합니다.',
      severity: 'critical',
      affectedAgents: ['물류', '생산'],
      aiDecision: '긴급 발주 자동 생성 + 대체 자재 2종 후보 제시',
      impact: '생산 중단 방지 — 납기 위험 해소',
    },
    {
      id: 'defect_surge',
      icon: <X size={20} />,
      label: '불량 급증',
      description: '라인 1 불량률 갑자기 4.2%로 급등',
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/40',
      agentResponse: '품질 에이전트가 원인 분석을 시작하고 해당 배치를 격리합니다.',
      severity: 'critical',
      affectedAgents: ['품질', '생산'],
      aiDecision: '의심 배치 격리 + 원인 분석 AI 자동 개시 + 라인 속도 감속',
      impact: '불량품 출하 방지 — 리콜 리스크 제거',
    },
  ],
};

const PHASES = [
  { label: '이상 감지', icon: <Radio size={12} />, duration: 1500 },
  { label: 'AI 분석 중', icon: <Cpu size={12} />, duration: 2000 },
  { label: '대응 실행', icon: <Activity size={12} />, duration: 2500 },
  { label: '상황 종료', icon: <CheckCircle2 size={12} />, duration: 1000 },
];

export default function ExpoEventTrigger({ scenarioIdx, onEventTriggered, onScoreUpdate }: ExpoEventTriggerProps) {
  const [activeEvent, setActiveEvent] = useState<ActiveEvent | null>(null);
  const [triggeredEvents, setTriggeredEvents] = useState<string[]>([]);
  const [logs, setLogs] = useState<{ time: string; msg: string; type: 'info' | 'warn' | 'crit' | 'success' }[]>([]);
  const phaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const events = SCENARIO_EVENTS[scenarioIdx] || SCENARIO_EVENTS[0];

  const addLog = (msg: string, type: 'info' | 'warn' | 'crit' | 'success' = 'info') => {
    setLogs(prev => [
      { time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }), msg, type },
      ...prev,
    ].slice(0, 8));
  };

  const triggerEvent = (event: TriggerEvent) => {
    if (activeEvent) return;

    setActiveEvent({ event, triggeredAt: new Date(), phase: 'detecting', phaseProgress: 0 });
    setTriggeredEvents(prev => [...prev, event.id]);
    onEventTriggered?.(event.id);
    addLog(`[이벤트 발생] ${event.label}: ${event.description}`, event.severity === 'critical' ? 'crit' : 'warn');

    // Phase progression
    let phaseIdx = 0;
    const phaseLabels: ActiveEvent['phase'][] = ['detecting', 'analyzing', 'responding', 'resolved'];

    const nextPhase = () => {
      phaseIdx++;
      if (phaseIdx < phaseLabels.length) {
        setActiveEvent(prev => prev ? { ...prev, phase: phaseLabels[phaseIdx], phaseProgress: 0 } : null);

        if (phaseIdx === 1) {
          addLog(`AI 에이전트 분석 시작: ${event.affectedAgents.join(', ')} 에이전트 활성화`, 'info');
        } else if (phaseIdx === 2) {
          addLog(`AI 결정: ${event.aiDecision}`, 'success');
        } else if (phaseIdx === 3) {
          addLog(`대응 완료: ${event.impact}`, 'success');
          onScoreUpdate?.(event.severity === 'critical' ? 30 : 15);
          phaseTimerRef.current = setTimeout(() => {
            setActiveEvent(null);
          }, 3000);
          return;
        }

        phaseTimerRef.current = setTimeout(nextPhase, PHASES[phaseIdx].duration);
      }
    };

    phaseTimerRef.current = setTimeout(nextPhase, PHASES[0].duration);
  };

  useEffect(() => {
    addLog('이벤트 트리거 패널 활성화 — 버튼을 눌러 이상 상황을 발생시켜보세요', 'info');
    return () => {
      if (phaseTimerRef.current) clearTimeout(phaseTimerRef.current);
    };
  }, []);

  const phaseIndex = activeEvent
    ? ['detecting', 'analyzing', 'responding', 'resolved'].indexOf(activeEvent.phase)
    : -1;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-black uppercase tracking-widest text-text-primary flex items-center gap-2">
            <Radio size={14} className="text-accent animate-pulse" />
            이벤트 트리거 패널
          </h3>
          <p className="text-[10px] text-text-secondary mt-0.5">버튼을 눌러 이상 상황을 발생시키고 AI 대응을 관찰하세요</p>
        </div>
        <div className="text-[10px] text-text-secondary font-mono">
          {triggeredEvents.length}/{events.length} 체험
        </div>
      </div>

      {/* Active Event Display */}
      <AnimatePresence>
        {activeEvent && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={`overflow-hidden rounded-xl border-2 ${activeEvent.event.borderColor} ${activeEvent.event.bgColor}`}
          >
            <div className="p-4 space-y-3">
              {/* Event Header */}
              <div className="flex items-center gap-3">
                <div className={`${activeEvent.event.color} animate-pulse`}>
                  {activeEvent.event.icon}
                </div>
                <div>
                  <h4 className={`font-black text-sm ${activeEvent.event.color}`}>{activeEvent.event.label}</h4>
                  <p className="text-[10px] text-text-secondary">{activeEvent.event.description}</p>
                </div>
                <div className="ml-auto">
                  {activeEvent.phase === 'resolved' ? (
                    <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 size={12} /> 완료
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-accent flex items-center gap-1">
                      <Activity size={12} className="animate-pulse" /> 처리 중
                    </span>
                  )}
                </div>
              </div>

              {/* Phase Progress */}
              <div className="flex items-center gap-1">
                {PHASES.map((phase, i) => (
                  <React.Fragment key={i}>
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-bold transition-all ${
                      i < phaseIndex
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : i === phaseIndex
                        ? 'bg-accent/20 text-accent border border-accent/30 animate-pulse'
                        : 'bg-white/5 text-text-secondary border border-white/10'
                    }`}>
                      {phase.icon}
                      <span className="hidden sm:inline">{phase.label}</span>
                    </div>
                    {i < PHASES.length - 1 && (
                      <ChevronRight size={10} className={i < phaseIndex ? 'text-emerald-400' : 'text-text-secondary'} />
                    )}
                  </React.Fragment>
                ))}
              </div>

              {/* AI Response */}
              {phaseIndex >= 1 && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-lg bg-bg/50 border border-white/10"
                >
                  <p className="text-[10px] text-text-secondary mb-1 font-bold uppercase tracking-widest">AI 에이전트 응답</p>
                  <p className="text-xs text-text-primary leading-relaxed">{activeEvent.event.agentResponse}</p>
                </motion.div>
              )}

              {phaseIndex >= 2 && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20"
                >
                  <p className="text-[10px] text-emerald-400 mb-1 font-bold uppercase tracking-widest">AI 결정 사항</p>
                  <p className="text-xs text-text-primary leading-relaxed">{activeEvent.event.aiDecision}</p>
                  <p className="text-[10px] text-emerald-400 mt-2 font-bold">예상 효과: {activeEvent.event.impact}</p>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Trigger Buttons */}
      <div className="space-y-2">
        {events.map((event) => {
          const isTriggered = triggeredEvents.includes(event.id);
          const isActive = activeEvent?.event.id === event.id;
          const isDisabled = !!activeEvent && !isActive;

          return (
            <button
              key={event.id}
              onClick={() => !isTriggered && !isDisabled && triggerEvent(event)}
              disabled={isDisabled || isTriggered}
              className={`w-full p-3 rounded-xl border-2 text-left transition-all ${
                isActive
                  ? `${event.borderColor} ${event.bgColor} scale-[1.01]`
                  : isTriggered
                  ? 'border-emerald-500/20 bg-emerald-500/5 opacity-60'
                  : isDisabled
                  ? 'border-border bg-surface opacity-40 cursor-not-allowed'
                  : `${event.borderColor} ${event.bgColor} hover:scale-[1.01] cursor-pointer`
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`${isTriggered ? 'text-emerald-400' : event.color} transition-colors`}>
                  {isTriggered ? <CheckCircle2 size={20} /> : event.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-black ${isTriggered ? 'text-emerald-400' : event.color}`}>
                      {event.label}
                    </span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold border ${
                      event.severity === 'critical'
                        ? 'bg-red-500/10 border-red-500/30 text-red-400'
                        : event.severity === 'warning'
                        ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
                        : 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                    }`}>
                      {event.severity === 'critical' ? '긴급' : event.severity === 'warning' ? '경고' : '정보'}
                    </span>
                  </div>
                  <p className="text-[10px] text-text-secondary truncate">{event.description}</p>
                </div>
                {isTriggered && (
                  <span className="text-[9px] text-emerald-400 font-bold shrink-0">체험 완료</span>
                )}
                {!isTriggered && !isDisabled && (
                  <span className={`text-[9px] font-bold shrink-0 ${event.color}`}>발생 →</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Log Panel */}
      <div className="bg-bg/50 border border-border rounded-xl p-3 h-32 overflow-hidden flex flex-col">
        <p className="text-[9px] font-bold text-text-secondary uppercase tracking-widest mb-2">실시간 이벤트 로그</p>
        <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar">
          {logs.map((log, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex gap-2 text-[9px] font-mono"
            >
              <span className="text-text-secondary shrink-0">[{log.time}]</span>
              <span className={
                log.type === 'crit' ? 'text-red-400 font-bold' :
                log.type === 'warn' ? 'text-yellow-400' :
                log.type === 'success' ? 'text-emerald-400 font-bold' :
                'text-text-primary'
              }>
                {log.msg}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
