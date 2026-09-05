import pptxgen from 'pptxgenjs';
import { C, F, W, H, M, COL, page, card, chip, title, sub, foot, stat, SHOTS } from './theme.mjs';

const pres = new pptxgen();
pres.layout = 'LAYOUT_WIDE';
pres.author = 'IMPIX AI';
pres.title = 'IMPIX AI Orchestration Platform 소개서';

let n = 0;
const FOOT = 'IMPIX AI Orchestration Platform · 플랫폼 소개서';
const New = (opts) => { const s = pres.addSlide(); page(s, opts); return s; };

/* ───────────────────────── 1. 표지 ───────────────────────── */
{
  const s = New();
  // faint orbit motif
  s.addShape('ellipse', { x: 8.4, y: -1.6, w: 7.4, h: 7.4, fill: { color: C.accent, transparency: 94 }, line: { color: C.accent, width: 1, transparency: 82 } });
  s.addShape('ellipse', { x: 9.7, y: -0.3, w: 4.8, h: 4.8, fill: { color: C.bg, transparency: 100 }, line: { color: C.cyan, width: 1, transparency: 76 } });
  s.addShape('roundRect', { x: M, y: 1.5, w: 0.5, h: 0.5, rectRadius: 0.3, fill: { color: C.accent }, line: { color: C.accent, width: 0 } });

  s.addText('IMPIX AI', { x: M + 0.68, y: 1.46, w: 4, h: 0.56, margin: 0, valign: 'middle', fontFace: F.latin, fontSize: 20, bold: true, color: C.text, isTextBox: true });
  s.addText('ORCHESTRATION PLATFORM', { x: M + 0.68, y: 1.96, w: 5, h: 0.3, margin: 0, fontFace: F.latin, fontSize: 10, color: C.muted, charSpacing: 3, isTextBox: true });

  s.addText('AI가 공장을\n스스로 운영한다면?', {
    x: M, y: 2.75, w: 7.6, h: 1.9, margin: 0, lineSpacing: 52,
    fontFace: F.ko, fontSize: 42, bold: true, color: C.text, isTextBox: true,
  });
  s.addText('6개의 도메인 AI 에이전트와 1개의 슈퍼바이저가 실시간으로 협의하여\n품질 · 설비 · 생산 · 에너지 · 안전 · 물류를 동시에 최적화하는\n산업용 AI 오케스트레이션 플랫폼', {
    x: M, y: 4.75, w: 7.9, h: 1.1, margin: 0, lineSpacing: 22,
    fontFace: F.ko, fontSize: 13, color: C.muted, isTextBox: true,
  });
  s.addShape('roundRect', { x: M, y: 6.15, w: 3.15, h: 0.42, rectRadius: 0.1, fill: { color: C.accent, transparency: 86 }, line: { color: C.accent, width: 1 } });
  s.addText('日本語 · English · 한국어', { x: M, y: 6.15, w: 3.15, h: 0.42, margin: 0, align: 'center', valign: 'middle', fontFace: F.ko, fontSize: 11, bold: true, color: C.accent, isTextBox: true });
  s.addText('플랫폼 소개서', { x: W - M - 3, y: 6.2, w: 3, h: 0.32, margin: 0, align: 'right', fontFace: F.ko, fontSize: 12, color: C.dim, isTextBox: true });
  s.addNotes('표지. 제품의 다크 테마 팔레트를 그대로 사용해 화면 캡처와 색이 이어지도록 했습니다.');
}

/* ───────────────────────── 2. 한 장 요약 ───────────────────────── */
{
  const s = New(); n = 2;
  title(s, '한 장으로 보는 IMPIX AI', { kicker: 'AT A GLANCE' });
  sub(s, '개별 AI 모델을 나열한 대시보드가 아니라, 서로 다른 목표를 가진 에이전트들이 협의하고 사람이 최종 승인하는 의사결정 구조입니다.', 1.42);

  const items = [
    ['6', 'AI 에이전트', '품질 · 예지보전 · 생산\n에너지 · 안전 · 물류', C.accent],
    ['32', '기능 모듈', '8개 카테고리에 걸친\n운영 화면 일체', C.cyan],
    ['4', '체험 시나리오', '실제 공장에서 발생하는\n상황을 단계별로 재현', C.warn],
    ['98.2%', '의사결정 신뢰도', '에이전트 합의(Ensemble\nVoting) 기반 최종 판단', C.violet],
  ];
  const cw = (COL - 0.36 * 3) / 4;
  items.forEach(([v, l, d, col], i) => {
    const x = M + i * (cw + 0.36);
    card(s, { x, y: 2.15, w: cw, h: 2.35 });
    s.addText(v, { x: x + 0.3, y: 2.42, w: cw - 0.6, h: 0.7, margin: 0, valign: 'bottom', fontFace: F.latin, fontSize: 40, bold: true, color: col, isTextBox: true });
    s.addText(l, { x: x + 0.3, y: 3.16, w: cw - 0.6, h: 0.32, margin: 0, fontFace: F.ko, fontSize: 14, bold: true, color: C.text, isTextBox: true });
    s.addText(d, { x: x + 0.3, y: 3.52, w: cw - 0.6, h: 0.8, margin: 0, lineSpacing: 16, fontFace: F.ko, fontSize: 10.5, color: C.muted, isTextBox: true });
  });

  card(s, { x: M, y: 4.78, w: COL, h: 1.55, fill: C.accent, trans: 90, line: C.accent });
  s.addText('핵심 명제', { x: M + 0.42, y: 5.0, w: 2, h: 0.3, margin: 0, fontFace: F.ko, fontSize: 11, bold: true, color: C.accent, charSpacing: 1, isTextBox: true });
  s.addText('“생산을 늘려라”와 “안전을 지켜라”는 늘 충돌합니다. IMPIX AI는 이 충돌을 숨기지 않고 화면에 드러낸 뒤,\n정책 가드레일과 에이전트 합의를 거쳐 근거가 남는 하나의 결론으로 좁힙니다.', {
    x: M + 0.42, y: 5.33, w: COL - 0.84, h: 0.85, margin: 0, lineSpacing: 24,
    fontFace: F.ko, fontSize: 15, bold: true, color: C.text, isTextBox: true,
  });
  foot(s, n, FOOT);
}

