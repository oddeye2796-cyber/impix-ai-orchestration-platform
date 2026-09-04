/**
 * Verifies what GitHub Pages is actually serving, without fetching the site.
 *
 * The agent sandbox that develops this app cannot reach *.github.io (nor
 * pages.dev, vercel.app or netlify.app — the whole public web is off its egress
 * allowlist), but `git` reaches GitHub fine. So instead of requesting the URL,
 * this reads the published branch and checks the bytes Pages is serving.
 *
 *   node tools/verify-deploy.mjs [expected-commit-ish]
 *
 * With no argument it checks against HEAD.
 */
import { execFileSync } from 'child_process';

const BRANCH = 'gh-pages';
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();

const failures = [];
const check = (label, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures.push(label);
};

const expected = git('rev-parse', process.argv[2] ?? 'HEAD');
git('fetch', 'origin', BRANCH);

const deployCommit = git('rev-parse', `origin/${BRANCH}`);
const deployMessage = git('log', '-1', '--format=%s', `origin/${BRANCH}`);
console.log(`Published branch: ${deployCommit.slice(0, 7)} — ${deployMessage}\n`);

const files = git('ls-tree', '-r', '--name-only', `origin/${BRANCH}`).split('\n');
const show = file => git('show', `origin/${BRANCH}:${file}`);

check('index.html published', files.includes('index.html'));
check('.nojekyll present', files.includes('.nojekyll'), 'Pages would otherwise run Jekyll over the assets');
check('404.html fallback published', files.includes('404.html'), 'deep links would hit GitHub\'s 404 page');

const html = show('index.html');
check('base path is the project subpath', html.includes('/impix-ai-orchestration-platform/assets/'));

const entry = html.match(/assets\/index-[A-Za-z0-9_-]+\.js/)?.[0];
check('entry bundle referenced', Boolean(entry), entry ?? 'none found');

if (entry) {
  check('entry bundle actually published', files.includes(entry), entry);
  const bundle = show(entry);

  const stamp = bundle.match(/\.build\s*=\s*"([0-9a-f]{7,40})"/)?.[1];
  check(
    'serving the expected commit',
    stamp === expected,
    `expected ${expected.slice(0, 7)}, serving ${stamp ? stamp.slice(0, 7) : '(no stamp)'}`,
  );

  // A key must never reach a static bundle; the proxy exists to prevent it.
  check('no Gemini key in the bundle', !/AIza[A-Za-z0-9_-]{20,}/.test(bundle));
}

console.log();
if (failures.length) {
  console.error(`${failures.length} check(s) failed: ${failures.join(', ')}`);
  process.exit(1);
}
console.log('Deployment verified.');
