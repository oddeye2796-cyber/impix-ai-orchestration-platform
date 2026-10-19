/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * The settings a person can tune on each AI screen, and what each setting does
 * to the numbers that screen is about. Each module lists only the two or three
 * settings that matter for its own job (an alarm threshold on a defect-rate
 * screen, a setpoint on a temperature screen), with a plain explanation of what
 * moving it trades off.
 *
 * `simulate` is a what-if model over a fixed, representative day of plant data,
 * so the same settings always give the same result and a before/after
 * comparison is meaningful. It is not a forecast of the real plant.
 */

export type TuningValues = Record<string, number>;

export interface TuningParam {
  key: string;
  label: string;
  /** What moving it does, in a sentence. */
  help: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  value: number;
}

export interface TuningKpi {
  key: string;
  label: string;
  /** Display unit; `money` is KRW, shown in the interface currency. */
  unit: string;
  /** Which direction is an improvement; `none` for counts that are only informative. */
  better: 'up' | 'down' | 'none';
  digits?: number;
}

export interface TuningTrend {
  label: string;
  unit: string;
  series: number[];
  /** Threshold or target drawn across the chart, when the setting is one. */
  line?: number;
  lineLabel?: string;
}

export interface ModuleTuning {
  /** One sentence on what tuning this screen means. */
  intro: string;
  params: TuningParam[];
  kpis: TuningKpi[];
  simulate: (p: TuningValues) => Record<string, number>;
  trend?: (p: TuningValues) => TuningTrend;
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const round = (v: number, digits = 0) => Math.round(v * 10 ** digits) / 10 ** digits;
/** Repeatable noise in [-0.5, 0.5), so the representative day is the same on every visit. */
const jitter = (i: number, seed: number) => {
  const x = Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453;
  return x - Math.floor(x) - 0.5;
};
const day = (fn: (h: number) => number) => Array.from({ length: 24 }, (_, h) => fn(h));
const count = (xs: number[], pred: (x: number) => boolean) => xs.filter(pred).length;
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

/* ------------------------------------------------ representative day data */

/** Defect rate (%) through a day, with three bad spells. */
const DEFECT_DAY = day(h =>
  round(2.4 + 0.5 * Math.sin(h / 3) + jitter(h, 1) * 0.6 + (h === 9 ? 3.6 : h === 10 ? 1.8 : h === 15 ? 2.6 : h === 20 ? 1.5 : 0), 2));

/** Main motor vibration (mm/s), drifting up through the afternoon as a bearing wears. */
const VIBRATION_DAY = day(h => round(2.8 + 0.35 * Math.sin(h / 2) + jitter(h, 2) * 0.5 + Math.max(0, h - 13) * 0.25, 2));
const MOTOR_TEMP_DAY = day(h => round(72 + 5 * Math.sin(h / 5) + jitter(h, 3) * 4 + Math.max(0, h - 15) * 1.1, 1));

/** Plant power (kW-equivalent units of 1 000 kWh/h scale) with an afternoon spike. */
const POWER_DAY = day(h => round(980 + 220 * Math.sin(((h - 8) / 24) * 2 * Math.PI) + jitter(h, 4) * 60 + (h === 14 ? 180 : 0)));

/** Load on the main incoming feeder (kW) against a 500 kW contract. */
const FEEDER_DAY = day(h => round(340 + 110 * Math.sin(((h - 7) / 24) * 2 * Math.PI) + jitter(h, 5) * 20 + (h === 10 ? 60 : h === 14 ? 80 : h === 16 ? 45 : 0)));
const CONTRACT_KW = 500;

const OEE_DAY = day(h => round(85 + 4 * Math.sin(h / 3) + jitter(h, 6) * 5 - (h === 9 ? 11 : h === 15 ? 7 : h === 20 ? 4 : 0), 1));

/** Health score (0-100) of the worst machine, wearing down over the day. */
const WORST_HEALTH_DAY = day(h => round(88 - h * 1.4 + jitter(h, 7) * 3, 1));
const FLEET_HEALTH = [93, 91, 88, 86, 84, 82, 80, 79, 77, 76, 74, 72, 71, 69, 66, 63, 60, 57, 53, 49, 44, 40, 35, 29];

/** Pareto of defect types (% of defects), largest first. */
const DEFECT_TYPES = [32, 21, 14, 10, 8, 6, 4, 3, 2];
/** Cycle time per station (s) on the packing line. */
const STATION_CYCLE = [26, 28, 31, 27, 29, 33, 25, 28];

const movingAverage = (xs: number[], window: number) =>
  xs.map((_, i) => {
    const from = Math.max(0, i - window + 1);
    const slice = xs.slice(from, i + 1);
    return round(sum(slice) / slice.length, 1);
  });

/** Feeder load after the ESS and load shifting act on it. */
function controlledFeeder(peakTarget: number, essStartPct: number) {
  const trigger = (CONTRACT_KW * essStartPct) / 100;
  let ess = 160; // kWh in the battery at the start of the day
  let deferred = 0;
  const series = FEEDER_DAY.map(load => {
    let v = load;
    if (v > trigger && v > peakTarget && ess > 0) {
      const discharge = Math.min(120, ess, v - peakTarget);
      v -= discharge;
      ess -= discharge;
    }
    if (v > peakTarget) {
      const shift = Math.min(25, v - peakTarget);
      v -= shift;
      deferred += shift;
    }
    return round(v);
  });
  return { series, deferred };
}

/* ----------------------------------------------------------- the modules */

export const MODULE_TUNING: Record<number, ModuleTuning> = {
  // 실시간 불량률 현황
  1: {
    intro: '불량률이 어디까지 오르면 경보를 울릴지 정해요. 경보가 너무 잦으면 무시하게 되고, 너무 늦으면 불량품이 쌓여요.',
    params: [
      { key: 'alarmRate', label: '경보 기준 불량률', help: '낮추면 문제를 더 빨리 잡지만 경보가 늘어요.', unit: '%', min: 2, max: 8, step: 0.5, value: 5 },
      { key: 'holdMin', label: '경보 전 확인 시간', help: '기준을 넘은 상태가 이만큼 이어져야 경보를 울려요. 길수록 헛경보는 줄지만 대응이 늦어요.', unit: '분', min: 0, max: 30, step: 5, value: 10 },
    ],
    kpis: [
      { key: 'alarms', label: '하루 경보', unit: '건', better: 'none' },
      { key: 'missed', label: '놓친 불량 로트', unit: '건/주', better: 'down' },
      { key: 'response', label: '첫 대응까지', unit: '분', better: 'down' },
    ],
    simulate: p => {
      const over = count(DEFECT_DAY, x => x > p.alarmRate);
      const serious = count(DEFECT_DAY, x => x > 4 && x <= p.alarmRate);
      return {
        alarms: Math.max(0, Math.round(over * 3 * (1 - p.holdMin / 45))),
        missed: round(serious * 1.5 + p.holdMin / 10),
        response: p.holdMin + 3,
      };
    },
    trend: p => ({ label: '오늘 불량률 (시간별)', unit: '%', series: DEFECT_DAY, line: p.alarmRate, lineLabel: '경보 기준' }),
  },
  // 비전검사 결과 뷰어
  2: {
    intro: 'AI가 사진을 보고 얼마나 확신할 때 불량으로 판정할지 정해요. 애매한 제품은 사람에게 넘길 수 있어요.',
    params: [
      { key: 'scoreCut', label: '불량 판정 기준 (이상 점수)', help: '높이면 정상품을 불량으로 잡는 일은 줄지만, 진짜 불량을 놓칠 수 있어요.', unit: '', min: 0.5, max: 0.95, step: 0.05, value: 0.75 },
      { key: 'reviewBand', label: '사람 재검사 구간', help: '기준 근처(±이 값)의 애매한 제품은 사람이 다시 봐요. 넓을수록 정확하지만 일이 늘어요.', unit: '', min: 0, max: 0.15, step: 0.01, value: 0.05 },
      { key: 'speed', label: '검사 속도', help: '빠를수록 많이 검사하지만 사진이 흐려져 정확도가 조금 떨어져요.', unit: '개/분', min: 60, max: 180, step: 10, value: 120 },
    ],
    kpis: [
      { key: 'miss', label: '불량을 놓치는 비율', unit: '%', better: 'down', digits: 2 },
      { key: 'falseReject', label: '정상품을 불량으로 판정', unit: '%', better: 'down', digits: 2 },
      { key: 'review', label: '사람 재검사', unit: '개/시간', better: 'down' },
      { key: 'throughput', label: '시간당 검사량', unit: '개', better: 'up' },
    ],
    simulate: p => {
      const blur = Math.max(0, p.speed - 120) * 0.004;
      return {
        miss: round(Math.max(0.05, 0.2 + 3.2 * (p.scoreCut - 0.5) ** 1.5 + blur - p.reviewBand * 3), 2),
        falseReject: round(Math.max(0.1, 0.5 + 6 * (0.95 - p.scoreCut) ** 1.6 + blur / 2 - p.reviewBand * 5), 2),
        review: Math.round(p.speed * 60 * p.reviewBand * 0.1),
        throughput: p.speed * 60,
      };
    },
  },
  // 불량 유형 분석
  3: {
    intro: '불량 유형 중 어디까지를 집중 관리 대상으로 삼을지 정해요. 소수 유형이 대부분의 불량을 만든다는 점을 이용해요.',
    params: [
      { key: 'focusPct', label: '집중 관리 기준 (누적 비율)', help: '전체 불량의 이만큼을 차지하는 유형까지 집중 관리해요. 높을수록 많이 줄지만 관리할 유형도 늘어요.', unit: '%', min: 50, max: 95, step: 5, value: 80 },
      { key: 'days', label: '분석 기간', help: '길수록 결과가 믿을 만하지만, 최근 변화가 묻힐 수 있어요.', unit: '일', min: 7, max: 90, step: 1, value: 30 },
    ],
    kpis: [
      { key: 'types', label: '집중 관리할 유형', unit: '개', better: 'none' },
      { key: 'reducible', label: '줄일 수 있는 불량', unit: '%', better: 'up', digits: 1 },
      { key: 'confidence', label: '분석 신뢰도', unit: '%', better: 'up' },
    ],
    simulate: p => {
      let cum = 0;
      let types = 0;
      for (const share of DEFECT_TYPES) {
        if (cum >= p.focusPct) break;
        cum += share;
        types++;
      }
      return {
        types,
        reducible: round(cum * 0.6, 1),
        confidence: Math.round(60 + 35 * (1 - Math.exp(-p.days / 25))),
      };
    },
    trend: p => {
      let cum = 0;
      return { label: '불량 유형별 누적 비율 (많은 순)', unit: '%', series: DEFECT_TYPES.map(s => (cum += s)), line: p.focusPct, lineLabel: '집중 관리 기준' };
    },
  },
  // 온도-불량 상관분석
  4: {
    intro: '포장기 실링 온도와 라인 속도를 바꾸면 불량률과 생산량이 어떻게 변할지 미리 봐요.',
    params: [
      { key: 'temp', label: '실링 온도 설정', help: '너무 낮으면 접착 불량, 너무 높으면 필름 변형이 늘어요. AI가 찾은 최적점은 173°C예요.', unit: '°C', min: 165, max: 185, step: 1, value: 177 },
      { key: 'speed', label: '라인 속도', help: '빠를수록 많이 만들지만, 열이 충분히 전달되지 않아 불량이 늘 수 있어요.', unit: '%', min: 80, max: 110, step: 5, value: 100 },
    ],
    kpis: [
      { key: 'defect', label: '예상 불량률', unit: '%', better: 'down', digits: 2 },
      { key: 'good', label: '시간당 양품', unit: '개', better: 'up' },
      { key: 'energy', label: '히터 전력', unit: 'kWh/h', better: 'down', digits: 1 },
    ],
    simulate: p => {
      const defect = 2.1 + 0.09 * (p.temp - 173) ** 2 + 0.06 * Math.max(0, p.speed - 95);
      const output = (6000 * p.speed) / 100;
      return {
        defect: round(defect, 2),
        good: Math.round(output * (1 - defect / 100)),
        energy: round(42 + 0.9 * (p.temp - 165), 1),
      };
    },
    trend: p => ({
      label: '오늘 불량률을 이 설정으로 다시 돌렸다면',
      unit: '%',
      series: day(h => {
        const t = p.temp + 1.5 * Math.sin(h / 4) + jitter(h, 8);
        return round(2.1 + 0.09 * (t - 173) ** 2 + 0.06 * Math.max(0, p.speed - 95), 2);
      }),
      line: 2.5,
      lineLabel: '목표 불량률',
    }),
  },
  // 품질 이력 검색
  5: {
    intro: '검사 기록에서 어떤 배치를 이상으로 표시할지 정해요. 표시된 배치는 담당자가 다시 확인해요.',
    params: [
      { key: 'days', label: '조회 기간', help: '길수록 오래된 기록까지 보지만 확인할 양도 늘어요.', unit: '일', min: 1, max: 90, step: 1, value: 30 },
      { key: 'flagPct', label: '이상 배치 표시 기준 불량률', help: '배치 불량률이 이 값을 넘으면 이상으로 표시해요.', unit: '%', min: 1, max: 6, step: 0.5, value: 3 },
    ],
    kpis: [
      { key: 'batches', label: '조회되는 배치', unit: '건', better: 'none' },
      { key: 'flagged', label: '다시 확인할 배치', unit: '건', better: 'none' },
      { key: 'hours', label: '확인에 드는 시간', unit: '시간', better: 'down', digits: 1 },
    ],
    simulate: p => {
      const batches = p.days * 14;
      const flagged = Math.round(batches * Math.exp(-(p.flagPct - 1) * 0.9) * 0.25);
      return { batches, flagged, hours: round(flagged * 0.25, 1) };
    },
    trend: p => ({ label: '최근 배치 불량률', unit: '%', series: DEFECT_DAY.map(x => round(x * 0.8, 2)), line: p.flagPct, lineLabel: '이상 표시 기준' }),
  },
  // 설비 상태 종합
  6: {
    intro: '건강 점수가 몇 점 아래로 내려가면 주의·위험으로 표시할지 정해요.',
    params: [
      { key: 'caution', label: '주의 기준 점수', help: '높이면 나빠지기 시작한 설비를 더 일찍 표시해요.', unit: '점', min: 50, max: 90, step: 5, value: 75 },
      { key: 'danger', label: '위험 기준 점수', help: '이 점수 아래는 바로 정비가 필요한 위험 설비로 표시해요.', unit: '점', min: 20, max: 60, step: 5, value: 45 },
    ],
    kpis: [
      { key: 'cautionCount', label: '주의 설비', unit: '대', better: 'none' },
      { key: 'dangerCount', label: '위험 설비', unit: '대', better: 'none' },
      { key: 'lead', label: '고장 전에 미리 아는 시간', unit: '시간', better: 'up' },
    ],
    simulate: p => ({
      cautionCount: count(FLEET_HEALTH, s => s < p.caution && s >= p.danger),
      dangerCount: count(FLEET_HEALTH, s => s < p.danger),
      lead: Math.round(Math.max(0, p.caution - 30) / 1.4),
    }),
    trend: p => ({ label: '가장 나쁜 설비의 건강 점수 (오늘)', unit: '점', series: WORST_HEALTH_DAY, line: p.caution, lineLabel: '주의 기준' }),
  },
  // 진동/온도 추세
  7: {
    intro: '진동과 온도가 어디까지 오르면 경고할지 정해요. 고장을 얼마나 미리 알 수 있는지가 달라져요.',
    params: [
      { key: 'vibLimit', label: '진동 경고 기준', help: '낮출수록 고장을 일찍 알지만 헛경고가 늘어요.', unit: 'mm/s', min: 2.5, max: 6, step: 0.1, value: 4.5 },
      { key: 'tempLimit', label: '모터 온도 경고 기준', help: '낮출수록 과열을 일찍 알지만 여름철 헛경고가 늘어요.', unit: '°C', min: 70, max: 100, step: 1, value: 85 },
    ],
    kpis: [
      { key: 'warnings', label: '하루 경고', unit: '건', better: 'none' },
      { key: 'lead', label: '고장 전에 미리 아는 시간', unit: '시간', better: 'up' },
      { key: 'falseWarn', label: '헛경고', unit: '건/주', better: 'down' },
    ],
    simulate: p => ({
      warnings: count(VIBRATION_DAY, x => x > p.vibLimit) * 2 + count(MOTOR_TEMP_DAY, x => x > p.tempLimit) * 2,
      lead: Math.round(Math.max(0, (6.5 - p.vibLimit) / 0.09)),
      falseWarn: Math.round(Math.max(0, 4 - p.vibLimit) * 6 + Math.max(0, 80 - p.tempLimit) * 0.5),
    }),
    trend: p => ({ label: '메인 모터 진동 (오늘)', unit: 'mm/s', series: VIBRATION_DAY, line: p.vibLimit, lineLabel: '경고 기준' }),
  },
  // 보전 이력 조회
  10: {
    intro: '정비 기록을 어떤 기준으로 묶어 볼지 정해요. 같은 고장이 반복되는 설비를 찾는 데 써요.',
    params: [
      { key: 'months', label: '계산 기간', help: '길수록 통계가 안정적이지만 최근 개선 효과가 덜 보여요.', unit: '개월', min: 3, max: 24, step: 1, value: 12 },
      { key: 'repeatN', label: '반복 고장 기준', help: '같은 고장이 이 횟수 이상이면 반복 고장 설비로 표시해요.', unit: '회', min: 2, max: 5, step: 1, value: 3 },
    ],
    kpis: [
      { key: 'repeat', label: '반복 고장 설비', unit: '대', better: 'none' },
      { key: 'mtbf', label: '평균 고장 간격 (MTBF)', unit: '시간', better: 'none' },
      { key: 'mttr', label: '평균 수리 시간 (MTTR)', unit: '시간', better: 'none', digits: 1 },
    ],
    simulate: p => ({
      repeat: Math.round((18 / p.repeatN ** 1.3) * Math.sqrt(p.months / 12)),
      mtbf: Math.round(410 + p.months * 6),
      mttr: round(3.2 - p.months * 0.02, 1),
    }),
  },
  // 라인별 가동 현황
  11: {
    intro: '라인이 몇 분 이상 멈춰야 비가동으로 기록할지, 대기를 언제 알릴지 정해요.',
    params: [
      { key: 'stopMin', label: '비가동 판정 시간', help: '짧게 잡으면 잦은 짧은 정지까지 잡아내지만 기록이 많아져요.', unit: '분', min: 1, max: 15, step: 1, value: 5 },
      { key: 'idleMin', label: '대기 알림 기준', help: '자재·작업자를 기다리며 서 있는 시간이 이만큼 넘으면 알려요.', unit: '분', min: 5, max: 30, step: 5, value: 10 },
    ],
    kpis: [
      { key: 'recorded', label: '기록되는 정지', unit: '건/일', better: 'none' },
      { key: 'missed', label: '놓치는 짧은 정지', unit: '건/일', better: 'down' },
      { key: 'alerts', label: '대기 알림', unit: '건/일', better: 'none' },
    ],
    simulate: p => {
      const recorded = Math.round(6 + 40 / p.stopMin);
      return { recorded, missed: 46 - recorded, alerts: Math.round((30 / p.idleMin) * 2 + 2) };
    },
  },
  // OEE 대시보드
  12: {
    intro: 'OEE 목표와 집계 단위를 정해요. 목표가 높을수록 개선할 곳이 더 많이 보여요.',
    params: [
      { key: 'target', label: 'OEE 목표', help: '이 값 아래인 시간대를 개선 대상으로 표시해요.', unit: '%', min: 70, max: 95, step: 1, value: 85 },
      { key: 'windowMin', label: '집계 단위', help: '길게 묶을수록 그래프가 매끄러워지지만 짧은 문제는 묻혀요.', unit: '분', min: 60, max: 240, step: 60, value: 60 },
    ],
    kpis: [
      { key: 'met', label: '목표를 달성한 시간', unit: '%', better: 'up' },
      { key: 'gap', label: '목표까지 부족분', unit: '%p', better: 'down', digits: 1 },
      { key: 'alerts', label: '개선 알림', unit: '건/일', better: 'none' },
    ],
    simulate: p => {
      const series = movingAverage(OEE_DAY, p.windowMin / 60);
      const below = count(series, x => x < p.target);
      return {
        met: Math.round(((24 - below) / 24) * 100),
        gap: round(Math.max(0, p.target - sum(series) / 24), 1),
        alerts: Math.round(below / (p.windowMin / 60)),
      };
    },
    trend: p => ({ label: '오늘 OEE (시간별)', unit: '%', series: movingAverage(OEE_DAY, p.windowMin / 60), line: p.target, lineLabel: 'OEE 목표' }),
  },
  // 택트타임 분석
  13: {
    intro: '목표 택트타임(제품 하나를 만드는 데 허용하는 시간)과 병목 판정 기준을 정해요. AI가 이 목표에 맞춰 작업을 다시 나눠요.',
    params: [
      { key: 'takt', label: '목표 택트타임', help: '짧을수록 많이 만들지만, 가장 느린 공정보다 짧게는 못 맞춰요.', unit: '초', min: 24, max: 36, step: 1, value: 30 },
      { key: 'devPct', label: '병목 판정 편차', help: '평균보다 이만큼 느린 공정을 병목으로 표시해요.', unit: '%', min: 5, max: 30, step: 5, value: 15 },
    ],
    kpis: [
      { key: 'output', label: '시간당 생산량', unit: '개', better: 'up' },
      { key: 'waiting', label: '작업자 대기 시간', unit: '%', better: 'down', digits: 1 },
      { key: 'bottlenecks', label: '병목으로 표시된 공정', unit: '개', better: 'none' },
    ],
    simulate: p => {
      const cycle = Math.max(p.takt, 29);
      const avg = sum(STATION_CYCLE) / STATION_CYCLE.length;
      return {
        output: Math.round(3600 / cycle),
        waiting: round(clamp(((cycle - 27.5) / cycle) * 100, 2, 40), 1),
        bottlenecks: count(STATION_CYCLE, s => s > avg * (1 + p.devPct / 100)),
      };
    },
    trend: p => ({ label: '공정별 작업 시간', unit: '초', series: STATION_CYCLE, line: p.takt, lineLabel: '목표 택트타임' }),
  },
  // 배치별 생산 이력
  14: {
    intro: '문제가 생긴 배치에서 몇 단계 앞까지 거슬러 올라가 추적할지 정해요.',
    params: [
      { key: 'depth', label: '역추적 단계', help: '많을수록 원자재 공급사까지 찾아가지만 확인할 배치가 늘어요.', unit: '단계', min: 1, max: 5, step: 1, value: 3 },
      { key: 'days', label: '조회 기간', help: '같은 원자재를 쓴 배치를 며칠 전까지 찾을지 정해요.', unit: '일', min: 1, max: 30, step: 1, value: 7 },
    ],
    kpis: [
      { key: 'lots', label: '연결되는 원자재 로트', unit: '건', better: 'none' },
      { key: 'affected', label: '리콜 시 확인할 배치', unit: '건', better: 'none' },
      { key: 'seconds', label: '추적에 걸리는 시간', unit: '초', better: 'down', digits: 1 },
    ],
    simulate: p => ({
      lots: Math.round(p.depth ** 1.6 * 4 * (p.days / 7) ** 0.4),
      affected: Math.round(p.depth * p.days * 1.6),
      seconds: round(0.8 * p.depth ** 1.8, 1),
    }),
  },
  // 생산 계획 대비 실적
  15: {
    intro: '계획보다 얼마나 뒤처지면 경고하고, AI가 일정을 어디까지 스스로 다시 짤지 정해요.',
    params: [
      { key: 'warnPct', label: '계획 미달 경고 기준', help: '실적이 계획의 이 비율 아래로 떨어질 것 같으면 경고해요.', unit: '%', min: 80, max: 100, step: 1, value: 95 },
      { key: 'replanPct', label: '자동 재계획 허용 범위', help: 'AI가 사람 승인 없이 옮길 수 있는 생산량 비율이에요.', unit: '%', min: 0, max: 20, step: 1, value: 10 },
    ],
    kpis: [
      { key: 'achieve', label: '예상 계획 달성률', unit: '%', better: 'up', digits: 1 },
      { key: 'overtime', label: '잔업', unit: '시간/주', better: 'down', digits: 1 },
      { key: 'alerts', label: '재계획 알림', unit: '건/주', better: 'none' },
    ],
    simulate: p => ({
      achieve: round(Math.min(99.5, 91 + p.replanPct * 0.45 - Math.max(0, 95 - p.warnPct) * 0.15), 1),
      overtime: round(Math.max(0, 18 - p.replanPct * 0.9 + (100 - p.warnPct) * 0.2), 1),
      alerts: Math.round(2 + (p.warnPct - 80) * 0.25 + p.replanPct * 0.2),
    }),
  },
  // 전력 사용 현황
  16: {
    intro: '평소보다 얼마나 더 쓰면 경고하고, 멈춘 설비의 대기 전력을 언제 끌지 정해요.',
    params: [
      { key: 'overPct', label: '과소비 경고 기준 (평소 대비)', help: '평소보다 이 비율 이상 쓰면 경고해요.', unit: '%', min: 105, max: 150, step: 5, value: 120 },
      { key: 'idleOffMin', label: '대기 전력 자동 차단', help: '설비가 이 시간 동안 놀면 대기 전력을 꺼요. 짧을수록 아끼지만 재가동이 조금 늦어요.', unit: '분', min: 5, max: 60, step: 5, value: 30 },
    ],
    kpis: [
      { key: 'kwh', label: '하루 전력 사용', unit: 'kWh', better: 'down' },
      { key: 'waste', label: '대기 전력 낭비', unit: 'kWh/일', better: 'down' },
      { key: 'warnings', label: '과소비 경고', unit: '건/일', better: 'none' },
    ],
    simulate: p => {
      const series = POWER_DAY.map((x, h) => x - (h < 7 || h > 20 ? (60 - p.idleOffMin) * 1.2 : 0));
      return {
        kwh: Math.round(sum(series)),
        waste: Math.round(40 + p.idleOffMin * 4),
        warnings: count(series, x => x > 10 * p.overPct),
      };
    },
    trend: p => ({
      label: '오늘 전력 사용 (시간별)',
      unit: 'kWh',
      series: POWER_DAY.map((x, h) => round(x - (h < 7 || h > 20 ? (60 - p.idleOffMin) * 1.2 : 0))),
      line: 10 * p.overPct,
      lineLabel: '과소비 경고 기준',
    }),
  },
  // 에너지 비용 분석
  17: {
    intro: '요금이 비싼 시간대에 얼마나 가동하고, 얼마를 싼 야간으로 옮길지 정해요.',
    params: [
      { key: 'peakShare', label: '피크 요금 시간대 가동 비중', help: '전체 생산 중 가장 비싼 시간대에 만드는 비율이에요.', unit: '%', min: 10, max: 50, step: 5, value: 35 },
      { key: 'nightShift', label: '야간으로 옮기는 물량', help: '많이 옮길수록 요금은 줄지만 야간 근무가 늘어요.', unit: '%', min: 0, max: 30, step: 5, value: 10 },
    ],
    kpis: [
      { key: 'bill', label: '월 전기요금', unit: 'money', better: 'down' },
      { key: 'perUnit', label: '제품 1개당 전기요금', unit: 'money', better: 'down' },
      { key: 'nightStaff', label: '추가 야간 인원', unit: '명', better: 'down' },
    ],
    simulate: p => {
      const bill = 52_000_000 * (1 + (p.peakShare - 25) * 0.012 - p.nightShift * 0.006);
      return { bill: Math.round(bill), perUnit: Math.round(bill / 180_000), nightStaff: Math.round(p.nightShift * 0.4) };
    },
    trend: p => ({
      label: '시간대별 전력 사용',
      unit: 'kWh',
      series: POWER_DAY.map((x, h) => {
        const peak = (h >= 10 && h < 12) || (h >= 13 && h < 17);
        const night = h < 7 || h >= 22;
        return round(x * (peak ? p.peakShare / 35 : 1) * (night ? 1 + p.nightShift / 40 : 1));
      }),
    }),
  },
  // 피크 부하 관리
  18: {
    intro: '전력을 어디까지 낮게 유지할지, 배터리(ESS)를 언제부터 쓸지 정해요. 배터리는 하루 용량이 정해져 있어 너무 일찍 쓰면 진짜 피크 때 모자라요.',
    params: [
      { key: 'peakTarget', label: '피크 목표', help: '부하를 이 아래로 유지하려고 해요. 너무 낮게 잡으면 배터리가 일찍 바닥나 정작 큰 피크를 못 막아요.', unit: 'kW', min: 400, max: 500, step: 10, value: 450 },
      { key: 'essStart', label: 'ESS 방전 시작 (계약 전력 대비)', help: '부하가 계약 전력의 이 비율을 넘으면 배터리를 쓰기 시작해요.', unit: '%', min: 75, max: 95, step: 5, value: 85 },
    ],
    kpis: [
      { key: 'peak', label: '하루 최대 부하', unit: 'kW', better: 'down' },
      { key: 'saving', label: '월 기본요금 절감', unit: 'money', better: 'up' },
      { key: 'delay', label: '미뤄지는 생산', unit: '분/일', better: 'down' },
    ],
    simulate: p => {
      const { series, deferred } = controlledFeeder(p.peakTarget, p.essStart);
      const peak = Math.max(...series);
      return {
        peak,
        saving: Math.round(Math.max(0, Math.max(...FEEDER_DAY) - peak) * 25_000),
        delay: Math.round(deferred * 0.4),
      };
    },
    trend: p => ({ label: '수전 부하 (시간별)', unit: 'kW', series: controlledFeeder(p.peakTarget, p.essStart).series, line: CONTRACT_KW, lineLabel: '계약 전력' }),
  },
  // 지능형 CCTV 화재 감시
  19: {
    intro: 'AI가 얼마나 확신할 때 화재 경보를 울릴지 정해요. 오경보와 늦은 감지 사이의 균형이에요.',
    params: [
      { key: 'conf', label: '화재 판정 확신도', help: '높을수록 오경보는 줄지만 연기만 나는 초기 화재를 늦게 잡을 수 있어요.', unit: '%', min: 60, max: 95, step: 5, value: 85 },
      { key: 'confirmSec', label: '판정 전 확인 시간', help: '불꽃이 이 시간 동안 계속 보여야 경보를 울려요.', unit: '초', min: 0.5, max: 5, step: 0.5, value: 1.5 },
    ],
    kpis: [
      { key: 'falseAlarm', label: '오경보', unit: '건/월', better: 'down' },
      { key: 'detect', label: '감지까지', unit: '초', better: 'down', digits: 1 },
      { key: 'missRisk', label: '초기 화재를 놓칠 위험', unit: '%', better: 'down', digits: 1 },
    ],
    simulate: p => ({
      falseAlarm: Math.round(40 * Math.exp(-(p.conf - 60) / 9) + 4 / p.confirmSec),
      detect: round(p.confirmSec + 0.3 + (p.conf - 60) * 0.04, 1),
      missRisk: round(clamp(1 + (p.conf - 60) * 0.25 + p.confirmSec * 0.6, 0.5, 30), 1),
    }),
  },
  // AMR 충돌 방지 시스템
  20: {
    intro: '운반 로봇이 사람을 보면 몇 m 앞에서 속도를 줄이고 멈출지 정해요.',
    params: [
      { key: 'slowDist', label: '감속 시작 거리', help: '멀리서부터 줄일수록 안전하지만 운반이 느려져요.', unit: 'm', min: 1, max: 3, step: 0.1, value: 1.5 },
      { key: 'stopDist', label: '정지 거리', help: '사람이 이 거리 안에 들어오면 로봇이 멈춰요.', unit: 'm', min: 0.3, max: 1.2, step: 0.1, value: 0.5 },
    ],
    kpis: [
      { key: 'nearMiss', label: '아찔한 근접', unit: '건/일', better: 'down', digits: 1 },
      { key: 'delay', label: '운반 지연', unit: '분/일', better: 'down' },
      { key: 'trips', label: '시간당 운반', unit: '회', better: 'up' },
    ],
    simulate: p => ({
      nearMiss: round(6 * Math.exp(-(p.slowDist - 1) * 1.2) + Math.max(0, 0.6 - p.stopDist) * 10, 1),
      delay: Math.round(p.slowDist * 22 + p.stopDist * 30),
      trips: Math.round(60 - p.slowDist * 4 - p.stopDist * 6),
    }),
  },
  // 긴급 정지 및 알람 제어
  32: {
    intro: '비상 신호를 얼마나 확인한 뒤 전 공정을 멈출지, 사이렌을 얼마나 크게 울릴지 정해요.',
    params: [
      { key: 'confirmSec', label: '정지 전 확인 시간', help: '0초면 신호 즉시 멈춰요. 늘리면 센서 오작동으로 인한 정지는 줄지만 정지가 늦어져요.', unit: '초', min: 0, max: 3, step: 0.5, value: 0 },
      { key: 'siren', label: '사이렌 음량', help: '시끄러운 현장에서도 모두 들을 수 있게 정해요.', unit: 'dB', min: 70, max: 110, step: 5, value: 95 },
    ],
    kpis: [
      { key: 'stopTime', label: '전 공정 정지까지', unit: '초', better: 'down', digits: 1 },
      { key: 'falseStop', label: '오작동 정지', unit: '건/년', better: 'down' },
      { key: 'reach', label: '현장 알림 도달률', unit: '%', better: 'up', digits: 1 },
    ],
    simulate: p => ({
      stopTime: round(1.2 + p.confirmSec, 1),
      falseStop: Math.round(12 * Math.exp(-p.confirmSec * 1.1)),
      reach: round(clamp(70 + (p.siren - 70) * 0.75, 0, 99.5), 1),
    }),
  },
  // 승인 대기 큐
  24: {
    intro: 'AI 제안 중 어느 위험도까지는 AI가 바로 실행하고, 어디부터 사람이 승인할지 정해요.',
    params: [
      { key: 'autoLevel', label: 'AI가 바로 실행해도 되는 위험도', help: '0이면 모든 조치를 사람이 승인해요. 2면 위험도 2단계 이하는 AI가 바로 실행하고 기록만 남겨요.', unit: '단계', min: 0, max: 2, step: 1, value: 1 },
      { key: 'deadline', label: '승인 기한', help: '이 시간 안에 결정이 없으면 상급자에게 넘겨요.', unit: '분', min: 10, max: 120, step: 10, value: 30 },
    ],
    kpis: [
      { key: 'approvals', label: '사람이 결재할 건', unit: '건/일', better: 'down' },
      { key: 'toAction', label: '조치까지 평균', unit: '분', better: 'down' },
      { key: 'humanPct', label: '사람이 확인하는 비율', unit: '%', better: 'up' },
    ],
    simulate: p => {
      const level = clamp(Math.round(p.autoLevel), 0, 2);
      return {
        approvals: [24, 9, 3][level],
        toAction: Math.round([38, 16, 6][level] + p.deadline * 0.1),
        humanPct: [100, 62, 25][level],
      };
    },
  },
};

export const defaultTuning = (tuning: ModuleTuning): TuningValues =>
  Object.fromEntries(tuning.params.map(p => [p.key, p.value]));