/* ───────────────────────── 3. 문제 정의 ───────────────────────── */
{
  const s = New(); n = 3;
  title(s, '현장의 세 가지 단절', { kicker: 'PROBLEM' });
  sub(s, '스마트팩토리에 투자했는데도 판단이 빨라지지 않는 이유는 대개 모델의 성능이 아니라 구조에 있습니다.', 1.42);

  const rows = [
    ['01', '사일로', '품질·설비·에너지·안전 시스템이 각자의 화면에서 각자의 경고를 냅니다. 어떤 경고를 먼저 처리해야 하는지는 아무도 알려주지 않습니다.', C.danger],
    ['02', '대응 지연', '이상 징후를 발견해도 담당자를 찾고 근거를 모으는 데 시간이 흘러갑니다. 설비가 멈춘 뒤에야 회의가 시작됩니다.', C.warn],
    ['03', '블랙박스', 'AI가 값을 하나 던져주지만 왜 그 값인지 알 수 없습니다. 근거를 설명할 수 없는 제안은 현장에서 채택되지 않습니다.', C.violet],
  ];
  const rh = 1.28;
  rows.forEach(([num, head, body, col], i) => {
    const y = 2.15 + i * (rh + 0.26);
    card(s, { x: M, y, w: COL, h: rh });
    chip(s, { x: M + 0.42, y: y + 0.42, d: 0.44, label: num, fill: col, size: 13 });
    s.addText(head, { x: M + 1.1, y: y + 0.26, w: 2.4, h: 0.4, margin: 0, valign: 'middle', fontFace: F.ko, fontSize: 18, bold: true, color: C.text, isTextBox: true });
    s.addText(body, { x: M + 1.1, y: y + 0.66, w: COL - 1.7, h: 0.52, margin: 0, lineSpacing: 18, fontFace: F.ko, fontSize: 12, color: C.muted, isTextBox: true });
  });

  s.addText('→  세 가지 모두 “모델을 하나 더 붙이는 일”로는 풀리지 않습니다. 필요한 것은 조율 계층입니다.', {
    x: M, y: 6.35, w: COL, h: 0.36, margin: 0, fontFace: F.ko, fontSize: 13, bold: true, color: C.accent, isTextBox: true });
  foot(s, n, FOOT);
}

