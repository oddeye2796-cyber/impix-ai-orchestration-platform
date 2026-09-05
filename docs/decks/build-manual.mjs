import pptxgen from 'pptxgenjs';
import { fileURLToPath } from 'node:url';
import { C, F, W, H, M, COL, page, card, chip, title, sub, foot, SHOTS, useLocale, tr, reportMissing } from './theme.mjs';

// One generator per deck, one copy file per language. DECK_LOCALE picks which.
const LOCALE = process.env.DECK_LOCALE || 'ko';
const { copy, manualFile } = await import(`./copy/${LOCALE}.mjs`);
useLocale(LOCALE, copy);

const pres = new pptxgen();
pres.layout = 'LAYOUT_WIDE';
pres.author = 'IMPIX AI';
pres.title = tr('IMPIX AI Orchestration Platform 사용 매뉴얼');

const FOOT = tr('IMPIX AI Orchestration Platform · 사용 매뉴얼');
const New = () => { const s = pres.addSlide(); page(s); return s; };
const framed = (s, file, x, y, w, aspect) => {
  const h = w / aspect;
  s.addImage({ path: `${SHOTS.path}/${file}`, x, y, w, h });
  s.addShape('roundRect', { x, y, w, h, rectRadius: 0.02, fill: { color: C.bg, transparency: 100 }, line: { color: C.border, width: 1 } });
  return h;
};
const caption = (s, text, x, y, w) => s.addText(text, {
  x, y, w, h: 0.3, margin: 0, fontFace: F.ko, fontSize: 10, color: C.muted, isTextBox: true });

/** Numbered step list — the manual's workhorse layout. */
const steps = (s, items, { x, y, w, gap = 1.06, color = C.accent, size = 13 } = {}) => {
  items.forEach(([h, b], i) => {
    const yy = y + i * gap;
    chip(s, { x, y: yy + 0.02, d: 0.34, label: String(i + 1), fill: color, color: C.bg, size: 11 });
    s.addText(h, { x: x + 0.48, y: yy, w: w - 0.48, h: 0.3, margin: 0, valign: 'middle', fontFace: F.ko, fontSize: size, bold: true, color: C.text, isTextBox: true });
    s.addText(b, { x: x + 0.48, y: yy + 0.32, w: w - 0.48, h: gap - 0.4, margin: 0, lineSpacing: 16, fontFace: F.ko, fontSize: 10.5, color: C.muted, isTextBox: true });
  });
};

/** Two-column reference table on a card. */
const table = (s, { x, y, w, rows, head, colW, rowH = 0.34, fontSize = 10 }) => {
  s.addText(head.map((t, i) => ({ text: t, options: { bold: true, color: C.accent } })).length ? head[0] : '', { x: -9, y: -9, w: 1, h: 0.1, isTextBox: true }); // no-op guard
  head.forEach((t, i) => {
    const cx = x + colW.slice(0, i).reduce((a, b) => a + b, 0);
    s.addText(t, { x: cx, y, w: colW[i], h: 0.3, margin: 0, fontFace: F.ko, fontSize: 9.5, bold: true, color: C.accent, charSpacing: 1, isTextBox: true });
  });
  rows.forEach((r, ri) => {
    const yy = y + 0.36 + ri * rowH;
    if (ri % 2 === 1) s.addShape('rect', { x: x - 0.12, y: yy - 0.03, w: w + 0.24, h: rowH, fill: { color: C.surface, transparency: 40 }, line: { color: C.surface, width: 0 } });
    r.forEach((t, ci) => {
      const cx = x + colW.slice(0, ci).reduce((a, b) => a + b, 0);
      s.addText(t, { x: cx, y: yy, w: colW[ci], h: rowH - 0.02, margin: 0, valign: 'middle',
        fontFace: F.ko, fontSize, color: ci === 0 ? C.text : C.muted, bold: ci === 0, isTextBox: true });
    });
  });
};

/* ═══ 1. 표지 ═══ */
{
  const s = New();
  s.addShape('ellipse', { x: 8.9, y: -1.9, w: 7.6, h: 7.6, fill: { color: C.cyan, transparency: 95 }, line: { color: C.cyan, width: 1, transparency: 84 } });
  s.addShape('roundRect', { x: M, y: 1.55, w: 0.5, h: 0.5, rectRadius: 0.3, fill: { color: C.accent }, line: { color: C.accent, width: 0 } });
  s.addText('IMPIX AI', { x: M + 0.68, y: 1.51, w: 4, h: 0.56, margin: 0, valign: 'middle', fontFace: F.latin, fontSize: 20, bold: true, color: C.text, isTextBox: true });
  s.addText('ORCHESTRATION PLATFORM', { x: M + 0.68, y: 2.01, w: 5, h: 0.3, margin: 0, fontFace: F.latin, fontSize: 10, color: C.muted, charSpacing: 3, isTextBox: true });

  s.addText(tr('사용 매뉴얼'), { x: M, y: 2.9, w: 8, h: 1.0, margin: 0, fontFace: F.ko, fontSize: 46, bold: true, color: C.text, isTextBox: true });
  s.addText(tr('시나리오와 기능 중심'), { x: M, y: 3.95, w: 8, h: 0.5, margin: 0, fontFace: F.ko, fontSize: 20, color: C.accent, isTextBox: true });
  s.addText(tr('처음 화면을 여는 것부터 32개 모듈을 읽는 법, 네 가지 체험 시나리오를 진행하는 법,\nAI 연결을 바꾸는 법까지 화면 순서 그대로 정리했습니다.'), {
    x: M, y: 4.75, w: 8.3, h: 0.8, margin: 0, lineSpacing: 22, fontFace: F.ko, fontSize: 13, color: C.muted, isTextBox: true });

  const tags = [tr('20 페이지'), tr('32 모듈'), tr('4 시나리오'), tr('3 개 언어')];
  tags.forEach((t, i) => {
    const x = M + i * 1.95;
    s.addShape('roundRect', { x, y: 5.95, w: 1.75, h: 0.4, rectRadius: 0.1, fill: { color: C.surface }, line: { color: C.border, width: 1 } });
    s.addText(t, { x, y: 5.95, w: 1.75, h: 0.4, margin: 0, align: 'center', valign: 'middle', fontFace: F.ko, fontSize: 11, color: C.text, isTextBox: true });
  });
}

