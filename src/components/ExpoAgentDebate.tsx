/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Cpu, MessageSquare, CheckCircle2, AlertTriangle, Zap, Activity, ChevronRight } from 'lucide-react';
import { t } from '../i18n';

interface AgentMessage {
  id: string;
  agent: string;
  agentColor: string;
  agentBg: string;
  agentIcon: string;
  message: string;
  type: 'analysis' | 'proposal' | 'objection' | 'agreement' | 'decision';
  timestamp: number;
}

interface ExpoAgentDebateProps {
  scenarioIdx: number;
  isActive: boolean;
  onClose: () => void;
}

const AGENT_CONFIGS = {
  '품질 에이전트': { color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30', icon: '🔍' },
  '예지보전 에이전트': { color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30', icon: '🔧' },
  '생산 에이전트': { color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30', icon: '⚙️' },
  '에너지 에이전트': { color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', icon: '⚡' },
  '안전 에이전트': { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', icon: '🛡️' },
  '슈퍼바이저': { color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30', icon: '🧠' },
};

/** Compact labels for the agent status bar; the full name is the catalog key. */
const AGENT_SHORT_NAMES: Record<string, string> = {
  '품질 에이전트': '품질',
  '예지보전 에이전트': '예지보전',
  '생산 에이전트': '생산',
  '에너지 에이전트': '에너지',
  '안전 에이전트': '안전',
  '슈퍼바이저': '슈퍼바이저',
};

const DEBATE_SCRIPTS: Record<number, AgentMessage[]> = {
  0: [
    { id: '1', agent: '생산 에이전트', agentColor: 'text-green-400', agentBg: 'bg-green-500/10', agentIcon: '⚙️', message: '라인 2 가동률이 68%로 목표치(85%) 대비 17% 부족합니다. 병목 구간 분석 결과 수축포장기-01의 처리 속도가 원인입니다.', type: 'analysis', timestamp: 0 },
    { id: '2', agent: '품질 에이전트', agentColor: 'text-blue-400', agentBg: 'bg-blue-500/10', agentIcon: '🔍', message: '속도 증가 전 주의가 필요합니다. 현재 불량률이 2.1%로 기준치(1.5%)를 초과하고 있습니다. 속도 증가 시 불량률이 추가 상승할 위험이 있습니다.', type: 'objection', timestamp: 1500 },
    { id: '3', agent: '예지보전 에이전트', agentColor: 'text-orange-400', agentBg: 'bg-orange-500/10', agentIcon: '🔧', message: '수축포장기-01의 진동값이 3.8mm/s로 상승 중입니다. 온도를 173°C로 최적화하면 진동을 줄이면서 처리 속도도 개선할 수 있습니다.', type: 'proposal', timestamp: 3000 },
    { id: '4', agent: '에너지 에이전트', agentColor: 'text-yellow-400', agentBg: 'bg-yellow-500/10', agentIcon: '⚡', message: '온도 조정 시 에너지 소비는 약 3% 증가하지만, 생산 효율 향상으로 단위당 에너지 비용은 오히려 감소합니다. 동의합니다.', type: 'agreement', timestamp: 4500 },
    { id: '5', agent: '품질 에이전트', agentColor: 'text-blue-400', agentBg: 'bg-blue-500/10', agentIcon: '🔍', message: '173°C 온도 조정 후 비전 검사 민감도를 높이면 불량률을 1.2%로 낮출 수 있습니다. 예지보전 에이전트의 제안에 동의합니다.', type: 'agreement', timestamp: 6000 },
    { id: '6', agent: '슈퍼바이저', agentColor: 'text-purple-400', agentBg: 'bg-purple-500/10', agentIcon: '🧠', message: '✅ 합의 완료: 수축포장기-01 온도 173°C 조정 + 비전 검사 강화 + 라인 2 속도 8% 증속. 예상 OEE +12%, 불량률 1.2% 달성.', type: 'decision', timestamp: 7500 },
  ],
  1: [
    { id: '1', agent: '안전 에이전트', agentColor: 'text-red-400', agentBg: 'bg-red-500/10', agentIcon: '🛡️', message: '🚨 긴급 경보: Zone B-4 가스 농도 LEL 15% 감지. 즉시 해당 구역 작업 중단 및 대피 필요합니다.', type: 'analysis', timestamp: 0 },
    { id: '2', agent: '생산 에이전트', agentColor: 'text-green-400', agentBg: 'bg-green-500/10', agentIcon: '⚙️', message: 'Zone B-4 라인 3개 즉시 정지합니다. 생산 손실 예상이지만 안전이 최우선입니다. AMR 경로 우회 설정 완료.', type: 'proposal', timestamp: 1200 },
    { id: '3', agent: '예지보전 에이전트', agentColor: 'text-orange-400', agentBg: 'bg-orange-500/10', agentIcon: '🔧', message: '가스 누출 원인 분석 중: 배관 연결부 압력 이상 감지. 긴급 점검 작업지시 생성 완료. 추정 수리 시간 45분.', type: 'analysis', timestamp: 2400 },
    { id: '4', agent: '에너지 에이전트', agentColor: 'text-yellow-400', agentBg: 'bg-yellow-500/10', agentIcon: '⚡', message: '환기 시스템 최대 출력으로 전환합니다. 추가 전력 소비 발생하지만 안전 확보가 우선입니다.', type: 'agreement', timestamp: 3600 },
    { id: '5', agent: '안전 에이전트', agentColor: 'text-red-400', agentBg: 'bg-red-500/10', agentIcon: '🛡️', message: '작업자 12명 안전 대피 완료 확인. 소방서 자동 신고 완료. 가스 농도 모니터링 계속 중.', type: 'analysis', timestamp: 4800 },
    { id: '6', agent: '슈퍼바이저', agentColor: 'text-purple-400', agentBg: 'bg-purple-500/10', agentIcon: '🧠', message: '✅ 비상 대응 완료: 구역 격리 + 환기 가동 + 작업자 대피 + 긴급 수리 지시. 45분 후 재가동 예정.', type: 'decision', timestamp: 6000 },
  ],
  2: [
    { id: '1', agent: '에너지 에이전트', agentColor: 'text-yellow-400', agentBg: 'bg-yellow-500/10', agentIcon: '⚡', message: '현재 전력 소비 4,850kW로 계약 한도(5,000kW)의 97%입니다. 피크 요금 구간 진입 10분 전입니다.', type: 'analysis', timestamp: 0 },
    { id: '2', agent: '생산 에이전트', agentColor: 'text-green-400', agentBg: 'bg-green-500/10', agentIcon: '⚙️', message: '비핵심 설비 전력을 줄이면 생산에 영향이 있습니다. 어떤 설비를 우선 감전할지 결정이 필요합니다.', type: 'objection', timestamp: 1500 },
    { id: '3', agent: '에너지 에이전트', agentColor: 'text-yellow-400', agentBg: 'bg-yellow-500/10', agentIcon: '⚡', message: 'ESS 잔량 68%, 즉시 방전 가능합니다. ESS 방전 500kW + 냉각 시스템 20% 감전으로 한도 내 유지 가능합니다.', type: 'proposal', timestamp: 3000 },
    { id: '4', agent: '품질 에이전트', agentColor: 'text-blue-400', agentBg: 'bg-blue-500/10', agentIcon: '🔍', message: '냉각 시스템 감전 시 온도 변화로 불량률 영향 가능성이 있습니다. 냉각 대신 조명 및 공조 시스템 감전을 권장합니다.', type: 'objection', timestamp: 4500 },
    { id: '5', agent: '에너지 에이전트', agentColor: 'text-yellow-400', agentBg: 'bg-yellow-500/10', agentIcon: '⚡', message: '품질 에이전트 의견 반영: 조명 30% + 공조 15% 감전 + ESS 방전 300kW로 조정합니다. 피크 요금 절감 ₩2.8M 예상.', type: 'agreement', timestamp: 6000 },
    { id: '6', agent: '슈퍼바이저', agentColor: 'text-purple-400', agentBg: 'bg-purple-500/10', agentIcon: '🧠', message: '✅ 최적 합의: ESS 방전 300kW + 조명/공조 감전 + 생산 영향 최소화. 피크 요금 ₩2.8M 절감 달성.', type: 'decision', timestamp: 7500 },
  ],
  3: [
    { id: '1', agent: '생산 에이전트', agentColor: 'text-green-400', agentBg: 'bg-green-500/10', agentIcon: '⚙️', message: '긴급 주문 500개, 납기 4시간. 현재 생산 속도로는 3.2시간 소요 예상. 속도를 15% 증속하면 납기 달성 가능합니다.', type: 'proposal', timestamp: 0 },
    { id: '2', agent: '품질 에이전트', agentColor: 'text-blue-400', agentBg: 'bg-blue-500/10', agentIcon: '🔍', message: '⚠️ 반대합니다. 15% 증속 시 불량률이 현재 1.8%에서 3.5%로 상승 예측됩니다. 긴급 주문 품질 보증이 불가합니다.', type: 'objection', timestamp: 1500 },
    { id: '3', agent: '예지보전 에이전트', agentColor: 'text-orange-400', agentBg: 'bg-orange-500/10', agentIcon: '🔧', message: '절충안: 속도 8% 증속 + 인라인 비전 검사 강화. 불량률 2.0% 이하 유지하면서 납기 달성 가능합니다.', type: 'proposal', timestamp: 3000 },
    { id: '4', agent: '품질 에이전트', agentColor: 'text-blue-400', agentBg: 'bg-blue-500/10', agentIcon: '🔍', message: '8% 증속 + 비전 검사 강화 조합이라면 불량률 1.9% 유지 가능합니다. 이 조건에서 동의합니다.', type: 'agreement', timestamp: 4500 },
    { id: '5', agent: '에너지 에이전트', agentColor: 'text-yellow-400', agentBg: 'bg-yellow-500/10', agentIcon: '⚡', message: '증속으로 에너지 소비 5% 증가하지만 납기 달성 시 수익이 더 크므로 동의합니다.', type: 'agreement', timestamp: 5500 },
    { id: '6', agent: '슈퍼바이저', agentColor: 'text-purple-400', agentBg: 'bg-purple-500/10', agentIcon: '🧠', message: '✅ 황금 합의: 속도 8% 증속 + 인라인 비전 검사 강화. 납기 준수 + 불량률 1.9% 이하 + 품질 보증 달성.', type: 'decision', timestamp: 7000 },
  ],
};

export default function ExpoAgentDebate({ scenarioIdx, isActive, onClose }: ExpoAgentDebateProps) {
  const [visibleMessages, setVisibleMessages] = useState<AgentMessage[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [typingAgent, setTypingAgent] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const script = DEBATE_SCRIPTS[scenarioIdx] || DEBATE_SCRIPTS[0];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [visibleMessages]);

  const startDebate = () => {
    setVisibleMessages([]);
    setIsRunning(true);
    setIsComplete(false);
    setTypingAgent(null);
    timeoutsRef.current.forEach(timer => clearTimeout(timer));
    timeoutsRef.current = [];

    script.forEach((msg, idx) => {
      // Show typing indicator
      const typingTimeout = setTimeout(() => {
        setTypingAgent(msg.agent);
      }, msg.timestamp);

      // Show actual message
      const msgTimeout = setTimeout(() => {
        setTypingAgent(null);
        setVisibleMessages(prev => [...prev, msg]);
        if (idx === script.length - 1) {
          setIsRunning(false);
          setIsComplete(true);
        }
      }, msg.timestamp + 800);

      timeoutsRef.current.push(typingTimeout, msgTimeout);
    });
  };

  useEffect(() => {
    if (isActive) {
      startDebate();
    }
    return () => {
      timeoutsRef.current.forEach(timer => clearTimeout(timer));
    };
  }, [isActive, scenarioIdx]);

  const getTypeStyle = (type: AgentMessage['type']) => {
    switch (type) {
      case 'analysis': return 'border-l-2 border-blue-500/50';
      case 'proposal': return 'border-l-2 border-green-500/50';
      case 'objection': return 'border-l-2 border-red-500/50';
      case 'agreement': return 'border-l-2 border-emerald-500/50';
      case 'decision': return 'border-l-2 border-purple-500/50 bg-purple-500/5';
      default: return '';
    }
  };

  const getTypeLabel = (type: AgentMessage['type']) => {
    switch (type) {
      case 'analysis': return { label: t('분석'), color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' };
      case 'proposal': return { label: t('제안'), color: 'text-green-400 bg-green-500/10 border-green-500/20' };
      case 'objection': return { label: t('이의'), color: 'text-red-400 bg-red-500/10 border-red-500/20' };
      case 'agreement': return { label: t('동의'), color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
      case 'decision': return { label: t('최종 결정'), color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' };
      default: return { label: '', color: '' };
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-bg/80 backdrop-blur-xl"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 20 }}
        animate={{ y: 0 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-2xl bg-surface border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: '85vh' }}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-border bg-gradient-to-r from-purple-500/10 to-blue-500/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <MessageSquare size={16} className="text-purple-400" />
            </div>
            <div>
              <h3 className="text-sm font-black text-text-primary">{t('AI 에이전트 실시간 토론')}</h3>
              <p className="text-[10px] text-text-secondary font-mono">{t('MULTI-AGENT ORCHESTRATION DEBATE')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isRunning && (
              <span className="flex items-center gap-1.5 text-[10px] text-accent font-bold">
                <Activity size={10} className="animate-pulse" />
                {t('토론 진행 중')}
              </span>
            )}
            {isComplete && (
              <span className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-bold">
                <CheckCircle2 size={10} />
                {t('합의 완료')}
              </span>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-surface-hover text-text-secondary hover:text-text-primary transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Agent Status Bar */}
        <div className="px-5 py-2 border-b border-border bg-surface-hover/20 flex items-center gap-3 shrink-0 overflow-x-auto">
          {Object.entries(AGENT_CONFIGS).map(([name, config]) => {
            const isTyping = typingAgent === name;
            const hasSpoken = visibleMessages.some(m => m.agent === name);
            return (
              <div key={name} className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[9px] font-bold shrink-0 transition-all ${
                isTyping ? `${config.bg} ${config.border} ${config.color} scale-105` :
                hasSpoken ? `${config.bg} ${config.border} ${config.color} opacity-80` :
                'bg-surface border-border text-text-secondary opacity-50'
              }`}>
                <span>{config.icon}</span>
                <span className="hidden sm:inline">{t(AGENT_SHORT_NAMES[name] ?? name)}</span>
                {isTyping && <span className="animate-bounce">...</span>}
              </div>
            );
          })}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          <AnimatePresence>
            {visibleMessages.map((msg) => {
              const typeInfo = getTypeLabel(msg.type);
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`p-3 rounded-xl ${msg.agentBg} ${getTypeStyle(msg.type)}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-base">{msg.agentIcon}</span>
                    <span className={`text-xs font-black ${msg.agentColor}`}>{t(msg.agent)}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-bold ${typeInfo.color}`}>
                      {typeInfo.label}
                    </span>
                  </div>
                  <p className="text-xs text-text-primary leading-relaxed">{t(msg.message)}</p>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Typing Indicator */}
          <AnimatePresence>
            {typingAgent && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 p-3 rounded-xl bg-surface-hover"
              >
                <span className="text-base">{AGENT_CONFIGS[typingAgent as keyof typeof AGENT_CONFIGS]?.icon || '🤖'}</span>
                <span className={`text-xs font-bold ${AGENT_CONFIGS[typingAgent as keyof typeof AGENT_CONFIGS]?.color || 'text-text-secondary'}`}>
                  {t(typingAgent)}
                </span>
                <span className="text-text-secondary text-xs">{t('분석 중')}</span>
                <div className="flex gap-1">
                  {[0, 1, 2].map(i => (
                    <motion.div
                      key={i}
                      className="w-1.5 h-1.5 bg-accent rounded-full"
                      animate={{ y: [0, -4, 0] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={messagesEndRef} />
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border bg-surface/50 flex items-center justify-between shrink-0">
          <button
            onClick={startDebate}
            disabled={isRunning}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 text-white text-xs font-black disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity flex items-center gap-2"
          >
            <Zap size={12} />
            {isComplete ? t('다시 실행') : t('토론 시작')}
          </button>
          <p className="text-[10px] text-text-secondary">
            {visibleMessages.length} / {script.length} {t('메시지')}
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
