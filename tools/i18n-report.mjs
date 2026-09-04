/**
 * Reports catalog coverage per source file: which extracted keys still have no
 * translation for a locale that needs one. Run after tools/i18n-extract.mjs.
 */
import fs from 'fs';
import path from 'path';

const catalog = JSON.parse(fs.readFileSync('tools/generated/i18n-catalog.json', 'utf8'));
const load = dir => {
  const out = {};
  if (!fs.existsSync(dir)) return out;
  for (const f of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (!f.isFile() || !f.name.endsWith('.json') || f.name === 'ignore.json') continue;
    Object.assign(out, JSON.parse(fs.readFileSync(path.join(dir, f.name), 'utf8')));
  }
  return out;
};
const tables = { ko: load('tools/translations'), en: load('tools/translations/from-english') };

const onlyFile = process.argv[2];
const locales = ['ja', 'en'];
const missing = [];
const byFile = {};

for (const entry of catalog) {
  const f = entry.files[0];
  byFile[f] ??= { total: 0, done: 0 };
  for (const locale of locales) {
    if (entry.lang === locale) continue; // source language needs no entry
    byFile[f].total++;
    const value = tables[entry.lang][entry.key]?.[locale === 'ja' ? 0 : 1];
    if (value) byFile[f].done++;
    else if (!onlyFile || f === onlyFile) missing.push(`${locale}  ${JSON.stringify(entry.key)}`);
  }
}

for (const [f, s] of Object.entries(byFile)) {
  console.log(`${s.done === s.total ? '✓' : '✗'} ${f}: ${s.done}/${s.total}`);
}
console.log(`\nmissing (${missing.length}):`);
missing.forEach(m => console.log(m));
process.exitCode = missing.length ? 1 : 0;