/* ═══ 2. 매뉴얼 구성 ═══ */
{
  const s = New();
  title(s, tr('이 매뉴얼의 구성'), { kicker: 'HOW TO READ' });
  sub(s, tr('앞쪽은 “화면을 처음 여는 사람”, 뒤쪽은 “부스에서 시연하거나 운영하는 사람”을 위한 내용입니다.'), 1.42);

  const parts = [
    ['Part 1', tr('기본 조작'), '03 – 07', [tr('접속과 진입 경로'), tr('화면 구성'), tr('언어 · 테마 전환'), tr('대시보드 읽는 법'), tr('AI 추천 카드 다루기')], C.accent],
    ['Part 2', tr('기능 모듈'), '08 – 12', [tr('승인 대기 큐'), tr('모듈 화면의 공통 구조'), tr('카테고리별 모듈 목록'), tr('슈퍼바이저 센터')], C.cyan],
    ['Part 3', tr('시연 운영'), '13 – 17', [tr('오케스트레이션 조작'), tr('AI 챗봇 사용법'), tr('셀프 시연 가이드'), tr('시나리오 A–D 진행표')], C.warn],
    ['Part 4', tr('설정과 대처'), '18 – 20', [tr('AI 연결 설정'), tr('자주 겪는 상황'), tr('역할별 권장 화면')], C.violet],
  ];
  const cw = (COL - 0.3 * 3) / 4;
  parts.forEach(([p, name, range, items, col], i) => {
    const x = M + i * (cw + 0.3);
    card(s, { x, y: 2.15, w: cw, h: 3.1 });
    s.addText(p, { x: x + 0.28, y: 2.38, w: cw - 0.56, h: 0.26, margin: 0, fontFace: F.latin, fontSize: 10, bold: true, color: col, charSpacing: 1, isTextBox: true });
    s.addText(name, { x: x + 0.28, y: 2.66, w: cw - 0.56, h: 0.36, margin: 0, fontFace: F.ko, fontSize: 17, bold: true, color: C.text, isTextBox: true });
    s.addText(`p. ${range}`, { x: x + 0.28, y: 3.04, w: cw - 0.56, h: 0.26, margin: 0, fontFace: F.latin, fontSize: 10, color: C.dim, isTextBox: true });
    s.addText(items.map((m, j) => ({ text: m, options: { bullet: true, breakLine: j < items.length - 1 } })), {
      x: x + 0.28, y: 3.42, w: cw - 0.56, h: 1.7, margin: 0, fontFace: F.ko, fontSize: 10.5, color: C.muted, paraSpaceAfter: 6, isTextBox: true });
  });

  card(s, { x: M, y: 5.5, w: COL, h: 0.9, fill: C.accent, trans: 90, line: C.accent });
  s.addText(tr('표기 규칙'), { x: M + 0.4, y: 5.68, w: 1.4, h: 0.28, margin: 0, fontFace: F.ko, fontSize: 11, bold: true, color: C.accent, isTextBox: true });
  s.addText(tr('[버튼] 은 클릭할 대상, 「메뉴」 는 좌측 사이드바의 항목, · 표시는 화면에 그대로 적힌 문구를 뜻합니다.'), {
    x: M + 1.9, y: 5.68, w: COL - 2.3, h: 0.5, margin: 0, fontFace: F.ko, fontSize: 11.5, color: C.text, isTextBox: true });
  foot(s, 2, FOOT);
}

/* ═══ 3. 시작하기 ═══ */
{
  const s = New();
  title(s, tr('접속과 세 가지 진입 경로'), { kicker: tr('01 · 시작하기') });
  sub(s, tr('주소를 열면 랜딩 화면이 먼저 나옵니다. 여기서 어디로 들어가느냐에 따라 화면 구성이 달라집니다.'), 1.42);

  const ih = framed(s, '01-landing.png', M, 2.05, 7.1, 1.633);
  caption(s, tr('랜딩 화면 — 관람객이 가장 먼저 보는 화면'), M, 2.05 + ih + 0.12, 7.1);

  const bx = M + 7.1 + 0.42, bw = COL - 7.1 - 0.42;
  const routes = [
    [tr('[시나리오 선택하기]'), tr('네 가지 중 하나를 고른 뒤 카운트다운을 거쳐 시작합니다. 부스 관람객에게 가장 권장하는 경로입니다.')],
    [tr('[바로 시작하기 ⚡]'), tr('시나리오 A로 곧바로 진입합니다. 대기 줄이 길 때 쓰면 좋습니다.')],
    [tr('[관리자 모드로 입장 →]'), tr('가이드 없이 32개 모듈 전체를 자유롭게 둘러봅니다. 설명용·검토용 경로입니다.')],
  ];
  steps(s, routes, { x: bx, y: 2.05, w: bw, gap: 1.32, color: C.warn, size: 12.5 });

  card(s, { x: bx, y: 6.05, w: bw, h: 0.95, fill: C.warn, trans: 90, line: C.warn });
  s.addText(tr('화면 하단의 「빠른 시나리오 선택」 4개 카드로도 바로 진입할 수 있습니다.'), {
    x: bx + 0.28, y: 6.24, w: bw - 0.56, h: 0.6, margin: 0, lineSpacing: 16, fontFace: F.ko, fontSize: 10.5, color: C.text, isTextBox: true });
  foot(s, 3, FOOT);
}

/* ═══ 4. 화면 구성 ═══ */
{
  const s = New();
  title(s, tr('화면 구성'), { kicker: tr('02 · 기본 조작') });
  sub(s, tr('어느 모듈에 들어가도 이 세 영역의 위치는 바뀌지 않습니다.'), 1.42);

  const hh = framed(s, '10-header.png', M, 1.95, COL, 20.308);
  caption(s, tr('상단 헤더 — 현재 위치 / 시연 가이드 / 검색 / 테마 / 언어 / 알림 / 설정'), M, 1.95 + hh + 0.08, COL);

  framed(s, '10-dashboard.png', M, 2.92, 6.4, 1.633);

  const bx = M + 6.4 + 0.42, bw = COL - 6.4 - 0.42;
  const areas = [
    [tr('좌측 사이드바'), tr('8개 카테고리 아래 32개 모듈이 접혀 있습니다. 상단 [×] 로 접었다 펼 수 있습니다.'), C.accent],
    [tr('상단 헤더'), tr('왼쪽부터 현재 위치 표시, 시연 가이드 시작 버튼, 검색창, 테마 · 언어 전환, 알림, 설정 순입니다.'), C.cyan],
    [tr('본문 영역'), tr('선택한 모듈의 내용이 표시됩니다. 우측 하단의 원형 버튼은 AI 챗봇입니다.'), C.warn],
  ];
  let y = 2.92;
  areas.forEach(([h, b, col], i) => {
    s.addShape('roundRect', { x: bx, y: y + 0.04, w: 0.16, h: 0.16, rectRadius: 0.08, fill: { color: col }, line: { color: col, width: 0 } });
    s.addText(h, { x: bx + 0.32, y, w: bw - 0.32, h: 0.3, margin: 0, valign: 'middle', fontFace: F.ko, fontSize: 14, bold: true, color: C.text, isTextBox: true });
    s.addText(b, { x: bx + 0.32, y: y + 0.34, w: bw - 0.32, h: 0.9, margin: 0, lineSpacing: 16, fontFace: F.ko, fontSize: 10.5, color: C.muted, isTextBox: true });
    y += 1.32;
  });
  foot(s, 4, FOOT);
}

