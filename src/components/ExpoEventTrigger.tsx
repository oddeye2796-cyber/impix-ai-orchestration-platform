/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Flame, Zap, AlertTriangle, Thermometer, Wind,
  Activity, CheckCircle2, X, Cpu,
  Radio, TrendingUp, TrendingDown, Clock,
  HelpCircle, ChevronRight, Star, BarChart2
} from 'lucide-react';

// ─────────────────────────────────────────────
// 타입 정의
// ─────────────────────────────────────────────
interface Choice {
  id: string;
  label: string;          // 선택지 제목
  description: string;    // 선택지 설명
  isCorrect: boolean;     // AI 권장 여부
  scoreEffect: number;    // 점수 변화량
  feedback: string;       // 선택 후 피드백
  consequence: string;    // 실제 결과 예시
}

interface TriggerEvent {
  id: string;
  icon: React.ReactNode;
  label: string;
  situation: string;      // 상황 설명 (더 상세)
  description: string;    // 짧은 부제
  color: string;
  bgColor: string;
  borderColor: string;
  severity: 'warning' | 'critical' | 'info';
  affectedAgents: string[];
  aiRecommendedId: string;  // 정답 선택지 id
  choices: Choice[];
  aiReasoning: string;    // AI가 정답을 선택한 이유
}

interface EventResult {
  eventId: string;
  eventLabel: string;
  choiceId: string;
  choiceLabel: string;
  isCorrect: boolean;
  scoreEffect: number;
  timestamp: Date;
}

interface ExpoEventTriggerProps {
  scenarioIdx: number;
  onEventTriggered?: (eventId: string) => void;
  onScoreUpdate?: (delta: number, label: string, isCorrect: boolean) => void;
}

