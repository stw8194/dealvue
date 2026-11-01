# 도란도란 DB 적용

`community.sql`은 기존 예약·포인트·아바타 데이터를 변경하지 않는 추가 마이그레이션입니다.

- `community_posts`, `community_comments`, `community_likes`
- 카테고리·지역·검색·MY 필터와 반응 합계를 제공하는 `community_feed` RPC
- 로그인 계정 소유권을 검증하는 RLS 및 열 단위 쓰기 권한
- `community-media` 공개 이미지 버킷: 로그인 사용자 본인 폴더에만 5 MB 이하 JPG/PNG/WebP 업로드
- 초기 게시글 6개, 실제 조회 가능한 초기 댓글 32개. 첫 3개 글·닉네임·좋아요/댓글 수는 제공된 화면 기준입니다. 초기 좋아요는 과거 반응 수이며 가짜 인증 계정을 만들지 않습니다.

Supabase SQL Editor에서 프로젝트를 확인한 후 `community.sql` 전체를 실행합니다. 재실행해도 같은 ID의 초기 글·댓글은 중복 생성되지 않습니다. 기존 테이블·사용자 데이터 삭제는 없습니다. 추가 글은 작성자의 로그인 계정에 저장되고, seed 글은 로그인 계정에 귀속되지 않아 일반 사용자가 수정할 수 없습니다.

등록 후 확인:

```sql
select jsonb_extract_path_text(p, 'title') as title,
       jsonb_extract_path_text(p, 'like_count') as likes,
       jsonb_extract_path_text(p, 'comment_count') as comments
from public.community_feed() p;
```

로컬 검증은 임시 PostgreSQL(PGlite)에서 진행했습니다. 앱의 npm 의존성에는 추가하지 않았습니다.

```sh
PGLITE_MODULE_PATH=/private/tmp/dealvue-db-check/node_modules/@electric-sql/pglite/dist/index.js node scripts/check-community-db.mjs
```

현재 적용 여부는 운영 API로 별도 확인해야 합니다. 파일 생성이나 로컬 테스트 통과 자체는 운영 반영을 뜻하지 않습니다.

## 운영 반영 및 확인 — 2026-10-24

Supabase `dealvue` 프로젝트에 적용 완료. 공개 RPC에서 초기 게시글 6개와 댓글 32개를 확인했습니다. Safari의 실제 로그인 계정에서 사진을 첨부한 스타일링 팁 글 1개와 댓글 1개를 추가로 작성해, 현재 글 7개·댓글 33개가 저장되어 있습니다. 사진 Storage URL은 HTTP 200으로 확인했습니다.

- 실제 화면: 목록 사진, 글 상세, 글 작성+사진 첨부, 댓글 작성, 좋아요 추가/해제, MY 필터 확인
- 공개 API: 카테고리·검색 필터, 비로그인 MY 빈 목록, 비로그인 글 작성 HTTP 401 확인
- 임시 PostgreSQL: 마이그레이션 재실행, 타인 글/댓글 수정 금지, 작성자/좋아요 수 조작 금지, 좋아요 중복 방지, 사진 본인 폴더 제한 확인
- 프런트엔드는 로컬에 반영되어 있으며 커밋·배포는 별도입니다.
