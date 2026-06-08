/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Factory, Sparkles, Play, ChevronRight, Zap, Shield, Leaf, Target, Users, Award, Clock } from 'lucide-react';

interface ExpoLandingProps {
  onStart: (scenarioIdx: number) => void;
  onSkip: () => void;
}

const SCENARIOS = [
  {
    id: 0,
    icon: '⚡',
    color: 'from-blue-500 to-cyan-500',
    borderColor: 'border-blue-500/40',
    bgColor: 'bg-blue-500/10',
    textColor: 'text-blue-400',
    title: '전사 생산 극대화',
    subtitle: 'OEE & 통합 최적화',
    description: '공장 전체 가동 효율을 극대화하는 AI 에이전트들의 실시간 협업을 체험하세요.',
    duration: '약 5분',
    difficulty: '입문',
    features: ['실시간 KPI 모니터링', 'AI 추천 승인/거부', '에이전트 오케스트레이션'],
  },
  {
    id: 1,
    icon: '🛡️',
    color: 'from-red-500 to-orange-500',
    borderColor: 'border-red-500/40',
    bgColor: 'bg-red-500/10',
    textColor: 'text-red-400',
    title: '돌발 고장 & 안전 예방',
    subtitle: '비상 대응 시나리오',
    description: '갑작스러운 설비 이상과 가스 누출 상황에서 AI가 어떻게 대응하는지 직접 경험하세요.',
    duration: '약 5분',
    difficulty: '중급',
    features: ['비상 경보 시뮬레이션', 'CCTV AI 감시', '안전 우선 정책 체험'],
  },
  {
    id: 2,
    icon: '🌿',
    color: 'from-green-500 to-emerald-500',
    borderColor: 'border-green-500/40',
    bgColor: 'bg-green-500/10',
    textColor: 'text-green-400',
    title: '저에너지 피크 관리',
    subtitle: 'ESS & 에너지 최적화',
    description: '전력 피크 시간대에 AI가 에너지를 최적화하고 비용을 절감하는 과정을 체험하세요.',
    duration: '약 5분',
    difficulty: '중급',
    features: ['피크 부하 관리', 'ESS 방전 제어', '에너지 비용 절감'],
  },
  {
    id: 3,
    icon: '🎯',
    color: 'from-purple-500 to-pink-500',
    borderColor: 'border-purple-500/40',
    bgColor: 'bg-purple-500/10',
    textColor: 'text-purple-400',
    title: '러시오더 품질 관리',
    subtitle: '긴급 납기 대응',
    description: '긴급 주문 상황에서 품질을 유지하며 생산 속도를 높이는 AI의 균형 잡힌 판단을 체험하세요.',
    duration: '약 5분',
    difficulty: '고급',
    features: ['생산 속도 최적화', '품질 가드레일', '다자 에이전트 협의'],
  },
];

const STATS = [
  { icon: <Users size={20} />, value: '6개', label: 'AI 에이전트' },
  { icon: <Zap size={20} />, value: '실시간', label: '데이터 처리' },
  { icon: <Shield size={20} />, value: '98.2%', label: '의사결정 신뢰도' },
  { icon: <Award size={20} />, value: '4가지', label: '체험 시나리오' },
];