// ─────────────────────────────────────────────
// 시나리오별 이벤트 데이터
// ─────────────────────────────────────────────
const SCENARIO_EVENTS: Record<number, TriggerEvent[]> = {
  // 시나리오 0: 전사 생산 극대화
  0: [
    {
      id: 'oee_drop',
      icon: <TrendingDown size={20} />,
      label: 'OEE 급락',
      description: '라인 2 가동률 갑자기 15% 하락',
      situation: '오전 10시, 라인 2의 OEE가 갑자기 84%에서 69%로 15% 하락했습니다. 수축포장기-01의 처리 속도가 느려졌고, 뒤편 컨베이어에 제품이 쌓이기 시작했습니다. 납기까지 3시간 남았습니다.',
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-orange-500/40',
      severity: 'warning',
      affectedAgents: ['생산', '품질', '예지보전'],
      aiRecommendedId: 'c_oee_b',
      aiReasoning: '단순 속도 증가는 품질 불량을 유발할 수 있습니다. AI는 병목 원인을 먼저 파악한 후 속도를 점진적으로 조정하고, 동시에 예지보전 에이전트가 설비 이상 여부를 확인하는 복합 대응이 최적임을 판단했습니다.',
      choices: [
        {
          id: 'c_oee_a',
          label: '라인 2 속도 최대치로 즉시 증속',
          description: '생산량 만회를 위해 설비를 최대 속도로 강제 가동한다.',
          isCorrect: false,
          scoreEffect: -15,
          feedback: '오답: 원인 파악 없이 속도를 올리면 설비 과부하로 고장 위험이 높아집니다.',
          consequence: '수축포장기-01 과열로 30분 후 비상 정지 → OEE 추가 하락 예상',
        },
        {
          id: 'c_oee_b',
          label: '병목 원인 분석 후 점진적 속도 조정 + 설비 점검',
          description: 'AI 에이전트가 병목 구간을 분석하고, 원인에 따라 속도를 조정하며 설비 이상 여부를 동시에 점검한다.',
          isCorrect: true,
          scoreEffect: 30,
          feedback: '정답! AI 권장 대응입니다. 원인 분석 → 점진 조정 → 설비 점검의 복합 대응으로 OEE를 안전하게 회복합니다.',
          consequence: '15분 내 병목 원인 파악, OEE 78%까지 회복 예상',
        },
        {
          id: 'c_oee_c',
          label: '라인 2 일시 정지 후 수동 점검',
          description: '라인을 멈추고 작업자가 직접 설비를 점검한다.',
          isCorrect: false,
          scoreEffect: -10,
          feedback: '오답: 라인 정지는 생산 손실이 크고, 수동 점검은 AI 분석보다 시간이 오래 걸립니다.',
          consequence: '라인 정지 30분 → 생산량 손실 약 150개, 납기 위험',
        },
        {
          id: 'c_oee_d',
          label: '다른 라인으로 물량 분산',
          description: '라인 2의 물량을 라인 1, 3으로 분산하여 생산을 유지한다.',
          isCorrect: false,
          scoreEffect: 5,
          feedback: '부분 정답: 단기 대응으로는 유효하지만, 근본 원인을 해결하지 않으면 재발합니다.',
          consequence: '단기 생산 유지 가능하나 라인 2 문제 미해결 → 재발 가능성 높음',
        },
      ],
    },
    {
      id: 'rush_order',
      icon: <TrendingUp size={20} />,
      label: '긴급 주문 입고',
      description: '500개 추가 주문, 납기 4시간',
      situation: '영업팀에서 긴급 연락이 왔습니다. VIP 고객사에서 500개 추가 주문이 들어왔고, 납기는 4시간 후입니다. 현재 라인 3은 다른 제품을 생산 중이며, 전환 시 30분이 소요됩니다. 야간 교대 인력은 대기 중입니다.',
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/40',
      severity: 'info',
      affectedAgents: ['생산', '물류', '품질'],
      aiRecommendedId: 'c_rush_b',
      aiReasoning: '라인 3 전환 + 야간 교대 사전 투입으로 4시간 내 500개 생산이 가능합니다. AI는 전환 시간 30분을 고려한 최적 스케줄을 자동 계산하고, 품질 검사 병행으로 납기와 품질을 동시에 달성할 수 있다고 판단했습니다.',
      choices: [
        {
          id: 'c_rush_a',
          label: '현재 라인 1, 2 초과 가동으로 500개 생산',
          description: '라인 전환 없이 기존 라인의 속도를 최대로 올려 추가 물량을 소화한다.',
          isCorrect: false,
          scoreEffect: -10,
          feedback: '오답: 초과 가동은 품질 불량률을 높이고 설비 피로도가 증가합니다.',
          consequence: '불량률 3.2% 상승 예상, 납기는 맞출 수 있으나 품질 클레임 위험',
        },
        {
          id: 'c_rush_b',
          label: '라인 3 전환 + 야간 교대 사전 투입',
          description: 'AI가 라인 3 전환 스케줄을 최적화하고 야간 교대 인력을 미리 투입하여 4시간 내 생산을 완료한다.',
          isCorrect: true,
          scoreEffect: 30,
          feedback: '정답! AI 권장 대응입니다. 라인 전환 30분을 포함해도 3.5시간 내 500개 생산이 가능하며 품질도 유지됩니다.',
          consequence: '납기 준수율 94% 달성, 불량률 1.5% 이하 유지',
        },
        {
          id: 'c_rush_c',
          label: '고객사에 납기 연장 협의 요청',
          description: '현실적인 생산 한계를 고려해 고객사에 납기 2시간 연장을 요청한다.',
          isCorrect: false,
          scoreEffect: -20,
          feedback: '오답: AI 분석 결과 4시간 내 생산이 가능한 상황에서 납기 연장 요청은 불필요한 고객 신뢰 손상입니다.',
          consequence: 'VIP 고객 신뢰도 하락, 향후 수주 기회 감소 위험',
        },
        {
          id: 'c_rush_d',
          label: '외주 생산 긴급 발주',
          description: '자체 생산이 어렵다고 판단하고 협력사에 긴급 외주를 요청한다.',
          isCorrect: false,
          scoreEffect: -5,
          feedback: '오답: 자체 생산 능력이 충분한 상황에서 외주는 비용 낭비이며 품질 관리가 어렵습니다.',
          consequence: '외주 비용 추가 발생, 품질 균일성 저하 위험',
        },
      ],
    },
    {
      id: 'quality_alert',
      icon: <AlertTriangle size={20} />,
      label: '품질 이상 감지',
      description: '불량률 2.1% 초과 — 기준치 1.5%',
      situation: '비전 검사 시스템이 라인 1에서 불량률 2.1%를 감지했습니다. 기준치(1.5%)를 40% 초과한 수치입니다. 최근 1시간 동안 찢김 불량이 급증했으며, 수축 온도가 평소보다 3°C 높게 설정되어 있습니다.',
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/40',
      severity: 'warning',
      affectedAgents: ['품질', '생산'],
      aiRecommendedId: 'c_qual_a',
      aiReasoning: '온도-불량 상관분석 결과, 수축 온도 3°C 초과가 찢김 불량의 직접 원인임을 확인했습니다. 즉시 온도를 173°C로 조정하고 의심 배치를 격리하는 것이 불량 확산을 막는 최선입니다.',
      choices: [
        {
          id: 'c_qual_a',
          label: '수축 온도 즉시 조정 + 의심 배치 격리',
          description: 'AI가 온도-불량 상관관계를 분석하여 최적 온도(173°C)로 즉시 조정하고, 불량 의심 배치를 격리한다.',
          isCorrect: true,
          scoreEffect: 30,
          feedback: '정답! AI 권장 대응입니다. 원인(온도 초과)을 즉시 제거하고 불량품 출하를 방지합니다.',
          consequence: '15분 내 불량률 1.2%로 회복, 불량 배치 출하 방지',
        },
        {
          id: 'c_qual_b',
          label: '비전 검사 민감도만 높임',
          description: '불량 검출률을 높이기 위해 비전 검사 시스템의 민감도를 상향 조정한다.',
          isCorrect: false,
          scoreEffect: -10,
          feedback: '오답: 검출률을 높이는 것은 불량품 출하를 막지만, 근본 원인(온도)을 해결하지 않아 불량이 계속 발생합니다.',
          consequence: '불량 검출은 늘지만 생산 효율 저하, 불량률 개선 없음',
        },
        {
          id: 'c_qual_c',
          label: '라인 1 전체 생산 중단 후 원인 조사',
          description: '불량 원인이 파악될 때까지 라인 1 생산을 전면 중단한다.',
          isCorrect: false,
          scoreEffect: -15,
          feedback: '오답: 원인(온도)이 이미 AI에 의해 파악된 상황에서 전면 중단은 과도한 대응입니다.',
          consequence: '불필요한 생산 중단으로 OEE 하락, 납기 지연 위험',
        },
        {
          id: 'c_qual_d',
          label: '샘플링 검사 빈도 증가 후 추이 관찰',
          description: '검사 빈도를 높여 불량 추이를 더 지켜본 후 판단한다.',
          isCorrect: false,
          scoreEffect: -5,
          feedback: '오답: 이미 기준치를 40% 초과한 상황에서 추이 관찰은 불량품 출하 위험을 높입니다.',
          consequence: '불량품 출하 가능성 증가, 고객 클레임 위험',
        },
      ],
    },
  ],

  // 시나리오 1: 돌발 고장 & 안전 예방
  1: [
    {
      id: 'gas_leak',
      icon: <Wind size={20} />,
      label: '가스 누출 감지',
      description: 'Zone B-4 가스 농도 위험 수준 초과',
      situation: '가스 센서가 Zone B-4에서 LPG 농도 LEL(폭발하한계) 25%를 감지했습니다. 해당 구역에는 작업자 8명이 있으며, 근처에 전기 설비가 가동 중입니다. 경보음이 울리기 시작했습니다.',
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/40',
      severity: 'critical',
      affectedAgents: ['안전', '생산', '물류'],
      aiRecommendedId: 'c_gas_a',
      aiReasoning: '가스 누출은 폭발 위험이 있어 인명 안전이 최우선입니다. AI는 즉각적인 전기 설비 차단(점화원 제거), 환기 가동, 작업자 대피를 동시에 실행하는 것이 최선임을 판단했습니다.',
      choices: [
        {
          id: 'c_gas_a',
          label: '전기 설비 즉시 차단 + 환기 가동 + 작업자 대피',
          description: '점화원(전기 설비)을 즉시 차단하고, 환기 시스템을 최대로 가동하며, 작업자를 안전 구역으로 대피시킨다.',
          isCorrect: true,
          scoreEffect: 40,
          feedback: '정답! AI 권장 대응입니다. 점화원 제거 → 환기 → 대피의 순서가 폭발 방지의 핵심입니다.',
          consequence: '폭발 위험 제거, 인명 피해 방지, 가스 농도 10분 내 안전 수준으로 감소',
        },
        {
          id: 'c_gas_b',
          label: '가스 누출 위치 먼저 파악 후 조치',
          description: '정확한 누출 위치를 파악한 후 선별적으로 조치한다.',
          isCorrect: false,
          scoreEffect: -30,
          feedback: '오답: 위험! 가스 누출 시 원인 파악보다 즉각적인 안전 조치가 우선입니다. 지연 시 폭발 위험이 급증합니다.',
          consequence: '가스 농도 계속 상승 → 폭발 위험 임박, 인명 피해 가능성',
        },
        {
          id: 'c_gas_c',
          label: '환기만 가동하고 생산 계속',
          description: '환기 시스템을 가동하면서 생산을 중단하지 않는다.',
          isCorrect: false,
          scoreEffect: -25,
          feedback: '오답: 전기 설비(점화원)가 가동 중인 상태에서 가스가 있으면 폭발 위험이 있습니다.',
          consequence: '전기 스파크로 인한 폭발 가능성, 중대 재해 위험',
        },
        {
          id: 'c_gas_d',
          label: '소방서 신고 후 대기',
          description: '119에 신고하고 전문가가 올 때까지 대기한다.',
          isCorrect: false,
          scoreEffect: -20,
          feedback: '오답: 신고는 필요하지만, 그 전에 즉각적인 안전 조치(전기 차단, 대피)를 먼저 해야 합니다.',
          consequence: '소방차 도착 전 가스 농도 위험 수준 도달, 대피 지연',
        },
      ],
    },
    {
      id: 'equipment_vibration',
      icon: <Activity size={20} />,
      label: '설비 진동 이상',
      description: '수축포장기-01 진동값 임계치 초과',
      situation: '예지보전 AI가 수축포장기-01의 3축 진동값이 임계치(7.2mm/s)를 초과(현재 9.8mm/s)했음을 감지했습니다. 과거 데이터 분석 결과, 이 패턴은 베어링 마모 초기 증상과 일치합니다. 현재 이 설비는 하루 생산량의 40%를 담당합니다.',
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-orange-500/40',
      severity: 'warning',
      affectedAgents: ['예지보전', '생산'],
      aiRecommendedId: 'c_vib_b',
      aiReasoning: '베어링 마모 초기 단계에서 속도를 낮추면 수명을 연장할 수 있습니다. AI는 즉시 속도를 30% 감속하고, 다음 정기 점검 시 베어링 교체를 예약하는 것이 생산 중단 없이 설비를 보호하는 최적 방법임을 판단했습니다.',
      choices: [
        {
          id: 'c_vib_a',
          label: '즉시 설비 정지 후 베어링 교체',
          description: '설비를 즉시 멈추고 베어링을 바로 교체한다.',
          isCorrect: false,
          scoreEffect: -5,
          feedback: '오답: 아직 초기 마모 단계로 즉시 교체는 불필요합니다. 생산 중단으로 인한 손실이 더 큽니다.',
          consequence: '불필요한 생산 중단 4시간, 생산 손실 약 ₩8M',
        },
        {
          id: 'c_vib_b',
          label: '속도 30% 감속 + 다음 정기 점검 시 베어링 교체 예약',
          description: 'AI가 설비 속도를 30% 낮춰 베어링 부하를 줄이고, 계획된 정기 점검 시 교체를 예약한다.',
          isCorrect: true,
          scoreEffect: 30,
          feedback: '정답! AI 권장 대응입니다. 감속으로 베어링 수명을 연장하면서 생산을 유지하고, 계획된 교체로 비용을 최소화합니다.',
          consequence: '베어링 수명 연장, 생산 유지, 예방 정비 비용 ₩12M 절감',
        },
        {
          id: 'c_vib_c',
          label: '현재 속도 유지하며 추이 관찰',
          description: '진동값이 더 높아질 때까지 현재 속도를 유지한다.',
          isCorrect: false,
          scoreEffect: -20,
          feedback: '오답: 임계치를 이미 초과한 상태에서 방치하면 베어링 파손으로 이어져 더 큰 수리가 필요합니다.',
          consequence: '2시간 내 베어링 파손 가능성, 설비 교체 비용 ₩45M 발생',
        },
        {
          id: 'c_vib_d',
          label: '다른 설비로 생산 전환 후 즉시 분해 점검',
          description: '생산을 다른 설비로 옮기고 해당 설비를 분해하여 정밀 점검한다.',
          isCorrect: false,
          scoreEffect: 5,
          feedback: '부분 정답: 생산 전환은 좋은 판단이지만, 분해 점검은 감속 운전으로 충분히 시간을 벌 수 있어 과도한 대응입니다.',
          consequence: '생산 전환으로 안전 확보, 분해 점검 비용 추가 발생',
        },
      ],
    },
    {
      id: 'fire_detected',
      icon: <Flame size={20} />,
      label: '화재 감지',
      description: 'CCTV AI — Zone C-2 연기 감지 92%',
      situation: 'AI CCTV가 Zone C-2 전기 패널 근처에서 연기를 92% 신뢰도로 감지했습니다. 육안으로는 아직 확인되지 않았으나, 해당 구역 온도 센서도 평소보다 15°C 높게 측정되고 있습니다. 스프링클러 시스템이 대기 중입니다.',
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/40',
      severity: 'critical',
      affectedAgents: ['안전'],
      aiRecommendedId: 'c_fire_b',
      aiReasoning: '전기 화재에는 물(스프링클러)이 오히려 위험할 수 있습니다. AI는 먼저 전원을 차단하고, 해당 구역 인원을 대피시키며, 소방서에 신고하는 것이 최선임을 판단했습니다. 스프링클러는 전기 화재 확인 후 선별적으로 가동해야 합니다.',
      choices: [
        {
          id: 'c_fire_a',
          label: '스프링클러 즉시 전체 가동',
          description: '화재 감지 즉시 스프링클러를 전체 가동한다.',
          isCorrect: false,
          scoreEffect: -20,
          feedback: '오답: 전기 패널 화재에 물을 뿌리면 감전 및 화재 확산 위험이 있습니다.',
          consequence: '전기 패널 합선으로 화재 확산, 감전 사고 위험',
        },
        {
          id: 'c_fire_b',
          label: '전원 차단 + 대피 + 119 신고 + 소화기 대기',
          description: '해당 구역 전원을 즉시 차단하고, 인원을 대피시키며, 119에 신고하고 CO2 소화기를 준비한다.',
          isCorrect: true,
          scoreEffect: 40,
          feedback: '정답! AI 권장 대응입니다. 전기 화재 대응 순서: 전원 차단 → 대피 → 신고 → CO2 소화기 사용이 올바릅니다.',
          consequence: '초기 진압 성공, 인명 피해 없음, 피해 최소화',
        },
        {
          id: 'c_fire_c',
          label: '작업자가 직접 확인 후 판단',
          description: '육안 확인이 안 됐으므로 작업자를 보내 직접 확인한다.',
          isCorrect: false,
          scoreEffect: -25,
          feedback: '오답: 연기 감지 + 온도 상승은 화재 초기 징후입니다. 직접 확인을 위해 작업자를 보내는 것은 위험합니다.',
          consequence: '작업자 연기 흡입 위험, 화재 초기 대응 지연',
        },
        {
          id: 'c_fire_d',
          label: '경보만 울리고 자연 진화 대기',
          description: '경보를 울려 인지시키고 자연적으로 진화되는지 지켜본다.',
          isCorrect: false,
          scoreEffect: -30,
          feedback: '오답: 화재는 초기 대응이 가장 중요합니다. 방치하면 대형 화재로 번질 수 있습니다.',
          consequence: '화재 확산으로 공장 전체 피해, 중대 재해 발생 가능',
        },
      ],
    },
  ],

  // 시나리오 2: 저에너지 피크 관리
  2: [
    {
      id: 'peak_power',
      icon: <Zap size={20} />,
      label: '전력 피크 발생',
      description: '현재 소비 전력 계약 한도의 95%',
      situation: '오후 2시, 전력 소비량이 계약 한도(500kW)의 95%(475kW)에 도달했습니다. 앞으로 30분 내 한도를 초과하면 전력 회사로부터 위약금이 부과됩니다. ESS(에너지 저장 시스템) 잔량은 60%입니다.',
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/40',
      severity: 'warning',
      affectedAgents: ['에너지', '생산'],
      aiRecommendedId: 'c_peak_b',
      aiReasoning: 'ESS 방전으로 즉시 전력 부하를 낮추고, 비핵심 설비(조명, 공조 일부)를 순차 감전하는 복합 대응이 생산 영향을 최소화하면서 피크를 억제하는 최적 방법입니다.',
      choices: [
        {
          id: 'c_peak_a',
          label: '생산 라인 전체 일시 정지',
          description: '전력 한도 초과를 막기 위해 모든 생산 라인을 즉시 멈춘다.',
          isCorrect: false,
          scoreEffect: -20,
          feedback: '오답: 생산 중단은 가장 극단적인 방법입니다. ESS와 비핵심 설비 감전으로 충분히 해결 가능합니다.',
          consequence: '불필요한 생산 중단, 납기 지연 위험, 생산 손실 발생',
        },
        {
          id: 'c_peak_b',
          label: 'ESS 방전 개시 + 비핵심 설비 순차 감전',
          description: 'AI가 ESS를 즉시 방전하여 전력을 공급하고, 조명·공조 등 비핵심 설비를 20% 감전한다.',
          isCorrect: true,
          scoreEffect: 30,
          feedback: '정답! AI 권장 대응입니다. 생산 영향 없이 피크를 억제하고 위약금을 방지합니다.',
          consequence: '전력 소비 480kW → 450kW로 감소, 위약금 ₩3.2M 절감',
        },
        {
          id: 'c_peak_c',
          label: '전력 회사에 한도 초과 사전 통보',
          description: '한도 초과가 불가피하다고 판단하고 전력 회사에 미리 연락한다.',
          isCorrect: false,
          scoreEffect: -15,
          feedback: '오답: ESS와 감전 조치로 한도 초과를 막을 수 있는 상황에서 위약금을 감수하는 것은 불필요합니다.',
          consequence: '위약금 ₩3.2M 발생, 전력 계약 조건 악화 가능성',
        },
        {
          id: 'c_peak_d',
          label: '고전력 설비만 선별 정지',
          description: '전력 소비가 가장 큰 설비 2~3개만 선별하여 정지한다.',
          isCorrect: false,
          scoreEffect: 10,
          feedback: '부분 정답: 선별 정지는 좋은 방향이지만, ESS 방전을 먼저 활용하지 않아 불필요한 생산 영향이 발생합니다.',
          consequence: '피크 억제 가능하나 생산 일부 중단, ESS 활용 기회 낭비',
        },
      ],
    },
    {
      id: 'temp_spike',
      icon: <Thermometer size={20} />,
      label: '전기실 온도 급등',
      description: '전기실 온도 38°C 초과 — 냉각 필요',
      situation: '전기실 온도가 38°C를 초과했습니다(정상 범위: 20~35°C). 주요 인버터와 변압기가 과열 경고를 표시하고 있습니다. 냉각 시스템은 현재 70% 가동 중이며, 외부 기온은 34°C입니다.',
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/40',
      severity: 'warning',
      affectedAgents: ['에너지', '안전'],
      aiRecommendedId: 'c_temp_a',
      aiReasoning: '전기 설비 과열은 화재와 고장으로 이어질 수 있습니다. AI는 냉각 시스템을 100%로 즉시 강화하고, 발열이 큰 설비의 부하를 분산하는 것이 가장 빠르고 효과적인 대응임을 판단했습니다.',
      choices: [
        {
          id: 'c_temp_a',
          label: '냉각 시스템 100% 가동 + 발열 설비 부하 분산',
          description: 'AI가 냉각 시스템을 최대로 가동하고, 인버터·변압기의 부하를 다른 설비로 분산한다.',
          isCorrect: true,
          scoreEffect: 30,
          feedback: '정답! AI 권장 대응입니다. 냉각 강화와 부하 분산으로 온도를 빠르게 정상 범위로 낮춥니다.',
          consequence: '15분 내 온도 35°C 이하로 감소, 설비 과열 방지',
        },
        {
          id: 'c_temp_b',
          label: '전기실 문을 열어 자연 환기',
          description: '전기실 문을 개방하여 자연 환기로 온도를 낮춘다.',
          isCorrect: false,
          scoreEffect: -15,
          feedback: '오답: 외부 기온이 34°C로 높아 자연 환기 효과가 없으며, 먼지와 습기가 유입될 수 있습니다.',
          consequence: '온도 하강 효과 없음, 먼지 유입으로 설비 오염 위험',
        },
        {
          id: 'c_temp_c',
          label: '전기실 전체 전원 차단',
          description: '과열을 막기 위해 전기실 전원을 전면 차단한다.',
          isCorrect: false,
          scoreEffect: -25,
          feedback: '오답: 전원 차단은 공장 전체 생산 중단을 의미합니다. 냉각 강화로 충분히 해결 가능한 상황입니다.',
          consequence: '공장 전체 생산 중단, 복구 시간 2시간 이상 소요',
        },
        {
          id: 'c_temp_d',
          label: '이동식 에어컨 추가 투입',
          description: '이동식 에어컨을 전기실에 추가로 투입한다.',
          isCorrect: false,
          scoreEffect: 5,
          feedback: '부분 정답: 추가 냉각은 도움이 되지만, 기존 냉각 시스템을 100%로 먼저 가동하는 것이 더 빠릅니다.',
          consequence: '온도 하강 가능하나 대응 속도가 느림, 설비 투입 시간 소요',
        },
      ],
    },
    {
      id: 'ess_discharge',
      icon: <Cpu size={20} />,
      label: 'ESS 방전 타이밍 결정',
      description: 'ESS 잔량 45% — 방전 타이밍 최적화 필요',
      situation: '오전 11시, ESS 잔량이 45%입니다. 오후 2~4시는 전력 피크 요금 시간대이며, 내일 오전 2~6시는 심야 요금(최저가)으로 충전 가능합니다. 오늘 오후 생산량은 평소의 120%가 예상됩니다.',
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/40',
      severity: 'info',
      affectedAgents: ['에너지'],
      aiRecommendedId: 'c_ess_b',
      aiReasoning: 'ESS는 피크 요금 시간대(오후 2~4시)에 방전하고, 심야 요금 시간대(새벽 2~6시)에 충전하는 것이 에너지 비용을 최소화하는 최적 전략입니다. 현재 45% 잔량은 오후 피크 시간대를 충분히 커버할 수 있습니다.',
      choices: [
        {
          id: 'c_ess_a',
          label: '지금 즉시 방전하여 현재 전력 비용 절감',
          description: '현재 전력 요금도 절감할 수 있으므로 지금 바로 방전을 시작한다.',
          isCorrect: false,
          scoreEffect: -10,
          feedback: '오답: 지금 방전하면 오후 피크 시간대에 ESS 잔량이 부족해져 더 비싼 요금을 내야 합니다.',
          consequence: '오후 피크 시간대 ESS 부족, 추가 전력 비용 ₩2.1M 발생',
        },
        {
          id: 'c_ess_b',
          label: '오후 2시 피크 시간대에 방전, 심야에 충전',
          description: 'AI가 피크 요금 시간대(오후 2~4시)에 방전하고, 심야 저가 시간대에 충전하는 최적 스케줄을 실행한다.',
          isCorrect: true,
          scoreEffect: 30,
          feedback: '정답! AI 권장 대응입니다. 피크-오프피크 차익을 최대화하는 최적 ESS 운영 전략입니다.',
          consequence: '에너지 비용 월 ₩8.5M 절감, 피크 요금 완전 회피',
        },
        {
          id: 'c_ess_c',
          label: 'ESS를 비상용으로 100% 보존',
          description: '예상치 못한 정전에 대비해 ESS를 방전하지 않고 보존한다.',
          isCorrect: false,
          scoreEffect: -5,
          feedback: '오답: ESS를 비상용으로만 보존하면 에너지 비용 절감 효과를 전혀 얻지 못합니다.',
          consequence: 'ESS 투자 대비 효과 없음, 에너지 비용 절감 기회 낭비',
        },
        {
          id: 'c_ess_d',
          label: '50% 방전 후 나머지 보존',
          description: '절반만 방전하여 비용 절감과 비상 대비를 동시에 한다.',
          isCorrect: false,
          scoreEffect: 10,
          feedback: '부분 정답: 절충안이지만, AI 분석 결과 오후 피크 시간대에 전량 방전해도 심야 충전으로 충분히 보충 가능합니다.',
          consequence: '에너지 비용 일부 절감, 최적 대비 ₩4.2M 기회 손실',
        },
      ],
    },
  ],

  // 시나리오 3: 러시오더 품질 관리
  3: [
    {
      id: 'speed_quality_conflict',
      icon: <AlertTriangle size={20} />,
      label: '속도 vs 품질 충돌',
      description: '생산 에이전트: 속도↑ vs 품질 에이전트: 품질↓ 경고',
      situation: '긴급 주문 처리 중 AI 에이전트 간 충돌이 발생했습니다. 생산 에이전트는 납기를 맞추기 위해 속도를 15% 올릴 것을 권장하고, 품질 에이전트는 속도 증가 시 불량률이 1.5%에서 2.8%로 오를 것이라고 경고합니다. 납기까지 2시간, 잔여 생산량 300개.',
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/40',
      severity: 'warning',
      affectedAgents: ['슈퍼바이저', '생산', '품질'],
      aiRecommendedId: 'c_spq_b',
      aiReasoning: 'AI 슈퍼바이저 분석 결과, 속도 8% 증속 + 인라인 검사 강화 조합으로 납기도 맞추고 불량률도 1.8% 이하로 유지할 수 있습니다. 15% 증속은 불량률 급등 위험이 있고, 현재 속도 유지는 납기를 맞추지 못합니다.',
      choices: [
        {
          id: 'c_spq_a',
          label: '생산 에이전트 권장대로 15% 증속',
          description: '납기 준수를 최우선으로 하여 속도를 15% 올린다.',
          isCorrect: false,
          scoreEffect: -10,
          feedback: '오답: 15% 증속 시 불량률 2.8% 예상으로 고객 클레임 위험이 높습니다.',
          consequence: '납기 준수하나 불량률 2.8%, 고객 클레임 및 반품 위험',
        },
        {
          id: 'c_spq_b',
          label: '8% 증속 + 인라인 검사 강화 (AI 슈퍼바이저 권장)',
          description: 'AI 슈퍼바이저가 두 에이전트의 의견을 조율하여 최적 균형점(8% 증속 + 검사 강화)을 실행한다.',
          isCorrect: true,
          scoreEffect: 35,
          feedback: '정답! AI 슈퍼바이저 권장 대응입니다. 납기와 품질을 동시에 달성하는 최적 균형점입니다.',
          consequence: '납기 준수 + 불량률 1.8% 이하 유지, 고객 만족도 최고',
        },
        {
          id: 'c_spq_c',
          label: '품질 에이전트 권장대로 현재 속도 유지',
          description: '품질 보호를 위해 속도를 올리지 않는다.',
          isCorrect: false,
          scoreEffect: -15,
          feedback: '오답: 현재 속도로는 납기를 2시간 초과합니다. 8% 증속으로도 품질을 유지할 수 있습니다.',
          consequence: '납기 2시간 초과, VIP 고객 신뢰도 하락',
        },
        {
          id: 'c_spq_d',
          label: '고객사에 품질 보증 조건으로 납기 1시간 연장 협의',
          description: '품질을 보장하는 조건으로 납기를 1시간 연장해달라고 요청한다.',
          isCorrect: false,
          scoreEffect: -5,
          feedback: '오답: AI 분석 결과 8% 증속으로 납기와 품질을 모두 달성 가능한 상황에서 연장 요청은 불필요합니다.',
          consequence: '불필요한 납기 연장, 고객 신뢰도 소폭 하락',
        },
      ],
    },
    {
      id: 'material_shortage',
      icon: <Radio size={20} />,
      label: '원자재 부족',
      description: '포장재 재고 2시간 분량만 남음',
      situation: '재고 관리 AI가 포장재(PE 필름) 재고가 2시간 분량(약 400개)밖에 남지 않았음을 감지했습니다. 주 공급사는 오늘 재고가 없고, 대체 공급사 A는 3시간 후 납품 가능(단가 15% 비쌈), 대체 공급사 B는 5시간 후 납품 가능(단가 동일). 현재 주문 잔량은 600개입니다.',
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-orange-500/40',
      severity: 'critical',
      affectedAgents: ['물류', '생산'],
      aiRecommendedId: 'c_mat_b',
      aiReasoning: '2시간 후 생산이 중단되면 납기를 맞출 수 없습니다. 단가 15% 비싼 대체 공급사 A에서 긴급 발주하면 1시간의 여유가 생겨 생산을 이어갈 수 있습니다. 추가 비용보다 납기 지연으로 인한 손실이 훨씬 큽니다.',
      choices: [
        {
          id: 'c_mat_a',
          label: '주 공급사에 긴급 재고 확보 재요청',
          description: '주 공급사에 다시 연락하여 어떻게든 재고를 확보한다.',
          isCorrect: false,
          scoreEffect: -20,
          feedback: '오답: 주 공급사는 오늘 재고가 없다고 이미 확인됐습니다. 시간 낭비로 생산 중단 위험이 높아집니다.',
          consequence: '재고 확보 실패, 생산 중단 2시간, 납기 지연',
        },
        {
          id: 'c_mat_b',
          label: '대체 공급사 A 긴급 발주 (3시간 후 납품)',
          description: 'AI가 대체 공급사 A에 긴급 발주하여 3시간 후 납품을 확보한다. 단가 15% 추가 비용 발생.',
          isCorrect: true,
          scoreEffect: 35,
          feedback: '정답! AI 권장 대응입니다. 추가 비용이 있지만 납기를 지키는 것이 더 중요하며, 1시간 여유로 생산을 이어갈 수 있습니다.',
          consequence: '납기 준수, 추가 비용 ₩0.8M 발생하나 납기 지연 손실 ₩5M 방지',
        },
        {
          id: 'c_mat_c',
          label: '대체 공급사 B 발주 (5시간 후, 단가 동일)',
          description: '비용 절감을 위해 단가가 같은 대체 공급사 B에 발주한다.',
          isCorrect: false,
          scoreEffect: -15,
          feedback: '오답: 5시간 후 납품은 생산 중단 3시간을 의미합니다. 납기를 맞출 수 없게 됩니다.',
          consequence: '생산 중단 3시간, 납기 3시간 초과, 고객 클레임 발생',
        },
        {
          id: 'c_mat_d',
          label: '현재 재고로 생산 가능한 400개만 납품 후 나머지 협의',
          description: '일단 400개를 납품하고 나머지 200개는 추후 납품을 협의한다.',
          isCorrect: false,
          scoreEffect: -10,
          feedback: '오답: 부분 납품은 고객 신뢰를 크게 손상시킵니다. 긴급 발주로 전량 납품이 가능한 상황입니다.',
          consequence: '부분 납품으로 고객 불만, 향후 수주 감소 위험',
        },
      ],
    },
    {
      id: 'defect_surge',
      icon: <X size={20} />,
      label: '불량 급증',
      description: '라인 1 불량률 갑자기 4.2%로 급등',
      situation: '라인 1의 불량률이 갑자기 1.2%에서 4.2%로 급등했습니다. 비전 검사 결과 주로 "변색" 불량이 증가했으며, 최근 30분 동안 생산된 배치(Batch #4821, 약 200개)가 의심됩니다. 이 배치는 아직 출하되지 않았습니다.',
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/40',
      severity: 'critical',
      affectedAgents: ['품질', '생산'],
      aiRecommendedId: 'c_def_a',
      aiReasoning: '의심 배치를 즉시 격리하여 불량품 출하를 방지하고, 원인 분석을 자동으로 시작하는 것이 최선입니다. 변색 불량은 주로 온도 또는 원자재 문제이므로 AI가 빠르게 원인을 파악할 수 있습니다.',
      choices: [
        {
          id: 'c_def_a',
          label: '의심 배치 즉시 격리 + AI 원인 분석 자동 개시',
          description: 'Batch #4821을 즉시 격리하고, AI가 온도 이력·원자재 데이터를 분석하여 원인을 파악한다.',
          isCorrect: true,
          scoreEffect: 35,
          feedback: '정답! AI 권장 대응입니다. 불량품 출하를 막고 원인을 빠르게 파악하여 재발을 방지합니다.',
          consequence: '불량품 출하 방지, 15분 내 원인 파악, 라인 정상화',
        },
        {
          id: 'c_def_b',
          label: '불량품만 선별 후 나머지 출하',
          description: '비전 검사로 불량품을 골라내고 합격품만 출하한다.',
          isCorrect: false,
          scoreEffect: -10,
          feedback: '오답: 비전 검사 정확도가 100%가 아니므로 불량품이 일부 출하될 수 있습니다. 배치 전체 격리가 안전합니다.',
          consequence: '불량품 일부 출하 가능성, 고객 클레임 위험',
        },
        {
          id: 'c_def_c',
          label: '라인 1 전체 중단 후 전수 검사',
          description: '라인을 멈추고 모든 제품을 전수 검사한다.',
          isCorrect: false,
          scoreEffect: -5,
          feedback: '오답: 의심 배치만 격리하면 되는데 라인 전체를 중단하는 것은 과도한 대응입니다.',
          consequence: '불필요한 생산 중단 2시간, 납기 지연 위험',
        },
        {
          id: 'c_def_d',
          label: '불량률 추이 관찰 후 5% 초과 시 조치',
          description: '불량률이 더 올라가는지 지켜본 후 5%를 초과하면 조치한다.',
          isCorrect: false,
          scoreEffect: -25,
          feedback: '오답: 이미 4.2%로 기준치(1.5%)를 크게 초과했습니다. 추가 관찰은 불량품 출하 위험을 높입니다.',
          consequence: '불량품 추가 생산 및 출하 가능성, 고객 클레임 및 리콜 위험',
        },
      ],
    },
  ],
};

