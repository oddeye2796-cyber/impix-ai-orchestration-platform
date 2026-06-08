/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Radio, Trophy, ChevronLeft, ChevronRight, Sparkles, X, MessageSquare } from 'lucide-react';
import ExpoAgentDebate from './ExpoAgentDebate';
import ExpoEventTrigger from './ExpoEventTrigger';
import ExpoScoreBoard from './ExpoScoreBoard';

interface ScoreEntry {
  id: string;
  label: string;
  type: 'approved' | 'rejected' | 'event';
  points: number;
  timestamp: Date;
}

interface ExpoSidebarProps {
  scenarioIdx: number;
  score: number;
  approvedCount: number;
  rejectedCount: number;
  eventsTriggered: number;
  scoreHistory: ScoreEntry[];
  onEventTriggered: (eventId: string) => void;
  onScoreUpdate: (delta: number, label?: string, isCorrect?: boolean) => void;
  onReset: () => void;
  onNewScenario: () => void;
  onClose: () => void;
}

type Tab = 'events' | 'score' | 'debate';

export default function ExpoSidebar({
  scenarioIdx,
  score,
  approvedCount,
  rejectedCount,
  eventsTriggered,
  scoreHistory,
  onEventTriggered,
  onScoreUpdate,
  onReset,
  onNewScenario,
  onClose,
}: ExpoSidebarProps) {
  const [activeTab, setActiveTab] = useState<Tab>('events');
  const [showDebate, setShowDebate] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <>
      {/* Collapse Toggle */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-[150] w-6 h-16 bg-surface border border-border border-r-0 rounded-l-xl flex items-center justify-center hover:bg-surface-hover transition-colors"
        style={{ right: isCollapsed ? 0 : '320px' }}
      >
        {isCollapsed ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
      </button>

      {/* Sidebar Panel */}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ x: 320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 320, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-80 z-[140] bg-surface border-l border-border flex flex-col shadow-2xl"
          >
            {/* Sidebar Header */}
            <div className="px-4 py-3 border-b border-border bg-surface-hover/30 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <Sparkles size={12} className="text-amber-400" />
                </div>
                <div>
                  <p className="text-xs font-black text-text-primary">박람회 체험 모드</p>
                  <p className="text-[9px] text-text-secondary font-mono">EXPO SIMULATION</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-surface-hover text-text-secondary hover:text-text-primary transition-colors"
                title="체험 모드 종료"
              >
                <X size={14} />
              </button>
            </div>

            {/* Score Summary Bar */}
            <div className="px-4 py-2 bg-gradient-to-r from-accent/10 to-blue-500/10 border-b border-border shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trophy size={14} className="text-yellow-400" />
                  <span className="text-xs font-black">{score}점</span>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-text-secondary">
                  <span className="text-emerald-400 font-bold">✓{approvedCount}</span>
                  <span className="text-red-400 font-bold">✗{rejectedCount}</span>
                  <span className="text-blue-400 font-bold">⚡{eventsTriggered}</span>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-border shrink-0">
      {[
        { id: 'events' as Tab, label: '이벤트 트리거', icon: <Radio size={12} /> },
        { id: 'score' as Tab, label: '점수판', icon: <Trophy size={12} /> },
        { id: 'debate' as Tab, label: 'AI 토론', icon: <MessageSquare size={12} /> },
      ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 py-2.5 text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all ${
                    activeTab === tab.id
                      ? 'text-accent border-b-2 border-accent bg-accent/5'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
              <AnimatePresence mode="wait">
                {activeTab === 'events' ? (
                  <motion.div
                    key="events"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                  >
                    <ExpoEventTrigger
                      scenarioIdx={scenarioIdx}
                      onEventTriggered={onEventTriggered}
                      onScoreUpdate={onScoreUpdate}
                    />
                  </motion.div>
                ) : activeTab === 'debate' ? (
                  <motion.div
                    key="debate"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="space-y-4"
                  >
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-widest text-text-primary flex items-center gap-2 mb-1">
                        <MessageSquare size={14} className="text-purple-400" />
                        AI 에이전트 토론
                      </h3>
                      <p className="text-[10px] text-text-secondary">6개의 AI 에이전트가 실시간으로 협의하는 과정을 관찰하세요</p>
                    </div>
                    <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/20 space-y-3">
                      <p className="text-xs text-text-secondary leading-relaxed">
                        현재 시나리오에서 AI 에이전트들이 어떻게 의견을 교환하고 최적의 결정을 내리는지 실시간 토론을 시뮬레이션합니다.
                      </p>
                      <div className="grid grid-cols-3 gap-1.5">
                        {['🔍 품질', '🔧 예지보전', '⚙️ 생산', '⚡ 에너지', '🛡️ 안전', '🧠 슈퍼바이저'].map(agent => (
                          <div key={agent} className="px-2 py-1.5 rounded-lg bg-surface border border-border text-[9px] text-text-secondary text-center font-bold">{agent}</div>
                        ))}
                      </div>
                      <button
                        onClick={() => setShowDebate(true)}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 text-white font-black text-xs flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                      >
                        <MessageSquare size={14} />
                        AI 토론 시뮬레이션 실행
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="score"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                  >
                    <ExpoScoreBoard
                      score={score}
                      approvedCount={approvedCount}
                      rejectedCount={rejectedCount}
                      eventsTriggered={eventsTriggered}
                      scenarioIdx={scenarioIdx}
                      onReset={onReset}
                      onNewScenario={onNewScenario}
                      scoreHistory={scoreHistory}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* AI Agent Debate Modal */}
      {showDebate && (
        <ExpoAgentDebate
          scenarioIdx={scenarioIdx}
          isActive={showDebate}
          onClose={() => setShowDebate(false)}
        />
      )}
    </>
  );
}