/* ═══ 5. 언어와 테마 ═══ */
{
  const s = New();
  title(s, tr('언어와 테마 바꾸기'), { kicker: tr('03 · 기본 조작') });
  sub(s, tr('헤더 오른쪽에 나란히 있습니다. 선택은 브라우저에 저장되어 다음 방문에도 유지됩니다.'), 1.42);

  const cw = (COL - 0.4) / 2;
  card(s, { x: M, y: 2.05, w: cw, h: 1.85 });
  s.addText(tr('언어'), { x: M + 0.34, y: 2.22, w: cw - 0.68, h: 0.34, margin: 0, fontFace: F.ko, fontSize: 17, bold: true, color: C.accent, isTextBox: true });
  s.addText(tr('헤더의 지구본 아이콘(현재 언어가 KO / JA / EN 로 표시)을 눌러 전환합니다. 랜딩 화면에서는 우측 상단의 「日本語 / English / 한국어」 버튼을 씁니다.'), {
    x: M + 0.34, y: 2.6, w: cw - 0.68, h: 0.86, margin: 0, lineSpacing: 17, fontFace: F.ko, fontSize: 11, color: C.muted, isTextBox: true });
  s.addText(tr('진행 중이던 시나리오 단계와 챗봇 대화는 그대로 유지됩니다.'), {
    x: M + 0.34, y: 3.46, w: cw - 0.68, h: 0.34, margin: 0, fontFace: F.ko, fontSize: 10.5, italic: true, color: C.accent, isTextBox: true });

  const x2 = M + cw + 0.4;
  card(s, { x: x2, y: 2.05, w: cw, h: 1.85 });
  s.addText(tr('테마'), { x: x2 + 0.34, y: 2.22, w: cw - 0.68, h: 0.34, margin: 0, fontFace: F.ko, fontSize: 17, bold: true, color: C.cyan, isTextBox: true });
  s.addText(tr('해 · 달 · 모니터 세 개 아이콘이 각각 라이트 / 다크 / 기기 설정 따르기입니다. 기본값은 다크이며, 밝은 부스 조명에서는 라이트가 읽기 쉽습니다.'), {
    x: x2 + 0.34, y: 2.6, w: cw - 0.68, h: 0.86, margin: 0, lineSpacing: 17, fontFace: F.ko, fontSize: 11, color: C.muted, isTextBox: true });
  s.addText(tr('차트 색상도 테마에 맞춰 함께 바뀝니다.'), {
    x: x2 + 0.34, y: 3.46, w: cw - 0.68, h: 0.34, margin: 0, fontFace: F.ko, fontSize: 10.5, italic: true, color: C.cyan, isTextBox: true });

  const ch5 = framed(s, '10-controls.png', M, 4.24, 3.3, 4.316);
  caption(s, tr('헤더의 테마 · 언어 컨트롤'), M, 4.24 + ch5 + 0.1, 3.3);

  const iw = 3.9, ix1 = M + 3.3 + 0.5, ix2 = ix1 + iw + 0.3;
  const ih = framed(s, '30-dashboard-ja.png', ix1, 4.14, iw, 1.633);
  caption(s, tr('日本語 · 다크'), ix1, 4.14 + ih + 0.1, iw);
  framed(s, '31-dashboard-en-light.png', ix2, 4.14, iw, 1.633);
  caption(s, tr('English · 라이트'), ix2, 4.14 + ih + 0.1, iw);
  foot(s, 5, FOOT);
}

/* ═══ 6. 대시보드 읽는 법 ═══ */
{
  const s = New();
  title(s, tr('통합 대시보드 읽는 법'), { kicker: tr('04 · 기본 조작') });
  sub(s, tr('상단 KPI 네 개는 내장된 공장 시뮬레이션에서 계산되며, 몇 초마다 실제로 움직입니다.'), 1.42);

  const kpi = [
    ['OEE', tr('종합 설비 효율'), tr('가동률 × 성능 × 품질. 85% 이상이 목표이며, 아래 증감 표시는 직전 값 대비 변화입니다.'), C.accent],
    ['DEFECT RATE', tr('불량률'), tr('5%를 넘으면 경고, 8%를 넘으면 위험입니다. 품질 에이전트가 이 값에 반응해 추천을 만듭니다.'), C.danger],
    ['ENERGY', tr('전력 소비'), tr('전 라인 합산 사용량(kWh). 피크 시간대에는 에너지 에이전트가 감속 제안을 올립니다.'), C.warn],
    ['ACTIVE AGENTS', tr('가동 중 에이전트'), tr('6개 중 몇 개가 응답 중인지 보여줍니다. 6 / 6 이 정상입니다.'), C.cyan],
  ];
  const cw = (COL - 0.28 * 3) / 4;
  kpi.forEach(([en, ko, desc, col], i) => {
    const x = M + i * (cw + 0.28);
    card(s, { x, y: 2.12, w: cw, h: 1.95 });
    s.addText(en, { x: x + 0.26, y: 2.32, w: cw - 0.52, h: 0.26, margin: 0, fontFace: F.latin, fontSize: 9.5, bold: true, color: col, charSpacing: 1, isTextBox: true });
    s.addText(ko, { x: x + 0.26, y: 2.6, w: cw - 0.52, h: 0.34, margin: 0, fontFace: F.ko, fontSize: 15, bold: true, color: C.text, isTextBox: true });
    s.addText(desc, { x: x + 0.26, y: 3.0, w: cw - 0.52, h: 0.94, margin: 0, lineSpacing: 15, fontFace: F.ko, fontSize: 10, color: C.muted, isTextBox: true });
  });

  const items = [
    ['Real-time Sensor Monitoring', tr('[VIBRATION] / [TEMPERATURE] 탭으로 진동과 온도 추이를 번갈아 봅니다.')],
    ['Defect Rate by Category', tr('찢김 · 기포 · 변색 · 라벨누락 · 기타 다섯 유형의 발생 빈도입니다.')],
    ['System Health & Infrastructure', tr('각 인프라 구성요소의 응답 지연(ms)입니다. 주황색은 주의 구간을 뜻합니다.')],
    ['AI Recommendations', tr('오른쪽 세로 패널. 다음 장에서 자세히 다룹니다.')],
  ];
  card(s, { x: M, y: 4.25, w: COL, h: 2.05 });
  s.addText(tr('본문에 놓인 네 개의 패널'), { x: M + 0.36, y: 4.44, w: COL - 0.72, h: 0.32, margin: 0, fontFace: F.ko, fontSize: 14, bold: true, color: C.text, isTextBox: true });
  const iw2 = (COL - 0.72 - 0.4) / 2;
  items.forEach(([h, b], i) => {
    const x = M + 0.36 + (i % 2) * (iw2 + 0.4);
    const y = 4.86 + Math.floor(i / 2) * 0.66;
    s.addText(h, { x, y, w: iw2, h: 0.26, margin: 0, fontFace: F.latin, fontSize: 11, bold: true, color: C.accent, isTextBox: true });
    s.addText(b, { x, y: y + 0.26, w: iw2, h: 0.36, margin: 0, fontFace: F.ko, fontSize: 10, color: C.muted, isTextBox: true });
  });
  foot(s, 6, FOOT);
}

/* ═══ 7. AI 추천 카드 ═══ */
{
  const s = New();
  title(s, tr('AI 추천 카드 다루기'), { kicker: tr('05 · 기본 조작') });
  sub(s, tr('대시보드 오른쪽 「AI Recommendations」 패널이 이 플랫폼에서 가장 자주 쓰는 조작입니다.'), 1.42);

  const ih = framed(s, '10-dashboard.png', M, 2.05, 7.2, 1.633);
  caption(s, tr('카드마다 어떤 에이전트가 언제 낸 제안인지 표시됩니다.'), M, 2.05 + ih + 0.12, 7.2);

  const bx = M + 7.2 + 0.42, bw = COL - 7.2 - 0.42;
  steps(s, [
    [tr('카드를 읽습니다'), tr('제목은 조치 내용, 본문은 그 근거입니다. 예: “불량률 7.3% 상승 → 수축 온도 173°C 조정 권장”.')],
    [tr('[Approve] 를 누릅니다'), tr('제안이 채택되어 제어 이력에 남고, 상단 KPI와 「AI 추천 액션 목록」에 반영됩니다.')],
    [tr('또는 [Reject]'), tr('거부 사유를 적는 칸이 화면 안에 열립니다. 사유도 함께 기록됩니다.')],
  ], { x: bx, y: 2.05, w: bw, gap: 1.36, color: C.accent, size: 12.5 });

  card(s, { x: bx, y: 6.2, w: bw, h: 0.85, fill: C.warn, trans: 90, line: C.warn });
  s.addText(tr('데모 배지가 붙어 있으면 응답이 내장 시뮬레이션에서 생성된 것입니다. 동작에는 차이가 없습니다.'), {
    x: bx + 0.28, y: 6.36, w: bw - 0.56, h: 0.56, margin: 0, lineSpacing: 15, fontFace: F.ko, fontSize: 10, color: C.text, isTextBox: true });
  foot(s, 7, FOOT);
}