/* ───────────────────────── 4. 6 에이전트 ───────────────────────── */
{
  const s = New(); n = 4;
  title(s, '6개의 도메인 에이전트, 1개의 슈퍼바이저', { kicker: 'SOLUTION' });
  sub(s, '각 에이전트는 자기 도메인의 목표만 봅니다. 서로 부딪히는 지점을 정리하는 일은 슈퍼바이저의 몫입니다.', 1.42);

  const ag = [
    ['Quality Agent', '품질', 'YOLOv8 · PatchCore 비전 검사\n불량률 임계치 5% / 8% 관리', C.accent],
    ['PM Agent', '설비 예지보전', 'GBR 잔여수명(RUL) 예측\n72시간 전 사전 워크오더', C.cyan],
    ['Line Monitor Agent', '생산 최적화', 'OEE · 택트타임 · 병목 진단\n가동률 95% 상시 유지', C.violet],
    ['Energy Agent', '에너지', '15분 단위 피크 부하 제어\n계약 전력 90% 이내 관리', C.warn],
    ['Safety Agent', '안전', 'CCTV 화재 감지 · AMR 충돌 방지\n비상 정지 전파 100ms', C.danger],
    ['Logistics Agent', '물류', 'AMR 배차 · 출하 SLA 관리\n러시 오더 대응 조율', '38BDF8'],
  ];
  const cw = (COL - 0.3 * 2) / 3, ch = 1.32;
  ag.forEach(([en, ko, desc, col], i) => {
    const x = M + (i % 3) * (cw + 0.3);
    const y = 2.12 + Math.floor(i / 3) * (ch + 0.28);
    card(s, { x, y, w: cw, h: ch });
    s.addShape('roundRect', { x: x + 0.3, y: y + 0.3, w: 0.16, h: 0.16, rectRadius: 0.08, fill: { color: col }, line: { color: col, width: 0 } });
    s.addText(ko, { x: x + 0.58, y: y + 0.22, w: cw - 0.9, h: 0.32, margin: 0, valign: 'middle', fontFace: F.ko, fontSize: 15, bold: true, color: C.text, isTextBox: true });
    s.addText(en, { x: x + 0.3, y: y + 0.58, w: cw - 0.6, h: 0.24, margin: 0, fontFace: F.latin, fontSize: 9.5, color: col, charSpacing: 1, isTextBox: true });
    s.addText(desc, { x: x + 0.3, y: y + 0.83, w: cw - 0.6, h: 0.44, margin: 0, lineSpacing: 14, fontFace: F.ko, fontSize: 10, color: C.muted, isTextBox: true });
  });

  card(s, { x: M, y: 5.34, w: COL, h: 1.05, fill: C.accent, trans: 88, line: C.accent });
  s.addText('AI Supervisor', { x: M + 0.42, y: 5.5, w: 2.6, h: 0.34, margin: 0, valign: 'middle', fontFace: F.latin, fontSize: 15, bold: true, color: C.accent, isTextBox: true });
  s.addText('전사 목표(Active Goal)를 각 에이전트의 하위 과업으로 분해하고, 제안이 충돌하면 정책 가드레일 순서에 따라 중재합니다.\nL1 Safety Layer가 걸리면 생산 목표를 블로킹합니다 — 안전이 생산을 이기는 규칙이 코드에 있습니다.', {
    x: M + 3.1, y: 5.48, w: COL - 3.6, h: 0.78, margin: 0, lineSpacing: 17,
    fontFace: F.ko, fontSize: 11.5, color: C.text, isTextBox: true });
  foot(s, n, FOOT);
}

/* ───────────────────────── 5. 아키텍처 흐름 ───────────────────────── */
{
  const s = New(); n = 5;
  title(s, '데이터에서 승인까지, 하나의 경로', { kicker: 'ARCHITECTURE' });
  sub(s, '모든 판단은 같은 파이프라인을 지나며, 각 단계가 화면에 그대로 노출됩니다.', 1.42);

  const steps = [
    ['01', '수집', 'Kafka 스트림\nTimescaleDB 시계열', C.muted],
    ['02', '추론', '에이전트별 전용 모델\n온톨로지 규칙 평가', C.cyan],
    ['03', '조율', 'Supervisor 중재\n합의 · 정책 가드레일', C.accent],
    ['04', '승인', 'Human Gate\n사람이 최종 결정', C.warn],
    ['05', '실행 · 기록', '제어 명령 반영\n감사 추적 로그 적재', C.violet],
  ];
  const cw = (COL - 0.42 * 4) / 5;
  steps.forEach(([num, head, body, col], i) => {
    const x = M + i * (cw + 0.42);
    card(s, { x, y: 2.2, w: cw, h: 2.0 });
    chip(s, { x: x + 0.26, y: y0(2.2), d: 0.4, label: num, fill: col, color: C.bg, size: 12 });
    s.addText(head, { x: x + 0.26, y: 3.02, w: cw - 0.52, h: 0.36, margin: 0, fontFace: F.ko, fontSize: 16, bold: true, color: C.text, isTextBox: true });
    s.addText(body, { x: x + 0.26, y: 3.42, w: cw - 0.52, h: 0.66, margin: 0, lineSpacing: 15, fontFace: F.ko, fontSize: 10.5, color: C.muted, isTextBox: true });
    if (i < 4) s.addText('›', { x: x + cw + 0.04, y: 3.0, w: 0.34, h: 0.4, margin: 0, align: 'center', valign: 'middle', fontFace: F.latin, fontSize: 22, bold: true, color: C.dim, isTextBox: true });
  });
  function y0(y) { return y + 0.3; }

  card(s, { x: M, y: 4.5, w: COL, h: 1.85 });
  s.addText('세 단계가 이 플랫폼을 다른 대시보드와 구분합니다', { x: M + 0.42, y: 4.72, w: COL - 0.84, h: 0.34, margin: 0, fontFace: F.ko, fontSize: 15, bold: true, color: C.text, isTextBox: true });
  const hi = [
    ['03 조율', '에이전트끼리 반대 의견을 내고 근거를 주고받는 과정 자체를 시각화합니다.', C.accent],
    ['04 승인', 'Level 2 이상 제어는 사람이 승인해야만 실행됩니다. 자동화의 범위를 사람이 정합니다.', C.warn],
    ['05 기록', '누가 무엇을 왜 승인했는지 남습니다. 감사와 사후 분석이 가능해집니다.', C.violet],
  ];
  const hw = (COL - 0.84 - 0.4 * 2) / 3;
  hi.forEach(([h, b, col], i) => {
    const x = M + 0.42 + i * (hw + 0.4);
    s.addText(h, { x, y: 5.2, w: hw, h: 0.28, margin: 0, fontFace: F.ko, fontSize: 11, bold: true, color: col, isTextBox: true });
    s.addText(b, { x, y: 5.5, w: hw, h: 0.72, margin: 0, lineSpacing: 16, fontFace: F.ko, fontSize: 11, color: C.muted, isTextBox: true });
  });
  foot(s, n, FOOT);
}

