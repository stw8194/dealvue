-- Additive community schema. Existing reservations, rewards and avatars are untouched.
begin;
create table if not exists public.community_posts (
 id uuid primary key default gen_random_uuid(),
 author_id uuid references auth.users(id) on delete set null default auth.uid(),
 author_name text not null default coalesce(nullif(auth.jwt()->'user_metadata'->>'dealvue_nickname',''),'딜뷰 이웃'),
 title text not null check (char_length(trim(title)) between 1 and 80),
 body text not null check (char_length(trim(body)) between 1 and 5000),
 category text not null check (category in ('헤어','네일','피부','속눈썹','메이크업','일상')),
 kind text not null check (kind in ('꿀팁','내돈내산 후기','발견 후기','질문')),
 region text not null default '청룡동' check (char_length(region) between 1 and 40),
 image_url text check (image_url is null or image_url ~ '^(/images/|https://)'),
 initial_likes integer not null default 0 check(initial_likes >= 0),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table if not exists public.community_comments (
 id uuid primary key default gen_random_uuid(), post_id uuid not null references public.community_posts(id) on delete cascade,
 author_id uuid references auth.users(id) on delete set null default auth.uid(),
 author_name text not null default coalesce(nullif(auth.jwt()->'user_metadata'->>'dealvue_nickname',''),'딜뷰 이웃'),
 body text not null check(char_length(trim(body)) between 1 and 500), created_at timestamptz not null default now()
);
create table if not exists public.community_likes (
 post_id uuid not null references public.community_posts(id) on delete cascade,
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 primary key(post_id,user_id)
);
create index if not exists community_posts_recent on public.community_posts(created_at desc) where deleted_at is null;
create index if not exists community_comments_post on public.community_comments(post_id,created_at);
alter table public.community_posts enable row level security;
alter table public.community_comments enable row level security;
alter table public.community_likes enable row level security;
revoke all on public.community_posts, public.community_comments, public.community_likes from anon, authenticated;
grant select on public.community_posts, public.community_comments to anon, authenticated;
grant insert(id,title,body,category,kind,region,image_url) on public.community_posts to authenticated;
grant update(title,body,category,kind,region,image_url,deleted_at) on public.community_posts to authenticated;
grant insert(id,post_id,body) on public.community_comments to authenticated;
grant update(body) on public.community_comments to authenticated;
grant delete on public.community_comments to authenticated;
grant select,insert,delete on public.community_likes to authenticated;
drop policy if exists community_posts_read on public.community_posts;
create policy community_posts_read on public.community_posts for select using (deleted_at is null or author_id=auth.uid());
drop policy if exists community_posts_create on public.community_posts;
create policy community_posts_create on public.community_posts for insert to authenticated with check(author_id=auth.uid());
drop policy if exists community_posts_edit on public.community_posts;
create policy community_posts_edit on public.community_posts for update to authenticated using(author_id=auth.uid()) with check(author_id=auth.uid());
drop policy if exists community_comments_read on public.community_comments;
create policy community_comments_read on public.community_comments for select using(exists(select 1 from public.community_posts p where p.id=post_id and p.deleted_at is null));
drop policy if exists community_comments_create on public.community_comments;
create policy community_comments_create on public.community_comments for insert to authenticated with check(author_id=auth.uid() and exists(select 1 from public.community_posts p where p.id=post_id and p.deleted_at is null));
drop policy if exists community_comments_edit on public.community_comments;
create policy community_comments_edit on public.community_comments for update to authenticated using(author_id=auth.uid()) with check(author_id=auth.uid());
drop policy if exists community_comments_delete on public.community_comments;
create policy community_comments_delete on public.community_comments for delete to authenticated using(author_id=auth.uid());
drop policy if exists community_likes_own on public.community_likes;
create policy community_likes_own on public.community_likes for select to authenticated using(user_id=auth.uid());
drop policy if exists community_likes_create on public.community_likes;
create policy community_likes_create on public.community_likes for insert to authenticated with check(user_id=auth.uid() and exists(select 1 from public.community_posts p where p.id=post_id and p.deleted_at is null));
drop policy if exists community_likes_delete on public.community_likes;
create policy community_likes_delete on public.community_likes for delete to authenticated using(user_id=auth.uid());
-- Only aggregate reaction counts are public; individual liker identities stay private.
create or replace function public.community_feed(p_id uuid default null, p_category text default null, p_region text default null, p_search text default null, p_mine boolean default false, p_offset integer default 0)
returns setof jsonb language sql stable security definer set search_path=public,pg_temp as $$
 select to_jsonb(p) - 'deleted_at' - 'initial_likes' || jsonb_build_object(
 'like_count',p.initial_likes+(select count(*) from public.community_likes l where l.post_id=p.id),
 'comment_count',(select count(*) from public.community_comments c where c.post_id=p.id),
 'liked',exists(select 1 from public.community_likes l where l.post_id=p.id and l.user_id=auth.uid()))
 from public.community_posts p where p.deleted_at is null and (p_id is null or p.id=p_id)
 and (p_category is null or p.category=p_category) and (p_region is null or p.region=p_region)
 and (not p_mine or p.author_id=auth.uid())
 and (nullif(trim(p_search),'') is null or p.title ilike '%'||left(p_search,100)||'%' or p.body ilike '%'||left(p_search,100)||'%')
 order by p.created_at desc,p.id limit 30 offset greatest(0,least(p_offset,10000));
$$;
revoke all on function public.community_feed(uuid,text,text,text,boolean,integer) from public;
grant execute on function public.community_feed(uuid,text,text,text,boolean,integer) to anon,authenticated;
-- Initial editorial examples from the supplied design, not visitor/auth accounts.
insert into public.community_posts(id,author_id,author_name,title,body,category,kind,region,image_url,initial_likes,created_at) values
 ('d0000000-0000-4000-8000-000000000001',null,'스킨케어러','민감성 피부 진정 루틴 꿀팁 공유해요 🌿','요즘 환절기라 피부가 뒤집어졌었는데
이 루틴 쓰고 많이 진정됐어요! 데일리 진정템까지 알려드려요 :)

세안은 미온수로 가볍게 하고, 향이 강하지 않은 보습 제품을 얇게 나눠 발라요. 새로운 제품은 먼저 작은 부위에 테스트해 봤어요. 각자의 피부에 맞는 루틴도 댓글로 나눠주세요.','피부','꿀팁','청룡동','/images/community/skincare.png',32,now()-interval '3 hours'),
 ('d0000000-0000-4000-8000-000000000002',null,'머릿결요정','청룡동 헤어샵 여기 진짜 찐이에요! 💁🏻‍♀️','손상모라 고민이었는데 원장님 클리닉 받고
찰랑이 머릿결 됐어요 ✨

먼저 모발 상태를 꼼꼼히 봐주시고 집에서 관리하는 방법도 설명해 주셨어요. 저는 무거운 오일보다 가벼운 에센스를 소량 바르는 게 좋더라고요. 다음에는 커트도 받아보려고요!','헤어','내돈내산 후기','청룡동','/images/community/salon.png',45,now()-interval '1 day'),
 ('d0000000-0000-4000-8000-000000000003',null,'뷰티러버','청룡동 속눈썹 맛집 발견했어요 💕','자연스럽고 오래가는 속눈썹 펌 찾으시는 분들
여기 꼭 가보세요! 유지력 최고예요 👍

과하게 올라가는 것보다 눈매에 맞는 자연스러운 컬을 부탁드렸어요. 눈이 편안하고 아침 준비 시간도 줄었어요. 시술 뒤 주의사항도 친절하게 알려주셨어요.','속눈썹','내돈내산 후기','청룡동','/images/community/lashes.png',28,now()-interval '2 days'),
 ('d0000000-0000-4000-8000-000000000004',null,'네일하루','가을에는 역시 밀크티 네일 🤎','너무 진하지 않은 베이지에 작은 펄 하나! 손이 차분해 보여서 요즘 제일 마음에 드는 디자인이에요. 여러분의 가을 원픽 컬러는 뭔가요?','네일','발견 후기','봉천동','/images/community/nails.png',19,now()-interval '3 days'),
 ('d0000000-0000-4000-8000-000000000005',null,'소소한뷰티','아침 5분, 앞머리 볼륨 살리는 방법','뿌리를 먼저 말리고 큰 롤로 잠깐 식혀주면 볼륨이 한결 자연스럽더라고요. 뜨거운 바람을 너무 오래 쐬지 않는 게 제 팁이에요!','헤어','꿀팁','청룡동','/images/community/salon.png',16,now()-interval '4 days'),
 ('d0000000-0000-4000-8000-000000000006',null,'핑크한스푼','데일리 메이크업, 블러셔 어디에 바르세요?','요즘 자연스러운 생기 메이크업에 빠졌어요. 볼 중앙과 광대 위 중 어디에 바르면 더 예쁜가요? 서로의 작은 팁을 나눠봐요 🌸','메이크업','질문','신림동','/images/community/skincare.png',12,now()-interval '5 days')
on conflict(id) do nothing;
-- Seed actual readable comments, so the pictured counts lead to real comment lists.
insert into public.community_comments(id,post_id,author_id,author_name,body,created_at)
select ('c0000000-0000-4000-'||lpad(p.n::text,4,'0')||'-'||lpad(s::text,12,'0'))::uuid,
 ('d0000000-0000-4000-8000-'||lpad(p.n::text,12,'0'))::uuid,null,
 (array['달빛뷰티','소담','윤슬','오늘도예쁨','봄날'])[1+(s-1)%5],
 (case p.n when 1 then array['자극을 줄이는 루틴이라 좋네요 🌿','보습을 얇게 나눠 바르는 팁 참고할게요!','저도 환절기에는 기본 보습에 집중해요.','새 제품은 부분 테스트 먼저, 기억해 둘게요.','피부에 맞는 루틴을 천천히 찾는 게 좋은 것 같아요 :)'] when 2 then array['머릿결 관리 팁까지 알려주셨다니 좋네요!','저도 클리닉 뒤 홈케어를 신경 쓰고 있어요.','청룡동 뷰티 정보 반가워요 ✨','자연스러운 스타일 너무 좋아요.','다음 커트 후기도 기다릴게요!'] else array['자연스러운 컬이 제일 예쁘더라고요 💕','저도 아침 준비가 편해지는 게 좋았어요.','시술 후 관리도 잘 챙겨야겠네요!','눈매에 맞게 상담하는 게 중요하네요.','속눈썹 후기 공유 고마워요 :)'] end)[1+(s-1)%5], now()-interval '2 hours'+s*interval '1 minute'
from (values(1,14),(2,11),(3,7)) p(n,total) cross join lateral generate_series(1,p.total) s
on conflict(id) do nothing;
commit;

-- Images uploaded by authenticated authors to their own folder only.
begin;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('community-media','community-media',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do nothing;
drop policy if exists community_media_upload on storage.objects;
create policy community_media_upload on storage.objects for insert to authenticated
with check(bucket_id='community-media' and (storage.foldername(name))[1]=auth.uid()::text);
commit;
