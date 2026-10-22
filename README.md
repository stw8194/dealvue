# DEALVUE · 딜뷰

뷰티 타임딜을 탐색하고 매장 정보와 예약 내역을 확인하는 웹 앱입니다.

## 실행

```sh
npm ci
npm run dev
```

React, TypeScript, Vite, Tailwind CSS, Zustand와 Three.js를 사용합니다. 실제 데이터 조회에는 Supabase 환경변수와 인증·지도 설정이 필요합니다. 환경변수는 로컬 `.env`에 설정합니다.

필요한 환경변수 이름은 `.env.example`을 참고합니다. 카카오 지도는 `VITE_KAKAO_MAP_JAVASCRIPT_KEY`에 해당 앱의 JavaScript 키를 설정해야 합니다. 카카오 Developers에서 카카오맵 사용 설정을 켜고, 그 키의 JavaScript SDK 도메인에 실제 접속 주소(로컬은 `http://localhost:5173`)를 등록합니다. 설정 변경 후 개발 서버가 재시작되어야 반영됩니다. Vercel 배포에도 같은 환경변수를 별도로 설정하고 재배포해야 하며, 배포 도메인도 카카오에 등록해야 합니다. [카카오 지도 설정 안내](https://apis.map.kakao.com/web/guide/)

## 주요 기능

- 타임딜 검색, 카테고리 필터, 주변 매장 지도와 매장 상세
- 찜, 예약 내역, 리뷰, 쿠폰과 마이페이지
- 커뮤니티, 출석과 리워드
- 아바타 드레스룸, 헤어·의상 변경, 회전 보기와 코디 저장

매장·시술·타임딜은 Supabase에 등록된 제공 매장 15곳의 데이터를 사용합니다. 예약·쿠폰·포인트는 시연용으로 브라우저(IndexedDB)에만 저장되며, 실제 결제나 매장 전달은 일어나지 않습니다.

시연 예약은 로그인한 계정별로 표시합니다. 계정 정보가 없는 이전 시연 예약은 삭제하지 않고 목록에서 숨깁니다.

## 빌드와 검증

```sh
npm run build
npm run lint
```

브라우저 검증 스크립트는 `scripts/`에 있습니다. 실행 중인 개발 서버와 Playwright가 필요하며, 서버 주소와 Playwright 경로는 `DEALVUE_TEST_URL`, `DEALVUE_PLAYWRIGHT_MODULE`로 지정할 수 있습니다.

예약 흐름 회귀 검사는 기본 주소 `http://127.0.0.1:5185`를 사용합니다. 별도 터미널에서 `npm run dev -- --host 127.0.0.1 --port 5185`로 서버를 시작한 뒤 실행합니다.

```sh
node scripts/check-local-ledger.mjs
node scripts/check-unified-catalog-ui.mjs
node scripts/check-time-deal-home-ui.mjs
node scripts/check-reference-layout.mjs
node scripts/check-deal-kits-ui.mjs
node scripts/check-choice-ui.mjs
node scripts/check-oauth-callback.mjs
```

이 검사들은 제공 매장·시술 데이터를 Supabase에서 조회하므로 `.env` 설정과 네트워크 연결이 필요합니다. 예약은 독립된 테스트 브라우저의 IndexedDB에만 저장합니다. 인증은 모의 세션·응답을 사용하며 실제 계정 생성이나 이메일 발송은 하지 않습니다. 실제 카카오·구글 OAuth 성공 여부는 별도로 확인해야 합니다. 딜키트 저장 API 검증도 요청을 가로채므로 서버 데이터를 변경하지 않습니다.

- `check-local-ledger`: 두 탭 저장, 중복 요청, 계정별 목록·상세 분리, 익명 예약 숨김, 가격 변경 재동의, 패키지·취소·리뷰 보상
- `check-unified-catalog-ui`: 제공 카탈로그, 찜, 날짜·시간 선택부터 예약 완료·변경·취소까지의 통합 흐름
- `check-time-deal-home-ui`: 개별 딜 상위 5개, 카드형 선택, 로그인 안내, 마감 후 선택 유지·예약 차단, 배너 수와 정렬·제외 조건
- `check-reference-layout`: 화면 폭 320~1440px의 홈·마이페이지·예약 화면 가로 넘침과 기존 배치
- `check-deal-kits-ui`: 현재 딜키트 구성·필터·최저가, 매장별 노출, 로그인 복귀, 저장 API 어댑터
- `check-choice-ui`: 달력의 월 이동·예약 불가일·키보드 선택, 날짜 변경 시 시간 초기화, 일정 변경 저장, 칩 필터와 관리 화면 선택 카드, 모바일·데스크톱 배치 (관리 API 응답은 모의 처리)
- `check-oauth-callback`: 실제 SDK의 PKCE 코드 교환 1회, 실패 사유 전달, 콜백 복귀·세션 유지. 기본 서버 주소는 `http://localhost:5173`이며 다른 검사와 함께 실행할 때는 `DEALVUE_TEST_URL`을 지정합니다.

## 소셜 로그인 설정

Google 로그인은 Supabase의 Authentication → Sign In / Providers → Google에서 활성화하고 Google Cloud의 OAuth Client ID·Client Secret을 등록해야 합니다. Google Cloud의 승인된 리디렉션 URI에는 Supabase 프로젝트의 `https://<project-ref>.supabase.co/auth/v1/callback`을 등록합니다. 앱으로 돌아오는 `http://localhost:5173/auth/callback`은 Supabase의 URL Configuration → Redirect URLs에 등록합니다. Client Secret은 Supabase 관리 화면에 입력하며 프런트엔드 환경변수에 넣지 않습니다. [Supabase Google 설정 문서](https://supabase.com/docs/guides/auth/social-login/auth-google)

현재 앱은 카카오 로그인에 `custom:kakao`를 사용합니다. 이 custom OAuth 제공자의 Userinfo URL에는 표준 `sub` 식별자를 반환하는 `https://kapi.kakao.com/v1/oidc/userinfo`가 필요합니다. 일반 사용자 정보 API인 `/v2/user/me`는 이 설정과 호환되지 않아 `error missing provider id`가 발생할 수 있습니다. 카카오 앱의 OpenID Connect 사용 설정도 확인해야 합니다. 현재 요청 범위는 `openid profile_nickname`이며 이메일을 수집하지 않으므로 Supabase의 Allow users without email 설정을 유지합니다. [카카오 OIDC 사용자 정보 문서](https://developers.kakao.com/docs/ko/kakaologin/rest-api#oidc-user-info)

브라우저의 PKCE 콜백은 Supabase SDK가 자동 처리합니다. 앱에서 인가 코드를 다시 교환하지 않으며, 초기화 중 받은 OAuth 오류를 화면에 전달합니다. 서버 제공자 설정을 마친 후 실제 계정으로 별도 확인해야 로그인 연동을 완료한 것으로 봅니다.