/* ═══ 8. 승인 대기 큐 ═══ */
{
  const s = New();
  title(s, tr('승인 대기 큐 (Human Gate)'), { kicker: tr('06 · 기능 모듈') });
  sub(s, tr('「AI 슈퍼바이저 에이전트 → 승인 대기 큐」. Level 2 이상의 제어는 이곳을 거쳐야만 실행됩니다.'), 1.42);

  const ih = framed(s, '12-approval-main.png', M, 2.05, 5.6, 1.276);
  caption(s, tr('승인 대기 큐 — 좌측 네 패널이 모듈 설명, 하단이 실시간 미리보기입니다.'), M, 2.05 + ih + 0.1, 5.6);

  const bx = M + 5.6 + 0.42, bw = COL - 5.6 - 0.42;
  const rows = [
    ['Pending', tr('승인을 기다리는 건수입니다. 여기서 처리한 만큼 줄어듭니다.'), C.warn],
    ['Approved', tr('승인되어 실행된 건수입니다.'), C.accent],
    ['Rejected', tr('거부된 건수입니다. 사유가 함께 남습니다.'), C.danger],
  ];
  s.addText(tr('막대 차트 세 항목'), { x: bx, y: 2.05, w: bw, h: 0.32, margin: 0, fontFace: F.ko, fontSize: 15, bold: true, color: C.text, isTextBox: true });
  rows.forEach(([h, b, col], i) => {
    const y = 2.5 + i * 0.82;
    s.addText(h, { x: bx, y, w: bw, h: 0.26, margin: 0, fontFace: F.latin, fontSize: 12, bold: true, color: col, isTextBox: true });
    s.addText(b, { x: bx, y: y + 0.26, w: bw, h: 0.5, margin: 0, lineSpacing: 15, fontFace: F.ko, fontSize: 10.5, color: C.muted, isTextBox: true });
  });

  card(s, { x: bx, y: 5.1, w: bw, h: 1.85 });
  s.addText(tr('오른쪽 패널'), { x: bx + 0.28, y: 5.28, w: bw - 0.56, h: 0.3, margin: 0, fontFace: F.ko, fontSize: 13, bold: true, color: C.text, isTextBox: true });
  s.addText([
    { text: tr('Execution Trace — 모듈이 무엇을 했는지 시각별 로그'), options: { bullet: true, breakLine: true } },
    { text: tr('Access Control — 이 모듈을 볼 수 있는 역할 (공장장)'), options: { bullet: true, breakLine: true } },
    { text: tr('Orchestration Level — 현재 자율 수준 (L2 Autonomous)'), options: { bullet: true } },
  ], { x: bx + 0.28, y: 5.66, w: bw - 0.56, h: 1.1, margin: 0, fontFace: F.ko, fontSize: 10, color: C.muted, paraSpaceAfter: 6, isTextBox: true });
  foot(s, 8, FOOT);
}

/* ═══ 9. 모듈 공통 구조 ═══ */
{
  const s = New();
  title(s, tr('모듈 화면의 공통 구조'), { kicker: tr('07 · 기능 모듈') });
  sub(s, tr('32개 모듈이 모두 같은 네 개의 설명 패널을 갖습니다. 하나만 익히면 나머지 31개도 같은 방식으로 읽힙니다.'), 1.42);

  const panels = [
    ['USAGE SCENARIO', tr('사용 시나리오'), tr('이 모듈이 어떤 상황에서 쓰이는지'), C.cyan],
    ['INTERNAL LOGIC', tr('내부 로직'), tr('어떤 데이터가 어떤 순서로 처리되는지'), C.violet],
    ['TARGET / GUARDRAIL', tr('목표 · 가드레일'), tr('지켜야 할 수치와 임계치'), C.warn],
    ['EXPECTED OUTPUT', tr('산출물'), tr('화면이 최종적으로 무엇을 내놓는지'), C.accent],
  ];
  const cw = (COL - 0.28 * 3) / 4;
  panels.forEach(([en, ko, desc, col], i) => {
    const x = M + i * (cw + 0.28);
    card(s, { x, y: 2.05, w: cw, h: 1.42 });
    s.addText(en, { x: x + 0.26, y: 2.22, w: cw - 0.52, h: 0.26, margin: 0, fontFace: F.latin, fontSize: 9.5, bold: true, color: col, charSpacing: 1, isTextBox: true });
    s.addText(ko, { x: x + 0.26, y: 2.5, w: cw - 0.52, h: 0.32, margin: 0, fontFace: F.ko, fontSize: 15, bold: true, color: C.text, isTextBox: true });
    s.addText(desc, { x: x + 0.26, y: 2.86, w: cw - 0.52, h: 0.56, margin: 0, lineSpacing: 15, fontFace: F.ko, fontSize: 10, color: C.muted, isTextBox: true });
  });

  const ih = framed(s, '15-energy-panels.png', M, 3.7, 6.6, 2.907);
  caption(s, tr('예: 피크 부하 관리 — 어느 모듈을 열어도 같은 네 개의 패널이 먼저 나옵니다.'), M, 3.7 + ih + 0.1, 6.6);

  const bx = M + 6.6 + 0.42, bw = COL - 6.6 - 0.42;
  s.addText(tr('그 밖에 모든 모듈에 공통으로 있는 것'), { x: bx, y: 3.7, w: bw, h: 0.32, margin: 0, fontFace: F.ko, fontSize: 15, bold: true, color: C.text, isTextBox: true });
  const commons = [
    ['[Run Module]', tr('우측 상단. 모듈을 실행해 라이브 미리보기를 갱신합니다.')],
    ['Execution Trace', tr('실행 로그와 지연 시간(latency)이 시각과 함께 쌓입니다.')],
    ['Module Configuration', tr('접근 권한과 현재 자율 수준(L0–L3)을 보여줍니다.')],
    ['Module Execution Preview', tr('해당 모듈의 실시간 차트입니다.')],
  ];
  commons.forEach(([h, b], i) => {
    const y = 4.16 + i * 0.62;
    s.addText(h, { x: bx, y, w: bw, h: 0.26, margin: 0, fontFace: F.latin, fontSize: 11, bold: true, color: C.accent, isTextBox: true });
    s.addText(b, { x: bx, y: y + 0.24, w: bw, h: 0.34, margin: 0, fontFace: F.ko, fontSize: 10, color: C.muted, isTextBox: true });
  });
  foot(s, 9, FOOT);
}