/* ───────────────────────── 6. 차별점 1 · 오케스트레이션 ───────────────────────── */
{
  const s = New(); n = 6;
  title(s, '에이전트가 협의하는 과정을 보여줍니다', { kicker: 'DIFFERENTIATOR 01' });

  // 2050 x 1790 crop -> 1.145 aspect
  const iw6 = 5.65, ih6 = iw6 / 1.145;
  s.addImage({ path: `${SHOTS}/20-orchestration-crop.png`, x: M, y: 1.5, w: iw6, h: ih6 });
  s.addShape('roundRect', { x: M, y: 1.5, w: iw6, h: ih6, rectRadius: 0.02, fill: { color: C.bg, transparency: 100 }, line: { color: C.border, width: 1 } });
  s.addText('AI 오케스트레이션 센터 — 에이전트 간 의사결정 조율 시각화', { x: M, y: 1.5 + ih6 + 0.12, w: iw6, h: 0.3, margin: 0, fontFace: F.ko, fontSize: 10, color: C.muted, isTextBox: true });

  const bx = M + 5.65 + 0.45, bw = COL - 5.65 - 0.45;
  const pts = [
    ['제안', '물류 에이전트가 “패키징 1라인 속도 20% 상향”을 제안합니다.'],
    ['반박', '품질 에이전트가 열접합 스크래치 불량 상승을 근거로 반대합니다.'],
    ['보완', '예지보전 에이전트가 냉각 파라미터 미세 조정으로 발열을 억제할 수 있다고 제시합니다.'],
    ['합의', '슈퍼바이저가 “속도 +5% + ESS 120kW 방전 + AMR 완충 버퍼”로 결론을 냅니다.'],
  ];
  let y = 1.5;
  pts.forEach(([h, b], i) => {
    chip(s, { x: bx, y: y + 0.02, d: 0.34, label: String(i + 1), fill: i === 3 ? C.accent : C.border, color: i === 3 ? C.bg : C.text, size: 11 });
    s.addText(h, { x: bx + 0.48, y, w: bw - 0.48, h: 0.3, margin: 0, valign: 'middle', fontFace: F.ko, fontSize: 14, bold: true, color: i === 3 ? C.accent : C.text, isTextBox: true });
    s.addText(b, { x: bx + 0.48, y: y + 0.32, w: bw - 0.48, h: 0.76, margin: 0, lineSpacing: 16, fontFace: F.ko, fontSize: 11, color: C.muted, isTextBox: true });
    y += 1.22;
  });
  s.addText('충돌을 감춘 자동화는 신뢰를 얻지 못합니다.\n반대 의견이 보이기 때문에 결론을 받아들일 수 있습니다.', {
    x: bx, y: 6.42, w: bw, h: 0.6, margin: 0, lineSpacing: 16, fontFace: F.ko, fontSize: 11, italic: true, color: C.accent, isTextBox: true });
  foot(s, n, FOOT);
}

/* ───────────────────────── 7. 차별점 2 · Human Gate ───────────────────────── */
{
  const s = New(); n = 7;
  title(s, '자동화의 한계선을 사람이 정합니다', { kicker: 'DIFFERENTIATOR 02' });
  sub(s, 'Level 2 이상의 제어는 승인 대기 큐에 쌓이고, 승인 전까지 어떤 명령도 설비로 나가지 않습니다.', 1.42);

  const bw2 = 5.05;
  const lv = [
    ['L0', '관찰', '수집과 표시만 합니다. 제어 없음.', C.dim],
    ['L1', '권고', '추천을 카드로 띄웁니다. 실행은 사람이.', C.cyan],
    ['L2', '승인 후 자율', '승인 대기 큐를 거쳐야 실행됩니다.', C.warn],
    ['L3', '가드레일 내 자율', '정책 범위 안에서만 스스로 실행합니다.', C.accent],
  ];
  lv.forEach(([l, h, b, col], i) => {
    const y = 2.15 + i * 1.02;
    card(s, { x: M, y, w: bw2, h: 0.86 });
    s.addText(l, { x: M + 0.26, y: y + 0.16, w: 0.62, h: 0.54, margin: 0, align: 'center', valign: 'middle', fontFace: F.latin, fontSize: 15, bold: true, color: col, isTextBox: true });
    s.addText(h, { x: M + 1.0, y: y + 0.12, w: bw2 - 1.2, h: 0.3, margin: 0, valign: 'middle', fontFace: F.ko, fontSize: 13, bold: true, color: C.text, isTextBox: true });
    s.addText(b, { x: M + 1.0, y: y + 0.42, w: bw2 - 1.2, h: 0.3, margin: 0, fontFace: F.ko, fontSize: 10.5, color: C.muted, isTextBox: true });
  });

  const ix = M + bw2 + 0.4;
  const iw7 = 5.55, ih7 = iw7 / 1.276;   // 2500 x 1960 crop
  s.addImage({ path: `${SHOTS}/12-approval-main.png`, x: ix, y: 2.15, w: iw7, h: ih7 });
  s.addShape('roundRect', { x: ix, y: 2.15, w: iw7, h: ih7, rectRadius: 0.02, fill: { color: C.bg, transparency: 100 }, line: { color: C.border, width: 1 } });
  s.addText('승인 대기 큐 — 승인 / 거부 각각에 사유가 남고, 그대로 감사 로그가 됩니다.', {
    x: ix, y: 2.15 + ih7 + 0.12, w: iw7, h: 0.3, margin: 0, fontFace: F.ko, fontSize: 10, color: C.muted, isTextBox: true });
  s.addText('평균 승인 처리 시간 10분 이내를 목표로 설계했습니다.', {
    x: M, y: 6.32, w: COL, h: 0.3, margin: 0, fontFace: F.ko, fontSize: 12, bold: true, color: C.warn, isTextBox: true });
  foot(s, n, FOOT);
}

