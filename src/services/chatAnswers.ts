/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getLocaleTag, t, tAll } from '../i18n';
import type { PlantFacts } from './plantFacts';

/*
 * The assistant's demo answers, read off the plant fact sheet. Every number
 * in an answer is a number some screen shows right now, and every answer
 * names the screens it came from, so a visitor can open one and check. A
 * question the sheet cannot answer gets a plain "I don't have that" instead
 * of a made-up figure.
 */

export interface ChatAnswer {
  text: string;
  /** Menu ids of the screens the figures come from. */
  sources: number[];
}

/** Menu ids the answers cite. */
const SCREEN = {
  dashboard: 0, defectRate: 1, defectTypes: 3, history: 5, equipment: 6, trend: 7, workOrders: 9,
  oee: 12, power: 16, cost: 17, peak: 18, estop: 32, recommendations: 22, queue: 24, supervisor: 31,
} as const;

const num = (value: number, digits = 0) =>
  value.toLocaleString(getLocaleTag(), { minimumFractionDigits: digits, maximumFractionDigits: digits });

const won = (krw: number) => `₩${num(krw)}`;

const STATUS_TEXT: Record<string, string> = { 정상: '정상', 주의: '주의', 위험: '위험' };
const status = (s: string) => t(STATUS_TEXT[s] ?? s);

/** Everything a person might type for a topic, in Korean, Japanese and English. */
const KEYWORDS: Record<string, string> = {
  help: '도움|뭘 물어|무엇을 물어|사용법|help|what can you|何を聞|使い方|ヘルプ',
  urgent: '급한|급해|우선|먼저 할|지금 뭐|가장 중요|urgent|priority|first|most important|急ぎ|優先|まず|最も重要',
  scenario: '시나리오|시연|부스|scenario|booth|シナリオ|実演|ブース',
  approval: '승인|결재|approval|approve|pending|承認',
  resolved: '오늘 처리|처리한|해결한|해결된|오늘 한 일|resolved|handled|done today|today|解決|対応済|今日',
  incident: '이상|문제|알람|경보|사고|incident|issue|alarm|alert|problem|異常|アラーム|警報|問題',
  workOrder: '작업 오더|워크오더|작업지시|정비|보전|work order|maintenance|repair|作業指示|保全|整備|修理',
  health: '건강|설비 상태|고장|위험한 설비|health|equipment status|failure|machine|設備状態|健全|故障|設備',
  defectType: '불량 유형|유형|파레토|종류|defect type|types of defect|pareto|不良の種類|種類|パレート|内訳',
  defect: '불량|defect|reject|不良',
  oee: 'oee|가동률|설비종합효율|종합 효율|효율|availability|efficiency|稼働率|設備総合効率|効率',
  yield: '수율|배치|yield|batch|歩留|バッチ',
  peak: '피크|계약 전력|계약|peak|contract|demand|ピーク|契約',
  cost: '요금|비용|전기료|cost|bill|price|料金|コスト|電気代',
  energy: '전력|에너지|전기|kw|energy|power|electric|電力|エネルギー|電気',
  vibration: '진동|vibration|振動',
  temperature: '온도|temperature|温度',
  safety: '안전|비상 정지|비상정지|화재|충돌|safety|emergency|e-stop|fire|collision|安全|非常停止|火災|衝突',
  agents: '에이전트|agent|エージェント',
  summary: '요약|현황|상태|전체|공장 어때|summar|status|overview|how is the plant|状況|概要|全体|まとめ|工場はどう',
};

const mentions = (prompt: string, topic: string) => {
  const haystack = prompt.toLowerCase();
  return KEYWORDS[topic].split('|').some(word => haystack.includes(word));
};

/** The equipment a question names, by full name or by its kind ("모터", "conveyor"). */
function equipmentIn(prompt: string, facts: PlantFacts) {
  const haystack = prompt.toLowerCase();
  const spellings = (name: string) => tAll(name).map(s => s.toLowerCase());
  return (
    facts.equipment.find(e => spellings(e.name).some(s => haystack.includes(s))) ??
    facts.equipment.find(e => spellings(e.name).some(s => {
      const kind = s.replace(/[-‐]?\d+$/, '').trim();
      return kind.length > 1 && haystack.includes(kind);
    }))
  );
}

