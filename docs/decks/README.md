# 슬라이드 생성 스크립트

`docs/` 아래의 두 PPTX를 만드는 스크립트입니다. 내용을 고쳐야 할 때 파워포인트에서
직접 수정해도 되지만, 여기서 고치고 다시 생성하면 두 문서의 서식이 계속 일치합니다.

```bash
npm i --no-save pptxgenjs
node docs/decks/build-intro.mjs     # 플랫폼 소개서 (14장)
node docs/decks/build-manual.mjs    # 사용 매뉴얼 (20장)
```

| 파일 | 역할 |
|---|---|
| `theme.mjs` | 색·서체·카드/칩/제목 등 두 문서가 공유하는 서식 |
| `build-intro.mjs` | 플랫폼 소개서 |
| `build-manual.mjs` | 사용 매뉴얼 |
| `shots/` | 실행 중인 앱을 Playwright로 2배 해상도 캡처한 뒤 잘라낸 이미지 |

색은 `src/index.css`의 다크 테마 변수를 그대로 가져왔습니다. 그래서 화면 캡처를
슬라이드에 얹으면 배경색이 이어집니다. 제품 테마를 바꾸면 `theme.mjs`의 `C`도
같이 바꿔 주세요.

## 화면 캡처를 다시 찍으려면

`npm run dev` 로 3000 포트를 띄운 뒤 Playwright로 `localStorage` 에
`impix.locale` / `impix-theme` 를 심고 캡처하면 됩니다. 캡처에 사용자 이메일이
찍히므로 저장 전에 가려 주세요 (`shots/` 의 이미지는 `operator@impix.ai` 로
치환해 둔 상태입니다).

## 다국어 버전

본문은 한국어입니다. 일본어·영어 판이 필요하면 각 스크립트의 문자열을
`src/i18n/locales/ja.ts` · `en.ts` 의 대응 값으로 바꾸면 서식은 그대로 두고
언어만 교체할 수 있습니다.