/* ───────────────────────── 8. 기능 맵 ───────────────────────── */
{
  const s = New(); n = 8;
  title(s, '8개 카테고리 · 32개 모듈', { kicker: 'FUNCTIONAL MAP' });
  sub(s, '모든 모듈이 같은 구조를 따릅니다 — 사용 시나리오 / 내부 로직 / 목표·가드레일 / 산출물.', 1.42);

  const cats = [
    ['시스템 개요', 1, ['통합 대시보드'], C.text],
    ['AI 품질', 5, ['실시간 불량률', '비전검사 뷰어', '불량 유형 분석', '온도-불량 상관', '품질 이력 검색'], C.accent],
    ['AI 설비예지보전', 5, ['설비 상태 종합', '진동/온도 추세', 'RUL 잔여수명', '보전 작업 오더', '보전 이력 조회'], C.cyan],
    ['AI 생산 최적화', 5, ['라인별 가동 현황', 'OEE 대시보드', '택트타임 분석', '배치별 생산 이력', '계획 대비 실적'], C.violet],
    ['AI 에너지', 3, ['전력 사용 현황', '에너지 비용 분석', '피크 부하 관리'], C.warn],
    ['AI 안전', 3, ['CCTV 화재 감시', 'AMR 충돌 방지', '긴급 정지·알람'], C.danger],
    ['AI 슈퍼바이저', 5, ['AI 챗봇', 'AI 추천 액션', 'Agent 실행 이력', '승인 대기 큐', '슈퍼바이저 센터'], '38BDF8'],
    ['시스템 관리', 5, ['온톨로지 관리', '모델 레지스트리', '사용자/권한', '시스템 모니터링', '알림 설정'], C.muted],
  ];
  const cw = (COL - 0.26 * 3) / 4, ch = 2.14;
  cats.forEach(([name, cnt, mods, col], i) => {
    const x = M + (i % 4) * (cw + 0.26);
    const y = 2.1 + Math.floor(i / 4) * (ch + 0.26);
    card(s, { x, y, w: cw, h: ch });
    s.addText(name, { x: x + 0.24, y: y + 0.2, w: cw - 0.9, h: 0.3, margin: 0, valign: 'middle', fontFace: F.ko, fontSize: 13, bold: true, color: col, isTextBox: true });
    s.addText(String(cnt), { x: x + cw - 0.68, y: y + 0.2, w: 0.44, h: 0.3, margin: 0, align: 'right', valign: 'middle', fontFace: F.latin, fontSize: 15, bold: true, color: col, isTextBox: true });
    s.addText(mods.map((m, j) => ({ text: m, options: { bullet: true, breakLine: j < mods.length - 1 } })), {
      x: x + 0.24, y: y + 0.56, w: cw - 0.48, h: ch - 0.76, margin: 0,
      fontFace: F.ko, fontSize: 10, color: C.muted, paraSpaceAfter: 3, isTextBox: true });
  });
  foot(s, n, FOOT);
}