const lines = (items: string[]) => items.map(item => `• ${item}`).join('\n');

/* ------------------------------------------------------------ answers */

function summary(f: PlantFacts): ChatAnswer {
  const k = f.kpi;
  const open = f.incidents.open.length;
  return {
    text: t('지금 공장은 설비종합효율(OEE) {oee}%(목표 {target}%), 불량률 {defect}%({status}), 전력 {kw}kW(계약 전력의 {pct}%)입니다. 진행 중인 이상 {open}건, 승인 대기 {pending}건이 있어요.', {
      oee: num(k.oee, 1), target: k.oeeTarget, defect: num(k.defectRate, 2), status: status(k.defectStatus),
      kw: num(k.energyKw), pct: k.contractPct, open, pending: f.approvals.length,
    }),
    sources: [SCREEN.dashboard],
  };
}

function oee(f: PlantFacts): ChatAnswer {
  const k = f.kpi;
  const parts = [
    { name: '가용률', value: k.availability },
    { name: '성능', value: k.performance },
    { name: '양품률', value: k.quality },
  ].sort((a, b) => a.value - b.value);
  return {
    text: t('설비종합효율(OEE)은 {oee}%로 목표 {target}%보다 {gap}. 가용률 {a}% × 성능 {p}% × 양품률 {q}%로 계산하며, 가장 낮은 요소는 {low}({lowValue}%)입니다.', {
      oee: num(k.oee, 1), target: k.oeeTarget,
      gap: k.oee >= k.oeeTarget ? t('{d}%p 높아요', { d: num(k.oee - k.oeeTarget, 1) }) : t('{d}%p 낮아요', { d: num(k.oeeTarget - k.oee, 1) }),
      a: num(k.availability, 1), p: num(k.performance, 1), q: num(k.quality, 1),
      low: t(parts[0].name), lowValue: num(parts[0].value, 1),
    }),
    sources: [SCREEN.dashboard, SCREEN.oee],
  };
}

function defectRate(f: PlantFacts): ChatAnswer {
  const k = f.kpi;
  const top = f.defects[0];
  return {
    text: t('현재 불량률은 {defect}%로 {status} 구간입니다 (3% 초과 주의, 5% 초과 경보). 오늘 가장 많은 불량 유형은 {type} {count}건이에요.', {
      defect: num(k.defectRate, 2), status: status(k.defectStatus), type: t(top.name), count: top.count,
    }),
    sources: [SCREEN.dashboard, SCREEN.defectRate],
  };
}

function defectTypes(f: PlantFacts): ChatAnswer {
  const within80 = f.defects.filter((d, i) => i === 0 || f.defects[i - 1].cumPct < 80);
  return {
    text: `${t('오늘 불량은 모두 {total}건입니다. 많은 순서대로:', { total: f.defectTotal })}\n${lines(f.defects.map(d => t('{name} {count}건 (누적 {cum}%)', { name: t(d.name), count: d.count, cum: num(d.cumPct, 1) })))}\n${t('{types}만 잡아도 불량의 {cum}%가 줄어요.', { types: within80.map(d => t(d.name)).join(', '), cum: num(within80[within80.length - 1].cumPct, 1) })}`,
    sources: [SCREEN.defectTypes],
  };
}

function equipmentHealth(f: PlantFacts): ChatAnswer {
  const sorted = [...f.equipment].sort((a, b) => a.health - b.health);
  return {
    text: `${t('설비 건강 점수입니다 (100점 만점, 70점 미만 주의, 50점 미만 위험):')}\n${lines(sorted.map(e => t('{name} {score}점 ({status})', { name: t(e.name), score: e.health, status: status(e.status) })))}`,
    sources: [SCREEN.equipment],
  };
}