export default function ExpoLanding({ onStart, onSkip }: ExpoLandingProps) {
  const [selectedScenario, setSelectedScenario] = useState<number | null>(null);
  const [phase, setPhase] = useState<'intro' | 'select'>('intro');
  const [countdown, setCountdown] = useState(3);
  const [isCountingDown, setIsCountingDown] = useState(false);

  useEffect(() => {
    if (isCountingDown && countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    } else if (isCountingDown && countdown === 0) {
      if (selectedScenario !== null) {
        onStart(selectedScenario);
      }
    }
  }, [isCountingDown, countdown, selectedScenario, onStart]);

  const handleStartCountdown = (scenarioIdx: number) => {
    setSelectedScenario(scenarioIdx);
    setIsCountingDown(true);
    setCountdown(3);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-bg overflow-y-auto"
    >
      {/* Animated background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-bg via-surface to-bg" />
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-accent/30 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              opacity: [0, 1, 0],
              scale: [0, 1.5, 0],
            }}
            transition={{
              duration: 3 + Math.random() * 4,
              repeat: Infinity,
              delay: Math.random() * 5,
            }}
          />
        ))}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
      </div>

      {/* Countdown Overlay */}
      <AnimatePresence>
        {isCountingDown && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-center justify-center bg-bg/90 backdrop-blur-xl"
          >
            <div className="text-center">
              <motion.div
                key={countdown}
                initial={{ scale: 2, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                className="text-[120px] font-black text-accent leading-none mb-4"
              >
                {countdown === 0 ? '🚀' : countdown}
              </motion.div>
              <p className="text-xl font-bold text-text-secondary">
                {countdown === 0 ? '시뮬레이션 시작!' : '시뮬레이션을 준비하는 중...'}
              </p>
              {selectedScenario !== null && (
                <p className="text-sm text-text-secondary mt-2">
                  {SCENARIOS[selectedScenario].title} 시나리오
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center shadow-lg shadow-accent/20">
              <Factory className="text-white" size={24} />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight">IMPIX AI</h1>
              <p className="text-xs text-text-secondary font-mono">ORCHESTRATION PLATFORM</p>
            </div>
          </div>
          <button
            onClick={onSkip}
            className="px-4 py-2 text-xs text-text-secondary hover:text-text-primary border border-border hover:border-accent/30 rounded-lg transition-all"
          >
            관리자 모드로 입장 →
          </button>
        </div>

        {/* Hero Section */}
        <div className="flex-1 flex flex-col items-center justify-center px-8 py-12 text-center">
          <AnimatePresence mode="wait">
            {phase === 'intro' ? (
              <motion.div
                key="intro"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -30 }}
                className="max-w-4xl mx-auto space-y-8"
              >
                {/* Badge */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/30 rounded-full text-amber-400 text-sm font-bold"
                >
                  <Sparkles size={16} className="animate-pulse" />
                  AI EXPO 2026 — 박람회 체험 시뮬레이션
                </motion.div>

                {/* Title */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <h2 className="text-5xl md:text-6xl font-black tracking-tight mb-4">
                    AI가 공장을
                    <br />
                    <span className="bg-gradient-to-r from-accent to-blue-400 bg-clip-text text-transparent">
                      스스로 운영한다면?
                    </span>
                  </h2>
                  <p className="text-lg text-text-secondary max-w-2xl mx-auto leading-relaxed">
                    6개의 AI 에이전트가 실시간으로 협력하여 공장의 품질, 안전, 에너지, 물류를 동시에 최적화합니다.
                    지금 직접 체험해보세요.
                  </p>
                </motion.div>

                {/* Stats */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto"
                >
                  {STATS.map((stat, i) => (
                    <div key={i} className="bg-surface/50 border border-border rounded-xl p-4 text-center">
                      <div className="text-accent mb-2 flex justify-center">{stat.icon}</div>
                      <div className="text-xl font-black">{stat.value}</div>
                      <div className="text-xs text-text-secondary">{stat.label}</div>
                    </div>
                  ))}
                </motion.div>

                {/* CTA */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="flex flex-col sm:flex-row gap-4 justify-center"
                >
                  <button
                    onClick={() => setPhase('select')}
                    className="px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-bg font-black text-lg rounded-2xl shadow-2xl shadow-orange-500/20 flex items-center gap-3 justify-center transition-all hover:scale-105 active:scale-95"
                  >
                    <Play size={20} />
                    시나리오 선택하기
                    <ChevronRight size={20} />
                  </button>
                  <button
                    onClick={() => handleStartCountdown(0)}
                    className="px-8 py-4 bg-surface border border-border hover:border-accent/40 text-text-primary font-bold text-lg rounded-2xl transition-all hover:scale-105 active:scale-95"
                  >
                    바로 시작하기 ⚡
                  </button>
                </motion.div>

                {/* Scroll hint */}
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1 }}
                  className="text-xs text-text-secondary"
                >
                  또는 아래에서 시나리오를 선택하세요
                </motion.p>
              </motion.div>
            ) : (
              <motion.div
                key="select"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -30 }}
                className="max-w-6xl mx-auto w-full space-y-8"
              >
                <div>
                  <h2 className="text-3xl font-black mb-2">체험 시나리오를 선택하세요</h2>
                  <p className="text-text-secondary">각 시나리오는 실제 스마트 공장에서 발생하는 상황을 시뮬레이션합니다.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {SCENARIOS.map((scenario, idx) => (
                    <motion.div
                      key={scenario.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className={`relative group cursor-pointer rounded-2xl border-2 ${scenario.borderColor} ${scenario.bgColor} p-6 hover:scale-[1.02] transition-all duration-200`}
                      onClick={() => handleStartCountdown(scenario.id)}
                    >
                      {/* Scenario Icon & Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <span className="text-4xl">{scenario.icon}</span>
                          <div>
                            <h3 className="text-lg font-black">{scenario.title}</h3>
                            <p className={`text-xs font-bold ${scenario.textColor}`}>{scenario.subtitle}</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-[10px] text-text-secondary flex items-center gap-1">
                            <Clock size={10} /> {scenario.duration}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${scenario.bgColor} ${scenario.textColor} border ${scenario.borderColor}`}>
                            {scenario.difficulty}
                          </span>
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-sm text-text-secondary leading-relaxed mb-4">
                        {scenario.description}
                      </p>

                      {/* Features */}
                      <div className="flex flex-wrap gap-2 mb-4">
                        {scenario.features.map((feature, i) => (
                          <span key={i} className="text-[10px] px-2 py-1 bg-white/5 border border-white/10 rounded-full text-text-secondary">
                            {feature}
                          </span>
                        ))}
                      </div>

                      {/* Start Button */}
                      <div className={`w-full py-3 rounded-xl bg-gradient-to-r ${scenario.color} text-bg font-black text-sm flex items-center justify-center gap-2 group-hover:opacity-90 transition-opacity`}>
                        <Play size={16} />
                        이 시나리오 체험하기
                      </div>
                    </motion.div>
                  ))}
                </div>

                <button
                  onClick={() => setPhase('intro')}
                  className="text-sm text-text-secondary hover:text-text-primary transition-colors"
                >
                  ← 돌아가기
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Scenario Quick Select (always visible on intro) */}
        {phase === 'intro' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="px-8 pb-12"
          >
            <div className="max-w-4xl mx-auto">
              <p className="text-xs text-text-secondary text-center mb-4 uppercase tracking-widest font-bold">빠른 시나리오 선택</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {SCENARIOS.map((scenario) => (
                  <button
                    key={scenario.id}
                    onClick={() => handleStartCountdown(scenario.id)}
                    className={`p-4 rounded-xl border-2 ${scenario.borderColor} ${scenario.bgColor} hover:scale-105 transition-all text-center`}
                  >
                    <span className="text-2xl block mb-2">{scenario.icon}</span>
                    <span className={`text-xs font-bold ${scenario.textColor}`}>{scenario.title}</span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