/* ═══ 10-11. 모듈 목록 ═══ */
const MODS_A = [
  [tr('통합 대시보드'), tr('시스템 개요'), tr('전체'), tr('공장 전체 OEE · 불량률 · 에너지를 한눈에')],
  [tr('실시간 불량률 현황'), tr('AI 품질'), tr('오퍼레이터'), tr('라인별 불량률 게이지와 추세 (경고 5% / 위험 8%)')],
  [tr('비전검사 결과 뷰어'), tr('AI 품질'), tr('품질관리자'), tr('PatchCore · YOLOv8 검사 이미지와 판정')],
  [tr('불량 유형 분석'), tr('AI 품질'), tr('품질관리자'), tr('파레토 차트로 집중 관리 대상 도출')],
  [tr('온도-불량 상관분석'), tr('AI 품질'), tr('설비엔지니어'), tr('최적 운전 구간(Golden Batch) 165–180°C')],
  [tr('품질 이력 검색'), tr('AI 품질'), tr('품질관리자'), tr('배치 단위 추적성, 조회 1초 이내')],
  [tr('설비 상태 종합'), tr('AI 예지보전'), tr('오퍼레이터'), tr('디지털 트윈 기반 전 설비 상태')],
  [tr('진동/온도 추세'), tr('AI 예지보전'), tr('설비엔지니어'), tr('진동 3.5–5.0 mm/s, 온도 80°C 임계 검증')],
  [tr('RUL 잔여수명 예측'), tr('AI 예지보전'), tr('설비엔지니어'), tr('GBR 예측, 72시간 미만이면 워크오더 자동 생성')],
  [tr('보전 작업 오더'), tr('AI 예지보전'), tr('설비엔지니어'), tr('AI 추천 보전 항목의 워크플로우 관리')],
  [tr('보전 이력 조회'), tr('AI 예지보전'), tr('공장장'), tr('MTBF · MTTR 분석과 장기 보전 전략')],
  [tr('라인별 가동 현황'), tr('AI 생산최적화'), tr('오퍼레이터'), tr('Running / Idle / Down 및 병목 식별')],
  [tr('OEE 대시보드'), tr('AI 생산최적화'), tr('공장장'), tr('생산성 손실 요인 진단, 목표 85%')],
  [tr('택트타임 분석'), tr('AI 생산최적화'), tr('오퍼레이터'), tr('공정 간 편차 10% 이내 관리')],
  [tr('배치별 생산 이력'), tr('AI 생산최적화'), tr('품질관리자'), tr('전 공정 통합 추적, 역추적 5분 이내')],
  [tr('생산 계획 대비 실적'), tr('AI 생산최적화'), tr('공장장'), tr('납기 준수율과 계획 달성률')],
];
const MODS_B = [
  [tr('전력 사용 현황'), tr('AI 에너지'), tr('오퍼레이터'), tr('설비별 소비 패턴, 정격 120% 초과 시 경고')],
  [tr('에너지 비용 분석'), tr('AI 에너지'), tr('공장장'), tr('시간대별 요금 기반 부하 이동, 연 10% 절감')],
  [tr('피크 부하 관리'), tr('AI 에너지'), tr('설비엔지니어'), tr('계약 전력 90% 이내 유지, 자동 부하 제어')],
  [tr('지능형 CCTV 화재 감시'), tr('AI 안전'), tr('전체'), tr('화재·연기 감지 정확도 99%, 전파 2초')],
  [tr('AMR 충돌 방지 시스템'), tr('AI 안전'), tr('오퍼레이터'), tr('작업자 거리 계산, 처리 지연 50ms 이내')],
  [tr('긴급 정지 및 알람 제어'), tr('AI 안전'), tr('관리자'), tr('비상 정지 실행 100ms, 전파 성공률 100%')],
  [tr('AI 챗봇 (자연어 질의)'), tr('AI 슈퍼바이저'), tr('전체'), tr('자연어로 데이터 조회, 응답 3초 이내')],
  [tr('AI 추천 액션 목록'), tr('AI 슈퍼바이저'), tr('관리자'), tr('다중 에이전트 분석 기반 조치 추천')],
  [tr('Agent 실행 이력'), tr('AI 슈퍼바이저'), tr('관리자'), tr('판단 과정의 투명성과 사후 감사')],
  [tr('승인 대기 큐'), 'Human Gate', tr('공장장'), tr('HITL 승인 프로세스, 평균 10분 이내')],
  [tr('슈퍼바이저 센터'), tr('AI 슈퍼바이저'), tr('관리자'), tr('목표 분해와 에이전트 충돌 조정')],
  [tr('온톨로지 관리'), tr('시스템 관리'), tr('관리자'), tr('스키마 · 규칙 · 도메인 지식 관리')],
  [tr('모델 레지스트리'), tr('시스템 관리'), tr('관리자'), tr('MLOps 생애주기와 성능 모니터링')],
  [tr('사용자/권한 관리'), tr('시스템 관리'), tr('관리자'), tr('RBAC 역할 기반 접근 제어')],
  [tr('시스템 모니터링'), tr('시스템 관리'), tr('관리자'), tr('인프라 가용성, 가동률 99.9%')],
  [tr('알림 설정'), tr('시스템 관리'), tr('관리자'), tr('등급별 전파 정책과 다채널 수신')],
];
[[MODS_A, tr('모듈 목록 ①'), tr('시스템 개요 · 품질 · 예지보전 · 생산 최적화'), 10],
 [MODS_B, tr('모듈 목록 ②'), tr('에너지 · 안전 · 슈퍼바이저 · 시스템 관리'), 11]].forEach(([mods, t, st, pageNo]) => {
  const s = New();
  title(s, t, { kicker: tr('08 · 기능 모듈') });
  sub(s, st, 1.42);
  card(s, { x: M, y: 1.95, w: COL, h: 4.78 });
  table(s, {
    x: M + 0.34, y: 2.14, w: COL - 0.68,
    head: [tr('모듈'), tr('카테고리'), tr('주 사용 역할'), tr('무엇을 하는가')],
    colW: [2.85, 1.85, 1.5, COL - 0.68 - 6.2],
    rows: mods, rowH: 0.253, fontSize: 9.5,
  });
  foot(s, pageNo, FOOT);
});

/* ═══ 12. 슈퍼바이저 센터 ═══ */
{
  const s = New();
  title(s, tr('슈퍼바이저 센터'), { kicker: tr('09 · 기능 모듈') });
  sub(s, tr('「AI 슈퍼바이저 에이전트 → 슈퍼바이저 센터」. 여섯 에이전트를 지휘하는 화면입니다.'), 1.42);

  const ih = framed(s, '19-supervisor-main.png', M, 2.05, 5.6, 1.276);
  caption(s, tr('슈퍼바이저 센터 — 목표 · 충돌 · 합의가 한 화면에 모입니다.'), M, 2.05 + ih + 0.1, 5.6);

  const bx = M + 5.6 + 0.42, bw = COL - 5.6 - 0.42;
  const blocks = [
    ['Active Goal', tr('전사 목표와, 각 에이전트가 맡은 하위 과업의 진척률(%)입니다.')],
    ['Conflict Resolver', tr('충돌이 감지되면 내용과 우선순위, 어떤 정책으로 해결했는지 표시됩니다.')],
    ['Ensemble / Voting', tr('몇 개 에이전트가 합의했는지와 신뢰도(98.2%)입니다.')],
    ['Auto Playbooks', tr('조건이 맞으면 자동 실행되는 대응 규칙 목록입니다.')],
    ['Simulate Before Execute', tr('[Run Simulation] 으로 조치 전 리스크를 먼저 확인합니다.')],
  ];
  blocks.forEach(([h, b], i) => {
    const y = 2.05 + i * 0.9;
    s.addText(h, { x: bx, y, w: bw, h: 0.28, margin: 0, fontFace: F.latin, fontSize: 12, bold: true, color: C.accent, isTextBox: true });
    s.addText(b, { x: bx, y: y + 0.27, w: bw, h: 0.58, margin: 0, lineSpacing: 15, fontFace: F.ko, fontSize: 10.5, color: C.muted, isTextBox: true });
  });
  s.addText(tr('상단의 [AI 오케스트레이션] 버튼이 다음 장의 시각화를 엽니다.'), {
    x: bx, y: 6.6, w: bw, h: 0.34, margin: 0, fontFace: F.ko, fontSize: 10.5, italic: true, color: C.warn, isTextBox: true });
  foot(s, 12, FOOT);
}