function oneEquipment(f: PlantFacts, e: PlantFacts['equipment'][number]): ChatAnswer {
  const orders = f.workOrders.filter(o => o.asset === e.name && o.status !== 'Completed');
  const sensor = e.name === f.sensors.equipment
    ? ` ${t('진동 {vib}mm/s, 실링 온도 {temp}°C, 전류 {amp}A를 실시간으로 받고 있어요.', { vib: num(f.sensors.vibration, 2), temp: num(f.sensors.temperature, 1), amp: num(f.sensors.current, 1) })}`
    : '';
  const orderText = orders.length
    ? ` ${t('열린 작업 오더: {orders}.', { orders: orders.map(o => `${o.id} (${t(o.type)}, ${t(o.priority)}, ${t(o.status)})`).join(', ') })}`
    : ` ${t('열린 작업 오더는 없어요.')}`;
  return {
    text: t('{name}의 건강 점수는 {score}점({status})이고, 지금 가동 전력 {run}kW, 대기 전력 {idle}kW를 쓰고 있어요.', {
      name: t(e.name), score: e.health, status: status(e.status), run: num(e.runKw, 1), idle: num(e.idleKw, 1),
    }) + sensor + orderText,
    sources: [SCREEN.equipment, SCREEN.power, SCREEN.workOrders],
  };
}

function workOrders(f: PlantFacts): ChatAnswer {
  const open = f.workOrders.filter(o => o.status !== 'Completed');
  return {
    text: `${t('보전 작업 오더는 모두 {total}건이고, 그중 {open}건이 열려 있어요:', { total: f.workOrders.length, open: open.length })}\n${lines(open.map(o => `${o.id} · ${t(o.asset)} · ${t(o.type)} · ${t(o.priority)} · ${t(o.status)} · ${o.user}`))}`,
    sources: [SCREEN.workOrders],
  };
}

function approvals(f: PlantFacts): ChatAnswer {
  if (!f.approvals.length) {
    return { text: t('지금 사람의 승인을 기다리는 AI 제안은 없어요.'), sources: [SCREEN.queue] };
  }
  return {
    text: `${t('승인을 기다리는 AI 제안이 {n}건 있어요:', { n: f.approvals.length })}\n${lines(f.approvals.map(a => t('{agent} → {equipment}: {value} (위험도 L{level})', { agent: a.agent, equipment: t(a.equipment), value: t(a.value), level: a.level })))}`,
    sources: [SCREEN.queue, SCREEN.recommendations],
  };
}

function incidents(f: PlantFacts): ChatAnswer {
  const open = f.incidents.open;
  if (!open.length) {
    return {
      text: t('지금 진행 중인 이상은 없어요. 오늘 AI가 처리한 건은 {n}건입니다.', { n: f.incidents.resolvedToday.length }),
      sources: [SCREEN.dashboard],
    };
  }
  return {
    text: `${t('진행 중인 이상이 {n}건 있어요:', { n: open.length })}\n${lines(open.map(i => t('{title} · {agent} · {stage} 단계 · {action}', { title: t(i.title), agent: t(i.agent), stage: t(i.stage), action: t(i.action) })))}`,
    sources: [SCREEN.dashboard],
  };
}

function resolved(f: PlantFacts): ChatAnswer {
  const done = f.incidents.resolvedToday;
  const hours = done.reduce((sum, i) => sum + i.hours, 0);
  return {
    text: `${t('오늘 AI가 처리를 마친 건은 {n}건이고, 막은 라인 정지 시간은 모두 {hours}시간이에요:', { n: done.length, hours: num(hours, 1) })}\n${lines(done.map(i => `${i.time} ${t(i.title)} → ${t(i.action)}`))}`,
    sources: [SCREEN.dashboard],
  };
}

function urgent(f: PlantFacts): ChatAnswer {
  const live = f.incidents.open.find(i => i.task);
  if (live) {
    return {
      text: t('가장 먼저 볼 일은 "{title}"입니다. {agent}가 "{action}"을(를) 진행 중이고, 현장에서는 "{task}"을(를) 해 주시면 돼요.', { title: t(live.title), agent: t(live.agent), action: t(live.action), task: t(live.task!) }),
      sources: [SCREEN.dashboard, SCREEN.queue],
    };
  }
  const worst = [...f.equipment].sort((a, b) => a.health - b.health)[0];
  return {
    text: t('지금 급한 이상은 없어요. 다음으로 챙길 것은 건강 점수가 가장 낮은 {name}({score}점)입니다.', { name: t(worst.name), score: worst.health }),
    sources: [SCREEN.dashboard, SCREEN.equipment],
  };
}

