/**
 * Confirms the deployed site actually renders — not just that the HTML is 200.
 * A Pages deploy can serve a stale or empty page while every asset returns 200,
 * so this asserts on what a visitor would see.
 */
import { chromium } from 'playwright';

const url = process.env.SITE_URL;
if (!url) throw new Error('SITE_URL is required');

const failures = [];
const check = (label, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures.push(label);
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, locale: 'ja-JP' });

const pageErrors = [];
const brokenAssets = [];
page.on('pageerror', e => pageErrors.push(e.message));
page.on('response', r => {
  if (r.status() >= 400 && new URL(r.url()).origin === new URL(url).origin) {
    brokenAssets.push(`${r.status()} ${r.url()}`);
  }
});

console.log(`Smoke-testing ${url}`);
const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
check('HTTP 200', response?.status() === 200, `got ${response?.status()}`);

await page.waitForTimeout(2500);

const rendered = await page.evaluate(() => (document.getElementById('root')?.children.length ?? 0) > 0);
check('React mounted', rendered);

const lang = await page.getAttribute('html', 'lang');
check('locale applied', ['ja', 'en', 'ko'].includes(lang ?? ''), `lang=${lang}`);

const stamp = await page.evaluate(() => document.documentElement.dataset.build ?? '(none)');
console.log(`      build stamp: ${stamp}`);

// After a deploy, confirm Pages is serving *this* commit rather than a cached
// older one — the failure mode that looks identical to a healthy site.
const expected = process.env.EXPECTED_BUILD;
if (expected) {
  check('serving the deployed commit', stamp === expected, `expected ${expected.slice(0, 7)}, got ${String(stamp).slice(0, 7)}`);
}

// The integrated dashboard opens on the field view (floor map and incident
// tracker); the engineer view carries the KPI cards and the AI orchestration
// panel.
// The 3D map loads in its own chunk, so wait for its zone tags to appear.
await page.locator('[data-testid^="zone-"]').first().waitFor({ timeout: 20000 }).catch(() => {});
const zones = await page.locator('[data-testid^="zone-"]').count();
check('field view floor map rendered', zones > 0, `found ${zones} zones`);
await page.getByTestId('role-manager').click();
await page.waitForTimeout(500);
const results = await page.getByTestId('result-card').count();
check('manager results summary rendered', results > 0, `found ${results}`);
await page.getByTestId('role-engineer').click();
await page.waitForTimeout(1000);
const kpis = await page.getByTestId('kpi-card').count();
check('dashboard KPIs rendered', kpis > 0, `found ${kpis}`);
const orchestration = await page.locator('#orchestration-panel').count();
check('orchestration panel on dashboard', orchestration === 1);

check('no page errors', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '));
check('no broken assets', brokenAssets.length === 0, brokenAssets.slice(0, 3).join(' | '));

await browser.close();

if (failures.length) {
  console.error(`\n${failures.length} check(s) failed: ${failures.join(', ')}`);
  process.exit(1);
}
console.log('\nAll checks passed.');