/* ───────────────────────── 9. 시나리오 4종 ───────────────────────── */
{
  const s = New(); n = 9;
  title(s, '네 가지 체험 시나리오', { kicker: 'SCENARIOS' });
  sub(s, '각 시나리오는 4단계로 진행되며, 관람객이 직접 승인 버튼을 눌러 결과를 바꿔볼 수 있습니다.', 1.42);

  const sc = [
    ['A', '전사 생산 극대화 & 통합 OEE', '생산 극대화 목표 아래 품질·예지보전·에너지·안전·물류 전 에이전트가 실시간으로 협업합니다.', '실시간 진단 → RUL 예측 → 지휘 타워 → 라이브 조율', C.accent],
    ['B', '돌발 고장 및 안전 예방 가드레일', '미세 가스 감지에서 시작해 공조 제어, 비전 감시, L1 Safety 정책까지 연쇄 대응합니다.', '초동 조치 → CCTV 감시 → 안전 우선 정책 → 배기 조율', C.danger],
    ['C', '피크 전력 한계 돌파 억제', '한낮 냉방 부하로 계약 전력 초과 30분 전, ESS와 유휴 AMR 배터리까지 동원합니다.', '피크 감시 → 부하 정비 → 탄소 정책 → ESS 셰이빙', C.warn],
    ['D', '긴급 러시 오더 & 불량 보증', '납기와 품질이 정면으로 충돌하는 상황에서 속도 120% 가속과 불량률 제로를 동시에 노립니다.', '초가속 모드 → 비전 검사 → SLA 가드 → 스크래치 방어', C.violet],
  ];
  const cw = (COL - 0.32) / 2, ch = 2.1;
  sc.forEach(([id, name, desc, steps, col], i) => {
    const x = M + (i % 2) * (cw + 0.32);
    const y = 2.12 + Math.floor(i / 2) * (ch + 0.28);
    card(s, { x, y, w: cw, h: ch });
    chip(s, { x: x + 0.3, y: y + 0.3, d: 0.44, label: id, fill: col, color: C.bg, size: 15 });
    s.addText(name, { x: x + 0.94, y: y + 0.28, w: cw - 1.24, h: 0.46, margin: 0, valign: 'middle', fontFace: F.ko, fontSize: 14.5, bold: true, color: C.text, isTextBox: true });
    s.addText(desc, { x: x + 0.3, y: y + 0.88, w: cw - 0.6, h: 0.66, margin: 0, lineSpacing: 17, fontFace: F.ko, fontSize: 11, color: C.muted, isTextBox: true });
    s.addText(steps, { x: x + 0.3, y: y + 1.56, w: cw - 0.6, h: 0.34, margin: 0, valign: 'middle', fontFace: F.ko, fontSize: 10, color: col, isTextBox: true });
  });
  foot(s, n, FOOT);
}

/* ───────────────────────── 10. 목표 지표 ───────────────────────── */
{
  const s = New(); n = 10;
  title(s, '모듈마다 숫자로 된 목표가 붙어 있습니다', { kicker: 'TARGETS & GUARDRAILS' });
  sub(s, '“AI를 도입했다”가 아니라 “무엇을 몇까지”가 각 화면에 명시되어 있습니다. 아래는 대표 지표입니다.', 1.42);

  s.addChart('bar', [{
    name: '목표치 (%)',
    labels: ['OEE 종합효율', '설비 가동률', '화재 감지 정확도', '자연어 응답 정확도', 'AI 추천 승인율', '시스템 가동률'],
    values: [85, 95, 99, 95, 90, 99.9],
  }], {
    x: M, y: 2.15, w: 7.4, h: 4.1,
    barDir: 'bar', barGapWidthPct: 45,
    chartColors: [C.accent],
    showTitle: true, title: '달성 목표 지표 (%)', titleColor: C.text, titleFontFace: F.ko, titleFontSize: 13,
    showValue: true, dataLabelPosition: 'outEnd', dataLabelColor: C.text, dataLabelFontFace: F.latin, dataLabelFontSize: 10,
    dataLabelFormatCode: '0.#"%"',
    catAxisLabelColor: C.muted, catAxisLabelFontFace: F.ko, catAxisLabelFontSize: 10,
    valAxisLabelColor: C.muted, valAxisLabelFontFace: F.latin, valAxisLabelFontSize: 9,
    valAxisMaxVal: 110, valAxisMinVal: 0,
    valGridLine: { color: C.border, size: 1 }, catGridLine: { style: 'none' },
    showLegend: false, plotArea: { fill: { color: C.bg } }, chartArea: { fill: { color: C.bg } },
  });

  const rx = M + 7.4 + 0.36, rw = COL - 7.4 - 0.36;
  const lat = [
    ['100 ms', '비상 정지 명령 전파'],
    ['50 ms', 'AMR 충돌 센서 처리'],
    ['2 초', '화재 감지 후 알림 전파'],
    ['72 시간', '고장 사전 예측 리드타임'],
    ['10 분', '승인 프로세스 평균 처리'],
  ];
  card(s, { x: rx, y: 2.15, w: rw, h: 4.1 });
  s.addText('시간 제약', { x: rx + 0.3, y: 2.36, w: rw - 0.6, h: 0.3, margin: 0, fontFace: F.ko, fontSize: 13, bold: true, color: C.text, isTextBox: true });
  lat.forEach(([v, l], i) => {
    const y = 2.82 + i * 0.66;
    s.addText(v, { x: rx + 0.3, y, w: 1.5, h: 0.32, margin: 0, valign: 'middle', fontFace: F.latin, fontSize: 16, bold: true, color: C.warn, isTextBox: true });
    s.addText(l, { x: rx + 0.3, y: y + 0.3, w: rw - 0.6, h: 0.26, margin: 0, fontFace: F.ko, fontSize: 10, color: C.muted, isTextBox: true });
  });
  foot(s, n, FOOT);
}