function scenario(f: PlantFacts): ChatAnswer | null {
  const c = f.stagedCase;
  if (!c) return null;
  const phase = c.phase === 'before' ? '시작 전' : c.phase === 'live' ? '진행 중' : '처리 완료';
  return {
    text: `${t('지금 시연 중인 상황은 "{title}"이고, {phase}입니다. {lead}가 주도하고 있어요.', { title: t(c.title), phase: t(phase), lead: t(c.lead) })}\n${lines(c.team.map(m => `${t(m.agent)}: ${t(m.task)}`))}`,
    sources: [SCREEN.dashboard, SCREEN.supervisor],
  };
}

function energy(f: PlantFacts): ChatAnswer {
  const k = f.kpi;
  const machines = [...f.equipment].sort((a, b) => (b.runKw + b.idleKw) - (a.runKw + a.idleKw));
  const idle = f.equipment.reduce((sum, e) => sum + e.idleKw, 0);
  return {
    text: t('공장 전체 전력은 지금 {kw}kW로 계약 전력 {contract}kW의 {pct}%입니다. 포장1라인에서 전력을 가장 많이 쓰는 설비는 {top}({topKw}kW)이고, 다섯 대의 대기 전력 합계는 {idle}kW예요.', {
      kw: num(k.energyKw), contract: num(k.contractKw), pct: k.contractPct,
      top: t(machines[0].name), topKw: num(machines[0].runKw + machines[0].idleKw, 1), idle: num(idle, 1),
    }),
    sources: [SCREEN.dashboard, SCREEN.power],
  };
}

function peak(f: PlantFacts): ChatAnswer {
  const k = f.kpi;
  const top = [...f.peakLoad].sort((a, b) => b.kw - a.kw)[0];
  const over = f.peakLoad.filter(p => p.over);
  return {
    text: t('계약 전력은 {contract}kW이고 지금은 {pct}%({kw}kW)를 쓰고 있어요. 오늘 가장 높았던 시간은 {time} {peak}kW이고, 계약 전력을 넘은 시간대는 {over}입니다.', {
      contract: num(k.contractKw), pct: k.contractPct, kw: num(k.energyKw), time: top.time, peak: num(top.kw),
      over: over.length ? over.map(p => p.time).join(', ') : t('없어요'),
    }),
    sources: [SCREEN.peak],
  };
}

function cost(f: PlantFacts): ChatAnswer {
  const total = f.energyCost.reduce((sum, c) => sum + c.krw, 0);
  const top = [...f.energyCost].sort((a, b) => b.krw - a.krw)[0];
  return {
    text: t('오늘 전기요금은 지금까지 {total}입니다. 가장 비싼 시간대는 {time}시로 {cost}이에요. 이 시간대 부하를 다른 시간으로 옮기면 요금을 줄일 수 있어요.', { total: won(total), time: top.time, cost: won(top.krw) }),
    sources: [SCREEN.cost],
  };
}

function yieldAnswer(f: PlantFacts): ChatAnswer {
  const low = f.batches.filter(b => b.belowTarget);
  return {
    text: `${t('최근 배치 {n}개의 수율입니다 (목표 95%):', { n: f.batches.length })}\n${lines(f.batches.map(b => `${b.batch} ${num(b.yield, 1)}%${b.belowTarget ? ` ⚠ ${t('목표 미달')}` : ''}`))}${low.length ? `\n${t('{batches}는 원인 확인이 필요해요.', { batches: low.map(b => b.batch).join(', ') })}` : ''}`,
    sources: [SCREEN.history],
  };
}

function vibration(f: PlantFacts): ChatAnswer {
  const s = f.sensors;
  return {
    text: t('{name} 진동은 지금 {vib}mm/s로 {status}입니다. 4.1mm/s를 넘으면 주의, 4.6mm/s를 넘으면 경보예요.', { name: t(s.equipment), vib: num(s.vibration, 2), status: status(s.vibrationStatus) }),
    sources: [SCREEN.dashboard, SCREEN.trend],
  };
}

