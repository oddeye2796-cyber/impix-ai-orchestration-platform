/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowRight, CheckCircle2, ChevronDown, ChevronUp, HelpCircle, RotateCcw, Sliders, Sparkles, Users, X,
} from 'lucide-react';
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { t, useI18n } from '../i18n';
import { chartPalette } from '../theme';
import { EXPO, IS_EXPO } from '../config/edition';
import { MENU_GUIDES } from '../config/menuGuides';
import { MODULE_TUNING, defaultTuning, type ModuleTuning, type TuningKpi, type TuningValues } from '../config/moduleTuning';
import { useMoney } from './RoleViews';
import { useToast } from './Toast';

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

/* ------------------------------------------------------- applied settings */

export interface AppliedTuning {
  time: string;
  before: TuningValues;
  after: TuningValues;
}

/** Settings applied this session, per menu, so leaving a screen and coming back keeps them. */
const appliedValues = new Map<number, TuningValues>();
const appliedHistory = new Map<number, AppliedTuning[]>();

/** The tunable settings of one screen: current values, what was applied, and how to apply or undo. */
export function useModuleTuning(menuId: number) {
  const tuning = MODULE_TUNING[menuId] as ModuleTuning | undefined;
  const [values, setValues] = useState<TuningValues>(() => appliedValues.get(menuId) ?? (tuning ? defaultTuning(tuning) : {}));
  const [history, setHistory] = useState<AppliedTuning[]>(() => appliedHistory.get(menuId) ?? []);

  const apply = (after: TuningValues) => {
    const entry: AppliedTuning = { time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }), before: values, after };
    const nextHistory = [entry, ...history].slice(0, 5);
    appliedValues.set(menuId, after);
    appliedHistory.set(menuId, nextHistory);
    setValues(after);
    setHistory(nextHistory);
    return entry;
  };

  const revert = () => {
    const last = history[0];
    if (!last) return;
    const rest = history.slice(1);
    appliedValues.set(menuId, last.before);
    appliedHistory.set(menuId, rest);
    setValues(last.before);
    setHistory(rest);
  };

  return { tuning, values, history, apply, revert };
}

/* -------------------------------------------------------------- formatting */

