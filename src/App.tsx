/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  LayoutDashboard, 
  Activity, 
  Settings, 
  ShieldAlert, 
  Zap, 
  MessageSquare, 
  ChevronRight, 
  Search, 
  Bell, 
  User,
  Menu,
  X,
  XCircle,
  CheckCircle2,
  AlertTriangle,
  Info,
  Send,
  Loader2,
  Cpu,
  Factory,
  Database,
  BarChart3,
  Clock,
  Camera,
  Eye,
  History,
  Wrench,
  Layers,
  Box,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Square,
  Settings2,
  Sliders,
  Save,
  ClipboardList,
  ShieldCheck,
  Target,
  GitBranch,
  Users,
  Truck,
  PlayCircle,
  TrendingUp,
  BookOpen,
  FileText,
  Shield,
  Mail,
  Slack,
  ChevronLeft,
  ArrowRight,
  Thermometer,
  Droplets,
  Wind,
  DollarSign,
  Gauge,
  BellRing,
  Server,
  Globe,
  AlertCircle,
  Link,
  FileCode,
  Share2,
  GitMerge,
  Network,
  Code2,
  Plus,
  Upload,
  Code,
  FileJson,
  FileSpreadsheet,
  Download,
  Check,
  RotateCcw,
  Trash2,
  PlusCircle,
  Bot,
  Paperclip,
  Mic,
  Sparkles,
  ExternalLink,
  Maximize2,
  Minimize2,
  FileSearch,
  Table as TableIcon,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ScatterChart,
  Scatter,
  ZAxis,
  ComposedChart,
  Legend
} from 'recharts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { 
  MENU_ITEMS, 
  CATEGORIES, 
  MOCK_GOALS, 
  MOCK_PLAYBOOKS,
  MOCK_COORDINATION_EVENTS
} from './constants';
import { 
  MenuItem, 
  SensorData, 
  AgentDecision, 
  ChatMessage, 
  OverrideLog,
  Goal,
  Playbook,
  EvidencePack,
  PolicyPriority,
  CoordinationEvent
} from './types';
import { generateChatResponse, generateRecommendations } from './services/geminiService';
import ExpoLanding from './components/ExpoLanding';
import ExpoSidebar from './components/ExpoSidebar';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Mock Data Generators
const generateMockSensorData = (): SensorData[] => {
  const data: SensorData[] = [];
  const now = new Date();
  for (let i = 20; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 60000);
    data.push({
      timestamp: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      line: '포장1라인',
      equipment: '수축포장기-01',
      vibration: 3.5 + Math.random() * 1.5,
      temperature: 170 + Math.random() * 10,
      current_amp: 12 + Math.random() * 2,
      defect_rate: Math.random() * 5,
      status: Math.random() > 0.9 ? 'warning' : 'normal'
    });
  }
  return data;
};

const INITIAL_DECISIONS: AgentDecision[] = [
  {
    agent: 'Quality Agent',
    action: 'adjust_temperature',
    target_equipment: '수축포장기-01',
    recommended_value: 173.0,
    level: 2,
    reasoning: '불량률이 7.3%로 상승함에 따라 최적 온도 173°C로 조정을 권장합니다. 과거 데이터 분석 결과 이 온도에서 불량률이 2.1%로 감소했습니다.',
    timestamp: new Date().toISOString(),
    status: 'pending'
  },
  {
    agent: 'PM Agent',
    action: 'replace_bearing',
    target_equipment: '케이스패커-02',
    recommended_value: '교체 권장',
    level: 1,
    reasoning: '진동 수치가 4.2mm/s로 임계치(3.5)를 초과했습니다. 72시간 내 베어링 파손 위험이 85%로 예측됩니다.',
    timestamp: new Date().toISOString(),
    status: 'pending'
  }
];

const SCENARIO_SPECIFIC_DECISIONS: Record<number, AgentDecision[]> = {
  0: [ // Scenario A
    {
      agent: 'Quality Agent',
      action: 'adjust_temperature',
      target_equipment: '수축포장기-01',
      recommended_value: 173.0,
      level: 2,
      reasoning: '불량률 상승(7.3%) 차단 및 OEE 가동 효율 극대화를 위해 최적 수축 온도 173.0°C 조정을 강력 권장합니다.',
      timestamp: new Date().toISOString(),
      status: 'pending'
    },
    {
      agent: 'PM Agent',
      action: 'lubricator_operation',
      target_equipment: '수축포장기-01',
      recommended_value: '자동 급유 개시',
      level: 1,
      reasoning: '3축 진동값 미세 패턴 변화가 발견되었습니다. 사전에 1라인 급유 장치를 가동해 가동 중단을 정밀 차단합니다.',
      timestamp: new Date().toISOString(),
      status: 'pending'
    }
  ],
  1: [ // Scenario B
    {
      agent: 'Safety Agent',
      action: 'exhaust_fan_boost',
      target_equipment: 'A-3 안전 환기댐퍼',
      recommended_value: '환기량 100% 가동 (오버라이드)',
      level: 2,
      reasoning: '가열 설비 인근 A-3 영역에서 특이 유증기/가스 15ppm 미세 감지가 포착되어 환기량 100% 강제 가동과 일시 경계 모드로 전환할 것을 가이드라인합니다.',
      timestamp: new Date().toISOString(),
      status: 'pending'
    },
    {
      agent: 'PM Agent',
      action: 'vibration_damping',
      target_equipment: '가열 공조 모터-03',
      recommended_value: '운전 속도 85% 감속',
      level: 1,
      reasoning: '유증 연쇄 가열 마찰 축의 발열 기성을 완정 차폐하기 위해 운전 속도 85% 감속 제어할 것을 추천합니다.',
      timestamp: new Date().toISOString(),
      status: 'pending'
    }
  ],
  2: [ // Scenario C
    {
      agent: 'Energy Agent',
      action: 'peak_shaving_bypass',
      target_equipment: '칠러 보완 펌프 & ESS',
      recommended_value: '에너지 절전 우회 모드 (피크 피쇄)',
      level: 2,
      reasoning: '한낮 기온 상승으로 전원 계약 피크 전력 한계 돌입 30분 전입니다. ESS 즉시 방전과 비핵심 라인의 감속 에너지 세이빙 우회 모드를 수락 승인해 주시기 바랍니다.',
      timestamp: new Date().toISOString(),
      status: 'pending'
    },
    {
      agent: 'PM Agent',
      action: 'cooling_water_boost',
      target_equipment: '칠러 냉각 펌프',
      recommended_value: '순환 유량 +15% 유압 상향',
      level: 1,
      reasoning: '세이빙 가동 부하에 따른 임계 모터 발열 냉각을 위해 펌프 순환수 압압을 강화 보정 가동할 것을 권고합니다.',
      timestamp: new Date().toISOString(),
      status: 'pending'
    }
  ],
  3: [ // Scenario D
    {
      agent: 'Logistics Agent',
      action: 'rush_order_upspeed',
      target_equipment: '패키징 1라인',
      recommended_value: '가속 운전 수용 120%',
      level: 2,
      reasoning: '고부가 파트너 긴급 하루 딜리버리 할당 수율 달성을 위해 패키징 1라인 분 속도를 안전 모드 최대 가용치인 120%까지 상향 제어 기제를 강력 권장합니다.',
      timestamp: new Date().toISOString(),
      status: 'pending'
    },
    {
      agent: 'Quality Agent',
      action: 'joint_vacuum_boost',
      target_equipment: '열접합 패키지 헤드',
      recommended_value: '진공 밀착 압력 +0.2bar 강화',
      level: 1,
      reasoning: '120% 가속 환경에서도 미세 가공 스크래치 및 핀홀 불량 발생을 완벽 소지 관리하기 위해 접착 흡축 기압을 상압 조정합니다.',
      timestamp: new Date().toISOString(),
      status: 'pending'
    }
  ]
};

const TOUR_SCENARIOS = [
  {
    id: 0,
    name: "Scenario A: 전사 생산 극대화 & 통합 OEE",
    description: "생산 극대화 목표 하에 품질, 예지보전, 에너지, 안전, 물류 등 전 에이전트의 실시간 최적화 협업 시나리오",
    steps: [
      {
        stepId: 1,
        title: "실시간 공정 진단 & 추천",
        targetMenuId: 0,
        badge: "01 / 04단계: 통합 모니터링",
        highlightAction: "💡 'AI 추천 제어 안건' 중 하나를 선택하시고 [승인] 버튼을 눌러보세요!",
        explanation: "전 공장의 가동 종합 효율(OEE), 불량률, 온-불량 상관관계를 종합하여 수 밀리초만에 이상 징후를 감지하고, 에이전트가 생성한 추천 제어값을 오퍼레이터가 직접 확인 및 실시간 승인하는 시나리오를 자유롭게 조작해볼 수 있습니다.",
        checklist: [
          "최상단 KPI 카드 및 '설비 가동 시간' 차트 감상",
          "실시간 AI 추천 목록 중 1개를 [승인] 또는 [조정 기재]해보기",
          "제어 덮어쓰기 기록 팝업이나 이력 변화 검증"
        ]
      },
      {
        stepId: 2,
        title: "설비 RUL 수명 예측 진단",
        targetMenuId: 8,
        badge: "02 / 04단계: AI 설비 보전",
        highlightAction: "💡 GBR 인공지능 잔여 수명 예측 곡선과 AI 추천 정비 우선순위를 확인하세요!",
        explanation: "Gradient Boosting Regression(GBR) 인공지능 알고리즘이 3축 진동값 및 냉각 온도를 머신러닝 분석하여 72시간 내 고장 발생 여부를 정밀 예측합니다. 설비 정비사의 대응 시간을 획기적으로 늘려 사전에 교체 오더를 내림으로써 예상치 못한 가동 중단을 사전에 무력화합니다.",
        checklist: [
          "수명 위험 72시간 미만 경고 시스템 확인",
          "AI가 산출해 낸 최적 보전 스케줄링 가이드라인 읽어보기"
        ]
      },
      {
        stepId: 3,
        title: "에이전트 지휘 컨트롤 타워",
        targetMenuId: 31,
        badge: "03 / 04단계: 에이전트 지휘관",
        highlightAction: "💡 'Active Goal' 영역과 '수립된 정책' 가드가 충돌하는 것을 찾아보세요!",
        explanation: "생산 극대화와 안전/에너지 가드레일은 수시로 상충합니다. AI Supervisor는 최상위 전사 목표(Active Goal)를 제시하고, 각 에이전트들에게 하위 작업 목록을 완벽하게 분해 매핑하여 지휘하는 AI 컨트롤 타워를 감상해보세요.",
        checklist: [
          "L1: Safety Layer 우선 적용 규칙 지표 확인하기",
          "수립된 각 AI 에이전트의 구체적인 목표 준수 비율 체크"
        ]
      },
      {
        stepId: 4,
        title: "AI 에이전트 라이브 조율",
        targetMenuId: 31,
        badge: "04 / 04단계: 에이전트 협의체 융합",
        highlightAction: "💡 아래 [오케스트레이션 라이브 실행]을 눌러 토론 비주얼라이저를 재생하세요!",
        explanation: "가장 중요한 핵심 기능입니다! 생산, 예지보전, 품질, 에너지, 안전, 물류 에이전트 전사 주요 6대 에이전트의 가스 누출이나 피크 전력, 또는 초대형 복합 최적화 시나리오에서 다자 의견 조율 상황을 시뮬레이션할 수 있습니다.",
        checklist: [
          "통합 6대 에이전트 시나리오를 선택하여 오케스트레이션 감상하기",
          "가스 미세 누출 / 피크 전력 시나리오로 번갈아 전환 작동",
          "자동 재생 일시 정지 및 수동으로 SkipForward/Reset 조작해보기",
          "하단에 축적되는 실시간 타임라인 오케스트레이션 Event Log 분석"
        ]
      }
    ]
  },
  {
    id: 1,
    name: "Scenario B: 돌발 고장 및 안전 예방 가드레일",
    description: "갑작스러운 설비 진동 폭발 예측 및 공조 제어 가드, 안전-배기-물류 연쇄 대응 시나리오",
    steps: [
      {
        stepId: 1,
        title: "이상 징후 및 공조 제어",
        targetMenuId: 0,
        badge: "01 / 04단계: 안전 초동 조치",
        highlightAction: "💡 미세 가스 감지 관련 '공조 배기 제어' 추천 안건을 선택하고 [승인]해 보세요!",
        explanation: "가열 설비 근처에 설치된 안전 감지기가 아주 희박한 특이 유증기/가스를 모니터링하여 즉각적으로 공조 통풍 가이드라인을 전개하고 장비 가속을 일시 중단시키는 실시간 초동 대응을 확인합니다.",
        checklist: [
          "안전 센서 공조 가이드라인 및 위험 경고 확인",
          "AI가 실시간 생성한 추천 배기 오버라이드 제어 항목 [승인] 클릭",
          "제어 이력 변화와 안전 피드백 로그 확인"
        ]
      },
      {
        stepId: 2,
        title: "지능형 CCTV 안전 화재 구획",
        targetMenuId: 19,
        badge: "02 / 04단계: AI 안전 실시간 비전 감시",
        highlightAction: "💡 CCTV 비전 탐지 피드가 유증기 잔여 확산 및 이상 발열 분포를 격리 분석하는 것을 검토하세요!",
        explanation: "센서 오열 구역 배지에서 미세 가스 전파가 우려됩니다. AI 안전 에이전트는 YOLOv8 비전 분석 엔진을 적용해 고열 배지 구역을 지능형 격리 감시하고 실시간 연기/화재 발생 등급을 즉시 확인합니다.",
        checklist: [
          "열화상 필터링과 실시간 연기 검출 신뢰도 변화 확인",
          "비전 AI가 하달하는 Zone B-4 화재 등급 상향 전조 경고 추적"
        ]
      },
      {
        stepId: 3,
        title: "L1 Safety 정책 우선 제어",
        targetMenuId: 31,
        badge: "03 / 04단계: 안전 절대 우선 정책",
        highlightAction: "💡 'Safety Core Level 1' 우선 적용 정책 가드가 활성화된 것을 감상해 보세요!",
        explanation: "비상 가동 중에는 생산 극대화 지표보다 인체 안전 및 폭발 방지 우선 가치가 활성화됩니다. AI Supervisor는 L1 Safety Layer 규칙을 기동하여 생산 목표를 안전하게 블로킹하고 안전 가드를 강화합니다.",
        checklist: [
          "L1 Safety Rule 강제 지상 명령 지표 확인",
          "에이전트 권장 정책의 소방 감리 로그 우선 검토"
        ]
      },
      {
        stepId: 4,
        title: "안전-배기 다자 조율 토론",
        targetMenuId: 31,
        badge: "04 / 04단계: 안전 중심 에이전트 오케스트레이션",
        highlightAction: "💡 라이브 토론 리스트 중 [가스 미세 누출 경보 & 배기 제어 충돌]을 동작시키세요!",
        explanation: "배기팬 완전 가동 시 압력 변화로 인해 라인이 일시 중단될 수 있어 생산 에이전트가 완만 배기를 요청한 상태입니다. 세밀한 해결책을 내기 위해 안전, 품질, 설비예지, 물류 에이전트 간 벌어지는 고난도 중재 토론을 감상하십시오.",
        checklist: [
          "'가스 미세 누출 경보 & 배기 제어 충돌' 모의 실행",
          "자동 재생 혹은 스킵 조작을 통해 토론 타임라인 관찰",
          "가류 우회 이송 솔루션과 가스 소강 합의 도출 판가름 분석"
        ]
      }
    ]
  },
  {
    id: 2,
    name: "Scenario C: 피크 전력 한계 돌파 억제",
    description: "한낮 최고 고온 환경의 에너지 전력 피크 위력 완화 및 ESS, AMR 동원 친환경 연계 시나리오",
    steps: [
      {
        stepId: 1,
        title: "전력 피크 경계 모니터링",
        targetMenuId: 0,
        badge: "01 / 04단계: 에너지 피크 위험 감시",
        highlightAction: "💡 전력 누적 경보에 대응하는 '에너지 절전 우회 모드'를 [승인]해 보세요!",
        explanation: "외기 온도 급등으로 냉방 부하가 누적되며 한전 계약 피크 전력 한계치 돌파 30분 전입니다. AI 에너지 에이전트가 특정 비핵심 라인 감속 제어 및 비상 발전 충방전 제어를 즉각 가이드라인으로 전파합니다.",
        checklist: [
          "계약 전력 피크 대비 전사 과부하 상태 파악",
          "에너지 에이전트의 '피크 완화 추천 가속 감속 조치' [승인] 승낙",
          "전사 부하 감소 피드백 수치 및 제어 로그 이력 검조"
        ]
      },
      {
        stepId: 2,
        title: "AI 피크 에너지 부하 정비",
        targetMenuId: 18,
        badge: "02 / 04단계: 피크 실시간 에너지 제어",
        highlightAction: "💡 한계치(Limit) 대비 실시간 라인 합산 전력 사용 추이를 모니터링하세요!",
        explanation: "외기 전고 온도 부하 극대화 시 냉방 칠러 전력 소비가 폭등합니다. AI 에너지 에이전트는 15분 단위 누적 전력을 정교하게 타겟 연동하여 피크 임계치에 도달하지 않도록 피크 억제 가이드 제어를 발령합니다.",
        checklist: [
          "실시간 정오 시간 전후 전사 피크 위험 한계치 격차 대조",
          "피크 부하 제어 알고리즘의 유휴 AMR 배터리 방전 지지선 이력 파악"
        ]
      },
      {
        stepId: 3,
        title: "탄소 및 전력 통제 정책 가드",
        targetMenuId: 31,
        badge: "03 / 04단계: CO2 배출량 한계 관리",
        highlightAction: "💡 Supervisor Center of 'Energy Allocation Level' 가이드 등급을 확인해 보세요!",
        explanation: "AI Supervisor는 한낮 시간 동안 전사에너지 배분 가이드를 상향 기재하고, 조업 스케줄 분배 정책을 가동하여 전원에이전트의 합산 탄소 배출량이 목표치를 침범하지 않도록 통제 사령을 내립니다.",
        checklist: [
          "Energy Allocation 탄소 저감 정책 우선순위 체크",
          "에스컬레이션 로그 수립 및 실시간 시뮬레이션 지수 감상"
        ]
      },
      {
        stepId: 4,
        title: "ESS 연동 피크 셰이빙 토론",
        targetMenuId: 31,
        badge: "04 / 04단계: ESS 연쇄 최적 오케스트레이션",
        highlightAction: "💡 토론 비주얼라이저에서 [정오 피크 전력 한계 제어 충돌]을 동작하세요!",
        explanation: "속도를 낮추어야 한다는 에너지 에이전트와, 속도 축소 시 출하량 미달을 고지하는 생산 에이전트, 유휴 AMR 배터리 버퍼를 활용하자고 제안하는 물류 에이전트까지 얽힌 복합 전력 최적화 토론을 역동적으로 확인합니다.",
        checklist: [
          "'정오 피크 전력 한계 제어 충돌' 복합 시나리오 가동",
          "라이브 합조 타임라인 순차 흐름 및 가이 가속 스킨",
          "AMR 충전 중단 및 ESS 배터리 방전 지원 합의 의사결정 수립 감상"
        ]
      }
    ]
  },
  {
    id: 3,
    name: "Scenario D: 긴급 러시 오더 & 불량 보증",
    description: "고부가 고객사의 긴급 하루 출하량 대응을 위한 라인 스피드업 및 불량률 제로 분격 시나리오",
    steps: [
      {
        stepId: 1,
        title: "러시 오더 초가속 모드",
        targetMenuId: 0,
        badge: "01 / 04단계: 긴급 물류 대응",
        highlightAction: "💡 '패키징 속도 120% 가속 수용안' 카드를 찾아 기재 [승인]해 보세요!",
        explanation: "글로벌 유통사에서 다음 근무조까지 긴급 물량을 수송 완료해 달라는 특급 거래 안건이 생성되었습니다. 물류 에이전트의 권고에 맞춰 생산 구동력을 안전 범위 내 최대치인 120%까지 끌어올리는 추천 연동 제어입니다.",
        checklist: [
          "긴급 델리버리 요청 수치 및 가동 종합 현황 인지",
          "AI가 긴급하게 하달한 '라인 속도 초속 제어안' [승인] 실행",
          "전체 적체 슬롯 and AMR 대기 상태 실시간 추적"
        ]
      },
      {
        stepId: 2,
        title: "초가속 패키징 품질 비전 검사",
        targetMenuId: 2,
        badge: "02 / 04단계: 초경량 고품질 비전 탐지",
        highlightAction: "💡 120% 초고속 라인 가동 상태에서 패키징 접착 비전 프레임을 실시간 진단해보세요!",
        explanation: "초고속 가동 시에는 미세 기포나 밀봉 불량이 연속될 위험이 있습니다. AI 품질 에이전트는 YOLOv8 및 PatchCore 검증 이미지를 바탕으로 병 밀봉 검사 및 OCR 바코드를 오차 없이 고속 판독합니다.",
        checklist: [
          "비전 검사 프레임 상의 실시간 패키징 OK/NG 전사 분류 확인",
          "불량 탐지를 위한 결함 스코어(Defect Score) 변화 시계열 분석"
        ]
      },
      {
        stepId: 3,
        title: "SLA 납량 및 불량 제로 가드",
        targetMenuId: 31,
        badge: "03 / 04단계: SLA 납기 및 품질 보증 가드",
        highlightAction: "💡 Supervisor Center에서 'SLA Delivery Priority' 정책 가드를 식별하세요!",
        explanation: "초합리적 생산에서도 완벽 품질 수치가 최우선시 되어야 출고가 인정됩니다. AI Supervisor는 목표 불량율 가드레일 정책을 동시 가동하여 전원에이전트의 고품질 밀착 사수 비율을 종합 감시합니다.",
        checklist: [
          "SLA 납기 사전 보증 가이드라인 적용 상태 식별",
          "하단 각 에이전트 분할 목표 준수 지점 종합 관장"
        ]
      },
      {
        stepId: 4,
        title: "초가속 스크래치 방어 토론",
        targetMenuId: 31,
        badge: "04 / 04단계: 품질-생산-물류 상협 합의",
        highlightAction: "💡 [B라인 생산 속도 최적화 충돌] 시나리오를 선택하여 오케스트레이션을 확인하세요!",
        explanation: "속도를 높여서 납기를 맞추려는 '물류'의 급제안에 대하여 속도 증가 시 열접합 스크래치 불량이 치솟는다는 '품질'과, 발열 온도 수치를 냉각 파라미터 미세 조정으로 억제하자는 '예지보전', AMR 완충 스와프 라인을 조력하는 '물류 에이전트'가 최종 도출하는 황금 협업을 관찰합니다.",
        checklist: [
          "'B라인 생산 속도 최적화 충돌' 시나리오 선택",
          "실시간 다자 협조 합의 라이브 재생 관장",
          "냉각 밸브 개폐 압력 보정 + 전하 AMR 선회 이송을 융합한 합의안 확인"
        ]
      }
    ]
  }
];

