/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
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
  Legend,
  ReferenceLine
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
import { t, tValue, matchesKeyword, useI18n } from './i18n';
import LanguageSwitcher from './i18n/LanguageSwitcher';
import AiSettingsModal from './components/AiSettingsModal';
import ThemeSwitcher from './theme/ThemeSwitcher';
import { useToast } from './components/Toast';
import { downloadCsv, downloadFile, downloadJson, fileStamp, simplePdf } from './utils/demoFiles';

// Split out of the initial download: markdown is only needed for the
// orchestration methodology tab.
const MarkdownView = lazy(() => import('./components/MarkdownView'));
import DemoModeBadge from './components/DemoModeBadge';
import { IS_EXPO } from './config/edition';
import { ExpoBanner, ExpoDirector } from './expo/ExpoDirector';
import { useStage, type StagedCase } from './expo/stage';
import { ManagerView, RoleSwitcher, WorkerView, useIncidents, useViewerRole, type ViewerRole } from './components/RoleViews';
import { AppliedTuningCard, ScreenGuide, TuningModal, menuSummary, useModuleTuning } from './components/ModuleTuning';
import { useSafeTimeout } from './hooks/useSafeTimeout';
import { useTelemetry } from './hooks/useTelemetry';
import { useLiveValue } from './hooks/useLiveValue';
import { livingSeries, TICK_MS, type Excursion, type PlantState } from './services/telemetry';
import { chartPalette, useTheme } from './theme';

/** Placeholder shown while a lazily loaded chunk arrives. */
function ChunkFallback() {
  return (
    <div className="flex items-center justify-center py-12 text-text-secondary">
      <Loader2 size={20} className="animate-spin" />
    </div>
  );
}

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Readings arrive every couple of seconds but carry an HH:mm stamp, so a time
 * axis keyed on it repeats the same minute on every tick. Label each reading by
 * its age instead ("-40s" … "지금").
 */
function withAgoLabels<T>(history: T[]): (T & { ago: string })[] {
  const step = TICK_MS / 1000;
  const last = history.length - 1;
  return history.map((d, i) => ({ ...d, ago: i === last ? t('지금') : `-${(last - i) * step}s` }));
}

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

const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();

/**
 * At the booth the self-running demo files the live proposals itself, so the
 * day starts with proposals people already approved: the recommendation list
 * and the tracker are never empty.
 */
const EXPO_DECISIONS: AgentDecision[] = [
  { ...INITIAL_DECISIONS[1], status: 'approved', timestamp: hoursAgo(3.5) },
  { ...INITIAL_DECISIONS[0], status: 'approved', timestamp: hoursAgo(5) },
];

/** Earlier approvals and overrides, so the audit trail has a history before anyone acts. */
const MOCK_OVERRIDE_LOGS: OverrideLog[] = [
  { id: 'log-3', timestamp: hoursAgo(3.5), operator: 'Lee Eng', equipment: '케이스패커-02', parameter: 'replace_bearing', original_value: '교체 권장', new_value: '교체 권장', reason: 'Approved as recommended', type: 'ai_adjustment' },
  { id: 'log-2', timestamp: hoursAgo(5), operator: 'Kim Tech', equipment: '수축포장기-01', parameter: 'adjust_temperature', original_value: 173, new_value: 172.5, reason: '야간 조 실측값 기준으로 0.5°C 낮춰 적용', type: 'manual_override' },
  { id: 'log-1', timestamp: hoursAgo(7), operator: 'Park Maint', equipment: '포장1라인', parameter: 'load_balance', original_value: '비핵심 부하 분산', new_value: 'REJECTED', reason: '정기 점검 중이라 이번 회차는 보류', type: 'manual_override' },
];

/** Operator identity stamped on approvals and audit entries. A public booth shows no real account. */
const CURRENT_OPERATOR = IS_EXPO ? 'demo@impix' : 'oddeye2796@gmail.com';

/** Short random id for client-side records (logs, events, evidence packs). */
const newId = () => Math.random().toString(36).slice(2, 11);

/** Menu id of the integrated dashboard, and the anchor of its orchestration panel. */
const DASHBOARD_MENU_ID = 0;
/** Screens with their own view instead of the generic module page; the app puts the screen guide above them. */
const OWN_VIEW_MENU_IDS = [DASHBOARD_MENU_ID, 8, 9, 22, 23, 31];

/** The day's earlier alerts in the bell menu; each opens the screen it is about. */
const EARLIER_NOTIFICATIONS: { id: string; title: string; time: string; tone: 'danger' | 'warning' | 'info'; menuId: number }[] = [
  { id: 'n1', title: 'AMR 2대 충전 대기로 자재 공급 지연', time: '10:10', tone: 'warning', menuId: 20 },
  { id: 'n2', title: '세척실 바닥 누수로 미끄럼 위험', time: '09:30', tone: 'danger', menuId: 0 },
  { id: 'n3', title: '케이스패커-02 감속기 토크 이상', time: '06:20', tone: 'info', menuId: 9 },
];
const ORCHESTRATION_ANCHOR = 'orchestration-panel';