// ─────────────────────────────────────────────
// 메인 컴포넌트
// ─────────────────────────────────────────────
type UIState =
  | { type: 'list' }
  | { type: 'question'; event: TriggerEvent }
  | { type: 'result'; event: TriggerEvent; choice: Choice };

export default function ExpoEventTrigger({ scenarioIdx, onEventTriggered, onScoreUpdate }: ExpoEventTriggerProps) {
  const [uiState, setUiState] = useState<UIState>({ type: 'list' });
  const [results, setResults] = useState<EventResult[]>([]);

  const events = SCENARIO_EVENTS[scenarioIdx] ?? SCENARIO_EVENTS[0];
  const answeredIds = results.map(r => r.eventId);

  // 이벤트 카드 클릭 → 문제 화면
  const handleEventClick = (event: TriggerEvent) => {
    if (answeredIds.includes(event.id)) return;
    setUiState({ type: 'question', event });
    onEventTriggered?.(event.id);
  };

  // 선택지 선택 → 결과 화면
  const handleChoiceSelect = (event: TriggerEvent, choice: Choice) => {
    setResults(prev => [
      ...prev,
      {
        eventId: event.id,
        eventLabel: event.label,
        choiceId: choice.id,
        choiceLabel: choice.label,
        isCorrect: choice.isCorrect,
        scoreEffect: choice.scoreEffect,
        timestamp: new Date(),
      },
    ]);
    onScoreUpdate?.(choice.scoreEffect, event.label, choice.isCorrect);
    setUiState({ type: 'result', event, choice });
  };

  // 결과 확인 후 목록으로
  const handleBackToList = () => setUiState({ type: 'list' });

  const answeredCount = answeredIds.length;
  const correctCount = results.filter(r => r.isCorrect).length;

  // ── 문제 화면 ──
  if (uiState.type === 'question') {
    const { event } = uiState;
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="space-y-4"
      >
        {/* 헤더 */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleBackToList}
            className="text-text-secondary hover:text-text-primary transition-colors text-xs flex items-center gap-1"
          >
            ← 목록
          </button>
          <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold border ${
            event.severity === 'critical'
              ? 'bg-red-500/10 border-red-500/30 text-red-400'
              : event.severity === 'warning'
              ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
              : 'bg-blue-500/10 border-blue-500/30 text-blue-400'
          }`}>
            {event.severity === 'critical' ? '🚨 긴급 상황' : event.severity === 'warning' ? '⚠️ 경고' : 'ℹ️ 정보'}
          </span>
        </div>

        {/* 상황 카드 */}
        <div className={`rounded-xl border-2 ${event.borderColor} ${event.bgColor} p-4 space-y-2`}>
          <div className="flex items-center gap-2">
            <span className={event.color}>{event.icon}</span>
            <h3 className={`font-black text-sm ${event.color}`}>{event.label}</h3>
          </div>
          <p className="text-xs text-text-primary leading-relaxed">{event.situation}</p>
          <div className="flex flex-wrap gap-1 pt-1">
            {event.affectedAgents.map(a => (
              <span key={a} className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/10 text-text-secondary border border-white/10 font-bold">
                {a} 에이전트
              </span>
            ))}
          </div>
        </div>

        {/* 질문 */}
        <div className="flex items-center gap-2">
          <HelpCircle size={14} className="text-accent shrink-0" />
          <p className="text-xs font-black text-text-primary">당신이라면 어떻게 대응하겠습니까?</p>
        </div>

        {/* 선택지 */}
        <div className="space-y-2">
          {event.choices.map((choice, i) => (
            <motion.button
              key={choice.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              onClick={() => handleChoiceSelect(event, choice)}
              className="w-full p-3 rounded-xl border border-border bg-surface hover:bg-surface-hover hover:border-accent/40 text-left transition-all group"
            >
              <div className="flex items-start gap-3">
                <span className="shrink-0 w-5 h-5 rounded-full border border-border group-hover:border-accent/60 flex items-center justify-center text-[9px] font-black text-text-secondary group-hover:text-accent transition-colors mt-0.5">
                  {String.fromCharCode(65 + i)}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-text-primary group-hover:text-accent transition-colors leading-snug">{choice.label}</p>
                  <p className="text-[10px] text-text-secondary mt-0.5 leading-relaxed">{choice.description}</p>
                </div>
                <ChevronRight size={14} className="shrink-0 text-text-secondary group-hover:text-accent transition-colors mt-0.5" />
              </div>
            </motion.button>
          ))}
        </div>
      </motion.div>
    );
  }

  // ── 결과 화면 ──
  if (uiState.type === 'result') {
    const { event, choice } = uiState;
    const correctChoice = event.choices.find(c => c.isCorrect)!;
    const isCorrect = choice.isCorrect;

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="space-y-4"
      >
        {/* 정오 배너 */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-xl border-2 p-4 text-center ${
            isCorrect
              ? 'border-emerald-500/50 bg-emerald-500/10'
              : 'border-red-500/50 bg-red-500/10'
          }`}
        >
          <div className="text-2xl mb-1">{isCorrect ? '🎯' : '❌'}</div>
          <p className={`text-sm font-black ${isCorrect ? 'text-emerald-400' : 'text-red-400'}`}>
            {isCorrect ? '정답! AI와 같은 판단입니다' : '오답입니다'}
          </p>
          <p className={`text-lg font-black mt-1 ${isCorrect ? 'text-emerald-400' : 'text-red-400'}`}>
            {choice.scoreEffect > 0 ? '+' : ''}{choice.scoreEffect}점
          </p>
        </motion.div>

        {/* 내 선택 피드백 */}
        <div className={`rounded-xl border p-3 space-y-2 ${
          isCorrect ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-red-500/30 bg-red-500/5'
        }`}>
          <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary">내 선택</p>
          <p className="text-xs font-bold text-text-primary">{choice.label}</p>
          <p className="text-[10px] text-text-secondary leading-relaxed">{choice.feedback}</p>
          <div className="pt-1 border-t border-white/10">
            <p className="text-[9px] text-text-secondary font-bold uppercase tracking-widest mb-1">예상 결과</p>
            <p className="text-[10px] text-text-primary">{choice.consequence}</p>
          </div>
        </div>

        {/* AI 권장 답 (오답인 경우만) */}
        {!isCorrect && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-xl border border-accent/30 bg-accent/5 p-3 space-y-2"
          >
            <p className="text-[10px] font-black uppercase tracking-widest text-accent">🤖 AI 권장 대응</p>
            <p className="text-xs font-bold text-text-primary">{correctChoice.label}</p>
            <p className="text-[10px] text-text-secondary leading-relaxed">{event.aiReasoning}</p>
            <div className="pt-1 border-t border-accent/20">
              <p className="text-[9px] text-accent font-bold uppercase tracking-widest mb-1">AI 선택 시 예상 결과</p>
              <p className="text-[10px] text-text-primary">{correctChoice.consequence}</p>
            </div>
          </motion.div>
        )}

        {/* 다음 버튼 */}
        <button
          onClick={handleBackToList}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-accent to-blue-500 text-bg font-black text-xs flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
        >
          다음 이벤트 체험하기
          <ChevronRight size={14} />
        </button>
      </motion.div>
    );
  }

  // ── 목록 화면 ──
  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-black uppercase tracking-widest text-text-primary flex items-center gap-2">
            <Radio size={14} className="text-accent animate-pulse" />
            이상 상황 대응 체험
          </h3>
          <p className="text-[10px] text-text-secondary mt-0.5">상황을 선택하고 최선의 대응을 결정하세요</p>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-text-secondary font-mono">{answeredCount}/{events.length} 완료</div>
          {answeredCount > 0 && (
            <div className="text-[10px] font-bold text-emerald-400">{correctCount}/{answeredCount} 정답</div>
          )}
        </div>
      </div>

      {/* 진행 바 */}
      {events.length > 0 && (
        <div className="h-1.5 bg-border rounded-full overflow-hidden">
          <motion.div
            animate={{ width: `${(answeredCount / events.length) * 100}%` }}
            transition={{ duration: 0.5 }}
            className="h-full bg-gradient-to-r from-accent to-blue-400 rounded-full"
          />
        </div>
      )}

      {/* 이벤트 카드 목록 */}
      <div className="space-y-2">
        {events.map((event, i) => {
          const result = results.find(r => r.eventId === event.id);
          const isAnswered = !!result;

          return (
            <motion.button
              key={event.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              onClick={() => !isAnswered && handleEventClick(event)}
              disabled={isAnswered}
              className={`w-full p-3 rounded-xl border-2 text-left transition-all ${
                isAnswered
                  ? result!.isCorrect
                    ? 'border-emerald-500/30 bg-emerald-500/5 opacity-80'
                    : 'border-red-500/30 bg-red-500/5 opacity-80'
                  : `${event.borderColor} ${event.bgColor} hover:scale-[1.01] cursor-pointer`
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`shrink-0 ${
                  isAnswered
                    ? result!.isCorrect ? 'text-emerald-400' : 'text-red-400'
                    : event.color
                }`}>
                  {isAnswered
                    ? result!.isCorrect
                      ? <CheckCircle2 size={20} />
                      : <X size={20} />
                    : event.icon
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-black ${
                      isAnswered
                        ? result!.isCorrect ? 'text-emerald-400' : 'text-red-400'
                        : event.color
                    }`}>
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
                <div className="shrink-0 text-right">
                  {isAnswered ? (
                    <div>
                      <span className={`text-xs font-black ${result!.isCorrect ? 'text-emerald-400' : 'text-red-400'}`}>
                        {result!.scoreEffect > 0 ? '+' : ''}{result!.scoreEffect}점
                      </span>
                      <p className="text-[9px] text-text-secondary">{result!.isCorrect ? '정답' : '오답'}</p>
                    </div>
                  ) : (
                    <span className={`text-[9px] font-bold ${event.color}`}>도전 →</span>
                  )}
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* 전체 완료 시 요약 */}
      {answeredCount === events.length && events.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-accent/30 bg-accent/5 p-4 text-center space-y-2"
        >
          <div className="text-2xl">{correctCount === events.length ? '🏆' : correctCount >= events.length / 2 ? '🥈' : '📚'}</div>
          <p className="text-sm font-black text-text-primary">
            {correctCount}/{events.length} 정답 달성!
          </p>
          <p className="text-[10px] text-text-secondary leading-relaxed">
            {correctCount === events.length
              ? 'AI와 완벽히 동일한 판단력을 보여주셨습니다!'
              : correctCount >= events.length / 2
              ? 'AI의 판단 기준을 잘 이해하고 계십니다.'
              : 'AI의 데이터 기반 의사결정 방식을 더 살펴보세요.'}
          </p>
          <div className="flex justify-center gap-3 pt-1">
            {results.map(r => (
              <div key={r.eventId} className="flex flex-col items-center gap-1">
                <span className={`text-base ${r.isCorrect ? 'text-emerald-400' : 'text-red-400'}`}>
                  {r.isCorrect ? '✓' : '✗'}
                </span>
                <span className="text-[8px] text-text-secondary">{r.eventLabel.slice(0, 4)}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* 진행 중 힌트 */}
      {answeredCount < events.length && (
        <p className="text-[10px] text-text-secondary text-center">
          💡 각 상황 카드를 클릭하여 AI와 같은 판단을 내려보세요
        </p>
      )}
    </div>
  );
}
