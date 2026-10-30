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
import { replayCoordination, setStagedCase, type StagedCase } from './stage';

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

/*
 * The booth's self-running demo. Each loop plays one plant-wide event that
 * really happens in packaging plants (a rush order, a sudden wave of defects,
 * a late material delivery, a power peak) and shows the platform resolving it
 * on its own: a signal turns into a detection, the supervisor AI calls in the
 * agents that matter, they work it out together, whatever is inside the AI's
 * authority is carried out and checked, and only a change beyond that
 * authority waits on a person. The panel beside the screens narrates who did
 * what, second by second, while the screens themselves switch to the worker,
 * manager and engineer views. Any case can be picked from the panel; the loop
 * carries on from there.
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
  { id: 'evidence', label: '판단 기록', role: 'engineer', sec: 24 },
];

/** Readings an excursion lasts, two seconds each. */
const EXCURSION_TICKS = 14;
const TICK_SEC = 2;

type Who = 'sensor' | 'erp' | 'supervisor' | 'quality' | 'pm' | 'production' | 'logistics' | 'energy' | 'safety' | 'human';
const WHO: Record<Who, { name: string; color: string }> = {
  sensor: { name: '센서', color: '#64748b' },
  erp: { name: '주문·구매 시스템', color: '#94a3b8' },
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
  /** Name on the case picker. */
  short: string;
  title: string;
  /** Why this happens in real plants, in a sentence. */
  context: string;
  steps: Step[];
  /** Resolved without a person: the follow-up is within the AI's authority. */
  autonomous: boolean;
  humanStep?: string;
  /** How the same event usually goes without the platform. */
  /** The number that matters most for this case; an empty value shows the downtime prevented. */
  outcome: { label: string; value: string };
  without: string;
  decision: Omit<AgentDecision, 'timestamp' | 'status'>;
}

