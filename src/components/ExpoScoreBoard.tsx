/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { t } from '../i18n';
import {
  Trophy, Star, CheckCircle2, X, TrendingUp,
  Award, Share2, RotateCcw, ChevronRight, Zap,
  Shield, Leaf, Target
} from 'lucide-react';

interface ScoreEntry {
  id: string;
  label: string;
  type: 'approved' | 'rejected' | 'event';
  points: number;
  timestamp: Date;
}

interface ExpoScoreBoardProps {
  score: number;
  approvedCount: number;
  rejectedCount: number;
  eventsTriggered: number;
  scenarioIdx: number;
  onReset: () => void;
  onNewScenario: () => void;
  scoreHistory: ScoreEntry[];
}

const SCENARIO_NAMES = ['전사 생산 극대화', '돌발 고장 & 안전 예방', '저에너지 피크 관리', '러시오더 품질 관리'];
const SCENARIO_ICONS = ['⚡', '🛡️', '🌿', '🎯'];

const getRank = (score: number) => {
  if (score >= 200) return { label: t('AI 마스터'), color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', icon: '🏆' };
  if (score >= 150) return { label: t('AI 전문가'), color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30', icon: '🥇' };
  if (score >= 100) return { label: t('AI 숙련자'), color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30', icon: '🥈' };
  if (score >= 50) return { label: t('AI 입문자'), color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30', icon: '🥉' };
  return { label: t('AI 견습생'), color: 'text-text-secondary', bg: 'bg-surface', border: 'border-border', icon: '🎖️' };
};

const getInsight = (approvedCount: number, rejectedCount: number, score: number) => {
  const total = approvedCount + rejectedCount;
  if (total === 0) return t('아직 AI 추천을 평가하지 않았습니다.');
  const approvalRate = (approvedCount / total) * 100;
  if (approvalRate >= 80) return t('AI 에이전트의 판단을 신뢰하는 스타일입니다. 자동화 수용도가 높습니다.');
  if (approvalRate >= 50) return t('AI와 인간의 균형 잡힌 협업을 선호하는 스타일입니다.');
  return t('신중한 검토를 선호하는 스타일입니다. 중요 결정에 인간 판단을 중시합니다.');
};

export default function ExpoScoreBoard({
  score,
  approvedCount,
  rejectedCount,
  eventsTriggered,
  scenarioIdx,
  onReset,
  onNewScenario,
  scoreHistory,
}: ExpoScoreBoardProps) {
  const [showDetail, setShowDetail] = useState(false);
  const [showShareCard, setShowShareCard] = useState(false);

  const rank = getRank(score);
  const total = approvedCount + rejectedCount;
  const approvalRate = total > 0 ? Math.round((approvedCount / total) * 100) : 0;
  const insight = getInsight(approvedCount, rejectedCount, score);

  return (
    <div className="space-y-4">
      {/* Score Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black uppercase tracking-widest text-text-primary flex items-center gap-2">
          <Trophy size={14} className="text-yellow-400" />
          {t('체험 점수판')}
        </h3>
        <button
          onClick={() => setShowDetail(!showDetail)}
          className="text-[10px] text-accent hover:text-accent/80 transition-colors"
        >
          {showDetail ? t('접기') : t('상세 보기')}
        </button>
      </div>

      {/* Main Score Card */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-surface to-bg p-5">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />

        <div className="relative z-10">
          {/* Rank Badge */}
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${rank.border} ${rank.bg} mb-3`}>
            <span className="text-base">{rank.icon}</span>
            <span className={`text-xs font-black ${rank.color}`}>{rank.label}</span>
          </div>

          {/* Score */}
          <div className="flex items-end gap-3 mb-4">
            <motion.div
              key={score}
              initial={{ scale: 1.3, color: '#f59e0b' }}
              animate={{ scale: 1, color: '#f8fafc' }}
              className="text-5xl font-black leading-none"
            >
              {score}
            </motion.div>
            <div className="text-sm text-text-secondary mb-1">{t('점')}</div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <div className="text-lg font-black text-emerald-400">{approvedCount}</div>
              <div className="text-[9px] text-text-secondary uppercase tracking-widest">{t('승인')}</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-black text-red-400">{rejectedCount}</div>
              <div className="text-[9px] text-text-secondary uppercase tracking-widest">{t('거부')}</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-black text-blue-400">{eventsTriggered}</div>
              <div className="text-[9px] text-text-secondary uppercase tracking-widest">{t('이벤트')}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Approval Rate Bar */}
      {total > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between text-[10px]">
            <span className="text-text-secondary">{t('AI 추천 수용률')}</span>
            <span className="font-bold text-accent">{approvalRate}%</span>
          </div>
          <div className="h-2 bg-border rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${approvalRate}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-accent to-blue-400 rounded-full"
            />
          </div>
        </div>
      )}

      {/* Insight */}
      <div className="p-3 rounded-xl bg-accent/5 border border-accent/20">
        <p className="text-[10px] text-text-secondary mb-1 font-bold uppercase tracking-widest">{t('AI 협업 스타일 분석')}</p>
        <p className="text-xs text-text-primary leading-relaxed">{insight}</p>
      </div>

      {/* Detail History */}
      <AnimatePresence>
        {showDetail && scoreHistory.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-1 max-h-40 overflow-y-auto custom-scrollbar pr-1">
              {scoreHistory.slice(0, 10).map((entry, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                  <div className="flex items-center gap-2">
                    {entry.type === 'approved' ? (
                      <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
                    ) : entry.type === 'rejected' ? (
                      <X size={12} className="text-red-400 shrink-0" />
                    ) : (
                      <Zap size={12} className="text-blue-400 shrink-0" />
                    )}
                    <span className="text-[10px] text-text-secondary truncate max-w-[150px]">{t(entry.label)}</span>
                  </div>
                  <span className={`text-[10px] font-bold shrink-0 ${entry.points > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {entry.points > 0 ? '+' : ''}{entry.points}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action Buttons */}
      <div className="space-y-2">
        <button
          onClick={() => setShowShareCard(true)}
          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-accent to-blue-500 text-bg font-black text-xs flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
        >
          <Share2 size={14} />
          {t('체험 결과 공유하기')}
        </button>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onReset}
            className="py-2.5 rounded-xl border border-border hover:bg-surface-hover text-xs font-bold flex items-center justify-center gap-2 transition-colors"
          >
            <RotateCcw size={12} />
            {t('다시 체험')}
          </button>
          <button
            onClick={onNewScenario}
            className="py-2.5 rounded-xl border border-accent/30 bg-accent/10 text-accent text-xs font-bold flex items-center justify-center gap-2 hover:bg-accent/20 transition-colors"
          >
            {t('다른 시나리오')}
            <ChevronRight size={12} />
          </button>
        </div>
      </div>

      {/* Share Card Modal */}
      <AnimatePresence>
        {showShareCard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-bg/90 backdrop-blur-xl"
            onClick={() => setShowShareCard(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-sm"
            >
              {/* Share Card */}
              <div className="relative overflow-hidden rounded-3xl border-2 border-accent/30 bg-gradient-to-br from-surface via-bg to-surface p-8 text-center shadow-2xl shadow-accent/10">
                {/* Background */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-0 left-0 w-32 h-32 bg-accent/10 rounded-full -translate-x-1/2 -translate-y-1/2" />
                  <div className="absolute bottom-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full translate-x-1/2 translate-y-1/2" />
                </div>

                <div className="relative z-10 space-y-4">
                  {/* Logo */}
                  <div className="text-xs font-black text-text-secondary uppercase tracking-widest">IMPIX AI ORCHESTRATION</div>

                  {/* Scenario */}
                  <div className="text-3xl">{SCENARIO_ICONS[scenarioIdx]}</div>
                  <div className="text-sm font-bold text-accent">{t(SCENARIO_NAMES[scenarioIdx])}</div>

                  {/* Score */}
                  <div>
                    <div className="text-6xl font-black">{score}</div>
                    <div className="text-sm text-text-secondary">{t('점')}</div>
                  </div>

                  {/* Rank */}
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border ${rank.border} ${rank.bg}`}>
                    <span className="text-xl">{rank.icon}</span>
                    <span className={`text-sm font-black ${rank.color}`}>{rank.label}</span>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-3 pt-2 border-t border-border">
                    <div>
                      <div className="text-lg font-black text-emerald-400">{approvedCount}</div>
                      <div className="text-[9px] text-text-secondary">{t('AI 승인')}</div>
                    </div>
                    <div>
                      <div className="text-lg font-black text-red-400">{rejectedCount}</div>
                      <div className="text-[9px] text-text-secondary">{t('AI 거부')}</div>
                    </div>
                    <div>
                      <div className="text-lg font-black text-blue-400">{eventsTriggered}</div>
                      <div className="text-[9px] text-text-secondary">{t('이벤트')}</div>
                    </div>
                  </div>

                  {/* Insight */}
                  <p className="text-[10px] text-text-secondary leading-relaxed">{insight}</p>

                  {/* Watermark */}
                  <div className="text-[9px] text-text-secondary/50 font-mono">AI EXPO 2026 · IMPIX</div>
                </div>
              </div>

              <button
                onClick={() => setShowShareCard(false)}
                className="w-full mt-4 py-3 rounded-xl border border-border text-sm font-bold hover:bg-surface-hover transition-colors"
              >
                {t('닫기')}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