export default function App() {
  // Subscribing here re-renders the entire (unmemoized) tree when the operator
  // switches language, so every module level t() call is re-evaluated.
  const { locale } = useI18n();
  const { theme } = useTheme();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [selectedMenu, setSelectedMenu] = useState<MenuItem>(MENU_ITEMS[0]);
  // At a booth the dashboard gets the whole screen; the menu is one click away.
  const [isSidebarOpen, setIsSidebarOpen] = useState(!IS_EXPO);
  const plant = useTelemetry();
  const sensorData = plant.history;
  const [decisions, setDecisions] = useState<AgentDecision[]>(IS_EXPO ? EXPO_DECISIONS : INITIAL_DECISIONS);
  const [overrideLogs, setOverrideLogs] = useState<OverrideLog[]>(MOCK_OVERRIDE_LOGS);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: '안녕하세요! IMPIX AI Supervisor입니다. 무엇을 도와드릴까요?', timestamp: new Date().toLocaleTimeString() }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isRecommending, setIsRecommending] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [isAiSettingsOpen, setIsAiSettingsOpen] = useState(false);
  const [scrollTarget, setScrollTarget] = useState<string | null>(null);
  const [viewerRole, setViewerRole] = useViewerRole();
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  // Matches a screen by its name, group or description, in whichever language is showing.
  const searchResults = (() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return MENU_ITEMS.filter(item =>
      [item.name, item.category, item.description, item.agent ?? ''].some(text => t(text).toLowerCase().includes(q) || text.toLowerCase().includes(q)),
    ).slice(0, 8);
  })();
  const [readNotifs, setReadNotifs] = useState<Set<string>>(() => new Set());
  // Proposals waiting on a person come first, then the day's earlier alerts.
  const notifications = [
    ...decisions
      .filter(d => d.status === 'pending')
      .map(d => ({
        id: `d-${d.timestamp}-${d.action}`,
        title: t('{equipment}: AI 제안 승인 대기', { equipment: t(d.target_equipment) }),
        time: new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        tone: 'warning' as const,
        menuId: DASHBOARD_MENU_ID,
      })),
    ...EARLIER_NOTIFICATIONS.map(n => ({ ...n, title: t(n.title) })),
  ];
  const chatEndRef = useRef<HTMLDivElement>(null);

  /** Switch view, optionally scrolling to an anchor once the new view has rendered. */
  const navigateTo = (menuId: number, anchor?: string) => {
    const target = MENU_ITEMS.find(m => m.id === menuId);
    if (target) setSelectedMenu(target);
    // The orchestration panel is the engineer's drill-down, so going there
    // switches the dashboard to the engineer view.
    if (anchor === ORCHESTRATION_ANCHOR) setViewerRole('engineer');
    setScrollTarget(anchor ?? null);
  };

  useEffect(() => {
    if (!scrollTarget) return;
    document.getElementById(scrollTarget)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setScrollTarget(null);
  }, [scrollTarget, selectedMenu]);

  const fetchAIRecommendations = async () => {
    setIsRecommending(true);
    setAiError(null);
    try {
      const result = await generateRecommendations(sensorData);
      if (result.status === 'error') {
        setAiError(result.message);
      } else if (result.data.length > 0) {
        const formatted: AgentDecision[] = result.data.map((r: any) => ({
          ...r,
          timestamp: new Date().toISOString(),
          status: 'pending'
        }));
        setDecisions(prev => [...formatted, ...prev].slice(0, 10));
      }
    } finally {
      setIsRecommending(false);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSendMessage = async () => {
    const prompt = chatInput.trim();
    if (!prompt || isChatLoading) return;

    const userMsg: ChatMessage = { role: 'user', content: prompt, timestamp: new Date().toLocaleTimeString() };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsChatLoading(true);

    const history = chatMessages.map(m => ({
      role: m.role === 'user' ? 'user' as const : 'model' as const,
      parts: [{ text: m.content }]
    }));

    try {
      const result = await generateChatResponse(prompt, history, sensorData);
      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: result.status === 'ok' ? result.data : result.message,
        timestamp: new Date().toLocaleTimeString(),
      };
      setChatMessages(prev => [...prev, assistantMsg]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const appendLog = (log: Omit<OverrideLog, 'id' | 'timestamp' | 'operator'>) => {
    setOverrideLogs(prev => [{ id: newId(), timestamp: new Date().toISOString(), operator: CURRENT_OPERATOR, ...log }, ...prev]);
  };

  const handleApprove = (index: number, adjustedValue?: number | string, notes?: string) => {
    const decision = decisions[index];
    if (!decision || decision.status !== 'pending') return;
    const finalValue = adjustedValue !== undefined ? adjustedValue : decision.recommended_value;

    setDecisions(prev => prev.map((d, i) => i === index ? {
      ...d,
      status: 'approved',
      adjusted_value: adjustedValue,
      operator_notes: notes
    } : d));

    appendLog({
      equipment: decision.target_equipment,
      parameter: decision.action,
      original_value: decision.recommended_value,
      new_value: finalValue,
      reason: notes || 'Approved as recommended',
      type: adjustedValue !== undefined ? 'manual_override' : 'ai_adjustment'
    });
  };

  const handleReject = (index: number, notes?: string) => {
    const decision = decisions[index];
    if (!decision || decision.status !== 'pending') return;

    setDecisions(prev => prev.map((d, i) => i === index ? {
      ...d,
      status: 'rejected',
      operator_notes: notes
    } : d));

    appendLog({
      equipment: decision.target_equipment,
      parameter: decision.action,
      original_value: decision.recommended_value,
      new_value: 'REJECTED',
      reason: notes || 'Rejected by operator',
      type: 'manual_override'
    });
  };

  const handleLog = (index: number) => {
    const decision = decisions[index];
    if (!decision) return;
    setDecisions(prev => prev.map((d, i) => i === index ? { ...d, status: 'logged' } : d));

    appendLog({
      equipment: decision.target_equipment,
      parameter: decision.action,
      original_value: decision.recommended_value,
      new_value: 'ARCHIVED',
      reason: 'Manual log to history for audit',
      type: 'ai_adjustment'
    });
  };

  const renderContent = () => {
    switch (selectedMenu.id) {
      case DASHBOARD_MENU_ID: // 통합 대시보드
        return (
          <DashboardView
            sensorData={sensorData}
            decisions={decisions}
            fetchAIRecommendations={fetchAIRecommendations}
            isRecommending={isRecommending}
            aiError={aiError}
            handleApprove={handleApprove}
            handleReject={handleReject}
            onNavigate={navigateTo}
            role={viewerRole}
            onRoleChange={setViewerRole}
          />
        );
      case 8: // RUL 잔여수명 예측
        return <RULPredictionView />;
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
        return <SupervisorCenterView onOpenOrchestration={() => navigateTo(DASHBOARD_MENU_ID, ORCHESTRATION_ANCHOR)} />;
      default:
        return <ModuleDetailView key={selectedMenu.id} item={selectedMenu} sensorData={sensorData} />;
    }
  };

  return (
    <div lang={locale} data-theme={theme} className="flex h-screen overflow-hidden bg-bg text-text-primary">
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: isSidebarOpen ? 280 : 0, opacity: isSidebarOpen ? 1 : 0 }}
        className="border-r border-border bg-surface/50 backdrop-blur-xl flex flex-col overflow-hidden shrink-0"
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

        <nav className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
          {CATEGORIES.map(category => (
            <div key={category} className="space-y-1">
              <h2 className="px-3 text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-2">
                {t(category)}
              </h2>
              {MENU_ITEMS.filter(item => item.category === category).map(item => (
                <button
                  key={item.id}
                  onClick={() => navigateTo(item.id)}
                  title={t(menuSummary(item.id) ?? item.description)}
                  aria-current={selectedMenu.id === item.id ? 'page' : undefined}
                  className={cn(
                    "sidebar-item w-full text-left text-sm",
                    selectedMenu.id === item.id && "sidebar-item-active"
                  )}
                >
                  <ChevronRight size={14} className={cn("shrink-0 transition-transform", selectedMenu.id === item.id && "rotate-90")} />
                  <span className="min-w-0">
                    <span className="block truncate">{t(item.name)}</span>
                    {menuSummary(item.id) && <span className="block truncate text-[10px] font-normal text-text-secondary">{t(menuSummary(item.id)!)}</span>}
                  </span>
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-border bg-surface/30">
          <div className="flex items-center gap-3 p-2 rounded-lg bg-white/5">
            <div className="w-8 h-8 rounded-full bg-surface-hover flex items-center justify-center">
              <User size={16} className="text-text-secondary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{CURRENT_OPERATOR}</p>
              <p className="text-[10px] text-text-secondary">{t('Administrator')}</p>
            </div>
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {IS_EXPO && <ExpoBanner />}
        {/* Header */}
        <header className="h-16 border-b border-border bg-surface/30 backdrop-blur-md flex items-center justify-between px-6 z-10">
          <div className="flex min-w-0 items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 rounded-lg hover:bg-surface-hover transition-colors"
              aria-label={t('메뉴 열기/닫기')}
            >
              {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div className="h-4 w-[1px] bg-border" />
            <div className="flex min-w-0 items-center gap-2">
              <span className="hidden truncate whitespace-nowrap text-xs text-text-secondary lg:inline">
                {t(selectedMenu.category)}
              </span>
              <ChevronRight size={12} className="hidden shrink-0 text-text-secondary lg:inline" />
              <span className="truncate whitespace-nowrap text-sm font-medium">{t(selectedMenu.name)}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.nativeEvent.isComposing && searchResults[0]) {
                    navigateTo(searchResults[0].id);
                    setSearchQuery('');
                  }
                  if (e.key === 'Escape') setSearchQuery('');
                }}
                placeholder={t('지표, 에이전트, 로그 검색...')}
                aria-label={t('지표, 에이전트, 로그 검색...')}
                className="bg-surface border border-border rounded-full py-1.5 pl-10 pr-4 text-xs w-64 focus:outline-none focus:border-accent transition-colors"
              />
              {searchQuery.trim() && (
                <div className="absolute left-0 top-10 z-50 w-80 rounded-2xl border border-border bg-surface p-2 shadow-2xl" data-testid="search-results">
                  {searchResults.length === 0 ? (
                    <div className="px-3 py-4 text-center text-[11px] text-text-secondary">{t('일치하는 화면이 없어요')}</div>
                  ) : searchResults.map(item => (
                    <button
                      key={item.id}
                      onClick={() => { navigateTo(item.id); setSearchQuery(''); }}
                      className="flex w-full flex-col rounded-xl px-3 py-2 text-left hover:bg-surface-hover"
                    >
                      <span className="text-xs font-bold">{t(item.name)}</span>
                      <span className="text-[10px] text-text-secondary">{t(item.category)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <ThemeSwitcher />
            <LanguageSwitcher />
            <div className="relative">
              <button
                onClick={() => setIsNotifOpen(open => !open)}
                className="p-2 rounded-lg hover:bg-surface-hover relative"
                aria-label={t('알림')}
                aria-expanded={isNotifOpen}
              >
                <Bell size={20} />
                {notifications.some(n => !readNotifs.has(n.id)) && (
                  <span className="absolute top-2 right-2 w-2 h-2 bg-danger rounded-full border-2 border-bg" />
                )}
              </button>
              {isNotifOpen && (
                <div className="absolute right-0 top-11 z-50 w-80 rounded-2xl border border-border bg-surface p-2 shadow-2xl" data-testid="notifications">
                  <div className="flex items-center justify-between px-2 py-1.5">
                    <span className="text-xs font-bold">{t('알림')}</span>
                    <button
                      onClick={() => setReadNotifs(new Set(notifications.map(n => n.id)))}
                      className="text-[10px] font-bold text-accent hover:underline"
                    >{t('모두 읽음')}</button>
                  </div>
                  <div className="max-h-80 space-y-1 overflow-y-auto custom-scrollbar">
                    {notifications.map(n => (
                      <button
                        key={n.id}
                        onClick={() => {
                          setReadNotifs(prev => new Set(prev).add(n.id));
                          setIsNotifOpen(false);
                          navigateTo(n.menuId);
                        }}
                        className={cn(
                          "flex w-full items-start gap-2 rounded-xl p-2 text-left hover:bg-surface-hover",
                          !readNotifs.has(n.id) && "bg-accent/5",
                        )}
                      >
                        <span className={cn("mt-1 h-2 w-2 shrink-0 rounded-full", n.tone === 'danger' ? "bg-danger" : n.tone === 'warning' ? "bg-warning" : "bg-accent")} />
                        <span className="min-w-0 flex-1">
                          <span className="block text-[11px] font-bold leading-snug">{n.title}</span>
                          <span className="block text-[10px] text-text-secondary">{n.time}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={() => setIsAiSettingsOpen(true)}
              className="p-2 rounded-lg hover:bg-surface-hover cursor-pointer"
              title={t('AI 연결 설정')}
              aria-label={t('AI 연결 설정')}
            >
              <Settings size={20} />
            </button>
          </div>
        </header>

        {/* Dynamic Content Area */}
        <div className={cn("flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar", IS_EXPO && "pb-[50vh] lg:pb-6")}>
          {OWN_VIEW_MENU_IDS.includes(selectedMenu.id) && (
            <ScreenGuide key={selectedMenu.id} menuId={selectedMenu.id} defaultOpen={selectedMenu.id !== DASHBOARD_MENU_ID} />
          )}
          {renderContent()}
        </div>

        {/* Chatbot Toggle Button */}
        <button
          onClick={() => setIsChatOpen(!isChatOpen)}
          className={cn("fixed bottom-6 right-6 w-14 h-14 rounded-full bg-accent text-white shadow-2xl shadow-accent/40 flex items-center justify-center hover:scale-110 transition-transform z-50", IS_EXPO && "bottom-[52vh] lg:bottom-6 lg:right-[424px] xl:right-[464px]")}
          aria-label={t('AI Supervisor')}
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
              className={cn("fixed bottom-24 right-6 w-96 max-w-[calc(100vw-3rem)] h-[500px] bg-surface border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden z-50", IS_EXPO && "lg:right-[424px] xl:right-[464px]")}
            >
              <div className="p-4 border-b border-border bg-accent/10 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
                  <Cpu size={18} className="text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold">{t('AI Supervisor')}</h4>
                    <DemoModeBadge />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />
                    <span className="text-[10px] text-text-secondary">{t('Online & Ready')}</span>
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
                      "p-3 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap",
                      msg.role === 'user' ? "bg-accent text-white rounded-tr-none" : "bg-surface-hover text-text-primary rounded-tl-none"
                    )}>
                      {t(msg.content)}
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
                    onKeyDown={(e) => {
                      // Ignore the Enter that commits an IME composition (Korean/Japanese input).
                      if (e.key === 'Enter' && !e.nativeEvent.isComposing) handleSendMessage();
                    }}
                    placeholder={t('공장에 대해 무엇이든 물어보세요...')}
                    className="w-full bg-bg border border-border rounded-xl py-2 pl-4 pr-10 text-xs focus:outline-none focus:border-accent transition-colors"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={isChatLoading || !chatInput.trim()}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-accent hover:text-accent-hover disabled:opacity-50"
                    aria-label={t('보내기')}
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AiSettingsModal isOpen={isAiSettingsOpen} onClose={() => setIsAiSettingsOpen(false)} />
      </main>

      {IS_EXPO && (
        <ExpoDirector
          decisions={decisions}
          setDecisions={setDecisions}
          onApprove={handleApprove}
          setRole={role => { setSelectedMenu(MENU_ITEMS[0]); setViewerRole(role); }}
        />
      )}
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
      data-testid="kpi-card"
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
          <h4 data-testid="kpi-value" className="text-xl font-bold">{value}</h4>
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

function RULPredictionView() {
  const chart = chartPalette();
  const safeTimeout = useSafeTimeout();
  const [created, setCreated] = useState(false);

  const handleCreateOrder = () => {
    setCreated(true);
    safeTimeout(() => {
      setCreated(false);
    }, 3000);
  };

  const getScenarioData = () => {
    return {
      unit: 'Days',
      rul: 14,
      confidence: '92.4%',
      machinery: t('수축포장기-01'),
      warning: 'Vibration patterns indicate bearing wear. Schedule inspection within the next 7 days to prevent unplanned downtime.',
      // Health index (%) over the bearing's run so far; below `threshold` it needs maintenance.
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
  };

  const sData = getScenarioData();
  const data = sData.chartData;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{t('RUL Prediction')}</h2>
          <p className="text-sm text-text-secondary">{t('Remaining Useful Life estimation for critical machinery')}</p>
        </div>
        <div className="flex gap-3">
          <select value={sData.machinery} onChange={() => {}} className="bg-surface border border-border rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:border-accent">
            <option value={sData.machinery}>{sData.machinery}</option>
            <option value={t('컨베이어-04')}>{t('컨베이어-04')}</option>
            <option value={t('로봇팔-02')}>{t('로봇팔-02')}</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 dashboard-card h-[400px]">
          <h3 className="font-bold mb-6">{t('Health Degradation Curve')}</h3>
          <ResponsiveContainer width="100%" height="85%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
              <XAxis dataKey="name" stroke={chart.axis} fontSize={10} tickLine={false} axisLine={false} />
              <YAxis unit="%" domain={[0, 100]} stroke={chart.axis} fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: chart.tooltipBg, border: `1px solid ${chart.tooltipBorder}`, borderRadius: '8px' }}
                itemStyle={{ color: chart.tooltipText, fontSize: '12px' }}
              />
              <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
              <ReferenceLine y={data[0].threshold} stroke="#ef4444" strokeDasharray="5 5" strokeWidth={2} label={{ value: t('정비 기준선 {n}%', { n: data[0].threshold }), position: 'insideBottomLeft', fontSize: 10, fill: '#ef4444' }} />
              <Line type="monotone" dataKey="health" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }} name={t('건강 지수 (%)')} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-4">
          <div className="dashboard-card bg-accent/5 border-accent/20 text-center py-8">
            <p className="text-xs font-bold text-accent uppercase tracking-widest mb-2">{t('Estimated RUL')}</p>
            <h4 className="text-5xl font-black text-white mb-2">{sData.rul} <span className="text-xl font-normal text-text-secondary">{sData.unit}</span></h4>
            <p className="text-[10px] text-text-secondary">{t('Confidence:')} {sData.confidence}</p>
          </div>
          
          <div className="dashboard-card">
            <h4 className="text-xs font-bold uppercase mb-4">{t('Maintenance Recommendation')}</h4>
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
              {created ? t('Work Order Created! (현장 접수 완료)') : t('Create Work Order')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const MOCK_WORK_ORDERS = [
  { id: 'WO-2024-001', asset: '수축포장기-01', type: 'Preventive', priority: 'Medium', status: 'In Progress', user: 'Kim Tech' },
  { id: 'WO-2024-002', asset: '로봇팔-02', type: 'Corrective', priority: 'High', status: 'Pending', user: 'Lee Eng' },
  { id: 'WO-2024-003', asset: '컨베이어-04', type: 'Inspection', priority: 'Low', status: 'Completed', user: 'Park Maint' },
  { id: 'WO-2024-004', asset: '모터-08', type: 'Corrective', priority: 'Urgent', status: 'Pending', user: 'Choi Tech' },
];

/** What a new order is raised for, in turn, so repeated clicks add different work. */
const NEW_ORDER_POOL = [
  { asset: '케이스패커-02', type: 'Corrective', priority: 'High', user: 'Kim Tech' },
  { asset: '컨베이어-04', type: 'Preventive', priority: 'Medium', user: 'Park Maint' },
  { asset: '모터-08', type: 'Inspection', priority: 'Low', user: 'Lee Eng' },
];

const NEXT_STATUS: Record<string, string> = { Pending: 'In Progress', 'In Progress': 'Completed', Completed: 'Pending' };

function WorkOrderView() {
  const [orders, setOrders] = useState(MOCK_WORK_ORDERS);
  const { showToast } = useToast();
  const addOrder = () => {
    const pick = NEW_ORDER_POOL[orders.length % NEW_ORDER_POOL.length];
    const id = `WO-2024-${String(orders.length + 1).padStart(3, '0')}`;
    setOrders(prev => [{ id, ...pick, status: 'Pending' }, ...prev]);
    showToast(t('작업 오더 {id}를 발행했습니다', { id }));
  };
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{t('Maintenance Work Orders')}</h2>
          <p className="text-sm text-text-secondary">{t('Manage and track maintenance tasks across the facility')}</p>
        </div>
        <button onClick={addOrder} className="px-4 py-2 bg-accent text-bg rounded-lg text-xs font-bold flex items-center gap-2 hover:opacity-90 transition-opacity">
          <Wrench size={14} /> {t('New Order')}
        </button>
      </div>

      <div className="dashboard-card overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border bg-surface-hover/50">
              <th className="px-4 py-3 text-[10px] font-bold text-text-secondary uppercase tracking-wider">ID</th>
              <th className="px-4 py-3 text-[10px] font-bold text-text-secondary uppercase tracking-wider">{t('Asset')}</th>
              <th className="px-4 py-3 text-[10px] font-bold text-text-secondary uppercase tracking-wider">{t('Type')}</th>
              <th className="px-4 py-3 text-[10px] font-bold text-text-secondary uppercase tracking-wider">{t('Priority')}</th>
              <th className="px-4 py-3 text-[10px] font-bold text-text-secondary uppercase tracking-wider">{t('Status')}</th>
              <th className="px-4 py-3 text-[10px] font-bold text-text-secondary uppercase tracking-wider">{t('Assigned To')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {orders.map((order, i) => (
              <tr
                key={order.id}
                onClick={() => setOrders(prev => prev.map((o, j) => j === i ? { ...o, status: NEXT_STATUS[o.status] } : o))}
                title={t('클릭하면 다음 상태로 넘어갑니다')}
                className="hover:bg-surface-hover transition-colors cursor-pointer"
              >
                <td className="px-4 py-4 text-xs font-mono text-accent">{order.id}</td>
                <td className="px-4 py-4 text-xs font-medium">{t(order.asset)}</td>
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
  const [rejectingIdx, setRejectingIdx] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');

  const startAdjusting = (idx: number, currentVal: string | number) => {
    setRejectingIdx(null);
    setAdjustingIdx(idx);
    setAdjValue(currentVal.toString());
    setAdjNotes('');
  };

  // Rejecting used to go through `window.prompt`, which cannot be translated
  // and drops an OS dialog over the demo. The reason is captured inline, the
  // same way an adjustment is.
  const startRejecting = (idx: number) => {
    setAdjustingIdx(null);
    setRejectingIdx(idx);
    setRejectReason('');
  };

  const confirmReject = (idx: number) => {
    onReject(idx, rejectReason.trim() || undefined);
    setRejectingIdx(null);
    setRejectReason('');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{t('AI Recommendation Engine')}</h2>
          <p className="text-sm text-text-secondary">{t('Actionable insights generated by multi-agent analysis')}</p>
        </div>
        <button 
          onClick={onRefresh}
          disabled={isLoading}
          className="px-4 py-2 bg-accent text-bg rounded-lg text-xs font-bold flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
          {t('Refresh Insights')}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {decisions.length === 0 ? (
          <div className="dashboard-card text-center py-20">
            <p className="text-text-secondary">{t('No recommendations available. Click refresh to generate insights.')}</p>
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
                    <span className="text-accent">{t(decision.target_equipment)}</span>
                  </h3>
                  <p className="text-sm text-text-secondary leading-relaxed max-w-3xl">
                    {t(decision.reasoning)}
                  </p>
                  
                  {decision.operator_notes && (
                    <div className="mt-3 p-2 bg-white/5 rounded border border-white/10 italic text-xs text-text-secondary">
                      <span className="font-bold text-accent not-italic mr-2">{t('Operator Note:')}</span>
                      {decision.operator_notes}
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap items-center gap-6">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-text-secondary uppercase font-bold">{t('Recommended:')}</span>
                      <span className="text-xs font-mono bg-white/5 px-2 py-1 rounded">{tValue(decision.recommended_value)}</span>
                    </div>
                    {decision.adjusted_value && (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-text-secondary uppercase font-bold">{t('Adjusted:')}</span>
                        <span className="text-xs font-mono bg-accent/20 text-accent px-2 py-1 rounded">{decision.adjusted_value}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-text-secondary uppercase font-bold">{t('Priority:')}</span>
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
                    {rejectingIdx === idx ? (
                      <div className="space-y-3 p-3 bg-surface rounded-lg border border-danger/30">
                        <div>
                          <label className="text-[10px] font-bold text-text-secondary uppercase block mb-1">
                            {t('거부 사유')}
                          </label>
                          <textarea
                            autoFocus
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            className="w-full bg-bg border border-border rounded px-2 py-1 text-xs focus:border-danger outline-none h-16 resize-none"
                            placeholder={t('이 추천을 거부하는 이유를 남겨주세요 (선택)')}
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => confirmReject(idx)}
                            className="flex-1 py-1.5 bg-danger text-white text-[10px] font-bold rounded cursor-pointer"
                          >
                            {t('거부 확정')}
                          </button>
                          <button
                            onClick={() => setRejectingIdx(null)}
                            className="flex-1 py-1.5 bg-surface-hover text-[10px] font-bold rounded cursor-pointer"
                          >
                            {t('Cancel')}
                          </button>
                        </div>
                      </div>
                    ) : adjustingIdx === idx ? (
                      <div className="space-y-3 p-3 bg-surface rounded-lg border border-accent/30">
                        <div>
                          <label className="text-[10px] font-bold text-text-secondary uppercase block mb-1">{t('New Value')}</label>
                          <input 
                            type="text" 
                            value={adjValue}
                            onChange={(e) => setAdjValue(e.target.value)}
                            className="w-full bg-bg border border-border rounded px-2 py-1 text-xs focus:border-accent outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-text-secondary uppercase block mb-1">{t('Adjustment Reason')}</label>
                          <textarea 
                            value={adjNotes}
                            onChange={(e) => setAdjNotes(e.target.value)}
                            className="w-full bg-bg border border-border rounded px-2 py-1 text-xs focus:border-accent outline-none h-16 resize-none"
                            placeholder={t('Why are you overriding?')}
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
                            {t('Confirm')}
                          </button>
                          <button 
                            onClick={() => setAdjustingIdx(null)}
                            className="flex-1 py-1.5 bg-surface border border-border text-[10px] font-bold rounded"
                          >
                            {t('Cancel')}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <button 
                          onClick={() => onApprove(idx)}
                          className="w-full py-2 bg-accent hover:bg-accent-hover text-bg text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                          <CheckCircle2 size={16} /> {t('Approve')}
                        </button>
                        <button 
                          onClick={() => startAdjusting(idx, decision.recommended_value)}
                          className="w-full py-2 bg-surface border border-border hover:bg-surface-hover text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                          <Settings2 size={16} /> {t('Adjust & Approve')}
                        </button>
                        <button 
                          onClick={() => startRejecting(idx)}
                          className="w-full py-2 bg-surface border border-border hover:bg-danger/10 hover:border-danger/30 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                          <X size={16} /> {t('Reject')}
                        </button>
                        <button 
                          onClick={() => onLog(idx)}
                          className="w-full py-2 bg-surface border border-border hover:bg-accent/10 hover:border-accent/30 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                          <ClipboardList size={16} /> {t('Log to History')}
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
        <h2 className="text-2xl font-bold">{t('Human-in-the-Loop Audit Logs')}</h2>
        <p className="text-sm text-text-secondary">{t('History of AI adjustments and manual overrides')}</p>
      </div>

      <div className="dashboard-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-surface-hover/50">
                <th className="px-4 py-3 text-[10px] font-bold text-text-secondary uppercase tracking-wider">{t('Timestamp')}</th>
                <th className="px-4 py-3 text-[10px] font-bold text-text-secondary uppercase tracking-wider">{t('Operator')}</th>
                <th className="px-4 py-3 text-[10px] font-bold text-text-secondary uppercase tracking-wider">{t('Equipment')}</th>
                <th className="px-4 py-3 text-[10px] font-bold text-text-secondary uppercase tracking-wider">{t('Action')}</th>
                <th className="px-4 py-3 text-[10px] font-bold text-text-secondary uppercase tracking-wider">{t('Values')}</th>
                <th className="px-4 py-3 text-[10px] font-bold text-text-secondary uppercase tracking-wider">{t('Type')}</th>
                <th className="px-4 py-3 text-[10px] font-bold text-text-secondary uppercase tracking-wider">{t('Reason')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-xs text-text-secondary italic">
                    {t('No override logs recorded yet.')}
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-surface-hover transition-colors">
                    <td className="px-4 py-4 text-[10px] font-mono whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-4 text-xs font-medium">{log.operator}</td>
                    <td className="px-4 py-4 text-xs">{t(log.equipment)}</td>
                    <td className="px-4 py-4 text-xs font-mono text-accent">{log.parameter}</td>
                    <td className="px-4 py-4 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-text-secondary line-through">{tValue(log.original_value)}</span>
                        <ChevronRight size={12} className="text-text-secondary" />
                        <span className={cn(
                          "font-bold",
                          log.new_value === 'REJECTED' ? "text-danger" : "text-accent"
                        )}>{tValue(log.new_value)}</span>
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
                    <td className="px-4 py-4 text-xs text-text-secondary max-w-xs truncate" title={t(log.reason)}>
                      {t(log.reason)}
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
  const live = useLiveValue();
  const chart = chartPalette();
  const kpiData: Record<string, any> = {
    'OEE': {
      title: 'Overall Equipment Effectiveness',
      icon: <Activity className="text-accent" />,
      description: t('설비의 가동률, 성능, 품질을 종합적으로 나타내는 지표입니다.'),
      metrics: [
        { label: t('Availability (가동률)'), value: '92.5%', trend: '+1.2%', color: 'text-blue-400' },
        { label: t('Performance (성능)'), value: '94.8%', trend: '+0.8%', color: 'text-purple-400' },
        { label: t('Quality (품질)'), value: '98.7%', trend: '+0.1%', color: 'text-emerald-400' },
      ],
      chart: (
        <BarChart data={[
          { name: t('가동률'), value: live(92.5, 0) },
          { name: t('성능'), value: live(94.8, 1) },
          { name: t('품질'), value: live(98.7, 2) },
          { name: 'OEE', value: live(84.2, 3) },
        ]}>
          <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
          <XAxis dataKey="name" stroke={chart.axis} fontSize={10} />
          <YAxis stroke={chart.axis} fontSize={10} domain={[0, 100]} />
          <Tooltip contentStyle={{ backgroundColor: chart.tooltipBg, border: `1px solid ${chart.tooltipBorder}`, borderRadius: '8px' }} itemStyle={{ color: chart.tooltipText }} />
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
      description: t('실시간 비전 검사 데이터를 기반으로 산출된 불량률 상세 분석입니다.'),
      metrics: [
        { label: 'Critical Defects', value: t('2건'), trend: 'Stable', color: 'text-danger' },
        { label: 'Warning Defects', value: t('15건'), trend: t('-3건'), color: 'text-warning' },
        { label: 'Yield Rate', value: '98.76%', trend: '+0.5%', color: 'text-accent' },
      ],
      chart: (
        <LineChart data={[
          { time: '09:00', rate: live(1.5, 4) },
          { time: '10:00', rate: live(1.2, 5) },
          { time: '11:00', rate: live(1.8, 6) },
          { time: '12:00', rate: live(1.1, 7) },
          { time: '13:00', rate: live(1.24, 8) },
        ]}>
          <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
          <XAxis dataKey="time" stroke={chart.axis} fontSize={10} />
          <YAxis stroke={chart.axis} fontSize={10} />
          <Tooltip contentStyle={{ backgroundColor: chart.tooltipBg, border: `1px solid ${chart.tooltipBorder}`, borderRadius: '8px' }} itemStyle={{ color: chart.tooltipText }} />
          <Line type="monotone" dataKey="rate" stroke="#ef4444" strokeWidth={2} dot={{ r: 4, fill: '#ef4444' }} />
        </LineChart>
      )
    },
    'Energy': {
      title: 'Energy Consumption Detail',
      icon: <Zap className="text-warning" />,
      description: t('공장 전체 및 개별 라인별 에너지 사용량 분석 데이터입니다.'),
      metrics: [
        { label: 'Peak Load', value: '145 kW', trend: '14:20', color: 'text-orange-400' },
        { label: 'Avg Consumption', value: '102 kW/h', trend: '-5%', color: 'text-yellow-400' },
        { label: 'Cost Est.', value: '₩142,000', trend: 'Today', color: 'text-emerald-400' },
      ],
      chart: (
        <AreaChart data={[
          { time: '08:00', usage: live(80, 9) },
          { time: '10:00', usage: live(120, 10) },
          { time: '12:00', usage: live(145, 11) },
          { time: '14:00', usage: live(110, 12) },
          { time: '16:00', usage: live(95, 13) },
        ]}>
          <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
          <XAxis dataKey="time" stroke={chart.axis} fontSize={10} />
          <YAxis stroke={chart.axis} fontSize={10} />
          <Tooltip contentStyle={{ backgroundColor: chart.tooltipBg, border: `1px solid ${chart.tooltipBorder}`, borderRadius: '8px' }} itemStyle={{ color: chart.tooltipText }} />
          <Area type="monotone" dataKey="usage" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.2} />
        </AreaChart>
      )
    },
    'Agents': {
      title: 'Active AI Agents Status',
      icon: <Cpu className="text-indigo-400" />,
      description: t('현재 오케스트레이션 레이어에서 작동 중인 에이전트들의 상태입니다.'),
      metrics: [
        { label: 'Quality Agent', value: 'Active', trend: 'Load 12%', color: 'text-emerald-400' },
        { label: 'PM Agent', value: 'Active', trend: 'Load 45%', color: 'text-emerald-400' },
        { label: 'Safety Agent', value: 'Standby', trend: 'Load 2%', color: 'text-blue-400' },
      ],
      chart: (
        <PieChart>
          <Pie
            data={[
              { name: t('Active'), value: live(4, 14) },
              { name: t('Standby'), value: live(2, 15) },
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
          <Tooltip contentStyle={{ backgroundColor: chart.tooltipBg, border: `1px solid ${chart.tooltipBorder}`, borderRadius: '8px' }} itemStyle={{ color: chart.tooltipText }} />
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
            {t('확인')}
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
  aiError,
  handleApprove,
  handleReject,
  onNavigate,
  role,
  onRoleChange,
}: { 
  sensorData: SensorData[], 
  decisions: AgentDecision[], 
  fetchAIRecommendations: () => void,
  isRecommending: boolean,
  aiError: string | null,
  handleApprove: (i: number) => void,
  handleReject: (i: number) => void,
  onNavigate: (menuId: number, anchor?: string) => void,
  role: ViewerRole,
  onRoleChange: (role: ViewerRole) => void,
}) {
  const live = useLiveValue();
  const chart = chartPalette();
  const plant = useTelemetry();
  const [activeKpi, setActiveKpi] = useState<string | null>(null);
  const [sensorMetric, setSensorMetric] = useState<'temperature' | 'vibration'>('temperature');
  const sensorColor = sensorMetric === 'temperature' ? '#10b981' : '#8b5cf6';
  const tooltipStyle = { backgroundColor: chart.tooltipBg, border: `1px solid ${chart.tooltipBorder}`, borderRadius: '8px' };

  // Trend arrows compare against the start of the visible window, so they move
  // with the data instead of being decorative constants.
  const first = plant.history[0];
  const delta = (now: number, then: number | undefined, digits = 1) =>
    then === undefined ? '—' : `${now - then >= 0 ? '+' : ''}${(now - then).toFixed(digits)}`;
  const incidents = useIncidents(plant, decisions);
  const showEvidence = () => onNavigate(DASHBOARD_MENU_ID, ORCHESTRATION_ANCHOR);

  // Field staff and managers get their own screens; the full dashboard below,
  // with the supervisor → agent → model hierarchy, is the engineer's view.
  if (role !== 'engineer') {
    return (
      <>
        <RoleSwitcher role={role} onChange={onRoleChange} />
        {role === 'worker' ? (
          <WorkerView incidents={incidents} onApprove={handleApprove} onReject={handleReject} onEvidence={showEvidence} />
        ) : (
          <ManagerView plant={plant} incidents={incidents} onApprove={handleApprove} onReject={handleReject} onEvidence={showEvidence} />
        )}
      </>
    );
  }

  return (
    <>
      <RoleSwitcher role={role} onChange={onRoleChange} />
      <AnimatePresence>
        {activeKpi && (
          <KpiDetailModal kpi={activeKpi} onClose={() => setActiveKpi(null)} />
        )}
      </AnimatePresence>

      {/* Top Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title={t('Overall Equipment Effectiveness')} 
          value={`${plant.oee.toFixed(1)}%`}
          trend={`${delta(plant.availability, first ? 96 : undefined)}%`}
          icon={<Activity className="text-accent" />} 
          onClick={() => setActiveKpi('OEE')}
        />
        <StatCard 
          title={t('Defect Rate')} 
          value={`${plant.defectRate.toFixed(2)}%`}
          trend={delta(plant.defectRate, first?.defect_rate, 2)}
          icon={<ShieldAlert className="text-danger" />} 
          onClick={() => setActiveKpi('Defect')}
        />
        <StatCard 
          title={t('Energy Consumption')} 
          value={`${plant.energyKw.toLocaleString()} kWh`}
          trend={`${delta(plant.energyKw, 1240, 0)} kW`}
          icon={<Zap className="text-warning" />} 
          onClick={() => setActiveKpi('Energy')}
        />
        <StatCard 
          title={t('Active Agents')} 
          value={`${plant.activeAgents} / 6`}
          trend={plant.excursion ? t('대응 중') : t('STABLE')}
          icon={<Cpu className="text-indigo-400" />} 
          onClick={() => setActiveKpi('Agents')}
        />
      </div>

      {/* AI Orchestration: Supervisor → agents → ML/DL models */}
      <OrchestrationPanel decisions={decisions} onNavigate={onNavigate} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <div className="lg:col-span-2 dashboard-card flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold">{t('Real-time Sensor Monitoring')}</h3>
              <p className="text-xs text-text-secondary">{t('포장1라인 - 수축포장기-01')}</p>
            </div>
            <div className="flex gap-2">
              {(['vibration', 'temperature'] as const).map(metric => (
                <button
                  key={metric}
                  onClick={() => setSensorMetric(metric)}
                  aria-pressed={sensorMetric === metric}
                  className={cn(
                    "px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-colors",
                    sensorMetric === metric ? "bg-accent/20 text-accent" : "bg-surface-hover hover:text-text-primary"
                  )}
                >
                  {metric === 'vibration' ? t('Vibration') : t('Temperature')}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={withAgoLabels(sensorData)}>
                <defs>
                  <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={sensorColor} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={sensorColor} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
                <XAxis 
                  dataKey="ago" 
                  stroke={chart.axis} 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false} 
                  minTickGap={16}
                />
                <YAxis 
                  stroke={chart.axis} 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false} 
                  domain={['auto', 'auto']}
                  tickFormatter={(v: number) => `${v.toFixed(1)}${sensorMetric === 'vibration' ? ' mm/s' : '°C'}`}
                  width={64}
                />
                <Tooltip 
                  contentStyle={tooltipStyle}
                  itemStyle={{ color: chart.tooltipText, fontSize: '12px' }}
                />
                <Area 
                  type="monotone" 
                  dataKey={sensorMetric}
                  name={sensorMetric === 'vibration' ? t('진동 (mm/s)') : t('온도 (°C)')}
                  stroke={sensorColor}
                  isAnimationActive={false}
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
              {t('AI Recommendations')}
            </h3>
            <div className="flex gap-2">
              <button 
                onClick={fetchAIRecommendations}
                disabled={isRecommending}
                className="p-1 rounded hover:bg-surface-hover text-text-secondary disabled:opacity-50"
                title={t('Refresh AI Recommendations')}
              >
                {isRecommending ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
              </button>
              <DemoModeBadge />
              <span data-testid="pending-count" className="bg-warning/10 text-warning text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">
                {decisions.filter(d => d.status === 'pending').length} {t('Action Required')}
              </span>
            </div>
          </div>
          {aiError && (
            <div
              role="alert"
              className="mb-3 flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/10 p-2.5 text-[11px] leading-relaxed text-danger"
            >
              <AlertCircle size={13} className="mt-0.5 shrink-0" />
              <span>{aiError}</span>
            </div>
          )}
          <div className="flex-1 space-y-4 overflow-y-auto custom-scrollbar pr-2">
            {decisions.map((decision, idx) => (
              <div key={`${decision.agent}-${decision.action}-${decision.timestamp}-${idx}`} className={cn(
                "p-3 rounded-lg border transition-all",
                decision.status === 'pending' ? "bg-surface-hover border-border" : 
                decision.status === 'approved' ? "bg-accent/5 border-accent/20 opacity-60" :
                decision.status === 'logged' ? "bg-surface border-border opacity-60" :
                "bg-danger/5 border-danger/20 opacity-60"
              )}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-accent uppercase tracking-wider">{decision.agent}</span>
                  <span className="text-[10px] text-text-secondary font-mono">{new Date(decision.timestamp).toLocaleTimeString()}</span>
                </div>
                <h4 className="text-sm font-bold mb-1">{decision.action.replace(/_/g, ' ')}</h4>
                <p className="text-xs text-text-secondary leading-relaxed mb-3">
                  {t(decision.reasoning)}
                </p>
                {decision.status === 'pending' && (
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleApprove(idx)}
                      className="flex-1 py-1.5 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-md transition-colors flex items-center justify-center gap-1"
                    >
                      <CheckCircle2 size={14} /> {t('Approve')}
                    </button>
                    <button 
                      onClick={() => handleReject(idx)}
                      className="flex-1 py-1.5 bg-surface border border-border hover:bg-danger/10 hover:border-danger/30 text-xs font-bold rounded-md transition-colors flex items-center justify-center gap-1"
                    >
                      <X size={14} /> {t('Reject')}
                    </button>
                  </div>
                )}
                {decision.status !== 'pending' && (
                  <div className={cn(
                    "text-[10px] font-bold uppercase flex items-center gap-1",
                    decision.status === 'approved' ? "text-accent" :
                    decision.status === 'logged' ? "text-text-secondary" : "text-danger"
                  )}>
                    {decision.status === 'approved' ? <CheckCircle2 size={12} /> : decision.status === 'logged' ? <History size={12} /> : <X size={12} />}
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
          <h3 className="font-bold mb-6">{t('유형별 불량 건수 (오늘)')}</h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { name: t('찢김'), value: live(12, 16) },
                { name: t('기포'), value: live(8, 17) },
                { name: t('변색'), value: live(15, 18) },
                { name: t('라벨누락'), value: live(5, 19) },
                { name: t('기타'), value: live(3, 20) },
              ].map(d => ({ ...d, value: Math.round(d.value) }))}>
                <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
                <XAxis dataKey="name" stroke={chart.axis} fontSize={10} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} stroke={chart.axis} fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={tooltipStyle}
                  itemStyle={{ color: chart.tooltipText, fontSize: '12px' }}
                />
                <Bar dataKey="value" name={t('불량 건수')} radius={[4, 4, 0, 0]}>
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
          <h3 className="font-bold mb-6">{t('System Health & Infrastructure')}</h3>
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




/**
 * The supervisor working an agenda item with the agents it involves: each
 * agent puts its position to the supervisor (proposal, objection, information)
 * and the supervisor closes with a decision. It plays on its own and moves to
 * the next item when one is settled.
 */
function CoordinationVisualizer() {
  const [step, setStep] = useState(0);
  const [events, setEvents] = useState<CoordinationEvent[]>([]);
  const [activeScenario, setActiveScenario] = useState(0);
  // At the booth the agenda is the case being played, so engineers see the
  // same event the floor sees, argued out between the agents.
  const { staged, replay } = useStage();
  const stagedScenario = staged && {
    title: t(staged.coordination.title),
    description: t(staged.coordination.description),
    agents: [...new Set(staged.coordination.timeline.map(e => e.fromAgent))],
    timeline: staged.coordination.timeline.map(e => ({ ...e, content: t(e.content), reasoning: e.reasoning ? t(e.reasoning) : undefined })),
  };
  useEffect(() => {
    setActiveScenario(0);
    setEvents([]);
    setStep(0);
  }, [staged?.kind, replay]);
  const scenarios = stagedScenario ? [stagedScenario] : [
    {
      title: t('[통합] 6대 에이전트 전사 최적화 조율'),
      description: t('생산 극대화 목표 하에 안전, 예지보전, 품질, 에너지, 물류 에이전트 간의 동시 다자 협업 및 실시간 중재'),
      agents: [
        'prod',
        'qual',
        'pm',
        'energy',
        'safety',
        'logistics',
      ],
      timeline: [
        { fromAgent: 'prod', toAgent: 'supervisor', type: 'proposal', content: t('신규 긴급 오더 대응을 위해 패키징 1라인 분당 가동 속도를 20% 초고속 모드로 상향 제안합니다.') },
        { fromAgent: 'pm', toAgent: 'supervisor', type: 'critique', content: t('반대합니다. 메인 구동 장치의 축 마모도가 최근 91%에 육박하여 즉각 가속 시 12시간 내 열화 고장 위험률이 89%입니다.') },
        { fromAgent: 'qual', toAgent: 'supervisor', type: 'critique', content: t('분석 보고: 한계 속도 도달 시 열접합 파트 온도 불안정으로 제품 원형 성형 스크래치 불량률이 7.5%로 상향 칩니다.') },
        { fromAgent: 'energy', toAgent: 'supervisor', type: 'critique', content: t('실하중 분석: 당일 정오 피크 전력 한계치 도달을 감안하면 모터 고 전력 모드가 겹쳐 계약 초과 위약 경고가 활성화됩니다.') },
        { fromAgent: 'safety', toAgent: 'supervisor', type: 'info', content: t('규정 파라미터: 과마모 구역 마찰열 증가로 주변 분위기 온도가 1급 가이드 한계를 근접하는 예방 안전 가드레일을 침범합니다.') },
        { fromAgent: 'logistics', toAgent: 'supervisor', type: 'proposal', content: t('물류 최적화 대안: 출하 완료 물류를 바탕으로 AMR 이송 간격을 25% 가속 설정화하고 완충 적재 슬롯을 조기 전환하면 지연 분산 완충이 가능합니다.') },
        { fromAgent: 'supervisor', toAgent: 'all', type: 'agreement', content: t('최종 조율 결과: 생산 속도는 +5%만 완만하고 안정되게 가져가고, 전력 피크 타임은 백업 가동 ESS 120kW 방전으로 버티며, AMR 완충 버퍼 로직을 실시간 실행해 납기 차질률을 격파합니다.'), reasoning: t('품질 최우선 경영 가이드와 미세 이상 안전 가드레일을 100% 수호한 채, 물류 지능 조율 및 ESS 연동 복합 의사결정으로 단 한 번의 정지 없이 납품 목표를 실현함.') }
      ]
    },
    {
      title: t('B라인 생산 속도 최적화 충돌'),
      description: t('생산량 증대 요청과 품질 저하 우려 간의 실시간 조율'),
      agents: [
        'prod',
        'qual',
        'pm',
        'energy',
      ],
      timeline: [
        { fromAgent: 'prod', toAgent: 'supervisor', type: 'proposal', content: t('생산 목표 달성을 위해 B라인 속도를 15% 상향 제안합니다.') },
        { fromAgent: 'qual', toAgent: 'supervisor', type: 'critique', content: t('반대합니다. 현재 온도 조건에서 속도 상향 시 핀홀 불량률이 4.2%까지 상승할 것으로 예측됩니다.') },
        { fromAgent: 'pm', toAgent: 'supervisor', type: 'info', content: t('설비 진동 데이터는 안정적입니다. 속도 상향에 따른 기계적 과부하 위험은 낮습니다.') },
        { fromAgent: 'energy', toAgent: 'supervisor', type: 'critique', content: t('피크 시간대입니다. 15% 상향 시 계약 전력 초과 위험이 있습니다.') },
        { fromAgent: 'supervisor', toAgent: 'all', type: 'agreement', content: t('중재 결과: 속도 상향을 5%로 제한하고, 품질 유지를 위해 냉각 온도를 2도 하향 조정합니다. 에너지 피크는 ESS 방전으로 상쇄합니다.'), reasoning: t('품질 가드레일(핀홀 불량)과 에너지 비용 최적화를 고려하여 절충안을 도출함. ESS 활용을 통해 생산성 저하를 최소화함.') }
      ]
    },
    {
      title: t('C구역 화재 징후 감지 및 대응'),
      description: t('안전 최우선 원칙에 따른 생산 중단 및 소방 연동'),
      agents: [
        'safety',
        'prod',
        'supervisor',
      ],
      timeline: [
        { fromAgent: 'safety', toAgent: 'supervisor', type: 'proposal', content: t('C구역 CCTV에서 연기 감지. 즉시 가동 중단 및 소방 셔터 작동을 요청합니다.') },
        { fromAgent: 'prod', toAgent: 'supervisor', type: 'critique', content: t('현재 공정 중단 시 5억원 상당의 원부자재 손실이 발생합니다. 오탐 가능성 확인이 필요합니다.') },
        { fromAgent: 'supervisor', toAgent: 'all', type: 'agreement', content: t('안전 우선 원칙 적용. 즉시 가동 중단 명령 하달. 소방 연동 시스템 가동. 손실보다 인명 및 설비 보호가 최우선입니다.'), reasoning: t('Safety-First 정책에 따라 인명 피해 가능성이 0.1%라도 존재할 경우 즉시 중단이 원칙임. 경제적 손실보다 안전 가드레일이 상위 계층임.') }
      ]
    },
    {
      title: t('가스 미세 누출 감지 대응'),
      description: t('가스 누출 위험 상황 발생 시 위험 무력화 및 조치 가이드'),
      agents: [
        'safety',
        'pm',
        'prod',
        'supervisor',
      ],
      timeline: [
        { fromAgent: 'safety', toAgent: 'supervisor', type: 'proposal', content: t('A-3 구역에서 메탄 가스 15ppm 감지. 환기 설비 풀 가동 및 국소 소화 제어가 시급합니다.') },
        { fromAgent: 'pm', toAgent: 'supervisor', type: 'info', content: t('진단 결과 밸브 No.12 개스킷 미세 노후화 확인됨. 임시 압력 저하 상태로 운전 시 누출량 80% 저감 가능합니다.') },
        { fromAgent: 'prod', toAgent: 'supervisor', type: 'critique', content: t('생산 정지 시 납기 지연 발생. 밸브 No.12의 메인 라인을 우회로로 전환 요청합니다.') },
        { fromAgent: 'supervisor', toAgent: 'all', type: 'agreement', content: t('중재 결과: 즉시 우회관로 전환 실행 및 해당 밸브 메인 차단. 환기팬 100% 가동 상태를 유지하며 설비 유지보수팀 현장 급파 지시.'), reasoning: t('안전 수칙 범위 내 가스 희석 및 확산 방지는 필수. 우회 관로 조치가 가능하므로 생산 중단 없이 가스 누출 부위를 무해하게 격리함.') }
      ]
    },
    {
      title: t('피크 전력 긴급 부하 제약'),
      description: t('국가 전력망 주파수 급락 경보에 따른 신속 부하 셰딩'),
      agents: [
        'energy',
        'prod',
        'qual',
        'supervisor',
      ],
      timeline: [
        { fromAgent: 'energy', toAgent: 'supervisor', type: 'proposal', content: t('한국전력 거래소 긴급 수요감축(DR) 지시 하달. 5분 이내 전력 사용량 250kW 감축 의무 발생.') },
        { fromAgent: 'prod', toAgent: 'supervisor', type: 'critique', content: t('B 공정 열처리 가마 대기 소모 중단 불가. 임의 전력 차단 시 내부 공정물 전량 폐기 우려.') },
        { fromAgent: 'qual', toAgent: 'supervisor', type: 'info', content: t('가열 유지가 필수적이며 하강 온도가 15도 이상 떨어지지 않아야 품질 파라미터를 유지할 수 있습니다.') },
        { fromAgent: 'supervisor', toAgent: 'all', type: 'agreement', content: t('중재 결과: 긴급히 유틸리티 ESS 배터리에서 150kW 급전하고, 제3건조실 순차 제어로 110kW 일시 감축 처리하여 패널티 회피 및 공정 영향 무력화 완료.'), reasoning: t('DR 감축 불이행에 따른 대규모 패널티(약 1200만원 상당) 및 정전 연동 방지. ESS를 즉각 구동하고 비핵심 건조 공정의 냉간 유예 주기를 밀어 조율함.') }
      ]
    }
  ];

  const scenario = scenarios[activeScenario];
  const participants = scenario.agents.filter(id => id !== 'supervisor');
  const lastEvent = events[events.length - 1];
  const agreed = lastEvent?.type === 'agreement';

  // Runs on its own: each agent speaks in turn, the supervisor closes with a
  // decision, and after a pause the next agenda item starts.
  useEffect(() => {
    const done = step >= scenario.timeline.length;
    const timer = setTimeout(() => {
      if (done) {
        setActiveScenario(s => (s + 1) % scenarios.length);
        setEvents([]);
        setStep(0);
        return;
      }
      setEvents(prev => [...prev, { ...scenario.timeline[step], id: newId(), timestamp: new Date().toLocaleTimeString() } as CoordinationEvent]);
      setStep(s => s + 1);
    }, done ? 7000 : step === 0 ? 1200 : 3200);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, activeScenario]);

  const logRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' });
  }, [events.length]);

  const stanceOf = (id: string): CoordinationEvent['type'] | 'waiting' => {
    if (agreed) return 'agreement';
    const said = [...events].reverse().find(e => e.fromAgent === id);
    return said ? said.type : 'waiting';
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Stage: supervisor in the middle, the six agents around it */}
        <div className="overflow-x-auto rounded-2xl border border-border bg-bg/40 custom-scrollbar">
          <div
            className="relative h-[460px] min-w-[620px]"
            style={{ backgroundImage: 'radial-gradient(color-mix(in srgb, var(--color-text-secondary) 22%, transparent) 1px, transparent 1px)', backgroundSize: '18px 18px' }}
          >
            <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
              {Object.entries(COORD_SLOTS).map(([id, p]) => {
                const joined = participants.includes(id);
                const speaking = !agreed && lastEvent?.fromAgent === id;
                const stroke = speaking ? COORD_TYPE_STYLE[lastEvent.type].hex : agreed && joined ? 'var(--color-accent)' : coordAgent(id).hex;
                return (
                  <g key={id}>
                    {(speaking || (agreed && joined)) && (
                      <line x1={50} y1={50} x2={p.x} y2={p.y} stroke={stroke} strokeOpacity={0.2} strokeWidth={12} vectorEffect="non-scaling-stroke" />
                    )}
                    <line
                      x1={50} y1={50} x2={p.x} y2={p.y}
                      stroke={joined ? stroke : 'var(--color-text-secondary)'}
                      strokeOpacity={joined ? (speaking || agreed ? 1 : 0.45) : 0.18}
                      strokeWidth={speaking || (agreed && joined) ? 3 : 1.5}
                      strokeDasharray={joined ? '6 8' : '2 6'}
                      strokeLinecap="round"
                      vectorEffect="non-scaling-stroke"
                      className={speaking ? 'edge-flow-in' : agreed && joined ? 'edge-flow-out' : undefined}
                    />
                  </g>
                );
              })}
            </svg>

            {/* Message packets travelling along the links */}
            <AnimatePresence>
              {lastEvent && (agreed ? participants : [lastEvent.fromAgent]).map(id => {
                const p = COORD_SLOTS[id];
                if (!p) return null;
                const from = agreed ? { x: 50, y: 50 } : p;
                const to = agreed ? p : { x: 50, y: 50 };
                const color = COORD_TYPE_STYLE[lastEvent.type].hex;
                return (
                  <motion.span
                    key={`${lastEvent.id}-${id}`}
                    className="pointer-events-none absolute z-10 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white"
                    style={{ backgroundColor: color, boxShadow: `0 0 12px 3px ${color}` }}
                    initial={{ left: `${from.x}%`, top: `${from.y}%`, opacity: 0, scale: 0.6 }}
                    animate={{ left: `${to.x}%`, top: `${to.y}%`, opacity: [0, 1, 1, 0], scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.3, ease: 'easeInOut' }}
                  />
                );
              })}
            </AnimatePresence>

            {/* Supervisor hub */}
            <div className="absolute left-1/2 top-1/2 z-20 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
              <div className="relative h-[124px] w-[124px]">
                <svg className="absolute inset-0 -rotate-90" viewBox="0 0 124 124" aria-hidden>
                  <circle cx={62} cy={62} r={58} fill="none" stroke="var(--color-border)" strokeWidth={4} />
                  <circle
                    cx={62} cy={62} r={58} fill="none" stroke="var(--color-accent)" strokeWidth={4} strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 58}
                    strokeDashoffset={2 * Math.PI * 58 * (1 - step / scenario.timeline.length)}
                    style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                  />
                </svg>
                <div className={cn(
                  "absolute inset-[10px] flex flex-col items-center justify-center rounded-full border-2 bg-surface text-center shadow-xl transition-colors",
                  agreed ? "border-accent shadow-accent/30" : "border-accent/40 shadow-accent/10",
                )}>
                  {agreed && <span className="absolute inset-0 animate-ping rounded-full border-2 border-accent opacity-40" />}
                  <Network size={24} className="text-accent" />
                  <span className="mt-1 text-[11px] font-black leading-tight">{t('AI 슈퍼바이저')}</span>
                  <span className={cn("text-[9px] font-bold", agreed ? "text-accent" : "text-text-secondary")}>
                    {agreed ? t('합의 도출') : `${t('의견 수집')} ${new Set(events.map(e => e.fromAgent)).size}/${participants.length}`}
                  </span>
                </div>
              </div>
            </div>

            {/* Agents */}
            {Object.entries(COORD_SLOTS).map(([id, p]) => {
              const agent = coordAgent(id);
              const joined = participants.includes(id);
              const speaking = !agreed && lastEvent?.fromAgent === id;
              const stance = joined ? stanceOf(id) : null;
              const stanceStyle = stance && stance !== 'waiting' ? COORD_TYPE_STYLE[stance] : null;
              return (
                <div
                  key={id}
                  className="absolute z-20 flex w-[130px] -translate-x-1/2 -translate-y-1/2 flex-col items-center transition-opacity duration-500"
                  style={{ left: `${p.x}%`, top: `${p.y}%`, opacity: joined ? 1 : 0.3 }}
                >
                  <motion.div
                    animate={{ scale: speaking ? 1.12 : 1 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 18 }}
                    className="relative flex h-14 w-14 items-center justify-center rounded-full border-[3px] bg-surface shadow-lg [&>svg]:h-6 [&>svg]:w-6"
                    style={{ borderColor: agent.hex, color: agent.hex, boxShadow: speaking ? `0 0 0 6px ${agent.hex}33, 0 10px 24px ${agent.hex}55` : undefined }}
                  >
                    {speaking && <span className="absolute inset-[-3px] animate-ping rounded-full border-2 opacity-60" style={{ borderColor: agent.hex }} />}
                    {agent.icon}
                  </motion.div>
                  <span className="mt-1.5 rounded-md bg-surface/90 px-1.5 text-center text-[10px] font-black leading-tight">{t(agent.name)}</span>
                  <span
                    className={cn(
                      "mt-1 rounded-full px-2 py-0.5 text-[9px] font-bold",
                      !stanceStyle && "bg-surface-hover text-text-secondary",
                      speaking && "animate-pulse",
                    )}
                    style={stanceStyle ? { backgroundColor: `${stanceStyle.hex}22`, color: stanceStyle.hex } : undefined}
                  >
                    {!joined ? t('미참여') : speaking ? `${t('발언 중')} · ${t(stanceStyle!.label)}` : stanceStyle ? t(stanceStyle.label) : t('대기')}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Live transcript: what is on the table and who said what */}
        <div className="flex flex-col gap-3">
          <div className="rounded-xl border border-border bg-surface-hover/40 p-3">
            <div className="text-[9px] font-bold uppercase tracking-wider text-text-secondary">{t('현재 조율 안건')}</div>
            <div className="mt-0.5 text-xs font-black leading-snug">{scenario.title}</div>
            <div className="mt-2 flex gap-1">
              {scenario.timeline.map((entry, i) => (
                <span
                  key={i}
                  className="h-1.5 flex-1 rounded-full transition-colors duration-500"
                  style={{ backgroundColor: i < step ? COORD_TYPE_STYLE[entry.type as CoordinationEvent['type']].hex : 'var(--color-border)' }}
                />
              ))}
            </div>
          </div>

          <div className="relative min-h-[200px]">
            <AnimatePresence mode="wait">
              {lastEvent ? (
                <motion.div
                  key={lastEvent.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="h-full rounded-xl border-2 bg-surface p-3 shadow-lg"
                  style={{ borderColor: coordAgent(lastEvent.fromAgent).hex }}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full [&>svg]:h-4 [&>svg]:w-4"
                      style={{ backgroundColor: `${coordAgent(lastEvent.fromAgent).hex}22`, color: coordAgent(lastEvent.fromAgent).hex }}
                    >
                      {coordAgent(lastEvent.fromAgent).icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[11px] font-black">{t(coordAgent(lastEvent.fromAgent).name)}</div>
                      <div className="text-[9px] text-text-secondary">→ {lastEvent.toAgent === 'all' ? t('전체 에이전트') : t('AI 슈퍼바이저')}</div>
                    </div>
                    <span
                      className="rounded-full px-2 py-0.5 text-[9px] font-bold"
                      style={{ backgroundColor: `${COORD_TYPE_STYLE[lastEvent.type].hex}22`, color: COORD_TYPE_STYLE[lastEvent.type].hex }}
                    >
                      {t(COORD_TYPE_STYLE[lastEvent.type].label)}
                    </span>
                  </div>
                  <p className="mt-2 text-[11px] leading-relaxed">{lastEvent.content}</p>
                  {lastEvent.reasoning && (
                    <div className="mt-2 rounded-lg border border-accent/20 bg-accent/5 p-2">
                      <div className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-accent">
                        <Target size={10} /> {t('Decision Basis')}
                      </div>
                      <p className="mt-0.5 text-[10px] text-text-secondary">{lastEvent.reasoning}</p>
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="waiting"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex h-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border text-text-secondary"
                >
                  <Loader2 size={16} className="animate-spin" />
                  <span className="text-[10px]">{t('Waiting for agent proposals...')}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="rounded-xl border border-border bg-surface-hover/40 p-3">
            <div className="mb-2 text-[9px] font-bold uppercase tracking-wider text-text-secondary">{t('에이전트별 입장')}</div>
            <div className="space-y-1.5">
              {participants.map(id => {
                const agent = coordAgent(id);
                const stance = stanceOf(id);
                const stanceStyle = stance === 'waiting' ? null : COORD_TYPE_STYLE[stance];
                return (
                  <div key={id} className="flex items-center gap-2 text-[10px]">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full [&>svg]:h-3 [&>svg]:w-3" style={{ backgroundColor: `${agent.hex}22`, color: agent.hex }}>{agent.icon}</span>
                    <span className="min-w-0 flex-1 truncate font-bold">{t(agent.name)}</span>
                    <span
                      className={cn("rounded-full px-2 py-0.5 text-[9px] font-bold", !stanceStyle && "bg-surface text-text-secondary")}
                      style={stanceStyle ? { backgroundColor: `${stanceStyle.hex}22`, color: stanceStyle.hex } : undefined}
                    >
                      {stanceStyle ? t(stanceStyle.label) : t('대기')}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Event Log Timeline */}
      <div className="flex h-[200px] flex-col overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="flex items-center justify-between border-b border-border bg-surface-hover/50 px-4 py-2">
          <div className="flex items-center gap-2">
            <History size={14} className="text-accent" />
            <span className="text-[10px] font-bold uppercase tracking-wider">{t('Orchestration Event Log')}</span>
          </div>
          <span className="text-[9px] text-text-secondary">{events.length} {t('events recorded')}</span>
        </div>
        <div ref={logRef} className="flex-1 space-y-3 overflow-y-auto p-4 custom-scrollbar">
          {events.map((event, idx) => {
            const agent = coordAgent(event.fromAgent);
            const typeStyle = COORD_TYPE_STYLE[event.type];
            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex gap-3"
              >
                <div className="flex flex-col items-center gap-1">
                  <div className="flex h-6 w-6 items-center justify-center rounded-lg border border-border bg-bg [&>svg]:h-3 [&>svg]:w-3" style={{ color: agent.hex }}>
                    {agent.icon}
                  </div>
                  {idx !== events.length - 1 && <div className="w-px flex-1 bg-border" />}
                </div>
                <div className="flex-1 pb-2">
                  <div className="mb-0.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold" style={{ color: agent.hex }}>{t(agent.name)}</span>
                      <span className="rounded px-1 text-[8px] font-bold" style={{ backgroundColor: `${typeStyle.hex}1a`, color: typeStyle.hex }}>{t(typeStyle.label)}</span>
                    </div>
                    <span className="font-mono text-[9px] text-text-secondary">{event.timestamp}</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-text-primary">{event.content}</p>
                </div>
              </motion.div>
            );
          })}
          {events.length === 0 && (
            <div className="flex h-full items-center justify-center text-[10px] text-text-secondary opacity-60">{t('Waiting for agent proposals...')}</div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Where each agent stands around the supervisor on the coordination stage, in %. */
const COORD_SLOTS: Record<string, { x: number; y: number }> = {
  prod: { x: 27, y: 17 },
  qual: { x: 73, y: 17 },
  pm: { x: 88, y: 50 },
  energy: { x: 73, y: 82 },
  safety: { x: 27, y: 82 },
  logistics: { x: 12, y: 50 },
};

const COORD_TYPE_STYLE: Record<CoordinationEvent['type'], { label: string; hex: string }> = {
  proposal: { label: '제안', hex: '#3b82f6' },
  critique: { label: '반대', hex: '#ef4444' },
  conflict: { label: '충돌', hex: '#ef4444' },
  info: { label: '정보', hex: '#64748b' },
  agreement: { label: '합의', hex: '#10b981' },
};

/** Name, color and icon for a coordination participant, shared with the hierarchy map. */
function coordAgent(id: string): { name: string; hex: string; icon: React.ReactNode } {
  if (id === 'supervisor') return { name: 'AI 슈퍼바이저', hex: '#10b981', icon: <Network size={14} /> };
  const agent = AGENT_HIERARCHY.find(a => a.coordId === id);
  return agent ?? { name: id, hex: '#64748b', icon: <Cpu size={14} /> };
}

/**
 * The three-tier control structure the platform is built around:
 * AI Supervisor (control tower) → domain AI agents → the ML/DL models each
 * agent runs. `decisionAgent` matches `AgentDecision.agent`, `menuId` is the
 * agent's first screen in the sidebar (null when it has none yet). `coordId`
 * is the id the coordination replay uses for the same agent.
 *
 * `tasks` is the work the agent rotates through, and `bottleneck` is the one
 * way it gets stuck: what blocks it, which agent the supervisor pulls in to
 * help, and what it tells that agent to do.
 */
type AgentKey = 'quality' | 'pm' | 'safety' | 'production' | 'energy' | 'logistics';

const AGENT_HIERARCHY: {
  key: AgentKey;
  coordId: string;
  name: string;
  role: string;
  decisionAgent: string;
  menuId: number | null;
  /** Plant events that stall this agent until they clear. */
  excursions?: Excursion['kind'][];
  color: string;
  hex: string;
  icon: React.ReactNode;
  models: { name: string; task: string }[];
  tasks: string[];
  bottleneck: { title: string; helper: AgentKey; resolution: string };
}[] = [
  {
    key: 'quality', coordId: 'qual', name: 'AI 품질 에이전트', role: '비전 기반 결함 100% 전수 검출',
    decisionAgent: 'Quality Agent', menuId: 1, excursions: ['temperature', 'mass_defect'],
    color: 'text-emerald-500', hex: '#10b981', icon: <ShieldCheck size={16} />,
    models: [{ name: 'Anomalib', task: '비지도 이상 탐지' }, { name: 'YOLOv8', task: '결함 객체 검출' }],
    tasks: ['포장1라인 실링 비전 전수검사', 'B라인 핀홀 결함 재학습 데이터 수집', '불량 유형별 원인 추적 리포트 생성', 'YOLOv8 결함 검출 임계값 보정'],
    bottleneck: { title: '실링 온도 편차로 불량 판정 보류', helper: 'production', resolution: '생산 에이전트에 라인 속도 5% 감속 지시' },
  },
  {
    key: 'pm', coordId: 'pm', name: 'AI 설비예지보전 에이전트', role: '진동·온도·토크 시계열 분석',
    decisionAgent: 'PM Agent', menuId: 6, excursions: ['vibration'],
    color: 'text-purple-500', hex: '#8b5cf6', icon: <Wrench size={16} />,
    models: [{ name: 'LSTM', task: '시계열 이상 예측' }, { name: 'RUL Regressor', task: '잔여수명·돌발 셧다운 예측' }],
    tasks: ['수축포장기-01 진동 스펙트럼 분석', '메인 모터 베어링 잔여수명 예측', '정비 작업지시서 자동 발행', '감속기 토크 이상 패턴 학습'],
    bottleneck: { title: '주축 진동 급상승으로 잔여수명 재산정 중', helper: 'production', resolution: '생산 에이전트에 정비 시간 확보용 일정 재배치 지시' },
  },
  {
    key: 'safety', coordId: 'safety', name: 'AI 안전 에이전트', role: '화재 징후·작업자 근접 24시간 감시',
    decisionAgent: 'Safety Agent', menuId: 19,
    color: 'text-red-500', hex: '#ef4444', icon: <ShieldAlert size={16} />,
    models: [{ name: 'YOLOv8-Fire', task: '화재·연기 탐지' }, { name: 'Pose Estimation', task: '작업자-로봇 근접 감지' }],
    tasks: ['C구역 화재·연기 영상 감시', '협동로봇 근접 거리 실시간 감시', '작업자 보호구 착용 판별', '가스 센서 누출 패턴 점검'],
    bottleneck: { title: '협동로봇 구역 작업자 근접 반복 감지', helper: 'logistics', resolution: '물류 에이전트에 AMR 우회 경로 지시' },
  },
  {
    key: 'production', coordId: 'prod', name: 'AI 생산 최적화 에이전트', role: '택트타임·설비종합효율 실시간 추적',
    decisionAgent: 'Production Agent', menuId: 11, excursions: ['rush_order'],
    color: 'text-blue-500', hex: '#3b82f6', icon: <TrendingUp size={16} />,
    models: [{ name: 'XGBoost', task: 'OEE 손실 요인 분석' }, { name: 'Bottleneck Detector', task: '병목 구간 식별' }],
    tasks: ['포장1라인 택트타임 추적', 'OEE 손실 요인 분해 분석', '긴급 오더 생산 일정 재조정', '라인 밸런싱 시뮬레이션'],
    bottleneck: { title: '후공정 자재 공급 지연으로 택트타임 초과', helper: 'logistics', resolution: '물류 에이전트에 자재 투입 간격 단축 지시' },
  },
  {
    key: 'energy', coordId: 'energy', name: 'AI 에너지 에이전트', role: '피크 부하·태양광 통합 분석',
    decisionAgent: 'Energy Agent', menuId: 16, excursions: ['energy'],
    color: 'text-orange-500', hex: '#f97316', icon: <Zap size={16} />,
    models: [{ name: 'Prophet', task: '피크 부하 예측' }, { name: 'GRU', task: '태양광 발전량 예측' }],
    tasks: ['15분 단위 피크 부하 예측', '태양광 발전량 예측 반영', 'ESS 충·방전 스케줄 최적화', '공조 설비 부하 이전 계획'],
    bottleneck: { title: '계약 전력 92% 도달로 피크 초과 위험', helper: 'production', resolution: '생산 에이전트에 비핵심 설비 부하 이전 지시' },
  },
  {
    key: 'logistics', coordId: 'logistics', name: 'AI 물류 에이전트', role: 'AMR 최적 경로·회피 시뮬레이션',
    decisionAgent: 'Logistics Agent', menuId: null, excursions: ['supply_delay'],
    color: 'text-yellow-500', hex: '#eab308', icon: <Truck size={16} />,
    models: [{ name: 'RL Path Planner', task: 'AMR 최적 경로 탐색' }, { name: 'RTD / ACS', task: '배차·이송 명령 하달' }],
    tasks: ['AMR 이송 경로 최적화', '완제품 출하 버퍼 슬롯 배정', '자재 투입 배차 명령 하달', 'AMR 충전 스케줄 조정'],
    bottleneck: { title: 'AMR 2대 충전 대기로 이송 지연', helper: 'energy', resolution: '에너지 에이전트에 충전 우선순위 상향 지시' },
  },
];

/** The sensor series behind each agent's calls, shown when an engineer drills in. */
const AGENT_EVIDENCE: Record<AgentKey, { field: 'temperature' | 'vibration' | 'current_amp' | 'defect_rate'; label: string; unit: string; limit: number; digits: number }[]> = {
  quality: [
    { field: 'temperature', label: '실링 온도', unit: '°C', limit: 180, digits: 1 },
    { field: 'defect_rate', label: '불량률', unit: '%', limit: 3, digits: 2 },
  ],
  pm: [{ field: 'vibration', label: '3축 진동', unit: 'mm/s', limit: 4.1, digits: 2 }],
  safety: [],
  production: [{ field: 'defect_rate', label: '불량률', unit: '%', limit: 3, digits: 2 }],
  energy: [{ field: 'current_amp', label: '라인 전류', unit: 'A', limit: 14, digits: 1 }],
  logistics: [],
};

/** A small trend line with its alarm threshold, for the evidence row. */
function Sparkline({ values, limit, color }: { values: number[]; limit: number; color: string }) {
  if (values.length < 2) return <div className="h-10 flex-1" />;
  const lo = Math.min(...values, limit);
  const hi = Math.max(...values, limit);
  const span = hi - lo || 1;
  const y = (v: number) => 38 - ((v - lo) / span) * 34;
  const points = values.map((v, i) => `${(i / (values.length - 1)) * 100},${y(v)}`).join(' ');
  return (
    <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="h-10 min-w-0 flex-1" aria-hidden>
      <line x1={0} x2={100} y1={y(limit)} y2={y(limit)} stroke="var(--color-danger)" strokeDasharray="3 3" strokeWidth={1} vectorEffect="non-scaling-stroke" />
      <polyline points={points} fill="none" stroke={color} strokeWidth={2} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

type TaskState = 'running' | 'pending' | 'bottleneck' | 'resolved';

interface AgentTask {
  id: string;
  agent: AgentKey;
  title: string;
  state: TaskState;
  /** 0–100 for running work; how far into the stall for a bottleneck. */
  progress: number;
  note?: string;
  /** Seconds since a resolved task closed, for ordering and the "n ago" label. */
  agoSec?: number;
}

/** Plant ticks are two seconds apart (see services/telemetry.ts). */
const TICK_SEC = 2;
/** A rotating bottleneck window: one agent stalls for the first part of it. */
const STALL_WINDOW = 36;
const STALL_TICKS = 14;

/**
 * Turns the live plant state and the approval queue into what each agent is
 * doing right now. Everything is a pure function of `tick`, so the board moves
 * with the telemetry instead of with its own timers:
 * - each agent works through its task list on its own cycle length;
 * - an excursion in an agent's domain stalls it (the bottleneck), and every so
 *   often one agent stalls on a dependency so the board always has one to show;
 * - proposals in the approval queue are that agent's pending work;
 * - while the booth demo plays a case, the agents it involves work that case
 *   instead (the lead escalated, the rest on their part of it), and nothing
 *   else stalls.
 */
function deriveAgentWork(plant: PlantState, decisions: AgentDecision[], staged: StagedCase | null = null) {
  const tick = plant.tick;
  const stallSlot = Math.floor(tick / STALL_WINDOW);
  const stallPhase = tick % STALL_WINDOW;
  const rotatingStall = AGENT_HIERARCHY[stallSlot % AGENT_HIERARCHY.length].key;
  const prevStall = AGENT_HIERARCHY[(stallSlot + AGENT_HIERARCHY.length - 1) % AGENT_HIERARCHY.length];

  const tasks: AgentTask[] = [];
  const resolvedToday: Record<string, number> = {};
  const stalled = new Set<AgentKey>();
  const caseLive = staged !== null && staged.phase === 'live' && plant.excursion?.kind === staged.kind;
  const caseProgress = plant.excursion ? Math.round(100 - Math.min(100, (plant.excursion.remaining / 14) * 100)) : 100;

  AGENT_HIERARCHY.forEach((agent, i) => {
    const cycle = 12 + i * 2;
    const t0 = tick + i * 5;
    const round = Math.floor(t0 / cycle);
    const phase = t0 % cycle;
    resolvedToday[agent.key] = 18 + i * 3 + round;

    const byExcursion = plant.excursion !== null && (agent.excursions ?? []).includes(plant.excursion.kind);
    const byRotation = !staged && !plant.excursion && agent.key === rotatingStall && stallPhase < STALL_TICKS;
    const caseTask = staged ? (agent.key === staged.lead ? staged.leadTitle : staged.team[agent.key]) : undefined;
    if (caseLive && caseTask) {
      if (agent.key === staged!.lead) stalled.add(agent.key);
      tasks.push({
        id: `${agent.key}-case-${staged!.kind}`,
        agent: agent.key,
        title: caseTask,
        state: agent.key === staged!.lead ? 'bottleneck' : 'running',
        progress: caseProgress,
        note: agent.key === staged!.lead ? staged!.leadNote : undefined,
      });
    } else if (!staged && (byExcursion || byRotation)) {
      stalled.add(agent.key);
      tasks.push({
        id: `${agent.key}-stall`,
        agent: agent.key,
        title: agent.bottleneck.title,
        state: 'bottleneck',
        progress: byExcursion
          ? 100 - Math.min(100, (plant.excursion!.remaining / 16) * 100)
          : (stallPhase / STALL_TICKS) * 100,
        note: agent.bottleneck.resolution,
      });
    } else {
      tasks.push({
        id: `${agent.key}-run-${round}`,
        agent: agent.key,
        title: agent.tasks[round % agent.tasks.length],
        state: 'running',
        progress: Math.round((phase / cycle) * 100),
      });
    }

    if (staged?.phase === 'after' && caseTask) {
      tasks.push({
        id: `${agent.key}-case-${staged.kind}-done`,
        agent: agent.key,
        title: caseTask,
        state: 'resolved',
        progress: 100,
        note: agent.key === staged.lead ? staged.leadNote : undefined,
        agoSec: 4,
      });
    }

    for (let k = 1; k <= 2; k++) {
      tasks.push({
        id: `${agent.key}-done-${round - k}`,
        agent: agent.key,
        title: agent.tasks[(((round - k) % agent.tasks.length) + agent.tasks.length) % agent.tasks.length],
        state: 'resolved',
        progress: 100,
        agoSec: (phase + (k - 1) * cycle) * TICK_SEC + 1,
      });
    }

    decisions
      .filter(d => d.agent === agent.decisionAgent && d.status === 'pending')
      .forEach((d, j) => tasks.push({
        id: `${agent.key}-pending-${j}`,
        agent: agent.key,
        title: `${t(d.target_equipment)} · ${d.action.replace(/_/g, ' ')}`,
        state: 'pending',
        progress: 100,
        note: t(String(d.recommended_value)),
      }));
  });

  // The stall that just cleared shows up as resolved work, so the board shows
  // the supervisor closing bottlenecks, not only opening them.
  if (!staged && !plant.excursion && stallPhase >= STALL_TICKS && stallPhase < STALL_TICKS + 10) {
    tasks.push({
      id: `${prevStall.key}-stall-cleared-${stallSlot}`,
      agent: prevStall.key,
      title: prevStall.bottleneck.title,
      state: 'resolved',
      progress: 100,
      note: prevStall.bottleneck.resolution,
      agoSec: (stallPhase - STALL_TICKS) * TICK_SEC + 1,
    });
  }

  const helpers = new Set<AgentKey>(
    caseLive
      ? (Object.keys(staged!.team) as AgentKey[])
      : AGENT_HIERARCHY.filter(a => stalled.has(a.key)).map(a => a.bottleneck.helper),
  );
  const status = (key: AgentKey): TaskState => {
    if (stalled.has(key)) return 'bottleneck';
    if (tasks.some(task => task.agent === key && task.state === 'pending')) return 'pending';
    return 'running';
  };
  return { tasks, resolvedToday, stalled, helpers, status };
}

const TASK_STATE_STYLE: Record<TaskState, { label: string; text: string; bg: string; bar: string; stroke: string }> = {
  running: { label: '진행 중', text: 'text-accent', bg: 'bg-accent/10', bar: 'bg-accent', stroke: 'var(--color-accent)' },
  pending: { label: '승인 대기', text: 'text-warning', bg: 'bg-warning/15', bar: 'bg-warning', stroke: 'var(--color-warning)' },
  bottleneck: { label: '병목', text: 'text-danger', bg: 'bg-danger/15', bar: 'bg-danger', stroke: 'var(--color-danger)' },
  resolved: { label: '해결됨', text: 'text-text-secondary', bg: 'bg-surface', bar: 'bg-text-secondary', stroke: 'var(--color-text-secondary)' },
};

/** Where each agent sits on the relationship map, in % of the map box. */
const HUB_POS = { x: 50, y: 50 };
const agentMapPos = (idx: number) => ({ x: idx < 3 ? 16 : 84, y: [18, 50, 82][idx % 3] });

const formatAgo = (sec: number) => sec < 60 ? `${sec}${t('초 전')}` : `${Math.floor(sec / 60)}${t('분 전')}`;

/**
 * Supervisor → agents → models as a live relationship map. Each line is the
 * supervisor's link to one agent and is colored by what is happening on it:
 * green for an instruction it is carrying out, amber for a proposal waiting
 * on approval, red for a bottleneck escalated to the supervisor, and a dashed
 * line to the agent the supervisor pulled in to clear it. Below, the same work
 * as a board: running, awaiting approval, bottleneck, resolved.
 */
function SupervisorHierarchy({
  decisions,
  onNavigate,
}: {
  decisions: AgentDecision[];
  onNavigate: (menuId: number, anchor?: string) => void;
}) {
  const plant = useTelemetry();
  const live = useLiveValue();
  const [selected, setSelected] = useState<AgentKey | null>(null);
  const { staged } = useStage();
  const work = deriveAgentWork(plant, decisions, staged);
  const count = (state: TaskState) => work.tasks.filter(task => task.state === state).length;
  const resolvedTotal = Object.values(work.resolvedToday).reduce((a, b) => a + b, 0);
  const stalledAgents = AGENT_HIERARCHY.filter(a => work.stalled.has(a.key));
  const selectedAgent = AGENT_HIERARCHY.find(a => a.key === selected) ?? null;

  const columns: TaskState[] = ['running', 'pending', 'bottleneck', 'resolved'];
  const boardTasks = work.tasks.filter(task => !selected || task.agent === selected);

  return (
    <div className="space-y-4">
      {/* Relationship map */}
      <div className="overflow-x-auto rounded-2xl border border-border bg-bg/40 custom-scrollbar">
        <div
          className="relative h-[520px] min-w-[860px]"
          style={{ backgroundImage: 'radial-gradient(color-mix(in srgb, var(--color-text-secondary) 22%, transparent) 1px, transparent 1px)', backgroundSize: '18px 18px' }}
        >
          <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
            {AGENT_HIERARCHY.map((agent, idx) => {
              const p = agentMapPos(idx);
              const state = work.status(agent.key);
              const helping = work.helpers.has(agent.key);
              const cx = p.x < 50 ? 36 : 64;
              const d = `M ${HUB_POS.x} ${HUB_POS.y} C ${cx} ${HUB_POS.y}, ${p.x < 50 ? 30 : 70} ${p.y}, ${p.x} ${p.y}`;
              const style = TASK_STATE_STYLE[state];
              const dimmed = selected !== null && selected !== agent.key;
              return (
                <g key={agent.key} opacity={dimmed ? 0.25 : 1}>
                  <path d={d} fill="none" stroke={style.stroke} strokeOpacity={0.18} strokeWidth={10} vectorEffect="non-scaling-stroke" />
                  <path
                    d={d}
                    fill="none"
                    stroke={helping && state === 'running' ? agent.hex : style.stroke}
                    strokeWidth={state === 'bottleneck' ? 3 : 2}
                    strokeDasharray={helping ? '2 6' : '6 8'}
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                    className={state === 'bottleneck' || state === 'pending' ? 'edge-flow-in' : 'edge-flow-out'}
                  />
                </g>
              );
            })}
          </svg>

          {/* Edge labels: what travels on each link */}
          {AGENT_HIERARCHY.map((agent, idx) => {
            const p = agentMapPos(idx);
            const state = work.status(agent.key);
            const helping = work.helpers.has(agent.key) && state === 'running';
            const label = state === 'bottleneck' ? t('에스컬레이션') : state === 'pending' ? t('승인 요청') : helping ? t('지원 지시') : t('작업 지시');
            const style = TASK_STATE_STYLE[state];
            if (selected !== null && selected !== agent.key) return null;
            return (
              <span
                key={agent.key}
                className={cn(
                  "absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border bg-surface px-2 py-0.5 text-[9px] font-bold shadow-sm",
                  helping ? "border-border" : "border-transparent",
                  style.text,
                )}
                style={{ left: `${p.x < 50 ? 33 : 67}%`, top: `${25 + p.y / 2}%`, color: helping ? agent.hex : undefined }}
              >
                {state === 'bottleneck' ? '▲ ' : state === 'pending' ? '▲ ' : '▼ '}{label}
              </span>
            );
          })}

          {/* L0: Supervisor hub */}
          <div
            className="absolute w-[24%] -translate-x-1/2 -translate-y-1/2 rounded-2xl border-2 border-accent/50 bg-surface p-3 shadow-xl shadow-accent/10"
            style={{ left: `${HUB_POS.x}%`, top: `${HUB_POS.y}%` }}
          >
            <div className="flex items-center gap-2">
              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-white shadow-lg shadow-accent/30">
                <Network size={20} />
                <span className="absolute -right-1 -top-1 flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
                  <span className="relative inline-flex h-3 w-3 rounded-full border-2 border-surface bg-accent" />
                </span>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="rounded bg-accent/15 px-1 font-mono text-[9px] font-bold text-accent">L0</span>
                  <span className="truncate text-[10px] font-bold text-text-secondary">{t('핵심 관제탑 (Control Tower)')}</span>
                </div>
                <h4 className="truncate text-sm font-black">{t('AI 슈퍼바이저 에이전트')}</h4>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-4 gap-1 text-center">
              {[
                { state: 'running' as const, value: count('running') },
                { state: 'pending' as const, value: count('pending') },
                { state: 'bottleneck' as const, value: count('bottleneck') },
                { state: 'resolved' as const, value: resolvedTotal },
              ].map(item => (
                <div key={item.state} className={cn("rounded-lg py-1", TASK_STATE_STYLE[item.state].bg)}>
                  <div className={cn("text-base font-black leading-tight", TASK_STATE_STYLE[item.state].text)}>{item.value}</div>
                  <div className="text-[8px] font-bold text-text-secondary">{t(TASK_STATE_STYLE[item.state].label)}</div>
                </div>
              ))}
            </div>
            <div className={cn(
              "mt-2 rounded-lg border px-2 py-1.5 text-[10px] leading-snug",
              stalledAgents.length > 0 ? "border-danger/30 bg-danger/5" : "border-accent/20 bg-accent/5",
            )}>
              {stalledAgents.length > 0 ? (
                stalledAgents.map(a => (
                  <div key={a.key}>
                    <span className="font-bold text-danger">{t('병목 조율')}</span>
                    <span className="text-text-secondary"> · {t(work.tasks.find(task => task.agent === a.key && task.state === 'bottleneck')?.note ?? a.bottleneck.resolution)}</span>
                  </div>
                ))
              ) : (
                <span className="font-bold text-accent">{t('전 에이전트 정상 작업 중')} · {t('승인 대기')} {count('pending')}</span>
              )}
            </div>
          </div>

          {/* L1: Agents */}
          {AGENT_HIERARCHY.map((agent, idx) => {
            const p = agentMapPos(idx);
            const state = work.status(agent.key);
            const style = TASK_STATE_STYLE[state];
            const current = work.tasks.find(task => task.agent === agent.key && (task.state === 'bottleneck' || task.state === 'running'))!;
            const pending = work.tasks.filter(task => task.agent === agent.key && task.state === 'pending').length;
            const helping = work.helpers.has(agent.key);
            const isSelected = selected === agent.key;
            return (
              <button
                key={agent.key}
                type="button"
                onClick={() => setSelected(isSelected ? null : agent.key)}
                aria-pressed={isSelected}
                className={cn(
                  "absolute w-[25%] -translate-x-1/2 -translate-y-1/2 rounded-xl border-2 bg-surface p-2.5 text-left shadow-lg transition-all hover:shadow-xl",
                  state === 'bottleneck' ? "border-danger/70 shadow-danger/10" : state === 'pending' ? "border-warning/60" : "border-border",
                  isSelected && "ring-2 ring-accent ring-offset-2 ring-offset-bg",
                  selected !== null && !isSelected && "opacity-50",
                )}
                style={{ left: `${p.x}%`, top: `${p.y}%`, borderLeftColor: agent.hex, borderLeftWidth: 4 }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${agent.hex}22`, color: agent.hex }}>{agent.icon}</span>
                    <span className="line-clamp-2 text-[11px] font-black leading-tight">{t(agent.name)}</span>
                  </div>
                  <span className={cn("flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold", style.bg, style.text)}>
                    {state === 'bottleneck' && <AlertTriangle size={9} />}
                    {state === 'pending' ? `${t('승인 대기')} ${pending}` : t(style.label)}
                  </span>
                </div>
                <div className="mt-1.5 flex items-start gap-1 text-[10px] font-bold leading-snug">
                  <span className={cn("mt-1 h-1.5 w-1.5 shrink-0 rounded-full", state === 'bottleneck' ? "animate-pulse bg-danger" : "bg-accent")} />
                  <span className="line-clamp-2">{t(current.title)}</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-hover">
                  <div
                    className={cn("h-full rounded-full transition-all duration-700", state === 'bottleneck' ? "animate-pulse bg-danger" : "bg-accent")}
                    style={{ width: `${Math.max(6, current.progress)}%` }}
                  />
                </div>
                <div className="mt-1.5 flex items-center justify-between gap-2 text-[9px] text-text-secondary">
                  <span className="truncate font-mono">{agent.models.map(m => m.name).join(' · ')}</span>
                  <span className="shrink-0">
                    {helping && <span className="mr-1.5 font-bold" style={{ color: agent.hex }}>{t('지원 중')}</span>}
                    <CheckCircle2 size={9} className="mr-0.5 inline" />{work.resolvedToday[agent.key]}
                  </span>
                </div>
              </button>
            );
          })}

          {/* Legend */}
          <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-full border border-border bg-surface/90 px-3 py-1 text-[9px] font-bold text-text-secondary">
            <span className="flex items-center gap-1"><span className="h-0.5 w-4 rounded bg-accent" />{t('작업 지시')}</span>
            <span className="flex items-center gap-1"><span className="h-0.5 w-4 rounded bg-warning" />{t('승인 요청')}</span>
            <span className="flex items-center gap-1"><span className="h-0.5 w-4 rounded bg-danger" />{t('병목 에스컬레이션')}</span>
            <span className="flex items-center gap-1"><span className="h-0 w-4 border-t-2 border-dotted border-text-secondary" />{t('지원 지시')}</span>
          </div>
        </div>
      </div>

      {/* Selected agent: its models and its screen */}
      {selectedAgent && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface-hover/40 p-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: `${selectedAgent.hex}22`, color: selectedAgent.hex }}>{selectedAgent.icon}</span>
          <div className="min-w-[180px] flex-1">
            <div className="text-xs font-black">{t(selectedAgent.name)}</div>
            <div className="text-[10px] text-text-secondary">{t(selectedAgent.role)}</div>
          </div>
          {selectedAgent.models.map((model, mIdx) => {
            const idx = AGENT_HIERARCHY.indexOf(selectedAgent);
            return (
              <div key={model.name} className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2 py-1 text-[10px]">
                <span className="rounded bg-surface-hover px-1 font-mono text-[8px] font-bold text-text-secondary">L2</span>
                <span className="font-mono font-bold">{model.name}</span>
                <span className="text-text-secondary">{t(model.task)}</span>
                <span className="font-mono text-text-secondary">{Math.round(live(40 + idx * 12 + mIdx * 25, 200 + idx * 10 + mIdx))}ms</span>
              </div>
            );
          })}
          {selectedAgent.menuId !== null && (
            <button
              type="button"
              onClick={() => onNavigate(selectedAgent.menuId!)}
              className="flex items-center gap-1 rounded-lg bg-accent/10 px-2.5 py-1.5 text-[10px] font-bold text-accent hover:bg-accent/20"
            >
              {t('에이전트 화면')} <ArrowRight size={11} />
            </button>
          )}
          <div className="grid basis-full grid-cols-1 gap-2 border-t border-border/60 pt-3 sm:grid-cols-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-text-secondary sm:col-span-2">{t('근거 데이터')} · {t('최근 {n}개 측정값', { n: plant.history.length })}</div>
            {AGENT_EVIDENCE[selectedAgent.key].length === 0 && (
              <div className="text-[11px] text-text-secondary sm:col-span-2">{t('이 에이전트는 센서 시계열 대신 영상·위치 데이터로 판단합니다.')}</div>
            )}
            {AGENT_EVIDENCE[selectedAgent.key].map(ev => {
              const values = plant.history.map(h => h[ev.field]);
              const now = values[values.length - 1] ?? 0;
              const over = now > ev.limit;
              return (
                <div key={ev.field} className="flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2">
                  <div className="w-28 shrink-0">
                    <div className="text-[10px] text-text-secondary">{t(ev.label)}</div>
                    <div className={cn("font-mono text-sm font-black", over ? "text-danger" : "text-text-primary")}>{now.toFixed(ev.digits)}{ev.unit}</div>
                    <div className="text-[9px] text-text-secondary">{t('임계치')} {ev.limit}{ev.unit}</div>
                  </div>
                  <Sparkline values={values} limit={ev.limit} color={selectedAgent.hex} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Task board */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {columns.map(column => {
          const style = TASK_STATE_STYLE[column];
          const items = boardTasks
            .filter(task => task.state === column)
            .sort((a, b) => (a.agoSec ?? 0) - (b.agoSec ?? 0))
            .slice(0, column === 'resolved' ? 6 : 8);
          return (
            <div key={column} className="rounded-xl border border-border bg-surface-hover/30 p-2.5">
              <div className="mb-2 flex items-center justify-between">
                <span className={cn("flex items-center gap-1.5 text-[11px] font-black", style.text)}>
                  <span className={cn("h-2 w-2 rounded-full", style.bar)} />
                  {t(style.label)}
                </span>
                <span className="font-mono text-[10px] text-text-secondary">{boardTasks.filter(task => task.state === column).length}</span>
              </div>
              <div className="space-y-1.5">
                {items.length === 0 && (
                  <div className="rounded-lg border border-dashed border-border py-3 text-center text-[10px] text-text-secondary">{t('없음')}</div>
                )}
                {items.map(task => {
                  const agent = AGENT_HIERARCHY.find(a => a.key === task.agent)!;
                  return (
                    <motion.div
                      layout
                      key={task.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "rounded-lg border bg-surface p-2",
                        column === 'bottleneck' ? "border-danger/40" : "border-border",
                        column === 'resolved' && "opacity-75",
                      )}
                      style={{ borderLeftColor: agent.hex, borderLeftWidth: 3 }}
                    >
                      <div className="flex items-center justify-between gap-2 text-[9px]">
                        <span className="flex items-center gap-1 font-bold" style={{ color: agent.hex }}>
                          {agent.icon && <span className="[&>svg]:h-2.5 [&>svg]:w-2.5">{agent.icon}</span>}
                          {t(agent.name)}
                        </span>
                        {task.agoSec !== undefined && <span className="font-mono text-text-secondary">{formatAgo(task.agoSec)}</span>}
                      </div>
                      <div className={cn("mt-0.5 text-[10px] font-bold leading-snug", column === 'resolved' && "line-through decoration-text-secondary/40")}>{t(task.title)}</div>
                      {column === 'running' && (
                        <div className="mt-1 flex items-center gap-1.5">
                          <div className="h-1 flex-1 overflow-hidden rounded-full bg-surface-hover">
                            <div className="h-full rounded-full bg-accent transition-all duration-700" style={{ width: `${task.progress}%` }} />
                          </div>
                          <span className="font-mono text-[9px] text-text-secondary">{task.progress}%</span>
                        </div>
                      )}
                      {task.note && column !== 'running' && (
                        <div className={cn("mt-1 text-[9px] leading-snug", column === 'bottleneck' ? "text-danger" : "text-text-secondary")}>
                          {column === 'pending' ? `${t('권고값')} ${task.note}` : `↳ ${t('슈퍼바이저')}: ${t(task.note)}`}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * The human-in-the-loop path every agent action takes before it reaches a
 * machine: Supervisor decision → safety barrier → approval queue → one-click
 * approval → PLC. Counts come from the live decision list.
 */
function SafetyWorkflow({ decisions }: { decisions: AgentDecision[] }) {
  const pending = decisions.filter(d => d.status === 'pending').length;
  const approved = decisions.filter(d => d.status === 'approved').length;
  const blocked = decisions.filter(d => d.status === 'rejected').length;
  const steps = [
    { label: 'AI 슈퍼바이저 결정', icon: <Network size={14} />, value: decisions.length },
    { label: '방어막 (Barrier)', icon: <Shield size={14} />, value: blocked, hint: '차단' },
    { label: '승인 대기 큐', icon: <ClipboardList size={14} />, value: pending },
    { label: '1-Click 승인', icon: <CheckCircle2 size={14} />, value: approved },
    { label: '최종 설비 제어기 (PLC)', icon: <Server size={14} />, value: approved, hint: '전송' },
  ];
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
      {steps.map((s, i) => (
        <div key={s.label} className="relative rounded-xl border border-border bg-surface-hover/40 p-3">
          <div className="flex items-center gap-1.5 text-accent">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent/15 font-mono text-[10px] font-bold">{i + 1}</span>
            {s.icon}
          </div>
          <div className="mt-2 text-[10px] font-bold text-text-secondary">{t(s.label)}</div>
          <div className="mt-0.5 text-lg font-black">
            {s.value}
            {s.hint && <span className="ml-1 text-[10px] font-bold text-text-secondary">{t(s.hint)}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

const ORCHESTRATION_METHODOLOGY = '\n# Hierarchical Message-Based Orchestration (HMBO) Framework\n\n## 1. 개요\nHMBO는 복잡한 제조 환경에서 다수의 특화 AI 에이전트들이 상호 협력하고 충돌을 해결하기 위한 계층적 의사결정 프레임워크입니다.\n\n## 2. 핵심 메커니즘\n*   **Proposal (제안)**: 각 도메인 에이전트(품질, 생산, 에너지 등)가 자신의 목표 최적화를 위한 액션을 제안합니다.\n*   **Critique (비판)**: 제안된 액션이 다른 도메인의 가드레일이나 목표를 침해할 경우, 해당 에이전트가 반대 의견과 근거를 제시합니다.\n*   **Info (정보 제공)**: 의사결정에 필요한 추가 데이터나 상황 정보를 공유합니다.\n*   **Agreement (합의)**: AI 슈퍼바이저가 모든 의견을 종합하고, 전사적 우선순위(예: 안전 > 품질 > 생산)에 따라 최종 결정을 내립니다.\n\n## 3. 의사결정 계층\n1.  **L1: Safety Layer**: 물리적 위험 및 법적 규제 준수 여부 판단\n2.  **L2: Policy Layer**: 전사 운영 정책(품질 우선, 비용 절감 등) 반영\n3.  **L3: Optimization Layer**: 도메인 간 트레이드오프 조율 및 최적값 도출\n\n## 4. 기대 효과\n*   **의사결정 투명성**: 모든 에이전트의 발언과 슈퍼바이저의 판단 근거가 로그로 남습니다.\n*   **유연한 정책 대응**: 전사 정책 변경 시 슈퍼바이저의 가드레일 설정만으로 전체 에이전트의 행동을 제어할 수 있습니다.\n*   **실시간 최적화**: 인간 관리자가 개입하기 어려운 초단위 공정 변화에 즉각 대응합니다.\n';

/**
 * AI orchestration, shown inline on the integrated dashboard (it used to be a
 * modal behind a button in the Supervisor Center): the control hierarchy, the
 * approval workflow, the live agent-coordination replay and the methodology.
 */
function OrchestrationPanel({
  decisions,
  onNavigate,
}: {
  decisions: AgentDecision[];
  onNavigate: (menuId: number, anchor?: string) => void;
}) {
  const { staged, replay } = useStage();
  const [activeTab, setActiveTab] = useState<'hierarchy' | 'coordination' | 'methodology'>(
    staged?.phase === 'after' && replay > 0 ? 'coordination' : 'hierarchy',
  );
  // The booth demo opens its decision record on the coordination replay.
  const seenReplay = useRef(replay);
  useEffect(() => {
    if (replay === seenReplay.current) return;
    seenReplay.current = replay;
    if (staged) setActiveTab('coordination');
  }, [replay]); // eslint-disable-line react-hooks/exhaustive-deps
  const tabs = [
    { id: 'hierarchy' as const, label: t('관제 구조') },
    { id: 'coordination' as const, label: t('에이전트 조율') },
    { id: 'methodology' as const, label: t('Methodology') },
  ];

  return (
    <section id={ORCHESTRATION_ANCHOR} className="dashboard-card scroll-mt-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <GitBranch size={20} />
          </div>
          <div>
            <h3 className="font-bold">{t('AI 오케스트레이션 센터')}</h3>
            <p className="text-[10px] font-medium uppercase tracking-wider text-text-secondary">
              {t('Hierarchical Message-Based Orchestration Framework (HMBO)')}
            </p>
          </div>
        </div>
        <div role="tablist" className="flex gap-1 rounded-lg border border-border bg-surface p-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "rounded-md px-3 py-1.5 text-[11px] font-bold transition-colors",
                activeTab === tab.id ? "bg-accent/15 text-accent" : "text-text-secondary hover:text-text-primary"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="pt-5">
        {activeTab === 'hierarchy' && (
          <div className="space-y-6">
            <SupervisorHierarchy decisions={decisions} onNavigate={onNavigate} />
            <div>
              <h4 className="mb-3 flex items-center gap-2 text-xs font-bold">
                <ShieldCheck size={14} className="text-accent" />
                {t('안전 워크플로우 (1-Click 승인)')}
              </h4>
              <SafetyWorkflow decisions={decisions} />
            </div>
          </div>
        )}
        {activeTab === 'coordination' && (
          <div className="space-y-4">
            <p className="text-sm text-text-secondary">{t('Supervisor가 각 도메인 특화 에이전트들의 제안을 수집하고, 우선순위 및 가드레일에 따라 최종 합의를 도출하는 과정을 보여줍니다.')}</p>
            <CoordinationVisualizer />
          </div>
        )}
        {activeTab === 'methodology' && (
          <Suspense fallback={<ChunkFallback />}>
            <MarkdownView>{t(ORCHESTRATION_METHODOLOGY)}</MarkdownView>
          </Suspense>
        )}
      </div>
    </section>
  );
}


function SupervisorCenterView({ onOpenOrchestration }: { onOpenOrchestration: () => void }) {
  const safeTimeout = useSafeTimeout();
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<{gain: string, risk: string} | null>(null);
  const [evidencePacks, setEvidencePacks] = useState<EvidencePack[]>([]);
  const [coordinationEvents, setCoordinationEvents] = useState<CoordinationEvent[]>(MOCK_COORDINATION_EVENTS.slice(0, 2));

  const [playbooks, setPlaybooks] = useState<Playbook[]>(MOCK_PLAYBOOKS);

  const activeGoal: Goal = MOCK_GOALS[0];

  const conflictData = {
    conflict: t('생산성 극대화(Tact 단축) vs 검사 정확도(속도 제한) 상충 발생.'),
    resolution: t('Resolved: 품질 우선 정책 적용')
  };

  const getSimulationResult = () => ({
    gain: t('생산성 +5.2% 예상'),
    risk: t('품질 리스크 -1.5% 감소')
  });

  const handleSimulate = () => {
    setIsSimulating(true);
    safeTimeout(() => {
      setIsSimulating(false);
      setSimulationResult(getSimulationResult());
    }, 2000);
  };

  const generateEvidencePack = () => {
    const newPack: EvidencePack = {
      id: `EP-${Date.now()}`,
      decisionId: 'D-1024',
      timestamp: new Date().toISOString(),
      goal: activeGoal.title,
      reasoning: t('비전 검사 데이터와 라인 부하율을 종합 분석한 결과, 품질 우선 정책에 따라 속도 제한이 최적의 선택임.'),
      dataSnapshots: [
        { sensorId: 'VIB-01', value: 3.2 },
        { sensorId: 'TEMP-01', value: 78.5 }
      ],
      policyApplied: 'Quality',
      approver: CURRENT_OPERATOR
    };
    setEvidencePacks(prev => [newPack, ...prev]);
  };

  return (
    <div className="p-8 space-y-8 overflow-y-auto h-full pb-20">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t('Supervisor Orchestrator')}</h2>
          <p className="text-text-secondary text-sm mt-1">{t('통합 판단, 목표 관리 및 플레이북 실행 센터')}</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={onOpenOrchestration}
            title={t('통합 대시보드의 AI 오케스트레이션 패널로 이동')}
            className="flex items-center gap-2 px-4 py-2 bg-accent/10 text-accent border border-accent/20 rounded-lg text-xs font-bold hover:bg-accent/20 transition-colors"
          >
            <GitBranch size={16} />
            {t('AI 오케스트레이션')}
          </button>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-accent/10 border border-accent/20 rounded-full">
            <ShieldCheck size={14} className="text-accent" />
            <span className="text-[10px] font-bold text-accent uppercase tracking-wider">{t('Policy: Quality First')}</span>
          </div>
          <button 
            onClick={generateEvidencePack}
            className="flex items-center gap-2 px-4 py-2 bg-surface border border-border rounded-lg text-xs font-bold hover:bg-surface-hover transition-colors"
          >
            <FileText size={16} />
            {t('Generate Evidence Pack')}
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
                {t('Active Goal:')} {t(activeGoal.title)}
              </h3>
              <span className="px-2 py-1 rounded bg-accent/10 text-accent text-[10px] font-bold uppercase tracking-widest">
                {activeGoal.status}
              </span>
            </div>
            
            <div className="space-y-6">
              {activeGoal.tasks.map((task, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold">{task.agentId}</span>
                    <span className="text-text-secondary">{t(task.task)}</span>
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
                {t('Conflict Resolver')}
              </h3>
              <div className="p-4 rounded-lg bg-surface-hover border border-border space-y-3">
                <div className="flex items-center justify-between text-[10px] uppercase font-bold tracking-wider text-text-secondary">
                  <span>{t('Conflict Detected')}</span>
                  <span className="text-orange-500">{t('High Priority')}</span>
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
                {t('Ensemble / Voting')}
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
                {t('3개 에이전트 합의 완료 (신뢰도 98.2%)')}
              </p>
            </div>
          </div>

          {/* Simulation & Execution */}
          <div className="dashboard-card">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <PlayCircle size={16} className="text-accent" />
                {t('Simulate Before Execute')}
              </h3>
              <button 
                onClick={handleSimulate}
                disabled={isSimulating}
                className="px-4 py-2 bg-accent text-bg rounded-lg text-xs font-bold disabled:opacity-50"
              >
                {isSimulating ? t('Simulating...') : t('Run Simulation')}
              </button>
            </div>

            {isSimulating ? (
              <div className="h-24 flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-text-secondary animate-pulse">{t('디지털 트윈 환경에서 리스크 검증 중...')}</span>
              </div>
            ) : simulationResult ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3">
                  <TrendingUp className="text-emerald-500" size={20} />
                  <div>
                    <div className="text-[10px] font-bold text-emerald-500 uppercase">{t('Expected Gain')}</div>
                    <div className="text-sm font-bold">{simulationResult.gain}</div>
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center gap-3">
                  <ShieldCheck className="text-blue-500" size={20} />
                  <div>
                    <div className="text-[10px] font-bold text-blue-500 uppercase">{t('Risk Mitigation')}</div>
                    <div className="text-sm font-bold">{simulationResult.risk}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-24 flex items-center justify-center border-2 border-dashed border-border rounded-xl">
                <span className="text-xs text-text-secondary">{t('시뮬레이션을 실행하여 조치 전 리스크를 확인하세요.')}</span>
              </div>
            )}
          </div>

          {/* Real-time Agent Coordination Feed */}
          <div className="dashboard-card">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <MessageSquare size={16} className="text-accent" />
                {t('Real-time Agent Coordination')}
              </h3>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">{t('Live Feed')}</span>
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
                        <span className="text-[10px] font-bold text-accent uppercase">{t(event.fromAgent)}</span>
                        <ArrowRight size={10} className="text-text-secondary" />
                        <span className="text-[10px] font-bold text-text-secondary uppercase">{t(event.toAgent)}</span>
                      </div>
                      <span className="text-[10px] font-mono text-text-secondary">
                        {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>

                    <p className="text-xs leading-relaxed text-text-primary">
                      {t(event.content)}
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
              {t('Auto Playbooks (ITTT)')}
            </h3>
            <div className="space-y-3">
              {playbooks.map(pb => (
                <button
                  key={pb.id}
                  onClick={() => setPlaybooks(prev => prev.map(p => p.id === pb.id ? { ...p, status: p.status === 'Active' ? 'Inactive' : 'Active' } : p))}
                  aria-pressed={pb.status === 'Active'}
                  title={t('클릭해서 켜기/끄기')}
                  className="block w-full text-left p-3 rounded-lg bg-surface-hover border border-border hover:border-accent/50 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold group-hover:text-accent">{t(pb.name)}</span>
                    <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-bold uppercase", pb.status === 'Active' ? "bg-emerald-500/10 text-emerald-500" : "bg-border/40 text-text-secondary")}>{pb.status}</span>
                  </div>
                  <div className="text-[10px] text-text-secondary flex items-center gap-1">
                    <Zap size={10} />
                    {t('Trigger:')} {t(pb.triggerEvent)}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="dashboard-card">
            <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
              <History size={16} className="text-accent" />
              {t('Recent Evidence Packs')}
            </h3>
            <div className="space-y-4">
              {evidencePacks.length > 0 ? (
                evidencePacks.map(pack => (
                  <div key={pack.id} className="p-3 rounded-lg border border-border space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold text-accent">{pack.id}</span>
                      <span className="text-[10px] text-text-secondary">{new Date(pack.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-[10px] leading-relaxed line-clamp-2">{t(pack.reasoning)}</p>
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
                  <p className="text-[10px] text-text-secondary">{t('생성된 증거 패키지가 없습니다.')}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}


function VisionInspectionViewer() {
  const safeTimeout = useSafeTimeout();
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
    safeTimeout(() => {
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
            <span className="text-[9px] font-bold text-text-secondary uppercase tracking-[0.2em] mb-1">{t('Operation Control')}</span>
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
                {t('시작 (START)')}
              </button>
              <button 
                onClick={() => setStatus('Ready')}
                className="flex items-center gap-2 px-6 py-2 rounded-md font-bold text-sm transition-all border bg-red-500/20 border-red-500/50 text-red-500 hover:bg-red-500/30 active:scale-95 shadow-[0_0_15px_rgba(239,68,68,0.2)]"
              >
                <Square size={14} fill="currentColor" />
                {t('정지 (STOP)')}
              </button>
            </div>
          </div>
          
          <div className="h-12 w-[1px] bg-white/10" />
          
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-text-secondary uppercase tracking-[0.2em] mb-1">{t('System Status')}</span>
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
                {status === 'Ready' ? t('SYSTEM READY') : status === 'Inspecting' ? t('INSPECTING...') : t('INSPECTION COMPLETE')}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 text-right">
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-text-secondary uppercase tracking-[0.2em]">{t('Cycle Time')}</span>
            <span className="text-lg font-black text-accent">2.45s</span>
          </div>
          <div className="h-10 w-[1px] bg-white/10" />
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-text-secondary uppercase tracking-[0.2em]">{t('Line Speed')}</span>
            <span className="text-lg font-black text-white">42 bpm</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Left Sidebar Counters - Industrial Look */}
        <div className="col-span-2 flex flex-col gap-3">
          <div className="bg-[#111] p-4 rounded-xl border border-white/10 flex flex-col gap-1 shadow-inner">
            <span className="text-[9px] font-bold text-text-secondary uppercase tracking-widest">{t('Box Counter')}</span>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black text-white">{counters.box}</span>
              <span className="text-xs text-text-secondary">/ {counters.total}</span>
            </div>
            <div className="w-full h-1 bg-white/5 rounded-full mt-2 overflow-hidden">
              <div className="h-full bg-accent" style={{ width: `${(counters.box / counters.total) * 100}%` }} />
            </div>
          </div>
          
          <div className="bg-[#111] p-4 rounded-xl border border-emerald-500/20 flex flex-col gap-1 shadow-inner">
            <span className="text-[9px] font-bold text-emerald-500/70 uppercase tracking-widest">{t('OK Count')}</span>
            <span className="text-3xl font-black text-emerald-500">{counters.ok}</span>
          </div>
          
          <div className="bg-[#111] p-4 rounded-xl border border-red-500/20 flex flex-col gap-1 shadow-inner">
            <span className="text-[9px] font-bold text-red-500/70 uppercase tracking-widest">{t('NG Count')}</span>
            <span className="text-3xl font-black text-red-500">{counters.ng}</span>
          </div>

          <div className="mt-auto bg-accent/5 p-4 rounded-xl border border-accent/20">
            <div className="text-[9px] font-bold text-accent uppercase tracking-widest mb-2">{t('Yield Rate')}</div>
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
                  <span className="text-[10px] font-bold uppercase tracking-widest">{t('CAM 01: Bundle Top View')}</span>
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
                  <span className="text-[10px] font-bold uppercase tracking-widest">{t('CAM 02: Label Verification')}</span>
                </div>
                <span className="text-[9px] text-text-secondary font-mono">OCR / BARCODE ACTIVE</span>
              </div>
              
              <div className="absolute inset-0 flex items-center justify-center p-8">
                <div className="w-full max-w-[280px] aspect-[3/4] bg-[#f0f0f0] rounded-sm p-6 text-black flex flex-col shadow-[0_0_40px_rgba(255,255,255,0.1)] relative overflow-hidden">
                  <div className="border-b-4 border-black pb-3 mb-4">
                    <div className="text-[10px] font-black uppercase tracking-tighter">{t('Bundle Identification')}</div>
                    <div className="text-lg font-black leading-none">PHARMA-PACK BUNDLE 10P</div>
                  </div>
                  
                  <div className="space-y-3 flex-1">
                    <div className="flex flex-col border-b border-black/20 pb-2">
                      <span className="text-[8px] font-bold text-gray-500 uppercase">{t('Batch Number')}</span>
                      <span className="text-sm font-black font-mono">BN-2024-0317-X9</span>
                    </div>
                    <div className="flex flex-col border-b border-black/20 pb-2">
                      <span className="text-[8px] font-bold text-gray-500 uppercase">{t('Expiration Date')}</span>
                      <span className="text-sm font-black font-mono">2027.03.16</span>
                    </div>
                    <div className="flex flex-col border-b border-black/20 pb-2">
                      <span className="text-[8px] font-bold text-gray-500 uppercase">{t('Product Code')}</span>
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
                <h4 className="text-[10px] font-bold text-text-secondary uppercase tracking-[0.2em]">{t('Inspection Timeline')}</h4>
                <div className="px-2 py-0.5 rounded bg-accent/10 border border-accent/20 text-[8px] font-bold text-accent uppercase">{t('History Log')}</div>
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
                  onClick={() => { if (status !== 'Inspecting') { setCurrentResult(item.result); setStatus('Complete'); } }}
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

/* Mock records for the management console, so every list in it can grow, shrink and export. */
const MOCK_USERS = [
  { name: 'Admin User', email: 'admin@factory.ai', role: 'System Admin', status: 'Online', last: 'Just now' },
  { name: 'John Doe', email: 'john.d@factory.ai', role: 'Operator', status: 'Online', last: '12m ago' },
  { name: 'Sarah Chen', email: 's.chen@factory.ai', role: 'Quality Lead', status: 'Offline', last: '2h ago' },
  { name: 'Mike Ross', email: 'm.ross@factory.ai', role: 'Maintenance', status: 'Online', last: '45m ago' },
];

const NEW_USER_POOL = [
  { name: 'Yuki Tanaka', email: 'y.tanaka@factory.ai', role: 'Operator' },
  { name: 'Ken Sato', email: 'k.sato@factory.ai', role: 'Maintenance' },
  { name: 'Emma Wilson', email: 'e.wilson@factory.ai', role: 'Quality Lead' },
  { name: 'Min-jun Park', email: 'mj.park@factory.ai', role: 'Operator' },
];

const MOCK_AUDIT = [
  { time: '2024-03-18 09:42:12', user: 'admin_01', action: 'Modified Threshold: Vibration Limit', severity: 'info', target: 'ID: 12 (Motor A)', category: 'Config' },
  { time: '2024-03-18 09:38:05', user: 'system', action: 'Auto-rollback: Model v2.4.1 -> v2.4.0', severity: 'warn', target: 'Model Registry', category: 'System' },
  { time: '2024-03-18 09:15:22', user: 'john_doe', action: 'Failed Login Attempt', severity: 'error', target: 'Auth Service', category: 'Security' },
  { time: '2024-03-18 08:55:10', user: 'admin_01', action: 'User Created: sarah_c', severity: 'success', target: 'User Directory', category: 'Security' },
  { time: '2024-03-18 08:30:45', user: 'system', action: 'Scheduled Backup Completed', severity: 'success', target: 'Database', category: 'System' },
  { time: '2024-03-18 08:12:33', user: 'mike_r', action: 'Emergency Stop Triggered', severity: 'error', target: 'Line 01', category: 'Security' },
];

const MOCK_HEALTH = [
  { service: 'API Gateway', status: 'Healthy', latency_ms: 12, uptime: '99.99%' },
  { service: 'Main Database', status: 'Healthy', latency_ms: 5, uptime: '99.98%' },
  { service: 'ML Inference', status: 'Warning', latency_ms: 450, uptime: '98.5%' },
  { service: 'Kafka Stream', status: 'Healthy', latency_ms: 2, uptime: '100%' },
  { service: 'Redis Cache', status: 'Healthy', latency_ms: 1, uptime: '99.99%' },
  { service: 'Auth Service', status: 'Healthy', latency_ms: 18, uptime: '99.95%' },
];

const MOCK_ENTITIES = [
  { name: 'Manufacturing Line', parent: 'Asset', props: 12, instances: 4, icon: Factory },
  { name: 'Electric Motor', parent: 'Equipment', props: 8, instances: 124, icon: Cpu },
  { name: 'Quality Sensor', parent: 'IoT Device', props: 6, instances: 56, icon: Zap },
  { name: 'Raw Material', parent: 'Inventory', props: 5, instances: 12, icon: Box },
];

const MOCK_RULES = [
  { name: 'Mandatory Telemetry', desc: 'All active motors must report vibration data every 5s.', status: 'Active', icon: Code2 },
  { name: 'Parent-Child Constraint', desc: 'Sensors cannot exist without a parent equipment assignment.', status: 'Active', icon: Link },
  { name: 'Data Type Integrity', desc: 'Temperature values must be within -40 to 150 range.', status: 'Active', icon: FileCode },
];

const EXTRA_CONDITIONS = [
  'entity.properties.temperature > 120',
  'entity.status == \'running\'',
  'entity.parent.line == \'Line_01\'',
];

const ONTOLOGY_RELATIONS = [
  { source: 'Line_01', relation: 'composed_of', target: 'Motor_A12' },
  { source: 'Motor_A12', relation: 'monitored_by', target: 'Vibration_Sensor_4' },
  { source: 'Vibration_Sensor_4', relation: 'reports_to', target: 'Edge_Gateway_2' },
  { source: 'Motor_A12', relation: 'connected_to', target: 'PLC_04' },
];

const ONTOLOGY_JSONLD = {
  '@context': { '@vocab': 'https://impix.ai/ontology#', rdfs: 'http://www.w3.org/2000/01/rdf-schema#' },
  '@graph': [
    { '@id': 'Asset', '@type': 'rdfs:Class' },
    { '@id': 'Equipment', '@type': 'rdfs:Class', 'rdfs:subClassOf': 'Asset' },
    { '@id': 'ElectricMotor', '@type': 'rdfs:Class', 'rdfs:subClassOf': 'Equipment' },
    ...ONTOLOGY_RELATIONS.map(r => ({ '@id': r.source, [r.relation]: { '@id': r.target } })),
  ],
};

/** The relation graph in the format a button on the export screen promises. */
function exportOntology(ext: string) {
  const name = `ontology-graph-${fileStamp()}${ext}`;
  const nodes = [...new Set(ONTOLOGY_RELATIONS.flatMap(r => [r.source, r.target]))];
  switch (ext) {
    case '.json':
      return downloadJson(name, ONTOLOGY_JSONLD);
    case '.rdf':
      return downloadFile(name, `<?xml version="1.0"?>\n<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:i="https://impix.ai/ontology#">\n${ONTOLOGY_RELATIONS.map(r => `  <rdf:Description rdf:about="i:${r.source}"><i:${r.relation} rdf:resource="i:${r.target}"/></rdf:Description>`).join('\n')}\n</rdf:RDF>\n`, 'application/rdf+xml');
    case '.graphml':
      return downloadFile(name, `<?xml version="1.0"?>\n<graphml xmlns="http://graphml.graphdrawing.org/xmlns"><graph edgedefault="directed">\n${nodes.map(n => `  <node id="${n}"/>`).join('\n')}\n${ONTOLOGY_RELATIONS.map((r, i) => `  <edge id="e${i}" source="${r.source}" target="${r.target}"/>`).join('\n')}\n</graph></graphml>\n`, 'application/xml');
    case '.csv':
      return downloadCsv(name, nodes.map(a => Object.fromEntries([['node', a], ...nodes.map(b => [b, ONTOLOGY_RELATIONS.some(r => r.source === a && r.target === b) ? 1 : 0])])));
    case '.svg': {
      const pos = (i: number) => ({ x: 90 + (i % 3) * 200, y: 70 + Math.floor(i / 3) * 140 });
      const at = (n: string) => pos(nodes.indexOf(n));
      return downloadFile(name, `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" font-family="sans-serif" font-size="12">\n${ONTOLOGY_RELATIONS.map(r => `<line x1="${at(r.source).x}" y1="${at(r.source).y}" x2="${at(r.target).x}" y2="${at(r.target).y}" stroke="#10b981"/>`).join('\n')}\n${nodes.map((n, i) => `<g><rect x="${pos(i).x - 70}" y="${pos(i).y - 18}" width="140" height="36" rx="8" fill="#1e293b" stroke="#10b981"/><text x="${pos(i).x}" y="${pos(i).y + 4}" fill="#fff" text-anchor="middle">${n}</text></g>`).join('\n')}\n</svg>\n`, 'image/svg+xml');
    }
    default:
      return downloadFile(name, simplePdf([
        'IMPIX Ontology Specification',
        `Generated ${new Date().toISOString()}`,
        '',
        ...MOCK_ENTITIES.map(e => `Entity: ${e.name} (parent ${e.parent}, ${e.props} properties)`),
        '',
        ...ONTOLOGY_RELATIONS.map(r => `Relation: ${r.source} --${r.relation}--> ${r.target}`),
      ]));
  }
}

function ManagementSubModal({ type, isOpen, onClose }: { type: string | null, isOpen: boolean, onClose: () => void }) {
  const live = useLiveValue();
  const chart = chartPalette();
  const [subView, setSubView] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const { showToast } = useToast();
  const [users, setUsers] = useState(MOCK_USERS);
  const [auditFilter, setAuditFilter] = useState('All Events');
  const [selectedRole, setSelectedRole] = useState('System Admin');
  const [entities, setEntities] = useState(MOCK_ENTITIES);
  const [draftProps, setDraftProps] = useState([
    { key: 'serial_number', type: 'string' },
    { key: 'installation_date', type: 'timestamp' },
    { key: 'operating_status', type: 'enum' },
  ]);
  const [entityProps, setEntityProps] = useState([1, 2, 3, 4].map(i => ({ key: `property_key_${i}`, required: true })));
  const [conflicts, setConflicts] = useState<Record<number, 'local' | 'remote'>>({});
  const [ruleConditions, setRuleConditions] = useState<string[]>([]);
  const [rules, setRules] = useState(MOCK_RULES);
  const importRef = useRef<HTMLInputElement>(null);

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
                  placeholder={t('Search users by name, email or role...')} 
                  className="w-full bg-bg border border-border rounded-lg py-2 pl-10 pr-4 text-xs focus:border-accent outline-none"
                />
              </div>
              <button
                onClick={() => {
                  const next = NEW_USER_POOL[users.length % NEW_USER_POOL.length];
                  setUsers(prev => [{ ...next, status: 'Online', last: 'Just now' }, ...prev]);
                  showToast(t('사용자 {name}을(를) 추가했습니다', { name: next.name }));
                }}
                className="px-4 py-2 bg-accent text-bg rounded-lg text-xs font-bold hover:opacity-90 transition-opacity"
              >
                {t('Add User')}
              </button>
            </div>
            <div className="overflow-hidden rounded-xl border border-border bg-surface">
              <table className="w-full text-left text-xs">
                <thead className="bg-bg/50 border-b border-border">
                  <tr>
                    <th className="px-4 py-3 font-bold text-text-secondary uppercase tracking-widest">{t('User')}</th>
                    <th className="px-4 py-3 font-bold text-text-secondary uppercase tracking-widest">{t('Role')}</th>
                    <th className="px-4 py-3 font-bold text-text-secondary uppercase tracking-widest">{t('Status')}</th>
                    <th className="px-4 py-3 font-bold text-text-secondary uppercase tracking-widest">{t('Last Login')}</th>
                    <th className="px-4 py-3 font-bold text-text-secondary uppercase tracking-widest text-right">{t('Actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {users.map((user, i) => (
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
                          {t(user.role)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className={cn("w-1.5 h-1.5 rounded-full", user.status === 'Online' ? "bg-emerald-500" : "bg-text-secondary")} />
                          <span className={user.status === 'Online' ? "text-emerald-500 font-bold" : "text-text-secondary"}>{t(user.status)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-text-secondary">{user.last}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => {
                            const status = user.status === 'Online' ? 'Offline' : 'Online';
                            setUsers(prev => prev.map((u, j) => j === i ? { ...u, status } : u));
                            showToast(t('{name} 계정을 {status} 상태로 바꿨습니다', { name: user.name, status: t(status) }), 'info');
                          }}
                          className="text-accent hover:underline font-bold"
                        >{t('Manage')}</button>
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
                <div
                  key={role}
                  onClick={() => setSelectedRole(role)}
                  className={cn("p-4 rounded-xl bg-surface border hover:border-accent/30 transition-colors cursor-pointer group", selectedRole === role ? "border-accent ring-1 ring-accent" : "border-border")}
                >
                  <div className="flex items-center justify-between mb-3">
                    <Shield className="text-accent" size={20} />
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  </div>
                  <h4 className="font-bold text-sm mb-1">{t(role)}</h4>
                  <p className="text-[10px] text-text-secondary leading-relaxed">
                    {role === 'System Admin' ? t('Full access to all system modules and configurations.') :
                     role === 'Operator' ? t('Standard operational access for production lines.') :
                     role === 'Auditor' ? t('Read-only access to logs and system reports.') :
                     t('Restricted view-only access to dashboards.')}
                  </p>
                </div>
              ))}
            </div>
            <div className="dashboard-card">
              <h4 className="text-xs font-bold uppercase tracking-widest text-text-secondary mb-4">{t('Permission Matrix')}</h4>
              <div className="space-y-3">
                {[
                  { module: 'Quality Control', admin: 'Full', operator: 'Read/Write', auditor: 'Read', viewer: 'Read' },
                  { module: 'System Config', admin: 'Full', operator: 'None', auditor: 'Read', viewer: 'None' },
                  { module: 'User Mgmt', admin: 'Full', operator: 'None', auditor: 'None', viewer: 'None' },
                  { module: 'Live Telemetry', admin: 'Full', operator: 'Full', auditor: 'Read', viewer: 'Read' },
                ].map((row, i) => (
                  <div key={i} className="grid grid-cols-5 gap-4 py-2 border-b border-border/50 text-[11px] items-center">
                    <div className="font-bold text-text-primary">{row.module}</div>
                    {([['System Admin', row.admin], ['Operator', row.operator], ['Auditor', row.auditor], ['Viewer', row.viewer]] as const).map(([role, value]) => (
                      <div key={role} className={cn(role === selectedRole ? "text-emerald-500 font-bold" : "text-text-secondary")}>{value}</div>
                    ))}
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
                  <button key={f} onClick={() => setAuditFilter(f)} aria-pressed={auditFilter === f} className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-bold border transition-colors",
                    f === auditFilter ? "bg-accent text-bg border-accent" : "bg-surface border-border text-text-secondary hover:border-accent/50"
                  )}>
                    {f}
                  </button>
                ))}
              </div>
              <div className="text-[10px] text-text-secondary font-mono">{t('Total: 1,284 entries')}</div>
            </div>
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {MOCK_AUDIT.filter(log => auditFilter === 'All Events' || log.category === auditFilter).map((log, i) => (
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
                    <div className="text-[10px] text-text-secondary italic">{t('Target:')} {log.target}</div>
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
                      <div className="text-[9px] font-bold text-text-secondary uppercase tracking-widest mb-1">{t('Latency')}</div>
                      <div className="text-xs font-mono">{svc.latency}</div>
                    </div>
                    <div>
                      <div className="text-[9px] font-bold text-text-secondary uppercase tracking-widest mb-1">{t('Uptime')}</div>
                      <div className="text-xs font-mono">{svc.uptime}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="dashboard-card">
              <div className="flex items-center justify-between mb-6">
                <h4 className="text-xs font-bold uppercase tracking-widest text-text-secondary">{t('Infrastructure Load (24h)')}</h4>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-purple-500" />
                    <span className="text-[10px] text-text-secondary">CPU</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="text-[10px] text-text-secondary">MEM</span>
                  </div>
                </div>
              </div>
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={[
                    { time: '00:00', cpu: live(45, 21), mem: live(60, 22) },
                    { time: '04:00', cpu: live(30, 23), mem: live(55, 24) },
                    { time: '08:00', cpu: live(85, 25), mem: live(75, 26) },
                    { time: '12:00', cpu: live(70, 27), mem: live(80, 28) },
                    { time: '16:00', cpu: live(90, 29), mem: live(85, 30) },
                    { time: '20:00', cpu: live(55, 31), mem: live(70, 32) },
                  ]}>
                    <defs>
                      <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
                    <XAxis dataKey="time" stroke={chart.axis} fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke={chart.axis} fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: chart.tooltipBg, border: `1px solid ${chart.tooltipBorder}`, borderRadius: '8px' }}
                      itemStyle={{ color: chart.tooltipText, fontSize: '12px' }}
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
                    <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">{t('Entity Name')}</label>
                    <input type="text" placeholder={t('e.g., Conveyor Belt')} className="w-full bg-surface border border-border rounded-xl p-3 text-sm focus:border-accent outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">{t('Parent Class')}</label>
                    <select className="w-full bg-surface border border-border rounded-xl p-3 text-sm focus:border-accent outline-none">
                      <option>{t('Asset')}</option>
                      <option>{t('Equipment')}</option>
                      <option>{t('IoT Device')}</option>
                      <option>{t('Inventory')}</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">{t('Description')}</label>
                    <textarea rows={3} className="w-full bg-surface border border-border rounded-xl p-3 text-sm focus:border-accent outline-none resize-none" placeholder={t('Describe the entity\'s role in the ontology...')} />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">{t('Properties')}</label>
                    <button
                      onClick={() => setDraftProps(prev => [...prev, { key: `property_${prev.length + 1}`, type: 'string' }])}
                      className="text-accent text-[10px] font-bold flex items-center gap-1 hover:underline"
                    >
                      <Plus size={12} /> {t('Add Property')}
                    </button>
                  </div>
                  <div className="space-y-2">
                    {draftProps.map((prop, i) => (
                      <div key={i} className="flex gap-2">
                        <input type="text" value={prop.key} readOnly className="flex-1 bg-bg border border-border rounded-lg p-2 text-xs font-mono" />
                        <select className="bg-bg border border-border rounded-lg p-2 text-[10px] font-bold uppercase">
                          <option>{prop.type}</option>
                        </select>
                        <button
                          onClick={() => setDraftProps(prev => prev.filter((_, j) => j !== i))}
                          className="p-2 text-text-secondary hover:text-red-500"
                          aria-label={t('삭제')}
                        ><Trash2 size={14} /></button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-6 border-t border-border">
                <button onClick={() => setSubView(null)} className="px-6 py-2 rounded-xl border border-border text-xs font-bold hover:bg-surface-hover transition-colors">{t('Cancel')}</button>
                <button
                  onClick={() => {
                    setEntities(prev => [...prev, { name: `Custom Entity ${prev.length - MOCK_ENTITIES.length + 1}`, parent: 'Asset', props: draftProps.length, instances: 0, icon: Box }]);
                    showToast(t('새 엔티티 타입을 만들었습니다'));
                    setSubView(null);
                  }}
                  className="px-6 py-2 rounded-xl bg-accent text-bg text-xs font-bold hover:opacity-90 transition-opacity"
                >{t('Create Entity Type')}</button>
              </div>
            </div>
          );
        }

        if (subView === 'entity-import') {
          return (
            <div className="space-y-6">
              <div className="p-8 border-2 border-dashed border-border rounded-3xl flex flex-col items-center justify-center bg-surface/30">
                <Upload size={48} className="text-text-secondary mb-4" />
                <h4 className="text-sm font-bold mb-2">{t('Drag & Drop Schema File')}</h4>
                <p className="text-xs text-text-secondary mb-6">{t('Supports .json, .yaml, .ttl (Turtle) formats')}</p>
                <input
                  ref={importRef}
                  type="file"
                  accept=".json,.yaml,.yml,.ttl"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setEntities(prev => [...prev, { name: file.name.replace(/\.[^.]+$/, ''), parent: 'Asset', props: 6, instances: 0, icon: Box }]);
                    showToast(t('{name} 스키마를 가져왔습니다', { name: file.name }));
                    e.target.value = '';
                    setSubView(null);
                  }}
                />
                <button onClick={() => importRef.current?.click()} className="px-6 py-2 bg-accent text-bg rounded-xl text-xs font-bold">{t('Browse Files')}</button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-surface border border-border flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-blue-500/10 text-blue-500"><FileJson size={20} /></div>
                  <div>
                    <div className="text-xs font-bold">{t('JSON-LD Template')}</div>
                    <div className="text-[10px] text-text-secondary">{t('Standard manufacturing ontology')}</div>
                  </div>
                  <button onClick={() => downloadJson('ontology-template.jsonld', ONTOLOGY_JSONLD)} className="ml-auto p-2 hover:bg-bg rounded-lg" aria-label={t('JSON-LD Template')}><Download size={16} /></button>
                </div>
                <div className="p-4 rounded-2xl bg-surface border border-border flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500"><FileSpreadsheet size={20} /></div>
                  <div>
                    <div className="text-xs font-bold">{t('Excel Mapping')}</div>
                    <div className="text-[10px] text-text-secondary">{t('Bulk entity property import')}</div>
                  </div>
                  <button
                    onClick={() => downloadCsv('entity-mapping.csv', entities.map(e => ({ entity: e.name, parent: e.parent, properties: e.props, instances: e.instances })))}
                    className="ml-auto p-2 hover:bg-bg rounded-lg"
                    aria-label={t('Excel Mapping')}
                  ><Download size={16} /></button>
                </div>
              </div>
              <div className="flex justify-start">
                <button onClick={() => setSubView(null)} className="text-xs font-bold text-text-secondary flex items-center gap-2 hover:text-text-primary">
                  <ChevronLeft size={16} /> {t('Back to Entities')}
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
                  <button
                    onClick={() => {
                      setEntities(prev => prev.filter(e => e.name !== selectedItem.name));
                      showToast(t('{name} 타입을 삭제했습니다', { name: selectedItem.name }), 'info');
                      setSubView(null);
                    }}
                    className="px-4 py-2 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 text-[10px] font-bold uppercase tracking-widest"
                  >{t('Delete Type')}</button>
                  <button
                    onClick={() => {
                      setEntities(prev => prev.map(e => e.name === selectedItem.name ? { ...e, props: entityProps.length } : e));
                      showToast(t('변경 사항을 저장했습니다'));
                      setSubView(null);
                    }}
                    className="px-4 py-2 rounded-xl bg-accent text-bg text-[10px] font-bold uppercase tracking-widest"
                  >{t('Save Changes')}</button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-6">
                <div className="col-span-2 space-y-6">
                  <div className="dashboard-card">
                    <h5 className="text-xs font-bold uppercase tracking-widest text-text-secondary mb-4">{t('Property Definitions')}</h5>
                    <div className="space-y-3">
                      {entityProps.map((prop, idx) => (
                        <div key={idx} className="flex items-center gap-4 p-3 rounded-xl bg-bg border border-border group">
                          <div className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center text-[10px] font-bold text-text-secondary">{idx + 1}</div>
                          <div className="flex-1">
                            <input type="text" defaultValue={prop.key} className="bg-transparent border-none p-0 text-xs font-bold focus:ring-0 w-full" />
                            <div className="text-[10px] text-text-secondary">{prop.required ? t('Type: String | Required: Yes') : t('Type: String | Required: No')}</div>
                          </div>
                          <button
                            onClick={() => setEntityProps(prev => prev.map((p, j) => j === idx ? { ...p, required: !p.required } : p))}
                            title={t('필수 여부 전환')}
                            aria-label={t('필수 여부 전환')}
                            className="p-2 hover:bg-surface rounded-lg transition-all text-text-secondary hover:text-accent"
                          ><Settings2 size={14} /></button>
                        </div>
                      ))}
                      <button
                        onClick={() => setEntityProps(prev => [...prev, { key: `property_key_${prev.length + 1}`, required: false }])}
                        className="w-full py-3 rounded-xl border border-dashed border-border text-[10px] font-bold uppercase tracking-widest text-text-secondary hover:border-accent/50 hover:text-accent transition-all">
                        {t('+ Add New Property')}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="dashboard-card">
                    <h5 className="text-xs font-bold uppercase tracking-widest text-text-secondary mb-4">{t('Inheritance')}</h5>
                    <div className="space-y-4">
                      <div className="relative pl-6 border-l-2 border-accent/30 space-y-4">
                        <div className="relative">
                          <div className="absolute -left-[25px] top-2 w-4 h-4 rounded-full bg-accent border-4 border-bg" />
                          <div className="text-[10px] font-bold text-accent uppercase">{t('Base Class')}</div>
                          <div className="text-xs font-bold">{t('Asset')}</div>
                        </div>
                        <div className="relative">
                          <div className="absolute -left-[25px] top-2 w-4 h-4 rounded-full bg-accent border-4 border-bg" />
                          <div className="text-[10px] font-bold text-accent uppercase">{t('Sub Class')}</div>
                          <div className="text-xs font-bold">{t('Equipment')}</div>
                        </div>
                        <div className="relative">
                          <div className="absolute -left-[25px] top-2 w-4 h-4 rounded-full bg-emerald-500 border-4 border-bg" />
                          <div className="text-[10px] font-bold text-emerald-500 uppercase">{t('Current')}</div>
                          <div className="text-xs font-bold">{selectedItem.name}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="dashboard-card">
                    <h5 className="text-xs font-bold uppercase tracking-widest text-text-secondary mb-4">{t('Usage Stats')}</h5>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-text-secondary uppercase">{t('Active Instances')}</span>
                        <span className="text-xs font-bold">{selectedItem.instances}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-text-secondary uppercase">{t('Relation Count')}</span>
                        <span className="text-xs font-bold">24</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <button onClick={() => setSubView(null)} className="text-xs font-bold text-text-secondary flex items-center gap-2 hover:text-text-primary">
                <ChevronLeft size={16} /> {t('Back to Entities')}
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
                  {t('Create Entity')}
                </button>
                <button 
                  onClick={() => setSubView('entity-import')}
                  className="px-4 py-2 bg-surface border border-border rounded-xl text-xs font-bold hover:bg-surface-hover transition-colors"
                >
                  {t('Import Schema')}
                </button>
              </div>
              <div className="text-[10px] text-text-secondary font-bold uppercase tracking-widest">{t('{n} Active Entity Types', { n: 41 + entities.length })}</div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {entities.map((entity, i) => (
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
                    <span className="text-[10px] text-text-secondary font-bold uppercase tracking-widest">{t('Parent:')}</span>
                    <span className="text-[10px] font-bold text-accent">{entity.parent}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
                    <div>
                      <div className="text-[9px] font-bold text-text-secondary uppercase tracking-widest mb-1">{t('Properties')}</div>
                      <div className="text-sm font-black">{entity.props}</div>
                    </div>
                    <div>
                      <div className="text-[9px] font-bold text-text-secondary uppercase tracking-widest mb-1">{t('Instances')}</div>
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
                  <h4 className="text-sm font-bold text-orange-200">{t('3 Conflicts Detected')}</h4>
                  <p className="text-xs text-orange-200/60 leading-relaxed">{t('The current graph version has conflicts with the master branch. Manual resolution required for entity \'Motor_A12\'.')}</p>
                </div>
              </div>
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="overflow-hidden rounded-2xl border border-border bg-surface">
                    <div className="p-3 bg-bg/50 border-b border-border flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">{t('Conflict #')}{i}{t(': Relation Mismatch')}</span>
                      {conflicts[i] ? (
                        <button
                          onClick={() => setConflicts(prev => { const next = { ...prev }; delete next[i]; return next; })}
                          className="flex items-center gap-1 px-3 py-1 rounded-lg bg-surface-hover text-[10px] font-bold text-accent"
                        >
                          <Check size={12} />{conflicts[i] === 'local' ? t('Keep Local') : t('Keep Remote')}
                        </button>
                      ) : (
                        <div className="flex gap-2">
                          <button onClick={() => setConflicts(prev => ({ ...prev, [i]: 'local' }))} className="px-3 py-1 rounded-lg bg-emerald-500 text-bg text-[10px] font-bold">{t('Keep Local')}</button>
                          <button onClick={() => setConflicts(prev => ({ ...prev, [i]: 'remote' }))} className="px-3 py-1 rounded-lg bg-blue-500 text-bg text-[10px] font-bold">{t('Keep Remote')}</button>
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 divide-x divide-border">
                      <div className="p-4 space-y-2">
                        <div className="text-[9px] font-bold text-emerald-500 uppercase">{t('Local Version')}</div>
                        <div className="text-xs font-mono p-2 rounded bg-bg">Motor_A12 {"->"} connected_to {"->"} PLC_04</div>
                      </div>
                      <div className="p-4 space-y-2">
                        <div className="text-[9px] font-bold text-blue-500 uppercase">{t('Remote Version')}</div>
                        <div className="text-xs font-mono p-2 rounded bg-bg">Motor_A12 {"->"} part_of {"->"} Line_01</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between pt-6 border-t border-border">
                <button onClick={() => setSubView(null)} className="text-xs font-bold text-text-secondary flex items-center gap-2 hover:text-text-primary">
                  <ChevronLeft size={16} /> {t('Back to Relations')}
                </button>
                <button
                  onClick={() => {
                    setConflicts({ 1: conflicts[1] ?? 'local', 2: conflicts[2] ?? 'local', 3: conflicts[3] ?? 'local' });
                    showToast(t('충돌 3건을 해결하고 병합했습니다'));
                    setSubView(null);
                  }}
                  className="px-6 py-2 rounded-xl bg-accent text-bg text-xs font-bold"
                >{t('Resolve All & Merge')}</button>
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
                  <button
                    key={i}
                    onClick={() => {
                      exportOntology(format.ext);
                      showToast(t('{name} 파일을 내려받았습니다', { name: format.name }));
                    }}
                    className="p-4 rounded-2xl bg-surface border border-border hover:border-accent transition-all text-left group"
                  >
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
                  <ChevronLeft size={16} /> {t('Back to Relations')}
                </button>
              </div>
            </div>
          );
        }

        return (
          <div className="space-y-6">
            <div className="dashboard-card">
              <div className="flex items-center justify-between mb-6">
                <h4 className="text-xs font-bold uppercase tracking-widest text-text-secondary">{t('Relation Mapping Graph')}</h4>
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
                    <div className="w-32 h-16 rounded-xl bg-surface border border-accent/50 flex items-center justify-center text-xs font-bold shadow-lg shadow-accent/10">{t('Manufacturing Line')}</div>
                    <div className="w-32 h-16 rounded-xl bg-surface border border-border flex items-center justify-center text-xs font-bold">{t('Electric Motor')}</div>
                  </div>
                  <div className="absolute top-8 left-1/2 -translate-x-1/2 w-20 h-[1px] bg-accent">
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-2 h-2 rounded-full bg-accent" />
                    <div className="absolute top-[-12px] left-1/2 -translate-x-1/2 text-[9px] font-bold text-accent uppercase tracking-tighter">contains</div>
                  </div>
                  <div className="text-center">
                    <Network size={32} className="text-border mb-2" />
                    <p className="text-[10px] text-text-secondary font-bold uppercase tracking-widest">{t('Interactive Graph View')}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-widest text-text-secondary px-2">{t('Recent Relations')}</h4>
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
                    <h5 className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-4">{t('Rule Metadata')}</h5>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-text-secondary">{t('Rule Name')}</label>
                        <input type="text" defaultValue="New Validation Rule" className="w-full bg-bg border border-border rounded-lg p-2 text-xs outline-none focus:border-accent" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-text-secondary">{t('Severity')}</label>
                        <select className="w-full bg-bg border border-border rounded-lg p-2 text-xs outline-none focus:border-accent">
                          <option>{t('Critical')}</option>
                          <option>{t('Warning')}</option>
                          <option>{t('Info')}</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-span-2 space-y-4">
                  <div className="p-6 rounded-2xl bg-surface border border-border min-h-[300px] flex flex-col">
                    <h5 className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-6">{t('Logic Builder')}</h5>
                    <div className="flex-1 space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="px-3 py-1.5 rounded-lg bg-accent/10 text-accent text-[10px] font-bold uppercase">IF</div>
                        <div className="flex-1 p-3 rounded-xl bg-bg border border-border text-xs font-mono">entity.type == 'Electric Motor'</div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="px-3 py-1.5 rounded-lg bg-accent/10 text-accent text-[10px] font-bold uppercase">AND</div>
                        <div className="flex-1 p-3 rounded-xl bg-bg border border-border text-xs font-mono">entity.properties.vibration == null</div>
                      </div>
                      {ruleConditions.map((cond, i) => (
                        <div key={i} className="flex items-center gap-4">
                          <div className="px-3 py-1.5 rounded-lg bg-accent/10 text-accent text-[10px] font-bold uppercase">AND</div>
                          <div className="flex-1 p-3 rounded-xl bg-bg border border-border text-xs font-mono">{cond}</div>
                          <button onClick={() => setRuleConditions(prev => prev.filter((_, j) => j !== i))} className="p-2 text-text-secondary hover:text-red-500" aria-label={t('삭제')}><Trash2 size={14} /></button>
                        </div>
                      ))}
                      <div className="flex items-center gap-4">
                        <div className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-500 text-[10px] font-bold uppercase">THEN</div>
                        <div className="flex-1 p-3 rounded-xl bg-bg border border-border text-xs font-mono">trigger_alert('Missing Telemetry')</div>
                      </div>
                    </div>
                    <button
                      onClick={() => setRuleConditions(prev => [...prev, EXTRA_CONDITIONS[prev.length % EXTRA_CONDITIONS.length]])}
                      className="mt-6 w-full py-3 rounded-xl border border-dashed border-border text-[10px] font-bold uppercase tracking-widest text-text-secondary hover:border-accent/50 hover:text-accent transition-all"
                    >
                      {t('+ Add Condition')}
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex justify-between pt-6 border-t border-border">
                <button onClick={() => setSubView(null)} className="text-xs font-bold text-text-secondary flex items-center gap-2 hover:text-text-primary">
                  <ChevronLeft size={16} /> {t('Back to Schema')}
                </button>
                <div className="flex gap-3">
                  <button
                    onClick={() => showToast(t('테스트 완료: 엔티티 1,262개 중 {n}건이 규칙에 걸렸습니다', { n: 2 + ruleConditions.length }), 'info')}
                    className="px-6 py-2 rounded-xl border border-border text-xs font-bold"
                  >{t('Test Rule')}</button>
                  <button
                    onClick={() => {
                      setRules(prev => [...prev, { name: `Custom Rule ${prev.length - MOCK_RULES.length + 1}`, desc: `IF entity.type == 'Electric Motor' AND entity.properties.vibration == null${ruleConditions.map(c => ` AND ${c}`).join('')} THEN trigger_alert`, status: 'Active', icon: Code2 }]);
                      setRuleConditions([]);
                      showToast(t('검증 규칙을 저장했습니다'));
                      setSubView(null);
                    }}
                    className="px-6 py-2 rounded-xl bg-accent text-bg text-xs font-bold"
                  >{t('Save Rule')}</button>
                </div>
              </div>
            </div>
          );
        }

        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="dashboard-card bg-emerald-500/5 border-emerald-500/10">
                <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-1">{t('Passed')}</div>
                <div className="text-2xl font-black">1,242</div>
                <div className="text-[10px] text-text-secondary mt-1">{t('98.4% of total')}</div>
              </div>
              <div className="dashboard-card bg-orange-500/5 border-orange-500/10">
                <div className="text-[10px] font-bold text-orange-500 uppercase tracking-widest mb-1">{t('Warnings')}</div>
                <div className="text-2xl font-black">18</div>
                <div className="text-[10px] text-text-secondary mt-1">{t('Schema mismatch')}</div>
              </div>
              <div className="dashboard-card bg-red-500/5 border-red-500/10">
                <div className="text-[10px] font-bold text-red-500 uppercase tracking-widest mb-1">{t('Critical')}</div>
                <div className="text-2xl font-black">2</div>
                <div className="text-[10px] text-text-secondary mt-1">{t('Validation failed')}</div>
              </div>
            </div>
            <div className="dashboard-card">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-xs font-bold uppercase tracking-widest text-text-secondary">{t('Active Validation Rules')}</h4>
                <button 
                  onClick={() => setSubView('schema-rule-editor')}
                  className="text-accent text-[10px] font-bold hover:underline"
                >
                  {t('Add Rule')}
                </button>
              </div>
              <div className="space-y-3">
                {rules.map((rule, i) => (
                  <div key={i} className="p-4 rounded-xl bg-bg border border-border flex items-start gap-4">
                    <div className="p-2 rounded-lg bg-surface border border-border text-accent">
                      <rule.icon size={18} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h5 className="text-sm font-bold">{rule.name}</h5>
                        <button
                          role="switch"
                          aria-checked={rule.status === 'Active'}
                          aria-label={rule.name}
                          onClick={() => setRules(prev => prev.map((r, j) => j === i ? { ...r, status: r.status === 'Active' ? 'Paused' : 'Active' } : r))}
                          className={cn("w-8 h-4 rounded-full relative transition-colors", rule.status === 'Active' ? "bg-accent" : "bg-border")}
                        >
                          <span className={cn("absolute top-0.5 w-3 h-3 bg-bg rounded-full transition-all", rule.status === 'Active' ? "right-0.5" : "left-0.5")} />
                        </button>
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
              <p className="text-[10px] text-text-secondary uppercase tracking-widest font-bold mt-1">{t('Management Console Detail')}</p>
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
            {t('Close')}
          </button>
          <button
            onClick={() => {
              const rows: Record<string, string | number>[] =
                type === 'user-directory' ? users.map(u => ({ name: u.name, email: u.email, role: u.role, status: u.status, last_login: u.last })) :
                type === 'audit-log' ? MOCK_AUDIT.map(({ category, ...log }) => ({ ...log, category })) :
                type === 'ontology-entities' ? entities.map(e => ({ entity: e.name, parent: e.parent, properties: e.props, instances: e.instances })) :
                type === 'ontology-schema' ? rules.map(r => ({ rule: r.name, description: r.desc, status: r.status })) :
                MOCK_HEALTH;
              downloadCsv(`${type}-${fileStamp()}.csv`, rows);
              showToast(t('보고서를 내려받았습니다'));
            }}
            className="px-6 py-2 rounded-xl bg-accent text-bg text-xs font-bold hover:opacity-90 transition-opacity"
          >
            {t('Export Report')}
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
            <span className="text-[9px] font-bold text-text-secondary uppercase tracking-[0.2em] mb-1">{t('System Status')}</span>
            <div className="flex items-center gap-2">
              <div className={cn("w-2 h-2 rounded-full animate-pulse", isAlert ? "bg-red-500" : "bg-emerald-500")} />
              <span className={cn("text-xs font-bold uppercase", isAlert ? "text-red-500" : "text-emerald-500")}>
                {isAlert ? t('EMERGENCY ALERT') : t('MONITORING ACTIVE')}
              </span>
            </div>
          </div>
          <div className="h-8 w-px bg-white/10" />
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-text-secondary uppercase tracking-[0.2em] mb-1">{t('Active Cameras')}</span>
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
            {t('THERMAL VIEW:')} {isThermal ? 'ON' : 'OFF'}
          </button>
          {!isAlert ? (
            <button onClick={triggerAlert} className="px-4 py-2 bg-red-500/20 border border-red-500/50 text-red-500 rounded-md text-[10px] font-bold hover:bg-red-500/30">
              {t('TEST ALERT')}
            </button>
          ) : (
            <button onClick={resetAlert} className="px-4 py-2 bg-emerald-500/20 border border-emerald-500/50 text-emerald-500 rounded-md text-[10px] font-bold hover:bg-emerald-500/30">
              {t('CLEAR ALERT')}
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
                    <div className="absolute -top-5 left-0 bg-red-500 text-[8px] px-1 font-bold">{t('FIRE DETECTED (92%)')}</div>
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
            <h4 className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-4">{t('AI Analysis')}</h4>
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
              <h4 className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-3">{t('Emergency Protocol')}</h4>
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
            <h4 className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-3">{t('Detection Log')}</h4>
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
            <span className="text-[9px] font-bold text-text-secondary uppercase tracking-[0.2em] mb-1">{t('ACS Connection')}</span>
            <div className="flex items-center gap-2">
              <div className={cn("w-2 h-2 rounded-full animate-pulse", acsStatus === 'Connected' ? "bg-blue-500" : "bg-red-500")} />
              <span className={cn("text-xs font-bold uppercase", acsStatus === 'Connected' ? "text-blue-500" : "text-red-500")}>
                {acsStatus}
              </span>
            </div>
          </div>
          <div className="h-8 w-px bg-white/10" />
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-text-secondary uppercase tracking-[0.2em] mb-1">{t('Active Fleet')}</span>
            <span className="text-xs font-bold">{t('03 AMRs')}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {!isEStop ? (
            <button 
              onClick={triggerEStop}
              className="px-6 py-2 bg-red-600 text-white rounded-md font-black text-sm hover:bg-red-700 transition-all shadow-[0_0_20px_rgba(220,38,38,0.4)] flex items-center gap-2"
            >
              <ShieldAlert size={18} />
              {t('EMERGENCY STOP')}
            </button>
          ) : (
            <button 
              onClick={resumeOperation}
              className="px-6 py-2 bg-emerald-600 text-white rounded-md font-black text-sm hover:bg-emerald-700 transition-all flex items-center gap-2"
            >
              <Play size={18} fill="currentColor" />
              {t('RESUME FLEET')}
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
                    {t('PROXIMITY')}<br/>WARNING
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Map Controls */}
          <div className="absolute bottom-4 left-4 flex gap-2">
            <div className="px-2 py-1 bg-black/80 border border-white/10 rounded text-[9px] font-bold">ZOOM: 100%</div>
            <div className="px-2 py-1 bg-black/80 border border-white/10 rounded text-[9px] font-bold uppercase">{t('Layer: Collision Heatmap')}</div>
          </div>
        </div>

        {/* Fleet Details */}
        <div className="flex flex-col gap-4">
          <div className="bg-[#111] p-4 rounded-xl border border-white/10 flex-1 overflow-y-auto custom-scrollbar">
            <h4 className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-4">{t('Fleet Telemetry')}</h4>
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
                      <span className="text-text-secondary">{t('Speed')}</span>
                      <span className="font-bold">{amr.speed} m/s</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-text-secondary">{t('Battery')}</span>
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
            <h4 className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-3">{t('ACS Event Log')}</h4>
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
  const safeTimeout = useSafeTimeout();
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: t('안녕하세요! AI 슈퍼바이저 어시스턴트입니다. 무엇을 도와드릴까요?'), timestamp: new Date().toLocaleTimeString() }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const [docs, setDocs] = useState([
    '2024 품질 관리 표준 매뉴얼',
    'B라인 설비 유지보수 가이드',
    '안전 수칙 및 비상 대응 절차',
    'OEE 산출 공식 및 기준',
  ]);
  const [showMenu, setShowMenu] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [listening, setListening] = useState(false);
  const attachRef = useRef<HTMLInputElement>(null);
  const docRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  /** Post a user message and answer it the way the supervisor would. */
  const ask = (input: string, answer?: string) => {
    const userMsg: ChatMessage = {
      role: 'user',
      content: input,
      timestamp: new Date().toLocaleTimeString()
    };

    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    // Simulate AI Response
    safeTimeout(() => {
      let response = '';
      if (answer) {
        response = answer;
      } else if (matchesKeyword(input, '불량률')) {
        response = t('현재 전체 라인의 평균 불량률은 3.2%입니다. B라인의 도금 공정에서 미세한 변동이 감지되었으나, 허용 범위 내에 있습니다.');
      } else if (matchesKeyword(input, '가동률') || input.toUpperCase().includes('OEE')) {
        response = t('오늘의 종합 설비 효율(OEE)은 87.5%로 목표치(85%)를 상회하고 있습니다. 특히 조립 라인의 성능 지표가 전일 대비 4% 향상되었습니다.');
      } else if (matchesKeyword(input, '안전')) {
        response = t('현재 모든 안전 센서가 정상 작동 중입니다. 구역 C에서 작업자 1명이 보호구 미착용으로 경고 조치되었으며, 현재는 시정 완료되었습니다.');
      } else if (matchesKeyword(input, '에너지')) {
        response = t('피크 요금 시간대(13~17시)를 피해 세척·건조 공정을 06~09시로 옮기면 하루 전력비를 약 8% 줄일 수 있습니다. 포장 라인은 현재 일정 그대로 유지하는 것이 좋습니다.');
      } else if (matchesKeyword(input, '위험')) {
        response = t('B라인 케이스패커-02 감속기 진동이 3일째 상승 중이며, 이 추세라면 72시간 안에 정지 위험이 62%입니다. 오늘 야간 정지 시간에 베어링 점검을 권장합니다.');
      } else {
        response = t('요청하신 내용을 분석 중입니다. Supervisor 에이전트가 관련 데이터를 취합하여 최적의 답변을 준비하고 있습니다.');
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

  const handleSend = () => {
    if (!input.trim()) return;
    ask(input);
    setInput('');
  };

  /** Voice input stand-in: listens briefly, then fills in a question. */
  const listen = () => {
    if (listening) return;
    setListening(true);
    safeTimeout(() => {
      setListening(false);
      setInput(suggestedQueries[Math.floor(Math.random() * suggestedQueries.length)]);
    }, 1600);
  };

  const suggestedQueries = [
    t('현재 전체 불량률 요약해줘'),
    t('B라인 가동 중단 위험 분석'),
    t('에너지 절감을 위한 최적 가동 시간은?'),
    t('최근 발생한 안전 경보 이력 조회')
  ];

  return (
    <div className={cn(
      "flex flex-col bg-surface border border-border rounded-2xl overflow-hidden shadow-2xl",
      expanded ? "fixed inset-4 z-[60]" : "h-[750px]",
    )}>
      {/* Chat Header */}
      <div className="px-6 py-4 border-b border-border bg-surface-hover/30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
            <Bot size={24} />
          </div>
          <div>
            <h3 className="text-sm font-bold">{t('AI 슈퍼바이저 어시스턴트')}</h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider">{t('Online & Ready')}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button onClick={() => setShowMenu(v => !v)} aria-label={t('대화 설정')} title={t('대화 설정')} className="p-2 rounded-lg hover:bg-surface-hover text-text-secondary transition-colors">
              <Settings size={18} />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-10 z-20 w-44 rounded-xl border border-border bg-surface p-1 shadow-xl">
                <button
                  onClick={() => {
                    setMessages(prev => prev.slice(0, 1));
                    setShowMenu(false);
                    showToast(t('대화를 초기화했습니다'), 'info');
                  }}
                  className="w-full rounded-lg px-3 py-2 text-left text-xs hover:bg-surface-hover"
                >{t('대화 초기화')}</button>
                <button
                  onClick={() => {
                    downloadFile(`supervisor-chat-${fileStamp()}.txt`, messages.map(m => `[${m.timestamp}] ${m.role === 'user' ? 'USER' : 'AI'}: ${m.content}`).join('\n\n'));
                    setShowMenu(false);
                  }}
                  className="w-full rounded-lg px-3 py-2 text-left text-xs hover:bg-surface-hover"
                >{t('대화 내보내기')}</button>
              </div>
            )}
          </div>
          <button onClick={() => setExpanded(v => !v)} aria-label={expanded ? t('원래 크기로') : t('크게 보기')} title={expanded ? t('원래 크기로') : t('크게 보기')} className="p-2 rounded-lg hover:bg-surface-hover text-text-secondary transition-colors">
            {expanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
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
                placeholder={t('메시지를 입력하세요 (Shift+Enter로 줄바꿈)')}
                className="w-full bg-surface border border-border rounded-2xl px-4 py-4 pr-32 text-sm focus:outline-none focus:border-accent/50 transition-colors resize-none h-24 custom-scrollbar"
              />
              <div className="absolute right-3 bottom-3 flex items-center gap-2">
                <input
                  ref={attachRef}
                  type="file"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    ask(t('첨부 파일: {name}', { name: file.name }), t('{name} ({size}KB)을 읽었습니다. 설비 이력·품질 기준과 대조해 보니 특이사항 2건이 있습니다: 측정 주기가 표준(5초)보다 긴 구간이 있고, 온도 상한 기준이 최신 매뉴얼과 1°C 다릅니다.', { name: file.name, size: Math.max(1, Math.round(file.size / 1024)) }));
                    e.target.value = '';
                  }}
                />
                <button onClick={() => attachRef.current?.click()} aria-label={t('파일 첨부')} title={t('파일 첨부')} className="p-2 rounded-lg hover:bg-surface-hover text-text-secondary transition-colors">
                  <Paperclip size={18} />
                </button>
                <button
                  onClick={listen}
                  aria-label={t('음성 입력')}
                  title={listening ? t('듣는 중…') : t('음성 입력')}
                  className={cn("p-2 rounded-lg transition-colors", listening ? "bg-danger/15 text-danger animate-pulse" : "hover:bg-surface-hover text-text-secondary")}
                >
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
            <h4 className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-4">{t('Active Analysis')}</h4>
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
            <h4 className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-4">{t('Reference Docs')}</h4>
            <div className="space-y-2">
              {docs.map((doc, i) => (
                <button
                  key={i}
                  onClick={() => ask(t('{doc} 핵심 내용 요약해줘', { doc: t(doc) }), t('{doc}의 핵심은 세 가지입니다. 1) 이상 징후는 감지 즉시 담당 AI가 1차 조치하고 기록합니다. 2) 설정값을 바꾸는 조치는 반드시 사람이 승인합니다. 3) 모든 조치는 근거 데이터와 함께 감사 로그에 남깁니다.', { doc: t(doc) }))}
                  className="w-full text-left p-2 rounded-lg hover:bg-surface-hover transition-colors group"
                >
                  <div className="flex items-center gap-2 text-[11px] text-text-secondary group-hover:text-text-primary">
                    <FileText size={12} />
                    <span className="truncate">{t(doc)}</span>
                  </div>
                </button>
              ))}
            </div>
            <input
              ref={docRef}
              type="file"
              accept=".pdf,.doc,.docx,.txt,.md,.xlsx"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0];
                if (!file) return;
                setDocs(prev => [...prev, file.name]);
                showToast(t('{name} 문서를 학습 자료에 추가했습니다', { name: file.name }));
                e.target.value = '';
              }}
            />
            <button onClick={() => docRef.current?.click()} className="w-full mt-4 py-2 rounded-lg border border-dashed border-border text-[10px] text-text-secondary hover:border-accent/50 hover:text-accent transition-all">
              {t('+ 문서 추가하기')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** A small on/off switch for settings panels. */
function MiniSwitch({ on, label, onChange }: { on: boolean; label: string; onChange: () => void }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onChange}
      className={cn("w-8 h-4 rounded-full relative transition-colors", on ? "bg-accent" : "bg-border")}
    >
      <span className={cn("absolute top-0.5 w-3 h-3 bg-bg rounded-full transition-all", on ? "right-0.5" : "left-0.5")} />
    </button>
  );
}

/** What the live chart on each module page shows, in the words of the person using it. */
const MODULE_CHARTS: Record<number, { title: string; caption: string }> = {
  1: { title: '불량률 추이 (최근 40초)', caption: '2초마다 들어오는 검사 결과로 계산한 불량률이에요. 3%를 넘으면 주의, 5%를 넘으면 경보예요.' },
  3: { title: '불량 유형 파레토', caption: '많은 유형부터 정렬했어요. 꺾은선은 누적 비율로, 80% 선 안의 유형부터 잡으면 효과가 커요.' },
  4: { title: '실링 온도별 불량률', caption: '점 하나가 온도 구간 하나예요. 173°C 근처에서 불량률이 가장 낮아요.' },
  5: { title: '배치별 수율', caption: '목표 수율 95%보다 낮은 배치는 빨간색으로 표시해 다시 확인하게 해요.' },
  6: { title: '설비별 건강 점수', caption: '진동·온도·전류를 종합한 100점 만점 점수예요. 70점 미만은 주의, 50점 미만은 위험이에요.' },
  7: { title: '진동·온도 추세 (최근 40초)', caption: '진동은 왼쪽 축(mm/s), 온도는 오른쪽 축(°C)이에요. 빨간 점선이 진동 경고 기준선이에요.' },
  10: { title: '월별 MTBF·MTTR', caption: 'MTBF(고장 간격)는 길수록, MTTR(수리 시간)은 짧을수록 좋아요.' },
  11: { title: '라인별 가동·대기·정지 비율 (오늘)', caption: '오늘 근무 시간을 100%로 놓고 상태별 비율을 나눴어요.' },
  12: { title: 'OEE와 구성 요소', caption: 'OEE = 가용률 × 성능 × 양품률이에요. 빨간 점선이 OEE 목표 85%예요.' },
  13: { title: '공정별 실제 vs 목표 택트타임', caption: '목표보다 오래 걸리는 공정(빨간색)이 라인 전체를 늦추는 병목이에요.' },
  14: { title: '배치 B-2405 공정 이력', caption: '원자재 입고부터 포장까지 각 공정에 들어간 시점과 머문 시간이에요. 문제가 생기면 이 경로를 거꾸로 따라가요.' },
  15: { title: '요일별 계획 대비 실적', caption: '계획과 실적을 나란히 비교해요. 차이가 큰 날부터 원인을 확인하세요.' },
  16: { title: '설비별 전력 사용량 (지금)', caption: '가동 중 전력과 멈춘 채 쓰는 대기 전력을 나눠 보여줘요.' },
  17: { title: '시간대별 전기요금 (오늘)', caption: '시간대별 요금을 적용한 오늘 전기요금이에요. 낮 시간대가 가장 비싸요.' },
  18: { title: '시간대별 부하와 계약 전력', caption: '빨간 점선이 계약 전력 1,000kW예요. 이 선을 넘는 시간대(빨간 점)에 초과 요금이 붙어요.' },
  32: { title: '원인별 비상 정지 횟수 (이번 달)', caption: '어떤 위험 신호로 공정을 멈췄는지 원인별로 세었어요.' },
  24: { title: '위험도별 AI 제안 처리', caption: '위험도가 높은 제안은 사람의 승인을 기다리고, 낮은 제안은 자동 승인 범위 안에서 바로 실행돼요.' },
  26: { title: '지식 지도 구성', caption: '공장 지식 지도에 등록된 엔티티·관계·속성·규칙 수예요.' },
  27: { title: '모델별 정확도·F1 점수', caption: '새 버전을 배포하기 전에 모델 성능을 비교해요 (1.0 = 100%).' },
  28: { title: '역할별 사용자 수', caption: '역할마다 볼 수 있는 화면과 승인할 수 있는 조치가 달라요.' },
  29: { title: '서버 자원과 데이터 지연 (최근 1시간)', caption: 'CPU·GPU 사용률(왼쪽 축)과 Kafka 데이터 지연(오른쪽 축)이에요. 사용률이 85%를 넘으면 경고해요.' },
  30: { title: '채널별 알림 발송 건수 (이번 달)', caption: '어떤 채널로 알림이 얼마나 나갔는지 보여줘요.' },
};

function ModuleDetailView({ item, sensorData }: { item: MenuItem; sensorData: SensorData[] }) {
  const live = useLiveValue();
  const chart = chartPalette();
  const [logs, setLogs] = useState<{time: string, msg: string, type: 'info' | 'warn' | 'success'}[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showTech, setShowTech] = useState(false);
  const moduleTuning = useModuleTuning(item.id);
  const [activeManagementSubDetail, setActiveManagementSubDetail] = useState<string | null>(null);
  const { showToast } = useToast();
  const [modelVersion, setModelVersion] = useState({ major: 2, minor: 4, patch: 0, deployed: '2024-03-10' });
  const [deploying, setDeploying] = useState(false);
  const [prefs, setPrefs] = useState({ autoRollback: true, abTesting: false, email: true, sms: false, push: true, slack: false });
  const [severity, setSeverity] = useState('Crit');
  const [samplingMs, setSamplingMs] = useState(500);
  const [retentionDays, setRetentionDays] = useState(30);
  const togglePref = (key: keyof typeof prefs, label: string) => {
    setPrefs(prev => {
      const on = !prev[key];
      showToast(t('{name}: {state}', { name: t(label), state: on ? t('켜짐') : t('꺼짐') }), 'info');
      return { ...prev, [key]: on };
    });
  };

  useEffect(() => {
    // Generate initial logs
    const initialLogs = [
      { time: new Date().toLocaleTimeString(), msg: `Module ${t(item.name)} initialized.`, type: 'info' as const },
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
    const tip = {
      contentStyle: { backgroundColor: chart.tooltipBg, border: `1px solid ${chart.tooltipBorder}`, borderRadius: '8px' },
      itemStyle: { color: chart.tooltipText, fontSize: '12px' },
      labelStyle: { color: chart.tooltipText, fontSize: '11px' },
    };
    const legendProps = { iconType: 'circle' as const, wrapperStyle: { fontSize: '10px' } };
    const trend = withAgoLabels(sensorData);
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
                { name: t('엔티티'), value: Math.round(live(45, 33)) },
                { name: t('관계'), value: Math.round(live(128, 34)) },
                { name: t('속성'), value: Math.round(live(312, 35)) },
                { name: t('규칙'), value: Math.round(live(84, 36)) },
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
                <XAxis dataKey="name" stroke={chart.axis} fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke={chart.axis} fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: chart.tooltipBg, border: `1px solid ${chart.tooltipBorder}`, borderRadius: '8px' }}
                  itemStyle={{ color: chart.tooltipText, fontSize: '12px' }}
                />
                <Bar dataKey="value" fill="#8b5cf6" name={t('등록 수')} radius={[4, 4, 0, 0]} />
              </BarChart>
            );
          case 27: // 모델 레지스트리
            return (
              <BarChart data={[
                { name: 'Anomalib', acc: Math.min(1, live(0.94, 37)), f1: Math.min(1, live(0.92, 38)) },
                { name: 'YOLOv8', acc: Math.min(1, live(0.88, 39)), f1: Math.min(1, live(0.85, 40)) },
                { name: 'ResNet', acc: Math.min(1, live(0.91, 41)), f1: Math.min(1, live(0.89, 42)) },
                { name: 'ViT', acc: Math.min(1, live(0.96, 43)), f1: Math.min(1, live(0.95, 44)) },
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
                <XAxis dataKey="name" stroke={chart.axis} fontSize={10} tickLine={false} axisLine={false} />
                <YAxis domain={[0, 1]} stroke={chart.axis} fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip {...tip} />
                <Legend {...legendProps} />
                <Bar dataKey="acc" fill="#3b82f6" name="Accuracy" radius={[4, 4, 0, 0]} />
                <Bar dataKey="f1" fill="#10b981" name="F1 Score" radius={[4, 4, 0, 0]} />
              </BarChart>
            );
          case 28: // 사용자/권한 관리
            return (
              <PieChart>
                <Pie
                  data={[
                    { name: t('관리자'), value: Math.round(live(5, 45)) },
                    { name: t('오퍼레이터'), value: Math.round(live(24, 46)) },
                    { name: t('설비엔지니어'), value: Math.round(live(12, 47)) },
                    { name: t('품질관리자'), value: Math.round(live(8, 48)) },
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
                <Tooltip {...tip} />
                <Legend {...legendProps} />
              </PieChart>
            );
          case 29: { // 시스템 모니터링
            const load = Array.from({ length: 12 }, (_, i) => ({
              ago: i === 11 ? t('지금') : `-${(11 - i) * 5}m`,
              cpu: live(48 + (i % 4) * 5, 300 + i),
              gpu: live(66 + (i % 3) * 6, 320 + i),
              lag: live(18 + (i % 5) * 3, 340 + i),
            }));
            return (
              <LineChart data={load} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
                <XAxis dataKey="ago" stroke={chart.axis} fontSize={10} tickLine={false} axisLine={false} />
                <YAxis yAxisId="pct" unit="%" domain={[0, 100]} stroke={chart.axis} fontSize={10} tickLine={false} axisLine={false} />
                <YAxis yAxisId="ms" orientation="right" unit="ms" stroke={chart.axis} fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip {...tip} />
                <Legend {...legendProps} />
                <ReferenceLine yAxisId="pct" y={85} stroke="#ef4444" strokeDasharray="4 4" label={{ value: t('경고 85%'), position: 'insideTopLeft', fontSize: 10, fill: '#ef4444' }} />
                <Line yAxisId="pct" type="monotone" dataKey="cpu" stroke="#3b82f6" strokeWidth={2} dot={false} name={t('CPU 사용률 (%)')} />
                <Line yAxisId="pct" type="monotone" dataKey="gpu" stroke="#8b5cf6" strokeWidth={2} dot={false} name={t('GPU 사용률 (%)')} />
                <Line yAxisId="ms" type="monotone" dataKey="lag" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 3" dot={false} name={t('Kafka 데이터 지연 (ms)')} />
              </LineChart>
            );
          }
          case 30: // 알림 설정
            return (
              <BarChart data={[
                { name: t('SMS'), value: Math.round(live(142, 49)) },
                { name: t('Email'), value: Math.round(live(856, 50)) },
                { name: t('Push'), value: Math.round(live(2431, 51)) },
                { name: t('Siren'), value: Math.round(live(12, 52)) },
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
                <XAxis dataKey="name" stroke={chart.axis} fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke={chart.axis} fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: chart.tooltipBg, border: `1px solid ${chart.tooltipBorder}`, borderRadius: '8px' }}
                  itemStyle={{ color: chart.tooltipText, fontSize: '12px' }}
                />
                <Bar dataKey="value" fill="#f59e0b" name={t('발송 건수')} radius={[4, 4, 0, 0]} />
              </BarChart>
            );
          default:
            return <div className="flex items-center justify-center h-full text-text-secondary text-xs">{t('System Management Metric View')}</div>;
        }
      case 'AI 슈퍼바이저 에이전트':
        switch (item.id) {
          case 21: // AI 챗봇
            return (
              <BarChart data={[
                { type: t('데이터 조회'), count: live(450, 53) },
                { type: t('지식 검색'), count: live(320, 54) },
                { type: t('분석 요청'), count: live(180, 55) },
                { type: t('기타'), count: live(50, 56) },
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
                <XAxis dataKey="type" stroke={chart.axis} fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke={chart.axis} fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: chart.tooltipBg, border: `1px solid ${chart.tooltipBorder}`, borderRadius: '8px' }}
                  itemStyle={{ color: chart.tooltipText, fontSize: '12px' }}
                />
                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            );
          case 22: // AI 추천 액션 목록
            return (
              <PieChart>
                <Pie
                  data={[
                    { name: t('품질'), value: live(40, 57) },
                    { name: t('설비'), value: live(30, 58) },
                    { name: t('에너지'), value: live(20, 59) },
                    { name: t('안전'), value: live(10, 60) },
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
                  contentStyle={{ backgroundColor: chart.tooltipBg, border: `1px solid ${chart.tooltipBorder}`, borderRadius: '8px' }}
                  itemStyle={{ color: chart.tooltipText, fontSize: '12px' }}
                />
              </PieChart>
            );
          case 23: // Agent 실행 이력
            return (
              <BarChart layout="vertical" data={[
                { agent: 'Quality', runs: live(1240, 61) },
                { agent: 'PM', runs: live(850, 62) },
                { agent: 'Line', runs: live(2100, 63) },
                { agent: 'Energy', runs: live(600, 64) },
                { agent: 'Safety', runs: live(300, 65) },
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} horizontal={false} />
                <XAxis type="number" stroke={chart.axis} fontSize={10} />
                <YAxis dataKey="agent" type="category" stroke={chart.axis} fontSize={10} />
                <Tooltip 
                  contentStyle={{ backgroundColor: chart.tooltipBg, border: `1px solid ${chart.tooltipBorder}`, borderRadius: '8px' }}
                  itemStyle={{ color: chart.tooltipText, fontSize: '12px' }}
                />
                <Bar dataKey="runs" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
              </BarChart>
            );
          case 24: // 승인 대기 큐
            return (
              <BarChart data={[
                { risk: t('높음'), human: Math.round(live(5, 66)), auto: 0 },
                { risk: t('중간'), human: Math.round(live(4, 67)), auto: Math.round(live(9, 68)) },
                { risk: t('낮음'), human: 0, auto: Math.round(live(31, 69)) },
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
                <XAxis dataKey="risk" stroke={chart.axis} fontSize={10} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} stroke={chart.axis} fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip {...tip} />
                <Legend {...legendProps} />
                <Bar dataKey="human" stackId="q" fill="#f59e0b" name={t('사람 승인 대기 (건)')} />
                <Bar dataKey="auto" stackId="q" fill="#10b981" name={t('자동 승인 (건)')} radius={[4, 4, 0, 0]} />
              </BarChart>
            );
          case 31: // 슈퍼바이저 센터
            return (
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={[
                { subject: 'Safety', A: live(100, 69), fullMark: 100 },
                { subject: 'Quality', A: live(95, 70), fullMark: 100 },
                { subject: 'Production', A: live(85, 71), fullMark: 100 },
                { subject: 'Energy', A: live(80, 72), fullMark: 100 },
                { subject: 'Cost', A: live(75, 73), fullMark: 100 },
              ]}>
                <PolarGrid stroke={chart.grid} />
                <PolarAngleAxis dataKey="subject" stroke={chart.axis} fontSize={10} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} stroke={chart.axis} fontSize={8} />
                <Radar name="Supervisor Priority" dataKey="A" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} />
                <Tooltip 
                  contentStyle={{ backgroundColor: chart.tooltipBg, border: `1px solid ${chart.tooltipBorder}`, borderRadius: '8px' }}
                  itemStyle={{ color: chart.tooltipText, fontSize: '12px' }}
                />
              </RadarChart>
            );
          default:
            return (
              <BarChart data={[
                { name: t('질의 응답'), value: live(450, 74) },
                { name: t('추천 액션'), value: live(120, 75) },
                { name: t('자동 제어'), value: live(85, 76) },
                { name: t('시뮬레이션'), value: live(42, 77) },
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
                <XAxis dataKey="name" stroke={chart.axis} fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke={chart.axis} fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: chart.tooltipBg, border: `1px solid ${chart.tooltipBorder}`, borderRadius: '8px' }}
                  itemStyle={{ color: chart.tooltipText, fontSize: '12px' }}
                />
                <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            );
        }
      case 'AI 품질 에이전트':
        switch (item.id) {
          case 1: // 실시간 불량률 현황
            return (
              <AreaChart data={trend} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorDefect" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
                <XAxis dataKey="ago" stroke={chart.axis} fontSize={10} tickLine={false} axisLine={false} minTickGap={16} />
                <YAxis unit="%" domain={[0, (max: number) => Math.max(6, Math.ceil(max))]} stroke={chart.axis} fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip {...tip} formatter={(v) => `${Number(v).toFixed(2)}%`} />
                <Legend {...legendProps} />
                <ReferenceLine y={3} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: t('주의 3%'), position: 'insideTopLeft', fontSize: 10, fill: '#f59e0b' }} />
                <ReferenceLine y={5} stroke="#ef4444" strokeDasharray="4 4" label={{ value: t('경보 5%'), position: 'insideTopLeft', fontSize: 10, fill: '#ef4444' }} />
                <Area type="monotone" dataKey="defect_rate" stroke="#ef4444" fillOpacity={1} fill="url(#colorDefect)" isAnimationActive={false} name={t('불량률 (%)')} />
              </AreaChart>
            );
          case 2: // 비전검사 결과 뷰어
            return (
              <BarChart data={[
                { name: t('Frame 1'), score: live(0.12, 78) },
                { name: t('Frame 2'), score: live(0.45, 79) },
                { name: t('Frame 3'), score: live(0.08, 80) },
                { name: t('Frame 4'), score: live(0.88, 81) },
                { name: t('Frame 5'), score: live(0.15, 82) },
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
                <XAxis dataKey="name" stroke={chart.axis} fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke={chart.axis} fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: chart.tooltipBg, border: `1px solid ${chart.tooltipBorder}`, borderRadius: '8px' }}
                  itemStyle={{ color: chart.tooltipText, fontSize: '12px' }}
                />
                <Bar dataKey="score" name="Defect Score">
                  {[0, 1, 2, 3, 4].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 3 ? '#ef4444' : '#10b981'} />
                  ))}
                </Bar>
              </BarChart>
            );
          case 3: { // 불량 유형 분석
            // Pareto: the biggest defect types first, with the cumulative share.
            const counts = [
              { name: t('찢김'), count: Math.round(live(35, 83)) },
              { name: t('기포'), count: Math.round(live(25, 84)) },
              { name: t('변색'), count: Math.round(live(20, 85)) },
              { name: t('라벨누락'), count: Math.round(live(15, 86)) },
            ].sort((a, b) => b.count - a.count);
            counts.push({ name: t('기타'), count: Math.round(live(5, 87)) });
            const total = counts.reduce((sum, r) => sum + r.count, 0) || 1;
            let running = 0;
            const pareto = counts.map(r => {
              running += r.count;
              return { ...r, cum: Number(((running / total) * 100).toFixed(1)) };
            });
            return (
              <ComposedChart data={pareto} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
                <XAxis dataKey="name" stroke={chart.axis} fontSize={10} tickLine={false} axisLine={false} />
                <YAxis yAxisId="count" allowDecimals={false} stroke={chart.axis} fontSize={10} tickLine={false} axisLine={false} />
                <YAxis yAxisId="cum" orientation="right" unit="%" domain={[0, 100]} stroke={chart.axis} fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip {...tip} />
                <Legend {...legendProps} />
                <ReferenceLine yAxisId="cum" y={80} stroke={chart.axis} strokeDasharray="4 4" label={{ value: '80%', position: 'insideTopRight', fontSize: 10, fill: chart.axis }} />
                <Bar yAxisId="count" dataKey="count" fill="#ef4444" name={t('불량 건수 (오늘)')} radius={[4, 4, 0, 0]} />
                <Line yAxisId="cum" type="monotone" dataKey="cum" stroke="#3b82f6" strokeWidth={2} name={t('누적 비율 (%)')} />
              </ComposedChart>
            );
          }
          case 4: // 온도-불량 상관분석
            return (
              <ScatterChart margin={{ top: 20, right: 20, bottom: 10, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
                <XAxis type="number" dataKey="temp" name={t('실링 온도')} unit="°C" domain={[155, 195]} stroke={chart.axis} fontSize={10} />
                <YAxis type="number" dataKey="defect" name={t('불량률')} unit="%" stroke={chart.axis} fontSize={10} />
                <ZAxis type="number" range={[80, 80]} />
                <Tooltip {...tip} cursor={{ strokeDasharray: '3 3' }} />
                <Legend {...legendProps} />
                <ReferenceLine x={173} stroke="#10b981" strokeDasharray="4 4" label={{ value: t('최적 173°C'), position: 'insideTop', fontSize: 10, fill: '#10b981' }} />
                {/* Temperature bands are fixed; only the measured defect rate moves. */}
                <Scatter name={t('온도 구간별 불량률')} data={[
                  { temp: 160, defect: live(8.2, 89) },
                  { temp: 165, defect: live(4.5, 91) },
                  { temp: 170, defect: live(2.1, 93) },
                  { temp: 173, defect: live(1.4, 94) },
                  { temp: 175, defect: live(1.8, 95) },
                  { temp: 180, defect: live(2.9, 97) },
                  { temp: 185, defect: live(5.4, 99) },
                  { temp: 190, defect: live(9.1, 101) },
                ]} fill="#8b5cf6" line={{ stroke: '#8b5cf6', strokeOpacity: 0.4 }} />
              </ScatterChart>
            );
          case 5: { // 품질 이력 검색
            const batches = [
              { batch: 'B001', yield: live(98.2, 102) },
              { batch: 'B002', yield: live(94.5, 103) },
              { batch: 'B003', yield: live(99.1, 104) },
              { batch: 'B004', yield: live(88.4, 105) },
              { batch: 'B005', yield: live(97.8, 106) },
            ].map(b => ({ ...b, yield: Math.min(100, b.yield) }));
            return (
              <BarChart data={batches}>
                <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
                <XAxis dataKey="batch" stroke={chart.axis} fontSize={10} tickLine={false} axisLine={false} />
                <YAxis unit="%" domain={[80, 100]} stroke={chart.axis} fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip {...tip} />
                <Bar dataKey="yield" name={t('수율 (%)')} radius={[4, 4, 0, 0]}>
                  {batches.map(b => (
                    <Cell key={b.batch} fill={b.yield < 95 ? '#ef4444' : '#10b981'} />
                  ))}
                </Bar>
                <ReferenceLine y={95} stroke="#f59e0b" strokeDasharray="4 4" strokeWidth={2} label={{ value: t('목표 수율 95%'), position: 'insideTopRight', fontSize: 10, fill: '#f59e0b' }} />
              </BarChart>
            );
          }
          default:
            return (
              <BarChart data={[
                { name: t('찢김'), value: live(12, 107) },
                { name: t('기포'), value: live(8, 108) },
                { name: t('변색'), value: live(15, 109) },
                { name: t('라벨누락'), value: live(5, 110) },
                { name: t('기타'), value: live(3, 111) },
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
                <XAxis dataKey="name" stroke={chart.axis} fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke={chart.axis} fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: chart.tooltipBg, border: `1px solid ${chart.tooltipBorder}`, borderRadius: '8px' }}
                  itemStyle={{ color: chart.tooltipText, fontSize: '12px' }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {[0, 1, 2, 3, 4].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={chartColors[t('AI 품질 에이전트')][index]} />
                  ))}
                </Bar>
              </BarChart>
            );
        }
      case 'AI 설비예지보전 에이전트':
        switch (item.id) {
          case 6: { // 설비 상태 종합
            const health = [
              { name: t('수축포장기-01'), score: live(72, 112) },
              { name: t('케이스패커-02'), score: live(58, 113) },
              { name: t('컨베이어-04'), score: live(88, 114) },
              { name: t('로봇팔-02'), score: live(91, 115) },
              { name: t('모터-08'), score: live(46, 116) },
            ];
            return (
              <BarChart layout="vertical" data={health} margin={{ top: 16, right: 16, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} horizontal={false} />
                <XAxis type="number" domain={[0, 100]} stroke={chart.axis} fontSize={10} tickLine={false} axisLine={false} />
                <YAxis dataKey="name" type="category" width={92} stroke={chart.axis} fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip {...tip} />
                <ReferenceLine x={70} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: t('주의 70'), position: 'top', fontSize: 10, fill: '#f59e0b' }} />
                <ReferenceLine x={50} stroke="#ef4444" strokeDasharray="4 4" label={{ value: t('위험 50'), position: 'top', fontSize: 10, fill: '#ef4444' }} />
                <Bar dataKey="score" name={t('건강 점수 (100점 만점)')} radius={[0, 4, 4, 0]}>
                  {health.map(h => (
                    <Cell key={h.name} fill={h.score < 50 ? '#ef4444' : h.score < 70 ? '#f59e0b' : '#10b981'} />
                  ))}
                </Bar>
              </BarChart>
            );
          }
          case 7: // 진동/온도 추세
            return (
              <LineChart data={trend} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
                <XAxis dataKey="ago" stroke={chart.axis} fontSize={10} tickLine={false} axisLine={false} minTickGap={16} />
                <YAxis yAxisId="vib" domain={[2, 6]} ticks={[2, 3, 4, 5, 6]} stroke="#3b82f6" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis yAxisId="temp" orientation="right" domain={[160, 190]} ticks={[160, 170, 180, 190]} stroke="#10b981" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip {...tip} formatter={(v) => Number(v).toFixed(2)} />
                <Legend {...legendProps} />
                <ReferenceLine yAxisId="vib" y={4.6} stroke="#ef4444" strokeDasharray="4 4" label={{ value: t('진동 경고 4.6 mm/s'), position: 'insideTopLeft', fontSize: 10, fill: '#ef4444' }} />
                <Line yAxisId="vib" type="monotone" dataKey="vibration" stroke="#3b82f6" strokeWidth={2} dot={false} isAnimationActive={false} name={t('진동 (mm/s)')} />
                <Line yAxisId="temp" type="monotone" dataKey="temperature" stroke="#10b981" strokeWidth={2} dot={false} isAnimationActive={false} name={t('온도 (°C)')} />
              </LineChart>
            );
          case 8: // RUL 잔여수명 예측
            return (
              <AreaChart data={[
                { time: '0h', prob: live(100, 117) },
                { time: '12h', prob: live(98, 118) },
                { time: '24h', prob: live(92, 119) },
                { time: '36h', prob: live(85, 120) },
                { time: '48h', prob: live(70, 121) },
                { time: '60h', prob: live(45, 122) },
                { time: '72h', prob: live(15, 123) },
              ]}>
                <defs>
                  <linearGradient id="colorRul" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
                <XAxis dataKey="time" stroke={chart.axis} fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke={chart.axis} fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: chart.tooltipBg, border: `1px solid ${chart.tooltipBorder}`, borderRadius: '8px' }}
                  itemStyle={{ color: chart.tooltipText, fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="prob" stroke="#3b82f6" fillOpacity={1} fill="url(#colorRul)" name="Survival Probability (%)" />
              </AreaChart>
            );
          case 9: // 보전 작업 오더
            return (
              <BarChart data={[
                { name: t('대기'), value: live(12, 124) },
                { name: t('진행'), value: live(8, 125) },
                { name: t('완료'), value: live(45, 126) },
                { name: t('지연'), value: live(3, 127) },
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
                <XAxis dataKey="name" stroke={chart.axis} fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke={chart.axis} fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: chart.tooltipBg, border: `1px solid ${chart.tooltipBorder}`, borderRadius: '8px' }}
                  itemStyle={{ color: chart.tooltipText, fontSize: '12px' }}
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
                { month: t('1월'), mtbf: live(450, 128), mttr: live(2.5, 129) },
                { month: t('2월'), mtbf: live(480, 130), mttr: live(2.1, 131) },
                { month: t('3월'), mtbf: live(420, 132), mttr: live(3.2, 133) },
                { month: t('4월'), mtbf: live(510, 134), mttr: live(1.8, 135) },
                { month: t('5월'), mtbf: live(550, 136), mttr: live(1.5, 137) },
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
                <XAxis dataKey="month" stroke={chart.axis} fontSize={10} tickLine={false} axisLine={false} />
                <YAxis yAxisId="left" unit="h" stroke="#3b82f6" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis yAxisId="right" unit="h" orientation="right" stroke="#ef4444" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip {...tip} />
                <Legend {...legendProps} />
                <Bar yAxisId="left" dataKey="mtbf" fill="#3b82f6" name="MTBF (h)" radius={[4, 4, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="mttr" stroke="#ef4444" name="MTTR (h)" strokeWidth={2} />
              </ComposedChart>
            );
          default:
            return (
              <LineChart data={sensorData}>
                <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
                <XAxis dataKey="timestamp" stroke={chart.axis} fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke={chart.axis} fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: chart.tooltipBg, border: `1px solid ${chart.tooltipBorder}`, borderRadius: '8px' }}
                  itemStyle={{ color: chart.tooltipText, fontSize: '12px' }}
                />
                <Line type="monotone" dataKey="vibration" stroke="#3b82f6" strokeWidth={2} dot={false} name="Vibration (mm/s)" />
                <Line type="monotone" dataKey="temperature" stroke="#10b981" strokeWidth={2} dot={false} name="Temp (°C)" />
              </LineChart>
            );
        }
      case 'AI 에너지 에이전트':
        switch (item.id) {
          case 16: { // 전력 사용 현황
            // kW from the shrink wrapper's live current: P = √3 × 380 V × I × PF 0.9.
            const amps = sensorData[sensorData.length - 1]?.current_amp ?? 12.6;
            const wrapperKw = Number((1.732 * 0.38 * amps * 0.9).toFixed(1));
            return (
              <BarChart data={[
                { name: t('수축포장기-01'), run: wrapperKw, idle: live(0.6, 340) },
                { name: t('케이스패커-02'), run: live(5.2, 341), idle: live(1.9, 342) },
                { name: t('컨베이어-04'), run: live(3.1, 343), idle: live(0.2, 344) },
                { name: t('로봇팔-02'), run: live(2.4, 345), idle: live(0.3, 346) },
                { name: t('모터-08'), run: live(4.6, 347), idle: live(0.4, 348) },
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
                <XAxis dataKey="name" stroke={chart.axis} fontSize={10} tickLine={false} axisLine={false} />
                <YAxis unit=" kW" stroke={chart.axis} fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip {...tip} />
                <Legend {...legendProps} />
                <Bar dataKey="run" stackId="kw" fill="#f59e0b" name={t('가동 중 전력 (kW)')} />
                <Bar dataKey="idle" stackId="kw" fill="#ef4444" name={t('대기 전력 (kW)')} radius={[4, 4, 0, 0]} />
              </BarChart>
            );
          }
          case 17: // 에너지 비용 분석
            return (
              <BarChart data={[
                { time: '00-06', cost: live(1200, 138) },
                { time: '06-12', cost: live(3500, 139) },
                { time: '12-18', cost: live(4200, 140) },
                { time: '18-24', cost: live(2800, 141) },
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
                <XAxis dataKey="time" stroke={chart.axis} fontSize={10} tickLine={false} axisLine={false} />
                <YAxis tickFormatter={(v: number) => `₩${v.toLocaleString()}`} stroke={chart.axis} fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip {...tip} formatter={(v) => `₩${Number(v).toLocaleString()}`} />
                <Bar dataKey="cost" name={t('전기요금 (원)')} fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            );
          case 18: { // 피크 부하 관리
            const limit = 1000;
            const peak = [
              { time: '10:00', load: live(850, 142) },
              { time: '11:00', load: live(920, 144) },
              { time: '12:00', load: live(980, 146) },
              { time: '13:00', load: live(1050, 148) },
              { time: '14:00', load: live(940, 150) },
              { time: '15:00', load: live(880, 152) },
            ];
            return (
              <LineChart data={peak} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
                <XAxis dataKey="time" stroke={chart.axis} fontSize={10} tickLine={false} axisLine={false} />
                <YAxis unit=" kW" domain={[700, 1150]} stroke={chart.axis} fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip {...tip} />
                <Legend {...legendProps} />
                <ReferenceLine y={limit} stroke="#ef4444" strokeDasharray="5 5" label={{ value: t('계약 전력 1,000kW'), position: 'insideTopLeft', fontSize: 10, fill: '#ef4444' }} />
                <Line type="stepAfter" dataKey="load" stroke="#f59e0b" strokeWidth={2} name={t('부하 (kW)')}
                  dot={(props: { cx?: number; cy?: number; index?: number; payload?: { load: number } }) => (
                    <circle key={props.index} cx={props.cx} cy={props.cy} r={4} fill={(props.payload?.load ?? 0) > limit ? '#ef4444' : '#f59e0b'} />
                  )} />
              </LineChart>
            );
          }
          default:
            return (
              <AreaChart data={sensorData}>
                <defs>
                  <linearGradient id="colorEnergy" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
                <XAxis dataKey="timestamp" stroke={chart.axis} fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke={chart.axis} fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: chart.tooltipBg, border: `1px solid ${chart.tooltipBorder}`, borderRadius: '8px' }}
                  itemStyle={{ color: chart.tooltipText, fontSize: '12px' }}
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
                { time: '10:00', score: live(12, 154), threshold: live(80, 155) },
                { time: '10:05', score: live(15, 156), threshold: live(80, 157) },
                { time: '10:10', score: live(18, 158), threshold: live(80, 159) },
                { time: '10:15', score: live(85, 160), threshold: live(80, 161) },
                { time: '10:20', score: live(45, 162), threshold: live(80, 163) },
                { time: '10:25', score: live(20, 164), threshold: live(80, 165) },
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
                <XAxis dataKey="time" stroke={chart.axis} fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke={chart.axis} fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: chart.tooltipBg, border: `1px solid ${chart.tooltipBorder}`, borderRadius: '8px' }}
                  itemStyle={{ color: chart.tooltipText, fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="score" fill="#ef4444" fillOpacity={0.3} stroke="#ef4444" name="Fire Confidence (%)" />
                <Line type="monotone" dataKey="threshold" stroke="#94a3b8" strokeDasharray="5 5" name="Alert Threshold" />
              </ComposedChart>
            );
          case 20: // AMR 충돌 방지 시스템
            return (
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
                <XAxis type="number" dataKey="x" name="Distance X" unit="m" stroke={chart.axis} fontSize={10} domain={[-5, 5]} />
                <YAxis type="number" dataKey="y" name="Distance Y" unit="m" stroke={chart.axis} fontSize={10} domain={[-5, 5]} />
                <ZAxis type="number" dataKey="z" range={[50, 400]} name="Risk" />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                <Scatter name="Nearby Workers" data={[
                  { x: live(1.2, 166), y: live(0.8, 167), z: 100 },
                  { x: -2.5, y: live(3.1, 168), z: 20 },
                  { x: live(0.5, 169), y: -0.4, z: 200 },
                  { x: live(4, 170), y: -2.0, z: 10 },
                ]} fill="#3b82f6" />
              </ScatterChart>
            );
          case 32: // 긴급 정지 및 알람 제어
            return (
              <BarChart data={[
                { type: t('화재'), count: Math.round(live(1, 171)) },
                { type: t('충돌'), count: Math.round(live(4, 172)) },
                { type: t('수동'), count: Math.round(live(2, 173)) },
                { type: t('시스템'), count: 0 },
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
                <XAxis dataKey="type" stroke={chart.axis} fontSize={10} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} stroke={chart.axis} fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip {...tip} />
                <Bar dataKey="count" fill="#ef4444" radius={[4, 4, 0, 0]} name={t('비상 정지 (건)')} />
              </BarChart>
            );
          default:
            return (
              <PieChart>
                <Pie
                  data={[
                    { name: 'Critical', value: live(2, 174) },
                    { name: 'Warning', value: live(8, 175) },
                    { name: 'Info', value: live(45, 176) },
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
                  contentStyle={{ backgroundColor: chart.tooltipBg, border: `1px solid ${chart.tooltipBorder}`, borderRadius: '8px' }}
                  itemStyle={{ color: chart.tooltipText, fontSize: '12px' }}
                />
              </PieChart>
            );
        }
      case 'AI 생산 최적화 에이전트':
        switch (item.id) {
          case 11: // 라인별 가동 현황
            return (
              <BarChart data={[
                { line: t('Line 1'), running: live(85, 177), idle: live(10, 178), down: live(5, 179) },
                { line: t('Line 2'), running: live(92, 180), idle: live(5, 181), down: live(3, 182) },
                { line: t('Line 3'), running: live(78, 183), idle: live(15, 184), down: live(7, 185) },
                { line: t('Line 4'), running: live(88, 186), idle: live(8, 187), down: live(4, 188) },
              ].map(r => {
                const total = r.running + r.idle + r.down;
                const pct = (v: number) => Number(((v / total) * 100).toFixed(1));
                return { ...r, running: pct(r.running), idle: pct(r.idle), down: pct(r.down) };
              })}>
                <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
                <XAxis dataKey="line" stroke={chart.axis} fontSize={10} tickLine={false} axisLine={false} />
                <YAxis unit="%" domain={[0, 100]} stroke={chart.axis} fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip {...tip} />
                <Legend {...legendProps} />
                <Bar dataKey="running" stackId="a" fill="#10b981" name={t('가동 (%)')} />
                <Bar dataKey="idle" stackId="a" fill="#f59e0b" name={t('대기 (%)')} />
                <Bar dataKey="down" stackId="a" fill="#ef4444" name={t('정지 (%)')} />
              </BarChart>
            );
          case 12: { // OEE 대시보드
            const availability = Math.min(100, live(92, 189));
            const performance = Math.min(100, live(88, 190));
            const quality = Math.min(100, live(99, 191));
            const oee = Number(((availability * performance * quality) / 10000).toFixed(1));
            const parts = [
              { name: t('가용률'), value: availability, fill: '#3b82f6' },
              { name: t('성능'), value: performance, fill: '#8b5cf6' },
              { name: t('양품률'), value: quality, fill: '#10b981' },
              { name: 'OEE', value: oee, fill: oee < 85 ? '#ef4444' : '#f59e0b' },
            ];
            return (
              <BarChart data={parts}>
                <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
                <XAxis dataKey="name" stroke={chart.axis} fontSize={10} tickLine={false} axisLine={false} />
                <YAxis unit="%" domain={[0, 100]} stroke={chart.axis} fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip {...tip} />
                <Bar dataKey="value" name={t('비율 (%)')} radius={[4, 4, 0, 0]}>
                  {parts.map(p => <Cell key={p.name} fill={p.fill} />)}
                </Bar>
                <ReferenceLine y={85} stroke="#ef4444" strokeDasharray="4 4" strokeWidth={2} label={{ value: t('OEE 목표 85%'), position: 'insideTopRight', fontSize: 10, fill: '#ef4444' }} />
              </BarChart>
            );
          }
          case 13: { // 택트타임 분석
            const tact = [
              { process: t('공급'), time: live(12, 192), target: 10 },
              { process: t('도금'), time: live(45, 194), target: 40 },
              { process: t('검사'), time: live(15, 196), target: 15 },
              { process: t('배출'), time: live(8, 198), target: 10 },
              { process: t('적재'), time: live(22, 200), target: 20 },
            ];
            return (
              <BarChart data={tact}>
                <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
                <XAxis dataKey="process" stroke={chart.axis} fontSize={10} tickLine={false} axisLine={false} />
                <YAxis unit="s" stroke={chart.axis} fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip {...tip} />
                <Legend {...legendProps} />
                <Bar dataKey="time" fill="#3b82f6" name={t('실제 택트 (초)')} radius={[4, 4, 0, 0]}>
                  {tact.map(p => <Cell key={p.process} fill={p.time > p.target ? '#ef4444' : '#3b82f6'} />)}
                </Bar>
                <Bar dataKey="target" fill="#94a3b8" name={t('목표 택트 (초)')} radius={[4, 4, 0, 0]} />
              </BarChart>
            );
          }
          case 14: { // 배치별 생산 이력
            // One batch's route, as a timeline: when it entered each step and how long it stayed.
            let clock = 0;
            const route = [['원자재 입고', 20], ['공급', 12], ['도금', 45], ['검사', 15], ['포장', 22]].map(([stage, minutes], i) => {
              const dur = Math.round(live(minutes as number, 202 + i));
              const row = { stage: t(stage as string), start: clock, dur };
              clock += dur;
              return row;
            });
            return (
              <BarChart layout="vertical" data={route} margin={{ top: 10, right: 16, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} horizontal={false} />
                <XAxis type="number" unit={t('분')} stroke={chart.axis} fontSize={10} tickLine={false} axisLine={false} />
                <YAxis dataKey="stage" type="category" width={72} stroke={chart.axis} fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip {...tip} />
                <Legend {...legendProps} />
                <Bar dataKey="start" stackId="route" fill="transparent" legendType="none" name={t('투입 시점 (분)')} />
                <Bar dataKey="dur" stackId="route" fill="#10b981" name={t('공정 소요 시간 (분)')} radius={[0, 4, 4, 0]} />
              </BarChart>
            );
          }
          case 15: // 생산 계획 대비 실적
            return (
              <BarChart data={[
                { day: t('Mon'), plan: 1000, actual: Math.round(live(950, 208)) },
                { day: t('Tue'), plan: 1000, actual: Math.round(live(1020, 210)) },
                { day: t('Wed'), plan: 1200, actual: Math.round(live(1180, 212)) },
                { day: t('Thu'), plan: 1200, actual: Math.round(live(900, 214)) },
                { day: t('Fri'), plan: 1000, actual: Math.round(live(1050, 216)) },
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
                <XAxis dataKey="day" stroke={chart.axis} fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke={chart.axis} fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip {...tip} />
                <Legend {...legendProps} />
                <Bar dataKey="plan" fill="#94a3b8" name={t('계획 (개)')} radius={[4, 4, 0, 0]} />
                <Bar dataKey="actual" fill="#6366f1" name={t('실적 (개)')} radius={[4, 4, 0, 0]} />
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
                <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
                <XAxis dataKey="timestamp" stroke={chart.axis} fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke={chart.axis} fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: chart.tooltipBg, border: `1px solid ${chart.tooltipBorder}`, borderRadius: '8px' }}
                  itemStyle={{ color: chart.tooltipText, fontSize: '12px' }}
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
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest block mb-3">{t('Ontology Controls')}</label>
                <div className="space-y-2">
                  <button 
                    onClick={() => setActiveManagementSubDetail('ontology-entities')}
                    className="w-full py-2 px-3 rounded-lg bg-surface-hover border border-border text-[11px] text-left hover:border-accent/50 transition-colors flex items-center justify-between"
                  >
                    <span>{t('Manage Entity Types')}</span>
                    <ChevronRight size={14} className="text-text-secondary" />
                  </button>
                  <button 
                    onClick={() => setActiveManagementSubDetail('ontology-relations')}
                    className="w-full py-2 px-3 rounded-lg bg-surface-hover border border-border text-[11px] text-left hover:border-accent/50 transition-colors flex items-center justify-between"
                  >
                    <span>{t('Relation Mapping Editor')}</span>
                    <ChevronRight size={14} className="text-text-secondary" />
                  </button>
                  <button 
                    onClick={() => setActiveManagementSubDetail('ontology-schema')}
                    className="w-full py-2 px-3 rounded-lg bg-surface-hover border border-border text-[11px] text-left hover:border-accent/50 transition-colors flex items-center justify-between"
                  >
                    <span>{t('Schema Validation Rules')}</span>
                    <ChevronRight size={14} className="text-text-secondary" />
                  </button>
                </div>
              </div>
              <div className="pt-6 border-t border-border">
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest block mb-3">{t('Graph Sync Status')}</label>
                <div className="p-3 rounded-xl bg-purple-500/5 border border-purple-500/10 flex items-center justify-between">
                  <span className="text-[11px]">{t('Last Sync: 2m ago')}</span>
                  <span className="text-[10px] font-bold text-purple-500">SYNCED</span>
                </div>
              </div>
            </div>
          );
        case 27: // 모델 레지스트리
          return (
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest block mb-3">{t('Model Lifecycle')}</label>
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-surface-hover border border-border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold">{t('Production Model')}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">v{modelVersion.major}.{modelVersion.minor}.{modelVersion.patch}</span>
                    </div>
                    <div className="text-[10px] text-text-secondary">{t('배포일: {date}', { date: modelVersion.deployed })}</div>
                  </div>
                  <button
                    disabled={deploying}
                    onClick={() => {
                      setDeploying(true);
                      const next = { ...modelVersion, minor: modelVersion.minor, patch: modelVersion.patch + 1 };
                      const version = `v${next.major}.${next.minor}.${next.patch}`;
                      setLogs(prev => [{ time: new Date().toLocaleTimeString(), msg: t('{version} 카나리 배포 시작 (트래픽 10%)', { version }), type: 'info' as const }, ...prev].slice(0, 10));
                      setTimeout(() => {
                        const d = new Date();
                        setModelVersion({ ...next, deployed: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` });
                        setLogs(prev => [{ time: new Date().toLocaleTimeString(), msg: t('{version} 배포 완료: 정확도 +0.4%p, 지연 -12ms', { version }), type: 'success' as const }, ...prev].slice(0, 10));
                        showToast(t('{version} 배포를 완료했습니다', { version }));
                        setDeploying(false);
                      }, 1800);
                    }}
                    className="w-full py-2.5 rounded-xl bg-accent text-bg text-[11px] font-bold hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {deploying && <Loader2 size={12} className="animate-spin" />}
                    {deploying ? t('배포 중…') : t('Deploy New Version')}
                  </button>
                </div>
              </div>
              <div className="pt-6 border-t border-border">
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest block mb-3">{t('Registry Settings')}</label>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-text-secondary">{t('Auto-rollback')}</span>
                    <MiniSwitch on={prefs.autoRollback} label={t('Auto-rollback')} onChange={() => togglePref('autoRollback', 'Auto-rollback')} />
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-text-secondary">{t('A/B Testing')}</span>
                    <MiniSwitch on={prefs.abTesting} label={t('A/B Testing')} onChange={() => togglePref('abTesting', 'A/B Testing')} />
                  </div>
                </div>
              </div>
            </div>
          );
        case 28: // 사용자/권한 관리
          return (
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest block mb-3">{t('Access Management')}</label>
                <div className="space-y-2">
                  <button 
                    onClick={() => setActiveManagementSubDetail('user-directory')}
                    className="w-full py-2 px-3 rounded-lg bg-surface-hover border border-border text-[11px] text-left hover:border-accent/50 transition-colors flex items-center justify-between"
                  >
                    <span>{t('User Directory')}</span>
                    <Users size={14} className="text-text-secondary" />
                  </button>
                  <button 
                    onClick={() => setActiveManagementSubDetail('role-definitions')}
                    className="w-full py-2 px-3 rounded-lg bg-surface-hover border border-border text-[11px] text-left hover:border-accent/50 transition-colors flex items-center justify-between"
                  >
                    <span>{t('Role Definitions')}</span>
                    <Shield size={14} className="text-text-secondary" />
                  </button>
                  <button 
                    onClick={() => setActiveManagementSubDetail('audit-log')}
                    className="w-full py-2 px-3 rounded-lg bg-surface-hover border border-border text-[11px] text-left hover:border-accent/50 transition-colors flex items-center justify-between"
                  >
                    <span>{t('Audit Log Viewer')}</span>
                    <History size={14} className="text-text-secondary" />
                  </button>
                </div>
              </div>
              <div className="pt-6 border-t border-border">
                <div className="p-4 rounded-xl bg-orange-500/5 border border-orange-500/10">
                  <p className="text-[10px] text-orange-500 leading-relaxed font-bold">
                    {t('Security Alert: 2 failed login attempts detected in the last hour.')}
                  </p>
                </div>
              </div>
            </div>
          );
        case 29: // 시스템 모니터링
          return (
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest block mb-3">{t('Monitoring Config')}</label>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-[10px] mb-2">
                      <span className="text-text-secondary">{t('Sampling Interval')}</span>
                      <span className="text-accent">{samplingMs}ms</span>
                    </div>
                    <input type="range" min={100} max={1000} step={100} value={samplingMs} onChange={e => setSamplingMs(Number(e.target.value))} aria-label={t('Sampling Interval')} className="w-full accent-[var(--color-accent)]" />
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] mb-2">
                      <span className="text-text-secondary">{t('Log Retention')}</span>
                      <span className="text-accent">{t('{n}일', { n: retentionDays })}</span>
                    </div>
                    <input type="range" min={7} max={90} step={1} value={retentionDays} onChange={e => setRetentionDays(Number(e.target.value))} aria-label={t('Log Retention')} className="w-full accent-[var(--color-accent)]" />
                  </div>
                </div>
              </div>
              <div className="pt-6 border-t border-border">
                <button 
                  onClick={() => setActiveManagementSubDetail('health-report')}
                  className="w-full py-2.5 rounded-xl border border-border text-[11px] font-bold hover:bg-surface-hover transition-colors"
                >
                  {t('System Health Report')}
                </button>
              </div>
            </div>
          );
        case 30: // 알림 설정
          return (
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest block mb-3">{t('Notification Channels')}</label>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    ['email', 'Email', Mail],
                    ['sms', 'SMS', MessageSquare],
                    ['push', 'Push', Bell],
                    ['slack', 'Slack', Slack],
                  ] as const).map(([key, label, Icon]) => (
                    <button
                      key={key}
                      aria-pressed={prefs[key]}
                      onClick={() => togglePref(key, label)}
                      className={cn(
                        "p-3 rounded-xl bg-surface-hover border flex flex-col items-center gap-2 transition-all",
                        prefs[key] ? "border-accent/30" : "border-border opacity-50 hover:opacity-80",
                      )}
                    >
                      <Icon size={16} className={prefs[key] ? "text-accent" : undefined} />
                      <span className="text-[10px] font-bold">{t(label)}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="pt-6 border-t border-border">
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest block mb-3">{t('Alert Severity')}</label>
                <div className="flex gap-1">
                  {['Low', 'Med', 'High', 'Crit'].map(s => (
                    <button key={s} onClick={() => setSeverity(s)} aria-pressed={severity === s} className={cn(
                      "flex-1 py-1 rounded text-[9px] font-bold text-center border transition-colors",
                      s === severity ? "bg-red-500/20 border-red-500/50 text-red-500" : "bg-surface-hover border-border text-text-secondary hover:border-red-500/30"
                    )}>
                      {s}
                    </button>
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
            <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest block mb-3">{t('Supervisor Controls')}</label>
            <div className="space-y-2">
              <button 
                onClick={() => setShowAdvanced(true)}
                className="w-full py-3 px-4 rounded-xl bg-surface-hover border border-border text-text-primary text-xs font-bold hover:border-accent/50 transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <ShieldCheck size={16} />
                  <span>{t('안전 가드레일 설정')}</span>
                </div>
                <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
          <div className="pt-6 border-t border-border">
            <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest block mb-3">{t('System Health')}</label>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10 flex flex-col gap-1">
                <span className="text-[10px] text-text-secondary">{t('Uptime')}</span>
                <span className="text-xs font-bold text-emerald-500">99.98%</span>
              </div>
              <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/10 flex flex-col gap-1">
                <span className="text-[10px] text-text-secondary">{t('Avg Latency')}</span>
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
            <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest block mb-3">{t('Monitoring Zones')}</label>
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
            <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest block mb-3">{t('AI Model Confidence')}</label>
            <div className="p-4 rounded-xl bg-accent/5 border border-accent/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold">{t('Fire Detection Model')}</span>
                <span className="text-[10px] text-accent">v4.2.1</span>
              </div>
              <div className="text-[10px] text-text-secondary leading-relaxed">
                {t('Optimized for industrial environments with high-temperature equipment.')}
              </div>
            </div>
          </div>
          <div className="pt-6 border-t border-border">
            <button 
              onClick={() => setShowAdvanced(true)}
              className="w-full py-3 rounded-xl border border-border text-xs font-bold hover:bg-surface-hover transition-colors flex items-center justify-center gap-2"
            >
              <Sliders size={14} />
              {t('AI 설정 바꿔 보기 (전/후 비교)')}
            </button>
          </div>
        </div>
      );
    }

    if (item.id === 20) { // AMR 충돌 방지 시스템
      return (
        <div className="space-y-6">
          <div>
            <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest block mb-3">{t('ACS Integration')}</label>
            <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold">{t('ACS API Status')}</span>
                <span className="text-[10px] font-bold text-blue-500">ACTIVE</span>
              </div>
              <p className="text-[10px] text-text-secondary leading-relaxed">
                {t('Connected to Central AMR Control System. Real-time path synchronization enabled.')}
              </p>
            </div>
          </div>
          <div className="pt-6 border-t border-border">
            <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest block mb-3">{t('Safety Guardrails')}</label>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-text-secondary">{t('Auto E-Stop')}</span>
                <span className="text-emerald-500 font-bold">{t('ENABLED')}</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-text-secondary">{t('Proximity Limit')}</span>
                <span className="text-accent font-bold">1.5m</span>
              </div>
            </div>
          </div>
          <div className="pt-6 border-t border-border">
            <button 
              onClick={() => setShowAdvanced(true)}
              className="w-full py-3 rounded-xl border border-border text-xs font-bold hover:bg-surface-hover transition-colors flex items-center justify-center gap-2"
            >
              <Sliders size={14} />
              {t('AI 설정 바꿔 보기 (전/후 비교)')}
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div>
          <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest block mb-3">{t('Access Control')}</label>
          <div className="flex flex-wrap gap-2">
            {item.roles.map(role => (
              <span key={role} className="px-2 py-1 rounded-md bg-surface-hover text-[10px] font-bold border border-border text-text-primary">
                {t(role)}
              </span>
            ))}
          </div>
        </div>
        
        <div className="pt-6 border-t border-border">
          <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest block mb-3">{t('Agent Orchestration')}</label>
          <div className="p-4 rounded-xl bg-accent/5 border border-accent/10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold">{t('Orchestration Level')}</span>
              <span className="text-xs font-mono text-accent">{t('L2 Autonomous')}</span>
            </div>
            <div className="w-full h-1.5 bg-border rounded-full overflow-hidden">
              <div className="h-full bg-accent w-[65%]" />
            </div>
            <p className="mt-3 text-[10px] text-text-secondary leading-relaxed">
              {t('This module operates under Supervisor oversight with automated heuristic validation.')}
            </p>
          </div>
        </div>

        {moduleTuning.tuning && (
          <div className="pt-6 border-t border-border">
            <button 
              onClick={() => setShowAdvanced(true)}
              className="w-full py-3 rounded-xl bg-accent/10 border border-accent/40 text-accent text-xs font-bold hover:bg-accent/20 transition-colors flex items-center justify-center gap-2"
            >
              <Sliders size={14} />
              {t('AI 설정 바꿔 보기 (전/후 비교)')}
            </button>
          </div>
        )}
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
              <h2 className="text-3xl font-bold tracking-tight">{t(item.name)}</h2>
              <span className="px-2 py-0.5 rounded bg-accent/10 text-accent text-[10px] font-bold uppercase tracking-widest border border-accent/20">
                {item.agent || t('System')}
              </span>
            </div>
            <p className="text-text-primary max-w-2xl leading-relaxed">{t(menuSummary(item.id) ?? item.description)}</p>
            <p className="mt-0.5 text-[11px] text-text-secondary max-w-2xl">{t(item.description)}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1">{t('Status')}</div>
            <div className="flex items-center gap-2 text-emerald-500 font-bold text-sm">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              {t('Active & Synchronized')}
            </div>
          </div>
          {moduleTuning.tuning && (
            <button
              onClick={() => setShowAdvanced(true)}
              className="px-4 py-3 rounded-xl font-bold text-sm border border-accent/40 bg-accent/10 text-accent hover:bg-accent/20 transition-colors flex items-center gap-2"
            >
              <Sliders size={18} />
              {t('AI 설정 바꿔 보기')}
            </button>
          )}
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
            {isExecuting ? t('Executing...') : t('Run Module')}
          </button>
        </div>
      </div>

      <ScreenGuide menuId={item.id} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {item.id === 21 ? (
          <div className="lg:col-span-12">
            <ChatbotViewer />
          </div>
        ) : (
          <>
            {/* Main Content Area (8 cols) */}
            <div className="lg:col-span-8 space-y-6">
              {moduleTuning.tuning && moduleTuning.history[0] && (
                <AppliedTuningCard
                  tuning={moduleTuning.tuning}
                  entry={moduleTuning.history[0]}
                  onOpen={() => setShowAdvanced(true)}
                  onRevert={() => {
                    moduleTuning.revert();
                    setLogs(prev => [{ time: new Date().toLocaleTimeString(), msg: t('설정 변경을 되돌렸어요.'), type: 'warn' as const }, ...prev].slice(0, 10));
                    showToast(t('설정 변경을 되돌렸어요.'), 'info');
                  }}
                />
              )}

              {/* Technical details, for engineers */}
              <div>
                <button
                  onClick={() => setShowTech(v => !v)}
                  aria-expanded={showTech}
                  className="flex items-center gap-1.5 text-[11px] font-bold text-text-secondary hover:text-accent"
                >
                  <Cpu size={12} />{showTech ? t('기술 상세 접기') : t('기술 상세 보기 (엔지니어용)')}
                </button>
                {showTech && (
                  <div className="mt-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="dashboard-card group hover:border-accent/30 transition-colors">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                      <Clock size={18} />
                    </div>
                    <h4 className="text-xs font-bold uppercase tracking-widest text-text-secondary">{t('Usage Scenario')}</h4>
                  </div>
                  <p className="text-sm leading-relaxed text-text-primary">{t(item.details?.scenario ?? '')}</p>
                </div>
                <div className="dashboard-card group hover:border-accent/30 transition-colors">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500">
                      <Cpu size={18} />
                    </div>
                    <h4 className="text-xs font-bold uppercase tracking-widest text-text-secondary">{t('Internal Logic')}</h4>
                  </div>
                  <p className="text-sm leading-relaxed text-text-primary font-mono text-[11px] bg-bg/50 p-2 rounded border border-border/50">
                    {t(item.details?.logic ?? '')}
                  </p>
                </div>
                <div className="dashboard-card group hover:border-accent/30 transition-colors">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-orange-500/10 text-orange-500">
                      <ShieldAlert size={18} />
                    </div>
                    <h4 className="text-xs font-bold uppercase tracking-widest text-text-secondary">{t('Target / Guardrail')}</h4>
                  </div>
                  <p className="text-sm leading-relaxed text-text-primary">{t(item.details?.target ?? '')}</p>
                </div>
                <div className="dashboard-card group hover:border-accent/30 transition-colors">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                      <BarChart3 size={18} />
                    </div>
                    <h4 className="text-xs font-bold uppercase tracking-widest text-text-secondary">{t('Expected Output')}</h4>
                  </div>
                  <p className="text-sm leading-relaxed text-text-primary">{t(item.details?.output ?? '')}</p>
                </div>
              </div>
                  </div>
                )}
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
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-sm font-bold flex items-center gap-2">
                        <Activity size={16} className="text-accent" />
                        {t(MODULE_CHARTS[item.id]?.title ?? 'Module Execution Preview (Live)')}
                      </h3>
                      <p className="text-[11px] text-text-secondary mt-1">{t(MODULE_CHARTS[item.id]?.caption ?? 'Real-time telemetry from Kafka stream')}</p>
                    </div>
                    <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-500 uppercase shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />Live
                    </span>
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
                    {t('Execution Trace')}
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
                    <span>{t('Latency')}</span>
                    <span className="text-accent">14ms</span>
                  </div>
                </div>
              </div>

              {/* Access & Metadata */}
              <div className="dashboard-card">
                <h3 className="text-sm font-bold mb-6 flex items-center gap-2">
                  <Settings size={16} className="text-accent" />
                  {item.category === '시스템 관리' ? t('Management Console') : t('Module Configuration')}
                </h3>
                {renderSidebarConfig()}
              </div>
            </div>
          </>
        )}
      </div>
      
      {moduleTuning.tuning && (
        <TuningModal
          menuName={item.name}
          tuning={moduleTuning.tuning}
          current={moduleTuning.values}
          isOpen={showAdvanced}
          onClose={() => setShowAdvanced(false)}
          onApply={after => {
            const tuning = moduleTuning.tuning!;
            const entry = moduleTuning.apply(after);
            const moved = tuning.params
              .filter(p => entry.before[p.key] !== after[p.key])
              .map(p => `${t(p.label)} ${entry.before[p.key]} → ${after[p.key]}${p.unit ? ` ${t(p.unit)}` : ''}`)
              .join(', ');
            setLogs(prev => [{ time: new Date().toLocaleTimeString(), msg: t('설정 적용: {changes}', { changes: moved }), type: 'success' as const }, ...prev].slice(0, 10));
            showToast(t('설정을 적용했어요. 전/후 결과를 화면에 남겨 뒀어요.'));
            setShowAdvanced(false);
          }}
        />
      )}

      <ManagementSubModal
        type={activeManagementSubDetail}
        isOpen={activeManagementSubDetail !== null}
        onClose={() => setActiveManagementSubDetail(null)}
      />
    </div>
  );
}