/* ───────────────────────── 11. 부스 체험 흐름 ───────────────────────── */
{
  const s = New(); n = 11;
  title(s, '설명 없이도 굴러가는 부스 데모', { kicker: 'EXHIBITION' });
  sub(s, '관람객이 혼자 들어와도 3초 안에 무엇을 눌러야 할지 알 수 있도록 설계했습니다.', 1.42);

  s.addImage({ path: `${SHOTS}/01-landing.png`, x: M, y: 2.05, w: 7.3, h: 4.47 });
  s.addShape('roundRect', { x: M, y: 2.05, w: 7.3, h: 4.47, rectRadius: 0.02, fill: { color: C.bg, transparency: 100 }, line: { color: C.border, width: 1 } });

  const bx = M + 7.3 + 0.36, bw = COL - 7.3 - 0.36;
  const flow = [
    ['진입', '3개의 경로 — 시나리오 선택 / 바로 시작 / 관리자 모드. 관람객은 앞의 둘만 씁니다.'],
    ['가이드', '화면 좌측에 체험 가이드가 붙어 단계·미션·체크리스트를 안내합니다.'],
    ['조작', '“이 버튼을 눌러보세요” 수준까지 지시합니다. 안내자가 없어도 진행됩니다.'],
    ['완료', '4단계를 마치면 미션 달성 배너가 뜨고 처음으로 돌아갑니다.'],
  ];
  let y = 2.05;
  flow.forEach(([h, b], i) => {
    chip(s, { x: bx, y: y + 0.02, d: 0.34, label: String(i + 1), fill: C.warn, color: C.bg, size: 11 });
    s.addText(h, { x: bx + 0.48, y, w: bw - 0.48, h: 0.3, margin: 0, valign: 'middle', fontFace: F.ko, fontSize: 14, bold: true, color: C.text, isTextBox: true });
    s.addText(b, { x: bx + 0.48, y: y + 0.32, w: bw - 0.48, h: 0.76, margin: 0, lineSpacing: 16, fontFace: F.ko, fontSize: 11, color: C.muted, isTextBox: true });
    y += 1.14;
  });
  s.addText('특정 전시회 이름이 화면에 남지 않습니다.\n어느 전시회에서도 그대로 사용할 수 있습니다.', {
    x: bx, y: 6.48, w: bw, h: 0.6, margin: 0, lineSpacing: 16, fontFace: F.ko, fontSize: 10.5, italic: true, color: C.accent, isTextBox: true });
  foot(s, n, FOOT);
}

/* ───────────────────────── 12. 다국어 · 테마 ───────────────────────── */
{
  const s = New(); n = 12;
  title(s, '일본어 · 영어 · 한국어, 다크 / 라이트', { kicker: 'LOCALIZATION' });
  sub(s, '1,449개 문자열을 카탈로그로 관리합니다. 언어를 바꿔도 진행 중인 투어와 대화 이력은 유지됩니다.', 1.42);

  const iw = (COL - 0.36) / 2;
  s.addImage({ path: `${SHOTS}/30-dashboard-ja.png`, x: M, y: 2.1, w: iw, h: 3.19 });
  s.addShape('roundRect', { x: M, y: 2.1, w: iw, h: 3.19, rectRadius: 0.02, fill: { color: C.bg, transparency: 100 }, line: { color: C.border, width: 1 } });
  s.addText('日本語 · 다크 테마 (기본값)', { x: M, y: 5.36, w: iw, h: 0.3, margin: 0, fontFace: F.ko, fontSize: 11, bold: true, color: C.accent, isTextBox: true });

  s.addImage({ path: `${SHOTS}/31-dashboard-en-light.png`, x: M + iw + 0.36, y: 2.1, w: iw, h: 3.19 });
  s.addShape('roundRect', { x: M + iw + 0.36, y: 2.1, w: iw, h: 3.19, rectRadius: 0.02, fill: { color: C.bg, transparency: 100 }, line: { color: C.border, width: 1 } });
  s.addText('English · 라이트 테마', { x: M + iw + 0.36, y: 5.36, w: iw, h: 0.3, margin: 0, fontFace: F.ko, fontSize: 11, bold: true, color: C.cyan, isTextBox: true });

  const facts = [
    ['자동 감지', '브라우저 언어를 읽어 첫 화면부터 맞춥니다.'],
    ['상태 보존', '언어를 바꿔도 화면이 다시 로드되지 않습니다.'],
    ['AI 응답', '슈퍼바이저 챗봇도 선택한 언어로 답합니다.'],
  ];
  const fw = (COL - 0.4 * 2) / 3;
  facts.forEach(([h, b], i) => {
    const x = M + i * (fw + 0.4);
    s.addText(h, { x, y: 5.85, w: fw, h: 0.28, margin: 0, fontFace: F.ko, fontSize: 12, bold: true, color: C.text, isTextBox: true });
    s.addText(b, { x, y: 6.14, w: fw, h: 0.5, margin: 0, lineSpacing: 15, fontFace: F.ko, fontSize: 10.5, color: C.muted, isTextBox: true });
  });
  foot(s, n, FOOT);
}

