// Shared look for the IMPIX AI decks. The palette is lifted straight from the
// product's own dark theme (src/index.css), so a screenshot dropped on a slide
// sits on the same slate the app paints itself.
export const C = {
  bg:      '0F172A',  // --color-bg
  surface: '1E293B',  // --color-surface
  border:  '334155',  // --color-border
  accent:  '10B981',  // --color-accent   (emerald)
  warn:    'F59E0B',  // --color-warning  (amber — the human-decision colour)
  danger:  'EF4444',
  cyan:    '22D3EE',
  violet:  'A78BFA',
  text:    'F8FAFC',
  muted:   '94A3B8',
  dim:     '64748B',
};

export const F = { ko: 'Malgun Gothic', mono: 'Consolas', latin: 'Arial' };

export const W = 13.333, H = 7.5;
export const M = 0.62;                 // page margin
export const COL = W - M * 2;          // usable width

export const shadow = () => ({ type: 'outer', color: '000000', blur: 14, offset: 3, angle: 90, opacity: 0.45 });

/** Full-bleed background. */
export function page(slide, { bg = C.bg } = {}) {
  slide.background = { color: bg };
}

/** Card: the one repeated motif across both decks. */
export function card(slide, { x, y, w, h, fill = C.surface, line = C.border, radius = 0.06, trans = 0 }) {
  slide.addShape('roundRect', {
    x, y, w, h, rectRadius: radius,
    fill: { color: fill, transparency: trans },
    line: { color: line, width: 1 },
    shadow: shadow(),
  });
}

/** Numbered / lettered chip — the secondary motif. */
export function chip(slide, { x, y, d = 0.42, label, fill = C.accent, color = C.bg, size = 13 }) {
  slide.addShape('ellipse', { x, y, w: d, h: d, fill: { color: fill }, line: { color: fill, width: 0 } });
  slide.addText(label, {
    x, y, w: d, h: d, align: 'center', valign: 'middle', margin: 0,
    fontFace: F.latin, fontSize: size, bold: true, color, isTextBox: true,
  });
}

/** Slide title used on every content slide. */
export function title(slide, text, { kicker, y = 0.5 } = {}) {
  if (kicker) {
    slide.addText(kicker, {
      x: M, y: y - 0.02, w: COL, h: 0.26, margin: 0,
      fontFace: F.latin, fontSize: 11, bold: true, color: C.accent,
      charSpacing: 2, isTextBox: true,
    });
    y += 0.3;
  }
  slide.addText(text, {
    x: M, y, w: COL, h: 0.62, margin: 0, valign: 'top',
    fontFace: F.ko, fontSize: 30, bold: true, color: C.text, isTextBox: true,
  });
}

/** Small muted line under a title. */
export function sub(slide, text, y) {
  slide.addText(text, {
    x: M, y, w: COL, h: 0.34, margin: 0,
    fontFace: F.ko, fontSize: 13, color: C.muted, isTextBox: true,
  });
}

/** Page number, bottom right. */
export function foot(slide, n, label) {
  slide.addText(label, {
    x: M, y: H - 0.5, w: COL - 1, h: 0.26, margin: 0,
    fontFace: F.ko, fontSize: 9, color: C.dim, isTextBox: true,
  });
  slide.addText(String(n), {
    x: W - M - 0.7, y: H - 0.5, w: 0.7, h: 0.26, margin: 0, align: 'right',
    fontFace: F.latin, fontSize: 9, color: C.dim, isTextBox: true,
  });
}

/** Big number + caption, for stat rows. */
export function stat(slide, { x, y, w, value, label, color = C.accent, vSize = 34 }) {
  slide.addText(value, {
    x, y, w, h: 0.56, margin: 0, valign: 'bottom',
    fontFace: F.latin, fontSize: vSize, bold: true, color, isTextBox: true,
  });
  slide.addText(label, {
    x, y: y + 0.58, w, h: 0.5, margin: 0,
    fontFace: F.ko, fontSize: 11, color: C.muted, isTextBox: true,
  });
}

// Screenshots of the running app, captured with Playwright at 2x and cropped.
// Kept beside the generators so the decks can be rebuilt from a fresh checkout.
export const SHOTS = new URL('./shots', import.meta.url).pathname;