/* ═══ 13. 오케스트레이션 조작 ═══ */
{
  const s = New();
  title(s, tr('AI 오케스트레이션 시각화 조작'), { kicker: tr('10 · 시연 운영') });
  sub(s, tr('가장 반응이 좋은 화면입니다. 슈퍼바이저 센터 상단의 [AI 오케스트레이션] 으로 엽니다.'), 1.42);

  const ih = framed(s, '20b-agreement-crop.png', M, 2.05, 5.0, 1.145);
  caption(s, tr('합의(AGREEMENT)에 도달한 순간 — 시연의 하이라이트'), M, 2.05 + ih + 0.1, 5.0);

  const bx = M + 5.0 + 0.45, bw = COL - 5.0 - 0.45;
  const cw = (bw - 0.34) / 2;
  const ctrls = [
    [tr('자동 일시정지'), tr('재생을 멈춥니다. 설명을 덧붙일 때 사용합니다.')],
    [tr('⏭ 다음'), tr('한 발언씩 수동으로 넘깁니다.')],
    [tr('↺ 처음부터'), tr('토론을 처음으로 되돌립니다. 다음 관람객을 받을 때.')],
    [tr('자동 간격'), tr('느림 / 보통 / 빠름. 관람객 회전이 빠르면 “빠름”.')],
  ];
  s.addText(tr('재생 컨트롤'), { x: bx, y: 2.05, w: bw, h: 0.32, margin: 0, fontFace: F.ko, fontSize: 15, bold: true, color: C.text, isTextBox: true });
  ctrls.forEach(([h, b], i) => {
    const x = bx + (i % 2) * (cw + 0.34);
    const y = 2.5 + Math.floor(i / 2) * 0.82;
    s.addText(h, { x, y, w: cw, h: 0.26, margin: 0, fontFace: F.ko, fontSize: 11.5, bold: true, color: C.accent, isTextBox: true });
    s.addText(b, { x, y: y + 0.26, w: cw, h: 0.5, margin: 0, lineSpacing: 15, fontFace: F.ko, fontSize: 10, color: C.muted, isTextBox: true });
  });

  s.addText(tr('고를 수 있는 토론 시나리오 5종'), { x: bx, y: 4.3, w: bw, h: 0.32, margin: 0, fontFace: F.ko, fontSize: 15, bold: true, color: C.text, isTextBox: true });
  const scn = [
    tr('① [통합] 6대 에이전트 전사 최적화'),
    tr('② B라인 생산 속도 최적화 충돌'),
    tr('③ C구역 화재 징후 감지 및 대응'),
    tr('④ [EXPO] 가스 미세 누출 & 배기 제어 충돌'),
    tr('⑤ [EXPO] 피크 전력 긴급 부하 제어'),
  ];
  s.addText(scn.map((t, i) => ({ text: t, options: { breakLine: i < scn.length - 1 } })), {
    x: bx, y: 4.72, w: bw, h: 1.5, margin: 0, fontFace: F.ko, fontSize: 10.5, color: C.muted, paraSpaceAfter: 5, isTextBox: true });
  s.addText(tr('[METHODOLOGY] 탭에는 조율 방식의 설명이 들어 있습니다 — 기술 질문을 받았을 때 사용하세요.'), {
    x: bx, y: 6.3, w: bw, h: 0.5, margin: 0, lineSpacing: 15, fontFace: F.ko, fontSize: 10, italic: true, color: C.warn, isTextBox: true });
  foot(s, 13, FOOT);
}

/* ═══ 14. AI 챗봇 ═══ */
{
  const s = New();
  title(s, tr('AI 챗봇 사용법'), { kicker: tr('11 · 시연 운영') });
  sub(s, tr('화면 오른쪽 아래 원형 버튼으로 언제든 열 수 있습니다. 선택한 언어로 답합니다.'), 1.42);

  const ih = framed(s, '22-chat-panel.png', M, 2.05, 2.7, 0.731);

  const bx = M + 2.7 + 0.45, bw = COL - 2.7 - 0.45;
  const cw = (bw - 0.36) / 2;
  card(s, { x: bx, y: 2.05, w: cw, h: 2.4 });
  s.addText(tr('물어볼 만한 질문'), { x: bx + 0.3, y: 2.24, w: cw - 0.6, h: 0.3, margin: 0, fontFace: F.ko, fontSize: 14, bold: true, color: C.accent, isTextBox: true });
  const qs = [tr('지금 OEE가 왜 떨어졌어?'), tr('불량률이 가장 높은 라인은?'), tr('오늘 승인 대기 중인 건은 몇 개야?'), tr('설비 중 교체가 급한 건 뭐야?'), tr('피크 전력까지 얼마나 남았어?')];
  s.addText(qs.map((t, i) => ({ text: t, options: { bullet: true, breakLine: i < qs.length - 1 } })), {
    x: bx + 0.3, y: 2.62, w: cw - 0.6, h: 1.7, margin: 0, fontFace: F.ko, fontSize: 10.5, color: C.muted, paraSpaceAfter: 6, isTextBox: true });

  const x2 = bx + cw + 0.36;
  card(s, { x: x2, y: 2.05, w: cw, h: 2.4 });
  s.addText(tr('알아둘 점'), { x: x2 + 0.3, y: 2.24, w: cw - 0.6, h: 0.3, margin: 0, fontFace: F.ko, fontSize: 14, bold: true, color: C.cyan, isTextBox: true });
  const notes = [tr('답변은 현재 화면의 시뮬레이션 값을 근거로 만들어집니다.'), tr('데모 모드에서도 질문에 맞는 답이 나옵니다.'), tr('언어를 바꾸면 이후 답변부터 그 언어가 됩니다.'), tr('대화 이력은 새로고침 전까지 유지됩니다.')];
  s.addText(notes.map((t, i) => ({ text: t, options: { bullet: true, breakLine: i < notes.length - 1 } })), {
    x: x2 + 0.3, y: 2.62, w: cw - 0.6, h: 1.7, margin: 0, fontFace: F.ko, fontSize: 10.5, color: C.muted, paraSpaceAfter: 6, isTextBox: true });

  card(s, { x: bx, y: 4.65, w: bw, h: 2.0, fill: C.accent, trans: 92, line: C.accent });
  s.addText(tr('부스에서 쓰는 요령'), { x: bx + 0.34, y: 4.86, w: bw - 0.68, h: 0.3, margin: 0, fontFace: F.ko, fontSize: 14, bold: true, color: C.accent, isTextBox: true });
  s.addText(tr('관람객에게 직접 타이핑하게 하면 반응이 가장 좋습니다. 질문 예시 두세 개를 부스에 인쇄해 두고,\n답변이 나온 뒤 “이 숫자는 왼쪽 대시보드의 값과 같습니다”라고 화면을 짚어 주면 시뮬레이션이 하나로 연결되어 있다는 점이 전달됩니다.\n대기 줄이 길 때는 챗봇 대신 오케스트레이션 시각화를 자동 재생으로 걸어두는 편이 낫습니다.'), {
    x: bx + 0.34, y: 5.24, w: bw - 0.68, h: 1.2, margin: 0, lineSpacing: 18, fontFace: F.ko, fontSize: 11, color: C.text, isTextBox: true });
  foot(s, 14, FOOT);
}

/* ═══ 15. 셀프 시연 가이드 ═══ */
{
  const s = New();
  title(s, tr('셀프 시연 가이드 운영법'), { kicker: tr('12 · 시연 운영') });
  sub(s, tr('헤더의 주황색 [셀프 시연 가이드 시작] 버튼으로 켜고 끕니다. 켜면 좌측에 안내 패널이 붙습니다.'), 1.42);

  const ih = framed(s, '03-tour-panel.png', M, 2.05, 2.6, 0.598);

  const bx = M + 2.6 + 0.45, bw = COL - 2.6 - 0.45;
  const parts = [
    [tr('테마 선택'), tr('패널 맨 위 4개 버튼으로 시나리오를 언제든 바꿉니다. 바꾸면 1단계부터 다시 시작합니다.')],
    [tr('단계 배지'), tr('「01 / 04단계」 형식으로 현재 위치를 보여줍니다. 총 4단계입니다.')],
    [tr('실습 미션'), tr('주황색 영역. 관람객이 실제로 눌러야 할 버튼을 지목합니다.')],
    [tr('체크리스트'), tr('직접 체크하거나 [모두 완료] 로 한 번에 처리합니다. 4단계를 모두 마치면 달성 배너가 뜹니다.')],
    [tr('이동 버튼'), tr('[◀ 이전] · [화면 이동] · [다음 ▶]. 「화면 이동」은 그 단계가 가리키는 모듈로 데려갑니다.')],
  ];
  parts.forEach(([h, b], i) => {
    const y = 2.05 + i * 0.84;
    s.addText(h, { x: bx, y, w: bw, h: 0.28, margin: 0, fontFace: F.ko, fontSize: 13, bold: true, color: C.warn, isTextBox: true });
    s.addText(b, { x: bx, y: y + 0.28, w: bw, h: 0.56, margin: 0, lineSpacing: 15, fontFace: F.ko, fontSize: 10.5, color: C.muted, isTextBox: true });
  });

  card(s, { x: bx, y: 6.32, w: bw, h: 0.6, fill: C.danger, trans: 92, line: C.danger });
  s.addText(tr('관람객이 바뀔 때마다 [처음부터] 대신 패널의 [×] 로 가이드를 닫고 랜딩으로 돌아가면 상태가 완전히 초기화됩니다.'), {
    x: bx + 0.3, y: 6.34, w: bw - 0.6, h: 0.56, margin: 0, valign: 'middle', fontFace: F.ko, fontSize: 10, color: C.text, isTextBox: true });
  foot(s, 15, FOOT);
}