/* ───────────────────────── 13. 기술 스택 ───────────────────────── */
{
  const s = New(); n = 13;
  title(s, '기술 구성과 운영', { kicker: 'TECHNOLOGY' });
  sub(s, '화면은 정적 사이트로 배포되고, AI 키는 브라우저에 실리지 않습니다.', 1.42);

  const groups = [
    ['프론트엔드', ['React 19 · Vite 6', 'Tailwind CSS v4', 'Recharts · motion', '초기 번들 412 KB (gzip)'], C.accent],
    ['AI · 데이터', ['Gemini (Supervisor)', 'YOLOv8 · PatchCore', 'GBR 잔여수명 예측', 'Kafka · TimescaleDB · Neo4j'], C.cyan],
    ['보안', ['키는 Cloudflare Worker에 보관', '번들에 자격증명 없음', '데모 모드 기본 동작', 'RBAC 역할 기반 접근'], C.warn],
    ['배포', ['GitHub Actions 자동 배포', '배포 후 브라우저 검증', '커밋 해시 대조 확인', '일 1회 상태 점검'], C.violet],
  ];
  const cw = (COL - 0.28 * 3) / 4;
  groups.forEach(([name, items, col], i) => {
    const x = M + i * (cw + 0.28);
    card(s, { x, y: 2.15, w: cw, h: 2.6 });
    s.addText(name, { x: x + 0.26, y: 2.38, w: cw - 0.52, h: 0.32, margin: 0, fontFace: F.ko, fontSize: 14, bold: true, color: col, isTextBox: true });
    s.addText(items.map((m, j) => ({ text: m, options: { bullet: true, breakLine: j < items.length - 1 } })), {
      x: x + 0.26, y: 2.78, w: cw - 0.52, h: 1.8, margin: 0,
      fontFace: F.ko, fontSize: 10.5, color: C.muted, paraSpaceAfter: 5, isTextBox: true });
  });

  card(s, { x: M, y: 5.05, w: COL, h: 1.3, fill: C.accent, trans: 90, line: C.accent });
  s.addText('데모 모드', { x: M + 0.42, y: 5.24, w: 2, h: 0.3, margin: 0, fontFace: F.ko, fontSize: 12, bold: true, color: C.accent, isTextBox: true });
  s.addText('API 키가 없어도 플랫폼 전체가 동작합니다. 챗봇과 추천 엔진은 내장된 공장 시뮬레이션에서 답을 만들고, AI 출력에는 “데모” 배지가 붙습니다.\n네트워크가 끊긴 전시장에서도 시연이 멈추지 않습니다. 실제 모델 연결이 필요하면 Worker 프록시를 켜기만 하면 됩니다.', {
    x: M + 0.42, y: 5.55, w: COL - 0.84, h: 0.7, margin: 0, lineSpacing: 18,
    fontFace: F.ko, fontSize: 11.5, color: C.text, isTextBox: true });
  foot(s, n, FOOT);
}

/* ───────────────────────── 14. 마무리 ───────────────────────── */
{
  const s = New(); n = 14;
  s.addShape('ellipse', { x: -2.2, y: 3.4, w: 8, h: 8, fill: { color: C.accent, transparency: 95 }, line: { color: C.accent, width: 1, transparency: 85 } });

  s.addText('요약', { x: M, y: 1.2, w: COL, h: 0.3, margin: 0, fontFace: F.latin, fontSize: 11, bold: true, color: C.accent, charSpacing: 2, isTextBox: true });
  s.addText('보여주는 대시보드가 아니라,\n결론을 내는 플랫폼입니다.', {
    x: M, y: 1.62, w: 8.4, h: 1.5, margin: 0, lineSpacing: 46,
    fontFace: F.ko, fontSize: 34, bold: true, color: C.text, isTextBox: true });

  const closing = [
    ['협의', '에이전트끼리 반대하고 조율하는 과정을 그대로 보여줍니다.'],
    ['승인', '중요한 제어는 사람 손을 거쳐야만 나갑니다.'],
    ['근거', '모든 판단이 이력으로 남아 사후에 검증됩니다.'],
  ];
  const cw = (COL - 0.4 * 2) / 3;
  closing.forEach(([h, b], i) => {
    const x = M + i * (cw + 0.4);
    card(s, { x, y: 3.5, w: cw, h: 1.42 });
    s.addText(h, { x: x + 0.3, y: 3.72, w: cw - 0.6, h: 0.34, margin: 0, fontFace: F.ko, fontSize: 17, bold: true, color: C.accent, isTextBox: true });
    s.addText(b, { x: x + 0.3, y: 4.1, w: cw - 0.6, h: 0.66, margin: 0, lineSpacing: 17, fontFace: F.ko, fontSize: 11, color: C.muted, isTextBox: true });
  });

  s.addText('IMPIX AI ORCHESTRATION PLATFORM', { x: M, y: 5.6, w: COL, h: 0.3, margin: 0, fontFace: F.latin, fontSize: 12, bold: true, color: C.text, charSpacing: 2, isTextBox: true });
  s.addText('日本語 · English · 한국어  |  다크 / 라이트 테마  |  데모 모드 지원', { x: M, y: 5.94, w: COL, h: 0.3, margin: 0, fontFace: F.ko, fontSize: 11, color: C.muted, isTextBox: true });
  foot(s, n, FOOT);
}

const out = '/home/user/impix-ai-orchestration-platform/docs/IMPIX_AI_플랫폼_소개서.pptx';
await pres.writeFile({ fileName: out });
console.log('wrote', out);