export default function App() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [selectedMenu, setSelectedMenu] = useState<MenuItem>(MENU_ITEMS[0]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [sensorData, setSensorData] = useState<SensorData[]>(generateMockSensorData());
  const [decisions, setDecisions] = useState<AgentDecision[]>(INITIAL_DECISIONS);
  const [overrideLogs, setOverrideLogs] = useState<OverrideLog[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: '안녕하세요! IMPIX AI Supervisor입니다. 무엇을 도와드릴까요?', timestamp: new Date().toLocaleTimeString() }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isRecommending, setIsRecommending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // EXPO Landing & Interactive Mode States
  const [showExpoLanding, setShowExpoLanding] = useState(true);
  const [isExpoInteractiveMode, setIsExpoInteractiveMode] = useState(false);
  const [expoScore, setExpoScore] = useState(0);
  const [expoApprovedCount, setExpoApprovedCount] = useState(0);
  const [expoRejectedCount, setExpoRejectedCount] = useState(0);
  const [expoEventsTriggered, setExpoEventsTriggered] = useState(0);
  const [expoScoreHistory, setExpoScoreHistory] = useState<{id: string; label: string; type: 'approved' | 'rejected' | 'event'; points: number; timestamp: Date}[]>([]);

  // EXPO Self-Guided Tour States
  const [isTourMode, setIsTourMode] = useState(false);
  const [tourScenarioIdx, setTourScenarioIdx] = useState(0);
  const [tourStep, setTourStep] = useState(0);
  const [isTourOrchestrationOpen, setIsTourOrchestrationOpen] = useState(false);

  // Custom checklist completion states mapping "scenarioIdx_stepIdx" to boolean array
  const [tourChecklistState, setTourChecklistState] = useState<Record<string, boolean[]>>(() => {
    const states: Record<string, boolean[]> = {};
    [0, 1, 2, 3].forEach(sIdx => {
      states[`${sIdx}_0`] = [false, false, false];
      states[`${sIdx}_1`] = [false, false];
      states[`${sIdx}_2`] = [false, false];
      states[`${sIdx}_3`] = [false, false, false, false];
    });
    return states;
  });

  // Dynamic recommendations update depending on active tour scenario
  useEffect(() => {
    if (isTourMode) {
      const specific = SCENARIO_SPECIFIC_DECISIONS[tourScenarioIdx];
      if (specific) {
        setDecisions(specific.map(d => ({ ...d, timestamp: new Date().toISOString(), status: 'pending' })));
      }
    } else {
      setDecisions(INITIAL_DECISIONS.map(d => ({ ...d, timestamp: new Date().toISOString(), status: 'pending' })));
    }
  }, [tourScenarioIdx, isTourMode]);

  // Track automated actions taken across different workspaces
  useEffect(() => {
    const handleTourAction = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && typeof detail.step === 'number' && typeof detail.checklistIdx === 'number') {
        const sIdx = typeof detail.scenario === 'number' ? detail.scenario : tourScenarioIdx;
        setTourChecklistState(prev => {
          const key = `${sIdx}_${detail.step}`;
          const current = [...(prev[key] || [])];
          current[detail.checklistIdx] = true;
          return { ...prev, [key]: current };
        });
      }
    };
    window.addEventListener('tour-action', handleTourAction);
    return () => window.removeEventListener('tour-action', handleTourAction);
  }, [tourScenarioIdx]);

  const handleChecklistClick = (stepIdx: number, itemIdx: number) => {
    // 1. Toggle checked state manually
    setTourChecklistState(prev => {
      const key = `${tourScenarioIdx}_${stepIdx}`;
      const current = [...(prev[key] || [])];
      current[itemIdx] = !current[itemIdx];
      return { ...prev, [key]: current };
    });

    // 2. Guide user to relevant views automatically depending on active step targetMenuId
    const activeScenario = TOUR_SCENARIOS[tourScenarioIdx];
    if (activeScenario && activeScenario.steps[stepIdx]) {
      const activeStep = activeScenario.steps[stepIdx];
      const targetMenu = MENU_ITEMS.find(m => m.id === activeStep.targetMenuId);
      if (targetMenu) {
        setSelectedMenu(targetMenu);
      }
      
      // If stepIdx is 0 and they clicked item 2 (Logs)
      if (stepIdx === 0 && itemIdx === 2) {
        const logMenu = MENU_ITEMS.find(m => m.id === 23);
        if (logMenu) setSelectedMenu(logMenu);
      }

      // Special logic for Step 4 (index 3) - Show Live Orchestration
      if (stepIdx === 3) {
        setIsTourOrchestrationOpen(true);
      } else {
        setIsTourOrchestrationOpen(false);
      }
    }
  };


  const fetchAIRecommendations = async () => {
    setIsRecommending(true);
    const newRecommendations = await generateRecommendations(sensorData);
    if (newRecommendations && newRecommendations.length > 0) {
      const formatted = newRecommendations.map((r: any) => ({
        ...r,
        timestamp: new Date().toISOString(),
        status: 'pending'
      }));
      setDecisions(prev => [...formatted, ...prev].slice(0, 10));
    }
    setIsRecommending(false);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setSensorData(prev => {
        const newData = [...prev.slice(1)];
        const lastTime = new Date();
        newData.push({
          timestamp: lastTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          line: '포장1라인',
          equipment: '수축포장기-01',
          vibration: 3.5 + Math.random() * 1.5,
          temperature: 170 + Math.random() * 10,
          current_amp: 12 + Math.random() * 2,
          defect_rate: Math.random() * 5,
          status: Math.random() > 0.95 ? 'warning' : 'normal'
        });
        return newData;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;

    const userMsg: ChatMessage = { role: 'user', content: chatInput, timestamp: new Date().toLocaleTimeString() };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsChatLoading(true);

    const history = chatMessages.map(m => ({
      role: m.role === 'user' ? 'user' as const : 'model' as const,
      parts: [{ text: m.content }]
    }));

    const response = await generateChatResponse(chatInput, history);
    const assistantMsg: ChatMessage = { role: 'assistant', content: response, timestamp: new Date().toLocaleTimeString() };
    setChatMessages(prev => [...prev, assistantMsg]);
    setIsChatLoading(false);
  };

  const handleApprove = (index: number, adjustedValue?: number | string, notes?: string) => {
    const decision = decisions[index];
    const finalValue = adjustedValue !== undefined ? adjustedValue : decision.recommended_value;
    
    setDecisions(prev => prev.map((d, i) => i === index ? { 
      ...d, 
      status: 'approved',
      adjusted_value: adjustedValue,
      operator_notes: notes
    } : d));

    // Expo score update
    if (isExpoInteractiveMode) {
      const points = 20;
      setExpoScore(prev => prev + points);
      setExpoApprovedCount(prev => prev + 1);
      setExpoScoreHistory(prev => [{
        id: Math.random().toString(36).substr(2, 9),
        label: `${decision.agent}: ${decision.action}`,
        type: 'approved',
        points,
        timestamp: new Date()
      }, ...prev]);
    }

    // Log the override if adjusted or just log the approval
    const newLog: OverrideLog = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      operator: 'oddeye2796@gmail.com', // Current user
      equipment: decision.target_equipment,
      parameter: decision.action,
      original_value: decision.recommended_value,
      new_value: finalValue,
      reason: notes || 'Approved as recommended',
      type: adjustedValue !== undefined ? 'manual_override' : 'ai_adjustment'
    };
    setOverrideLogs(prev => [newLog, ...prev]);

    // Dispatch auto-completion for Step 1 checklist items
    window.dispatchEvent(new CustomEvent('tour-action', { detail: { step: 0, checklistIdx: 1 } }));
    window.dispatchEvent(new CustomEvent('tour-action', { detail: { step: 0, checklistIdx: 2 } }));
  };

  const handleReject = (index: number, notes?: string) => {
    setDecisions(prev => prev.map((d, i) => i === index ? { 
      ...d, 
      status: 'rejected',
      operator_notes: notes
    } : d));
    
    const decision = decisions[index];

    // Expo score update
    if (isExpoInteractiveMode) {
      const points = -5;
      setExpoScore(prev => Math.max(0, prev + points));
      setExpoRejectedCount(prev => prev + 1);
      setExpoScoreHistory(prev => [{
        id: Math.random().toString(36).substr(2, 9),
        label: `${decision.agent}: ${decision.action}`,
        type: 'rejected',
        points,
        timestamp: new Date()
      }, ...prev]);
    }
    const newLog: OverrideLog = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      operator: 'oddeye2796@gmail.com',
      equipment: decision.target_equipment,
      parameter: decision.action,
      original_value: decision.recommended_value,
      new_value: 'REJECTED',
      reason: notes || 'Rejected by operator',
      type: 'manual_override'
    };
    setOverrideLogs(prev => [newLog, ...prev]);

    // Dispatch auto-completion for Step 1 checklist items
    window.dispatchEvent(new CustomEvent('tour-action', { detail: { step: 0, checklistIdx: 1 } }));
    window.dispatchEvent(new CustomEvent('tour-action', { detail: { step: 0, checklistIdx: 2 } }));
  };

  const handleLog = (index: number) => {
    const decision = decisions[index];
    setDecisions(prev => prev.map((d, i) => i === index ? { ...d, status: 'logged' } : d));
    
    const newLog: OverrideLog = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      operator: 'oddeye2796@gmail.com',
      equipment: decision.target_equipment,
      parameter: decision.action,
      original_value: decision.recommended_value,
      new_value: 'ARCHIVED',
      reason: 'Manual log to history for audit',
      type: 'ai_adjustment'
    };
    setOverrideLogs(prev => [newLog, ...prev]);

    // Dispatch auto-completion for Step 1 checklist items
    window.dispatchEvent(new CustomEvent('tour-action', { detail: { step: 0, checklistIdx: 1 } }));
    window.dispatchEvent(new CustomEvent('tour-action', { detail: { step: 0, checklistIdx: 2 } }));
  };

  const renderContent = () => {
    switch (selectedMenu.id) {
      case 0: // Dashboard
        return (
          <DashboardView 
            sensorData={sensorData} 
            decisions={decisions} 
            fetchAIRecommendations={fetchAIRecommendations} 
            isRecommending={isRecommending}
            handleApprove={handleApprove}
            handleReject={handleReject}
          />
        );
      case 8: // RUL 잔여수명 예측
        return <RULPredictionView isTourMode={isTourMode} tourScenarioIdx={tourScenarioIdx} />;
      case 9: // 보전 작업 오더
        return <WorkOrderView />;
      case 22: // AI 추천 액션 목록
        return (
          <RecommendationEngineView 
            decisions={decisions} 
            onApprove={handleApprove} 
            onReject={handleReject}
            onLog={handleLog}
            onRefresh={fetchAIRecommendations}
            isLoading={isRecommending}
          />
        );
      case 23: // Agent 실행 이력 (Override Logs)
        return <OverrideLogView logs={overrideLogs} />;
      case 31: // 슈퍼바이저 센터
        return <SupervisorCenterView isTourMode={isTourMode} tourScenarioIdx={tourScenarioIdx} />;
      default:
        return (
          <ModuleDetailView 
            item={selectedMenu} 
            sensorData={sensorData} 
            isTourMode={isTourMode}
            tourScenarioIdx={tourScenarioIdx}
          />
        );
    }
  };

  const handleExpoStart = (scenarioIdx: number) => {
    setShowExpoLanding(false);
    setIsExpoInteractiveMode(true);
    setTourScenarioIdx(scenarioIdx);
    setTourStep(0);
    setIsTourMode(true);
    setExpoScore(0);
    setExpoApprovedCount(0);
    setExpoRejectedCount(0);
    setExpoEventsTriggered(0);
    setExpoScoreHistory([]);
    const firstStepMenu = MENU_ITEMS.find(m => m.id === TOUR_SCENARIOS[scenarioIdx].steps[0].targetMenuId);
    if (firstStepMenu) setSelectedMenu(firstStepMenu);
    setIsTourOrchestrationOpen(false);
    const specific = SCENARIO_SPECIFIC_DECISIONS[scenarioIdx];
    if (specific) {
      setDecisions(specific.map(d => ({ ...d, timestamp: new Date().toISOString(), status: 'pending' as const })));
    }
  };

  const handleExpoReset = () => {
    setExpoScore(0);
    setExpoApprovedCount(0);
    setExpoRejectedCount(0);
    setExpoEventsTriggered(0);
    setExpoScoreHistory([]);
    const specific = SCENARIO_SPECIFIC_DECISIONS[tourScenarioIdx];
    if (specific) {
      setDecisions(specific.map(d => ({ ...d, timestamp: new Date().toISOString(), status: 'pending' as const })));
    }
  };

  const handleExpoNewScenario = () => {
    setShowExpoLanding(true);
    setIsExpoInteractiveMode(false);
    setIsTourMode(false);
    setIsTourOrchestrationOpen(false);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-bg text-text-primary">
      {/* Expo Landing Screen */}
      <AnimatePresence>
        {showExpoLanding && (
          <ExpoLanding
            onStart={handleExpoStart}
            onSkip={() => {
              setShowExpoLanding(false);
              setIsExpoInteractiveMode(false);
            }}
          />
        )}
      </AnimatePresence>
      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? 280 : 0, opacity: isSidebarOpen ? 1 : 0 }}
        className="border-r border-border bg-surface/50 backdrop-blur-xl flex flex-col overflow-hidden"
      >
        <div className="p-6 border-b border-border flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center shadow-lg shadow-accent/20">
            <Factory className="text-white" size={24} />
          </div>
          <div className="overflow-hidden whitespace-nowrap">
            <h1 className="font-bold text-lg tracking-tight">IMPIX AI</h1>
            <p className="text-xs text-text-secondary font-mono">ORCHESTRATION</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
          {CATEGORIES.map(category => (
            <div key={category} className="space-y-1">
              <h2 className="px-3 text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-2">
                {category}
              </h2>
              {MENU_ITEMS.filter(item => item.category === category).map(item => (
                <button
                  key={item.id}
                  onClick={() => {
                    setSelectedMenu(item);
                  }}
                  className={cn(
                    "sidebar-item w-full text-left text-sm",
                    selectedMenu.id === item.id && "sidebar-item-active"
                  )}
                >
                  <ChevronRight size={14} className={cn("transition-transform", selectedMenu.id === item.id && "rotate-90")} />
                  <span className="truncate">{item.name}</span>
                </button>
              ))}
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-border bg-surface/30">
          <div className="flex items-center gap-3 p-2 rounded-lg bg-white/5">
            <div className="w-8 h-8 rounded-full bg-surface-hover flex items-center justify-center">
              <User size={16} className="text-text-secondary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">oddeye2796@gmail.com</p>
              <p className="text-[10px] text-text-secondary">Administrator</p>
            </div>
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Header */}
        <header className="h-16 border-b border-border bg-surface/30 backdrop-blur-md flex items-center justify-between px-6 z-10">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 rounded-lg hover:bg-surface-hover transition-colors"
            >
              {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div className="h-4 w-[1px] bg-border" />
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-secondary">{selectedMenu.category}</span>
              <ChevronRight size={12} className="text-text-secondary" />
              <span className="text-sm font-medium">{selectedMenu.name}</span>
            </div>
            
            <div className="h-4 w-[1px] bg-border" />
            
            {!isTourMode ? (
              <button
                onClick={() => {
                  setIsTourMode(true);
                  setTourStep(0);
                  const firstStepMenu = MENU_ITEMS.find(m => m.id === TOUR_SCENARIOS[tourScenarioIdx].steps[0].targetMenuId);
                  if (firstStepMenu) setSelectedMenu(firstStepMenu);
                  setIsTourOrchestrationOpen(false);
                }}
                className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-bg text-[10px] md:text-xs font-black rounded-full flex items-center gap-1.5 shadow-lg shadow-orange-500/10 border border-orange-400/30 animate-pulse transition-all active:scale-95 cursor-pointer"
                id="btn-start-expo-tour"
              >
                <Sparkles size={11} />
                <span>엑스포 셀프 시연 가이드 시작</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  setIsTourMode(false);
                  setIsTourOrchestrationOpen(false);
                }}
                className="px-3 py-1 bg-accent/20 hover:bg-accent/30 border border-accent/40 rounded-full text-[10px] text-accent font-bold animate-pulse flex items-center gap-1.5 cursor-pointer"
                id="btn-active-expo-tour"
                title="시연 가이드 종료"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-ping" />
                <span>셀프 시연 가이드 가동 중 (종료하려면 클릭)</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-4">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
              <input 
                type="text" 
                placeholder="Search metrics, agents, logs..." 
                className="bg-surface border border-border rounded-full py-1.5 pl-10 pr-4 text-xs w-64 focus:outline-none focus:border-accent transition-colors"
              />
            </div>
            <button className="p-2 rounded-lg hover:bg-surface-hover relative">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-danger rounded-full border-2 border-bg" />
            </button>
            <button className="p-2 rounded-lg hover:bg-surface-hover">
              <Settings size={20} />
            </button>
          </div>
        </header>

        {/* Dynamic Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {renderContent()}
        </div>

      {/* Chatbot Toggle Button */}
        <button 
          onClick={() => setIsChatOpen(!isChatOpen)}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-accent text-white shadow-2xl shadow-accent/40 flex items-center justify-center hover:scale-110 transition-transform z-50"
        >
          {isChatOpen ? <X size={24} /> : <MessageSquare size={24} />}
        </button>

        {/* Chatbot Panel */}
        <AnimatePresence>
          {isChatOpen && (
            <motion.div 
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="fixed bottom-24 right-6 w-96 h-[500px] bg-surface border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden z-50"
            >
              <div className="p-4 border-b border-border bg-accent/10 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
                  <Cpu size={18} className="text-white" />
                </div>
                <div>
                  <h4 className="text-sm font-bold">AI Supervisor</h4>
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />
                    <span className="text-[10px] text-text-secondary">Online & Ready</span>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {chatMessages.map((msg, idx) => (
                  <div key={idx} className={cn(
                    "flex flex-col max-w-[85%]",
                    msg.role === 'user' ? "ml-auto items-end" : "items-start"
                  )}>
                    <div className={cn(
                      "p-3 rounded-2xl text-xs leading-relaxed",
                      msg.role === 'user' ? "bg-accent text-white rounded-tr-none" : "bg-surface-hover text-text-primary rounded-tl-none"
                    )}>
                      {msg.content}
                    </div>
                    <span className="text-[9px] text-text-secondary mt-1 px-1">{msg.timestamp}</span>
                  </div>
                ))}
                {isChatLoading && (
                  <div className="flex items-start gap-2">
                    <div className="bg-surface-hover p-3 rounded-2xl rounded-tl-none">
                      <Loader2 size={16} className="animate-spin text-accent" />
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <div className="p-4 border-t border-border bg-surface/50">
                <div className="relative">
                  <input 
                    type="text" 
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Ask anything about the factory..." 
                    className="w-full bg-bg border border-border rounded-xl py-2 pl-4 pr-10 text-xs focus:outline-none focus:border-accent transition-colors"
                  />
                  <button 
                    onClick={handleSendMessage}
                    disabled={isChatLoading || !chatInput.trim()}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-accent hover:text-accent-hover disabled:opacity-50"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* EXPO Guided Tour Floating Panel */}
        <AnimatePresence>
          {isTourMode && (() => {
            const currentSteps = TOUR_SCENARIOS[tourScenarioIdx].steps;
            const currentStepData = currentSteps[tourStep];
            if (!currentStepData) return null;

            return (
              <motion.div
                initial={{ opacity: 0, x: -50, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -50, scale: 0.95 }}
                className="fixed bottom-6 left-6 w-[350px] md:w-[420px] bg-surface/95 border-2 border-amber-500/40 rounded-2xl shadow-[0_20px_50px_rgba(245,158,11,0.15)] backdrop-blur-xl p-5 z-40 flex flex-col gap-4 text-text-primary animate-fade-in"
              >
                {/* Tour Header */}
                <div className="flex items-center justify-between border-b border-border/80 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded bg-amber-500/20 text-amber-500 flex items-center justify-center animate-pulse">
                      <Sparkles size={14} />
                    </div>
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-wider text-amber-500 font-sans">AI EXPO 2026</h3>
                      <p className="text-[9px] text-text-secondary font-mono">SELF-GUIDED DEMO TOUR</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setIsTourMode(false);
                      setIsTourOrchestrationOpen(false);
                    }}
                    className="p-1 rounded-md hover:bg-surface-hover text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                    title="투어 종료"
                  >
                    <X size={14} />
                  </button>
                </div>

                {/* Scenario Selector */}
                <div className="space-y-1.5 bg-amber-500/5 p-2 rounded-xl border border-amber-500/10">
                  <span className="text-[9px] font-black uppercase text-amber-500 tracking-wider block mb-1">
                    🔥 실습 시나리오 테마 선택 (체험 변경)
                  </span>
                  <div className="grid grid-cols-4 gap-1">
                    {TOUR_SCENARIOS.map((item, idx) => {
                      const icons = ["⚡", "🛡️", "🌿", "🎯"];
                      const labels = ["생산 극대화", "돌발 예방", "저에너지 피크", "러시오더 품질"];
                      return (
                        <button
                          key={idx}
                          onClick={() => {
                            setTourScenarioIdx(idx);
                            setTourStep(0);
                            const targetMenuId = TOUR_SCENARIOS[idx].steps[0].targetMenuId;
                            const targetMenu = MENU_ITEMS.find(m => m.id === targetMenuId);
                            if (targetMenu) setSelectedMenu(targetMenu);
                            setIsTourOrchestrationOpen(false);
                          }}
                          className={cn(
                            "py-1 px-1 text-[10px] rounded-lg font-black transition-all flex flex-col items-center justify-center gap-0.5 border text-center cursor-pointer",
                            tourScenarioIdx === idx
                              ? "bg-gradient-to-r from-amber-500 to-orange-500 text-bg border-transparent shadow shadow-orange-500/25"
                              : "bg-surface border-border hover:bg-surface-hover text-text-secondary hover:text-text-primary"
                          )}
                          title={item.name}
                        >
                          <span className="text-[12px]">{icons[idx]}</span>
                          <span className="scale-[0.9] block leading-none">{labels[idx]}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-1.5 px-0.5 border-t border-amber-500/10 pt-1.5">
                    <p className="text-[10px] text-text-secondary leading-tight">
                      <span className="font-bold text-amber-400">테마 개요:</span>{" "}
                      {TOUR_SCENARIOS[tourScenarioIdx].description}
                    </p>
                  </div>
                </div>

                {/* Progress Stepper pills */}
                <div className="flex items-center justify-between gap-1.5 px-0.5">
                  {currentSteps.map((step, idx) => (
                    <button
                      key={step.stepId}
                      onClick={() => {
                        setTourStep(idx);
                        const targetMenu = MENU_ITEMS.find(m => m.id === step.targetMenuId);
                        if (targetMenu) setSelectedMenu(targetMenu);
                        if (idx !== 3) setIsTourOrchestrationOpen(false);
                      }}
                      className={cn(
                        "flex-1 h-1.5 rounded-full transition-all cursor-pointer",
                        idx <= tourStep 
                          ? "bg-gradient-to-r from-amber-500 to-orange-500" 
                          : "bg-surface-hover border border-border"
                      )}
                      title={`${idx + 1}단계로 이동`}
                    />
                  ))}
                </div>

                {/* Active Step Content */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-black tracking-tight">
                      {currentStepData.badge}
                    </span>
                    <span className="text-[9px] font-mono text-text-secondary">
                      {tourStep + 1} / {currentSteps.length} Steps
                    </span>
                  </div>

                  <h4 className="text-sm font-black text-text-primary flex items-center gap-1.5">
                    <BookOpen size={14} className="text-amber-500" />
                    {currentStepData.title}
                  </h4>

                  <p className="text-xs text-text-secondary leading-relaxed bg-bg/50 p-3 rounded-xl border border-border">
                    {currentStepData.explanation}
                  </p>

                  {/* Highlight Action Banner */}
                  {(() => {
                    const items = currentStepData.checklist || [];
                    const key = `${tourScenarioIdx}_${tourStep}`;
                    const allCleared = items.length > 0 && (tourChecklistState[key] || []).every(item => item === true);
                    return allCleared ? (
                      <motion.div 
                        initial={{ scale: 0.95 }}
                        animate={{ scale: 1 }}
                        className="bg-emerald-500/15 border-2 border-emerald-500/40 rounded-xl p-3 text-xs leading-normal shadow-lg shadow-emerald-500/5"
                      >
                        <div className="font-bold text-emerald-400 mb-1 flex items-center gap-1.5 animate-pulse">
                          🎉 실습 미션 통과 완료!
                        </div>
                        <span className="text-text-primary font-medium">축하합니다! 이 단계의 실습 미션과 모니터링 체크리스트가 성공적으로 검증되었습니다. 다음으로 전진하세요!</span>
                      </motion.div>
                    ) : (
                      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-xs leading-normal">
                        <div className="font-bold text-amber-400 mb-1 flex items-center gap-1">
                          🎯 관람객 실습 미션
                        </div>
                        <span className="text-text-primary font-medium">{currentStepData.highlightAction}</span>
                      </div>
                    );
                  })()}

                  {/* Checklist */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-text-secondary tracking-widest block">실시간 모니터링 체크리스트</span>
                      <button
                        onClick={() => {
                          const key = `${tourScenarioIdx}_${tourStep}`;
                          setTourChecklistState(prev => ({
                            ...prev,
                            [key]: (currentStepData.checklist || []).map(() => true)
                          }));
                        }}
                        className="text-[9px] text-amber-500 hover:text-amber-400 font-bold transition-all px-1.5 py-0.5"
                      >
                        모두 완료
                      </button>
                    </div>
                    <div className="space-y-1 bg-surface-hover/50 p-2 rounded-lg border border-border/50 text-[11px]">
                      {(currentStepData.checklist || []).map((item, id) => {
                        const key = `${tourScenarioIdx}_${tourStep}`;
                        const isChecked = tourChecklistState[key]?.[id] || false;
                        return (
                          <button
                            key={id}
                            onClick={() => handleChecklistClick(tourStep, id)}
                            className={cn(
                              "w-full text-left flex items-start gap-2 py-1 px-1.5 rounded transition-all group cursor-pointer",
                              isChecked ? "text-text-primary/70 bg-white/2" : "text-text-secondary hover:bg-white/5"
                            )}
                          >
                            <div className={cn(
                              "mt-0.5 w-3.5 h-3.5 rounded border flex items-center justify-center transition-all shrink-0",
                              isChecked 
                                ? "bg-emerald-500 border-emerald-500 text-bg" 
                                : "border-text-secondary/40 group-hover:border-amber-500/50"
                            )}>
                              {isChecked && <Check size={10} strokeWidth={3} />}
                            </div>
                            <span className={isChecked ? "line-through opacity-70" : ""}>{item}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Action Steppers */}
                <div className="flex items-center gap-2 pt-2 border-t border-border/80">
                  <button
                    onClick={() => {
                      const prevStep = Math.max(0, tourStep - 1);
                      setTourStep(prevStep);
                      const targetMenu = MENU_ITEMS.find(m => m.id === currentSteps[prevStep].targetMenuId);
                      if (targetMenu) setSelectedMenu(targetMenu);
                      setIsTourOrchestrationOpen(false);
                    }}
                    disabled={tourStep === 0}
                    className="flex-1 py-1.5 rounded-xl text-xs font-bold border border-border bg-surface hover:bg-surface-hover disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center justify-center gap-1 cursor-pointer font-sans"
                  >
                    ◀ 이전
                  </button>

                  {tourStep === 3 ? (
                    <button
                      onClick={() => {
                        setIsTourOrchestrationOpen(true);
                      }}
                      className="flex-[1.5] py-2 px-3 bg-gradient-to-r from-red-500 to-amber-500 hover:from-red-600 hover:to-amber-600 text-bg text-xs font-black rounded-xl shadow-lg shadow-red-500/10 border border-red-400/20 animate-bounce transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      ⚡ 라이브 토론 실행
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        const targetMenu = MENU_ITEMS.find(m => m.id === currentStepData.targetMenuId);
                        if (targetMenu) setSelectedMenu(targetMenu);
                      }}
                      className="flex-1 py-1.5 px-2 border border-amber-500/30 text-amber-400 bg-amber-500/5 hover:bg-amber-500/10 rounded-xl text-xs font-bold transition-all cursor-pointer text-center"
                    >
                      화면 이동
                    </button>
                  )}

                  <button
                    onClick={() => {
                      if (tourStep < currentSteps.length - 1) {
                        const nextStep = tourStep + 1;
                        setTourStep(nextStep);
                        const targetMenu = MENU_ITEMS.find(m => m.id === currentSteps[nextStep].targetMenuId);
                        if (targetMenu) setSelectedMenu(targetMenu);
                        if (nextStep !== 3) setIsTourOrchestrationOpen(false);
                      } else {
                        setIsTourMode(false);
                        setIsTourOrchestrationOpen(false);
                      }
                    }}
                    className="flex-1 py-1.5 rounded-xl text-xs font-bold bg-accent hover:bg-accent-hover text-bg transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    {tourStep === currentSteps.length - 1 ? "종료 [닫기]" : "다음 ▶"}
                  </button>
                </div>
              </motion.div>
            );
          })()}
        </AnimatePresence>

        {/* Global Orchestration Center Modal for Tour Mode */}
        <OrchestrationCenterModal 
          isOpen={isTourOrchestrationOpen} 
          onClose={() => setIsTourOrchestrationOpen(false)} 
        />

        {/* Expo Interactive Sidebar */}
        {isExpoInteractiveMode && (
          <ExpoSidebar
            scenarioIdx={tourScenarioIdx}
            score={expoScore}
            approvedCount={expoApprovedCount}
            rejectedCount={expoRejectedCount}
            eventsTriggered={expoEventsTriggered}
            scoreHistory={expoScoreHistory}
            onEventTriggered={(eventId) => {
              setExpoEventsTriggered(prev => prev + 1);
            }}
            onScoreUpdate={(delta) => {
              setExpoScore(prev => prev + delta);
              setExpoScoreHistory(prev => [{
                id: Math.random().toString(36).substr(2, 9),
                label: '이벤트 대응 완료',
                type: 'event',
                points: delta,
                timestamp: new Date()
              }, ...prev]);
            }}
            onReset={handleExpoReset}
            onNewScenario={handleExpoNewScenario}
            onClose={() => {
              setIsExpoInteractiveMode(false);
              setIsTourMode(false);
              setIsTourOrchestrationOpen(false);
            }}
          />
        )}
      </main>
    </div>
  );
}

function DetailItem({ label, content, icon }: { label: string, content?: string, icon: React.ReactNode }) {
  if (!content) return null;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 text-[10px] font-bold text-accent uppercase tracking-wider">
        {icon}
        {label}
      </div>
      <p className="text-sm text-text-primary leading-relaxed bg-surface/50 p-3 rounded-lg border border-border/50">
        {content}
      </p>
    </div>
  );
}

function StatCard({ title, value, trend, icon, onClick }: { title: string, value: string, trend: string, icon: React.ReactNode, onClick?: () => void }) {
  const isPositive = trend.startsWith('+') || trend === 'Stable';
  return (
    <motion.div 
      whileHover={onClick ? { scale: 1.02, translateY: -2 } : {}}
      whileTap={onClick ? { scale: 0.98 } : {}}
      onClick={onClick}
      className={cn(
        "dashboard-card flex items-center gap-4 transition-all",
        onClick && "cursor-pointer hover:border-accent/50 hover:shadow-lg hover:shadow-accent/5"
      )}
    >
      <div className="w-12 h-12 rounded-xl bg-surface-hover flex items-center justify-center">
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">{title}</p>
        <div className="flex items-baseline gap-2">
          <h4 className="text-xl font-bold">{value}</h4>
          <span className={cn(
            "text-[10px] font-bold",
            isPositive ? "text-accent" : "text-danger"
          )}>
            {trend}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

function HealthRow({ label, status, latency }: { label: string, status: 'online' | 'warning' | 'offline', latency: string }) {
  return (
    <div className="flex items-center justify-between p-2 rounded-lg hover:bg-surface-hover transition-colors group">
      <div className="flex items-center gap-3">
        <div className={cn(
          "w-2 h-2 rounded-full",
          status === 'online' ? "bg-accent shadow-[0_0_8px_rgba(16,185,129,0.5)]" : 
          status === 'warning' ? "bg-warning shadow-[0_0_8px_rgba(245,158,11,0.5)]" : 
          "bg-danger shadow-[0_0_8px_rgba(239,68,68,0.5)]"
        )} />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-[10px] font-mono text-text-secondary group-hover:text-text-primary transition-colors">{latency}</span>
        <div className="h-1 w-12 bg-border rounded-full overflow-hidden">
          <div className={cn(
            "h-full transition-all duration-1000",
            status === 'online' ? "w-full bg-accent" : 
            status === 'warning' ? "w-2/3 bg-warning" : 
            "w-0 bg-danger"
          )} />
        </div>
      </div>
    </div>
  );
}

function RULPredictionView({ 
  isTourMode = false, 
  tourScenarioIdx = 0 
}: { 
  isTourMode?: boolean; 
  tourScenarioIdx?: number; 
}) {
  const [created, setCreated] = useState(false);

  useEffect(() => {
    // Auto check Step 2 checklist items when the view is mounted
    window.dispatchEvent(new CustomEvent('tour-action', { detail: { step: 1, checklistIdx: 0 } }));
    window.dispatchEvent(new CustomEvent('tour-action', { detail: { step: 1, checklistIdx: 1 } }));
  }, []);

  const handleCreateOrder = () => {
    setCreated(true);
    // Reinforce tour step checks on action
    window.dispatchEvent(new CustomEvent('tour-action', { detail: { step: 1, checklistIdx: 0 } }));
    window.dispatchEvent(new CustomEvent('tour-action', { detail: { step: 1, checklistIdx: 1 } }));
    setTimeout(() => {
      setCreated(false);
    }, 3000);
  };

  const getScenarioData = () => {
    if (!isTourMode) {
      return {
        unit: 'Days',
        rul: 14,
        confidence: '92.4%',
        machinery: '수축포장기-01',
        warning: 'Vibration patterns indicate bearing wear. Schedule inspection within the next 7 days to prevent unplanned downtime.',
        chartData: [
          { name: 'Day 1', health: 100, threshold: 20 },
          { name: 'Day 5', health: 95, threshold: 20 },
          { name: 'Day 10', health: 88, threshold: 20 },
          { name: 'Day 15', health: 82, threshold: 20 },
          { name: 'Day 20', health: 75, threshold: 20 },
          { name: 'Day 25', health: 65, threshold: 20 },
          { name: 'Day 30', health: 58, threshold: 20 },
          { name: 'Day 35', health: 45, threshold: 20 },
          { name: 'Day 40', health: 32, threshold: 20 },
        ]
      };
    }

    switch (tourScenarioIdx) {
      case 1: // Scenario B
        return {
          unit: 'Hours',
          rul: 42,
          confidence: '98.1%',
          machinery: '가열 공조 모터-03',
          warning: '공조 배기 제어 부하 및 가스 누출 인근 고열화 징후가 증폭되었습니다. 밸브 및 기기 마찰 축 손실을 사전에 차단하기 위한 정비 팀 급파 예약을 발행하세요.',
          chartData: [
            { name: 'Hour 1', health: 100, threshold: 20 },
            { name: 'Hour 8', health: 91, threshold: 20 },
            { name: 'Hour 16', health: 83, threshold: 20 },
            { name: 'Hour 24', health: 64, threshold: 20 },
            { name: 'Hour 32', health: 48, threshold: 20 },
            { name: 'Hour 40', health: 29, threshold: 20 },
            { name: 'Hour 48', health: 18, threshold: 20 },
          ]
        };
      case 2: // Scenario C
        return {
          unit: 'Hours',
          rul: 29,
          confidence: '96.5%',
          machinery: '칠러 냉각 펌프-01B',
          warning: '계약 전력 피크 셰이빙 연동 백업 운전으로 기온/열부하가 급증하였습니다. 29시간 이내에 보완 임계 모터 검진 및 배기 펌프 보전을 실시간 접수하는 것을 강력 권장합니다.',
          chartData: [
            { name: 'Hour 1', health: 100, threshold: 20 },
            { name: 'Hour 8', health: 89, threshold: 20 },
            { name: 'Hour 16', health: 77, threshold: 20 },
            { name: 'Hour 24', health: 59, threshold: 20 },
            { name: 'Hour 32', health: 41, threshold: 20 },
            { name: 'Hour 40', health: 26, threshold: 20 },
            { name: 'Hour 48', health: 15, threshold: 20 },
          ]
        };
      case 3: // Scenario D
        return {
          unit: 'Hours',
          rul: 53,
          confidence: '97.8%',
          machinery: '패키징 주동 기어-02',
          warning: '긴급 오더에 따른 120% 초속 가속 가동 충격으로 유성 기어 마찰 과열 진동이 임계치를 급박하게 침범하는 중입니다. 납량 완료 즉시 가동 정지를 통한 검수를 미리 신청해 두십시오.',
          chartData: [
            { name: 'Hour 1', health: 100, threshold: 20 },
            { name: 'Hour 8', health: 93, threshold: 20 },
            { name: 'Hour 16', health: 85, threshold: 20 },
            { name: 'Hour 24', health: 71, threshold: 20 },
            { name: 'Hour 32', health: 52, threshold: 20 },
            { name: 'Hour 40', health: 34, threshold: 20 },
            { name: 'Hour 48', health: 19, threshold: 20 },
          ]
        };
      case 0:
      default:
        return {
          unit: 'Days',
          rul: 14,
          confidence: '92.4%',
          machinery: '수축포장기-01',
          warning: 'Vibration patterns indicate bearing wear. Schedule inspection within the next 7 days to prevent unplanned downtime.',
          chartData: [
            { name: 'Day 1', health: 100, threshold: 20 },
            { name: 'Day 5', health: 95, threshold: 20 },
            { name: 'Day 10', health: 88, threshold: 20 },
            { name: 'Day 15', health: 82, threshold: 20 },
            { name: 'Day 20', health: 75, threshold: 20 },
            { name: 'Day 25', health: 65, threshold: 20 },
            { name: 'Day 30', health: 58, threshold: 20 },
            { name: 'Day 35', health: 45, threshold: 20 },
            { name: 'Day 40', health: 32, threshold: 20 },
          ]
        };
    }
  };

  const sData = getScenarioData();
  const data = sData.chartData;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">RUL Prediction</h2>
          <p className="text-sm text-text-secondary">Remaining Useful Life estimation for critical machinery</p>
        </div>
        <div className="flex gap-3">
          <select value={sData.machinery} onChange={() => {}} className="bg-surface border border-border rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:border-accent">
            <option value={sData.machinery}>{sData.machinery}</option>
            <option value="컨베이어-04">컨베이어-04</option>
            <option value="로봇팔-02">로봇팔-02</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 dashboard-card h-[400px]">
          <h3 className="font-bold mb-6">Health Degradation Curve</h3>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                itemStyle={{ color: '#f8fafc', fontSize: '12px' }}
              />
              <Line type="monotone" dataKey="health" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }} />
              <Line type="monotone" dataKey="threshold" stroke="#ef4444" strokeDasharray="5 5" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-4">
          <div className="dashboard-card bg-accent/5 border-accent/20 text-center py-8">
            <p className="text-xs font-bold text-accent uppercase tracking-widest mb-2">Estimated RUL</p>
            <h4 className="text-5xl font-black text-white mb-2">{sData.rul} <span className="text-xl font-normal text-text-secondary">{sData.unit}</span></h4>
            <p className="text-[10px] text-text-secondary">Confidence: {sData.confidence}</p>
          </div>
          
          <div className="dashboard-card">
            <h4 className="text-xs font-bold uppercase mb-4">Maintenance Recommendation</h4>
            <div className="p-3 rounded-lg bg-warning/10 border border-warning/20">
              <p className="text-xs text-warning leading-relaxed">
                {sData.warning}
              </p>
            </div>
            <button 
              onClick={handleCreateOrder}
              className={cn(
                "w-full mt-4 py-2 text-bg rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5",
                created ? "bg-emerald-500 hover:bg-emerald-600 text-white" : "bg-accent hover:opacity-90"
              )}
            >
              {created ? <Check size={14} className="stroke-[3px]" /> : null}
              {created ? "Work Order Created! (현장 접수 완료)" : "Create Work Order"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function WorkOrderView() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Maintenance Work Orders</h2>
          <p className="text-sm text-text-secondary">Manage and track maintenance tasks across the facility</p>
        </div>
        <button className="px-4 py-2 bg-accent text-bg rounded-lg text-xs font-bold flex items-center gap-2 hover:opacity-90 transition-opacity">
          <Wrench size={14} /> New Order
        </button>
      </div>

      <div className="dashboard-card overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border bg-surface-hover/50">
              <th className="px-4 py-3 text-[10px] font-bold text-text-secondary uppercase tracking-wider">ID</th>
              <th className="px-4 py-3 text-[10px] font-bold text-text-secondary uppercase tracking-wider">Asset</th>
              <th className="px-4 py-3 text-[10px] font-bold text-text-secondary uppercase tracking-wider">Type</th>
              <th className="px-4 py-3 text-[10px] font-bold text-text-secondary uppercase tracking-wider">Priority</th>
              <th className="px-4 py-3 text-[10px] font-bold text-text-secondary uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-[10px] font-bold text-text-secondary uppercase tracking-wider">Assigned To</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {[
              { id: 'WO-2024-001', asset: '수축포장기-01', type: 'Preventive', priority: 'Medium', status: 'In Progress', user: 'Kim Tech' },
              { id: 'WO-2024-002', asset: '로봇팔-02', type: 'Corrective', priority: 'High', status: 'Pending', user: 'Lee Eng' },
              { id: 'WO-2024-003', asset: '컨베이어-04', type: 'Inspection', priority: 'Low', status: 'Completed', user: 'Park Maint' },
              { id: 'WO-2024-004', asset: '모터-08', type: 'Corrective', priority: 'Urgent', status: 'Pending', user: 'Choi Tech' },
            ].map((order, i) => (
              <tr key={i} className="hover:bg-surface-hover transition-colors">
                <td className="px-4 py-4 text-xs font-mono text-accent">{order.id}</td>
                <td className="px-4 py-4 text-xs font-medium">{order.asset}</td>
                <td className="px-4 py-4 text-xs text-text-secondary">{order.type}</td>
                <td className="px-4 py-4">
                  <span className={cn(
                    "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase",
                    order.priority === 'Urgent' ? "bg-danger/10 text-danger" : 
                    order.priority === 'High' ? "bg-warning/10 text-warning" : 
                    "bg-accent/10 text-accent"
                  )}>
                    {order.priority}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <span className="text-xs">{order.status}</span>
                </td>
                <td className="px-4 py-4 text-xs text-text-secondary">{order.user}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RecommendationEngineView({ decisions, onApprove, onReject, onLog, onRefresh, isLoading }: { 
  decisions: AgentDecision[], 
  onApprove: (i: number, val?: string | number, notes?: string) => void, 
  onReject: (i: number, notes?: string) => void,
  onLog: (i: number) => void,
  onRefresh: () => void,
  isLoading: boolean
}) {
  const [adjustingIdx, setAdjustingIdx] = useState<number | null>(null);
  const [adjValue, setAdjValue] = useState<string>('');
  const [adjNotes, setAdjNotes] = useState<string>('');

  const startAdjusting = (idx: number, currentVal: string | number) => {
    setAdjustingIdx(idx);
    setAdjValue(currentVal.toString());
    setAdjNotes('');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">AI Recommendation Engine</h2>
          <p className="text-sm text-text-secondary">Actionable insights generated by multi-agent analysis</p>
        </div>
        <button 
          onClick={onRefresh}
          disabled={isLoading}
          className="px-4 py-2 bg-accent text-bg rounded-lg text-xs font-bold flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
          Refresh Insights
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {decisions.length === 0 ? (
          <div className="dashboard-card text-center py-20">
            <p className="text-text-secondary">No recommendations available. Click refresh to generate insights.</p>
          </div>
        ) : (
          decisions.map((decision, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={cn(
                "dashboard-card border-l-4",
                decision.level === 3 ? "border-l-danger" : decision.level === 2 ? "border-l-warning" : "border-l-accent"
              )}
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="px-2 py-0.5 rounded bg-white/5 text-[10px] font-bold text-accent uppercase tracking-wider">
                      {decision.agent}
                    </span>
                    <span className="text-[10px] text-text-secondary font-mono">
                      {new Date(decision.timestamp).toLocaleString()}
                    </span>
                    {decision.status !== 'pending' && (
                      <span className={cn(
                        "text-[10px] font-bold uppercase px-2 py-0.5 rounded",
                        decision.status === 'approved' ? "bg-accent/20 text-accent" : "bg-danger/20 text-danger"
                      )}>
                        {decision.status}
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
                    {decision.action.replace('_', ' ').toUpperCase()}
                    <ChevronRight size={16} className="text-text-secondary" />
                    <span className="text-accent">{decision.target_equipment}</span>
                  </h3>
                  <p className="text-sm text-text-secondary leading-relaxed max-w-3xl">
                    {decision.reasoning}
                  </p>
                  
                  {decision.operator_notes && (
                    <div className="mt-3 p-2 bg-white/5 rounded border border-white/10 italic text-xs text-text-secondary">
                      <span className="font-bold text-accent not-italic mr-2">Operator Note:</span>
                      {decision.operator_notes}
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap items-center gap-6">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-text-secondary uppercase font-bold">Recommended:</span>
                      <span className="text-xs font-mono bg-white/5 px-2 py-1 rounded">{decision.recommended_value}</span>
                    </div>
                    {decision.adjusted_value && (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-text-secondary uppercase font-bold">Adjusted:</span>
                        <span className="text-xs font-mono bg-accent/20 text-accent px-2 py-1 rounded">{decision.adjusted_value}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-text-secondary uppercase font-bold">Priority:</span>
                      <div className="flex gap-1">
                        {[1, 2, 3].map(l => (
                          <div key={l} className={cn(
                            "w-3 h-1 rounded-full",
                            l <= decision.level ? (decision.level === 3 ? "bg-danger" : decision.level === 2 ? "bg-warning" : "bg-accent") : "bg-white/10"
                          )} />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                
                {decision.status === 'pending' && (
                  <div className="flex flex-col gap-2 min-w-[200px]">
                    {adjustingIdx === idx ? (
                      <div className="space-y-3 p-3 bg-surface rounded-lg border border-accent/30">
                        <div>
                          <label className="text-[10px] font-bold text-text-secondary uppercase block mb-1">New Value</label>
                          <input 
                            type="text" 
                            value={adjValue}
                            onChange={(e) => setAdjValue(e.target.value)}
                            className="w-full bg-bg border border-border rounded px-2 py-1 text-xs focus:border-accent outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-text-secondary uppercase block mb-1">Adjustment Reason</label>
                          <textarea 
                            value={adjNotes}
                            onChange={(e) => setAdjNotes(e.target.value)}
                            className="w-full bg-bg border border-border rounded px-2 py-1 text-xs focus:border-accent outline-none h-16 resize-none"
                            placeholder="Why are you overriding?"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => {
                              onApprove(idx, adjValue, adjNotes);
                              setAdjustingIdx(null);
                            }}
                            className="flex-1 py-1.5 bg-accent text-bg text-[10px] font-bold rounded"
                          >
                            Confirm
                          </button>
                          <button 
                            onClick={() => setAdjustingIdx(null)}
                            className="flex-1 py-1.5 bg-surface border border-border text-[10px] font-bold rounded"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <button 
                          onClick={() => onApprove(idx)}
                          className="w-full py-2 bg-accent hover:bg-accent-hover text-bg text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                          <CheckCircle2 size={16} /> Approve
                        </button>
                        <button 
                          onClick={() => startAdjusting(idx, decision.recommended_value)}
                          className="w-full py-2 bg-surface border border-border hover:bg-surface-hover text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                          <Settings2 size={16} /> Adjust & Approve
                        </button>
                        <button 
                          onClick={() => {
                            const reason = prompt('Reason for rejection?');
                            if (reason !== null) onReject(idx, reason);
                          }}
                          className="w-full py-2 bg-surface border border-border hover:bg-danger/10 hover:border-danger/30 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                          <X size={16} /> Reject
                        </button>
                        <button 
                          onClick={() => onLog(idx)}
                          className="w-full py-2 bg-surface border border-border hover:bg-accent/10 hover:border-accent/30 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                          <ClipboardList size={16} /> Log to History
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}

function OverrideLogView({ logs }: { logs: OverrideLog[] }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Human-in-the-Loop Audit Logs</h2>
        <p className="text-sm text-text-secondary">History of AI adjustments and manual overrides</p>
      </div>

      <div className="dashboard-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-surface-hover/50">
                <th className="px-4 py-3 text-[10px] font-bold text-text-secondary uppercase tracking-wider">Timestamp</th>
                <th className="px-4 py-3 text-[10px] font-bold text-text-secondary uppercase tracking-wider">Operator</th>
                <th className="px-4 py-3 text-[10px] font-bold text-text-secondary uppercase tracking-wider">Equipment</th>
                <th className="px-4 py-3 text-[10px] font-bold text-text-secondary uppercase tracking-wider">Action</th>
                <th className="px-4 py-3 text-[10px] font-bold text-text-secondary uppercase tracking-wider">Values</th>
                <th className="px-4 py-3 text-[10px] font-bold text-text-secondary uppercase tracking-wider">Type</th>
                <th className="px-4 py-3 text-[10px] font-bold text-text-secondary uppercase tracking-wider">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-xs text-text-secondary italic">
                    No override logs recorded yet.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-surface-hover transition-colors">
                    <td className="px-4 py-4 text-[10px] font-mono whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-4 text-xs font-medium">{log.operator}</td>
                    <td className="px-4 py-4 text-xs">{log.equipment}</td>
                    <td className="px-4 py-4 text-xs font-mono text-accent">{log.parameter}</td>
                    <td className="px-4 py-4 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-text-secondary line-through">{log.original_value}</span>
                        <ChevronRight size={12} className="text-text-secondary" />
                        <span className={cn(
                          "font-bold",
                          log.new_value === 'REJECTED' ? "text-danger" : "text-accent"
                        )}>{log.new_value}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={cn(
                        "text-[9px] px-2 py-0.5 rounded-full font-bold uppercase",
                        log.type === 'manual_override' ? "bg-warning/10 text-warning" : "bg-accent/10 text-accent"
                      )}>
                        {log.type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-xs text-text-secondary max-w-xs truncate" title={log.reason}>
                      {log.reason}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function KpiDetailModal({ kpi, onClose }: { kpi: string, onClose: () => void }) {
  const kpiData: Record<string, any> = {
    'OEE': {
      title: 'Overall Equipment Effectiveness',
      icon: <Activity className="text-accent" />,
      description: '설비의 가동률, 성능, 품질을 종합적으로 나타내는 지표입니다.',
      metrics: [
        { label: 'Availability (가동률)', value: '92.5%', trend: '+1.2%', color: 'text-blue-400' },
        { label: 'Performance (성능)', value: '94.8%', trend: '+0.8%', color: 'text-purple-400' },
        { label: 'Quality (품질)', value: '98.7%', trend: '+0.1%', color: 'text-emerald-400' },
      ],
      chart: (
        <BarChart data={[
          { name: '가동률', value: 92.5 },
          { name: '성능', value: 94.8 },
          { name: '품질', value: 98.7 },
          { name: 'OEE', value: 84.2 },
        ]}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
          <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} />
          <YAxis stroke="#94a3b8" fontSize={10} domain={[0, 100]} />
          <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            <Cell fill="#60a5fa" />
            <Cell fill="#a78bfa" />
            <Cell fill="#34d399" />
            <Cell fill="#10b981" />
          </Bar>
        </BarChart>
      )
    },
    'Defect': {
      title: 'Defect Rate Analysis',
      icon: <ShieldAlert className="text-danger" />,
      description: '실시간 비전 검사 데이터를 기반으로 산출된 불량률 상세 분석입니다.',
      metrics: [
        { label: 'Critical Defects', value: '2건', trend: 'Stable', color: 'text-danger' },
        { label: 'Warning Defects', value: '15건', trend: '-3건', color: 'text-warning' },
        { label: 'Yield Rate', value: '98.76%', trend: '+0.5%', color: 'text-accent' },
      ],
      chart: (
        <LineChart data={[
          { time: '09:00', rate: 1.5 },
          { time: '10:00', rate: 1.2 },
          { time: '11:00', rate: 1.8 },
          { time: '12:00', rate: 1.1 },
          { time: '13:00', rate: 1.24 },
        ]}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
          <XAxis dataKey="time" stroke="#94a3b8" fontSize={10} />
          <YAxis stroke="#94a3b8" fontSize={10} />
          <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} />
          <Line type="monotone" dataKey="rate" stroke="#ef4444" strokeWidth={2} dot={{ r: 4, fill: '#ef4444' }} />
        </LineChart>
      )
    },
    'Energy': {
      title: 'Energy Consumption Detail',
      icon: <Zap className="text-warning" />,
      description: '공장 전체 및 개별 라인별 에너지 사용량 분석 데이터입니다.',
      metrics: [
        { label: 'Peak Load', value: '145 kW', trend: '14:20', color: 'text-orange-400' },
        { label: 'Avg Consumption', value: '102 kW/h', trend: '-5%', color: 'text-yellow-400' },
        { label: 'Cost Est.', value: '₩142,000', trend: 'Today', color: 'text-emerald-400' },
      ],
      chart: (
        <AreaChart data={[
          { time: '08:00', usage: 80 },
          { time: '10:00', usage: 120 },
          { time: '12:00', usage: 145 },
          { time: '14:00', usage: 110 },
          { time: '16:00', usage: 95 },
        ]}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
          <XAxis dataKey="time" stroke="#94a3b8" fontSize={10} />
          <YAxis stroke="#94a3b8" fontSize={10} />
          <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} />
          <Area type="monotone" dataKey="usage" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.2} />
        </AreaChart>
      )
    },
    'Agents': {
      title: 'Active AI Agents Status',
      icon: <Cpu className="text-indigo-400" />,
      description: '현재 오케스트레이션 레이어에서 작동 중인 에이전트들의 상태입니다.',
      metrics: [
        { label: 'Quality Agent', value: 'Active', trend: 'Load 12%', color: 'text-emerald-400' },
        { label: 'PM Agent', value: 'Active', trend: 'Load 45%', color: 'text-emerald-400' },
        { label: 'Safety Agent', value: 'Standby', trend: 'Load 2%', color: 'text-blue-400' },
      ],
      chart: (
        <PieChart>
          <Pie
            data={[
              { name: 'Active', value: 4 },
              { name: 'Standby', value: 2 },
            ]}
            cx="50%"
            cy="50%"
            innerRadius={40}
            outerRadius={60}
            paddingAngle={5}
            dataKey="value"
          >
            <Cell fill="#10b981" />
            <Cell fill="#3b82f6" />
          </Pie>
          <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} />
        </PieChart>
      )
    }
  };

  const data = kpiData[kpi];
  if (!data) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-2xl bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="p-6 border-b border-border flex items-center justify-between bg-surface-hover/30">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-bg flex items-center justify-center shadow-inner">
              {data.icon}
            </div>
            <div>
              <h3 className="text-xl font-bold">{data.title}</h3>
              <p className="text-xs text-text-secondary">{data.description}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-surface-hover transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {data.metrics.map((m: any, i: number) => (
            <div key={i} className="p-4 rounded-xl bg-bg border border-border/50">
              <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">{m.label}</p>
              <div className="flex items-baseline justify-between">
                <span className={cn("text-lg font-bold", m.color)}>{m.value}</span>
                <span className="text-[10px] font-mono text-text-secondary">{m.trend}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="px-6 pb-6">
          <div className="h-[240px] w-full bg-bg/30 rounded-xl border border-border/50 p-4">
            <ResponsiveContainer width="100%" height="100%">
              {data.chart}
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-4 bg-surface-hover/30 border-t border-border flex justify-end">
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-accent text-bg rounded-lg text-xs font-bold hover:opacity-90 transition-opacity"
          >
            확인
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function DashboardView({ 
  sensorData, 
  decisions, 
  fetchAIRecommendations, 
  isRecommending,
  handleApprove,
  handleReject
}: { 
  sensorData: SensorData[], 
  decisions: AgentDecision[], 
  fetchAIRecommendations: () => void,
  isRecommending: boolean,
  handleApprove: (i: number) => void,
  handleReject: (i: number) => void
}) {
  const [activeKpi, setActiveKpi] = useState<string | null>(null);

  useEffect(() => {
    // Auto check '최상단 KPI 카드 및 설비 가동 시간 차트 감상'
    window.dispatchEvent(new CustomEvent('tour-action', { detail: { step: 0, checklistIdx: 0 } }));
  }, []);

  return (
    <>
      <AnimatePresence>
        {activeKpi && (
          <KpiDetailModal kpi={activeKpi} onClose={() => setActiveKpi(null)} />
        )}
      </AnimatePresence>

      {/* Top Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Overall Equipment Effectiveness" 
          value="84.2%" 
          trend="+2.1%" 
          icon={<Activity className="text-accent" />} 
          onClick={() => setActiveKpi('OEE')}
        />
        <StatCard 
          title="Defect Rate" 
          value="1.24%" 
          trend="-0.5%" 
          icon={<ShieldAlert className="text-danger" />} 
          onClick={() => setActiveKpi('Defect')}
        />
        <StatCard 
          title="Energy Consumption" 
          value="1,240 kWh" 
          trend="-12%" 
          icon={<Zap className="text-warning" />} 
          onClick={() => setActiveKpi('Energy')}
        />
        <StatCard 
          title="Active Agents" 
          value="6 / 6" 
          trend="Stable" 
          icon={<Cpu className="text-indigo-400" />} 
          onClick={() => setActiveKpi('Agents')}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <div className="lg:col-span-2 dashboard-card flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold">Real-time Sensor Monitoring</h3>
              <p className="text-xs text-text-secondary">포장1라인 - 수축포장기-01</p>
            </div>
            <div className="flex gap-2">
              <button className="px-3 py-1 rounded-md bg-surface-hover text-[10px] font-bold uppercase tracking-wider">Vibration</button>
              <button className="px-3 py-1 rounded-md bg-accent/20 text-accent text-[10px] font-bold uppercase tracking-wider">Temperature</button>
            </div>
          </div>
          <div className="flex-1 h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sensorData}>
                <defs>
                  <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis 
                  dataKey="timestamp" 
                  stroke="#94a3b8" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false} 
                />
                <YAxis 
                  stroke="#94a3b8" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false} 
                  domain={['auto', 'auto']}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                  itemStyle={{ color: '#f8fafc', fontSize: '12px' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="temperature" 
                  stroke="#10b981" 
                  fillOpacity={1} 
                  fill="url(#colorTemp)" 
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI Recommendations */}
        <div className="dashboard-card flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold flex items-center gap-2">
              <AlertTriangle size={18} className="text-warning" />
              AI Recommendations
            </h3>
            <div className="flex gap-2">
              <button 
                onClick={fetchAIRecommendations}
                disabled={isRecommending}
                className="p-1 rounded hover:bg-surface-hover text-text-secondary disabled:opacity-50"
                title="Refresh AI Recommendations"
              >
                {isRecommending ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
              </button>
              <span className="bg-warning/10 text-warning text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">
                {decisions.filter(d => d.status === 'pending').length} Action Required
              </span>
            </div>
          </div>
          <div className="flex-1 space-y-4 overflow-y-auto custom-scrollbar pr-2">
            {decisions.map((decision, idx) => (
              <div key={idx} className={cn(
                "p-3 rounded-lg border transition-all",
                decision.status === 'pending' ? "bg-surface-hover border-border" : 
                decision.status === 'approved' ? "bg-accent/5 border-accent/20 opacity-60" : 
                "bg-danger/5 border-danger/20 opacity-60"
              )}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-accent uppercase tracking-wider">{decision.agent}</span>
                  <span className="text-[10px] text-text-secondary font-mono">{new Date(decision.timestamp).toLocaleTimeString()}</span>
                </div>
                <h4 className="text-sm font-bold mb-1">{decision.action.replace('_', ' ')}</h4>
                <p className="text-xs text-text-secondary leading-relaxed mb-3">
                  {decision.reasoning}
                </p>
                {decision.status === 'pending' && (
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleApprove(idx)}
                      className="flex-1 py-1.5 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-md transition-colors flex items-center justify-center gap-1"
                    >
                      <CheckCircle2 size={14} /> Approve
                    </button>
                    <button 
                      onClick={() => handleReject(idx)}
                      className="flex-1 py-1.5 bg-surface border border-border hover:bg-danger/10 hover:border-danger/30 text-xs font-bold rounded-md transition-colors flex items-center justify-center gap-1"
                    >
                      <X size={14} /> Reject
                    </button>
                  </div>
                )}
                {decision.status !== 'pending' && (
                  <div className={cn(
                    "text-[10px] font-bold uppercase flex items-center gap-1",
                    decision.status === 'approved' ? "text-accent" : "text-danger"
                  )}>
                    {decision.status === 'approved' ? <CheckCircle2 size={12} /> : <X size={12} />}
                    {decision.status}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Defect Rate Analysis */}
        <div className="dashboard-card">
          <h3 className="font-bold mb-6">Defect Rate by Category</h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { name: '찢김', value: 12 },
                { name: '기포', value: 8 },
                { name: '변색', value: 15 },
                { name: '라벨누락', value: 5 },
                { name: '기타', value: 3 },
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                  itemStyle={{ color: '#f8fafc', fontSize: '12px' }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {[0, 1, 2, 3, 4].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'][index]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* System Health */}
        <div className="dashboard-card">
          <h3 className="font-bold mb-6">System Health & Infrastructure</h3>
          <div className="space-y-4">
            <HealthRow label="vLLM Server" status="online" latency="45ms" />
            <HealthRow label="Kafka Message Bus" status="online" latency="12ms" />
            <HealthRow label="TimescaleDB" status="online" latency="8ms" />
            <HealthRow label="Anomalib Inference" status="online" latency="120ms" />
            <HealthRow label="Redis Cache" status="online" latency="2ms" />
            <HealthRow label="Neo4j Graph DB" status="warning" latency="450ms" />
          </div>
        </div>
      </div>
    </>
  );
}




const AgentAvatarIcon = ({ id, width = 48, height = 48, active = false }: { id: string, width?: number, height?: number, active?: boolean }) => {
  const getAgentColors = (agentId: string) => {
    switch (agentId) {
      case 'prod': return { helmetColor: '#3b82f6', vestColor: '#3b82f6' };
      case 'qual': return { helmetColor: '#10b981', vestColor: '#059669' };
      case 'pm': return { helmetColor: '#8b5cf6', vestColor: '#7c3aed' };
      case 'energy': return { helmetColor: '#f59e0b', vestColor: '#d97706' };
      case 'safety': return { helmetColor: '#ef4444', vestColor: '#dc2626' };
      case 'logistics': return { helmetColor: '#eab308', vestColor: '#ca8a04' };
      default: return { helmetColor: '#06b6d4', vestColor: '#0891b2' };
    }
  };

  const details = getAgentColors(id);
  const isSupervisor = id === 'supervisor';

  return (
    <svg 
      width={width} 
      height={height} 
      viewBox="0 0 100 100" 
      className={cn(
        "rounded-full transition-all duration-300 drop-shadow-md", 
        active ? "scale-110 ring-4 ring-cyan-400 ring-offset-2 ring-offset-[#f1f5f9] drop-shadow-[0_0_12px_rgba(6,182,212,0.6)]" : "opacity-95 hover:opacity-100 hover:scale-105"
      )}
    >
      <defs>
        <linearGradient id={`grad-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={isSupervisor ? '#00f0ff' : details.helmetColor} />
          <stop offset="100%" stopColor="#334155" />
        </linearGradient>
        <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.3"/>
        </filter>
      </defs>

      {/* Outer Glow Ring for Speaking Agents */}
      {active && (
        <circle cx="50" cy="50" r="47" fill="none" stroke="#22d3ee" strokeWidth="2.5" className="animate-pulse" />
      )}

      {/* Profile Background circle */}
      <circle cx="50" cy="50" r="43" fill="#f8fafc" stroke="#94a3b8" strokeWidth="2" />
      
      {isSupervisor ? (
        // Holographic AI Supervisor
        <g>
          <circle cx="50" cy="50" r="28" fill="none" stroke="#22d3ee" strokeWidth="1" strokeDasharray="3 3" />
          {/* Animated matrix particles */}
          <circle cx="50" cy="50" r="38" fill="none" stroke="#0891b2" strokeWidth="0.8" opacity="0.3" />
          <line x1="20" y1="50" x2="80" y2="50" stroke="#06b6d4" strokeWidth="0.5" opacity="0.2" />
          <line x1="50" y1="20" x2="50" y2="80" stroke="#06b6d4" strokeWidth="0.5" opacity="0.2" />
          
          <path d="M 50 18 C 41 18 33 26 33 36 C 33 44 40 47 41 55 C 42 60 38 67 50 67 C 62 67 58 60 59 55 C 60 47 67 44 67 36 C 67 26 59 18 50 18 Z" fill="url(#grad-supervisor)" opacity="0.9" filter="url(#shadow)" />
          <circle cx="50" cy="35" r="4" fill="#ffffff" className="animate-ping" style={{ animationDuration: '2s' }} />
          <circle cx="50" cy="35" r="2.5" fill="#ffffff" />
          <path d="M 32 78 C 44 71, 56 71, 68 78" fill="none" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" />
        </g>
      ) : (
        // Human worker avatar with Safety Helmets and detailed features for "Real Worker Dialog"
        <g>
          {/* Shoulders / Uniform clothes */}
          <path d="M 22 80 C 22 68, 30 62, 50 62 C 70 62, 78 68, 78 80 Z" fill={`url(#grad-${id})`} filter="url(#shadow)" />
          <line x1="50" y1="62" x2="50" y2="80" stroke="#f1f5f9" strokeWidth="1.5" opacity="0.6" />
          
          {/* High-visibility safety vests with reflective stripes */}
          <path d="M 32 62 L 36 80 M 68 62 L 64 80" fill="none" stroke="#22c55e" strokeWidth="3" opacity="0.8" />
          <path d="M 32 62 L 36 80 M 68 62 L 64 80" fill="none" stroke="#ffffff" strokeWidth="1" opacity="0.9" />

          {/* Portrait Head / Neck */}
          <rect x="44" y="50" width="12" height="14" fill="#fbcfe8" opacity="0.1" /> {/* Neck base */}
          <rect x="44" y="49" width="12" height="11" fill="#fed7aa" rx="1" />
          <circle cx="50" cy="42" r="16" fill="#fde047" opacity="0.2" /> {/* Glow */}
          <circle cx="50" cy="42" r="15.5" fill="#ffedd5" />

          {/* Safety Hard-Hat Helmet with 3D cap brim */}
          <path d="M 29 34 C 29 20, 71 20, 71 34 Z" fill={details.helmetColor} filter="url(#shadow)" />
          <path d="M 24 34 Q 50 31 76 34" stroke={details.helmetColor} strokeWidth="3.5" strokeLinecap="round" />
          <path d="M 26 34 L 74 34" stroke="#ffffff" strokeWidth="0.8" opacity="0.4" />
          
          {/* Helmet Ridge Crest */}
          <rect x="46" y="21" width="8" height="10" fill={details.helmetColor} rx="1" stroke="#ffffff" strokeWidth="0.5" />
          
          {/* Helmet Crest/Logo Emblem (Green Cross for safety, lightning for energy, star/badge for lead) */}
          <rect x="48" y="23" width="4" height="6" fill="#ffffff" rx="0.5" />
          {id === 'safety' && (
            <path d="M 50 24 L 50 28 M 48 26 L 52 26" stroke="#ef4444" strokeWidth="1" strokeLinecap="round" />
          )}
          {id === 'energy' && (
            <polygon points="50,23 52,26 49,26 51,29" fill="#f59e0b" />
          )}
          {id === 'prod' && (
            <circle cx="50" cy="26" r="1" fill="#3b82f6" />
          )}
          {id === 'qual' && (
            <path d="M 49 26 L 51 26" stroke="#10b981" strokeWidth="1" />
          )}

          {/* Eyes & Eyebrows */}
          <path d="M 40 37 Q 44 36 46 38" fill="none" stroke="#1e293b" strokeWidth="1.2" />
          <path d="M 54 38 Q 56 36 60 37" fill="none" stroke="#1e293b" strokeWidth="1.2" />
          <circle cx="43" cy="41" r="2.2" fill="#0f172a" />
          <circle cx="57" cy="41" r="2.2" fill="#0f172a" />
          
          {/* Communication Headset / Boom Mic (Critical for intercom vibe) */}
          <path d="M 66 43 C 66 48, 62 50, 53 49" fill="none" stroke="#475569" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="52" cy="49" r="2" fill="#0f172a" />
          <circle cx="65" cy="43" r="3.5" fill="#334155" />

          {/* Facial expression - Professional communication smile! */}
          <path d="M 46 48 Q 50 51 54 48" fill="none" stroke="#27272a" strokeWidth="1.6" strokeLinecap="round" />
        </g>
      )}
    </svg>
  );
};

const FactoryUnit = ({ 
  id, 
  title, 
  subtitle, 
  status, 
  active = false, 
  critic = false 
}: { 
  id: string; 
  title: string; 
  subtitle: string; 
  status: string; 
  active?: boolean; 
  critic?: boolean;
}) => {
  // Ultra realistic industrial steel chassis colors matching the modern 21xx actual equipment view
  let ledColor = "bg-slate-400";
  let statusTextColor = "text-slate-400 opacity-90";
  let panelBorder = "border-slate-800/80";

  if (active) {
    if (critic) {
      panelBorder = "border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.3)]";
      ledColor = "bg-rose-500 shadow-[0_0_8px_#f43f5e] animate-pulse";
      statusTextColor = "text-rose-400 font-extrabold";
    } else {
      panelBorder = "border-[#0ea5e9] shadow-[0_0_15px_rgba(14,165,233,0.2)]";
      ledColor = "bg-[#0ea5e9] shadow-[0_0_8px_#0ea5e9]";
      statusTextColor = "text-sky-400 font-extrabold";
    }
  }

  return (
    <div 
      className={cn(
        "rounded-xl border flex flex-col justify-between w-[184px] h-[105px] select-none text-slate-100 transition-all duration-500",
        "bg-gradient-to-br from-[#111827] via-[#0f172a] to-[#030712] shadow-xl",
        panelBorder
      )}
      style={{
        boxShadow: active 
          ? (critic ? "0 8px 20px -4px rgba(244,63,94,0.25)" : "0 8px 20px -4px rgba(14,165,233,0.15)")
          : "0 6px 12px -3px rgba(0,0,0,0.4)"
      }}
    >
      {/* 3D Top-bevel industrial design bar */}
      <div className="bg-slate-900 border-b border-slate-800 px-2 py-1 rounded-t-xl flex items-center justify-between text-[6px]">
        <span className="font-mono uppercase tracking-widest text-[5.5px] text-slate-400 font-bold">{subtitle}</span>
        <div className="flex items-center gap-1.5">
          {/* Active 3D Beacon light */}
          <span className={cn("w-1.5 h-1.5 rounded-full", ledColor)} />
          <span className={cn("font-black tracking-wider text-[6.5px] uppercase", statusTextColor)}>{status}</span>
        </div>
      </div>

      {/* Realistic mechanical/dashboard view inside */}
      <div className="flex-1 p-1 px-1.5 flex items-center justify-between gap-2 bg-[#050913]/95">
        {id === 'washing' && (
          <div className="flex items-center gap-2 w-full">
            {/* Custom SVG Drawing of Washing Nozzle spray chamber */}
            <div className="relative shrink-0 w-11 h-11 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center overflow-hidden">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className="text-sky-400">
                {/* Chamber outer outline */}
                <rect x="4" y="4" width="32" height="32" rx="3" stroke="#475569" strokeWidth="1" />
                {/* Rotating wash drum inside */}
                <motion.circle 
                  cx="20" 
                  cy="20" 
                  r="11" 
                  stroke="#38bdf8" 
                  strokeWidth="1.5" 
                  strokeDasharray="4 2"
                  animate={{ rotate: active && !critic ? 360 : 0 }}
                  transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
                />
                {/* Top/Bottom Spray jets */}
                <path d="M12 9 L20 15 L28 9" stroke="#93c5fd" strokeWidth="1" strokeLinecap="round" opacity={active && !critic ? 0.9 : 0.2} />
                <path d="M12 31 L20 25 L28 31" stroke="#93c5fd" strokeWidth="1" strokeLinecap="round" opacity={active && !critic ? 0.9 : 0.2} />
                
                {/* Water Mist droplets */}
                {active && !critic && (
                  <>
                    <motion.circle cx="16" cy="16" r="1" fill="#60a5fa" animate={{ y: [0, 6, 0] }} transition={{ repeat: Infinity, duration: 0.8 }} />
                    <motion.circle cx="24" cy="24" r="1" fill="#60a5fa" animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 0.9, delay: 0.2 }} />
                    <motion.circle cx="20" cy="18" r="0.8" fill="#e0f2fe" animate={{ x: [-3, 3, -3] }} transition={{ repeat: Infinity, duration: 1.2 }} />
                  </>
                )}
                {critic && (
                  <circle cx="20" cy="20" r="13" stroke="#ef4444" strokeWidth="1" strokeDasharray="2 2" className="animate-pulse" />
                )}
              </svg>
              {critic && <div className="absolute inset-0 bg-red-600/15 animate-pulse" />}
            </div>
            
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-[8.5px] font-black text-slate-200 uppercase tracking-tight truncate">WASHING [2102]</span>
              <span className="text-[6.5px] text-cyan-400 font-bold font-mono leading-none mt-0.5 whitespace-nowrap">
                유압: {active && critic ? "⚠️ 1.2 bar" : "2.1 bar"}
              </span>
              <span className="text-[5.5px] text-slate-400 font-mono mt-0.5">온도: {critic ? "72.1°C (하한)" : "82.4°C"}</span>
              <span className="text-[5.5px] text-slate-400 font-mono">순환수량: 3.2 m³/h</span>
            </div>
          </div>
        )}

        {id === 'ptp' && (
          <div className="flex flex-col w-full">
            <div className="flex items-center justify-between pb-0.5 mb-1 border-b border-slate-900">
              <span className="text-[8.5px] font-black text-slate-200 uppercase tracking-tight">PTP Sealer 1 [2112]</span>
              <span className="text-[6px] text-emerald-400 font-mono font-bold">{active ? "가속가동" : "정상가동"}</span>
            </div>
            
            <div className="flex items-center gap-1.5 w-full">
              {/* Mold cavities & thermoformer graphic */}
              <div className="relative shrink-0 w-8 h-8 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center overflow-hidden">
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                  {/* Sealing Roller wheels */}
                  <motion.circle 
                    cx="8" 
                    cy="14" 
                    r="5" 
                    stroke="#475569" 
                    strokeWidth="1"
                    animate={{ rotate: active ? 360 : 0 }}
                    transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                  />
                  <motion.circle 
                    cx="20" 
                    cy="14" 
                    r="5" 
                    stroke="#475569" 
                    strokeWidth="1"
                    animate={{ rotate: active ? -360 : 0 }}
                    transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                  />
                  <line x1="8" y1="14" x2="20" y2="14" stroke="#a7f3d0" strokeWidth="1" strokeDasharray="2 2" />
                  {active && <rect x="11" y="11" width="6" height="6" fill="#10b981" opacity="0.3" className="animate-pulse" />}
                </svg>
              </div>

              <div className="flex flex-col flex-1 min-w-0">
                <div className="h-3.5 bg-slate-950 rounded border border-slate-900 flex items-center px-1 overflow-hidden relative">
                  <div className="absolute inset-y-0 left-0 bg-[#10b981]/10 w-full" />
                  <div className="flex gap-1 z-10 w-full justify-around">
                    {[0, 1, 2, 3].map((n) => (
                      <span 
                        key={n} 
                        className={cn(
                          "w-1 h-1.5 rounded-sm bg-emerald-500 border border-emerald-600 transition-transform", 
                          active ? "animate-bounce" : ""
                        )} 
                        style={{ animationDelay: `${n * 0.15}s`, animationDuration: '0.6s' }}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex justify-between w-full text-[5.5px] text-slate-400 font-mono mt-0.5">
                  <span>온도: 185°C</span>
                  <span>속도: {active ? "85 c/m" : "62 c/m"}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {id === 'bottle' && (
          <div className="flex items-center gap-2 w-full">
            {/* Bottle filling machine diagram */}
            <div className="relative shrink-0 w-11 h-11 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center overflow-hidden">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                {/* Rotary filling plate */}
                <rect x="5" y="5" width="30" height="30" rx="4" stroke="#334155" strokeWidth="1" />
                {/* Nozzle arm */}
                <line x1="12" y1="8" x2="28" y2="8" stroke="#94a3b8" strokeWidth="2" />
                <line x1="15" y1="8" x2="15" y2="16" stroke="#cbd5e1" strokeWidth="1.5" />
                <line x1="25" y1="8" x2="25" y2="16" stroke="#cbd5e1" strokeWidth="1.5" />
                
                {/* Flowing liquid when active */}
                {active && (
                  <>
                    <line x1="15" y1="16" x2="15" y2="28" stroke="#38bdf8" strokeWidth="1" strokeDasharray="3 2" />
                    <line x1="25" y1="16" x2="25" y2="28" stroke="#38bdf8" strokeWidth="1" strokeDasharray="3 2" />
                  </>
                )}

                {/* Vials being filled */}
                <rect x="13" y="27" width="4" height="7" rx="0.5" fill="#e2e8f0" stroke="#475569" strokeWidth="0.5" />
                <rect x="23" y="27" width="4" height="7" rx="0.5" fill="#e2e8f0" stroke="#475569" strokeWidth="0.5" />
                {active && <rect x="14" y="29" width="2" height="4" fill="#10b981" opacity="0.75" />}
                {active && <rect x="24" y="29" width="2" height="4" fill="#10b981" opacity="0.75" />}
              </svg>
            </div>

            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-[8.5px] font-black text-slate-200 uppercase tracking-tight">Bottle Filler II [2113]</span>
              <span className="text-[6.5px] text-[#fbbf24] font-bold font-mono leading-none mt-0.5">
                속도: {active ? "최적 가속 120%" : "정상 대기 100%"}
              </span>
              <span className="text-[5.5px] text-slate-400 font-mono mt-0.5">충전율: 50.0 ml</span>
              <span className="text-[5.5px] text-slate-400 font-mono">캡핑 수율: 99.8%</span>
            </div>
          </div>
        )}

        {id === 'ess' && (
          <div className="flex items-center gap-2 w-full">
            {/* Battery storage rack modules with live cell visualization */}
            <div className="relative shrink-0 w-11 h-11 rounded-lg bg-slate-950 border border-slate-800 flex flex-col justify-around p-1 focus:outline-none">
              <div className="flex items-center justify-between text-[4px] font-mono text-slate-500">
                <span>ESS CELL</span>
                <span className={cn(active ? "text-amber-400" : "text-emerald-400")}>{active ? "OUT" : "SOC"}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <div className="h-1.5 bg-slate-900 rounded-sm relative overflow-hidden">
                  <div className={cn("absolute inset-y-0 left-0 transition-all duration-500", active ? "bg-amber-400 w-[35%]" : "bg-emerald-500 w-[94%]")} />
                </div>
                <div className="h-1.5 bg-slate-900 rounded-sm relative overflow-hidden">
                  <div className={cn("absolute inset-y-0 left-0 transition-all duration-500", active ? "bg-amber-500 w-[30%]" : "bg-emerald-500 w-[94%]")} />
                </div>
                <div className="h-1.5 bg-slate-900 rounded-sm relative overflow-hidden">
                  <div className={cn("absolute inset-y-0 left-0 transition-all duration-500", active ? "bg-amber-600 w-[25%]" : "bg-emerald-600 w-[94%]")} />
                </div>
              </div>
            </div>

            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-[8.5px] font-black text-slate-200 uppercase tracking-tight">ESS & AMR Bay [2129]</span>
              <span className="text-[6.3px] text-amber-400 font-bold font-mono leading-none mt-0.5">
                {active ? "⚡ 부하 긴급방전" : "대기 (SOC: 94%)"}
              </span>
              <span className="text-[5.5px] text-slate-400 font-mono mt-0.5">연동 로봇: AMR #3 (활성)</span>
              <span className="text-[5.5px] text-slate-400 font-mono">피크 출력: {active ? "120kW 급전" : "0kW 대기"}</span>
            </div>
          </div>
        )}

        {id === 'control' && (
          <div className="flex items-center gap-2 w-full">
            {/* Integrated monitoring screen graphics */}
            <div className="relative shrink-0 w-11 h-11 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center overflow-hidden">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                {/* Server matrix pattern or dual monitor mock */}
                <rect x="4" y="8" width="14" height="11" rx="1" stroke="#475569" strokeWidth="1" />
                <rect x="22" y="8" width="14" height="11" rx="1" stroke="#475569" strokeWidth="1" />
                <line x1="11" y1="19" x2="11" y2="24" stroke="#475569" strokeWidth="1" />
                <line x1="29" y1="19" x2="29" y2="24" stroke="#475569" strokeWidth="1" />
                
                {/* Glowing AI trace lines on monitor */}
                <path d="M6 13 Q11 10 16 14" stroke="#06b6d4" strokeWidth="1.2" opacity="0.8" />
                <path d="M24 14 Q29 16 34 11" stroke="#a7f3d0" strokeWidth="1.2" opacity="0.8" />

                {/* Animated blinking diagnostic led beads */}
                <circle cx="10" cy="30" r="1.5" fill="#22c55e" className="animate-pulse" />
                <circle cx="20" cy="30" r="1.5" fill="#3b82f6" style={{ animationDelay: '0.4s' }} className="animate-pulse" />
                <circle cx="30" cy="30" r="1.5" fill="#f59e0b" style={{ animationDelay: '0.8s' }} className="animate-ping" />
              </svg>
            </div>

            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-[8.5px] font-black text-slate-200 uppercase tracking-tight font-sans">HQ Control Room</span>
              <span className="text-[6.5px] text-cyan-400 font-bold font-mono leading-none mt-0.5">중재 관제: Active</span>
              <span className="text-[5.5px] text-slate-400 font-mono mt-0.5">프로토콜: AI-S.2161</span>
              <span className="text-[5.5px] text-slate-400 font-mono">가상 조율: 5개 분과</span>
            </div>
          </div>
        )}
      </div>

      {/* 3D Bottom bezel identification */}
      <div className="bg-slate-900 px-2 py-0.5 rounded-b-xl flex justify-between items-center text-[5.5px] border-t border-slate-800/65">
        <span className="text-slate-500 font-mono uppercase tracking-wider font-semibold">{id}_MODULE</span>
        <span className="text-slate-400 font-bold font-mono text-[6px]">ZONE.21{id === 'washing' ? '02' : id === 'ptp' ? '12' : id === 'bottle' ? '13' : id === 'ess' ? '29' : '61'}</span>
      </div>
    </div>
  );
};



function CoordinationVisualizer({
  isTourMode = false,
  tourScenarioIdx = 0
}: {
  isTourMode?: boolean;
  tourScenarioIdx?: number;
}) {
  const [step, setStep] = useState(0);
  const [events, setEvents] = useState<CoordinationEvent[]>([]);
  const [activeScenario, setActiveScenario] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [simulationSpeed, setSimulationSpeed] = useState(2500); // 2.5sec default
  const [flashActive, setFlashActive] = useState(false);

  // Map tourScenarioIdx to corresponding simulation scenario in Tour Mode
  useEffect(() => {
    if (isTourMode) {
      const scenarioMapping: Record<number, number> = {
        0: 0, // Scenario A -> 6대 에이전트 전사 최적화 조율 (idx 0)
        1: 3, // Scenario B -> 가스 미세 누출 감지 대응 (idx 3)
        2: 4, // Scenario C -> 피크 전력 긴급 부하 제약 (idx 4)
        3: 1  // Scenario D -> B라인 생산 속도 최적화 충돌 (idx 1)
      };
      const activeIdx = scenarioMapping[tourScenarioIdx] !== undefined ? scenarioMapping[tourScenarioIdx] : 0;
      setActiveScenario(activeIdx);
      setEvents([]);
      setStep(0);
    }
  }, [tourScenarioIdx, isTourMode]);

  // Automated dispatch checklist logic based on live simulation activity
  useEffect(() => {
    if (!isTourMode) return;
    
    // Auto check if we are playing or interacting with steps (Skip / forward)
    if (step > 0) {
      if (tourScenarioIdx === 0) {
        window.dispatchEvent(new CustomEvent('tour-action', { detail: { scenario: 0, step: 3, checklistIdx: 2 } }));
      } else if (tourScenarioIdx === 1) {
        window.dispatchEvent(new CustomEvent('tour-action', { detail: { scenario: 1, step: 3, checklistIdx: 1 } }));
      } else if (tourScenarioIdx === 2) {
        window.dispatchEvent(new CustomEvent('tour-action', { detail: { scenario: 2, step: 3, checklistIdx: 1 } }));
      } else if (tourScenarioIdx === 3) {
        window.dispatchEvent(new CustomEvent('tour-action', { detail: { scenario: 3, step: 3, checklistIdx: 1 } }));
      }
    }

    const scenario = scenarios[activeScenario];
    if (scenario && step >= scenario.timeline.length) {
      // Reached the final agreement of the simulation
      if (tourScenarioIdx === 0) {
        window.dispatchEvent(new CustomEvent('tour-action', { detail: { scenario: 0, step: 3, checklistIdx: 3 } }));
      } else if (tourScenarioIdx === 1 && activeScenario === 3) {
        window.dispatchEvent(new CustomEvent('tour-action', { detail: { scenario: 1, step: 3, checklistIdx: 2 } }));
      } else if (tourScenarioIdx === 2 && activeScenario === 4) {
        window.dispatchEvent(new CustomEvent('tour-action', { detail: { scenario: 2, step: 3, checklistIdx: 2 } }));
      } else if (tourScenarioIdx === 3 && activeScenario === 1) {
        window.dispatchEvent(new CustomEvent('tour-action', { detail: { scenario: 3, step: 3, checklistIdx: 2 } }));
      }
    }
  }, [step, activeScenario, tourScenarioIdx, isTourMode]);

  useEffect(() => {
    if (!isTourMode) return;
    
    // Automatically trigger selection checklist completions for the default loaded scenario
    if (tourScenarioIdx === 0 && activeScenario === 0) {
      window.dispatchEvent(new CustomEvent('tour-action', { detail: { scenario: 0, step: 3, checklistIdx: 0 } }));
    } else if (tourScenarioIdx === 1 && activeScenario === 3) {
      window.dispatchEvent(new CustomEvent('tour-action', { detail: { scenario: 1, step: 3, checklistIdx: 0 } }));
    } else if (tourScenarioIdx === 2 && activeScenario === 4) {
      window.dispatchEvent(new CustomEvent('tour-action', { detail: { scenario: 2, step: 3, checklistIdx: 0 } }));
    } else if (tourScenarioIdx === 3 && activeScenario === 1) {
      window.dispatchEvent(new CustomEvent('tour-action', { detail: { scenario: 3, step: 3, checklistIdx: 0 } }));
    }
  }, [activeScenario, tourScenarioIdx, isTourMode]);

  const scenarios = [
    {
      title: "🔥 [통합] 6대 에이전트 전사 최적화 조율",
      description: "생산 극대화 목표 하에 안전, 예지보전, 품질, 에너지, 물류 에이전트 간의 동시 다자 협업 및 실시간 중재",
      agents: [
        { id: 'prod', name: '생산 최적화', role: 'Production', color: 'text-blue-500', icon: <TrendingUp size={14} /> },
        { id: 'qual', name: '품질 에이전트', role: 'Quality', color: 'text-emerald-500', icon: <ShieldCheck size={14} /> },
        { id: 'pm', name: '설비예지보전', role: 'Maintenance', color: 'text-purple-500', icon: <Wrench size={14} /> },
        { id: 'energy', name: '에너지 에이전트', role: 'Energy', color: 'text-orange-500', icon: <Zap size={14} /> },
        { id: 'safety', name: '안전 에이전트', role: 'Safety', color: 'text-red-500', icon: <ShieldAlert size={14} /> },
        { id: 'logistics', name: '물류 에이전트', role: 'Logistics', color: 'text-yellow-500', icon: <Truck size={14} /> },
      ],
      timeline: [
        { fromAgent: 'prod', toAgent: 'supervisor', type: 'proposal', content: "신규 긴급 오더 대응을 위해 패키징 1라인 분당 가동 속도를 20% 초고속 모드로 상향 제안합니다." },
        { fromAgent: 'pm', toAgent: 'supervisor', type: 'critique', content: "반대합니다. 메인 구동 장치의 축 마모도가 최근 91%에 육박하여 즉각 가속 시 12시간 내 열화 고장 위험률이 89%입니다." },
        { fromAgent: 'qual', toAgent: 'supervisor', type: 'critique', content: "분석 보고: 한계 속도 도달 시 열접합 파트 온도 불안정으로 제품 원형 성형 스크래치 불량률이 7.5%로 상향 칩니다." },
        { fromAgent: 'energy', toAgent: 'supervisor', type: 'critique', content: "실하중 분석: 당일 정오 피크 전력 한계치 도달을 감안하면 모터 고 전력 모드가 겹쳐 계약 초과 위약 경고가 활성화됩니다." },
        { fromAgent: 'safety', toAgent: 'supervisor', type: 'info', content: "규정 파라미터: 과마모 구역 마찰열 증가로 주변 분위기 온도가 1급 가이드 한계를 근접하는 예방 안전 가드레일을 침범합니다." },
        { fromAgent: 'logistics', toAgent: 'supervisor', type: 'proposal', content: "물류 최적화 대안: 출하 완료 물류를 바탕으로 AMR 이송 간격을 25% 가속 설정화하고 완충 적재 슬롯을 조기 전환하면 지연 분산 완충이 가능합니다." },
        { fromAgent: 'supervisor', toAgent: 'all', type: 'agreement', content: "최종 조율 결과: 생산 속도는 +5%만 완만하고 안정되게 가져가고, 전력 피크 타임은 백업 가동 ESS 120kW 방전으로 버티며, AMR 완충 버퍼 로직을 실시간 실행해 납기 차질률을 격파합니다.", reasoning: "품질 최우선 경영 가이드와 미세 이상 안전 가드레일을 100% 수호한 채, 물류 지능 조율 및 ESS 연동 복합 의사결정으로 단 한 번의 정지 없이 납품 목표를 실현함." }
      ]
    },
    {
      title: "B라인 생산 속도 최적화 충돌",
      description: "생산량 증대 요청과 품질 저하 우려 간의 실시간 조율",
      agents: [
        { id: 'prod', name: '생산 최적화', role: 'Production', color: 'text-blue-500', icon: <TrendingUp size={14} /> },
        { id: 'qual', name: '품질 에이전트', role: 'Quality', color: 'text-emerald-500', icon: <ShieldCheck size={14} /> },
        { id: 'pm', name: '설비예지보전', role: 'Maintenance', color: 'text-purple-500', icon: <Wrench size={14} /> },
        { id: 'energy', name: '에너지 에이전트', role: 'Energy', color: 'text-orange-500', icon: <Zap size={14} /> },
      ],
      timeline: [
        { fromAgent: 'prod', toAgent: 'supervisor', type: 'proposal', content: "생산 목표 달성을 위해 B라인 속도를 15% 상향 제안합니다." },
        { fromAgent: 'qual', toAgent: 'supervisor', type: 'critique', content: "반대합니다. 현재 온도 조건에서 속도 상향 시 핀홀 불량률이 4.2%까지 상승할 것으로 예측됩니다." },
        { fromAgent: 'pm', toAgent: 'supervisor', type: 'info', content: "설비 진동 데이터는 안정적입니다. 속도 상향에 따른 기계적 과부하 위험은 낮습니다." },
        { fromAgent: 'energy', toAgent: 'supervisor', type: 'critique', content: "피크 시간대입니다. 15% 상향 시 계약 전력 초과 위험이 있습니다." },
        { fromAgent: 'supervisor', toAgent: 'all', type: 'agreement', content: "중재 결과: 속도 상향을 5%로 제한하고, 품질 유지를 위해 냉각 온도를 2도 하향 조정합니다. 에너지 피크는 ESS 방전으로 상쇄합니다.", reasoning: "품질 가드레일(핀홀 불량)과 에너지 비용 최적화를 고려하여 절충안을 도출함. ESS 활용을 통해 생산성 저하를 최소화함." }
      ]
    },
    {
      title: "C구역 화재 징후 감지 및 대응",
      description: "안전 최우선 원칙에 따른 생산 중단 및 소방 연동",
      agents: [
        { id: 'safety', name: '안전 에이전트', role: 'Safety', color: 'text-red-500', icon: <ShieldAlert size={14} /> },
        { id: 'prod', name: '생산 최적화', role: 'Production', color: 'text-blue-500', icon: <TrendingUp size={14} /> },
        { id: 'supervisor', name: '슈퍼바이저', role: 'Orchestrator', color: 'text-accent', icon: <Cpu size={14} /> },
      ],
      timeline: [
        { fromAgent: 'safety', toAgent: 'supervisor', type: 'proposal', content: "C구역 CCTV에서 연기 감지. 즉시 가동 중단 및 소방 셔터 작동을 요청합니다." },
        { fromAgent: 'prod', toAgent: 'supervisor', type: 'critique', content: "현재 공정 중단 시 5억원 상당의 원부자재 손실이 발생합니다. 오탐 가능성 확인이 필요합니다." },
        { fromAgent: 'supervisor', toAgent: 'all', type: 'agreement', content: "안전 우선 원칙 적용. 즉시 가동 중단 명령 하달. 소방 연동 시스템 가동. 손실보다 인명 및 설비 보호가 최우선입니다.", reasoning: "Safety-First 정책에 따라 인명 피해 가능성이 0.1%라도 존재할 경우 즉시 중단이 원칙임. 경제적 손실보다 안전 가드레일이 상위 계층임." }
      ]
    },
    {
      title: "🚨 [EXPO] 가스 미세 누출 감지 대응",
      description: "가스 누출 위험 상황 발생 시 위험 무력화 및 조치 가이드",
      agents: [
        { id: 'safety', name: '안전 에이전트', role: 'Safety', color: 'text-red-500', icon: <ShieldAlert size={14} /> },
        { id: 'pm', name: '설비예지보전', role: 'Maintenance', color: 'text-purple-500', icon: <Wrench size={14} /> },
        { id: 'prod', name: '생산 최적화', role: 'Production', color: 'text-blue-500', icon: <TrendingUp size={14} /> },
        { id: 'supervisor', name: '슈퍼바이저', role: 'Orchestrator', color: 'text-accent', icon: <Cpu size={14} /> },
      ],
      timeline: [
        { fromAgent: 'safety', toAgent: 'supervisor', type: 'proposal', content: "A-3 구역에서 메탄 가스 15ppm 감지. 환기 설비 풀 가동 및 국소 소화 제어가 시급합니다." },
        { fromAgent: 'pm', toAgent: 'supervisor', type: 'info', content: "진단 결과 밸브 No.12 개스킷 미세 노후화 확인됨. 임시 압력 저하 상태로 운전 시 누출량 80% 저감 가능합니다." },
        { fromAgent: 'prod', toAgent: 'supervisor', type: 'critique', content: "생산 정지 시 납기 지연 발생. 밸브 No.12의 메인 라인을 우회로로 전환 요청합니다." },
        { fromAgent: 'supervisor', toAgent: 'all', type: 'agreement', content: "중재 결과: 즉시 우회관로 전환 실행 및 해당 밸브 메인 차단. 환기팬 100% 가동 상태를 유지하며 설비 유지보수팀 현장 급파 지시.", reasoning: "안전 수칙 범위 내 가스 희석 및 확산 방지는 필수. 우회 관로 조치가 가능하므로 생산 중단 없이 가스 누출 부위를 무해하게 격리함." }
      ]
    },
    {
      title: "⚡ [EXPO] 피크 전력 긴급 부하 제약",
      description: "국가 전력망 주파수 급락 경보에 따른 신속 부하 셰딩",
      agents: [
        { id: 'energy', name: '에너지 에이전트', role: 'Energy', color: 'text-orange-500', icon: <Zap size={14} /> },
        { id: 'prod', name: '생산 최적화', role: 'Production', color: 'text-blue-500', icon: <TrendingUp size={14} /> },
        { id: 'qual', name: '품질 에이전트', role: 'Quality', color: 'text-emerald-500', icon: <ShieldCheck size={14} /> },
        { id: 'supervisor', name: '슈퍼바이저', role: 'Orchestrator', color: 'text-accent', icon: <Cpu size={14} /> },
      ],
      timeline: [
        { fromAgent: 'energy', toAgent: 'supervisor', type: 'proposal', content: "한국전력 거래소 긴급 수요감축(DR) 지시 하달. 5분 이내 전력 사용량 250kW 감축 의무 발생." },
        { fromAgent: 'prod', toAgent: 'supervisor', type: 'critique', content: "B 공정 열처리 가마 대기 소모 중단 불가. 임의 전력 차단 시 내부 공정물 전량 폐기 우려." },
        { fromAgent: 'qual', toAgent: 'supervisor', type: 'info', content: "가열 유지가 필수적이며 하강 온도가 15도 이상 떨어지지 않아야 품질 파라미터를 유지할 수 있습니다." },
        { fromAgent: 'supervisor', toAgent: 'all', type: 'agreement', content: "중재 결과: 긴급히 유틸리티 ESS 배터리에서 150kW 급전하고, 제3건조실 순차 제어로 110kW 일시 감축 처리하여 패널티 회피 및 공정 영향 무력화 완료.", reasoning: "DR 감축 불이행에 따른 대규모 패널티(약 1200만원 상당) 및 정전 연동 방지. ESS를 즉각 구동하고 비핵심 건조 공정의 냉간 유예 주기를 밀어 조율함." }
      ]
    }
  ];

  useEffect(() => {
    if (!isPlaying) return;
    const scenario = scenarios[activeScenario];
    if (step < scenario.timeline.length) {
      const timer = setTimeout(() => {
        const nextIdx = step;
        const newEvent = {
          ...scenario.timeline[nextIdx],
          id: Math.random().toString(36).substr(2, 9),
          timestamp: new Date().toLocaleTimeString()
        };
        setEvents(prev => [...prev, newEvent as CoordinationEvent]);
        setStep(s => s + 1);
        setFlashActive(true);
        setTimeout(() => setFlashActive(false), 300);
      }, simulationSpeed);
      return () => clearTimeout(timer);
    }
  }, [step, activeScenario, isPlaying, simulationSpeed]);

  useEffect(() => {
    if (events.length > 0) {
      // Auto check Step 4, item 3: 실시간 타임라인 오케스트레이션 Event Log 분석
      window.dispatchEvent(new CustomEvent('tour-action', { detail: { step: 3, checklistIdx: 3 } }));
    }
  }, [events]);

  const reset = (idx: number) => {
    setActiveScenario(idx);
    setEvents([]);
    setStep(0);

    if (!isTourMode) return;

    // Dispatch selection checklist item checks depending on which scenario theme we are doing
    if (tourScenarioIdx === 0) {
      if (idx === 0) {
        window.dispatchEvent(new CustomEvent('tour-action', { detail: { scenario: 0, step: 3, checklistIdx: 0 } }));
      } else if (idx === 3 || idx === 4) {
        window.dispatchEvent(new CustomEvent('tour-action', { detail: { scenario: 0, step: 3, checklistIdx: 1 } }));
      }
    } else if (tourScenarioIdx === 1) {
      if (idx === 3) {
        window.dispatchEvent(new CustomEvent('tour-action', { detail: { scenario: 1, step: 3, checklistIdx: 0 } }));
      }
    } else if (tourScenarioIdx === 2) {
      if (idx === 4) {
        window.dispatchEvent(new CustomEvent('tour-action', { detail: { scenario: 2, step: 3, checklistIdx: 0 } }));
      }
    } else if (tourScenarioIdx === 3) {
      if (idx === 1) {
        window.dispatchEvent(new CustomEvent('tour-action', { detail: { scenario: 3, step: 3, checklistIdx: 0 } }));
      }
    }
  };

  const triggerNextStep = () => {
    const scenario = scenarios[activeScenario];
    if (step < scenario.timeline.length) {
      const newEvent = {
        ...scenario.timeline[step],
        id: Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toLocaleTimeString()
      };
      setEvents(prev => [...prev, newEvent as CoordinationEvent]);
      setStep(s => s + 1);
      setFlashActive(true);
      setTimeout(() => setFlashActive(false), 300);

      // Auto check Skip/Reset control interaction
      window.dispatchEvent(new CustomEvent('tour-action', { detail: { step: 3, checklistIdx: 2 } }));
    }
  };

  const triggerPrevStep = () => {
    if (step > 0) {
      setEvents(prev => prev.slice(0, -1));
      setStep(s => s - 1);

      // Auto check Skip/Reset control interaction
      window.dispatchEvent(new CustomEvent('tour-action', { detail: { step: 3, checklistIdx: 2 } }));
    }
  };

  return (
    <div className="space-y-6 relative">
      {/* EXPO DEMO BAR */}
      <div className="bg-gradient-to-r from-accent/20 via-transparent to-red-500/20 border border-accent/30 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-lg shadow-accent/5">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent"></span>
          </span>
          <span className="text-[10px] font-black uppercase tracking-wider text-accent">AI EXPO 2026 LIVE DEMO MODE</span>
        </div>
        
        {/* Playback Controls for Presenter */}
        <div className="flex items-center gap-1 bg-surface border border-border p-1 rounded-lg">
          <button
            onClick={triggerPrevStep}
            disabled={step === 0}
            className="p-1 px-1.5 rounded text-[10px] bg-bg/50 hover:bg-bg border border-border text-text-primary disabled:opacity-30 disabled:pointer-events-none transition-colors"
            title="이전 단계로"
          >
            <SkipBack size={12} />
          </button>
          
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={cn(
              "p-1 px-2.5 rounded text-[10px] font-bold flex items-center gap-1 transition-colors",
              isPlaying ? "bg-accent/20 text-accent hover:bg-accent/30" : "bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30"
            )}
          >
            {isPlaying ? <Pause size={10} /> : <Play size={10} />}
            {isPlaying ? "자동 일시정지" : "자동 재생"}
          </button>

          <button
            onClick={triggerNextStep}
            disabled={step >= scenarios[activeScenario].timeline.length}
            className="p-1 px-1.5 rounded text-[10px] bg-bg/50 hover:bg-bg border border-border text-text-primary disabled:opacity-30 disabled:pointer-events-none transition-colors"
            title="다음 단계 강제 진행"
          >
            <SkipForward size={12} />
          </button>

          <button
            onClick={() => reset(activeScenario)}
            className="p-1 px-2 rounded text-[10px] bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 transition-colors"
          >
            ↺ 처음부터
          </button>
        </div>

        {/* Speed Adjustment */}
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-text-secondary font-mono">자동 간격:</span>
          <select
            value={simulationSpeed}
            onChange={(e) => setSimulationSpeed(Number(e.target.value))}
            className="text-[10px] bg-surface-hover border border-border rounded px-1.5 py-0.5 text-text-primary focus:outline-none focus:border-accent"
          >
            <option value={1000}>빠름 (1.0초)</option>
            <option value={2500}>보통 (2.5초)</option>
            <option value={4500}>느림 (4.5초)</option>
          </select>
        </div>
      </div>

      {/* Scenario Selection */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {scenarios.map((s, i) => (
          <button
            key={i}
            onClick={() => reset(i)}
            className={cn(
              "p-2.5 rounded-xl border transition-all text-left group flex flex-col justify-between",
              activeScenario === i 
                ? "bg-accent/10 border-accent shadow-lg shadow-accent/5 scale-[1.02]" 
                : "bg-surface border-border hover:border-accent/30"
            )}
          >
            <div>
              <div className="flex items-center justify-between mb-0.5">
                <span className={cn(
                  "text-[8px] font-bold uppercase tracking-widest",
                  activeScenario === i ? "text-accent" : "text-text-secondary"
                )}>
                  {s.title.includes("[EXPO]") ? "🔥 Live DEMO" : `Scenario 0${i + 1}`}
                </span>
                {activeScenario === i && <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />}
              </div>
              <h4 className="text-[11px] font-bold group-hover:text-accent transition-colors line-clamp-1">{s.title}</h4>
            </div>
            <p className="text-[9px] text-text-secondary mt-1 line-clamp-1">{s.description}</p>
          </button>
        ))}
      </div>

      {/* Visualizer Stage Container with scroll wrapper for mobile safety */}
      <div className="overflow-x-auto rounded-2xl border border-slate-300/80 bg-[#f1f5f9] shadow-inner p-1.5">
        <div className={cn(
          "relative rounded-xl h-[560px] min-w-[800px] overflow-hidden transition-all duration-350 bg-slate-100",
          "border border-slate-300/50"
        )}>
          {/* Elegantly styled Epoxy silver-grey 3D floor background gradient matching user's cleanroom view */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#ffffff] via-[#f1f5f9] to-[#e4e9f0] z-0" />
          
          {/* Subtle grid mesh overlays matching a real control blueprint */}
          <div className="absolute inset-0 z-0 opacity-15 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#64748b 1px, transparent 1px)', backgroundSize: '16px 16px' }} />

          {/* BACKGROUND EQUIPMENT & BLUEPRINT CONVEYORS (설비 레이아웃 표현) */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              {/* 알약 Blister 포켓 격자 텍스처 패턴 */}
              <pattern id="blister-mesh" width="1.5" height="1.0" patternUnits="userSpaceOnUse">
                <rect x="0.1" y="0.1" width="1.3" height="0.8" rx="0.2" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="0.08" />
                <circle cx="0.75" cy="0.5" r="0.25" fill="#94a3b8" opacity="0.5" />
              </pattern>
              
              {/* 정밀한 체인형 그리드 컨베이어 패턴 */}
              <pattern id="chain-conveyor" width="2.0" height="0.8" patternUnits="userSpaceOnUse">
                <line x1="0" y1="0.4" x2="2.0" y2="0.4" stroke="#94a3b8" strokeWidth="0.15" />
                <rect x="0.2" y="0.1" width="0.7" height="0.6" rx="0.1" fill="#cbd5e1" stroke="#64748b" strokeWidth="0.08" />
                <rect x="1.2" y="0.1" width="0.7" height="0.6" rx="0.1" fill="#cbd5e1" stroke="#64748b" strokeWidth="0.08" />
              </pattern>

              {/* 디테일 기어 그라디언트 */}
              <radialGradient id="gear-grad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#f1f5f9" />
                <stop offset="70%" stopColor="#cbd5e1" />
                <stop offset="100%" stopColor="#64748b" />
              </radialGradient>
            </defs>

            {/* Operator Zoom area (Top Left, 7% ~ 21%): lifter + storage framework */}
            <g opacity="0.65" stroke="#475569" strokeWidth="0.15">
              {/* Lifter-Carrier AMR Unit */}
              <rect x="6.5" y="3.5" width="2.8" height="2.2" rx="0.3" fill="#e2e8f0" />
              <rect x="7.0" y="4.2" width="1.8" height="0.8" fill="#f59e0b" opacity="0.85" /> {/* Safety Yellow battery packs */}
              <circle cx="7.2" cy="5.8" r="0.3" fill="#1e293b" />
              <circle cx="8.6" cy="5.8" r="0.3" fill="#1e293b" />
              
              {/* Metal framework rails */}
              <line x1="12" y1="2" x2="12" y2="10" stroke="#94a3b8" strokeWidth="0.25" strokeDasharray="0.5 0.5" />
              <line x1="14.5" y1="2" x2="14.5" y2="10" stroke="#94a3b8" strokeWidth="0.25" strokeDasharray="0.5 0.5" />
              
              {/* Stacked Roll Cages / Metal frames */}
              <rect x="11.5" y="2.5" width="1.0" height="2.0" rx="0.1" fill="#f1f5f9" />
              <rect x="11.5" y="5.0" width="1.0" height="2.0" rx="0.1" fill="#f1f5f9" />
              <rect x="11.5" y="7.5" width="1.0" height="2.0" rx="0.1" fill="#f1f5f9" />

              <rect x="14.0" y="2.5" width="1.0" height="2.0" rx="0.1" fill="#f1f5f9" />
              <rect x="14.0" y="5.0" width="1.0" height="2.0" rx="0.1" fill="#f1f5f9" />
              <rect x="14.0" y="7.5" width="1.0" height="2.0" rx="0.1" fill="#f1f5f9" />
            </g>

            {/* Washing [2102] Room: High-detail fluid spraying drums and conveyor chains */}
            <g opacity="0.7">
              {/* Main Machine Frame */}
              <rect x="22" y="4" width="16" height="8" rx="0.5" fill="#f8fafc" stroke="#64748b" strokeWidth="0.25" />
              <rect x="23" y="5" width="14" height="6" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="0.15" />
              
              {/* Washing Tunnel Spiral Line */}
              <path d="M 23.5 8 Q 25 5 26.5 8 T 29.5 8 T 32.5 8 T 35.5 8 T 37.5 8" fill="none" stroke="#38bdf8" strokeWidth="0.4" strokeDasharray="0.8 0.4" />
              
              {/* Rotary Washing Drum Spoke Gear (원형 세척 드럼 회전 기계) */}
              <circle cx="33" cy="18" r="4.2" fill="url(#gear-grad)" stroke="#475569" strokeWidth="0.25" />
              <circle cx="33" cy="18" r="3.0" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="0.15" />
              
              {/* Spray Nozzles */}
              <line x1="30" y1="13.8" x2="33" y2="16" stroke="#0ea5e9" strokeWidth="0.2" strokeDasharray="0.3 0.3" />
              <line x1="36" y1="13.8" x2="33" y2="16" stroke="#0ea5e9" strokeWidth="0.2" strokeDasharray="0.3 0.3" />
              
              {/* Rotary teeth detail */}
              {Array.from({ length: 8 }).map((_, i) => {
                const angle = (i * Math.PI) / 4;
                const x1 = 33 + Math.cos(angle) * 3.8;
                const y1 = 18 + Math.sin(angle) * 3.8;
                const x2 = 33 + Math.cos(angle) * 4.6;
                const y2 = 18 + Math.sin(angle) * 4.6;
                return (
                  <line key={`wash-tooth-${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#334155" strokeWidth="0.35" />
                );
              })}
              <circle cx="33" cy="18" r="1.2" fill="#64748b" />
            </g>

            {/* BOTTLE I [2113 / 2117] + IPC [2114] upper machinery line */}
            <g opacity="0.65">
              {/* Conveyor Tracks */}
              <rect x="45" y="5" width="22" height="1.8" fill="url(#chain-conveyor)" stroke="#64748b" strokeWidth="0.15" />
              <rect x="67" y="5" width="22" height="1.8" fill="url(#chain-conveyor)" stroke="#64748b" strokeWidth="0.15" />
              
              {/* Little bottles layout on conveyor */}
              {Array.from({ length: 12 }).map((_, i) => (
                <rect key={`bottle-conv-${i}`} x={46 + i * 3.5} y="5.3" width="0.7" height="1.1" rx="0.15" fill="#38bdf8" opacity="0.8" stroke="#0284c7" strokeWidth="0.08" />
              ))}

              {/* Rotary Starwheel / Bottle Filler Indexing table (보틀 충전 주입 휠) */}
              <circle cx="70" cy="11.5" r="4.0" fill="url(#gear-grad)" stroke="#475569" strokeWidth="0.25" />
              {Array.from({ length: 12 }).map((_, i) => {
                const angle = (i * Math.PI) / 6;
                const bx = 70 + Math.cos(angle) * 2.8;
                const by = 11.5 + Math.sin(angle) * 2.8;
                return (
                  <circle key={`bottle-slot-${i}`} cx={bx} cy={by} r="0.5" fill="#38bdf8" stroke="#0284c7" strokeWidth="0.08" />
                );
              })}
              <circle cx="70" cy="11.5" r="1.5" fill="#cbd5e1" stroke="#475569" strokeWidth="0.2" />

              {/* Rotary Capping Station Unit */}
              <circle cx="82" cy="11.5" r="3.2" fill="url(#gear-grad)" stroke="#475569" strokeWidth="0.2" />
              <circle cx="82" cy="11.5" r="2.0" fill="#f8fafc" stroke="#94a3b8" strokeWidth="0.15" />
              
              {/* Control Desk Console Panel IPC 2114 */}
              <rect x="49" y="8.2" width="4.5" height="2.5" rx="0.3" fill="#1e293b" stroke="#475569" strokeWidth="0.2" />
              <rect x="49.5" y="8.5" width="3.5" height="1.6" fill="#0ea5e9" opacity="0.3" /> {/* Cyan monitor screen */}
              <line x1="51.25" y1="10.7" x2="51.25" y2="12.0" stroke="#475569" strokeWidth="0.4" />
              <line x1="50" y1="12.0" x2="52.5" y2="12.0" stroke="#475569" strokeWidth="0.4" />
            </g>

            {/* PTP III PACKAGING [2112/2118] Aluminum thermoforming sealer line */}
            <g opacity="0.7">
              {/* Thermoforming Station Heater block */}
              <rect x="42" y="24" width="7" height="3" rx="0.2" fill="#f1f5f9" stroke="#64748b" strokeWidth="0.25" />
              <rect x="43" y="24.5" width="5" height="2" fill="#ef4444" opacity="0.25" /> {/* Red hot heater mesh */}
              <line x1="42.5" y1="25.5" x2="48.5" y2="25.5" stroke="#ef4444" strokeWidth="0.3" strokeDasharray="0.6 0.4" />
              
              {/* Thermoforming Pockets roller */}
              <circle cx="51.5" cy="25.5" r="2.0" fill="url(#gear-grad)" stroke="#334155" strokeWidth="0.2" />
              <circle cx="51.5" cy="25.5" r="1.3" fill="#cbd5e1" />

              {/* Blister Mesh Web Strip spanning into Cartoner */}
              <rect x="53.5" y="24.8" width="18" height="1.4" fill="url(#blister-mesh)" />
              
              {/* Dynamic packing boxes feed into 2118 Cartoner */}
              <rect x="71.5" y="23.2" width="14" height="4.6" rx="0.3" fill="#f8fafc" stroke="#475569" strokeWidth="0.25" />
              <rect x="72.5" y="24" width="12" height="3.0" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="0.15" />
              <line x1="72.5" y1="25.5" x2="84.5" y2="25.5" stroke="#10b981" strokeWidth="0.3" strokeDasharray="1.5 1.0" />
              
              {/* Finished packs cartoning boxes conveyor */}
              <rect x="85.5" y="24.2" width="10" height="2.6" fill="url(#chain-conveyor)" stroke="#64748b" strokeWidth="0.2" />
              <rect x="87" y="24.6" width="1.6" height="1.8" fill="#d97706" rx="0.15" opacity="0.9" /> {/* Pack Box-1 */}
              <rect x="91" y="24.6" width="1.6" height="1.8" fill="#d97706" rx="0.15" opacity="0.9" /> {/* Pack Box-2 */}
            </g>

            {/* Central safety yellow pathway boundaries (hazard warning zones) */}
            <g>
              <rect x="8" y="47" width="84" height="6" fill="#fef08a" fillOpacity="0.05" stroke="#ca8a04" strokeWidth="0.2" strokeDasharray="2 2" />
              {/* Strips inside corridor 2111 */}
              {Array.from({ length: 20 }).map((_, i) => (
                <line key={`hazard-strip-${i}`} x1={10 + i * 4.2} y1="47.5" x2={12 + i * 4.2} y2="52.5" stroke="#f59e0b" strokeWidth="0.25" opacity="0.3" />
              ))}
            </g>

            {/* PTP I PACKING [2109] & BOTTLE II [2108 / 2123] lower machinery layout */}
            <g opacity="0.65">
              {/* PTP I Form-Fill-Seal Heavy machine blocks */}
              <rect x="36" y="65" width="10" height="5" rx="0.4" fill="#f1f5f9" stroke="#334155" strokeWidth="0.25" />
              <rect x="38" y="66" width="6" height="3" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="0.15" />
              {/* Pressure Pistons */}
              <rect x="39" y="62" width="1.2" height="3" fill="#475569" />
              <rect x="42.8" y="62" width="1.2" height="3" fill="#475569" />
              
              {/* Bottom Conveyor to storage */}
              <rect x="46" y="66.5" width="22" height="1.8" fill="url(#chain-conveyor)" stroke="#64748b" strokeWidth="0.15" />
              
              {/* Blister card stack chute loader */}
              <rect x="68" y="64" width="7" height="4.5" rx="0.2" fill="#f8fafc" stroke="#475569" strokeWidth="0.25" />
              {Array.from({ length: 6 }).map((_, i) => (
                <line key={`stack-chute-${i}`} x1="69" y1={64.8 + i * 0.6} x2="74" y2={64.8 + i * 0.6} stroke="#cbd5e1" strokeWidth="0.3" />
              ))}

              {/* Bottle II conveyor line curving down and right */}
              <path d="M 52 83 H 84" fill="none" stroke="#64748b" strokeWidth="0.8" />
              <path d="M 52 83 V 73" fill="none" stroke="#64748b" strokeWidth="0.8" />
              <circle cx="52" cy="83" r="0.75" fill="#334155" />
              <circle cx="84" cy="83" r="0.75" fill="#334155" />
              
              {/* Red articulated SCARA packaging robotic hand */}
              <g stroke="#dc2626" strokeWidth="0.45" strokeLinecap="round" fill="none">
                <line x1="58" y1="78" x2="61" y2="76" />
                <line x1="61" y1="76" x2="63" y2="79" />
                <circle cx="58" cy="78" r="0.4" fill="#334155" stroke="none" />
                <circle cx="61" cy="76" r="0.4" fill="#334155" stroke="none" />
                <circle cx="63" cy="79" r="0.2" fill="#ef4444" stroke="none animate-ping" />
              </g>
            </g>

            {/* Control Room / PC Room detail desk (Bottom Left) */}
            <g opacity="0.65">
              {/* Console Desks with dual monitor workstations layout */}
              <rect x="18" y="80" width="8" height="4.5" rx="0.3" fill="#cbd5e1" stroke="#475569" strokeWidth="0.25" />
              
              {/* LCD Screen-1 */}
              <rect x="18.8" y="80.4" width="2.8" height="1.0" fill="#0f172a" stroke="#475569" strokeWidth="0.1" />
              <rect x="19.0" y="80.6" width="2.4" height="0.6" fill="#10b981" opacity="0.8" /> {/* active screen 1 green */}

              {/* LCD Screen-2 */}
              <rect x="22.4" y="80.4" width="2.8" height="1.0" fill="#0f172a" stroke="#475569" strokeWidth="0.1" />
              <rect x="22.6" y="80.6" width="2.4" height="0.6" fill="#0ea5e9" opacity="0.8" /> {/* active screen 2 cyan */}
              
              {/* Keyboards */}
              <rect x="19.2" y="82.4" width="2.0" height="0.4" fill="#1e293b" />
              <rect x="22.8" y="82.4" width="2.0" height="0.4" fill="#1e293b" />
              
              {/* Desk operator seats */}
              <circle cx="20.2" cy="84.2" r="0.75" fill="#475569" />
              <circle cx="23.8" cy="84.2" r="0.75" fill="#475569" />
            </g>
          </svg>

          {/* Draw physical glass wall partitions, compartments, and columns to represent the actual rooms */}
          <div className="absolute inset-0 z-0 pointer-events-none text-[6.5px] font-mono select-none">
            {/* Visitor's Corridor Partition (Far Left) */}
            <div className="absolute left-0 top-0 bottom-0 w-[5%] border-r-2 border-slate-300 bg-slate-200/40 backdrop-blur-[0.5px] flex items-center justify-center [writing-mode:vertical-lr] font-bold text-slate-400 tracking-wider">
              VISITOR'S CORRIDOR [2161]
            </div>

            {/* Operator Zoom Left Area */}
            <div className="absolute left-[5%] top-0 w-[16%] h-[28%] border-b border-r border-slate-300/80 bg-slate-100/50 p-1.5 text-slate-400 font-semibold">
              Operator Zoom
            </div>

            {/* Washing No.12 Room Partition */}
            <div className="absolute left-[21%] top-0 w-[20%] h-[24%] border-b border-r border-[#cbd5e1] bg-[#f8fafc]/90 p-1.5 text-slate-400 font-semibold border-dashed">
              WASHING [2102]
              <div className="text-[5.5px] text-slate-400/80 mt-1">유압식 순환 분무 세척 구역</div>
            </div>

            {/* PC Room & Central Control Room (Bottom Left) */}
            <div className="absolute left-[5%] bottom-0 w-[24%] h-[24%] border-t border-r border-slate-300 bg-[#e9eff6] p-1.5 text-slate-500 font-semibold shadow-inner">
              <span className="text-slate-600 font-bold">Control Room & PC console</span>
              <div className="flex gap-1 mt-1 opacity-75">
                <div className="w-6 h-3.5 bg-slate-800 rounded-sm border border-slate-700 flex items-center justify-center text-[4px] text-cyan-300">PC-1</div>
                <div className="w-6 h-3.5 bg-slate-800 rounded-sm border border-slate-700 flex items-center justify-center text-[4px] text-cyan-300">PC-2</div>
              </div>
            </div>

            {/* Packaging Room III / PTP III / Bottle I Partition (Top Right) */}
            <div className="absolute left-[41%] top-0 right-0 h-[38%] border-b border-slate-300 bg-slate-50/50 p-1.5 flex flex-col justify-between items-end text-slate-400 font-semibold">
              <div className="text-right">
                <div className="tracking-wide">PTP III PACKAGING [2112/2118]</div>
                <div className="text-[5px] text-slate-400 font-semibold mt-0.5">BOTTLE I [2113/2117] / IPC [2114]</div>
              </div>
              <div className="w-20 h-1 bg-slate-300 rounded-full" />
            </div>

            {/* PTP I Packing / PTP Packaging (Bottom Center) */}
            <div className="absolute left-[30%] bottom-0 w-[44%] h-[38%] border-t border-l border-r border-slate-300 bg-[#fbfcfd]/95 p-1.5 text-[#334155] font-extrabold">
              PTP I PACKING [2109]
              <div className="text-[5px] text-slate-400 font-medium mt-0.5">PTP PACKAGING [2122] & BOTTLE II [2123]</div>
            </div>

            {/* Packaging Line Storage (포장라인 보관실 - Bottom Right with 3D shelves) */}
            <div className="absolute right-[1%] bottom-[1%] w-[23%] h-[30%] border border-slate-300/85 bg-[#f8fafc]/95 p-2 text-slate-500 font-bold rounded-lg flex flex-col justify-between shadow-sm">
              <div className="flex justify-between items-center border-b pb-0.5 border-slate-200">
                <span className="font-extrabold text-slate-700">포장라인 보관실 [2129]</span>
                <span className="text-[4.5px] bg-slate-200 px-1 py-0.2 rounded text-slate-400 font-mono">ZONE.2129</span>
              </div>
              {/* 3D Rack Shelf Visualizer */}
              <div className="grid grid-cols-2 gap-1.5 h-10">
                <div className="border-b-2 border-slate-400 bg-slate-100 min-h-[30px] flex items-end justify-around p-0.5">
                  <span className="w-2.5 h-4.5 bg-amber-500/80 border border-amber-600 rounded-sm shadow-sm animate-pulse" />
                  <span className="w-2 h-3 bg-blue-500/80 border border-blue-600 rounded-sm shadow-sm" />
                </div>
                <div className="border-b-2 border-slate-400 bg-slate-100 min-h-[30px] flex items-end justify-around p-0.5">
                  <span className="w-2.5 h-3.5 bg-emerald-500/80 border border-emerald-600 rounded-sm shadow-sm" />
                  <span className="w-2 h-5 bg-orange-500/80 border border-orange-600 rounded-sm shadow-sm" />
                </div>
              </div>
            </div>

            {/* Yellow Guide Lines for AMRs/AGVs (Safety guide roads) */}
            {/* Center Runway lines */}
            <div className="absolute top-[48%] left-[5%] right-[5%] h-5 bg-[#eab308]/5 border-t border-b border-[#eab308]/30 flex items-center justify-between px-4">
              <span className="text-[5.5px] text-[#ca8a04] font-bold tracking-widest bg-white px-1.5 py-0.2 rounded border border-[#eab308]/20">CORRIDOR 2111 / MAL IN-OUT 2119</span>
              <div className="flex gap-4 select-none pointer-events-none text-slate-400 text-[4.5px] font-mono">
                <span>MAL IN [2119]</span>
                <span>MAL OUT [2120]</span>
              </div>
            </div>
            {/* Runway Hazard Strips */}
            <div className="absolute top-[49.5%] left-[25%] right-[25%] h-1 border-t-2 border-dashed border-[#eab308] opacity-50" />
            <div className="absolute top-[62%] left-[45%] w-0.5 h-16 border-l-2 border-dashed border-[#eab308] opacity-50" />
          </div>

          {/* Animated Background Flow Pipelines */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-0 opacity-40" viewBox="0 0 100 100" preserveAspectRatio="none">
            {/* Inter-machine flow pipes lines connecting parts */}
            <path d="M 34 18 H 80" fill="none" stroke="#cbd5e1" strokeWidth="1.5" />
            <path d="M 80 18 V 72" fill="none" stroke="#cbd5e1" strokeWidth="1.5" />
            <path d="M 84 72 H 44" fill="none" stroke="#cbd5e1" strokeWidth="1.5" />
            <path d="M 44 72 V 48" fill="none" stroke="#cbd5e1" strokeWidth="1" />
            <path d="M 16 48 H 34" fill="none" stroke="#38bdf8" strokeWidth="0.8" strokeDasharray="2 2" />

            {/* Moving material flow particles inside pipelines */}
            <circle cx="50" cy="18" r="1.2" fill="#0ea5e9" className="animate-ping" style={{ animationDuration: '2.5s' }} />
            <circle cx="80" cy="45" r="1.2" fill="#10b981" className="animate-ping" style={{ animationDuration: '3.5s' }} />
          </svg>

          {/* SVG Overlay for Realtime Laser Tracking Beams */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" viewBox="0 0 100 100" preserveAspectRatio="none">
            {/* Render active laser pointing curves from speaker agent to physical machinery */}
            {(() => {
              if (events.length === 0) return null;
              const lastEv = events[events.length - 1];
              const speakerId = lastEv.fromAgent;

              // Grid Coordinates mapper
              const getAgentGridCoord = (id: string) => {
                switch (id) {
                  case 'safety': return { x: 19, y: 15 };
                  case 'pm': return { x: 36, y: 31 };
                  case 'prod': return { x: 59, y: 31 };
                  case 'qual': return { x: 84, y: 31 };
                  case 'logistics': return { x: 57, y: 83 };
                  case 'energy': return { x: 29, y: 83 };
                  case 'supervisor': return { x: 14, y: 45 };
                  default: return { x: 50, y: 50 };
                }
              };

              const getMachineGridCoord = (machId: string) => {
                switch (machId) {
                  case 'washing': return { x: 33, y: 18 };
                  case 'ptp': return { x: 79, y: 18 };
                  case 'bottle': return { x: 83, y: 72 };
                  case 'ess': return { x: 43, y: 72 };
                  case 'control': return { x: 15, y: 48 };
                  default: return { x: 50, y: 50 };
                }
              };

              const getAgentHexColor = (id: string) => {
                switch (id) {
                  case 'supervisor': return '#06b6d4';
                  case 'safety': return '#f43f5e';
                  case 'pm': return '#8b5cf6';
                  case 'prod': return '#3b82f6';
                  case 'qual': return '#10b981';
                  case 'energy': return '#f59e0b';
                  case 'logistics': return '#eab308';
                  default: return '#64748b';
                }
              };

              const speakerCoord = getAgentGridCoord(speakerId);
              
              // Map speaker to target facility
              let targetMachineId = 'control';
              if (speakerId === 'safety') {
                targetMachineId = 'washing';
              } else if (speakerId === 'pm') {
                targetMachineId = activeScenario === 0 ? 'ptp' : 'washing';
              } else if (speakerId === 'prod') {
                targetMachineId = activeScenario === 1 ? 'bottle' : 'ptp';
              } else if (speakerId === 'qual') {
                targetMachineId = activeScenario === 1 ? 'bottle' : 'ptp';
              } else if (speakerId === 'energy') {
                targetMachineId = 'ess';
              } else if (speakerId === 'logistics') {
                targetMachineId = 'ess';
              } else if (speakerId === 'supervisor') {
                // Holo sync - dispatch beams to ALL units (Extremely subtle, silent and non-painful)
                return (
                  <g>
                    {['washing', 'ptp', 'bottle', 'ess', 'control'].map((mId) => {
                      const mCoord = getMachineGridCoord(mId);
                      const sD = `M ${speakerCoord.x} ${speakerCoord.y} Q ${(speakerCoord.x + mCoord.x)/2} ${(speakerCoord.y + mCoord.y)/2 - 8} ${mCoord.x} ${mCoord.y}`;
                      return (
                        <g key={mId}>
                          <motion.path
                            d={sD}
                            fill="none"
                            stroke="#06b6d4"
                            strokeWidth="0.4"
                            strokeDasharray="1 6"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 1.2 }}
                            className="opacity-10 pointer-events-none"
                          />
                          <motion.path
                            d={sD}
                            fill="none"
                            stroke="#ffffff"
                            strokeWidth="0.4"
                            strokeDasharray="2 40"
                            animate={{ strokeDashoffset: [-120, 120] }}
                            transition={{ duration: 7.0, repeat: Infinity, ease: 'linear' }}
                            className="opacity-15 pointer-events-none"
                          />
                        </g>
                      );
                    })}
                  </g>
                );
              }

              const machineCoord = getMachineGridCoord(targetMachineId);
              const cx = (speakerCoord.x + machineCoord.x) / 2;
              const cy = ((speakerCoord.y + machineCoord.y) / 2) - 10;
              const pathD = `M ${speakerCoord.x} ${speakerCoord.y} Q ${cx} ${cy} ${machineCoord.x} ${machineCoord.y}`;
              const hexColor = getAgentHexColor(speakerId);

              return (
                <g>
                  {/* Soft background halo - Extremely low visual weight to remove eye strain */}
                  <motion.path
                    d={pathD}
                    fill="none"
                    stroke={hexColor}
                    strokeWidth="0.6"
                    className="opacity-10 blur-[0.5px] pointer-events-none"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.8 }}
                  />
                  {/* Subtle communications curve */}
                  <motion.path
                    d={pathD}
                    fill="none"
                    stroke={hexColor}
                    strokeWidth="0.4"
                    className="opacity-15 pointer-events-none"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.8 }}
                  />
                  {/* Gentle, non-painful linear pacing beads representing communication packets */}
                  <motion.path
                    d={pathD}
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="0.6"
                    strokeLinecap="round"
                    strokeDasharray="2 45"
                    animate={{ strokeDashoffset: [-120, 120] }}
                    transition={{ duration: 7.0, repeat: Infinity, ease: 'linear' }}
                    className="opacity-30 pointer-events-none"
                  />
                  {/* Silent target reference point */}
                  <circle cx={machineCoord.x} cy={machineCoord.y} r="1.5" fill="#ffffff" />
                  <circle
                    cx={machineCoord.x}
                    cy={machineCoord.y}
                    r="4.5"
                    fill="none"
                    stroke={hexColor}
                    strokeWidth="0.5"
                    className="opacity-20 pointer-events-none"
                  />
                </g>
              );
            })()}
          </svg>

          {/* Render Physical Facility Machines (The Digital Twin) */}
          <div className="absolute inset-0 pointer-events-none z-10">
            {/* Mach 1: Washing Hub (No.12 Gasket check area) */}
            <div className="absolute" style={{ top: '8%', left: '26%' }}>
              <FactoryUnit 
                id="washing" 
                title="Washing No.11/12" 
                subtitle="WASHING UNIT"
                status={activeScenario === 3 && step > 0 ? "LEAK WARN" : "STABLE"} 
                active={events.some(e => e.fromAgent === 'safety' || (e.fromAgent === 'pm' && activeScenario === 3))}
                critic={activeScenario === 3 && step > 0}
              />
            </div>

            {/* Mach 2: PTP Packaging Area */}
            <div className="absolute" style={{ top: '8%', left: '72%' }}>
              <FactoryUnit 
                id="ptp" 
                title="PTP Sealer 1" 
                subtitle="PTP PACKAGING"
                status={activeScenario === 0 && step > 0 ? "SPEED UP" : "NORMAL"} 
                active={events.some(e => (e.fromAgent === 'prod' && activeScenario !== 1) || e.fromAgent === 'qual')}
                critic={false}
              />
            </div>

            {/* Mach 3: Bottle II Filling Station */}
            <div className="absolute" style={{ top: '63%', left: '76%' }}>
              <FactoryUnit 
                id="bottle" 
                title="Bottle Filler II" 
                subtitle="BOTTLE PACK"
                status={activeScenario === 1 && step > 0 ? "FAST MODE" : "STABLE"} 
                active={events.some(e => (e.fromAgent === 'prod' && activeScenario === 1) || (e.fromAgent === 'qual' && activeScenario === 1))}
                critic={false}
              />
            </div>

            {/* Mach 4: ESS Storage Hub & AMR Dock */}
            <div className="absolute" style={{ top: '63%', left: '36%' }}>
              <FactoryUnit 
                id="ess" 
                title="ESS 120kW Bank" 
                subtitle="ENERGY / AMR"
                status={activeScenario === 4 && step > 0 ? "DISCHARGING" : "ONLINE"} 
                active={events.some(e => e.fromAgent === 'energy' || e.fromAgent === 'logistics')}
                critic={false}
              />
            </div>

            {/* Mach 5: Central AI Command Control Room Console */}
            <div className="absolute" style={{ top: '38%', left: '10%' }}>
              <FactoryUnit 
                id="control" 
                title="AI Supervisor Cores" 
                subtitle="CENTRAL HQ"
                status="ONLINE" 
                active={step === scenarios[activeScenario].timeline.length}
                critic={false}
              />
            </div>
          </div>

          {/* Render All 6 Domain Agents + AI Supervisor (The Humans & Holograms) */}
          <div className="absolute inset-0 z-20">
            {(() => {
              const ALL_AGENTS_LIST = [
                { id: 'supervisor', name: '종합 조율 AI', role: 'AI Supervisor', pos: { top: '38%', left: '4%' }, align: 'right' },
                { id: 'safety', name: '예지 감독관', role: 'HSE Safety', pos: { top: '8%', left: '10%' }, align: 'right' },
                { id: 'pm', name: '철수 기장', role: 'Maintenance', pos: { top: '24%', left: '25%' }, align: 'right' },
                { id: 'prod', name: '민혁 리드', role: 'Production', pos: { top: '24%', left: '50%' }, align: 'right' },
                { id: 'qual', name: '지수 연구원', role: 'Quality Assur', pos: { top: '24%', left: '76%' }, align: 'left' },
                { id: 'logistics', name: '동현 팀장', role: 'Logistics', pos: { top: '78%', left: '48%' }, align: 'left' },
                { id: 'energy', name: '선우 책임', role: 'Energy Grid', pos: { top: '78%', left: '20%' }, align: 'right' }
              ];

              const lastEvent = events[events.length - 1];

              return ALL_AGENTS_LIST.map((agent) => {
                const getAgentDetails = (id: string) => {
                  switch (id) {
                    case 'prod': return { name: '민혁 (생산 관리 리드)', role: 'Production Lead', helmetColor: '#3b82f6', badge: '생산가속' };
                    case 'qual': return { name: '지수 (품질 수석 연구원)', role: 'Quality Specialist', helmetColor: '#10b981', badge: '정밀검사' };
                    case 'pm': return { name: '철수 (예지정비 총괄 기장)', role: 'Chief Mechanic', helmetColor: '#8b5cf6', badge: '예후진단' };
                    case 'energy': return { name: '선우 (그리드 에너지 엔지니어)', role: 'Energy Engineer', helmetColor: '#f59e0b', badge: '피크감축' };
                    case 'safety': return { name: '예지 (안전환경 감독관)', role: 'HSE Supervisor', helmetColor: '#ef4444', badge: '위험감시' };
                    case 'logistics': return { name: '동현 (물류 이송 지휘관)', role: 'Logistics Supervisor', helmetColor: '#eab308', badge: 'AMR우회' };
                    default: return { name: '종합 조율 AI (오케스트레이터)', role: 'AI Orchestrator', helmetColor: '#00f0ff', badge: '종합중재' };
                  }
                };

                const details = getAgentDetails(agent.id);
                const isSpeaking = lastEvent?.fromAgent === agent.id;
                const isParticipant = scenarios[activeScenario].agents.some(a => a.id === agent.id) || agent.id === 'supervisor';

                // Setup Bubble Float placements to be beautifully visible and centered
                const bubbleStyle: React.CSSProperties = agent.align === 'right' 
                  ? { left: '115%', top: '-25px' } 
                  : { right: '115%', top: '-25px' };

                const bubbleTailStyle: React.CSSProperties = agent.align === 'right'
                  ? { left: '-5px', top: '24px', borderLeft: '1px solid currentColor', borderBottom: '1px solid currentColor', transform: 'rotate(45deg)' }
                  : { right: '-5px', top: '24px', borderRight: '1px solid currentColor', borderTop: '1px solid currentColor', transform: 'rotate(45deg)' };

                return (
                  <div 
                    key={agent.id}
                    className="absolute transition-all duration-300"
                    style={{ 
                      top: agent.pos.top, 
                      left: agent.pos.left,
                      opacity: isParticipant ? 1 : 0.22,
                      pointerEvents: isParticipant ? 'auto' : 'none'
                    }}
                  >
                    <div className="flex flex-col items-center select-none relative">
                      {/* Avatar with live Speaking visual effect */}
                      <div className="relative cursor-pointer group">
                        <AgentAvatarIcon id={agent.id} width={48} height={48} active={isSpeaking} />
                        
                        {/* Status Label Clip below Avatar */}
                        {!isParticipant && (
                          <div className="absolute top-0 right-0 bg-slate-350 border border-slate-400 rounded-full px-1 text-[5px] text-slate-500 font-bold uppercase shadow-sm">STBY</div>
                        )}
                        {isParticipant && !isSpeaking && (
                          <div className="absolute top-0 right-0 bg-slate-800 border border-slate-650 rounded-full px-1.5 text-[6px] text-slate-200 font-bold shadow-sm">{details.badge}</div>
                        )}
                        {isSpeaking && (
                          <div className="absolute -top-1 -right-2 bg-gradient-to-r from-[#0ea5e9] to-[#06b6d4] border border-white/40 rounded-full px-1.5 py-0.5 text-[6.5px] text-white font-black animate-bounce flex items-center gap-0.5 shadow-md">
                            <span className="relative flex h-1.5 w-1.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white"></span>
                            </span>
                            TALK
                          </div>
                        )}
                      </div>

                      {/* Character Label Text card */}
                      <div className="mt-1 bg-white/95 border border-slate-300/80 rounded-md px-1.5 py-0.5 text-center min-w-[76px] shadow-sm">
                        <div className="text-[8px] font-black text-slate-800 whitespace-nowrap line-clamp-1">{agent.name}</div>
                        <div className="text-[6px] text-slate-500 uppercase tracking-wider font-extrabold line-clamp-1">{agent.role}</div>
                      </div>

                      {/* Animated Speech Dialogue Ballons in glossy frosted-glass light theme */}
                      <AnimatePresence>
                        {isSpeaking && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.88, y: 8 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.88, y: 8 }}
                            className={cn(
                              "absolute p-3 rounded-2xl border shadow-2xl z-30 transition-all w-[240px] text-slate-800 bg-[#ffffff]",
                              agent.id === 'supervisor' 
                                ? "border-cyan-400 border-2 bg-gradient-to-br from-[#ffffff] to-[#e0f2fe] text-cyan-950 shadow-cyan-100" 
                                : `border-slate-300 shadow-slate-200`
                            )}
                            style={{
                              ...bubbleStyle,
                              borderColor: agent.id === 'supervisor' ? '#22d3ee' : details.helmetColor
                            }}
                          >
                            {/* Balloon tail pointer arrow */}
                            <div 
                              className="absolute w-2.5 h-2.5 bg-[#ffffff]"
                              style={{
                                ...bubbleTailStyle,
                                backgroundColor: agent.id === 'supervisor' ? '#f0f9ff' : '#ffffff',
                                borderColor: agent.id === 'supervisor' ? '#22d3ee' : details.helmetColor
                              }}
                            />
                            
                            <div className="flex items-center gap-2 mb-1 border-b pb-1 border-slate-200/80">
                              <span 
                                className="text-[7.5px] font-black uppercase px-2 py-0.5 rounded shadow-sm"
                                style={{
                                  backgroundColor: `${details.helmetColor}15`,
                                  color: details.helmetColor
                                }}
                              >
                                {lastEvent.type}
                              </span>
                              <span className="text-[7px] text-slate-400 font-mono">{lastEvent.timestamp}</span>
                            </div>
                            <p className="text-[10px] leading-relaxed font-bold text-slate-700">
                              {lastEvent.content}
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      </div>

      {/* Event Log Timeline */}
      <div className="bg-surface border border-border rounded-2xl overflow-hidden flex flex-col h-[200px]">
        <div className="px-4 py-2 border-b border-border bg-surface-hover/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History size={14} className="text-accent" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Orchestration Event Log</span>
          </div>
          <span className="text-[9px] text-text-secondary">{events.length} events recorded</span>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {events.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-text-secondary gap-2 opacity-50">
              <Loader2 size={16} className="animate-spin" />
              <span className="text-[10px]">Waiting for agent proposals...</span>
            </div>
          ) : (
            events.map((event, idx) => {
              const agent = scenarios[activeScenario].agents.find(a => a.id === event.fromAgent) || 
                            (event.fromAgent === 'supervisor' ? { name: 'AI Supervisor', color: 'text-accent', icon: <Cpu size={12} /> } : null);
              
              return (
                <motion.div 
                  key={event.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex gap-3 group"
                >
                  <div className="flex flex-col items-center gap-1">
                    <div className={cn(
                      "w-6 h-6 rounded-lg flex items-center justify-center border border-border",
                      event.fromAgent === 'supervisor' ? "bg-accent/10 border-accent/30" : "bg-bg"
                    )}>
                      {agent?.icon}
                    </div>
                    {idx !== events.length - 1 && <div className="w-px flex-1 bg-border" />}
                  </div>
                  <div className="flex-1 pb-2">
                    <div className="flex items-center justify-between mb-0.5">
                      <div className="flex items-center gap-2">
                        <span className={cn("text-[10px] font-bold", agent?.color)}>{agent?.name}</span>
                        <span className={cn(
                          "text-[8px] font-bold uppercase px-1 rounded",
                          event.type === 'proposal' ? "text-blue-500 bg-blue-500/10" :
                          event.type === 'critique' ? "text-red-500 bg-red-500/10" :
                          event.type === 'agreement' ? "text-emerald-500 bg-emerald-500/10" :
                          "text-text-secondary bg-surface-hover"
                        )}>{event.type}</span>
                      </div>
                      <span className="text-[9px] font-mono text-text-secondary">{event.timestamp}</span>
                    </div>
                    <p className="text-[11px] text-text-primary leading-relaxed">{event.content}</p>
                    {event.reasoning && (
                      <div className="mt-2 p-2 rounded-lg bg-accent/5 border border-accent/10">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Target size={10} className="text-accent" />
                          <span className="text-[9px] font-bold text-accent uppercase tracking-wider">Decision Basis</span>
                        </div>
                        <p className="text-[10px] text-text-secondary italic">{event.reasoning}</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}


function OrchestrationCenterModal({ 
  isOpen, 
  onClose,
  isTourMode = false,
  tourScenarioIdx = 0
}: { 
  isOpen: boolean; 
  onClose: () => void;
  isTourMode?: boolean;
  tourScenarioIdx?: number;
}) {
  const [activeTab, setActiveTab] = useState<'visualization' | 'methodology'>('visualization');

  if (!isOpen) return null;

  const methodologyContent = `
# Hierarchical Message-Based Orchestration (HMBO) Framework

## 1. 개요
HMBO는 복잡한 제조 환경에서 다수의 특화 AI 에이전트들이 상호 협력하고 충돌을 해결하기 위한 계층적 의사결정 프레임워크입니다.

## 2. 핵심 메커니즘
*   **Proposal (제안)**: 각 도메인 에이전트(품질, 생산, 에너지 등)가 자신의 목표 최적화를 위한 액션을 제안합니다.
*   **Critique (비판)**: 제안된 액션이 다른 도메인의 가드레일이나 목표를 침해할 경우, 해당 에이전트가 반대 의견과 근거를 제시합니다.
*   **Info (정보 제공)**: 의사결정에 필요한 추가 데이터나 상황 정보를 공유합니다.
*   **Agreement (합의)**: AI 슈퍼바이저가 모든 의견을 종합하고, 전사적 우선순위(예: 안전 > 품질 > 생산)에 따라 최종 결정을 내립니다.

## 3. 의사결정 계층
1.  **L1: Safety Layer**: 물리적 위험 및 법적 규제 준수 여부 판단
2.  **L2: Policy Layer**: 전사 운영 정책(품질 우선, 비용 절감 등) 반영
3.  **L3: Optimization Layer**: 도메인 간 트레이드오프 조율 및 최적값 도출

## 4. 기대 효과
*   **의사결정 투명성**: 모든 에이전트의 발언과 슈퍼바이저의 판단 근거가 로그로 남습니다.
*   **유연한 정책 대응**: 전사 정책 변경 시 슈퍼바이저의 가드레일 설정만으로 전체 에이전트의 행동을 제어할 수 있습니다.
*   **실시간 최적화**: 인간 관리자가 개입하기 어려운 초단위 공정 변화에 즉각 대응합니다.
`;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-bg/80 backdrop-blur-xl"
    >
      <div className="bg-surface border border-border w-full max-w-5xl h-full max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-8 py-6 border-b border-border flex items-center justify-between bg-surface-hover/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center text-accent shadow-inner">
              <GitBranch size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black tracking-tight text-text-primary">AI 오케스트레이션 센터</h2>
                <span className="px-2 py-0.5 rounded-full bg-accent/10 text-accent text-[9px] font-bold border border-accent/20">v1.0.5-STABLE</span>
              </div>
              <p className="text-[10px] text-text-secondary mt-1 font-medium uppercase tracking-wider">Hierarchical Message-Based Orchestration Framework (HMBO)</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-surface-hover text-text-secondary transition-all hover:text-text-primary border border-transparent hover:border-border"
          >
            <X size={24} />
          </button>
        </div>

        {/* Tabs Selection */}
        <div className="px-8 pt-4 flex gap-6 border-b border-border bg-surface">
          <button 
            onClick={() => setActiveTab('visualization')}
            className={cn(
              "pb-4 text-xs font-bold uppercase tracking-widest transition-all relative",
              activeTab === 'visualization' ? "text-accent" : "text-text-secondary hover:text-text-primary"
            )}
          >
            Visualization
            {activeTab === 'visualization' && <motion.div layoutId="modal-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />}
          </button>
          <button 
            onClick={() => setActiveTab('methodology')}
            className={cn(
              "pb-4 text-xs font-bold uppercase tracking-widest transition-all relative",
              activeTab === 'methodology' ? "text-accent" : "text-text-secondary hover:text-text-primary"
            )}
          >
            Methodology
            {activeTab === 'methodology' && <motion.div layoutId="modal-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />}
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="max-w-5xl mx-auto">
            {activeTab === 'visualization' ? (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold mb-2">에이전트 간 의사결정 조율 시각화</h3>
                  <p className="text-sm text-text-secondary">Supervisor가 각 도메인 특화 에이전트들의 제안을 수집하고, 우선순위 및 가드레일에 따라 최종 합의를 도출하는 과정을 보여줍니다.</p>
                </div>
                <CoordinationVisualizer isTourMode={isTourMode} tourScenarioIdx={tourScenarioIdx} />
              </div>
            ) : (
              <div className="prose prose-invert prose-sm max-w-none">
                <div className="markdown-body">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {methodologyContent}
                  </ReactMarkdown>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-8 py-4 border-t border-border bg-surface-hover/30 flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-accent text-bg rounded-xl font-bold text-sm hover:opacity-90 transition-opacity"
          >
            확인 및 닫기
          </button>
        </div>
      </div>
    </motion.div>
  );
}


function SupervisorCenterView({ 
  isTourMode = false, 
  tourScenarioIdx = 0 
}: { 
  isTourMode?: boolean; 
  tourScenarioIdx?: number; 
}) {
  const [isOrchestrationOpen, setIsOrchestrationOpen] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<{gain: string, risk: string} | null>(null);
  const [evidencePacks, setEvidencePacks] = useState<EvidencePack[]>([]);
  const [coordinationEvents, setCoordinationEvents] = useState<CoordinationEvent[]>(MOCK_COORDINATION_EVENTS.slice(0, 2));

  const [playbooks] = useState<Playbook[]>(MOCK_PLAYBOOKS);

  useEffect(() => {
    // When Supervisor center is viewed, complete Step 3 checklist items
    window.dispatchEvent(new CustomEvent('tour-action', { detail: { step: 2, checklistIdx: 0 } }));
    window.dispatchEvent(new CustomEvent('tour-action', { detail: { step: 2, checklistIdx: 1 } }));
  }, []);

  const getActiveGoal = (): Goal => {
    if (!isTourMode) return MOCK_GOALS[0];
    
    switch (tourScenarioIdx) {
      case 1: // Scenario B
        return {
          id: 'G_B',
          title: "돌발 감지 분격 및 L1 안전 차단 가드",
          status: "In Progress",
          tasks: [
            { agentId: 'Safety Agent', task: "A-3 안전 환기댐퍼 100% 개방 조치 완료", progress: 100 },
            { agentId: 'PM Agent', task: "가열 마찰 부하 예지 정비 팀 배치 워크오더 접수 완료", progress: 100 },
            { agentId: 'Production Agent', task: "B라인 가속 일시 감속(85%) 및 가드 제어 모드 유지", progress: 100 }
          ]
        };
      case 2: // Scenario C
        return {
          id: 'G_C',
          title: "한낮 에너지 전력 피크 셰이빙 및 절전",
          status: "In Progress",
          tasks: [
            { agentId: 'Energy Agent', task: "배기팬 충방전 제약 및 ESS 120kW 방전 모드 실행", progress: 100 },
            { agentId: 'PM Agent', task: "칠러 냉각수 순측 유압 보강 예지 정비 접수", progress: 100 },
            { agentId: 'Production Agent', task: "비핵심 조업 건조실 냉간 감속 세이빙 완료", progress: 95 }
          ]
        };
      case 3: // Scenario D
        return {
          id: 'G_D',
          title: "긴급 딜리버리 초속 가용 및 품질 보증 관리",
          status: "In Progress",
          tasks: [
            { agentId: 'Logistics Agent', task: "패키징 1라인 120% 초속 가이 딜리버리 합의 완료", progress: 100 },
            { agentId: 'Quality Agent', task: "밀착 진공 노즐 접착 기압 증합 보완 사수", progress: 95 },
            { agentId: 'PM Agent', task: "초고부하 정성 유성 기어 부품 사후 예약 배치 완료", progress: 100 }
          ]
        };
      case 0:
      default:
        return {
          id: 'G_A',
          title: "전사 가동 효율 OEE 극대화",
          status: "In Progress",
          tasks: [
            { agentId: 'Quality Agent', task: "실시간 불량 7.3% 차단 최적 온도 173°C 조도 유지", progress: 95 },
            { agentId: 'PM Agent', task: "수축포장기 예지보전 자동 급유 장치 기동 완료", progress: 100 },
            { agentId: 'Energy Agent', task: "부하 완화 절전 정책 수립", progress: 90 },
            { agentId: 'Safety Agent', task: "L1 Safety Layer 수칙 가드 가동", progress: 100 }
          ]
        };
    }
  };
  
  const activeGoal = getActiveGoal();

  const getConflictResolverData = () => {
    if (!isTourMode) {
      return {
        conflict: "생산성 극대화(Tact 단축) vs 검사 정확도(속도 제한) 상충 발생.",
        resolution: "Resolved: 품질 우선 정책 적용"
      };
    }
    switch (tourScenarioIdx) {
      case 1:
        return {
          conflict: "C구역 가스 감지 환기팬 완전 가동 시 기기 압력 변화로 생산 정지 상충 발생.",
          resolution: "Resolved: L1 Safety 우선 제어 및 부분 우회 이송"
        };
      case 2:
        return {
          conflict: "한낮 피크 전력 칠러 감속 가이드 vs 출하량 미달 생산 가동 속도 유지 상충 발생.",
          resolution: "Resolved: ESS 즉각 전원 방전 지원 및 비핵심 순차 제어 완충"
        };
      case 3:
        return {
          conflict: "출량 초가속 120% 스루풋 vs 접합 정밀 노즐 온도 밀착 스크래치 결합 우려 상충 발생.",
          resolution: "Resolved: 냉각수 밸브 2도 보정 및 진공 밀착 유압 상향"
        };
      case 0:
      default:
        return {
          conflict: "생산성 극대화(Tact 단축) vs 검사 정확도(속도 제한) 상충 발생.",
          resolution: "Resolved: 품질 우선 정책 적용"
        };
    }
  };
  const conflictData = getConflictResolverData();

  const getSimulationResult = () => {
    if (!isTourMode) {
      return {
        gain: "생산성 +5.2% 예상",
        risk: "품질 리스크 -1.5% 감소"
      };
    }
    switch (tourScenarioIdx) {
      case 1:
        return {
          gain: "가스 누출 농도 80% 가속 희석",
          risk: "안전 폭발 가드레일 위험도 0.05% 격하"
        };
      case 2:
        return {
          gain: "한전 긴급 수요 감전 250kW 즉시 감축 완수",
          risk: "위약 가산 페널티 회피 성공 (예상 절감: 1,200만원)"
        };
      case 3:
        return {
          gain: "납량 긴급 수송량 100% 한시 조기 수용",
          risk: "진공 유압 증대로 표면 원형 성형 스크래치 불량률 0.0% 보증"
        };
      case 0:
      default:
        return {
          gain: "생산성 +5.2% 예상",
          risk: "품질 리스크 -1.5% 감소"
        };
    }
  };

  const handleSimulate = () => {
    setIsSimulating(true);
    // Dispatches checks
    window.dispatchEvent(new CustomEvent('tour-action', { detail: { step: 2, checklistIdx: 0 } }));
    window.dispatchEvent(new CustomEvent('tour-action', { detail: { step: 2, checklistIdx: 1 } }));
    setTimeout(() => {
      setIsSimulating(false);
      setSimulationResult(getSimulationResult());
    }, 2000);
  };

  const generateEvidencePack = () => {
    // Dispatches checks
    window.dispatchEvent(new CustomEvent('tour-action', { detail: { step: 2, checklistIdx: 0 } }));
    window.dispatchEvent(new CustomEvent('tour-action', { detail: { step: 2, checklistIdx: 1 } }));
    const newPack: EvidencePack = {
      id: `EP-${Date.now()}`,
      decisionId: 'D-1024',
      timestamp: new Date().toISOString(),
      goal: activeGoal.title,
      reasoning: "비전 검사 데이터와 라인 부하율을 종합 분석한 결과, 품질 우선 정책에 따라 속도 제한이 최적의 선택임.",
      dataSnapshots: [
        { sensorId: 'VIB-01', value: 3.2 },
        { sensorId: 'TEMP-01', value: 78.5 }
      ],
      policyApplied: 'Quality',
      approver: 'oddeye2796@gmail.com'
    };
    setEvidencePacks([newPack, ...evidencePacks]);
  };

  return (
    <div className="p-8 space-y-8 overflow-y-auto h-full pb-20">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Supervisor Orchestrator</h2>
          <p className="text-text-secondary text-sm mt-1">통합 판단, 목표 관리 및 플레이북 실행 센터</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsOrchestrationOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-accent/10 text-accent border border-accent/20 rounded-lg text-xs font-bold hover:bg-accent/20 transition-colors"
          >
            <GitBranch size={16} />
            AI 오케스트레이션
          </button>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-accent/10 border border-accent/20 rounded-full">
            <ShieldCheck size={14} className="text-accent" />
            <span className="text-[10px] font-bold text-accent uppercase tracking-wider">Policy: Quality First</span>
          </div>
          <button 
            onClick={generateEvidencePack}
            className="flex items-center gap-2 px-4 py-2 bg-surface border border-border rounded-lg text-xs font-bold hover:bg-surface-hover transition-colors"
          >
            <FileText size={16} />
            Generate Evidence Pack
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Goal & Task Decomposition */}
        <div className="lg:col-span-2 space-y-6">
          <div className="dashboard-card">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Target size={16} className="text-accent" />
                Active Goal: {activeGoal.title}
              </h3>
              <span className="px-2 py-1 rounded bg-accent/10 text-accent text-[10px] font-bold uppercase tracking-widest">
                {activeGoal.id === 'G_B' ? 'ACTIVE (EMERGENCY)' :
                 activeGoal.id === 'G_C' ? 'ACTIVE (PEAK)' :
                 activeGoal.id === 'G_D' ? 'ACTIVE (RUSH ORDER)' :
                 activeGoal.status}
              </span>
            </div>
            
            <div className="space-y-6">
              {activeGoal.tasks.map((task, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold">{task.agentId}</span>
                    <span className="text-text-secondary">{task.task}</span>
                    <span className="font-mono">{task.progress}%</span>
                  </div>
                  <div className="h-1.5 bg-surface-hover rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${task.progress}%` }}
                      className="h-full bg-accent"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Conflict Resolver & Ensemble */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="dashboard-card">
              <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                <GitBranch size={16} className="text-accent" />
                Conflict Resolver
              </h3>
              <div className="p-4 rounded-lg bg-surface-hover border border-border space-y-3">
                <div className="flex items-center justify-between text-[10px] uppercase font-bold tracking-wider text-text-secondary">
                  <span>Conflict Detected</span>
                  <span className="text-orange-500">High Priority</span>
                </div>
                <p className="text-xs leading-relaxed">
                  {conflictData.conflict}
                </p>
                <div className="pt-2 border-t border-border flex items-center gap-2 text-accent">
                  <CheckCircle2 size={14} />
                  <span className="text-xs font-bold">{conflictData.resolution}</span>
                </div>
              </div>
            </div>

            <div className="dashboard-card">
              <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                <Users size={16} className="text-accent" />
                Ensemble / Voting
              </h3>
              <div className="flex items-center justify-around py-2">
                {['Quality', 'Line', 'Safety'].map(agent => (
                  <div key={agent} className="text-center space-y-2">
                    <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center mx-auto border border-accent/20">
                      <CheckCircle2 size={16} className="text-accent" />
                    </div>
                    <span className="text-[10px] font-bold text-text-secondary uppercase">{agent}</span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-center text-text-secondary mt-4">
                3개 에이전트 합의 완료 (신뢰도 98.2%)
              </p>
            </div>
          </div>

          {/* Simulation & Execution */}
          <div className="dashboard-card">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <PlayCircle size={16} className="text-accent" />
                Simulate Before Execute
              </h3>
              <button 
                onClick={handleSimulate}
                disabled={isSimulating}
                className="px-4 py-2 bg-accent text-bg rounded-lg text-xs font-bold disabled:opacity-50"
              >
                {isSimulating ? 'Simulating...' : 'Run Simulation'}
              </button>
            </div>

            {isSimulating ? (
              <div className="h-24 flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-text-secondary animate-pulse">디지털 트윈 환경에서 리스크 검증 중...</span>
              </div>
            ) : simulationResult ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3">
                  <TrendingUp className="text-emerald-500" size={20} />
                  <div>
                    <div className="text-[10px] font-bold text-emerald-500 uppercase">Expected Gain</div>
                    <div className="text-sm font-bold">{simulationResult.gain}</div>
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center gap-3">
                  <ShieldCheck className="text-blue-500" size={20} />
                  <div>
                    <div className="text-[10px] font-bold text-blue-500 uppercase">Risk Mitigation</div>
                    <div className="text-sm font-bold">{simulationResult.risk}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-24 flex items-center justify-center border-2 border-dashed border-border rounded-xl">
                <span className="text-xs text-text-secondary">시뮬레이션을 실행하여 조치 전 리스크를 확인하세요.</span>
              </div>
            )}
          </div>

          {/* Real-time Agent Coordination Feed */}
          <div className="dashboard-card">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <MessageSquare size={16} className="text-accent" />
                Real-time Agent Coordination
              </h3>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Live Feed</span>
              </div>
            </div>

            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              <AnimatePresence initial={false}>
                {coordinationEvents.map((event, idx) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4 }}
                    className={cn(
                      "p-4 rounded-xl border relative overflow-hidden",
                      event.type === 'conflict' ? "bg-red-500/5 border-red-500/20" :
                      event.type === 'critique' ? "bg-orange-500/5 border-orange-500/20" :
                      event.type === 'agreement' ? "bg-emerald-500/5 border-emerald-500/20" :
                      "bg-surface-hover border-border"
                    )}
                  >
                    {/* Event Type Indicator */}
                    <div className={cn(
                      "absolute top-0 left-0 w-1 h-full",
                      event.type === 'conflict' ? "bg-red-500" :
                      event.type === 'critique' ? "bg-orange-500" :
                      event.type === 'agreement' ? "bg-emerald-500" :
                      "bg-accent"
                    )} />

                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-accent uppercase">{event.fromAgent}</span>
                        <ArrowRight size={10} className="text-text-secondary" />
                        <span className="text-[10px] font-bold text-text-secondary uppercase">{event.toAgent}</span>
                      </div>
                      <span className="text-[10px] font-mono text-text-secondary">
                        {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>

                    <p className="text-xs leading-relaxed text-text-primary">
                      {event.content}
                    </p>

                    <div className="mt-2 flex items-center gap-2">
                      <span className={cn(
                        "text-[8px] font-bold uppercase px-1.5 py-0.5 rounded",
                        event.type === 'conflict' ? "bg-red-500/20 text-red-500" :
                        event.type === 'critique' ? "bg-orange-500/20 text-orange-500" :
                        event.type === 'agreement' ? "bg-emerald-500/20 text-emerald-500" :
                        "bg-accent/20 text-accent"
                      )}>
                        {event.type}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Playbooks & Evidence Packs */}
        <div className="space-y-6">
          <div className="dashboard-card">
            <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
              <BookOpen size={16} className="text-accent" />
              Auto Playbooks (ITTT)
            </h3>
            <div className="space-y-3">
              {playbooks.map(pb => (
                <div key={pb.id} className="p-3 rounded-lg bg-surface-hover border border-border hover:border-accent/50 transition-colors cursor-pointer group">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold group-hover:text-accent">{pb.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-bold uppercase">{pb.status}</span>
                  </div>
                  <div className="text-[10px] text-text-secondary flex items-center gap-1">
                    <Zap size={10} />
                    Trigger: {pb.triggerEvent}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="dashboard-card">
            <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
              <History size={16} className="text-accent" />
              Recent Evidence Packs
            </h3>
            <div className="space-y-4">
              {evidencePacks.length > 0 ? (
                evidencePacks.map(pack => (
                  <div key={pack.id} className="p-3 rounded-lg border border-border space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold text-accent">{pack.id}</span>
                      <span className="text-[10px] text-text-secondary">{new Date(pack.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-[10px] leading-relaxed line-clamp-2">{pack.reasoning}</p>
                    <div className="flex items-center gap-2 pt-2 border-t border-border">
                      <div className="w-4 h-4 rounded-full bg-surface-hover flex items-center justify-center">
                        <User size={10} className="text-text-secondary" />
                      </div>
                      <span className="text-[10px] text-text-secondary">{pack.approver}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center">
                  <FileText size={24} className="text-border mx-auto mb-2" />
                  <p className="text-[10px] text-text-secondary">생성된 증거 패키지가 없습니다.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <OrchestrationCenterModal 
        isOpen={isOrchestrationOpen} 
        onClose={() => setIsOrchestrationOpen(false)} 
        isTourMode={isTourMode}
        tourScenarioIdx={tourScenarioIdx}
      />
    </div>
  );
}


function VisionInspectionViewer() {
  const [status, setStatus] = useState<'Ready' | 'Inspecting' | 'Complete'>('Ready');
  const [currentResult, setCurrentResult] = useState<'OK' | 'NG' | null>(null);
  const [history, setHistory] = useState<{id: number, time: string, result: 'OK' | 'NG'}[]>(
    Array.from({ length: 8 }, (_, i) => ({
      id: 100 - i,
      time: new Date(Date.now() - i * 60000).toLocaleTimeString(),
      result: Math.random() > 0.05 ? 'OK' : 'NG'
    }))
  );
  const [counters, setCounters] = useState({ box: 3, total: 1000, ok: 33, ng: 1 });

  const startInspection = () => {
    if (status === 'Inspecting') return;
    setStatus('Inspecting');
    setCurrentResult(null);
    
    // Simulate inspection steps
    setTimeout(() => {
      const isOk = Math.random() > 0.05;
      setCurrentResult(isOk ? 'OK' : 'NG');
      setStatus('Complete');
      
      const newEntry = {
        id: history[0].id + 1,
        time: new Date().toLocaleTimeString(),
        result: (isOk ? 'OK' : 'NG') as 'OK' | 'NG'
      };
      
      setHistory(prev => [newEntry, ...prev].slice(0, 10));
      setCounters(prev => ({
        ...prev,
        box: prev.box + 1,
        ok: isOk ? prev.ok + 1 : prev.ok,
        ng: !isOk ? prev.ng + 1 : prev.ng
      }));
    }, 2500);
  };

  return (
    <div className="flex flex-col gap-4 bg-[#050505] p-6 rounded-2xl border border-white/10 font-mono text-white shadow-2xl">
      {/* Top Control Bar - HMI Style */}
      <div className="flex items-center justify-between bg-[#111] p-4 rounded-xl border border-white/10 shadow-inner">
        <div className="flex items-center gap-6">
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-text-secondary uppercase tracking-[0.2em] mb-1">Operation Control</span>
            <div className="flex items-center gap-2">
              <button 
                onClick={startInspection}
                disabled={status === 'Inspecting'}
                className={cn(
                  "flex items-center gap-2 px-6 py-2 rounded-md font-bold text-sm transition-all border",
                  status === 'Inspecting' 
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500/50 cursor-not-allowed" 
                    : "bg-emerald-500/20 border-emerald-500/50 text-emerald-500 hover:bg-emerald-500/30 active:scale-95 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                )}
              >
                <Play size={16} fill="currentColor" />
                시작 (START)
              </button>
              <button 
                onClick={() => setStatus('Ready')}
                className="flex items-center gap-2 px-6 py-2 rounded-md font-bold text-sm transition-all border bg-red-500/20 border-red-500/50 text-red-500 hover:bg-red-500/30 active:scale-95 shadow-[0_0_15px_rgba(239,68,68,0.2)]"
              >
                <Square size={14} fill="currentColor" />
                정지 (STOP)
              </button>
            </div>
          </div>
          
          <div className="h-12 w-[1px] bg-white/10" />
          
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-text-secondary uppercase tracking-[0.2em] mb-1">System Status</span>
            <div className="flex items-center gap-3 bg-black/40 px-4 py-2 rounded border border-white/5">
              <div className={cn(
                "w-3 h-3 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)]",
                status === 'Ready' ? "bg-blue-500 shadow-blue-500/50" : 
                status === 'Inspecting' ? "bg-yellow-500 shadow-yellow-500/50 animate-pulse" : 
                "bg-emerald-500 shadow-emerald-500/50"
              )} />
              <span className={cn(
                "text-sm font-black tracking-tighter uppercase",
                status === 'Ready' ? "text-blue-400" : 
                status === 'Inspecting' ? "text-yellow-400" : 
                "text-emerald-400"
              )}>
                {status === 'Ready' ? 'SYSTEM READY' : status === 'Inspecting' ? 'INSPECTING...' : 'INSPECTION COMPLETE'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 text-right">
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-text-secondary uppercase tracking-[0.2em]">Cycle Time</span>
            <span className="text-lg font-black text-accent">2.45s</span>
          </div>
          <div className="h-10 w-[1px] bg-white/10" />
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-text-secondary uppercase tracking-[0.2em]">Line Speed</span>
            <span className="text-lg font-black text-white">42 bpm</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Left Sidebar Counters - Industrial Look */}
        <div className="col-span-2 flex flex-col gap-3">
          <div className="bg-[#111] p-4 rounded-xl border border-white/10 flex flex-col gap-1 shadow-inner">
            <span className="text-[9px] font-bold text-text-secondary uppercase tracking-widest">Box Counter</span>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black text-white">{counters.box}</span>
              <span className="text-xs text-text-secondary">/ {counters.total}</span>
            </div>
            <div className="w-full h-1 bg-white/5 rounded-full mt-2 overflow-hidden">
              <div className="h-full bg-accent" style={{ width: `${(counters.box / counters.total) * 100}%` }} />
            </div>
          </div>
          
          <div className="bg-[#111] p-4 rounded-xl border border-emerald-500/20 flex flex-col gap-1 shadow-inner">
            <span className="text-[9px] font-bold text-emerald-500/70 uppercase tracking-widest">OK Count</span>
            <span className="text-3xl font-black text-emerald-500">{counters.ok}</span>
          </div>
          
          <div className="bg-[#111] p-4 rounded-xl border border-red-500/20 flex flex-col gap-1 shadow-inner">
            <span className="text-[9px] font-bold text-red-500/70 uppercase tracking-widest">NG Count</span>
            <span className="text-3xl font-black text-red-500">{counters.ng}</span>
          </div>

          <div className="mt-auto bg-accent/5 p-4 rounded-xl border border-accent/20">
            <div className="text-[9px] font-bold text-accent uppercase tracking-widest mb-2">Yield Rate</div>
            <div className="text-2xl font-black text-accent">
              {((counters.ok / (counters.ok + counters.ng)) * 100).toFixed(2)}%
            </div>
          </div>
        </div>

        {/* Main Inspection Area */}
        <div className="col-span-10 space-y-6">
          <div className="grid grid-cols-2 gap-6 h-[400px]">
            {/* CAM 01: Bundle Top View */}
            <div className="relative bg-[#000] rounded-xl border border-white/10 overflow-hidden group shadow-2xl">
              <div className="absolute top-0 left-0 right-0 z-20 px-4 py-2 bg-black/80 backdrop-blur-md border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">CAM 01: Bundle Top View</span>
                </div>
                <span className="text-[9px] text-text-secondary font-mono">1920x1080 @ 60fps</span>
              </div>
              
              {/* Grid Overlay */}
              <div className="absolute inset-0 opacity-20 pointer-events-none" 
                   style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

              {/* Simulated Bundle Grid (2x5 bottles) */}
              <div className="absolute inset-0 flex items-center justify-center p-12">
                <div className="grid grid-cols-5 grid-rows-2 gap-4 w-full max-w-lg aspect-[5/2] bg-white/5 rounded-3xl p-6 border border-white/20 relative shadow-[0_0_50px_rgba(255,255,255,0.05)]">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <motion.div 
                      key={i}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: i * 0.05 }}
                      className="aspect-square bg-gradient-to-br from-white/15 to-white/5 rounded-full border border-white/20 shadow-[inset_0_0_20px_rgba(255,255,255,0.1)] flex items-center justify-center relative overflow-hidden"
                    >
                      <div className="w-3/4 h-3/4 rounded-full bg-white/5 blur-md" />
                      {status === 'Inspecting' && (
                        <motion.div 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: [0, 1, 0] }}
                          transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.1 }}
                          className="absolute inset-0 bg-accent/10 border-2 border-accent/30 rounded-full"
                        />
                      )}
                    </motion.div>
                  ))}
                  
                  {/* Result Overlay - Large HMI Style */}
                  <AnimatePresence>
                    {currentResult && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 1.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={cn(
                          "absolute inset-0 flex items-center justify-center rounded-3xl border-[8px] z-30 backdrop-blur-sm",
                          currentResult === 'OK' ? "border-emerald-500/40 bg-emerald-500/5" : "border-red-500/40 bg-red-500/5"
                        )}
                      >
                        <div className={cn(
                          "px-12 py-6 rounded-2xl border-4 font-black text-6xl tracking-tighter shadow-[0_0_50px_rgba(0,0,0,0.5)]",
                          currentResult === 'OK' ? "border-emerald-500 text-emerald-500 bg-black" : "border-red-500 text-red-500 bg-black"
                        )}>
                          {currentResult}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Scanning Line Animation */}
              {status === 'Inspecting' && (
                <motion.div 
                  initial={{ top: '0%' }}
                  animate={{ top: '100%' }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                  className="absolute left-0 right-0 h-[3px] bg-accent shadow-[0_0_20px_rgba(0,255,153,1)] z-20"
                />
              )}
              
              {/* Corner Accents */}
              <div className="absolute top-12 left-4 w-4 h-4 border-t-2 border-l-2 border-white/30" />
              <div className="absolute top-12 right-4 w-4 h-4 border-t-2 border-r-2 border-white/30" />
              <div className="absolute bottom-4 left-4 w-4 h-4 border-b-2 border-l-2 border-white/30" />
              <div className="absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 border-white/30" />
            </div>

            {/* CAM 02: Label Verification */}
            <div className="relative bg-[#000] rounded-xl border border-white/10 overflow-hidden shadow-2xl">
              <div className="absolute top-0 left-0 right-0 z-20 px-4 py-2 bg-black/80 backdrop-blur-md border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">CAM 02: Label Verification</span>
                </div>
                <span className="text-[9px] text-text-secondary font-mono">OCR / BARCODE ACTIVE</span>
              </div>
              
              <div className="absolute inset-0 flex items-center justify-center p-8">
                <div className="w-full max-w-[280px] aspect-[3/4] bg-[#f0f0f0] rounded-sm p-6 text-black flex flex-col shadow-[0_0_40px_rgba(255,255,255,0.1)] relative overflow-hidden">
                  <div className="border-b-4 border-black pb-3 mb-4">
                    <div className="text-[10px] font-black uppercase tracking-tighter">Bundle Identification</div>
                    <div className="text-lg font-black leading-none">PHARMA-PACK BUNDLE 10P</div>
                  </div>
                  
                  <div className="space-y-3 flex-1">
                    <div className="flex flex-col border-b border-black/20 pb-2">
                      <span className="text-[8px] font-bold text-gray-500 uppercase">Batch Number</span>
                      <span className="text-sm font-black font-mono">BN-2024-0317-X9</span>
                    </div>
                    <div className="flex flex-col border-b border-black/20 pb-2">
                      <span className="text-[8px] font-bold text-gray-500 uppercase">Expiration Date</span>
                      <span className="text-sm font-black font-mono">2027.03.16</span>
                    </div>
                    <div className="flex flex-col border-b border-black/20 pb-2">
                      <span className="text-[8px] font-bold text-gray-500 uppercase">Product Code</span>
                      <span className="text-sm font-black font-mono">SKU-992-BNDL</span>
                    </div>
                    
                    <div className="mt-6 flex flex-col items-center gap-2">
                      <div className="w-full h-16 bg-white flex items-center justify-center border-2 border-black p-1">
                        <div className="w-full h-full bg-white flex gap-[2px]">
                          {Array.from({ length: 50 }).map((_, i) => (
                            <div key={i} className="h-full bg-black" style={{ width: `${Math.random() * 3 + 1}px` }} />
                          ))}
                        </div>
                      </div>
                      <span className="text-[8px] font-mono font-bold">(01) 0 8801234 56789 2 (17) 270316 (10) BN20240317</span>
                    </div>
                  </div>

                  {/* OCR Bounding Boxes - Industrial Inspection Style */}
                  {status === 'Inspecting' && (
                    <div className="absolute inset-0 pointer-events-none">
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 1, 0] }}
                        transition={{ repeat: Infinity, duration: 0.4 }}
                        className="absolute top-[105px] left-[20px] w-[240px] h-8 border-2 border-accent bg-accent/5"
                      />
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 1, 0] }}
                        transition={{ repeat: Infinity, duration: 0.4, delay: 0.1 }}
                        className="absolute top-[145px] left-[20px] w-[240px] h-8 border-2 border-accent bg-accent/5"
                      />
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 1, 0] }}
                        transition={{ repeat: Infinity, duration: 0.4, delay: 0.2 }}
                        className="absolute bottom-[40px] left-[20px] w-[240px] h-20 border-2 border-accent bg-accent/5"
                      />
                    </div>
                  )}
                </div>
              </div>
              
              {/* Camera Crosshair */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 pointer-events-none opacity-30">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1px] h-4 bg-white" />
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[1px] h-4 bg-white" />
                <div className="absolute left-0 top-1/2 -translate-y-1/2 h-[1px] w-4 bg-white" />
                <div className="absolute right-0 top-1/2 -translate-y-1/2 h-[1px] w-4 bg-white" />
              </div>
            </div>
          </div>

          {/* Bottom History Carousel - Professional Timeline Style */}
          <div className="bg-[#111] p-4 rounded-xl border border-white/10 shadow-inner">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h4 className="text-[10px] font-bold text-text-secondary uppercase tracking-[0.2em]">Inspection Timeline</h4>
                <div className="px-2 py-0.5 rounded bg-accent/10 border border-accent/20 text-[8px] font-bold text-accent uppercase">History Log</div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-[9px] font-bold text-text-secondary uppercase">OK: 95.2%</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-[9px] font-bold text-text-secondary uppercase">NG: 4.8%</span>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
              {history.map((item) => (
                <motion.div 
                  key={item.id}
                  whileHover={{ scale: 1.05, translateY: -2 }}
                  className={cn(
                    "shrink-0 w-24 h-24 rounded-lg border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer relative overflow-hidden",
                    item.result === 'OK' ? "bg-emerald-500/5 border-emerald-500/20" : "bg-red-500/5 border-red-500/20"
                  )}
                >
                  <div className={cn(
                    "absolute top-0 left-0 right-0 h-1",
                    item.result === 'OK' ? "bg-emerald-500" : "bg-red-500"
                  )} />
                  <div className={cn(
                    "p-1.5 rounded-full mb-1",
                    item.result === 'OK' ? "bg-emerald-500/20 text-emerald-500" : "bg-red-500/20 text-red-500"
                  )}>
                    {item.result === 'OK' ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
                  </div>
                  <span className="text-[11px] font-black">#{item.id}</span>
                  <span className="text-[9px] text-text-secondary font-mono">{item.time}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ManagementSubModal({ type, isOpen, onClose }: { type: string | null, isOpen: boolean, onClose: () => void }) {
  const [subView, setSubView] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  useEffect(() => {
    if (!isOpen) {
      setSubView(null);
      setSelectedItem(null);
    }
  }, [isOpen]);

  if (!isOpen || !type) return null;

  const getTitle = () => {
    if (subView) {
      switch (subView) {
        case 'entity-create': return 'Create New Entity Type';
        case 'entity-import': return 'Import Ontology Schema';
        case 'entity-settings': return `Entity Settings: ${selectedItem?.name || ''}`;
        case 'relation-merge': return 'Graph Conflict Resolver';
        case 'relation-export': return 'Export Ontology Graph';
        case 'schema-rule-editor': return 'Validation Rule Builder';
      }
    }
    switch (type) {
      case 'user-directory': return 'User Directory';
      case 'role-definitions': return 'Role Definitions & Permissions';
      case 'audit-log': return 'System Audit Logs';
      case 'health-report': return 'System Infrastructure Health';
      case 'ontology-entities': return 'Entity Type Management';
      case 'ontology-relations': return 'Relation Mapping Editor';
      case 'ontology-schema': return 'Schema Validation Rules';
      default: return 'Management Detail';
    }
  };

  const renderContent = () => {
    switch (type) {
      case 'user-directory':
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-4 p-4 rounded-xl bg-surface border border-border">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
                <input 
                  type="text" 
                  placeholder="Search users by name, email or role..." 
                  className="w-full bg-bg border border-border rounded-lg py-2 pl-10 pr-4 text-xs focus:border-accent outline-none"
                />
              </div>
              <button className="px-4 py-2 bg-accent text-bg rounded-lg text-xs font-bold hover:opacity-90 transition-opacity">
                Add User
              </button>
            </div>
            <div className="overflow-hidden rounded-xl border border-border bg-surface">
              <table className="w-full text-left text-xs">
                <thead className="bg-bg/50 border-b border-border">
                  <tr>
                    <th className="px-4 py-3 font-bold text-text-secondary uppercase tracking-widest">User</th>
                    <th className="px-4 py-3 font-bold text-text-secondary uppercase tracking-widest">Role</th>
                    <th className="px-4 py-3 font-bold text-text-secondary uppercase tracking-widest">Status</th>
                    <th className="px-4 py-3 font-bold text-text-secondary uppercase tracking-widest">Last Login</th>
                    <th className="px-4 py-3 font-bold text-text-secondary uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {[
                    { name: 'Admin User', email: 'admin@factory.ai', role: 'System Admin', status: 'Online', last: 'Just now' },
                    { name: 'John Doe', email: 'john.d@factory.ai', role: 'Operator', status: 'Online', last: '12m ago' },
                    { name: 'Sarah Chen', email: 's.chen@factory.ai', role: 'Quality Lead', status: 'Offline', last: '2h ago' },
                    { name: 'Mike Ross', email: 'm.ross@factory.ai', role: 'Maintenance', status: 'Online', last: '45m ago' },
                  ].map((user, i) => (
                    <tr key={i} className="hover:bg-bg/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-accent font-bold">
                            {user.name[0]}
                          </div>
                          <div>
                            <div className="font-bold">{user.name}</div>
                            <div className="text-[10px] text-text-secondary">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded bg-surface-hover border border-border text-[10px] font-bold">
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className={cn("w-1.5 h-1.5 rounded-full", user.status === 'Online' ? "bg-emerald-500" : "bg-text-secondary")} />
                          <span className={user.status === 'Online' ? "text-emerald-500 font-bold" : "text-text-secondary"}>{user.status}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-text-secondary">{user.last}</td>
                      <td className="px-4 py-3 text-right">
                        <button className="text-accent hover:underline font-bold">Manage</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      case 'role-definitions':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {['System Admin', 'Operator', 'Auditor', 'Viewer'].map(role => (
                <div key={role} className="p-4 rounded-xl bg-surface border border-border hover:border-accent/30 transition-colors cursor-pointer group">
                  <div className="flex items-center justify-between mb-3">
                    <Shield className="text-accent" size={20} />
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  </div>
                  <h4 className="font-bold text-sm mb-1">{role}</h4>
                  <p className="text-[10px] text-text-secondary leading-relaxed">
                    {role === 'System Admin' ? 'Full access to all system modules and configurations.' : 
                     role === 'Operator' ? 'Standard operational access for production lines.' :
                     role === 'Auditor' ? 'Read-only access to logs and system reports.' :
                     'Restricted view-only access to dashboards.'}
                  </p>
                </div>
              ))}
            </div>
            <div className="dashboard-card">
              <h4 className="text-xs font-bold uppercase tracking-widest text-text-secondary mb-4">Permission Matrix</h4>
              <div className="space-y-3">
                {[
                  { module: 'Quality Control', admin: 'Full', operator: 'Read/Write', auditor: 'Read', viewer: 'Read' },
                  { module: 'System Config', admin: 'Full', operator: 'None', auditor: 'Read', viewer: 'None' },
                  { module: 'User Mgmt', admin: 'Full', operator: 'None', auditor: 'None', viewer: 'None' },
                  { module: 'Live Telemetry', admin: 'Full', operator: 'Full', auditor: 'Read', viewer: 'Read' },
                ].map((row, i) => (
                  <div key={i} className="grid grid-cols-5 gap-4 py-2 border-b border-border/50 text-[11px] items-center">
                    <div className="font-bold text-text-primary">{row.module}</div>
                    <div className="text-emerald-500 font-bold">{row.admin}</div>
                    <div className="text-text-secondary">{row.operator}</div>
                    <div className="text-text-secondary">{row.auditor}</div>
                    <div className="text-text-secondary">{row.viewer}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      case 'audit-log':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex gap-2">
                {['All Events', 'Security', 'Config', 'System'].map(f => (
                  <button key={f} className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-bold border transition-colors",
                    f === 'All Events' ? "bg-accent text-bg border-accent" : "bg-surface border-border text-text-secondary hover:border-accent/50"
                  )}>
                    {f}
                  </button>
                ))}
              </div>
              <div className="text-[10px] text-text-secondary font-mono">Total: 1,284 entries</div>
            </div>
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {[
                { time: '2024-03-18 09:42:12', user: 'admin_01', action: 'Modified Threshold: Vibration Limit', severity: 'info', target: 'ID: 12 (Motor A)' },
                { time: '2024-03-18 09:38:05', user: 'system', action: 'Auto-rollback: Model v2.4.1 -> v2.4.0', severity: 'warn', target: 'Model Registry' },
                { time: '2024-03-18 09:15:22', user: 'john_doe', action: 'Failed Login Attempt', severity: 'error', target: 'Auth Service' },
                { time: '2024-03-18 08:55:10', user: 'admin_01', action: 'User Created: sarah_c', severity: 'success', target: 'User Directory' },
                { time: '2024-03-18 08:30:45', user: 'system', action: 'Scheduled Backup Completed', severity: 'success', target: 'Database' },
                { time: '2024-03-18 08:12:33', user: 'mike_r', action: 'Emergency Stop Triggered', severity: 'error', target: 'Line 01' },
              ].map((log, i) => (
                <div key={i} className="p-3 rounded-xl bg-surface border border-border flex items-start gap-4 hover:border-accent/30 transition-colors">
                  <div className={cn(
                    "p-2 rounded-lg shrink-0",
                    log.severity === 'error' ? "bg-red-500/10 text-red-500" :
                    log.severity === 'warn' ? "bg-orange-500/10 text-orange-500" :
                    log.severity === 'success' ? "bg-emerald-500/10 text-emerald-500" :
                    "bg-blue-500/10 text-blue-500"
                  )}>
                    {log.severity === 'error' ? <AlertCircle size={16} /> : 
                     log.severity === 'warn' ? <AlertTriangle size={16} /> :
                     log.severity === 'success' ? <CheckCircle2 size={16} /> :
                     <Info size={16} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-mono text-text-secondary">{log.time}</span>
                      <span className="text-[10px] font-bold text-accent uppercase tracking-widest">{log.user}</span>
                    </div>
                    <p className="text-xs font-bold text-text-primary mb-1">{log.action}</p>
                    <div className="text-[10px] text-text-secondary italic">Target: {log.target}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      case 'health-report':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { name: 'API Gateway', status: 'Healthy', latency: '12ms', uptime: '99.99%', icon: Globe, color: 'emerald' },
                { name: 'Main Database', status: 'Healthy', latency: '5ms', uptime: '99.98%', icon: Database, color: 'emerald' },
                { name: 'ML Inference', status: 'Warning', latency: '450ms', uptime: '98.5%', icon: Cpu, color: 'orange' },
                { name: 'Kafka Stream', status: 'Healthy', latency: '2ms', uptime: '100%', icon: Zap, color: 'emerald' },
                { name: 'Redis Cache', status: 'Healthy', latency: '1ms', uptime: '99.99%', icon: Layers, color: 'emerald' },
                { name: 'Auth Service', status: 'Healthy', latency: '18ms', uptime: '99.95%', icon: ShieldCheck, color: 'emerald' },
              ].map((svc, i) => (
                <div key={i} className="p-4 rounded-xl bg-surface border border-border hover:border-accent/30 transition-colors">
                  <div className="flex items-center justify-between mb-4">
                    <div className={cn("p-2 rounded-lg", `bg-${svc.color}-500/10 text-${svc.color}-500`)}>
                      <svc.icon size={18} />
                    </div>
                    <div className={cn("px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest border", 
                      svc.color === 'emerald' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : "bg-orange-500/10 border-orange-500/20 text-orange-500"
                    )}>
                      {svc.status}
                    </div>
                  </div>
                  <h4 className="font-bold text-sm mb-3">{svc.name}</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-[9px] font-bold text-text-secondary uppercase tracking-widest mb-1">Latency</div>
                      <div className="text-xs font-mono">{svc.latency}</div>
                    </div>
                    <div>
                      <div className="text-[9px] font-bold text-text-secondary uppercase tracking-widest mb-1">Uptime</div>
                      <div className="text-xs font-mono">{svc.uptime}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="dashboard-card">
              <div className="flex items-center justify-between mb-6">
                <h4 className="text-xs font-bold uppercase tracking-widest text-text-secondary">Infrastructure Load (24h)</h4>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-accent" />
                    <span className="text-[10px] text-text-secondary">CPU</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-purple-500" />
                    <span className="text-[10px] text-text-secondary">MEM</span>
                  </div>
                </div>
              </div>
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={[
                    { time: '00:00', cpu: 45, mem: 60 },
                    { time: '04:00', cpu: 30, mem: 55 },
                    { time: '08:00', cpu: 85, mem: 75 },
                    { time: '12:00', cpu: 70, mem: 80 },
                    { time: '16:00', cpu: 90, mem: 85 },
                    { time: '20:00', cpu: 55, mem: 70 },
                  ]}>
                    <defs>
                      <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="time" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                      itemStyle={{ color: '#f8fafc', fontSize: '12px' }}
                    />
                    <Area type="monotone" dataKey="cpu" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorCpu)" name="CPU Usage (%)" />
                    <Area type="monotone" dataKey="mem" stroke="#3b82f6" fill="transparent" name="Memory Usage (%)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        );
      case 'ontology-entities':
        if (subView === 'entity-create') {
          return (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Entity Name</label>
                    <input type="text" placeholder="e.g., Conveyor Belt" className="w-full bg-surface border border-border rounded-xl p-3 text-sm focus:border-accent outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Parent Class</label>
                    <select className="w-full bg-surface border border-border rounded-xl p-3 text-sm focus:border-accent outline-none">
                      <option>Asset</option>
                      <option>Equipment</option>
                      <option>IoT Device</option>
                      <option>Inventory</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Description</label>
                    <textarea rows={3} className="w-full bg-surface border border-border rounded-xl p-3 text-sm focus:border-accent outline-none resize-none" placeholder="Describe the entity's role in the ontology..." />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Properties</label>
                    <button className="text-accent text-[10px] font-bold flex items-center gap-1 hover:underline">
                      <Plus size={12} /> Add Property
                    </button>
                  </div>
                  <div className="space-y-2">
                    {[
                      { key: 'serial_number', type: 'string' },
                      { key: 'installation_date', type: 'timestamp' },
                      { key: 'operating_status', type: 'enum' },
                    ].map((prop, i) => (
                      <div key={i} className="flex gap-2">
                        <input type="text" value={prop.key} readOnly className="flex-1 bg-bg border border-border rounded-lg p-2 text-xs font-mono" />
                        <select className="bg-bg border border-border rounded-lg p-2 text-[10px] font-bold uppercase">
                          <option>{prop.type}</option>
                        </select>
                        <button className="p-2 text-text-secondary hover:text-red-500"><Trash2 size={14} /></button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-6 border-t border-border">
                <button onClick={() => setSubView(null)} className="px-6 py-2 rounded-xl border border-border text-xs font-bold hover:bg-surface-hover transition-colors">Cancel</button>
                <button className="px-6 py-2 rounded-xl bg-accent text-bg text-xs font-bold hover:opacity-90 transition-opacity">Create Entity Type</button>
              </div>
            </div>
          );
        }

        if (subView === 'entity-import') {
          return (
            <div className="space-y-6">
              <div className="p-8 border-2 border-dashed border-border rounded-3xl flex flex-col items-center justify-center bg-surface/30">
                <Upload size={48} className="text-text-secondary mb-4" />
                <h4 className="text-sm font-bold mb-2">Drag & Drop Schema File</h4>
                <p className="text-xs text-text-secondary mb-6">Supports .json, .yaml, .ttl (Turtle) formats</p>
                <button className="px-6 py-2 bg-accent text-bg rounded-xl text-xs font-bold">Browse Files</button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-surface border border-border flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-blue-500/10 text-blue-500"><FileJson size={20} /></div>
                  <div>
                    <div className="text-xs font-bold">JSON-LD Template</div>
                    <div className="text-[10px] text-text-secondary">Standard manufacturing ontology</div>
                  </div>
                  <button className="ml-auto p-2 hover:bg-bg rounded-lg"><Download size={16} /></button>
                </div>
                <div className="p-4 rounded-2xl bg-surface border border-border flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500"><FileSpreadsheet size={20} /></div>
                  <div>
                    <div className="text-xs font-bold">Excel Mapping</div>
                    <div className="text-[10px] text-text-secondary">Bulk entity property import</div>
                  </div>
                  <button className="ml-auto p-2 hover:bg-bg rounded-lg"><Download size={16} /></button>
                </div>
              </div>
              <div className="flex justify-start">
                <button onClick={() => setSubView(null)} className="text-xs font-bold text-text-secondary flex items-center gap-2 hover:text-text-primary">
                  <ChevronLeft size={16} /> Back to Entities
                </button>
              </div>
            </div>
          );
        }

        if (subView === 'entity-settings' && selectedItem) {
          return (
            <div className="space-y-6">
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-surface border border-border">
                <div className="p-3 rounded-xl bg-accent/10 text-accent">
                  <selectedItem.icon size={24} />
                </div>
                <div>
                  <h4 className="text-lg font-bold">{selectedItem.name}</h4>
                  <p className="text-xs text-text-secondary">ID: ENT-{selectedItem.name.toUpperCase().replace(' ', '_')}</p>
                </div>
                <div className="ml-auto flex gap-2">
                  <button className="px-4 py-2 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 text-[10px] font-bold uppercase tracking-widest">Delete Type</button>
                  <button className="px-4 py-2 rounded-xl bg-accent text-bg text-[10px] font-bold uppercase tracking-widest">Save Changes</button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-6">
                <div className="col-span-2 space-y-6">
                  <div className="dashboard-card">
                    <h5 className="text-xs font-bold uppercase tracking-widest text-text-secondary mb-4">Property Definitions</h5>
                    <div className="space-y-3">
                      {[1, 2, 3, 4].map(i => (
                        <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-bg border border-border group">
                          <div className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center text-[10px] font-bold text-text-secondary">{i}</div>
                          <div className="flex-1">
                            <input type="text" defaultValue={`property_key_${i}`} className="bg-transparent border-none p-0 text-xs font-bold focus:ring-0 w-full" />
                            <div className="text-[10px] text-text-secondary">Type: String | Required: Yes</div>
                          </div>
                          <button className="opacity-0 group-hover:opacity-100 p-2 hover:bg-surface rounded-lg transition-all"><Settings2 size={14} /></button>
                        </div>
                      ))}
                      <button className="w-full py-3 rounded-xl border border-dashed border-border text-[10px] font-bold uppercase tracking-widest text-text-secondary hover:border-accent/50 hover:text-accent transition-all">
                        + Add New Property
                      </button>
                    </div>
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="dashboard-card">
                    <h5 className="text-xs font-bold uppercase tracking-widest text-text-secondary mb-4">Inheritance</h5>
                    <div className="space-y-4">
                      <div className="relative pl-6 border-l-2 border-accent/30 space-y-4">
                        <div className="relative">
                          <div className="absolute -left-[25px] top-2 w-4 h-4 rounded-full bg-accent border-4 border-bg" />
                          <div className="text-[10px] font-bold text-accent uppercase">Base Class</div>
                          <div className="text-xs font-bold">Asset</div>
                        </div>
                        <div className="relative">
                          <div className="absolute -left-[25px] top-2 w-4 h-4 rounded-full bg-accent border-4 border-bg" />
                          <div className="text-[10px] font-bold text-accent uppercase">Sub Class</div>
                          <div className="text-xs font-bold">Equipment</div>
                        </div>
                        <div className="relative">
                          <div className="absolute -left-[25px] top-2 w-4 h-4 rounded-full bg-emerald-500 border-4 border-bg" />
                          <div className="text-[10px] font-bold text-emerald-500 uppercase">Current</div>
                          <div className="text-xs font-bold">{selectedItem.name}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="dashboard-card">
                    <h5 className="text-xs font-bold uppercase tracking-widest text-text-secondary mb-4">Usage Stats</h5>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-text-secondary uppercase">Active Instances</span>
                        <span className="text-xs font-bold">{selectedItem.instances}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-text-secondary uppercase">Relation Count</span>
                        <span className="text-xs font-bold">24</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <button onClick={() => setSubView(null)} className="text-xs font-bold text-text-secondary flex items-center gap-2 hover:text-text-primary">
                <ChevronLeft size={16} /> Back to Entities
              </button>
            </div>
          );
        }

        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <button 
                  onClick={() => setSubView('entity-create')}
                  className="px-4 py-2 bg-accent text-bg rounded-xl text-xs font-bold hover:opacity-90 transition-opacity"
                >
                  Create Entity
                </button>
                <button 
                  onClick={() => setSubView('entity-import')}
                  className="px-4 py-2 bg-surface border border-border rounded-xl text-xs font-bold hover:bg-surface-hover transition-colors"
                >
                  Import Schema
                </button>
              </div>
              <div className="text-[10px] text-text-secondary font-bold uppercase tracking-widest">45 Active Entity Types</div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { name: 'Manufacturing Line', parent: 'Asset', props: 12, instances: 4, icon: Factory },
                { name: 'Electric Motor', parent: 'Equipment', props: 8, instances: 124, icon: Cpu },
                { name: 'Quality Sensor', parent: 'IoT Device', props: 6, instances: 56, icon: Zap },
                { name: 'Raw Material', parent: 'Inventory', props: 5, instances: 12, icon: Box },
              ].map((entity, i) => (
                <div key={i} className="p-4 rounded-2xl bg-surface border border-border hover:border-accent/30 transition-all group">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 rounded-xl bg-bg border border-border group-hover:border-accent/20 transition-colors">
                      <entity.icon size={20} className="text-accent" />
                    </div>
                    <button 
                      onClick={() => {
                        setSelectedItem(entity);
                        setSubView('entity-settings');
                      }}
                      className="p-2 rounded-lg hover:bg-bg transition-colors"
                    >
                      <Settings2 size={16} className="text-text-secondary" />
                    </button>
                  </div>
                  <h4 className="font-bold text-base mb-1">{entity.name}</h4>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-[10px] text-text-secondary font-bold uppercase tracking-widest">Parent:</span>
                    <span className="text-[10px] font-bold text-accent">{entity.parent}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
                    <div>
                      <div className="text-[9px] font-bold text-text-secondary uppercase tracking-widest mb-1">Properties</div>
                      <div className="text-sm font-black">{entity.props}</div>
                    </div>
                    <div>
                      <div className="text-[9px] font-bold text-text-secondary uppercase tracking-widest mb-1">Instances</div>
                      <div className="text-sm font-black">{entity.instances}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      case 'ontology-relations':
        if (subView === 'relation-merge') {
          return (
            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-orange-500/5 border border-orange-500/20 flex gap-4">
                <AlertCircle className="text-orange-500 shrink-0" size={24} />
                <div>
                  <h4 className="text-sm font-bold text-orange-200">3 Conflicts Detected</h4>
                  <p className="text-xs text-orange-200/60 leading-relaxed">The current graph version has conflicts with the master branch. Manual resolution required for entity 'Motor_A12'.</p>
                </div>
              </div>
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="overflow-hidden rounded-2xl border border-border bg-surface">
                    <div className="p-3 bg-bg/50 border-b border-border flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">Conflict #{i}: Relation Mismatch</span>
                      <div className="flex gap-2">
                        <button className="px-3 py-1 rounded-lg bg-emerald-500 text-bg text-[10px] font-bold">Keep Local</button>
                        <button className="px-3 py-1 rounded-lg bg-blue-500 text-bg text-[10px] font-bold">Keep Remote</button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 divide-x divide-border">
                      <div className="p-4 space-y-2">
                        <div className="text-[9px] font-bold text-emerald-500 uppercase">Local Version</div>
                        <div className="text-xs font-mono p-2 rounded bg-bg">Motor_A12 {"->"} connected_to {"->"} PLC_04</div>
                      </div>
                      <div className="p-4 space-y-2">
                        <div className="text-[9px] font-bold text-blue-500 uppercase">Remote Version</div>
                        <div className="text-xs font-mono p-2 rounded bg-bg">Motor_A12 {"->"} part_of {"->"} Line_01</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between pt-6 border-t border-border">
                <button onClick={() => setSubView(null)} className="text-xs font-bold text-text-secondary flex items-center gap-2 hover:text-text-primary">
                  <ChevronLeft size={16} /> Back to Relations
                </button>
                <button className="px-6 py-2 rounded-xl bg-accent text-bg text-xs font-bold">Resolve All & Merge</button>
              </div>
            </div>
          );
        }

        if (subView === 'relation-export') {
          return (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                {[
                  { name: 'JSON-LD', ext: '.json', icon: FileJson, desc: 'Semantic web standard' },
                  { name: 'RDF/XML', ext: '.rdf', icon: Code, desc: 'Resource Description Framework' },
                  { name: 'GraphML', ext: '.graphml', icon: Network, desc: 'Graph exchange format' },
                  { name: 'CSV Matrix', ext: '.csv', icon: FileSpreadsheet, desc: 'Adjacency matrix export' },
                  { name: 'Image (SVG)', ext: '.svg', icon: Share2, desc: 'High-res vector graphic' },
                  { name: 'Documentation', ext: '.pdf', icon: FileText, desc: 'Ontology spec report' },
                ].map((format, i) => (
                  <button key={i} className="p-4 rounded-2xl bg-surface border border-border hover:border-accent transition-all text-left group">
                    <div className="p-3 rounded-xl bg-bg border border-border group-hover:border-accent/20 transition-colors mb-4 w-fit">
                      <format.icon size={20} className="text-accent" />
                    </div>
                    <h4 className="text-xs font-bold mb-1">{format.name}</h4>
                    <p className="text-[10px] text-text-secondary mb-4">{format.desc}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-mono text-text-secondary">{format.ext}</span>
                      <Download size={14} className="text-text-secondary group-hover:text-accent" />
                    </div>
                  </button>
                ))}
              </div>
              <div className="flex justify-start pt-6 border-t border-border">
                <button onClick={() => setSubView(null)} className="text-xs font-bold text-text-secondary flex items-center gap-2 hover:text-text-primary">
                  <ChevronLeft size={16} /> Back to Relations
                </button>
              </div>
            </div>
          );
        }

        return (
          <div className="space-y-6">
            <div className="dashboard-card">
              <div className="flex items-center justify-between mb-6">
                <h4 className="text-xs font-bold uppercase tracking-widest text-text-secondary">Relation Mapping Graph</h4>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setSubView('relation-merge')}
                    className="p-2 rounded-lg bg-bg border border-border text-text-secondary hover:text-accent transition-colors"
                  >
                    <GitMerge size={16} />
                  </button>
                  <button 
                    onClick={() => setSubView('relation-export')}
                    className="p-2 rounded-lg bg-bg border border-border text-text-secondary hover:text-accent transition-colors"
                  >
                    <Share2 size={16} />
                  </button>
                </div>
              </div>
              <div className="aspect-video rounded-2xl bg-bg/50 border border-dashed border-border flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle, #334155 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
                <div className="relative flex flex-col items-center gap-8">
                  <div className="flex gap-20">
                    <div className="w-32 h-16 rounded-xl bg-surface border border-accent/50 flex items-center justify-center text-xs font-bold shadow-lg shadow-accent/10">Manufacturing Line</div>
                    <div className="w-32 h-16 rounded-xl bg-surface border border-border flex items-center justify-center text-xs font-bold">Electric Motor</div>
                  </div>
                  <div className="absolute top-8 left-1/2 -translate-x-1/2 w-20 h-[1px] bg-accent">
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-2 h-2 rounded-full bg-accent" />
                    <div className="absolute top-[-12px] left-1/2 -translate-x-1/2 text-[9px] font-bold text-accent uppercase tracking-tighter">contains</div>
                  </div>
                  <div className="text-center">
                    <Network size={32} className="text-border mb-2" />
                    <p className="text-[10px] text-text-secondary font-bold uppercase tracking-widest">Interactive Graph View</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-widest text-text-secondary px-2">Recent Relations</h4>
              {[
                { source: 'Line 01', relation: 'composed_of', target: 'Motor A-12', status: 'Active' },
                { source: 'Motor A-12', relation: 'monitored_by', target: 'Vibration Sensor 4', status: 'Active' },
                { source: 'Sensor 4', relation: 'reports_to', target: 'Edge Gateway 2', status: 'Pending' },
              ].map((rel, i) => (
                <div key={i} className="p-3 rounded-xl bg-surface border border-border flex items-center justify-between group hover:border-accent/30 transition-colors">
                  <div className="flex items-center gap-4 flex-1">
                    <span className="text-xs font-bold min-w-[80px]">{rel.source}</span>
                    <div className="flex-1 h-[1px] bg-border relative">
                      <div className="absolute top-[-10px] left-1/2 -translate-x-1/2 text-[8px] font-bold text-accent uppercase bg-surface px-2">{rel.relation}</div>
                    </div>
                    <span className="text-xs font-bold min-w-[80px] text-right">{rel.target}</span>
                  </div>
                  <div className="ml-8 px-2 py-0.5 rounded bg-bg border border-border text-[9px] font-bold uppercase tracking-widest text-text-secondary">
                    {rel.status}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      case 'ontology-schema':
        if (subView === 'schema-rule-editor') {
          return (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-6">
                <div className="col-span-1 space-y-4">
                  <div className="p-4 rounded-2xl bg-surface border border-border">
                    <h5 className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-4">Rule Metadata</h5>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-text-secondary">Rule Name</label>
                        <input type="text" defaultValue="New Validation Rule" className="w-full bg-bg border border-border rounded-lg p-2 text-xs outline-none focus:border-accent" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-text-secondary">Severity</label>
                        <select className="w-full bg-bg border border-border rounded-lg p-2 text-xs outline-none focus:border-accent">
                          <option>Critical</option>
                          <option>Warning</option>
                          <option>Info</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-span-2 space-y-4">
                  <div className="p-6 rounded-2xl bg-surface border border-border min-h-[300px] flex flex-col">
                    <h5 className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-6">Logic Builder</h5>
                    <div className="flex-1 space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="px-3 py-1.5 rounded-lg bg-accent/10 text-accent text-[10px] font-bold uppercase">IF</div>
                        <div className="flex-1 p-3 rounded-xl bg-bg border border-border text-xs font-mono">entity.type == 'Electric Motor'</div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="px-3 py-1.5 rounded-lg bg-accent/10 text-accent text-[10px] font-bold uppercase">AND</div>
                        <div className="flex-1 p-3 rounded-xl bg-bg border border-border text-xs font-mono">entity.properties.vibration == null</div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-500 text-[10px] font-bold uppercase">THEN</div>
                        <div className="flex-1 p-3 rounded-xl bg-bg border border-border text-xs font-mono">trigger_alert('Missing Telemetry')</div>
                      </div>
                    </div>
                    <button className="mt-6 w-full py-3 rounded-xl border border-dashed border-border text-[10px] font-bold uppercase tracking-widest text-text-secondary hover:border-accent/50 hover:text-accent transition-all">
                      + Add Condition
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex justify-between pt-6 border-t border-border">
                <button onClick={() => setSubView(null)} className="text-xs font-bold text-text-secondary flex items-center gap-2 hover:text-text-primary">
                  <ChevronLeft size={16} /> Back to Schema
                </button>
                <div className="flex gap-3">
                  <button className="px-6 py-2 rounded-xl border border-border text-xs font-bold">Test Rule</button>
                  <button className="px-6 py-2 rounded-xl bg-accent text-bg text-xs font-bold">Save Rule</button>
                </div>
              </div>
            </div>
          );
        }

        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="dashboard-card bg-emerald-500/5 border-emerald-500/10">
                <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-1">Passed</div>
                <div className="text-2xl font-black">1,242</div>
                <div className="text-[10px] text-text-secondary mt-1">98.4% of total</div>
              </div>
              <div className="dashboard-card bg-orange-500/5 border-orange-500/10">
                <div className="text-[10px] font-bold text-orange-500 uppercase tracking-widest mb-1">Warnings</div>
                <div className="text-2xl font-black">18</div>
                <div className="text-[10px] text-text-secondary mt-1">Schema mismatch</div>
              </div>
              <div className="dashboard-card bg-red-500/5 border-red-500/10">
                <div className="text-[10px] font-bold text-red-500 uppercase tracking-widest mb-1">Critical</div>
                <div className="text-2xl font-black">2</div>
                <div className="text-[10px] text-text-secondary mt-1">Validation failed</div>
              </div>
            </div>
            <div className="dashboard-card">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-xs font-bold uppercase tracking-widest text-text-secondary">Active Validation Rules</h4>
                <button 
                  onClick={() => setSubView('schema-rule-editor')}
                  className="text-accent text-[10px] font-bold hover:underline"
                >
                  Add Rule
                </button>
              </div>
              <div className="space-y-3">
                {[
                  { name: 'Mandatory Telemetry', desc: 'All active motors must report vibration data every 5s.', status: 'Active', icon: Code2 },
                  { name: 'Parent-Child Constraint', desc: 'Sensors cannot exist without a parent equipment assignment.', status: 'Active', icon: Link },
                  { name: 'Data Type Integrity', desc: 'Temperature values must be within -40 to 150 range.', status: 'Active', icon: FileCode },
                ].map((rule, i) => (
                  <div key={i} className="p-4 rounded-xl bg-bg border border-border flex items-start gap-4">
                    <div className="p-2 rounded-lg bg-surface border border-border text-accent">
                      <rule.icon size={18} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h5 className="text-sm font-bold">{rule.name}</h5>
                        <div className="w-8 h-4 bg-accent rounded-full relative">
                          <div className="absolute right-0.5 top-0.5 w-3 h-3 bg-bg rounded-full" />
                        </div>
                      </div>
                      <p className="text-[11px] text-text-secondary leading-relaxed">{rule.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-bg/80 backdrop-blur-md"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-4xl bg-bg border border-border rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border bg-surface/30">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
              {type === 'health-report' ? <Activity size={24} /> : <Shield size={24} />}
            </div>
            <div>
              <h3 className="text-xl font-bold tracking-tight">{getTitle()}</h3>
              <p className="text-[10px] text-text-secondary uppercase tracking-widest font-bold mt-1">Management Console Detail</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-surface-hover transition-colors text-text-secondary hover:text-text-primary"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {renderContent()}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-surface/30 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-6 py-2 rounded-xl border border-border text-xs font-bold hover:bg-surface-hover transition-colors"
          >
            Close
          </button>
          <button className="px-6 py-2 rounded-xl bg-accent text-bg text-xs font-bold hover:opacity-90 transition-opacity">
            Export Report
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function AdvancedParametersModal({ item, isOpen, onClose }: { item: MenuItem, isOpen: boolean, onClose: () => void }) {
  const [params, setParams] = useState<Record<string, any>>({});

  useEffect(() => {
    // Default parameters based on category
    const defaults: Record<string, any> = {};
    switch (item.category) {
      case 'AI 품질 에이전트':
        defaults.sensitivity = 85;
        defaults.threshold = 0.75;
        defaults.model = 'Anomalib-ResNet18';
        defaults.scanSpeed = 120;
        break;
      case 'AI 설비예지보전 에이전트':
        defaults.vibrationLimit = 4.5;
        defaults.tempLimit = 85;
        defaults.samplingFreq = 1000;
        defaults.horizon = 24;
        break;
      case 'AI 에너지 에이전트':
        if (item.id === 16) { // 전력 사용 현황
          defaults.samplingInterval = 5;
          defaults.voltageThreshold = 220;
          defaults.currentThreshold = 50;
          defaults.harmonicLimit = 5;
        } else if (item.id === 17) { // 에너지 비용 분석
          defaults.unitCost = 110;
          defaults.billingCycle = 'Monthly';
          defaults.peakTariffMultiplier = 1.5;
          defaults.baseContractPower = 500;
        } else if (item.id === 18) { // 피크 부하 관리
          defaults.peakLimit = 450;
          defaults.warningThreshold = 85;
          defaults.sheddingPriority = 'Medium';
          defaults.autoControlEnabled = true;
        }
        break;
      case 'AI 안전 에이전트':
        if (item.id === 19) { // 지능형 CCTV 화재 감시
          defaults.detectionConfidence = 85;
          defaults.scanInterval = 500;
          defaults.alertSensitivity = 'High';
          defaults.autoAlarmEnabled = true;
        } else if (item.id === 20) { // AMR 충돌 방지 시스템
          defaults.safetyRadius = 1.5;
          defaults.stopDistance = 0.5;
          defaults.responseTime = 50;
          defaults.collisionAvoidance = true;
        } else if (item.id === 32) { // 긴급 정지 및 알람 제어
          defaults.eStopDelay = 0;
          defaults.sirenVolume = 95;
          defaults.notificationChannels = ['SMS', 'Push', 'Siren'];
          defaults.interlockEnabled = true;
        }
        break;
      case 'AI 생산 최적화 에이전트':
        defaults.targetOEE = 88;
        defaults.windowSize = 60;
        defaults.bottleneckSensitivity = 0.8;
        defaults.autoSchedule = false;
        break;
    }
    setParams(defaults);
  }, [item]);

  if (!isOpen) return null;

  const renderFields = () => {
    switch (item.category) {
      case 'AI 품질 에이전트':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-text-secondary">
                <span>Detection Sensitivity</span>
                <span className="text-accent">{params.sensitivity}%</span>
              </div>
              <input 
                type="range" min="0" max="100" value={params.sensitivity} 
                onChange={(e) => setParams({...params, sensitivity: parseInt(e.target.value)})}
                className="w-full accent-accent"
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-text-secondary">
                <span>Anomaly Threshold</span>
                <span className="text-accent">{params.threshold}</span>
              </div>
              <input 
                type="range" min="0" max="1" step="0.01" value={params.threshold} 
                onChange={(e) => setParams({...params, threshold: parseFloat(e.target.value)})}
                className="w-full accent-accent"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">AI Model</label>
                <select 
                  value={params.model} 
                  onChange={(e) => setParams({...params, model: e.target.value})}
                  className="w-full bg-surface border border-border rounded-lg p-2 text-xs font-bold focus:border-accent outline-none"
                >
                  <option>Anomalib-ResNet18</option>
                  <option>Custom-CNN-v4</option>
                  <option>Vision-Transformer-S</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">Scan Speed (ms)</label>
                <input 
                  type="number" value={params.scanSpeed} 
                  onChange={(e) => setParams({...params, scanSpeed: parseInt(e.target.value)})}
                  className="w-full bg-surface border border-border rounded-lg p-2 text-xs font-bold focus:border-accent outline-none"
                />
              </div>
            </div>
          </div>
        );
      case 'AI 설비예지보전 에이전트':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">Vibration Limit (mm/s)</label>
                <input 
                  type="number" step="0.1" value={params.vibrationLimit} 
                  onChange={(e) => setParams({...params, vibrationLimit: parseFloat(e.target.value)})}
                  className="w-full bg-surface border border-border rounded-lg p-2 text-xs font-bold focus:border-accent outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">Temp Limit (°C)</label>
                <input 
                  type="number" value={params.tempLimit} 
                  onChange={(e) => setParams({...params, tempLimit: parseInt(e.target.value)})}
                  className="w-full bg-surface border border-border rounded-lg p-2 text-xs font-bold focus:border-accent outline-none"
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-text-secondary">
                <span>Sampling Frequency</span>
                <span className="text-accent">{params.samplingFreq} Hz</span>
              </div>
              <input 
                type="range" min="100" max="5000" step="100" value={params.samplingFreq} 
                onChange={(e) => setParams({...params, samplingFreq: parseInt(e.target.value)})}
                className="w-full accent-accent"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">Prediction Horizon (Hours)</label>
              <select 
                value={params.horizon} 
                onChange={(e) => setParams({...params, horizon: parseInt(e.target.value)})}
                className="w-full bg-surface border border-border rounded-lg p-2 text-xs font-bold focus:border-accent outline-none"
              >
                <option value={12}>12 Hours</option>
                <option value={24}>24 Hours</option>
                <option value={48}>48 Hours</option>
                <option value={168}>1 Week</option>
              </select>
            </div>
          </div>
        );
      case 'AI 에너지 에이전트':
        if (item.id === 16) { // 전력 사용 현황
          return (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-text-secondary">
                  <span>Sampling Interval (s)</span>
                  <span className="text-accent">{params.samplingInterval}s</span>
                </div>
                <input 
                  type="range" min="1" max="60" value={params.samplingInterval} 
                  onChange={(e) => setParams({...params, samplingInterval: parseInt(e.target.value)})}
                  className="w-full accent-accent"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">Voltage Threshold (V)</label>
                  <input 
                    type="number" value={params.voltageThreshold} 
                    onChange={(e) => setParams({...params, voltageThreshold: parseInt(e.target.value)})}
                    className="w-full bg-surface border border-border rounded-lg p-2 text-xs font-bold focus:border-accent outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">Current Threshold (A)</label>
                  <input 
                    type="number" value={params.currentThreshold} 
                    onChange={(e) => setParams({...params, currentThreshold: parseInt(e.target.value)})}
                    className="w-full bg-surface border border-border rounded-lg p-2 text-xs font-bold focus:border-accent outline-none"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-text-secondary">
                  <span>Harmonic Limit (%)</span>
                  <span className="text-accent">{params.harmonicLimit}%</span>
                </div>
                <input 
                  type="range" min="1" max="15" value={params.harmonicLimit} 
                  onChange={(e) => setParams({...params, harmonicLimit: parseInt(e.target.value)})}
                  className="w-full accent-accent"
                />
              </div>
            </div>
          );
        } else if (item.id === 17) { // 에너지 비용 분석
          return (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-text-secondary">
                  <span>Unit Cost (KRW/kWh)</span>
                  <span className="text-accent">{params.unitCost} ₩</span>
                </div>
                <input 
                  type="range" min="50" max="300" step="5" value={params.unitCost} 
                  onChange={(e) => setParams({...params, unitCost: parseInt(e.target.value)})}
                  className="w-full accent-accent"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">Billing Cycle</label>
                  <select 
                    value={params.billingCycle} 
                    onChange={(e) => setParams({...params, billingCycle: e.target.value})}
                    className="w-full bg-surface border border-border rounded-lg p-2 text-xs font-bold focus:border-accent outline-none"
                  >
                    <option value="Daily">Daily</option>
                    <option value="Weekly">Weekly</option>
                    <option value="Monthly">Monthly</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">Peak Multiplier</label>
                  <input 
                    type="number" step="0.1" value={params.peakTariffMultiplier} 
                    onChange={(e) => setParams({...params, peakTariffMultiplier: parseFloat(e.target.value)})}
                    className="w-full bg-surface border border-border rounded-lg p-2 text-xs font-bold focus:border-accent outline-none"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-surface border border-border">
                <DollarSign size={16} className="text-emerald-500" />
                <div className="flex-1">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">Base Contract Power</div>
                  <div className="text-sm font-black">{params.baseContractPower} kW</div>
                </div>
              </div>
            </div>
          );
        } else if (item.id === 18) { // 피크 부하 관리
          return (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-text-secondary">
                  <span>Peak Load Limit (kW)</span>
                  <span className="text-accent">{params.peakLimit} kW</span>
                </div>
                <input 
                  type="range" min="100" max="1000" step="10" value={params.peakLimit} 
                  onChange={(e) => setParams({...params, peakLimit: parseInt(e.target.value)})}
                  className="w-full accent-accent"
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-text-secondary">
                  <span>Warning Threshold (%)</span>
                  <span className="text-accent">{params.warningThreshold}%</span>
                </div>
                <input 
                  type="range" min="50" max="95" value={params.warningThreshold} 
                  onChange={(e) => setParams({...params, warningThreshold: parseInt(e.target.value)})}
                  className="w-full accent-accent"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">Shedding Priority</label>
                  <select 
                    value={params.sheddingPriority} 
                    onChange={(e) => setParams({...params, sheddingPriority: e.target.value})}
                    className="w-full bg-surface border border-border rounded-lg p-2 text-xs font-bold focus:border-accent outline-none"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-surface border border-border mt-6">
                  <span className="text-[10px] font-bold uppercase tracking-widest">Auto Control</span>
                  <button 
                    onClick={() => setParams({...params, autoControlEnabled: !params.autoControlEnabled})}
                    className={cn(
                      "w-8 h-4 rounded-full transition-colors relative",
                      params.autoControlEnabled ? "bg-accent" : "bg-border"
                    )}
                  >
                    <div className={cn(
                      "absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all",
                      params.autoControlEnabled ? "right-0.5" : "left-0.5"
                    )} />
                  </button>
                </div>
              </div>
            </div>
          );
        }
        return null;
      case 'AI 안전 에이전트':
        if (item.id === 19) { // 지능형 CCTV 화재 감시
          return (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-text-secondary">
                  <span>Detection Confidence (%)</span>
                  <span className="text-accent">{params.detectionConfidence}%</span>
                </div>
                <input 
                  type="range" min="50" max="99" value={params.detectionConfidence} 
                  onChange={(e) => setParams({...params, detectionConfidence: parseInt(e.target.value)})}
                  className="w-full accent-accent"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">Scan Interval (ms)</label>
                  <input 
                    type="number" value={params.scanInterval} 
                    onChange={(e) => setParams({...params, scanInterval: parseInt(e.target.value)})}
                    className="w-full bg-surface border border-border rounded-lg p-2 text-xs font-bold focus:border-accent outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">Sensitivity</label>
                  <select 
                    value={params.alertSensitivity} 
                    onChange={(e) => setParams({...params, alertSensitivity: e.target.value})}
                    className="w-full bg-surface border border-border rounded-lg p-2 text-xs font-bold focus:border-accent outline-none"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
              </div>
            </div>
          );
        } else if (item.id === 20) { // AMR 충돌 방지 시스템
          return (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">Safety Radius (m)</label>
                  <input 
                    type="number" step="0.1" value={params.safetyRadius} 
                    onChange={(e) => setParams({...params, safetyRadius: parseFloat(e.target.value)})}
                    className="w-full bg-surface border border-border rounded-lg p-2 text-xs font-bold focus:border-accent outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">Stop Distance (m)</label>
                  <input 
                    type="number" step="0.1" value={params.stopDistance} 
                    onChange={(e) => setParams({...params, stopDistance: parseFloat(e.target.value)})}
                    className="w-full bg-surface border border-border rounded-lg p-2 text-xs font-bold focus:border-accent outline-none"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-surface border border-border">
                <div className="flex items-center gap-2">
                  <Zap size={16} className="text-yellow-500" />
                  <span className="text-xs font-bold">Collision Avoidance</span>
                </div>
                <button 
                  onClick={() => setParams({...params, collisionAvoidance: !params.collisionAvoidance})}
                  className={cn(
                    "w-10 h-5 rounded-full transition-colors relative",
                    params.collisionAvoidance ? "bg-accent" : "bg-border"
                  )}
                >
                  <div className={cn(
                    "absolute top-1 w-3 h-3 rounded-full bg-white transition-all",
                    params.collisionAvoidance ? "right-1" : "left-1"
                  )} />
                </button>
              </div>
            </div>
          );
        } else if (item.id === 32) { // 긴급 정지 및 알람 제어
          return (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-text-secondary">
                  <span>Siren Volume</span>
                  <span className="text-accent">{params.sirenVolume}%</span>
                </div>
                <input 
                  type="range" min="0" max="100" value={params.sirenVolume} 
                  onChange={(e) => setParams({...params, sirenVolume: parseInt(e.target.value)})}
                  className="w-full accent-accent"
                />
              </div>
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <div className="flex items-center gap-2 text-red-500 mb-2">
                  <AlertTriangle size={16} />
                  <span className="text-xs font-bold uppercase tracking-widest">Emergency Interlock</span>
                </div>
                <p className="text-[10px] text-text-secondary leading-relaxed">
                  When activated, all production lines will be immediately halted upon detection of critical safety violations.
                </p>
              </div>
            </div>
          );
        }
        return null;
      case 'AI 생산 최적화 에이전트':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-text-secondary">
                <span>Target OEE (%)</span>
                <span className="text-accent">{params.targetOEE}%</span>
              </div>
              <input 
                type="range" min="50" max="100" value={params.targetOEE} 
                onChange={(e) => setParams({...params, targetOEE: parseInt(e.target.value)})}
                className="w-full accent-accent"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">Calculation Window (Min)</label>
              <select 
                value={params.windowSize} 
                onChange={(e) => setParams({...params, windowSize: parseInt(e.target.value)})}
                className="w-full bg-surface border border-border rounded-lg p-2 text-xs font-bold focus:border-accent outline-none"
              >
                <option value={15}>15 Minutes</option>
                <option value={30}>30 Minutes</option>
                <option value={60}>1 Hour</option>
                <option value={480}>8 Hours (Shift)</option>
              </select>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-text-secondary">
                <span>Bottleneck Sensitivity</span>
                <span className="text-accent">{params.bottleneckSensitivity}</span>
              </div>
              <input 
                type="range" min="0" max="1" step="0.1" value={params.bottleneckSensitivity} 
                onChange={(e) => setParams({...params, bottleneckSensitivity: parseFloat(e.target.value)})}
                className="w-full accent-accent"
              />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-surface border border-border">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-blue-500" />
                <span className="text-xs font-bold">Auto-Schedule Optimization</span>
              </div>
              <button 
                onClick={() => setParams({...params, autoSchedule: !params.autoSchedule})}
                className={cn(
                  "w-10 h-5 rounded-full transition-colors relative",
                  params.autoSchedule ? "bg-accent" : "bg-border"
                )}
              >
                <div className={cn(
                  "absolute top-1 w-3 h-3 rounded-full bg-white transition-all",
                  params.autoSchedule ? "right-1" : "left-1"
                )} />
              </button>
            </div>
          </div>
        );
      default:
        return <p className="text-xs text-text-secondary">No specialized parameters available for this module.</p>;
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-bg border border-border rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
      >
        <div className="p-6 border-b border-border flex items-center justify-between bg-surface/30">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent/10 text-accent">
              <Sliders size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold tracking-tight">Advanced Parameters</h3>
              <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">{item.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface-hover rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-6 p-3 rounded-lg bg-orange-500/5 border border-orange-500/20 flex gap-3">
            <AlertTriangle size={16} className="text-orange-500 shrink-0 mt-0.5" />
            <p className="text-[10px] text-orange-200/80 leading-relaxed">
              Modifying these parameters affects the real-time heuristic logic and agent orchestration. 
              Changes will be logged in the system audit trail.
            </p>
          </div>

          {renderFields()}
        </div>

        <div className="p-6 bg-surface/30 border-t border-border flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-border text-xs font-bold hover:bg-surface-hover transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={() => {
              // Simulate saving
              alert('Advanced parameters updated successfully.');
              onClose();
            }}
            className="flex-1 py-3 rounded-xl bg-accent text-bg text-xs font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          >
            <Save size={14} />
            Save Changes
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function FireMonitoringViewer() {
  const [isThermal, setIsThermal] = useState(false);
  const [isAlert, setIsAlert] = useState(false);
  const [confidence, setConfidence] = useState({ fire: 12, smoke: 8, person: 2 });
  const [logs, setLogs] = useState<{time: string, msg: string, type: 'info' | 'warn' | 'crit'}[]>([
    { time: '10:12:45', msg: 'System initialized. Camera 01-04 online.', type: 'info' },
    { time: '10:15:20', msg: 'AI Model v4.2 loaded. Fire detection active.', type: 'info' },
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!isAlert) {
        setConfidence({
          fire: Math.floor(Math.random() * 15) + 5,
          smoke: Math.floor(Math.random() * 10) + 5,
          person: Math.floor(Math.random() * 3) + 1
        });
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [isAlert]);

  const triggerAlert = () => {
    setIsAlert(true);
    setConfidence({ fire: 88, smoke: 92, person: 0 });
    setLogs(prev => [
      { time: new Date().toLocaleTimeString(), msg: 'CRITICAL: Fire detected in Zone B-4!', type: 'crit' },
      ...prev
    ]);
  };

  const resetAlert = () => {
    setIsAlert(false);
    setLogs(prev => [
      { time: new Date().toLocaleTimeString(), msg: 'Alert cleared. System returning to normal.', type: 'info' },
      ...prev
    ]);
  };

  return (
    <div className="flex flex-col gap-4 bg-[#0a0a0a] p-6 rounded-2xl border border-white/10 font-mono text-white shadow-2xl overflow-hidden relative">
      {/* HUD Overlay */}
      <div className="absolute inset-0 pointer-events-none border-[20px] border-transparent border-t-white/5 border-b-white/5 z-10" />
      
      {/* Top Bar */}
      <div className="flex items-center justify-between bg-[#111] p-4 rounded-xl border border-white/10 z-20">
        <div className="flex items-center gap-6">
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-text-secondary uppercase tracking-[0.2em] mb-1">System Status</span>
            <div className="flex items-center gap-2">
              <div className={cn("w-2 h-2 rounded-full animate-pulse", isAlert ? "bg-red-500" : "bg-emerald-500")} />
              <span className={cn("text-xs font-bold uppercase", isAlert ? "text-red-500" : "text-emerald-500")}>
                {isAlert ? 'EMERGENCY ALERT' : 'MONITORING ACTIVE'}
              </span>
            </div>
          </div>
          <div className="h-8 w-px bg-white/10" />
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-text-secondary uppercase tracking-[0.2em] mb-1">Active Cameras</span>
            <span className="text-xs font-bold">04 / 04</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsThermal(!isThermal)}
            className={cn(
              "px-4 py-2 rounded-md text-[10px] font-bold border transition-all",
              isThermal ? "bg-orange-500/20 border-orange-500 text-orange-500" : "bg-white/5 border-white/10 text-text-secondary"
            )}
          >
            THERMAL VIEW: {isThermal ? 'ON' : 'OFF'}
          </button>
          {!isAlert ? (
            <button onClick={triggerAlert} className="px-4 py-2 bg-red-500/20 border border-red-500/50 text-red-500 rounded-md text-[10px] font-bold hover:bg-red-500/30">
              TEST ALERT
            </button>
          ) : (
            <button onClick={resetAlert} className="px-4 py-2 bg-emerald-500/20 border border-emerald-500/50 text-emerald-500 rounded-md text-[10px] font-bold hover:bg-emerald-500/30">
              CLEAR ALERT
            </button>
          )}
        </div>
      </div>

      {/* Main Viewport */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 relative aspect-video bg-black rounded-xl border border-white/10 overflow-hidden group">
          {/* CCTV Grid Simulation */}
          <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-px bg-white/5">
            {[1, 2, 3, 4].map(cam => (
              <div key={cam} className="relative bg-[#050505] overflow-hidden">
                <div className="absolute top-2 left-2 text-[8px] font-bold text-white/50 z-20">CAM 0{cam}</div>
                
                {/* Thermal Effect */}
                {isThermal && (
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-900/40 via-purple-900/40 to-orange-900/40 mix-blend-screen z-10 animate-pulse" />
                )}

                {/* Scanlines */}
                <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,0,0.06))] bg-[length:100%_2px,3px_100%] z-10" />

                {/* Bounding Box Simulation */}
                {isAlert && cam === 2 && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute top-1/4 left-1/4 w-1/2 h-1/2 border-2 border-red-500 z-20"
                  >
                    <div className="absolute -top-5 left-0 bg-red-500 text-[8px] px-1 font-bold">FIRE DETECTED (92%)</div>
                    <motion.div 
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ repeat: Infinity, duration: 1 }}
                      className="absolute inset-0 bg-red-500/20"
                    />
                  </motion.div>
                )}

                {/* Static/Noise */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'url("https://grainy-gradients.vercel.app/noise.svg")' }} />
              </div>
            ))}
          </div>

          {/* Crosshair */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20 opacity-30">
            <div className="w-10 h-px bg-white" />
            <div className="h-10 w-px bg-white" />
          </div>

          {/* Recording Indicator */}
          <div className="absolute top-4 right-4 flex items-center gap-2 z-20">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            <span className="text-[10px] font-bold text-red-500">REC</span>
          </div>
        </div>

        {/* Analysis Panel */}
        <div className="flex flex-col gap-4">
          <div className="bg-[#111] p-4 rounded-xl border border-white/10 flex-1">
            <h4 className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-4">AI Analysis</h4>
            <div className="space-y-4">
              {[
                { label: 'Fire Confidence', val: confidence.fire, color: 'text-red-500', bg: 'bg-red-500' },
                { label: 'Smoke Density', val: confidence.smoke, color: 'text-orange-500', bg: 'bg-orange-500' },
                { label: 'Human Presence', val: confidence.person, color: 'text-blue-500', bg: 'bg-blue-500' },
              ].map(stat => (
                <div key={stat.label}>
                  <div className="flex justify-between text-[10px] mb-1 font-bold">
                    <span className="text-text-secondary">{stat.label}</span>
                    <span className={stat.color}>{stat.val}%</span>
                  </div>
                  <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      animate={{ width: `${stat.val}%` }}
                      className={cn("h-full", stat.bg)}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-6 border-t border-white/10">
              <h4 className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-3">Emergency Protocol</h4>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Sprinkler', active: isAlert },
                  { label: 'Alarm', active: isAlert },
                  { label: 'Ventilation', active: isAlert },
                  { label: 'Notification', active: isAlert },
                ].map(p => (
                  <div key={p.label} className={cn(
                    "p-2 rounded border text-[9px] font-bold text-center transition-colors",
                    p.active ? "bg-red-500/20 border-red-500 text-red-500" : "bg-white/5 border-white/10 text-text-secondary"
                  )}>
                    {p.label}: {p.active ? 'ON' : 'OFF'}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-[#111] p-4 rounded-xl border border-white/10 h-40 overflow-hidden flex flex-col">
            <h4 className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-3">Detection Log</h4>
            <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-2">
              {logs.map((log, i) => (
                <div key={i} className="text-[9px] font-mono flex gap-2">
                  <span className="text-text-secondary shrink-0">[{log.time}]</span>
                  <span className={cn(
                    log.type === 'crit' ? "text-red-500 font-bold" : "text-text-primary"
                  )}>
                    {log.msg}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


function AMRCollisionViewer() {
  const [isEStop, setIsEStop] = useState(false);
  const [acsStatus, setAcsStatus] = useState<'Connected' | 'Syncing' | 'Error'>('Connected');
  const [amrs, setAmrs] = useState([
    { id: 'AMR-01', x: 20, y: 30, speed: 1.2, battery: 85, status: 'Moving' },
    { id: 'AMR-02', x: 70, y: 60, speed: 0.8, battery: 42, status: 'Moving' },
    { id: 'AMR-03', x: 45, y: 15, speed: 0, battery: 98, status: 'Idle' },
  ]);
  const [logs, setLogs] = useState<{time: string, msg: string, type: 'info' | 'warn' | 'crit'}[]>([
    { time: '14:20:05', msg: 'ACS Handshake completed. 3 AMRs registered.', type: 'info' },
    { time: '14:22:10', msg: 'Path optimization active for AMR-01.', type: 'info' },
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!isEStop) {
        setAmrs(prev => prev.map(amr => {
          if (amr.status === 'Idle') return amr;
          return {
            ...amr,
            x: amr.x + (Math.random() - 0.5) * 2,
            y: amr.y + (Math.random() - 0.5) * 2,
          };
        }));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isEStop]);

  const triggerEStop = () => {
    setIsEStop(true);
    setAmrs(prev => prev.map(amr => ({ ...amr, speed: 0, status: 'Stopped' })));
    setLogs(prev => [
      { time: new Date().toLocaleTimeString(), msg: 'EMERGENCY STOP ACTIVATED: All AMRs halted.', type: 'crit' },
      ...prev
    ]);
  };

  const resumeOperation = () => {
    setIsEStop(false);
    setAmrs(prev => prev.map(amr => ({ ...amr, status: amr.id === 'AMR-03' ? 'Idle' : 'Moving' })));
    setLogs(prev => [
      { time: new Date().toLocaleTimeString(), msg: 'System resumed. Re-calculating paths via ACS.', type: 'info' },
      ...prev
    ]);
  };

  return (
    <div className="flex flex-col gap-4 bg-[#050505] p-6 rounded-2xl border border-white/10 font-mono text-white shadow-2xl overflow-hidden relative">
      {/* Top Bar - ACS Integration Style */}
      <div className="flex items-center justify-between bg-[#111] p-4 rounded-xl border border-white/10 z-20">
        <div className="flex items-center gap-6">
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-text-secondary uppercase tracking-[0.2em] mb-1">ACS Connection</span>
            <div className="flex items-center gap-2">
              <div className={cn("w-2 h-2 rounded-full animate-pulse", acsStatus === 'Connected' ? "bg-blue-500" : "bg-red-500")} />
              <span className={cn("text-xs font-bold uppercase", acsStatus === 'Connected' ? "text-blue-500" : "text-red-500")}>
                {acsStatus}
              </span>
            </div>
          </div>
          <div className="h-8 w-px bg-white/10" />
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-text-secondary uppercase tracking-[0.2em] mb-1">Active Fleet</span>
            <span className="text-xs font-bold">03 AMRs</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {!isEStop ? (
            <button 
              onClick={triggerEStop}
              className="px-6 py-2 bg-red-600 text-white rounded-md font-black text-sm hover:bg-red-700 transition-all shadow-[0_0_20px_rgba(220,38,38,0.4)] flex items-center gap-2"
            >
              <ShieldAlert size={18} />
              EMERGENCY STOP
            </button>
          ) : (
            <button 
              onClick={resumeOperation}
              className="px-6 py-2 bg-emerald-600 text-white rounded-md font-black text-sm hover:bg-emerald-700 transition-all flex items-center gap-2"
            >
              <Play size={18} fill="currentColor" />
              RESUME FLEET
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Map View */}
        <div className="lg:col-span-2 relative aspect-video bg-[#0a0a0a] rounded-xl border border-white/10 overflow-hidden">
          {/* Grid Background */}
          <div className="absolute inset-0 opacity-10" style={{ 
            backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', 
            backgroundSize: '40px 40px' 
          }} />
          
          {/* Factory Layout Mock */}
          <div className="absolute inset-0 p-8">
            <div className="w-full h-full border border-white/5 rounded-lg relative">
              {/* AMRs */}
              {amrs.map(amr => (
                <motion.div
                  key={amr.id}
                  animate={{ left: `${amr.x}%`, top: `${amr.y}%` }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1"
                >
                  <div className={cn(
                    "w-8 h-8 rounded bg-blue-500/20 border-2 flex items-center justify-center relative",
                    amr.status === 'Stopped' ? "border-red-500" : "border-blue-500"
                  )}>
                    <Truck size={16} className={amr.status === 'Stopped' ? "text-red-500" : "text-blue-500"} />
                    {/* Proximity Ring */}
                    <div className="absolute inset-[-20px] border border-blue-500/10 rounded-full animate-pulse" />
                  </div>
                  <span className="text-[8px] font-bold bg-black/80 px-1 rounded border border-white/10">{amr.id}</span>
                </motion.div>
              ))}

              {/* Potential Collision Zone */}
              {!isEStop && (
                <div className="absolute top-[40%] left-[30%] w-24 h-24 rounded-full bg-orange-500/5 border border-orange-500/20 flex items-center justify-center">
                  <div className="text-[8px] text-orange-500 font-bold text-center">
                    PROXIMITY<br/>WARNING
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Map Controls */}
          <div className="absolute bottom-4 left-4 flex gap-2">
            <div className="px-2 py-1 bg-black/80 border border-white/10 rounded text-[9px] font-bold">ZOOM: 100%</div>
            <div className="px-2 py-1 bg-black/80 border border-white/10 rounded text-[9px] font-bold uppercase">Layer: Collision Heatmap</div>
          </div>
        </div>

        {/* Fleet Details */}
        <div className="flex flex-col gap-4">
          <div className="bg-[#111] p-4 rounded-xl border border-white/10 flex-1 overflow-y-auto custom-scrollbar">
            <h4 className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-4">Fleet Telemetry</h4>
            <div className="space-y-4">
              {amrs.map(amr => (
                <div key={amr.id} className="p-3 rounded-lg bg-white/5 border border-white/5">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold">{amr.id}</span>
                    <span className={cn(
                      "text-[9px] px-1.5 py-0.5 rounded font-bold uppercase",
                      amr.status === 'Moving' ? "bg-blue-500/20 text-blue-500" : 
                      amr.status === 'Stopped' ? "bg-red-500/20 text-red-500" : 
                      "bg-white/10 text-text-secondary"
                    )}>
                      {amr.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[9px]">
                    <div className="flex flex-col">
                      <span className="text-text-secondary">Speed</span>
                      <span className="font-bold">{amr.speed} m/s</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-text-secondary">Battery</span>
                      <span className={cn("font-bold", amr.battery < 20 ? "text-red-500" : "text-emerald-500")}>
                        {amr.battery}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#111] p-4 rounded-xl border border-white/10 h-40 overflow-hidden flex flex-col">
            <h4 className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-3">ACS Event Log</h4>
            <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-2">
              {logs.map((log, i) => (
                <div key={i} className="text-[9px] font-mono flex gap-2">
                  <span className="text-text-secondary shrink-0">[{log.time}]</span>
                  <span className={cn(
                    log.type === 'crit' ? "text-red-500 font-bold" : "text-text-primary"
                  )}>
                    {log.msg}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChatbotViewer() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: '안녕하세요! AI 슈퍼바이저 어시스턴트입니다. 무엇을 도와드릴까요?', timestamp: new Date().toLocaleTimeString() }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = () => {
    if (!input.trim()) return;

    const userMsg: ChatMessage = {
      role: 'user',
      content: input,
      timestamp: new Date().toLocaleTimeString()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    // Simulate AI Response
    setTimeout(() => {
      let response = '';
      if (input.includes('불량률')) {
        response = '현재 전체 라인의 평균 불량률은 3.2%입니다. B라인의 도금 공정에서 미세한 변동이 감지되었으나, 허용 범위 내에 있습니다.';
      } else if (input.includes('가동률') || input.includes('OEE')) {
        response = '오늘의 종합 설비 효율(OEE)은 87.5%로 목표치(85%)를 상회하고 있습니다. 특히 조립 라인의 성능 지표가 전일 대비 4% 향상되었습니다.';
      } else if (input.includes('안전')) {
        response = '현재 모든 안전 센서가 정상 작동 중입니다. 구역 C에서 작업자 1명이 보호구 미착용으로 경고 조치되었으며, 현재는 시정 완료되었습니다.';
      } else {
        response = '요청하신 내용을 분석 중입니다. Supervisor 에이전트가 관련 데이터를 취합하여 최적의 답변을 준비하고 있습니다.';
      }

      const aiMsg: ChatMessage = {
        role: 'assistant',
        content: response,
        timestamp: new Date().toLocaleTimeString()
      };
      setMessages(prev => [...prev, aiMsg]);
      setIsTyping(false);
    }, 1500);
  };

  const suggestedQueries = [
    "현재 전체 불량률 요약해줘",
    "B라인 가동 중단 위험 분석",
    "에너지 절감을 위한 최적 가동 시간은?",
    "최근 발생한 안전 경보 이력 조회"
  ];

  return (
    <div className="flex flex-col h-[750px] bg-surface border border-border rounded-2xl overflow-hidden shadow-2xl">
      {/* Chat Header */}
      <div className="px-6 py-4 border-b border-border bg-surface-hover/30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
            <Bot size={24} />
          </div>
          <div>
            <h3 className="text-sm font-bold">AI 슈퍼바이저 어시스턴트</h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider">Online & Ready</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 rounded-lg hover:bg-surface-hover text-text-secondary transition-colors">
            <Settings size={18} />
          </button>
          <button className="p-2 rounded-lg hover:bg-surface-hover text-text-secondary transition-colors">
            <Maximize2 size={18} />
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col bg-bg/30">
          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar"
          >
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "flex gap-4 max-w-[85%]",
                  msg.role === 'user' ? "ml-auto flex-row-reverse" : ""
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm",
                  msg.role === 'assistant' ? "bg-accent text-bg" : "bg-surface-hover text-text-primary"
                )}>
                  {msg.role === 'assistant' ? <Bot size={16} /> : <User size={16} />}
                </div>
                <div className="space-y-1">
                  <div className={cn(
                    "p-4 rounded-2xl text-sm leading-relaxed shadow-sm",
                    msg.role === 'assistant' 
                      ? "bg-surface border border-border text-text-primary rounded-tl-none" 
                      : "bg-accent/10 border border-accent/20 text-text-primary rounded-tr-none"
                  )}>
                    {msg.content}
                  </div>
                  <div className={cn(
                    "text-[10px] text-text-secondary font-mono",
                    msg.role === 'user' ? "text-right" : ""
                  )}>
                    {msg.timestamp}
                  </div>
                </div>
              </motion.div>
            ))}
            {isTyping && (
              <div className="flex gap-4 max-w-[85%]">
                <div className="w-8 h-8 rounded-lg bg-accent text-bg flex items-center justify-center shrink-0 shadow-sm">
                  <Bot size={16} />
                </div>
                <div className="bg-surface border border-border p-4 rounded-2xl rounded-tl-none flex gap-1">
                  <span className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce" />
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="p-6 border-t border-border bg-surface-hover/10">
            <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2 no-scrollbar">
              {suggestedQueries.map((query, i) => (
                <button
                  key={i}
                  onClick={() => setInput(query)}
                  className="whitespace-nowrap px-3 py-1.5 rounded-full bg-surface border border-border text-[11px] text-text-secondary hover:border-accent/50 hover:text-accent transition-all"
                >
                  {query}
                </button>
              ))}
            </div>
            <div className="relative">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="메시지를 입력하세요 (Shift+Enter로 줄바꿈)"
                className="w-full bg-surface border border-border rounded-2xl px-4 py-4 pr-32 text-sm focus:outline-none focus:border-accent/50 transition-colors resize-none h-24 custom-scrollbar"
              />
              <div className="absolute right-3 bottom-3 flex items-center gap-2">
                <button className="p-2 rounded-lg hover:bg-surface-hover text-text-secondary transition-colors">
                  <Paperclip size={18} />
                </button>
                <button className="p-2 rounded-lg hover:bg-surface-hover text-text-secondary transition-colors">
                  <Mic size={18} />
                </button>
                <button 
                  onClick={handleSend}
                  disabled={!input.trim()}
                  className="p-2.5 rounded-xl bg-accent text-bg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-accent/20"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Chat Sidebar - Analysis Context */}
        <div className="hidden xl:flex w-72 border-l border-border flex-col bg-surface-hover/5">
          <div className="p-6 border-b border-border">
            <h4 className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-4">Active Analysis</h4>
            <div className="space-y-3">
              {[
                { label: 'Text-to-SQL', status: 'Idle', icon: <Database size={14} /> },
                { label: 'RAG Engine', status: 'Active', icon: <FileSearch size={14} /> },
                { label: 'Reasoning Path', status: 'Idle', icon: <GitBranch size={14} /> },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-surface border border-border">
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="text-accent">{item.icon}</span>
                    <span>{item.label}</span>
                  </div>
                  <span className={cn(
                    "text-[9px] font-bold uppercase",
                    item.status === 'Active' ? "text-emerald-500" : "text-text-secondary"
                  )}>{item.status}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
            <h4 className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-4">Reference Docs</h4>
            <div className="space-y-2">
              {[
                "2024 품질 관리 표준 매뉴얼",
                "B라인 설비 유지보수 가이드",
                "안전 수칙 및 비상 대응 절차",
                "OEE 산출 공식 및 기준"
              ].map((doc, i) => (
                <button key={i} className="w-full text-left p-2 rounded-lg hover:bg-surface-hover transition-colors group">
                  <div className="flex items-center gap-2 text-[11px] text-text-secondary group-hover:text-text-primary">
                    <FileText size={12} />
                    <span className="truncate">{doc}</span>
                  </div>
                </button>
              ))}
            </div>
            <button className="w-full mt-4 py-2 rounded-lg border border-dashed border-border text-[10px] text-text-secondary hover:border-accent/50 hover:text-accent transition-all">
              + 문서 추가하기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ModuleDetailView({ 
  item, 
  sensorData,
  isTourMode = false,
  tourScenarioIdx = 0
}: { 
  item: MenuItem; 
  sensorData: SensorData[]; 
  isTourMode?: boolean;
  tourScenarioIdx?: number;
}) {
  const [logs, setLogs] = useState<{time: string, msg: string, type: 'info' | 'warn' | 'success'}[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [activeManagementSubDetail, setActiveManagementSubDetail] = useState<string | null>(null);

  useEffect(() => {
    if (isTourMode) {
      const activeStep = TOUR_SCENARIOS[tourScenarioIdx]?.steps[1];
      if (activeStep && activeStep.targetMenuId === item.id) {
        window.dispatchEvent(new CustomEvent('tour-action', { detail: { scenario: tourScenarioIdx, step: 1, checklistIdx: 0 } }));
        window.dispatchEvent(new CustomEvent('tour-action', { detail: { scenario: tourScenarioIdx, step: 1, checklistIdx: 1 } }));
      }
    }
  }, [item.id, isTourMode, tourScenarioIdx]);

  useEffect(() => {
    // Generate initial logs
    const initialLogs = [
      { time: new Date().toLocaleTimeString(), msg: `Module ${item.name} initialized.`, type: 'info' as const },
      { time: new Date().toLocaleTimeString(), msg: `Connecting to ${item.agent || 'System'} orchestration layer...`, type: 'info' as const },
      { time: new Date().toLocaleTimeString(), msg: `Handshake successful. Listening for Kafka stream.`, type: 'success' as const },
    ];
    setLogs(initialLogs);

    const interval = setInterval(() => {
      const types = ['info', 'info', 'warn', 'success'] as const;
      const msgs = [
        "Data packet received and validated.",
        "Heuristic rule evaluation in progress...",
        "Agent inference cycle completed.",
        "State synchronization with Digital Twin successful.",
        "Threshold check: Normal parameters detected.",
        "Optimizing local cache for faster retrieval."
      ];
      const newLog = {
        time: new Date().toLocaleTimeString(),
        msg: msgs[Math.floor(Math.random() * msgs.length)],
        type: types[Math.floor(Math.random() * types.length)]
      };
      setLogs(prev => [newLog, ...prev].slice(0, 10));
    }, 3000);

    return () => clearInterval(interval);
  }, [item]);

  const renderCategorySpecificChart = () => {
    const chartColors = {
      'AI 품질 에이전트': ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'],
      'AI 설비예지보전 에이전트': ['#3b82f6', '#10b981'],
      'AI 에너지 에이전트': ['#f59e0b', '#10b981'],
      'AI 안전 에이전트': ['#ef4444', '#3b82f6'],
      'AI 생산 최적화 에이전트': ['#10b981', '#6366f1']
    };

    switch (item.category) {
      case '시스템 관리':
        switch (item.id) {
          case 26: // 온톨로지 관리
            return (
              <BarChart data={[
                { name: '엔티티', value: 45 },
                { name: '관계', value: 128 },
                { name: '속성', value: 312 },
                { name: '규칙', value: 84 },
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                  itemStyle={{ color: '#f8fafc', fontSize: '12px' }}
                />
                <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            );
          case 27: // 모델 레지스트리
            return (
              <BarChart data={[
                { name: 'Anomalib', acc: 0.94, f1: 0.92 },
                { name: 'YOLOv8', acc: 0.88, f1: 0.85 },
                { name: 'ResNet', acc: 0.91, f1: 0.89 },
                { name: 'ViT', acc: 0.96, f1: 0.95 },
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                  itemStyle={{ color: '#f8fafc', fontSize: '12px' }}
                />
                <Bar dataKey="acc" fill="#3b82f6" name="Accuracy" radius={[4, 4, 0, 0]} />
                <Bar dataKey="f1" fill="#10b981" name="F1 Score" radius={[4, 4, 0, 0]} />
              </BarChart>
            );
          case 28: // 사용자/권한 관리
            return (
              <PieChart>
                <Pie
                  data={[
                    { name: '관리자', value: 5 },
                    { name: '오퍼레이터', value: 24 },
                    { name: '설비엔지니어', value: 12 },
                    { name: '품질관리자', value: 8 },
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {['#ef4444', '#3b82f6', '#f59e0b', '#10b981'].map((color, index) => (
                    <Cell key={`cell-${index}`} fill={color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                  itemStyle={{ color: '#f8fafc', fontSize: '12px' }}
                />
              </PieChart>
            );
          case 29: // 시스템 모니터링
            return (
              <AreaChart data={sensorData}>
                <defs>
                  <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="timestamp" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                  itemStyle={{ color: '#f8fafc', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="vibration" stroke="#3b82f6" fillOpacity={1} fill="url(#colorCpu)" name="CPU Usage (%)" />
              </AreaChart>
            );
          case 30: // 알림 설정
            return (
              <BarChart data={[
                { name: 'SMS', value: 142 },
                { name: 'Email', value: 856 },
                { name: 'Push', value: 2431 },
                { name: 'Siren', value: 12 },
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                  itemStyle={{ color: '#f8fafc', fontSize: '12px' }}
                />
                <Bar dataKey="value" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            );
          default:
            return <div className="flex items-center justify-center h-full text-text-secondary text-xs">System Management Metric View</div>;
        }
      case 'AI 슈퍼바이저 에이전트':
        switch (item.id) {
          case 21: // AI 챗봇
            return (
              <BarChart data={[
                { type: '데이터 조회', count: 450 },
                { type: '지식 검색', count: 320 },
                { type: '분석 요청', count: 180 },
                { type: '기타', count: 50 },
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="type" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                  itemStyle={{ color: '#f8fafc', fontSize: '12px' }}
                />
                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            );
          case 22: // AI 추천 액션 목록
            return (
              <PieChart>
                <Pie
                  data={[
                    { name: '품질', value: 40 },
                    { name: '설비', value: 30 },
                    { name: '에너지', value: 20 },
                    { name: '안전', value: 10 },
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {['#10b981', '#3b82f6', '#f59e0b', '#ef4444'].map((color, index) => (
                    <Cell key={`cell-${index}`} fill={color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                  itemStyle={{ color: '#f8fafc', fontSize: '12px' }}
                />
              </PieChart>
            );
          case 23: // Agent 실행 이력
            return (
              <BarChart layout="vertical" data={[
                { agent: 'Quality', runs: 1240 },
                { agent: 'PM', runs: 850 },
                { agent: 'Line', runs: 2100 },
                { agent: 'Energy', runs: 600 },
                { agent: 'Safety', runs: 300 },
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                <XAxis type="number" stroke="#94a3b8" fontSize={10} />
                <YAxis dataKey="agent" type="category" stroke="#94a3b8" fontSize={10} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                  itemStyle={{ color: '#f8fafc', fontSize: '12px' }}
                />
                <Bar dataKey="runs" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
              </BarChart>
            );
          case 24: // 승인 대기 큐
            return (
              <BarChart data={[
                { status: 'Pending', count: 5 },
                { status: 'Approved', count: 42 },
                { status: 'Rejected', count: 3 },
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="status" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                  itemStyle={{ color: '#f8fafc', fontSize: '12px' }}
                />
                <Bar dataKey="count">
                  {['#f59e0b', '#10b981', '#ef4444'].map((color, index) => (
                    <Cell key={`cell-${index}`} fill={color} />
                  ))}
                </Bar>
              </BarChart>
            );
          case 31: // 슈퍼바이저 센터
            return (
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={[
                { subject: 'Safety', A: 100, fullMark: 100 },
                { subject: 'Quality', A: 95, fullMark: 100 },
                { subject: 'Production', A: 85, fullMark: 100 },
                { subject: 'Energy', A: 80, fullMark: 100 },
                { subject: 'Cost', A: 75, fullMark: 100 },
              ]}>
                <PolarGrid stroke="#334155" />
                <PolarAngleAxis dataKey="subject" stroke="#94a3b8" fontSize={10} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#94a3b8" fontSize={8} />
                <Radar name="Supervisor Priority" dataKey="A" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                  itemStyle={{ color: '#f8fafc', fontSize: '12px' }}
                />
              </RadarChart>
            );
          default:
            return (
              <BarChart data={[
                { name: '질의 응답', value: 450 },
                { name: '추천 액션', value: 120 },
                { name: '자동 제어', value: 85 },
                { name: '시뮬레이션', value: 42 },
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                  itemStyle={{ color: '#f8fafc', fontSize: '12px' }}
                />
                <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            );
        }
      case 'AI 품질 에이전트':
        switch (item.id) {
          case 1: // 실시간 불량률 현황
            return (
              <AreaChart data={sensorData}>
                <defs>
                  <linearGradient id="colorDefect" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="timestamp" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                  itemStyle={{ color: '#f8fafc', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="defect_rate" stroke="#ef4444" fillOpacity={1} fill="url(#colorDefect)" name="Defect Rate (%)" />
              </AreaChart>
            );
          case 2: // 비전검사 결과 뷰어
            return (
              <BarChart data={[
                { name: 'Frame 1', score: 0.12 },
                { name: 'Frame 2', score: 0.45 },
                { name: 'Frame 3', score: 0.08 },
                { name: 'Frame 4', score: 0.88 },
                { name: 'Frame 5', score: 0.15 },
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                  itemStyle={{ color: '#f8fafc', fontSize: '12px' }}
                />
                <Bar dataKey="score" name="Defect Score">
                  {[0, 1, 2, 3, 4].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 3 ? '#ef4444' : '#10b981'} />
                  ))}
                </Bar>
              </BarChart>
            );
          case 3: // 불량 유형 분석
            return (
              <PieChart>
                <Pie
                  data={[
                    { name: '찢김', value: 35 },
                    { name: '기포', value: 25 },
                    { name: '변색', value: 20 },
                    { name: '라벨누락', value: 15 },
                    { name: '기타', value: 5 },
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6'].map((color, index) => (
                    <Cell key={`cell-${index}`} fill={color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                  itemStyle={{ color: '#f8fafc', fontSize: '12px' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
              </PieChart>
            );
          case 4: // 온도-불량 상관분석
            return (
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis type="number" dataKey="temp" name="Temperature" unit="°C" stroke="#94a3b8" fontSize={10} />
                <YAxis type="number" dataKey="defect" name="Defect Rate" unit="%" stroke="#94a3b8" fontSize={10} />
                <ZAxis type="number" range={[50, 400]} />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                <Scatter name="Temp vs Defect" data={[
                  { temp: 160, defect: 8.2 },
                  { temp: 165, defect: 4.5 },
                  { temp: 170, defect: 2.1 },
                  { temp: 175, defect: 1.8 },
                  { temp: 180, defect: 2.5 },
                  { temp: 185, defect: 5.4 },
                  { temp: 190, defect: 9.1 },
                ]} fill="#8b5cf6" />
              </ScatterChart>
            );
          case 5: // 품질 이력 검색
            return (
              <BarChart data={[
                { batch: 'B001', yield: 98.2 },
                { batch: 'B002', yield: 94.5 },
                { batch: 'B003', yield: 99.1 },
                { batch: 'B004', yield: 88.4 },
                { batch: 'B005', yield: 97.8 },
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="batch" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis domain={[80, 100]} stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                  itemStyle={{ color: '#f8fafc', fontSize: '12px' }}
                />
                <Bar dataKey="yield" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            );
          default:
            return (
              <BarChart data={[
                { name: '찢김', value: 12 },
                { name: '기포', value: 8 },
                { name: '변색', value: 15 },
                { name: '라벨누락', value: 5 },
                { name: '기타', value: 3 },
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                  itemStyle={{ color: '#f8fafc', fontSize: '12px' }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {[0, 1, 2, 3, 4].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={chartColors['AI 품질 에이전트'][index]} />
                  ))}
                </Bar>
              </BarChart>
            );
        }
      case 'AI 설비예지보전 에이전트':
        switch (item.id) {
          case 6: // 설비 상태 종합
            return (
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={[
                { subject: '진동', A: 120, fullMark: 150 },
                { subject: '온도', A: 98, fullMark: 150 },
                { subject: '전류', A: 86, fullMark: 150 },
                { subject: '압력', A: 99, fullMark: 150 },
                { subject: '소음', A: 85, fullMark: 150 },
              ]}>
                <PolarGrid stroke="#334155" />
                <PolarAngleAxis dataKey="subject" stroke="#94a3b8" fontSize={10} />
                <PolarRadiusAxis angle={30} domain={[0, 150]} stroke="#94a3b8" fontSize={8} />
                <Radar name="Maintenance Health" dataKey="A" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                  itemStyle={{ color: '#f8fafc', fontSize: '12px' }}
                />
              </RadarChart>
            );
          case 7: // 진동/온도 추세
            return (
              <LineChart data={sensorData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="timestamp" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                  itemStyle={{ color: '#f8fafc', fontSize: '12px' }}
                />
                <Line type="monotone" dataKey="vibration" stroke="#3b82f6" strokeWidth={2} dot={false} name="Vibration (mm/s)" />
                <Line type="monotone" dataKey="temperature" stroke="#10b981" strokeWidth={2} dot={false} name="Temp (°C)" />
              </LineChart>
            );
          case 8: // RUL 잔여수명 예측
            return (
              <AreaChart data={[
                { time: '0h', prob: 100 },
                { time: '12h', prob: 98 },
                { time: '24h', prob: 92 },
                { time: '36h', prob: 85 },
                { time: '48h', prob: 70 },
                { time: '60h', prob: 45 },
                { time: '72h', prob: 15 },
              ]}>
                <defs>
                  <linearGradient id="colorRul" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="time" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                  itemStyle={{ color: '#f8fafc', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="prob" stroke="#3b82f6" fillOpacity={1} fill="url(#colorRul)" name="Survival Probability (%)" />
              </AreaChart>
            );
          case 9: // 보전 작업 오더
            return (
              <BarChart data={[
                { name: '대기', value: 12 },
                { name: '진행', value: 8 },
                { name: '완료', value: 45 },
                { name: '지연', value: 3 },
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                  itemStyle={{ color: '#f8fafc', fontSize: '12px' }}
                />
                <Bar dataKey="value" name="Order Count">
                  {['#f59e0b', '#3b82f6', '#10b981', '#ef4444'].map((color, index) => (
                    <Cell key={`cell-${index}`} fill={color} />
                  ))}
                </Bar>
              </BarChart>
            );
          case 10: // 보전 이력 조회
            return (
              <ComposedChart data={[
                { month: '1월', mtbf: 450, mttr: 2.5 },
                { month: '2월', mtbf: 480, mttr: 2.1 },
                { month: '3월', mtbf: 420, mttr: 3.2 },
                { month: '4월', mtbf: 510, mttr: 1.8 },
                { month: '5월', mtbf: 550, mttr: 1.5 },
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis yAxisId="left" stroke="#3b82f6" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis yAxisId="right" orientation="right" stroke="#ef4444" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                  itemStyle={{ color: '#f8fafc', fontSize: '12px' }}
                />
                <Bar yAxisId="left" dataKey="mtbf" fill="#3b82f6" name="MTBF (h)" radius={[4, 4, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="mttr" stroke="#ef4444" name="MTTR (h)" strokeWidth={2} />
              </ComposedChart>
            );
          default:
            return (
              <LineChart data={sensorData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="timestamp" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                  itemStyle={{ color: '#f8fafc', fontSize: '12px' }}
                />
                <Line type="monotone" dataKey="vibration" stroke="#3b82f6" strokeWidth={2} dot={false} name="Vibration (mm/s)" />
                <Line type="monotone" dataKey="temperature" stroke="#10b981" strokeWidth={2} dot={false} name="Temp (°C)" />
              </LineChart>
            );
        }
      case 'AI 에너지 에이전트':
        switch (item.id) {
          case 16: // 전력 사용 현황
            return (
              <AreaChart data={sensorData}>
                <defs>
                  <linearGradient id="colorEnergy" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="timestamp" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                  itemStyle={{ color: '#f8fafc', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="current_amp" stroke="#f59e0b" fillOpacity={1} fill="url(#colorEnergy)" name="Energy Load (A)" />
              </AreaChart>
            );
          case 17: // 에너지 비용 분석
            return (
              <BarChart data={[
                { time: '00-06', cost: 1200 },
                { time: '06-12', cost: 3500 },
                { time: '12-18', cost: 4200 },
                { time: '18-24', cost: 2800 },
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="time" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                  itemStyle={{ color: '#f8fafc', fontSize: '12px' }}
                />
                <Bar dataKey="cost" name="Cost (KRW)" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            );
          case 18: // 피크 부하 관리
            return (
              <LineChart data={[
                { time: '10:00', load: 850, limit: 1000 },
                { time: '11:00', load: 920, limit: 1000 },
                { time: '12:00', load: 980, limit: 1000 },
                { time: '13:00', load: 1050, limit: 1000 },
                { time: '14:00', load: 940, limit: 1000 },
                { time: '15:00', load: 880, limit: 1000 },
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="time" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                  itemStyle={{ color: '#f8fafc', fontSize: '12px' }}
                />
                <Line type="stepAfter" dataKey="load" stroke="#ef4444" strokeWidth={2} name="Current Load (kW)" />
                <Line type="monotone" dataKey="limit" stroke="#94a3b8" strokeDasharray="5 5" name="Contract Limit" />
              </LineChart>
            );
          default:
            return (
              <AreaChart data={sensorData}>
                <defs>
                  <linearGradient id="colorEnergy" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="timestamp" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                  itemStyle={{ color: '#f8fafc', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="current_amp" stroke="#f59e0b" fillOpacity={1} fill="url(#colorEnergy)" name="Energy Load (A)" />
              </AreaChart>
            );
        }
      case 'AI 안전 에이전트':
        switch (item.id) {
          case 19: // 지능형 CCTV 화재 감시
            return (
              <ComposedChart data={[
                { time: '10:00', score: 12, threshold: 80 },
                { time: '10:05', score: 15, threshold: 80 },
                { time: '10:10', score: 18, threshold: 80 },
                { time: '10:15', score: 85, threshold: 80 },
                { time: '10:20', score: 45, threshold: 80 },
                { time: '10:25', score: 20, threshold: 80 },
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="time" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                  itemStyle={{ color: '#f8fafc', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="score" fill="#ef4444" fillOpacity={0.3} stroke="#ef4444" name="Fire Confidence (%)" />
                <Line type="monotone" dataKey="threshold" stroke="#94a3b8" strokeDasharray="5 5" name="Alert Threshold" />
              </ComposedChart>
            );
          case 20: // AMR 충돌 방지 시스템
            return (
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis type="number" dataKey="x" name="Distance X" unit="m" stroke="#94a3b8" fontSize={10} domain={[-5, 5]} />
                <YAxis type="number" dataKey="y" name="Distance Y" unit="m" stroke="#94a3b8" fontSize={10} domain={[-5, 5]} />
                <ZAxis type="number" dataKey="z" range={[50, 400]} name="Risk" />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                <Scatter name="Nearby Workers" data={[
                  { x: 1.2, y: 0.8, z: 100 },
                  { x: -2.5, y: 3.1, z: 20 },
                  { x: 0.5, y: -0.4, z: 200 },
                  { x: 4.0, y: -2.0, z: 10 },
                ]} fill="#3b82f6" />
              </ScatterChart>
            );
          case 32: // 긴급 정지 및 알람 제어
            return (
              <BarChart data={[
                { type: 'Fire', count: 1 },
                { type: 'Collision', count: 4 },
                { type: 'Manual', count: 2 },
                { type: 'System', count: 0 },
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="type" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                  itemStyle={{ color: '#f8fafc', fontSize: '12px' }}
                />
                <Bar dataKey="count" fill="#ef4444" radius={[4, 4, 0, 0]} name="E-Stop Events" />
              </BarChart>
            );
          default:
            return (
              <PieChart>
                <Pie
                  data={[
                    { name: 'Critical', value: 2 },
                    { name: 'Warning', value: 8 },
                    { name: 'Info', value: 45 },
                  ]}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label
                >
                  {['#ef4444', '#f59e0b', '#3b82f6'].map((color, index) => (
                    <Cell key={`cell-${index}`} fill={color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                  itemStyle={{ color: '#f8fafc', fontSize: '12px' }}
                />
              </PieChart>
            );
        }
      case 'AI 생산 최적화 에이전트':
        switch (item.id) {
          case 11: // 라인별 가동 현황
            return (
              <BarChart data={[
                { line: 'Line 1', running: 85, idle: 10, down: 5 },
                { line: 'Line 2', running: 92, idle: 5, down: 3 },
                { line: 'Line 3', running: 78, idle: 15, down: 7 },
                { line: 'Line 4', running: 88, idle: 8, down: 4 },
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="line" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                  itemStyle={{ color: '#f8fafc', fontSize: '12px' }}
                />
                <Bar dataKey="running" stackId="a" fill="#10b981" name="Running" />
                <Bar dataKey="idle" stackId="a" fill="#f59e0b" name="Idle" />
                <Bar dataKey="down" stackId="a" fill="#ef4444" name="Down" />
              </BarChart>
            );
          case 12: // OEE 대시보드
            return (
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={[
                { subject: 'Availability', A: 92, fullMark: 100 },
                { subject: 'Performance', A: 88, fullMark: 100 },
                { subject: 'Quality', A: 99, fullMark: 100 },
              ]}>
                <PolarGrid stroke="#334155" />
                <PolarAngleAxis dataKey="subject" stroke="#94a3b8" fontSize={10} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#94a3b8" fontSize={8} />
                <Radar name="OEE Components" dataKey="A" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                  itemStyle={{ color: '#f8fafc', fontSize: '12px' }}
                />
              </RadarChart>
            );
          case 13: // 택트타임 분석
            return (
              <BarChart data={[
                { process: '공급', time: 12, target: 10 },
                { process: '도금', time: 45, target: 40 },
                { process: '검사', time: 15, target: 15 },
                { process: '배출', time: 8, target: 10 },
                { process: '적재', time: 22, target: 20 },
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="process" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                  itemStyle={{ color: '#f8fafc', fontSize: '12px' }}
                />
                <Bar dataKey="time" fill="#3b82f6" name="Actual Tact (s)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="target" fill="#94a3b8" name="Target Tact (s)" radius={[4, 4, 0, 0]} />
              </BarChart>
            );
          case 14: // 배치별 생산 이력
            return (
              <LineChart data={[
                { step: 'Start', val: 0 },
                { step: 'Supply', val: 10 },
                { step: 'Plating', val: 55 },
                { step: 'Inspect', val: 70 },
                { step: 'Pack', val: 92 },
                { step: 'Finish', val: 100 },
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="step" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  itemStyle={{ color: '#f8fafc', fontSize: '12px' }}
                />
                <Line type="monotone" dataKey="val" stroke="#10b981" strokeWidth={3} name="Completion %" />
              </LineChart>
            );
          case 15: // 생산 계획 대비 실적
            return (
              <BarChart data={[
                { day: 'Mon', plan: 1000, actual: 950 },
                { day: 'Tue', plan: 1000, actual: 1020 },
                { day: 'Wed', plan: 1200, actual: 1180 },
                { day: 'Thu', plan: 1200, actual: 900 },
                { day: 'Fri', plan: 1000, actual: 1050 },
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                  itemStyle={{ color: '#f8fafc', fontSize: '12px' }}
                />
                <Bar dataKey="plan" fill="#334155" name="Plan" radius={[4, 4, 0, 0]} />
                <Bar dataKey="actual" fill="#6366f1" name="Actual" radius={[4, 4, 0, 0]} />
              </BarChart>
            );
          default:
            return (
              <AreaChart data={sensorData}>
                <defs>
                  <linearGradient id="colorDefect" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="timestamp" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                  itemStyle={{ color: '#f8fafc', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="defect_rate" stroke="#10b981" fillOpacity={1} fill="url(#colorDefect)" name="Defect Rate (%)" />
              </AreaChart>
            );
        }
    }
  };

  const renderSidebarConfig = () => {
    if (item.category === '시스템 관리') {
      switch (item.id) {
        case 26: // 온톨로지 관리
          return (
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest block mb-3">Ontology Controls</label>
                <div className="space-y-2">
                  <button 
                    onClick={() => setActiveManagementSubDetail('ontology-entities')}
                    className="w-full py-2 px-3 rounded-lg bg-surface-hover border border-border text-[11px] text-left hover:border-accent/50 transition-colors flex items-center justify-between"
                  >
                    <span>Manage Entity Types</span>
                    <ChevronRight size={14} className="text-text-secondary" />
                  </button>
                  <button 
                    onClick={() => setActiveManagementSubDetail('ontology-relations')}
                    className="w-full py-2 px-3 rounded-lg bg-surface-hover border border-border text-[11px] text-left hover:border-accent/50 transition-colors flex items-center justify-between"
                  >
                    <span>Relation Mapping Editor</span>
                    <ChevronRight size={14} className="text-text-secondary" />
                  </button>
                  <button 
                    onClick={() => setActiveManagementSubDetail('ontology-schema')}
                    className="w-full py-2 px-3 rounded-lg bg-surface-hover border border-border text-[11px] text-left hover:border-accent/50 transition-colors flex items-center justify-between"
                  >
                    <span>Schema Validation Rules</span>
                    <ChevronRight size={14} className="text-text-secondary" />
                  </button>
                </div>
              </div>
              <div className="pt-6 border-t border-border">
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest block mb-3">Graph Sync Status</label>
                <div className="p-3 rounded-xl bg-purple-500/5 border border-purple-500/10 flex items-center justify-between">
                  <span className="text-[11px]">Last Sync: 2m ago</span>
                  <span className="text-[10px] font-bold text-purple-500">SYNCED</span>
                </div>
              </div>
            </div>
          );
        case 27: // 모델 레지스트리
          return (
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest block mb-3">Model Lifecycle</label>
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-surface-hover border border-border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold">Production Model</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">v2.4.0</span>
                    </div>
                    <div className="text-[10px] text-text-secondary">Deployed: 2024-03-10</div>
                  </div>
                  <button className="w-full py-2.5 rounded-xl bg-accent text-bg text-[11px] font-bold hover:opacity-90 transition-opacity">
                    Deploy New Version
                  </button>
                </div>
              </div>
              <div className="pt-6 border-t border-border">
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest block mb-3">Registry Settings</label>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-text-secondary">Auto-rollback</span>
                    <div className="w-8 h-4 bg-accent rounded-full relative">
                      <div className="absolute right-0.5 top-0.5 w-3 h-3 bg-bg rounded-full" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-text-secondary">A/B Testing</span>
                    <div className="w-8 h-4 bg-border rounded-full relative">
                      <div className="absolute left-0.5 top-0.5 w-3 h-3 bg-bg rounded-full" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        case 28: // 사용자/권한 관리
          return (
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest block mb-3">Access Management</label>
                <div className="space-y-2">
                  <button 
                    onClick={() => setActiveManagementSubDetail('user-directory')}
                    className="w-full py-2 px-3 rounded-lg bg-surface-hover border border-border text-[11px] text-left hover:border-accent/50 transition-colors flex items-center justify-between"
                  >
                    <span>User Directory</span>
                    <Users size={14} className="text-text-secondary" />
                  </button>
                  <button 
                    onClick={() => setActiveManagementSubDetail('role-definitions')}
                    className="w-full py-2 px-3 rounded-lg bg-surface-hover border border-border text-[11px] text-left hover:border-accent/50 transition-colors flex items-center justify-between"
                  >
                    <span>Role Definitions</span>
                    <Shield size={14} className="text-text-secondary" />
                  </button>
                  <button 
                    onClick={() => setActiveManagementSubDetail('audit-log')}
                    className="w-full py-2 px-3 rounded-lg bg-surface-hover border border-border text-[11px] text-left hover:border-accent/50 transition-colors flex items-center justify-between"
                  >
                    <span>Audit Log Viewer</span>
                    <History size={14} className="text-text-secondary" />
                  </button>
                </div>
              </div>
              <div className="pt-6 border-t border-border">
                <div className="p-4 rounded-xl bg-orange-500/5 border border-orange-500/10">
                  <p className="text-[10px] text-orange-500 leading-relaxed font-bold">
                    Security Alert: 2 failed login attempts detected in the last hour.
                  </p>
                </div>
              </div>
            </div>
          );
        case 29: // 시스템 모니터링
          return (
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest block mb-3">Monitoring Config</label>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-[10px] mb-2">
                      <span className="text-text-secondary">Sampling Interval</span>
                      <span className="text-accent">500ms</span>
                    </div>
                    <div className="h-1 bg-border rounded-full overflow-hidden">
                      <div className="h-full bg-accent w-1/2" />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] mb-2">
                      <span className="text-text-secondary">Log Retention</span>
                      <span className="text-accent">30 Days</span>
                    </div>
                    <div className="h-1 bg-border rounded-full overflow-hidden">
                      <div className="h-full bg-accent w-3/4" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="pt-6 border-t border-border">
                <button 
                  onClick={() => setActiveManagementSubDetail('health-report')}
                  className="w-full py-2.5 rounded-xl border border-border text-[11px] font-bold hover:bg-surface-hover transition-colors"
                >
                  System Health Report
                </button>
              </div>
            </div>
          );
        case 30: // 알림 설정
          return (
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest block mb-3">Notification Channels</label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 rounded-xl bg-surface-hover border border-accent/30 flex flex-col items-center gap-2">
                    <Mail size={16} className="text-accent" />
                    <span className="text-[10px] font-bold">Email</span>
                  </div>
                  <div className="p-3 rounded-xl bg-surface-hover border border-border flex flex-col items-center gap-2 opacity-50">
                    <MessageSquare size={16} />
                    <span className="text-[10px] font-bold">SMS</span>
                  </div>
                  <div className="p-3 rounded-xl bg-surface-hover border border-accent/30 flex flex-col items-center gap-2">
                    <Bell size={16} className="text-accent" />
                    <span className="text-[10px] font-bold">Push</span>
                  </div>
                  <div className="p-3 rounded-xl bg-surface-hover border border-border flex flex-col items-center gap-2 opacity-50">
                    <Slack size={16} />
                    <span className="text-[10px] font-bold">Slack</span>
                  </div>
                </div>
              </div>
              <div className="pt-6 border-t border-border">
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest block mb-3">Alert Severity</label>
                <div className="flex gap-1">
                  {['Low', 'Med', 'High', 'Crit'].map(s => (
                    <div key={s} className={cn(
                      "flex-1 py-1 rounded text-[9px] font-bold text-center border",
                      s === 'Crit' ? "bg-red-500/20 border-red-500/50 text-red-500" : "bg-surface-hover border-border text-text-secondary"
                    )}>
                      {s}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
      }
    }

    if (item.id === 31) { // 슈퍼바이저 센터
      return (
        <div className="space-y-6">
          <div>
            <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest block mb-3">Supervisor Controls</label>
            <div className="space-y-2">
              <button 
                className="w-full py-3 px-4 rounded-xl bg-surface-hover border border-border text-text-primary text-xs font-bold hover:border-accent/50 transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <ShieldCheck size={16} />
                  <span>안전 가드레일 설정</span>
                </div>
                <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
          <div className="pt-6 border-t border-border">
            <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest block mb-3">System Health</label>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10 flex flex-col gap-1">
                <span className="text-[10px] text-text-secondary">Uptime</span>
                <span className="text-xs font-bold text-emerald-500">99.98%</span>
              </div>
              <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/10 flex flex-col gap-1">
                <span className="text-[10px] text-text-secondary">Avg Latency</span>
                <span className="text-xs font-bold text-blue-500">24ms</span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (item.id === 19) { // 지능형 CCTV 화재 감시
      return (
        <div className="space-y-6">
          <div>
            <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest block mb-3">Monitoring Zones</label>
            <div className="space-y-2">
              {['Zone A-1 (Storage)', 'Zone B-4 (Production)', 'Zone C-2 (Loading)'].map(zone => (
                <div key={zone} className="flex items-center justify-between p-2 rounded-lg bg-surface-hover border border-border">
                  <span className="text-[11px]">{zone}</span>
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                </div>
              ))}
            </div>
          </div>
          <div className="pt-6 border-t border-border">
            <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest block mb-3">AI Model Confidence</label>
            <div className="p-4 rounded-xl bg-accent/5 border border-accent/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold">Fire Detection Model</span>
                <span className="text-[10px] text-accent">v4.2.1</span>
              </div>
              <div className="text-[10px] text-text-secondary leading-relaxed">
                Optimized for industrial environments with high-temperature equipment.
              </div>
            </div>
          </div>
          <div className="pt-6 border-t border-border">
            <button 
              onClick={() => setShowAdvanced(true)}
              className="w-full py-3 rounded-xl border border-border text-xs font-bold hover:bg-surface-hover transition-colors flex items-center justify-center gap-2"
            >
              <Settings2 size={14} />
              Detection Parameters
            </button>
          </div>
        </div>
      );
    }

    if (item.id === 20) { // AMR 충돌 방지 시스템
      return (
        <div className="space-y-6">
          <div>
            <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest block mb-3">ACS Integration</label>
            <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold">ACS API Status</span>
                <span className="text-[10px] font-bold text-blue-500">ACTIVE</span>
              </div>
              <p className="text-[10px] text-text-secondary leading-relaxed">
                Connected to Central AMR Control System. Real-time path synchronization enabled.
              </p>
            </div>
          </div>
          <div className="pt-6 border-t border-border">
            <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest block mb-3">Safety Guardrails</label>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-text-secondary">Auto E-Stop</span>
                <span className="text-emerald-500 font-bold">ENABLED</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-text-secondary">Proximity Limit</span>
                <span className="text-accent font-bold">1.5m</span>
              </div>
            </div>
          </div>
          <div className="pt-6 border-t border-border">
            <button 
              onClick={() => setShowAdvanced(true)}
              className="w-full py-3 rounded-xl border border-border text-xs font-bold hover:bg-surface-hover transition-colors flex items-center justify-center gap-2"
            >
              <Settings2 size={14} />
              ACS Parameters
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div>
          <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest block mb-3">Access Control</label>
          <div className="flex flex-wrap gap-2">
            {item.roles.map(role => (
              <span key={role} className="px-2 py-1 rounded-md bg-surface-hover text-[10px] font-bold border border-border text-text-primary">
                {role}
              </span>
            ))}
          </div>
        </div>
        
        <div className="pt-6 border-t border-border">
          <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest block mb-3">Agent Orchestration</label>
          <div className="p-4 rounded-xl bg-accent/5 border border-accent/10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold">Orchestration Level</span>
              <span className="text-xs font-mono text-accent">L2 Autonomous</span>
            </div>
            <div className="w-full h-1.5 bg-border rounded-full overflow-hidden">
              <div className="h-full bg-accent w-[65%]" />
            </div>
            <p className="mt-3 text-[10px] text-text-secondary leading-relaxed">
              This module operates under Supervisor oversight with automated heuristic validation.
            </p>
          </div>
        </div>

        <div className="pt-6 border-t border-border">
          <button 
            onClick={() => setShowAdvanced(true)}
            className="w-full py-3 rounded-xl border border-border text-xs font-bold hover:bg-surface-hover transition-colors flex items-center justify-center gap-2"
          >
            <Settings2 size={14} />
            Advanced Parameters
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-border">
        <div className="flex items-start gap-5">
          <div className="w-16 h-16 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shadow-lg shadow-accent/5">
            <Layers size={32} />
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-3xl font-bold tracking-tight">{item.name}</h2>
              <span className="px-2 py-0.5 rounded bg-accent/10 text-accent text-[10px] font-bold uppercase tracking-widest border border-accent/20">
                {item.agent || 'System'}
              </span>
            </div>
            <p className="text-text-secondary max-w-2xl leading-relaxed">{item.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1">Status</div>
            <div className="flex items-center gap-2 text-emerald-500 font-bold text-sm">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              Active & Synchronized
            </div>
          </div>
          <button 
            onClick={() => setIsExecuting(true)}
            disabled={isExecuting}
            className={cn(
              "px-6 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2",
              isExecuting 
                ? "bg-surface-hover text-text-secondary cursor-not-allowed" 
                : "bg-accent text-bg hover:opacity-90 active:scale-95 shadow-lg shadow-accent/20"
            )}
          >
            {isExecuting ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} />}
            {isExecuting ? 'Executing...' : 'Run Module'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {item.id === 21 ? (
          <div className="lg:col-span-12">
            <ChatbotViewer />
          </div>
        ) : (
          <>
            {/* Main Content Area (8 cols) */}
            <div className="lg:col-span-8 space-y-6">
              {/* Technical Specs Bento */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="dashboard-card group hover:border-accent/30 transition-colors">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                      <Clock size={18} />
                    </div>
                    <h4 className="text-xs font-bold uppercase tracking-widest text-text-secondary">Usage Scenario</h4>
                  </div>
                  <p className="text-sm leading-relaxed text-text-primary">{item.details?.scenario}</p>
                </div>
                <div className="dashboard-card group hover:border-accent/30 transition-colors">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500">
                      <Cpu size={18} />
                    </div>
                    <h4 className="text-xs font-bold uppercase tracking-widest text-text-secondary">Internal Logic</h4>
                  </div>
                  <p className="text-sm leading-relaxed text-text-primary font-mono text-[11px] bg-bg/50 p-2 rounded border border-border/50">
                    {item.details?.logic}
                  </p>
                </div>
                <div className="dashboard-card group hover:border-accent/30 transition-colors">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-orange-500/10 text-orange-500">
                      <ShieldAlert size={18} />
                    </div>
                    <h4 className="text-xs font-bold uppercase tracking-widest text-text-secondary">Target / Guardrail</h4>
                  </div>
                  <p className="text-sm leading-relaxed text-text-primary">{item.details?.target}</p>
                </div>
                <div className="dashboard-card group hover:border-accent/30 transition-colors">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                      <BarChart3 size={18} />
                    </div>
                    <h4 className="text-xs font-bold uppercase tracking-widest text-text-secondary">Expected Output</h4>
                  </div>
                  <p className="text-sm leading-relaxed text-text-primary">{item.details?.output}</p>
                </div>
              </div>

              {/* Live Visualization */}
              {item.id === 2 ? (
                <VisionInspectionViewer />
              ) : item.id === 19 ? (
                <FireMonitoringViewer />
              ) : item.id === 20 ? (
                <AMRCollisionViewer />
              ) : (
                <div className="dashboard-card">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h3 className="text-sm font-bold flex items-center gap-2">
                        <Activity size={16} className="text-accent" />
                        Module Execution Preview (Live)
                      </h3>
                      <p className="text-[10px] text-text-secondary mt-1">Real-time telemetry from Kafka stream</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                        <span className="text-[10px] font-bold text-text-secondary uppercase">Primary</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="text-[10px] font-bold text-text-secondary uppercase">Secondary</span>
                      </div>
                    </div>
                  </div>
                  <div className="h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      {renderCategorySpecificChart()}
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar Area (4 cols) */}
            <div className="lg:col-span-4 space-y-6">
              {/* Live Execution Log */}
              <div className="dashboard-card flex flex-col h-[400px]">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <History size={16} className="text-accent" />
                    Execution Trace
                  </h3>
                  <span className="text-[10px] font-mono text-text-secondary">v1.4.2-stable</span>
                </div>
                <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                  <AnimatePresence initial={false}>
                    {logs.map((log, i) => (
                      <motion.div 
                        key={`${log.time}-${i}`}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex gap-3 text-[11px] font-mono"
                      >
                        <span className="text-text-secondary shrink-0">[{log.time}]</span>
                        <span className={cn(
                          log.type === 'warn' ? "text-orange-500" : 
                          log.type === 'success' ? "text-emerald-500" : 
                          "text-text-primary"
                        )}>
                          {log.msg}
                        </span>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
                <div className="mt-4 pt-4 border-t border-border">
                  <div className="flex items-center justify-between text-[10px] font-bold text-text-secondary uppercase tracking-widest">
                    <span>Latency</span>
                    <span className="text-accent">14ms</span>
                  </div>
                </div>
              </div>

              {/* Access & Metadata */}
              <div className="dashboard-card">
                <h3 className="text-sm font-bold mb-6 flex items-center gap-2">
                  <Settings size={16} className="text-accent" />
                  {item.category === '시스템 관리' ? 'Management Console' : 'Module Configuration'}
                </h3>
                {renderSidebarConfig()}
              </div>
            </div>
          </>
        )}
      </div>
      
      <AdvancedParametersModal 
        item={item} 
        isOpen={showAdvanced} 
        onClose={() => setShowAdvanced(false)} 
      />

      <ManagementSubModal
        type={activeManagementSubDetail}
        isOpen={activeManagementSubDetail !== null}
        onClose={() => setActiveManagementSubDetail(null)}
      />
    </div>
  );
}