/* ═══ 16-17. 시나리오 진행표 ═══ */
const SC = [
  {
    id: 'A', name: tr('전사 생산 극대화 & 통합 OEE'), col: C.accent,
    desc: tr('생산 극대화 목표 아래 전 에이전트가 협업하는 기본 시나리오. 처음 오는 관람객에게 권장합니다.'),
    rows: [
      [tr('01 통합 모니터링'), tr('실시간 공정 진단 & 추천'), tr('통합 대시보드'), tr('AI 추천 중 하나를 [승인]')],
      [tr('02 AI 설비 보전'), tr('설비 RUL 수명 예측 진단'), tr('RUL 잔여수명 예측'), tr('GBR 예측 곡선과 정비 우선순위 확인')],
      [tr('03 에이전트 지휘관'), tr('에이전트 지휘 컨트롤 타워'), tr('슈퍼바이저 센터'), tr('Active Goal 과 정책 가드의 충돌 찾기')],
      [tr('04 협의체 융합'), tr('AI 에이전트 라이브 조율'), tr('슈퍼바이저 센터'), tr('[오케스트레이션 라이브 실행] 재생')],
    ],
  },
  {
    id: 'B', name: tr('돌발 고장 및 안전 예방 가드레일'), col: C.danger,
    desc: tr('미세 가스 감지에서 시작해 안전이 생산을 이기는 규칙을 보여줍니다. 안전 담당자 반응이 좋습니다.'),
    rows: [
      [tr('01 안전 초동 대응'), tr('이상 징후 및 공조 제어'), tr('통합 대시보드'), tr('공조 배기 제어 추천을 [승인]')],
      [tr('02 실시간 비전 감시'), tr('지능형 CCTV 안전 화재 구획'), tr('CCTV 화재 감시'), tr('열화상 필터와 연기 검출 신뢰도 추적')],
      [tr('03 안전 절대 우선'), tr('L1 Safety 정책 우선 제어'), tr('슈퍼바이저 센터'), tr('Safety Core Level 1 가드 활성 확인')],
      [tr('04 안전 오케스트레이션'), tr('안전-배기 다자 조율 토론'), tr('슈퍼바이저 센터'), tr('「가스 미세 누출 & 배기 제어 충돌」 실행')],
    ],
  },
  {
    id: 'C', name: tr('피크 전력 한계 돌파 억제'), col: C.warn,
    desc: tr('계약 전력 초과 30분 전. ESS와 유휴 AMR 배터리까지 동원하는 에너지 시나리오입니다.'),
    rows: [
      [tr('01 피크 위험 감시'), tr('전력 피크 경계 모니터링'), tr('통합 대시보드'), tr('「에너지 절전 우회 모드」를 [승인]')],
      [tr('02 실시간 에너지 제어'), tr('AI 피크 에너지 부하 정비'), tr('피크 부하 관리'), tr('한계치 대비 합산 전력 추이 확인')],
      [tr('03 CO2 한계 관리'), tr('탄소 및 전력 통제 정책 가드'), tr('슈퍼바이저 센터'), tr('Energy Allocation Level 등급 확인')],
      [tr('04 ESS 오케스트레이션'), tr('ESS 연동 피크 셰이빙 토론'), tr('슈퍼바이저 센터'), tr('「정오 피크 전력 한계 제어 충돌」 실행')],
    ],
  },
  {
    id: 'D', name: tr('긴급 러시 오더 & 불량 보증'), col: C.violet,
    desc: tr('납기와 품질이 정면 충돌합니다. 영업·구매 담당 관람객에게 설명하기 좋습니다.'),
    rows: [
      [tr('01 긴급 물류 대응'), tr('러시 오더 초가속 모드'), tr('통합 대시보드'), tr('「패키징 속도 120% 가속안」을 [승인]')],
      [tr('02 고품질 비전 탐지'), tr('초가속 패키징 품질 비전 검사'), tr('비전검사 결과 뷰어'), tr('실시간 OK / NG 분류와 결함 스코어')],
      [tr('03 SLA · 품질 가드'), tr('SLA 납기 및 불량 제로 가드'), tr('슈퍼바이저 센터'), tr('SLA Delivery Priority 정책 식별')],
      [tr('04 상협 합의'), tr('초가속 스크래치 방어 토론'), tr('슈퍼바이저 센터'), tr('「B라인 생산 속도 최적화 충돌」 실행')],
    ],
  },
];
[[0, 1, 16], [2, 3, 17]].forEach(([a, b, pageNo]) => {
  const s = New();
  const first = SC[a];
  title(s, tr('시나리오 {ids} 진행표').replace('{ids}', `${first.id} · ${SC[b].id}`), { kicker: tr('13 · 시연 운영') });
  sub(s, tr('각 단계에서 관람객이 실제로 눌러야 하는 것을 마지막 열에 적었습니다.'), 1.42);

  [a, b].forEach((idx, k) => {
    const sc = SC[idx];
    const y = 1.98 + k * 2.44;
    card(s, { x: M, y, w: COL, h: 2.26 });
    chip(s, { x: M + 0.3, y: y + 0.24, d: 0.42, label: sc.id, fill: sc.col, color: C.bg, size: 15 });
    s.addText(sc.name, { x: M + 0.9, y: y + 0.2, w: 5.4, h: 0.32, margin: 0, valign: 'middle', fontFace: F.ko, fontSize: 15, bold: true, color: C.text, isTextBox: true });
    s.addText(sc.desc, { x: M + 6.5, y: y + 0.18, w: COL - 6.9, h: 0.42, margin: 0, lineSpacing: 14, fontFace: F.ko, fontSize: 9.5, color: C.muted, isTextBox: true });
    table(s, {
      x: M + 0.9, y: y + 0.64, w: COL - 1.3,
      head: [tr('단계'), tr('제목'), tr('이동 화면'), tr('관람객이 할 일')],
      colW: [2.2, 3.0, 2.35, COL - 1.3 - 7.55],
      rows: sc.rows, rowH: 0.29, fontSize: 9.5,
    });
  });
  foot(s, pageNo, FOOT);
});