function temperature(f: PlantFacts): ChatAnswer {
  const s = f.sensors;
  return {
    text: t('{name} 실링 온도는 지금 {temp}°C입니다. 불량이 가장 적은 온도는 173°C 근처예요.', { name: t(s.equipment), temp: num(s.temperature, 1) }),
    sources: [SCREEN.trend, 4],
  };
}

function safety(f: PlantFacts): ChatAnswer {
  const total = f.emergencyStops.reduce((sum, s) => sum + s.count, 0);
  const safetyToday = f.incidents.resolvedToday.filter(i => i.agent === '안전 AI');
  return {
    text: `${t('이번 달 비상 정지는 모두 {total}건입니다 ({causes}).', { total, causes: f.emergencyStops.map(s => `${t(s.cause)} ${s.count}`).join(', ') })}${safetyToday.length ? ` ${t('오늘 안전 AI가 처리한 건: {items}.', { items: safetyToday.map(i => t(i.title)).join(', ') })}` : ''}`,
    sources: [SCREEN.estop, SCREEN.dashboard],
  };
}

function agents(f: PlantFacts): ChatAnswer {
  const c = f.stagedCase;
  return {
    text: t('지금 에이전트 {n}개가 일하고 있어요 (전체 6개: 품질·예지보전·안전·생산·에너지·물류).', { n: f.kpi.activeAgents }) +
      (c && c.phase === 'live' ? ` ${t('{lead}가 "{title}" 대응을 주도하고 있어요.', { lead: t(c.lead), title: t(c.title) })}` : ''),
    sources: [SCREEN.dashboard, SCREEN.supervisor],
  };
}

function help(): ChatAnswer {
  return {
    text: `${t('화면에 나온 공장 데이터로 답해요. 이런 걸 물어보세요:')}\n${lines([
      t('지금 공장 상태 요약'), t('가장 급한 일은?'), t('불량 유형 순위'), t('모터-08 상태'),
      t('승인 대기 목록'), t('피크 전력 상황'), t('오늘 AI가 처리한 일'),
    ])}`,
    sources: [],
  };
}

/** The order matters: specific topics before the broad ones they contain ("불량 유형" before "불량"). */
const INTENTS: { topic: string; answer: (f: PlantFacts) => ChatAnswer | null }[] = [
  { topic: 'help', answer: help },
  { topic: 'scenario', answer: scenario },
  { topic: 'urgent', answer: urgent },
  { topic: 'approval', answer: approvals },
  { topic: 'workOrder', answer: workOrders },
  { topic: 'defectType', answer: defectTypes },
  { topic: 'defect', answer: defectRate },
  { topic: 'oee', answer: oee },
  { topic: 'yield', answer: yieldAnswer },
  { topic: 'peak', answer: peak },
  { topic: 'cost', answer: cost },
  { topic: 'energy', answer: energy },
  { topic: 'vibration', answer: vibration },
  { topic: 'temperature', answer: temperature },
  { topic: 'safety', answer: safety },
  { topic: 'incident', answer: incidents },
  { topic: 'resolved', answer: resolved },
  { topic: 'health', answer: equipmentHealth },
  { topic: 'agents', answer: agents },
  { topic: 'summary', answer: summary },
];

/** The answer the fact sheet gives, or null when the question is about something it does not hold. */
export function answerFromFacts(prompt: string, facts: PlantFacts): ChatAnswer | null {
  // A named machine wins unless the question is about a specific measurement of it.
  const machine = equipmentIn(prompt, facts);
  if (machine && !['vibration', 'temperature', 'workOrder', 'energy'].some(topic => mentions(prompt, topic))) {
    return oneEquipment(facts, machine);
  }
  for (const intent of INTENTS) {
    if (!mentions(prompt, intent.topic)) continue;
    const answer = intent.answer(facts);
    if (answer) return answer;
  }
  return null;
}

/** Demo mode: the sheet's answer, or an honest "not on the sheet" with what can be asked. */
export function demoAnswer(prompt: string, facts: PlantFacts): ChatAnswer {
  const answer = answerFromFacts(prompt, facts);
  if (answer) return answer;
  const fallback = help();
  return {
    text: `${t('그 질문에 답할 데이터는 지금 화면에 없어요. 지어내지 않고, 화면에 있는 숫자로만 답할게요.')}\n${fallback.text}`,
    sources: [],
  };
}
