# i18n tooling

The UI, the demo content and the Gemini prompts all run through `src/i18n`.
Translation **keys are the original source strings** — Korean for the copy the
app was authored in, English for the chrome that was already English — so a
missing entry degrades to the original wording instead of a raw identifier.

## Layout

| Path | What it is |
| --- | --- |
| `tools/translations/*.json` | Korean key → `[japanese, english]` |
| `tools/translations/from-english/*.json` | English key → `[japanese, null]` (English needs no entry) |
| `tools/translations/ignore.json` | Keys that look translatable but are not UI copy |
| `tools/generated/i18n-catalog.json` | Extracted key list (regenerated, do not hand-edit) |
| `src/i18n/locales/{ja,en}.ts` | Generated catalogs (do not hand-edit) |

## Workflow

```bash
npm run i18n          # extract + build + coverage report
npm run i18n:extract  # rescan src/ for keys
npm run i18n:build    # regenerate src/i18n/locales/{ja,en}.ts
npm run i18n:report   # list keys with no translation (exit 1 if any)
```

Adding copy:

1. Write the string in the source language and wrap it: `t('新しい文言')`.
2. `npm run i18n:extract` to pick it up.
3. Add the translation to the matching file under `tools/translations/`.
4. `npm run i18n:build`, then commit both the JSON source and the generated catalog.

`npm run i18n:report` exits non-zero when a key is missing a translation, so it
works as a CI gate.

## Notes

- Data tables (`MENU_ITEMS`, `TOUR_SCENARIOS`, `SCENARIO_EVENTS`, …) deliberately
  stay in Korean: those strings are the catalog keys, and translating them at the
  render site (`{t(item.name)}`) keeps object identity, `find` lookups and
  `switch` cases working.
- For the same reason, never wrap a string that is **compared** rather than
  displayed (`case '시스템 관리':`, `status === 'Inspecting'`). Use `matchesKeyword()`
  from `src/i18n` when free-text typed by the operator has to match a concept in
  any language.