/* ═══ 18. AI 연결 설정 ═══ */
{
  const s = New();
  title(s, tr('AI 연결 설정'), { kicker: tr('14 · 설정') });
  sub(s, tr('헤더 오른쪽 끝 톱니 아이콘 → 「AI 연결 설정」. 아무것도 설정하지 않아도 플랫폼은 정상 동작합니다.'), 1.42);

  const ih = framed(s, '23-settings-crop.png', M, 2.05, 4.6, 1.057);

  const bx = M + 4.6 + 0.45, bw = COL - 4.6 - 0.45;
  const tiers = [
    [tr('1순위 · 프록시 주소'), tr('Cloudflare Worker 주소를 넣습니다. 키가 브라우저에 노출되지 않아 공용 단말에 가장 안전합니다. 부스 운영 시 권장.'), C.accent],
    [tr('2순위 · API 키'), tr('프록시가 없을 때만 씁니다. 키는 이 브라우저에만 저장되고 서버로 전송되지 않습니다.'), C.warn],
    [tr('3순위 · 데모 모드'), tr('둘 다 비어 있으면 자동으로 이 상태입니다. 챗봇과 추천이 내장 시뮬레이션으로 응답하고 「데모」 배지가 붙습니다.'), C.cyan],
  ];
  tiers.forEach(([h, b, col], i) => {
    const y = 2.05 + i * 1.36;
    s.addText(h, { x: bx, y, w: bw, h: 0.3, margin: 0, fontFace: F.ko, fontSize: 14, bold: true, color: col, isTextBox: true });
    s.addText(b, { x: bx, y: y + 0.32, w: bw, h: 0.94, margin: 0, lineSpacing: 17, fontFace: F.ko, fontSize: 11, color: C.muted, isTextBox: true });
  });

  card(s, { x: bx, y: 6.14, w: bw, h: 0.86, fill: C.danger, trans: 92, line: C.danger });
  s.addText(tr('공용 단말에서 API 키를 직접 입력했다면, 시연이 끝난 뒤 반드시 [키 삭제] 를 누르세요.'), {
    x: bx + 0.3, y: 6.28, w: bw - 0.6, h: 0.6, margin: 0, lineSpacing: 15, fontFace: F.ko, fontSize: 10.5, bold: true, color: C.text, isTextBox: true });
  foot(s, 18, FOOT);
}

/* ═══ 19. 자주 겪는 상황 ═══ */
{
  const s = New();
  title(s, tr('자주 겪는 상황과 대처'), { kicker: tr('15 · 대처') });
  sub(s, tr('부스 운영 중에 실제로 마주칠 만한 순서로 정리했습니다.'), 1.42);

  const faq = [
    [tr('AI 응답에 「데모」 배지가 붙어요'), tr('정상입니다. API 키나 프록시가 설정되지 않은 상태이며, 모든 기능은 그대로 동작합니다. 실제 모델을 붙이려면 18쪽을 보세요.')],
    [tr('화면 숫자가 계속 바뀌어요'), tr('의도된 동작입니다. 내장 공장 시뮬레이션이 몇 초마다 값을 갱신하므로 실제 라인처럼 보입니다.')],
    [tr('시나리오가 중간에 꼬였어요'), tr('가이드 패널의 [×] 로 닫고 랜딩으로 돌아가면 완전히 초기화됩니다. 새로고침해도 됩니다.')],
    [tr('언어를 바꿨더니 일부가 원문 그대로예요'), tr('번역 카탈로그에 없는 문구는 원문으로 표시됩니다. 화면이 깨지지 않도록 의도한 동작입니다.')],
    [tr('오케스트레이션이 너무 빨라요 / 느려요'), tr('재생 컨트롤 오른쪽 「자동 간격」을 느림 / 보통 / 빠름 중에서 고르세요.')],
    [tr('인터넷이 끊겼어요'), tr('데모 모드에서는 네트워크 없이도 전 기능이 동작합니다. 시연을 그대로 진행하세요.')],
  ];
  const cw = (COL - 0.36) / 2, rh = 1.42;
  faq.forEach(([q, a], i) => {
    const x = M + (i % 2) * (cw + 0.36);
    const y = 2.05 + Math.floor(i / 2) * (rh + 0.24);
    card(s, { x, y, w: cw, h: rh });
    s.addText(`Q. ${q}`, { x: x + 0.28, y: y + 0.2, w: cw - 0.56, h: 0.34, margin: 0, fontFace: F.ko, fontSize: 12.5, bold: true, color: C.text, isTextBox: true });
    s.addText(a, { x: x + 0.28, y: y + 0.56, w: cw - 0.56, h: 0.74, margin: 0, lineSpacing: 15, fontFace: F.ko, fontSize: 10, color: C.muted, isTextBox: true });
  });
  foot(s, 19, FOOT);
}

/* ═══ 20. 역할별 권장 화면 ═══ */
{
  const s = New();
  title(s, tr('부록 · 역할별 권장 화면'), { kicker: tr('16 · 부록') });
  sub(s, tr('관람객이 자기 직무를 말하면 이 순서대로 보여주세요. 3분이면 충분합니다.'), 1.42);

  const roles = [
    [tr('공장장 · 경영'), [tr('통합 대시보드'), tr('OEE 대시보드'), tr('슈퍼바이저 센터'), tr('승인 대기 큐')], tr('“숫자 하나로 공장 상태를 본다”는 흐름'), C.accent],
    [tr('품질관리자'), [tr('실시간 불량률 현황'), tr('비전검사 결과 뷰어'), tr('불량 유형 분석'), tr('온도-불량 상관분석')], tr('검사 이미지와 파레토 차트가 설득력이 있습니다'), C.cyan],
    [tr('설비엔지니어'), [tr('설비 상태 종합'), tr('진동/온도 추세'), tr('RUL 잔여수명 예측'), tr('보전 작업 오더')], tr('72시간 전 예측이 가장 강한 메시지입니다'), C.violet],
    [tr('안전 · 환경'), [tr('지능형 CCTV 화재 감시'), tr('AMR 충돌 방지'), tr('긴급 정지 및 알람 제어'), tr('시나리오 B 실행')], tr('안전이 생산을 이기는 규칙을 강조하세요'), C.danger],
    [tr('에너지 · 설비투자'), [tr('전력 사용 현황'), tr('피크 부하 관리'), tr('에너지 비용 분석'), tr('시나리오 C 실행')], tr('계약 전력과 ESS 연동이 핵심입니다'), C.warn],
    [tr('IT · 정보시스템'), [tr('Agent 실행 이력'), tr('모델 레지스트리'), tr('온톨로지 관리'), tr('시스템 모니터링')], tr('감사 추적과 MLOps 쪽 질문이 많습니다'), C.muted],
  ];
  const cw = (COL - 0.3 * 2) / 3, ch = 2.12;
  roles.forEach(([name, mods, tip, col], i) => {
    const x = M + (i % 3) * (cw + 0.3);
    const y = 2.05 + Math.floor(i / 3) * (ch + 0.26);
    card(s, { x, y, w: cw, h: ch });
    s.addText(name, { x: x + 0.28, y: y + 0.2, w: cw - 0.56, h: 0.32, margin: 0, fontFace: F.ko, fontSize: 14.5, bold: true, color: col, isTextBox: true });
    s.addText(mods.map((m, j) => ({ text: `${j + 1}. ${m}`, options: { breakLine: j < mods.length - 1 } })), {
      x: x + 0.28, y: y + 0.58, w: cw - 0.56, h: 1.0, margin: 0, fontFace: F.ko, fontSize: 10.5, color: C.muted, paraSpaceAfter: 4, isTextBox: true });
    s.addText(tip, { x: x + 0.28, y: y + 1.62, w: cw - 0.56, h: 0.4, margin: 0, lineSpacing: 14, fontFace: F.ko, fontSize: 9.5, italic: true, color: col, isTextBox: true });
  });
  foot(s, 20, FOOT);
}

// fileURLToPath, not .pathname — the file names are not ASCII.
const out = fileURLToPath(new URL(`../${manualFile}.pptx`, import.meta.url));
await pres.writeFile({ fileName: out });
reportMissing();
console.log('wrote', out);