function useFormat() {
  const money = useMoney();
  const { locale } = useI18n();
  const smallMoney = (krw: number) => {
    if (IS_EXPO) return locale === 'en' ? `¥${Math.round(krw * EXPO.jpyPerKrw).toLocaleString('en-US')}` : `${Math.round(krw * EXPO.jpyPerKrw).toLocaleString('ja-JP')}${locale === 'ja' ? '円' : '엔'}`;
    return locale === 'ko' ? `${krw.toLocaleString('ko-KR')}원` : `₩${krw.toLocaleString('en-US')}`;
  };
  return (value: number, unit: string, digits = 0) => {
    if (unit === 'money') return Math.abs(value) >= 1_000_000 ? money(value) : smallMoney(value);
    const n = value.toLocaleString(locale === 'ko' ? 'ko-KR' : locale === 'ja' ? 'ja-JP' : 'en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
    return unit ? `${n} ${t(unit)}` : n;
  };
}

const stepDigits = (step: number) => (String(step).split('.')[1] ?? '').length;

type Verdict = 'better' | 'worse' | 'same' | 'neutral';
const verdictOf = (kpi: TuningKpi, before: number, after: number): Verdict => {
  if (Math.abs(after - before) < 1e-9) return 'same';
  if (kpi.better === 'none') return 'neutral';
  return (after > before) === (kpi.better === 'up') ? 'better' : 'worse';
};
const VERDICT_STYLE: Record<Verdict, string> = {
  better: 'bg-accent/15 text-accent',
  worse: 'bg-danger/15 text-danger',
  same: 'bg-surface-hover text-text-secondary',
  neutral: 'bg-blue-500/10 text-blue-500',
};
const VERDICT_LABEL: Record<Verdict, string> = { better: '좋아짐', worse: '나빠짐', same: '그대로', neutral: '참고' };

/* -------------------------------------------------------- before vs after */

/** Each result as current → changed, with a bar pair so the size of the change reads at a glance. */
function KpiComparison({ tuning, before, after }: { tuning: ModuleTuning; before: TuningValues; after: TuningValues }) {
  const format = useFormat();
  const a = tuning.simulate(before);
  const b = tuning.simulate(after);
  return (
    <div className="space-y-2" data-testid="kpi-comparison">
      {tuning.kpis.map(kpi => {
        const verdict = verdictOf(kpi, a[kpi.key], b[kpi.key]);
        const max = Math.max(Math.abs(a[kpi.key]), Math.abs(b[kpi.key]), 1e-9);
        return (
          <div key={kpi.key} className="rounded-xl border border-border bg-surface/40 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold">{t(kpi.label)}</span>
              <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold', VERDICT_STYLE[verdict])}>{t(VERDICT_LABEL[verdict])}</span>
            </div>
            <div className="mt-1.5 flex items-baseline gap-2 font-mono">
              <span className="text-sm text-text-secondary">{format(a[kpi.key], kpi.unit, kpi.digits)}</span>
              <ArrowRight size={12} className="shrink-0 text-text-secondary" />
              <span className={cn('text-lg font-black', verdict === 'better' ? 'text-accent' : verdict === 'worse' ? 'text-danger' : 'text-text-primary')}>
                {format(b[kpi.key], kpi.unit, kpi.digits)}
              </span>
            </div>
            <div className="mt-2 space-y-1">
              <div className="h-1.5 rounded-full bg-border/40"><div className="h-full rounded-full bg-text-secondary/50" style={{ width: `${(Math.abs(a[kpi.key]) / max) * 100}%` }} /></div>
              <div className="h-1.5 rounded-full bg-border/40"><div className={cn('h-full rounded-full', verdict === 'worse' ? 'bg-danger' : 'bg-accent')} style={{ width: `${(Math.abs(b[kpi.key]) / max) * 100}%` }} /></div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** The representative day replayed with the current and the changed settings. */
function TrendComparison({ tuning, before, after }: { tuning: ModuleTuning; before: TuningValues; after: TuningValues }) {
  if (!tuning.trend) return null;
  const chart = chartPalette();
  const a = tuning.trend(before);
  const b = tuning.trend(after);
  const data = a.series.map((v, i) => ({ i: i + 1, before: v, after: b.series[i] }));
  const sameSeries = a.series.every((v, i) => v === b.series[i]);
  return (
    <div className="rounded-xl border border-border bg-surface/40 p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-bold">{t(a.label)} <span className="font-normal text-text-secondary">({t(a.unit)})</span></span>
        <div className="flex items-center gap-3 text-[10px] font-bold text-text-secondary">
          <span className="flex items-center gap-1"><span className="h-0.5 w-4 border-t-2 border-dashed border-text-secondary" />{t('지금 설정')}</span>
          <span className="flex items-center gap-1"><span className="h-0.5 w-4 bg-accent" />{t('바꾼 설정')}</span>
        </div>
      </div>
      <div className="h-44">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
            <CartesianGrid stroke={chart.grid} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="i" tick={{ fontSize: 10, fill: chart.axis }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 10, fill: chart.axis }} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
            <Tooltip contentStyle={{ background: chart.tooltipBg, border: `1px solid ${chart.tooltipBorder}`, borderRadius: 8, fontSize: 11, color: chart.tooltipText }} labelFormatter={() => ''} />
            <Line type="monotone" dataKey="before" name={t('지금 설정')} stroke={chart.axis} strokeDasharray="4 4" strokeWidth={2} dot={false} isAnimationActive={false} />
            {!sameSeries && <Line type="monotone" dataKey="after" name={t('바꾼 설정')} stroke="#10b981" strokeWidth={2.5} dot={false} isAnimationActive={false} />}
            {a.line !== undefined && <ReferenceLine y={a.line} stroke={chart.axis} strokeDasharray="4 4" label={{ value: `${t(a.lineLabel ?? '')} (${t('지금')})`, fontSize: 10, fill: chart.axis, position: 'insideTopLeft' }} />}
            {b.line !== undefined && b.line !== a.line && <ReferenceLine y={b.line} stroke="#f59e0b" strokeWidth={2} label={{ value: `${t(b.lineLabel ?? '')} (${t('변경')})`, fontSize: 10, fill: '#f59e0b', position: 'insideBottomRight' }} />}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ modal */

/**
 * Change a screen's AI settings with the result in view: every setting says
 * what it trades off, and the right side shows the screen's own numbers before
 * and after the change, recomputed as the sliders move.
 */
export function TuningModal({
  menuName,
  tuning,
  current,
  isOpen,
  onClose,
  onApply,
}: {
  menuName: string;
  tuning: ModuleTuning;
  current: TuningValues;
  isOpen: boolean;
  onClose: () => void;
  onApply: (after: TuningValues) => void;
}) {
  const format = useFormat();
  const [draft, setDraft] = useState<TuningValues>(current);
  useEffect(() => { if (isOpen) setDraft(current); }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!isOpen) return null;

  const changed = tuning.params.some(p => draft[p.key] !== current[p.key]);
  const before = tuning.simulate(current);
  const after = tuning.simulate(draft);
  const verdicts = tuning.kpis.map(k => verdictOf(k, before[k.key], after[k.key]));
  const good = verdicts.filter(v => v === 'better').length;
  const bad = verdicts.filter(v => v === 'worse').length;
  const defaults = defaultTuning(tuning);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={t('AI 설정 바꿔 보기')}>
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-border bg-bg shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border bg-surface/30 p-5">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-accent/10 p-2 text-accent"><Sliders size={20} /></div>
            <div>
              <h3 className="text-lg font-bold tracking-tight">{t('AI 설정 바꿔 보기')} · {t(menuName)}</h3>
              <p className="mt-0.5 max-w-3xl text-xs leading-relaxed text-text-secondary">{t(tuning.intro)}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full p-2 transition-colors hover:bg-surface-hover" aria-label={t('닫기')}><X size={20} /></button>
        </div>

        <div className="grid flex-1 grid-cols-1 gap-5 overflow-y-auto p-5 lg:grid-cols-2 custom-scrollbar">
          <div className="space-y-4">
            <div className="text-[11px] font-bold text-text-secondary">{t('① 설정을 움직여 보세요')}</div>
            {tuning.params.map(p => {
              const digits = stepDigits(p.step);
              const moved = draft[p.key] !== current[p.key];
              return (
                <div key={p.key} className={cn('rounded-xl border p-3 transition-colors', moved ? 'border-accent/50 bg-accent/5' : 'border-border bg-surface/40')}>
                  <div className="flex items-baseline justify-between gap-2">
                    <label htmlFor={`tune-${p.key}`} className="text-xs font-bold">{t(p.label)}</label>
                    <span className="font-mono text-sm">
                      {moved && <span className="mr-1.5 text-text-secondary line-through">{format(current[p.key], p.unit, digits)}</span>}
                      <span className={cn('font-black', moved ? 'text-accent' : 'text-text-primary')}>{format(draft[p.key], p.unit, digits)}</span>
                    </span>
                  </div>
                  <input
                    id={`tune-${p.key}`}
                    type="range"
                    min={p.min}
                    max={p.max}
                    step={p.step}
                    value={draft[p.key]}
                    onChange={e => setDraft(d => ({ ...d, [p.key]: Number(e.target.value) }))}
                    className="mt-2 w-full accent-accent"
                  />
                  <div className="flex justify-between text-[10px] text-text-secondary">
                    <span>{format(p.min, p.unit, digits)}</span>
                    <span>{t('기본값')} {format(defaults[p.key], p.unit, digits)}</span>
                    <span>{format(p.max, p.unit, digits)}</span>
                  </div>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-text-secondary">{t(p.help)}</p>
                </div>
              );
            })}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-text-secondary">{t('② 결과가 이렇게 바뀌어요 (지금 → 바꾸면)')}</span>
            </div>
            <div className={cn('rounded-xl border p-3 text-xs leading-relaxed', !changed ? 'border-border bg-surface/40 text-text-secondary' : bad === 0 ? 'border-accent/40 bg-accent/10' : good === 0 ? 'border-danger/40 bg-danger/10' : 'border-warning/40 bg-warning/10')} data-testid="tuning-verdict">
              {!changed
                ? t('왼쪽 설정을 움직이면 아래 숫자와 그래프가 바로 다시 계산돼요.')
                : bad === 0
                  ? t('좋아지는 지표 {good}개, 나빠지는 지표는 없어요.', { good })
                  : good === 0
                    ? t('나빠지는 지표가 {bad}개예요. 적용 전에 다시 생각해 보세요.', { bad })
                    : t('좋아지는 지표 {good}개, 나빠지는 지표 {bad}개. 하나를 얻으면 다른 하나를 내주는 설정이에요.', { good, bad })}
            </div>
            <KpiComparison tuning={tuning} before={current} after={draft} />
            <TrendComparison tuning={tuning} before={current} after={draft} />
            <p className="text-[10px] leading-relaxed text-text-secondary">{t('대표적인 하루의 공장 데이터에 두 설정을 각각 적용해 계산한 값이에요. 실제 적용 후에는 실행 이력에 전/후 값이 남아요.')}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 border-t border-border bg-surface/30 p-4">
          <button
            onClick={() => setDraft(defaults)}
            className="flex items-center gap-1.5 rounded-xl border border-border px-4 py-2.5 text-xs font-bold transition-colors hover:bg-surface-hover"
          ><RotateCcw size={14} />{t('기본값으로')}</button>
          <div className="flex-1" />
          <button onClick={onClose} className="rounded-xl border border-border px-5 py-2.5 text-xs font-bold transition-colors hover:bg-surface-hover">{t('Cancel')}</button>
          <button
            onClick={() => onApply(draft)}
            disabled={!changed}
            className="flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-xs font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          ><CheckCircle2 size={14} />{t('이 설정 적용')}</button>
        </div>
      </motion.div>
    </div>
  );
}

/** The last applied change on a module page: what moved and what it did to the numbers. */
export function AppliedTuningCard({ tuning, entry, onRevert, onOpen }: { tuning: ModuleTuning; entry: AppliedTuning; onRevert: () => void; onOpen: () => void }) {
  const format = useFormat();
  const moved = tuning.params.filter(p => entry.before[p.key] !== entry.after[p.key]);
  return (
    <div className="dashboard-card border-accent/30" data-testid="applied-tuning">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-bold"><CheckCircle2 size={16} className="text-accent" />{t('{time}에 적용한 설정 변경', { time: entry.time })}</h3>
        <div className="flex gap-2">
          <button onClick={onOpen} className="rounded-lg border border-border px-3 py-1.5 text-[11px] font-bold hover:bg-surface-hover">{t('다시 조정')}</button>
          <button onClick={onRevert} className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-[11px] font-bold hover:bg-surface-hover"><RotateCcw size={12} />{t('되돌리기')}</button>
        </div>
      </div>
      <div className="mb-3 flex flex-wrap gap-2">
        {moved.map(p => (
          <span key={p.key} className="rounded-lg bg-surface-hover px-2.5 py-1 text-[11px]">
            <span className="font-bold">{t(p.label)}</span>{' '}
            <span className="font-mono text-text-secondary">{format(entry.before[p.key], p.unit, stepDigits(p.step))}</span>
            {' → '}
            <span className="font-mono font-bold text-accent">{format(entry.after[p.key], p.unit, stepDigits(p.step))}</span>
          </span>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {tuning.kpis.map(kpi => {
          const a = tuning.simulate(entry.before)[kpi.key];
          const b = tuning.simulate(entry.after)[kpi.key];
          const verdict = verdictOf(kpi, a, b);
          return (
            <div key={kpi.key} className="rounded-xl border border-border p-2.5">
              <div className="text-[10px] font-bold text-text-secondary">{t(kpi.label)}</div>
              <div className="mt-1 flex items-baseline gap-1.5 font-mono text-xs">
                <span className="text-text-secondary">{format(a, kpi.unit, kpi.digits)}</span>
                <ArrowRight size={10} className="shrink-0 text-text-secondary" />
                <span className={cn('font-black', verdict === 'better' ? 'text-accent' : verdict === 'worse' ? 'text-danger' : '')}>{format(b, kpi.unit, kpi.digits)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ screen guide */

/**
 * "What is this screen?" in plain words: who uses it, what the AI does here
 * and one thing to try. Folds away to one line; the choice is remembered per
 * browser.
 */
export function ScreenGuide({ menuId, defaultOpen = true }: { menuId: number; defaultOpen?: boolean }) {
  const guide = MENU_GUIDES[menuId];
  const storageKey = `impix.guide.${menuId}`;
  const [open, setOpen] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved === null ? defaultOpen : saved === '1';
    } catch {
      return defaultOpen;
    }
  });
  if (!guide) return null;
  const toggle = () => {
    setOpen(o => {
      try { localStorage.setItem(storageKey, o ? '0' : '1'); } catch { /* private mode */ }
      return !o;
    });
  };
  return (
    <div className="rounded-2xl border border-accent/25 bg-accent/5" data-testid="screen-guide">
      <button onClick={toggle} className="flex w-full items-center gap-2 px-4 py-2.5 text-left" aria-expanded={open}>
        <HelpCircle size={16} className="shrink-0 text-accent" />
        <span className="text-xs font-black">{t('이 화면은?')}</span>
        <span className="min-w-0 flex-1 truncate text-xs text-text-secondary">{t(guide.summary)}</span>
        {open ? <ChevronUp size={14} className="text-text-secondary" /> : <ChevronDown size={14} className="text-text-secondary" />}
      </button>
      {open && (
        <div className="grid grid-cols-1 gap-3 border-t border-accent/15 px-4 py-3 md:grid-cols-3">
          <div>
            <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold text-text-secondary"><Users size={12} />{t('누가 쓰나요')}</div>
            <p className="text-xs leading-relaxed">{t(guide.who)}</p>
          </div>
          <div>
            <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold text-text-secondary"><Sparkles size={12} />{t('AI가 하는 일')}</div>
            <p className="text-xs leading-relaxed">{t(guide.ai)}</p>
          </div>
          <div>
            <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold text-text-secondary"><Sliders size={12} />{t('이렇게 해 보세요')}</div>
            <p className="text-xs leading-relaxed">{t(guide.tryThis)}</p>
          </div>
        </div>
      )}
    </div>
  );
}

/** One-line plain description of a menu, for tooltips and the sidebar. */
export const menuSummary = (menuId: number) => MENU_GUIDES[menuId]?.summary;
