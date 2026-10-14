import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { PreviewBoundary } from "@/features/consumer/preview";
import { EmptyState, Page } from "@/features/consumer/ui";
import { PREVIEW_AUTHOR, REGIONS, TAGS, useEngagementStore } from "./store";
import type { Board, CommunityPost } from "./store";

const inputClass = "w-full rounded-lg border border-page-border bg-white p-3 text-sm";
const buttonClass = "rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-40";

export function CommunityPage() {
  return <Page title="우리 동네 커뮤니티"><PreviewBoundary><CommunityFeed /></PreviewBoundary></Page>;
}

function CommunityFeed() {
  const posts = useEngagementStore(state => state.posts);
  const [params, setParams] = useSearchParams();
  const board: Board = params.get("board") === "neighbors" ? "neighbors" : "playground";
  const region = params.get("region") ?? "전체";
  const tag = params.get("tag") ?? "전체";
  function filter(key: string, value: string) { const next = new URLSearchParams(params); next.set(key, value); setParams(next); }
  const visible = posts.filter(post => post.board === board && (region === "전체" || post.region === region) && (tag === "전체" || post.tags.includes(tag)));
  return <div className="space-y-4">
    <p className="text-sm text-page-text">체험 글과 댓글은 이 브라우저에만 저장됩니다.</p>
    <div className="flex gap-2" aria-label="게시판 선택">
      {([["playground", "놀이터"], ["neighbors", "도란도란"]] as const).map(([key, label]) => <button key={key} type="button" aria-pressed={board === key} onClick={() => filter("board", key)} className={`flex-1 rounded-lg border p-3 text-sm ${board === key ? "border-accent text-accent" : "border-page-border"}`}>{label}</button>)}
    </div>
    <div className="grid grid-cols-2 gap-3">
      <label className="space-y-1 text-sm">동네<select value={region} onChange={event => filter("region", event.target.value)} className={inputClass}>{REGIONS.map(value => <option key={value}>{value}</option>)}</select></label>
      <label className="space-y-1 text-sm">관심 태그<select value={tag} onChange={event => filter("tag", event.target.value)} className={inputClass}>{["전체", ...TAGS].map(value => <option key={value}>{value}</option>)}</select></label>
    </div>
    <Link to={`/community/new?board=${board}`} className="inline-block rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white">글쓰기</Link>
    {visible.length === 0 ? <EmptyState title="이 조건에 맞는 글이 없어요" description="동네나 태그를 바꾸거나 첫 글을 남겨보세요." /> : <ul className="space-y-3">{visible.map(post => <li key={post.id} className="rounded-xl border border-page-border p-4">
      <Link to={`/community/${post.id}`} className="block space-y-2"><p className="text-xs text-page-text">{post.region} · {post.authorName}</p><h2 className="font-semibold">{post.title}</h2><p className="line-clamp-2 whitespace-pre-wrap text-sm text-page-text">{post.body}</p><p className="text-xs text-page-text">{post.tags.map(value => `#${value}`).join(" ")} · 좋아요 {post.liked ? 1 : 0} · 댓글 {post.comments.length}</p></Link>
    </li>)}</ul>}
  </div>;
}

export function CommunityEditorPage() {
  return <Page title="커뮤니티 글쓰기"><PreviewBoundary><CommunityEditor /></PreviewBoundary></Page>;
}

function CommunityEditor() {
  const [params] = useSearchParams();
  const id = params.get("edit") ?? undefined;
  const post = useEngagementStore(state => state.posts.find(item => item.id === id));
  if (id && (!post || post.authorId !== PREVIEW_AUTHOR)) return <EmptyState title="수정할 수 없는 글이에요" action={<Link to="/community">목록으로</Link>} />;
  return <PostForm key={id ?? "new"} existing={post} initialBoard={params.get("board") === "neighbors" ? "neighbors" : "playground"} />;
}

function PostForm({ existing, initialBoard }: { existing?: CommunityPost; initialBoard: Board }) {
  const navigate = useNavigate();
  const savePost = useEngagementStore(state => state.savePost);
  const [board, setBoard] = useState<Board>(existing?.board ?? initialBoard);
  const [region, setRegion] = useState(existing?.region ?? "강남구");
  const [title, setTitle] = useState(existing?.title ?? "");
  const [body, setBody] = useState(existing?.body ?? "");
  const [tags, setTags] = useState(existing?.tags ?? []);
  const [error, setError] = useState("");
  function submit(event: FormEvent) {
    event.preventDefault();
    const id = savePost({ board, region, title, body, tags }, existing?.id);
    if (id) navigate(`/community/${id}`, { replace: true });
    else setError("제목과 내용을 확인해 주세요.");
  }
  return <form onSubmit={submit} className="space-y-4">
    <p className="text-sm text-page-text">체험용 글은 다른 사용자에게 공개되지 않습니다.</p>
    <label className="block space-y-1 text-sm">게시판<select className={inputClass} value={board} onChange={event => setBoard(event.target.value as Board)}><option value="playground">놀이터</option><option value="neighbors">도란도란</option></select></label>
    <label className="block space-y-1 text-sm">동네<select className={inputClass} value={region} onChange={event => setRegion(event.target.value)}>{REGIONS.filter(value => value !== "전체").map(value => <option key={value}>{value}</option>)}</select></label>
    <label className="block space-y-1 text-sm">제목<input className={inputClass} value={title} onChange={event => setTitle(event.target.value)} maxLength={80} required /></label>
    <label className="block space-y-1 text-sm">내용<textarea className={inputClass} value={body} onChange={event => setBody(event.target.value)} rows={7} maxLength={3000} required /></label>
    <fieldset><legend className="mb-2 text-sm">태그</legend><div className="flex flex-wrap gap-2">{TAGS.map(tag => <label key={tag} className="flex items-center gap-1 rounded-lg border border-page-border px-3 py-2 text-sm"><input type="checkbox" checked={tags.includes(tag)} onChange={() => setTags(current => current.includes(tag) ? current.filter(value => value !== tag) : [...current, tag])} />{tag}</label>)}</div></fieldset>
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    <div className="flex items-center gap-4"><button className={buttonClass} disabled={!title.trim() || !body.trim()}>{existing ? "체험 글 수정" : "체험 글 등록"}</button><Link to={existing ? `/community/${existing.id}` : "/community"} className="text-sm">취소</Link></div>
  </form>;
}

