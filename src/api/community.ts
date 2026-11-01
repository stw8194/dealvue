import { getSupabaseClient } from './supabase';

export const COMMUNITY_CATEGORIES = ['헤어', '네일', '피부', '속눈썹', '메이크업', '일상'] as const;
export const COMMUNITY_KINDS = ['꿀팁', '내돈내산 후기', '발견 후기', '질문'] as const;
export type CommunityCategory = typeof COMMUNITY_CATEGORIES[number];
export type CommunityKind = typeof COMMUNITY_KINDS[number];
export type Post = { id: string; author_id: string | null; author_name: string; title: string; body: string; category: CommunityCategory; kind: CommunityKind; region: string; image_url: string | null; created_at: string; like_count: number; comment_count: number; liked: boolean };
export type Comment = { id: string; post_id: string; author_id: string | null; author_name: string; body: string; created_at: string };
export type PostDraft = Pick<Post, 'title' | 'body' | 'category' | 'kind' | 'region' | 'image_url'>;
function check(error: { message: string } | null) { if (error) throw new Error(error.message); }
export async function loadPosts(filters: { id?: string; category?: string; region?: string; search?: string; mine?: boolean; offset?: number } = {}, signal?: AbortSignal) {
  let query = getSupabaseClient().rpc('community_feed', { p_id: filters.id ?? null, p_category: filters.category ?? null, p_region: filters.region ?? null, p_search: filters.search ?? null, p_mine: filters.mine ?? false, p_offset: filters.offset ?? 0 });
  if (signal) query = query.abortSignal(signal);
  const { data, error } = await query; check(error); return (data ?? []) as Post[];
}
export async function savePost(draft: PostDraft, id: string, editing = false) {
  const db = getSupabaseClient();
  const { error } = editing ? await db.from('community_posts').update(draft).eq('id', id).select('id').single() : await db.from('community_posts').insert({ ...draft, id });
  // A retry with the same client-generated ID cannot create a second post.
  if (!editing && error?.code === '23505') {
    const { data: { user } } = await db.auth.getUser();
    const [post] = await loadPosts({ id });
    if (post?.author_id === user?.id) return id;
  }
  check(error); return id;
}
export async function removePost(id: string) { const { error } = await getSupabaseClient().from('community_posts').update({ deleted_at: new Date().toISOString() }).eq('id', id).select('id').single(); check(error); }
export async function setPostLike(id: string, liked: boolean, userId: string) {
  const db = getSupabaseClient();
  const { error } = liked ? await db.from('community_likes').upsert({ post_id: id, user_id: userId }, { ignoreDuplicates: true }) : await db.from('community_likes').delete().eq('post_id', id).eq('user_id', userId);
  check(error);
}
export async function loadComments(postId: string) { const { data, error } = await getSupabaseClient().from('community_comments').select('*').eq('post_id', postId).order('created_at'); check(error); return (data ?? []) as Comment[]; }
export async function saveComment(postId: string, body: string, id: string, editing = false) {
  const db = getSupabaseClient();
  const { error } = editing ? await db.from('community_comments').update({ body }).eq('id', id).select('id').single() : await db.from('community_comments').insert({ id, post_id: postId, body });
  if (!editing && error?.code === '23505') { const { data: { user } } = await db.auth.getUser(); const { data } = await db.from('community_comments').select('author_id').eq('id', id).single(); if (user && data?.author_id === user.id) return; }
  check(error);
}
export async function removeComment(id: string) { const { error } = await getSupabaseClient().from('community_comments').delete().eq('id', id).select('id').single(); check(error); }
