-- Only app-chosen display names can become publicly visible author names.
-- Run once on an existing community installation. No records or permissions are removed.
begin;
alter table public.community_posts alter column author_name set default coalesce(nullif(auth.jwt()->'user_metadata'->>'dealvue_nickname',''),'딜뷰 이웃');
alter table public.community_comments alter column author_name set default coalesce(nullif(auth.jwt()->'user_metadata'->>'dealvue_nickname',''),'딜뷰 이웃');
commit;