const SCENARIOS: Scenario[] = [
  {
    kind: 'rush_order',
    short: '긴급 오더',
    title: '긴급 오더 3만 개, 내일까지',
    context: '큰 거래처에서 내일까지 제품을 더 달라는 긴급 주문이 들어왔어요. 생산 일정, 자재, 정비, 품질, 인력이 한꺼번에 얽히는 공장 전체의 문제예요.',
    steps: [
      { at: 0, who: 'erp', text: '거래처에서 긴급 오더 접수: 제품 3만 개, 내일 18시까지' },
      { at: 1, who: 'production', text: '지금 계획대로면 1만 8천 개가 모자람. 슈퍼바이저에 보고' },
      { at: 3, who: 'supervisor', text: '생산·물류·설비·품질 AI를 불러 대응 방안 검토 시작' },
      { at: 4, who: 'production', text: '라인 3·4의 작업 순서를 바꾸고 야간 1개 조를 더하면 내일 15시 완료 가능' },
      { at: 5, who: 'logistics', text: '자재 재고 충분. 모자란 필름 2롤은 내일 오전 입고분을 앞당겨 받도록 조율' },
      { at: 5, who: 'pm', text: '라인 4의 내일 10시 정기 정비는 모레로 미뤄도 위험 없음' },
      { at: 6, who: 'quality', text: '처음 만드는 1천 개는 검사 표본을 2배로 늘려 품질 확인' },
      { at: 7, who: 'supervisor', text: 'AI 권한 범위 안의 조치라 바로 실행: 라인 3·4 순서 재배치, 자재 선출고, 정비 일정 이동', kind: 'auto' },
      { at: 10, who: 'production', text: '바뀐 계획으로 내일 15시 완료 예상. 다른 주문의 납기도 모두 지킴', kind: 'verify' },
      { at: 12, who: 'supervisor', text: '야간 잔업 편성과 고객에게 보낼 납기 회신은 생산 관리자에게 승인 요청', kind: 'ask' },
    ],
    autonomous: false,
    humanStep: '생산 관리자가 승인. 야간 조 편성, 고객에게 내일 15시 납품 확정 회신',
    outcome: { label: '긴급 오더 납기', value: '내일 15시 완료 (3시간 여유)' },
    without: '보통은 생산 관리자가 일정을 다시 짜고 부서마다 전화를 돌리느라 반나절이 걸려요.',
    decision: {
      agent: 'Production Agent',
      action: 'approve_overtime',
      target_equipment: '포장 3·4라인',
      recommended_value: '야간 1개 조 추가',
      level: 2,
      reasoning: '긴급 오더 3만 개를 내일 18시까지 맞추려면 라인 3·4의 순서 재배치와 야간 1개 조 추가가 필요합니다. 다른 주문의 납기에는 영향이 없습니다.',
    },
  },
  {
    kind: 'mass_defect',
    short: '대량 불량',
    title: '두 라인에서 불량이 한꺼번에 급증',
    context: '갑자기 여러 라인에서 같은 불량이 쏟아지면, 원인을 찾는 동안에도 불량품이 계속 만들어지고 출하될 수 있어요.',
    steps: [
      { at: 0, who: 'sensor', text: '포장 1·2라인 비전 검사 불량률이 0.8%에서 6.8%로 급등' },
      { at: 1, who: 'quality', text: '두 라인에서 같은 인쇄 번짐 불량. 설비보다 자재 문제로 보고 슈퍼바이저에 보고' },
      { at: 3, who: 'supervisor', text: '품질·물류·설비·생산 AI를 불러 원인과 영향 범위 추적 시작' },
      { at: 4, who: 'logistics', text: '두 라인 모두 오늘 09시에 투입된 같은 필름 로트를 쓰고 있음을 확인' },
      { at: 5, who: 'pm', text: '두 라인의 인쇄기와 히터는 정상. 설비 원인이 아님' },
      { at: 6, who: 'supervisor', text: 'AI 권한 범위 안의 조치라 바로 실행: 해당 로트 사용 중지·격리, 다른 로트로 교체, 09시 이후 생산품 출하 보류', kind: 'auto' },
      { at: 8, who: 'production', text: '로트 교체 20분을 반영해 오늘 생산 계획 재조정. 납기 영향 없음' },
      { at: 10, who: 'quality', text: '교체 후 불량률이 0.8%로 회복. 보류 제품 4,800개는 전수 재검사 대상으로 분류', kind: 'verify' },
      { at: 12, who: 'supervisor', text: '이미 출하된 2개 팔레트의 회수와 공급사 클레임은 품질 책임자에게 승인 요청', kind: 'ask' },
    ],
    autonomous: false,
    humanStep: '품질 책임자가 승인. 회수 지시, 공급사에 클레임 접수',
    outcome: { label: '고객에게 간 불량품', value: '0개 (보류·회수)' },
    without: '보통은 고객 클레임이 들어온 뒤에야 알게 되고, 어느 로트가 문제인지 찾는 데 하루가 걸려요.',
    decision: {
      agent: 'Quality Agent',
      action: 'recall_shipped',
      target_equipment: '포장 1·2라인',
      recommended_value: '2개 팔레트 회수',
      level: 3,
      reasoning: '불량은 오늘 09시에 투입된 필름 로트에서 시작됐습니다. 그 뒤 출하된 2개 팔레트가 같은 로트를 사용해 회수가 필요합니다.',
    },
  },
  {
    kind: 'supply_delay',
    short: '자재 입고 지연',
    title: '포장 필름 입고 6시간 지연',
    context: '공급사 사정으로 원자재가 늦게 들어오면, 미리 손쓰지 않는 한 자재가 떨어지는 순간 라인이 멈춰요.',
    steps: [
      { at: 0, who: 'erp', text: '공급사가 포장 필름 입고가 14시에서 20시로 늦어진다고 통보' },
      { at: 1, who: 'logistics', text: '지금 재고로는 16시에 라인 1·2가 자재 부족으로 멈출 것으로 예측' },
      { at: 3, who: 'supervisor', text: '물류·생산·품질 AI를 불러 대응 검토 시작' },
      { at: 4, who: 'production', text: '필름 재고가 있는 다른 품목을 먼저 생산하도록 순서를 바꾸면 라인이 멈추지 않음' },
      { at: 5, who: 'quality', text: '품목이 바뀔 때 첫 제품 검사 조건을 자동으로 바꿔 둠' },
      { at: 6, who: 'supervisor', text: 'AI 권한 범위 안의 조치라 바로 실행: 생산 순서 변경, 창고 대체 자재 선출고, AMR 운반 순서 재배치', kind: 'auto' },
      { at: 9, who: 'logistics', text: '20시 입고 전까지 자재가 끊기지 않고 생산이 이어짐을 확인', kind: 'verify' },
      { at: 12, who: 'supervisor', text: '같은 지연이 이번 달 두 번째. 대체 공급사 긴급 발주(단가 4% 높음)는 구매 담당자에게 승인 요청', kind: 'ask' },
    ],
    autonomous: false,
    humanStep: '구매 담당자가 승인. 대체 공급사에 발주',
    outcome: { label: '막은 라인 정지', value: '' },
    without: '보통은 자재가 떨어져 라인이 멈춘 뒤에야 일정을 바꾸고, 그동안 라인이 몇 시간씩 서요.',
    decision: {
      agent: 'Logistics Agent',
      action: 'switch_supplier',
      target_equipment: '원자재 창고',
      recommended_value: '대체 공급사 긴급 발주',
      level: 2,
      reasoning: '같은 공급사의 입고 지연이 이번 달 두 번째입니다. 다음 주 생산분 일부는 대체 공급사로 나눠 발주하는 것이 안전합니다.',
    },
  },
  {
    kind: 'energy',
    short: '피크 전력',
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
    outcome: { label: '계약 전력 초과', value: '0회' },
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

/**
 * The same cases as an engineer sees them: who leads, what each agent called
 * in works on (the control hierarchy), and how their positions were argued
 * out into a decision (the agent coordination). Kept beside SCENARIOS so the
 * two tellings stay in step.
 */
const ENGINEER_VIEW: Record<string, Omit<StagedCase, 'kind' | 'phase'>> = {
  rush_order: {
    lead: 'production',
    leadTitle: '긴급 오더 3만 개 일정 재계획',
    leadNote: '라인 3·4 순서 재배치와 야간 1개 조 추가 제안',
    team: { logistics: '필름 2롤 입고 앞당기기 (PO-881)', pm: '라인 4 정기 정비 이동 위험 검토', quality: '첫 1천 개 검사 표본 2배 설정' },
    coordination: {
      title: '긴급 오더 3만 개 대응 조율',
      description: '납기, 설비 수명, 품질, 자재를 한 번에 맞추는 다자 조율',
      timeline: [
        { fromAgent: 'prod', toAgent: 'supervisor', type: 'proposal', content: '1만 8천 개가 모자랍니다. 라인 3·4 순서를 바꾸고 라인 속도를 15% 올리면 내일 12시에 끝낼 수 있습니다. (MILP 스케줄러, 납기 준수 확률 0.97)' },
        { fromAgent: 'pm', toAgent: 'supervisor', type: 'critique', content: '속도 상향은 반대합니다. 라인 4 주축 베어링이 15% 가속 시 온도 한계를 넘을 확률이 0.34입니다. 순서 변경과 정비 이동은 문제없습니다. (RUL 410시간)' },
        { fromAgent: 'qual', toAgent: 'supervisor', type: 'critique', content: '속도를 올리면 실링 체류 시간이 짧아져 실링 불량이 0.8%에서 2.9%로 늘 것으로 예측됩니다.' },
        { fromAgent: 'logistics', toAgent: 'supervisor', type: 'info', content: '필름 재고는 충분합니다. 모자란 2롤은 내일 오전 입고분(PO-881)을 앞당겨 받을 수 있습니다.' },
        { fromAgent: 'prod', toAgent: 'supervisor', type: 'proposal', content: '수정안: 속도는 그대로 두고 야간 1개 조를 더하면 내일 15시 완료, 납기 여유 3시간입니다.' },
        { fromAgent: 'supervisor', toAgent: 'all', type: 'agreement', content: '합의: 라인 속도 유지. 라인 3·4 순서 재배치, 자재 선입고, 라인 4 정비 이동은 즉시 실행. 야간 조 추가는 생산 관리자에게 승인 요청.', reasoning: '품질·설비 가드레일을 넘지 않는 안 중 납기 여유가 가장 큰 안을 골랐습니다. 인력 편성은 L2 권한이라 사람에게 넘겼습니다.', approval: '생산 관리자' },
      ],
    },
  },
  mass_defect: {
    lead: 'quality',
    leadTitle: '포장 1·2라인 인쇄 불량 급증 원인 추적',
    leadNote: '의심 로트 격리와 출하 보류 실행',
    team: { logistics: '필름 로트 이력 추적 (FILM-0921)', pm: '인쇄기·히터 이상 여부 점검', production: '로트 교체 20분 반영해 일정 재조정' },
    coordination: {
      title: '포장 1·2라인 불량 급증 원인 조율',
      description: '원인을 좁혀 라인을 세우지 않고 불량 유입을 끊는 조율',
      timeline: [
        { fromAgent: 'qual', toAgent: 'supervisor', type: 'proposal', content: '두 라인 비전 검사 불량률이 6.8%이고 같은 인쇄 번짐 유형입니다. (YOLOv8 신뢰도 0.96) 두 라인 동시 정지를 제안합니다.' },
        { fromAgent: 'prod', toAgent: 'supervisor', type: 'critique', content: '두 라인을 다 세우면 시간당 6천 개를 잃습니다. 원인 범위부터 좁혀야 합니다.' },
        { fromAgent: 'pm', toAgent: 'supervisor', type: 'info', content: '두 라인 인쇄기·히터의 진동과 온도는 정상입니다. (LSTM 이상 점수 0.12) 설비 원인일 가능성은 낮습니다.' },
        { fromAgent: 'logistics', toAgent: 'supervisor', type: 'info', content: '로트 이력상 두 라인의 공통점은 09:02에 투입된 필름 로트 FILM-0921 하나뿐입니다.' },
        { fromAgent: 'qual', toAgent: 'supervisor', type: 'proposal', content: '수정안: 라인 정지 대신 FILM-0921 격리·교체, 09시 이후 생산품 출하 보류.' },
        { fromAgent: 'supervisor', toAgent: 'all', type: 'agreement', content: '합의: 라인은 세우지 않음. 로트 교체, 의심 로트 격리, 출하 보류는 즉시 실행. 출하된 2개 팔레트 회수는 품질 책임자에게 승인 요청.', reasoning: '원인이 자재로 좁혀져 라인 정지 없이 불량 유입을 끊을 수 있습니다. 출하품 회수는 고객에게 영향이 가는 L3 결정이라 사람에게 넘겼습니다.', approval: '품질 책임자' },
      ],
    },
  },
  supply_delay: {
    lead: 'logistics',
    leadTitle: '포장 필름 입고 6시간 지연 대응',
    leadNote: '생산 순서 변경과 대체 자재 선출고 실행',
    team: { production: '재고 있는 품목부터 생산 순서 변경', quality: '품목 전환 첫 제품 검사 조건 변경' },
    coordination: {
      title: '포장 필름 입고 지연 대응 조율',
      description: '자재가 끊기기 전에 생산 순서를 바꿔 라인 정지를 막는 조율',
      timeline: [
        { fromAgent: 'logistics', toAgent: 'supervisor', type: 'proposal', content: 'PO-902 입고가 14시에서 20시로 늦어집니다. 16시에 라인 1·2 자재가 바닥날 것으로 예측돼(신뢰도 0.93) 라인 1·2 감속을 제안합니다.' },
        { fromAgent: 'prod', toAgent: 'supervisor', type: 'critique', content: '감속하면 오늘 생산량이 2,400개 줄어듭니다. 필름 재고가 있는 다른 품목을 먼저 돌리면 감속이 필요 없습니다.' },
        { fromAgent: 'qual', toAgent: 'supervisor', type: 'info', content: '품목이 바뀔 때 첫 제품 검사 조건은 자동으로 바꿀 수 있습니다. 전환 손실은 회당 8분입니다.' },
        { fromAgent: 'logistics', toAgent: 'supervisor', type: 'proposal', content: '동의합니다. 창고 대체 자재를 먼저 내보내고 AMR 운반 순서를 다시 짜겠습니다.' },
        { fromAgent: 'supervisor', toAgent: 'all', type: 'agreement', content: '합의: 생산 순서 변경, 대체 자재 선출고, AMR 재배차는 즉시 실행. 이번 달 두 번째 지연이라 대체 공급사 발주는 구매 담당자에게 승인 요청.', reasoning: '라인 정지 0시간, 생산량 손실이 없는 안을 골랐습니다. 구매 발주와 단가 변경은 L2 권한이라 사람에게 넘겼습니다.', approval: '구매 담당자' },
      ],
    },
  },
  energy: {
    lead: 'energy',
    leadTitle: '계약 전력 92% 도달로 피크 초과 위험',
    leadNote: 'ESS 120kW 방전과 공조 부하 20분 이전 실행',
    team: { production: '공조·컴프레서 지연 시 생산 영향 확인', safety: '환기·소방 설비 감축 제외 확인' },
    coordination: {
      title: '피크 전력 초과 방지 조율',
      description: '생산을 멈추지 않고 계약 전력 안에 머무는 조율',
      timeline: [
        { fromAgent: 'energy', toAgent: 'supervisor', type: 'proposal', content: '15분 안에 계약 전력을 넘을 확률이 0.82입니다. (Prophet 부하 예측) 포장 라인 2개를 감속해 180kW를 줄이자고 제안합니다.' },
        { fromAgent: 'prod', toAgent: 'supervisor', type: 'critique', content: '라인 감속은 반대합니다. 시간당 3천 개 손실입니다. 공조·컴프레서는 20분 늦춰도 생산에 영향이 없습니다.' },
        { fromAgent: 'safety', toAgent: 'supervisor', type: 'info', content: '환기·소방 설비는 감축 대상에서 빼야 합니다.' },
        { fromAgent: 'qual', toAgent: 'supervisor', type: 'info', content: '공조를 20분 늦춰도 실내 온습도는 품질 기준 안에 머뭅니다.' },
        { fromAgent: 'energy', toAgent: 'supervisor', type: 'proposal', content: '수정안: ESS 120kW 방전과 공조·컴프레서 부하 20분 이전으로 160kW를 줄일 수 있습니다.' },
        { fromAgent: 'supervisor', toAgent: 'all', type: 'agreement', content: '합의: 생산 라인은 그대로 두고 ESS 방전과 공조 부하 이전을 즉시 실행. L1 권한이라 사람 승인 없이 결과만 보고.', reasoning: '생산 손실 0, 안전 설비 유지, 품질 기준 유지를 모두 만족하는 안입니다. 계약 전력 초과를 막아 1년 기본요금 인상을 피했습니다.' },
      ],
    },
  },
};

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

  // The engineer's screens follow the case being played.
  const casePhase = phase === 'intro' ? 'before' as const : phase === 'live' ? 'live' as const : 'after' as const;
  useEffect(() => {
    setStagedCase({ kind: scenario.kind, phase: casePhase, ...ENGINEER_VIEW[scenario.kind] });
  }, [scenario.kind, casePhase]);
  useEffect(() => () => setStagedCase(null), []);

  // The decision record opens on the agents arguing the case out, from the start.
  useEffect(() => {
    if (phase === 'evidence') replayCoordination();
  }, [phase]);

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
    // A case picked mid-event lets the running one settle first.
    if (plant.excursion) startExcursion(plant.excursion.kind, 1);
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

  /** Play one case now, from its start. */
  const pick = (i: number) => {
    setAutoplay(true);
    setTouched(false);
    startLoop(i);
    setRole('worker');
  };

  const restart = () => pick(0);

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
        <div className="mb-2 flex flex-wrap gap-1" role="group" aria-label={t('사례 고르기')}>
          {SCENARIOS.map((c, i) => (
            <button
              key={c.kind}
              onClick={() => pick(i)}
              aria-pressed={i === scenarioIndex}
              className={cn(
                'rounded-lg border px-2 py-1 text-[11px] font-bold transition-colors',
                i === scenarioIndex ? 'border-accent bg-accent text-white' : 'border-border text-text-secondary hover:border-accent/50 hover:text-text-primary',
              )}
            >{i + 1}. {t(c.short)}</button>
          ))}
        </div>
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
              <Fact icon={<ShieldCheck size={12} />} label={t(scenario.outcome.label)} value={scenario.outcome.value ? t(scenario.outcome.value) : formatHours(value.hours)} />
              <Fact icon={<Coins size={12} />} label={t('아낀 비용 (추정)')} value={money(value.krw)} />
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-text-secondary">{t('플랫폼이 없었다면: {text}', { text: t(scenario.without) })}</p>
          </div>
        )}
        {phase === 'evidence' && (
          <div className="rounded-xl border border-border bg-surface-hover/40 p-3 text-xs leading-relaxed">
            <div className="mb-1 flex items-center gap-1.5 font-black"><FileSearch size={14} className="text-accent" />{t('모든 판단이 기록돼요')}</div>
            <p>{t('어떤 데이터를 보고, 어떤 AI가, 왜 그렇게 판단했는지, 누가 승인했는지가 모두 남아요.')}</p>
            <p className="mt-1">{t('지금 화면은 같은 사건의 엔지니어용 기록이에요. 에이전트들이 어떤 근거로 제안하고 반대해서 합의했는지 보여 주고, [관제 구조] 탭에서는 어느 에이전트가 무엇을 맡았는지 볼 수 있어요.')}</p>
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
