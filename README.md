# DEALVUE · 딜뷰

뷰티 타임딜을 탐색하고 매장 정보와 예약 내역을 확인하는 웹 앱입니다.

## 실행

```sh
npm ci
npm run dev
```

React, TypeScript, Vite, Tailwind CSS, Zustand와 Three.js를 사용합니다. 실제 데이터 조회에는 Supabase 환경변수와 인증·지도 설정이 필요합니다. 환경변수는 로컬 `.env`에 설정합니다.

## 주요 기능

- 타임딜 검색, 카테고리 필터, 주변 매장 지도와 매장 상세
- 찜, 예약 내역, 리뷰, 쿠폰과 마이페이지
- 커뮤니티, 출석과 리워드
- 아바타 드레스룸, 헤어·의상 변경, 회전 보기와 코디 저장

전체 기능 미리보기에서는 예시 데이터와 브라우저 저장소로 화면 흐름을 확인할 수 있습니다. 미리보기의 예약·리워드 동작은 실제 결제나 서버 데이터 변경을 수행하지 않습니다. 실제 예약·결제 등은 서버 연동 상태에 따라 제한됩니다.

## 빌드와 검증

```sh
npm run build
npm run lint
```

브라우저 검증 스크립트는 `scripts/`에 있습니다. 실행 중인 개발 서버와 Playwright가 필요하며, 서버 주소와 Playwright 경로는 `DEALVUE_TEST_URL`, `DEALVUE_PLAYWRIGHT_MODULE`로 지정할 수 있습니다.
