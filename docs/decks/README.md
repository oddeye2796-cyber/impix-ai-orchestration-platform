# スライド生成スクリプト / 슬라이드 생성 스크립트

`docs/` にある4つのPPTX（日本語2本・韓国語2本）を生成します。パワーポイントで
直接編集してもかまいませんが、ここで直せば両言語・両資料の書式が揃ったままです。

```bash
npm i --no-save pptxgenjs

# 韓国語（既定）
node docs/decks/build-intro.mjs      # IMPIX_AI_플랫폼_소개서.pptx    (14枚)
node docs/decks/build-manual.mjs     # IMPIX_AI_사용_매뉴얼.pptx      (20枚)

# 日本語
DECK_LOCALE=ja node docs/decks/build-intro.mjs    # IMPIX_AI_プラットフォーム紹介資料.pptx
DECK_LOCALE=ja node docs/decks/build-manual.mjs   # IMPIX_AI_操作マニュアル.pptx
```

| ファイル | 役割 |
|---|---|
| `theme.mjs` | 色・書体・カード/チップ/見出しなど、両資料が共有する書式 |
| `build-intro.mjs` | プラットフォーム紹介資料 |
| `build-manual.mjs` | 操作マニュアル |
| `copy/ko.mjs` | 韓国語。原文が生成スクリプト側にあるため中身は空 |
| `copy/ja.mjs` | 日本語の対訳。キーは韓国語の原文そのもの |
| `shots/` `shots-ja/` | 動作中の画面をPlaywrightで2倍解像度で撮り、切り出した画像 |

## 言語の追加

1. `copy/<locale>.mjs` を作り、`copy` に対訳を、`introFile` / `manualFile` に
   ファイル名を書きます。キーは生成スクリプトに書かれている韓国語の原文です。
2. `shots-<locale>/` にその言語の画面キャプチャを置きます。ファイル名は
   `shots/` と同じ、縦横比も同じにしてください（レイアウトが比率に依存します）。
3. `DECK_LOCALE=<locale>` で生成します。対訳の無いキーは韓国語のまま出力され、
   生成の最後に一覧が警告として表示されます。

書体は `theme.mjs` の `useLocale()` が言語ごとに切り替えます（日本語=Meiryo、
韓国語=Malgun Gothic）。どちらもWindows版Officeに同梱され、macOSでも代替が効きます。

## 色

`src/index.css` のダークテーマ変数をそのまま持ってきています。だから画面
キャプチャをスライドに置くと背景色がつながります。製品のテーマを変えたら
`theme.mjs` の `C` も合わせて変えてください。

## 画面キャプチャを撮り直す

`npm run dev` で3000番ポートを立て、Playwrightで `localStorage` に
`impix.locale` / `impix-theme` を入れてから撮ります。キャプチャには利用者の
メールアドレスが写るため、保存前に置き換えてください（同梱の画像は
`operator@impix.ai` に置換済みです）。
