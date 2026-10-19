/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { SensorData } from '../types';
import { t } from '../i18n';

/**
 * Simulated AI output for when no Gemini key is configured.
 *
 * These are derived from the live mock telemetry rather than being fixed
 * strings, so the booth demo reacts to what is actually on screen: if the
 * vibration trace is climbing, the maintenance agent is the one that speaks up.
 */

const round = (value: number, digits = 1): number =>
  Math.round(value * 10 ** digits) / 10 ** digits;

interface DemoDecision {
  agent: string;
  action: string;
  target_equipment: string;
  recommended_value: number | string;
  level: number;
  reasoning: string;
}

/** Latest reading, averaged over the tail so a single spike does not dominate. */
const summarize = (sensorData: SensorData[]) => {
  const tail = sensorData.slice(-5);
  if (!tail.length) {
    return { defectRate: 0, vibration: 0, temperature: 0, current: 0, equipment: '수축포장기-01' };
  }
  const mean = (pick: (d: SensorData) => number) =>
    tail.reduce((sum, d) => sum + pick(d), 0) / tail.length;
  return {
    defectRate: mean(d => d.defect_rate),
    vibration: mean(d => d.vibration),
    temperature: mean(d => d.temperature),
    current: mean(d => d.current_amp),
    equipment: tail[tail.length - 1].equipment,
  };
};

export function demoRecommendations(sensorData: SensorData[]): DemoDecision[] {
  const s = summarize(sensorData);
  const equipment = t(s.equipment);
  const decisions: DemoDecision[] = [];

  // Quality: the defect rate is the headline number on the dashboard.
  const targetTemp = round(s.temperature > 176 ? 173 : s.temperature - 1.5);
  decisions.push({
    agent: 'Quality Agent',
    action: 'adjust_temperature',
    target_equipment: equipment,
    recommended_value: `${targetTemp}°C`,
    level: s.defectRate > 4 ? 2 : 3,
    reasoning: t(
      '현재 불량률은 {defect}%이며 수축 온도는 {temp}°C입니다. 과거 배치 분석에서 이 구간의 최적 온도는 {target}°C였고, 조정 시 불량률이 약 {expected}%까지 낮아질 것으로 예측됩니다.',
      {
        defect: round(s.defectRate, 2),
        temp: round(s.temperature),
        target: targetTemp,
        expected: round(Math.max(0.8, s.defectRate * 0.4), 1),
      },
    ),
  });

  // Maintenance: vibration is the leading indicator for the packaging line.
  const vibrationCritical = s.vibration > 4.2;
  decisions.push({
    agent: 'PM Agent',
    action: vibrationCritical ? 'inspect_bearing' : 'lubricator_operation',
    target_equipment: equipment,
    recommended_value: vibrationCritical ? '교체 권장' : '자동 급유 개시',
    level: vibrationCritical ? 1 : 3,
    reasoning: vibrationCritical
      ? t(
          '3축 진동값이 {vib}mm/s로 임계치(3.5)를 초과했습니다. 동일 패턴의 과거 이력에서는 72시간 내 베어링 손상으로 이어졌습니다. 다음 정지 시점에 점검을 예약하십시오.',
          { vib: round(s.vibration, 2) },
        )
      : t(
          '진동값 {vib}mm/s는 정상 범위이나 상승 추세가 관측됩니다. 자동 급유를 선행 가동하면 마모 진행을 늦추고 가동 중단을 예방할 수 있습니다.',
          { vib: round(s.vibration, 2) },
        ),
  });

  // Energy: current draw stands in for load.
  decisions.push({
    agent: 'Energy Agent',
    action: 'load_balance',
    target_equipment: t('포장1라인'),
    recommended_value: s.current > 13 ? '순환 유량 +15% 유압 상향' : '에너지 절전 우회 모드 (피크 피쇄)',
    level: 3,
    reasoning: t(
      '라인 전류는 {current}A로 정격 대비 여유가 있습니다. 피크 시간대 진입 전 비핵심 부하를 미리 분산하면 계약 전력 초과 없이 현재 생산 속도를 유지할 수 있습니다.',
      { current: round(s.current, 1) },
    ),
  });

  return decisions;
}
