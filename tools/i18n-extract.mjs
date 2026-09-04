/**
 * Collects every Korean string that reaches `t()` at runtime:
 *  - literal arguments of `t(...)` calls, and
 *  - Korean strings still living in the module-scope data tables, which the
 *    render sites pass through `t()` (menu items, tour steps, event scripts...).
 * The union is the translation catalog key set.
 */
import fs from 'fs';
import path from 'path';
import ts from 'typescript';

const HANGUL = /[가-힣]/;
const files = [];
function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.tsx?$/.test(e.name) && !p.includes(`i18n${path.sep}locales`) && !/i18n[\\/](index|types)\.tsx?$/.test(p)) files.push(p);
  }
}
walk('src');

/** key -> { files: Set, comparison: boolean } */
const ignored = new Set(
  fs.existsSync('tools/translations/ignore.json')
    ? JSON.parse(fs.readFileSync('tools/translations/ignore.json', 'utf8'))
    : [],
);

const keys = new Map();
const record = (key, file) => {
  if (ignored.has(key)) return;
  if (!keys.has(key)) keys.set(key, new Set());
  keys.get(key).add(file);
};

/** True when the literal is the first argument of a `t(...)` call. */
const isTranslationCallArg = node =>
  ts.isCallExpression(node.parent) &&
  ts.isIdentifier(node.parent.expression) &&
  node.parent.expression.text === 't' &&
  node.parent.arguments[0] === node;

for (const file of files) {
  const sf = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const visit = node => {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      const parent = node.parent;
      const isPropName =
        (ts.isPropertyAssignment(parent) || ts.isPropertySignature(parent)) && parent.name === node;
      // Object keys that are Korean are looked up (AGENT_CONFIGS) and also displayed.
      if (HANGUL.test(node.text)) {
        record(node.text, file);
      } else if (!isPropName && isTranslationCallArg(node)) {
        // English source copy that the second codemod pass routed through t().
        record(node.text, file);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
}

const sorted = [...keys.entries()]
  .map(([key, fileSet]) => ({ key, lang: HANGUL.test(key) ? 'ko' : 'en', files: [...fileSet].sort() }))
  .sort((a, b) => (a.files[0] === b.files[0] ? a.key.localeCompare(b.key) : a.files[0].localeCompare(b.files[0])));

fs.mkdirSync('tools/generated', { recursive: true });
fs.writeFileSync('tools/generated/i18n-catalog.json', JSON.stringify(sorted, null, 2));
console.log(`${sorted.length} keys -> tools/generated/i18n-catalog.json`);