export function CommunityPostPage() {
  return <Page title="커뮤니티 이야기"><PreviewBoundary><PostDetail /></PreviewBoundary></Page>;
}

function PostDetail() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const { posts, togglePostLike, deletePost, addComment, deleteComment, editComment } = useEngagementStore();
  const post = posts.find(item => item.id === postId);
  const [comment, setComment] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingBody, setEditingBody] = useState("");
  const [feedback, setFeedback] = useState("");
  if (!post) return <EmptyState title="글을 찾을 수 없어요" description="삭제된 글이거나 잘못된 주소입니다." action={<Link to="/community">목록으로</Link>} />;
  function submitComment(event: FormEvent) {
    event.preventDefault();
    if (addComment(post!.id, comment)) { setComment(""); setFeedback("댓글을 이 브라우저에 저장했어요."); }
  }
  return <div className="space-y-5">
    <Link to={`/community?board=${post.board}`} className="text-sm text-accent">목록으로</Link>
    <article className="space-y-3"><p className="text-xs text-page-text">{post.region} · {post.authorName} · {new Date(post.createdAt).toLocaleDateString("ko-KR")}</p><h2 className="text-xl font-bold">{post.title}</h2><p className="whitespace-pre-wrap break-words text-sm leading-7">{post.body}</p><p className="text-sm text-page-text">{post.tags.map(tag => `#${tag}`).join(" ")}</p></article>
    <div className="flex flex-wrap items-center gap-4 text-sm"><button type="button" aria-pressed={post.liked} onClick={() => togglePostLike(post.id)} className="rounded-lg border border-page-border px-3 py-2">{post.liked ? "♥" : "♡"} 좋아요 {post.liked ? 1 : 0}</button>{post.authorId === PREVIEW_AUTHOR && <><Link to={`/community/new?edit=${post.id}`} className="text-accent">수정</Link><button type="button" className="text-red-600" onClick={() => { if (window.confirm("이 체험 글과 댓글을 삭제할까요?") && deletePost(post.id)) navigate("/community", { replace: true }); }}>삭제</button></>}</div>
    <section className="space-y-3"><h2 className="font-semibold">댓글 {post.comments.length}</h2>{post.comments.length === 0 && <p className="text-sm text-page-text">첫 댓글을 남겨보세요.</p>}<ul className="space-y-3">{post.comments.map(item => <li key={item.id} className="space-y-2 rounded-lg bg-gray-50 p-3"><p className="text-xs text-page-text">{item.authorName}</p>{editingId === item.id ? <form className="space-y-2" onSubmit={event => { event.preventDefault(); if (editComment(post.id, item.id, editingBody)) setEditingId(null); }}><label className="block text-sm">댓글 수정<textarea value={editingBody} onChange={event => setEditingBody(event.target.value)} maxLength={500} required className={inputClass} /></label><button className={buttonClass} disabled={!editingBody.trim()}>저장</button><button type="button" className="ml-3 text-sm" onClick={() => setEditingId(null)}>취소</button></form> : <p className="whitespace-pre-wrap break-words text-sm">{item.body}</p>}{item.authorId === PREVIEW_AUTHOR && editingId !== item.id && <div className="flex gap-3 text-xs"><button type="button" className="text-accent" onClick={() => { setEditingId(item.id); setEditingBody(item.body); }}>수정</button><button type="button" className="text-red-600" onClick={() => { if (window.confirm("이 댓글을 삭제할까요?")) deleteComment(post.id, item.id); }}>삭제</button></div>}</li>)}</ul><form onSubmit={submitComment} className="space-y-2"><label className="block text-sm">댓글 남기기<textarea className={inputClass} value={comment} onChange={event => setComment(event.target.value)} maxLength={500} rows={3} required /></label><button className={buttonClass} disabled={!comment.trim()}>체험 댓글 등록</button></form></section>
    <p role="status" className="text-sm text-page-text">{feedback}</p>
  </div>;
}
