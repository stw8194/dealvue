import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Bell, ChevronDown, Heart, MessageCircle, Search, Sparkles, Pencil, X, ImagePlus, Gamepad2, MapPin, Gift } from 'lucide-react';
import { COMMUNITY_CATEGORIES, COMMUNITY_KINDS, loadPosts, savePost, removePost, setPostLike, loadComments, saveComment, removeComment, type Post, type PostDraft, type Comment } from '@/api/community';
import { getSupabaseClient } from '@/api/supabase';
import { RequireLogin } from '@/features/consumer/auth/loginGate';
import { saveReturnPath } from '@/features/consumer/auth/loginReturn';
import { useAuthStore } from '@/store/useAuthStore';
import { useEngagementStore } from './store';
import { fortuneForDay } from './playground/data';
import { localDay } from './store';
import RouletteWheel from './playground/RouletteWheel';
import './community.css';

const REGIONS = ['전체', '청룡동', '봉천동', '신림동', '강남구', '서초구', '마포구', '송파구'];
type Filters = Parameters<typeof loadPosts>[0];
function usePosts(filters: Filters) {
  const userId = useAuthStore(s => s.user?.id);
  const [revision, refresh] = useState(0);
  // Refreshing the same feed retains its DOM; changing filters/account hides old data.
  const key = JSON.stringify({ ...filters, userId });
  const [result, setResult] = useState<{key: string; posts: Post[]; error: boolean; refreshError: boolean}>({key: '', posts: [], error: false, refreshError: false});
  useEffect(() => {
    const abort = new AbortController();
    const { userId: _user, ...query } = JSON.parse(key);
    void _user;
    loadPosts(query, abort.signal).then(posts => {
      if (!abort.signal.aborted) setResult({key, posts, error: false, refreshError: false});
    }).catch(() => {
      if (!abort.signal.aborted) setResult(previous => previous.key === key && !previous.error
        ? { ...previous, refreshError: true }
        : {key, posts: [], error: true, refreshError: false});
    });
    return () => abort.abort();
  }, [key, revision]);
  function likeChanged(id: string, liked: boolean) {
    setResult(previous => previous.key !== key ? previous : {
      ...previous,
      posts: previous.posts.map(post => post.id === id ? {
        ...post, liked, like_count: Math.max(0, post.like_count + (liked === post.liked ? 0 : liked ? 1 : -1)),
      } : post),
    });
    refresh(n => n + 1);
  }
  return { posts: result.key === key ? result.posts : [], loading: result.key !== key,
    error: result.key === key && result.error, refreshError: result.key === key && result.refreshError,
    refresh: () => refresh(n => n + 1), likeChanged };
}
function relativeTime(date: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 60000));
  return minutes < 1 ? '방금 전' : minutes < 60 ? `${minutes}분 전` : minutes < 1440 ? `${Math.floor(minutes / 60)}시간 전` : `${Math.floor(minutes / 1440)}일 전`;
}
function useMemberAction() {
  const user = useAuthStore(s => s.user);
  const navigate = useNavigate();
  return (path: string, action?: () => void) => {
    if (!user) { saveReturnPath(path); navigate('/auth/login'); return; }
    if (action) action(); else navigate(path);
  };
}
function NeighborhoodHeader({children}: {children?: ReactNode}) {
  const notices = useEngagementStore(s => s.notifications.filter(n => !n.read).length);
  return <><header className="neighborhood-header">{children}<div><Link to="/community?tab=doran&search=1" aria-label="게시글 검색"><Search /></Link><Link to="/wishlist" aria-label="찜 목록"><Heart /></Link><Link to="/notifications" aria-label="알림"><Bell />{notices > 0 && <span className="notice-count">{notices > 99 ? '99+' : notices}</span>}</Link></div></header></>;
}
function ErrorPanel({retry, subject = '게시글'}: {retry: () => void; subject?: string}) { return <div className="doran-empty" role="alert"><p>{subject}을 불러오지 못했어요.</p><button onClick={retry}>다시 불러오기</button></div>; }
function LikeButton({post, changed}: {post: Post; changed: (id: string, liked: boolean) => void}) {
  const member = useMemberAction();
  const user = useAuthStore(s => s.user);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState<boolean | null>(null);
  const liked = pending ?? post.liked;
  const count = Math.max(0, post.like_count + (pending === null || pending === post.liked ? 0 : pending ? 1 : -1));
  async function like() {
    if (!user || lock.current) return;
    lock.current = true; setBusy(true); setError('');
    const next = !post.liked;
    setPending(next);
    try { await setPostLike(post.id, next, user.id); changed(post.id, next); }
    catch { setError('다시 시도해 주세요'); }
    finally { lock.current = false; setBusy(false); setPending(null); }
  }
  return <span className="doran-like-wrap"><button type="button" disabled={busy} aria-label={`좋아요 ${count}개`} aria-pressed={liked} onClick={() => member(`/community/${post.id}`, () => void like())}><Heart size={18} fill={liked ? 'currentColor' : 'none'} /><span>{count}</span></button>{error && <small role="alert">{error}</small>}</span>;
}
function PostCard({post, changed}: {post: Post; changed: (id: string, liked: boolean) => void}) {
  return <li className="doran-post-card"><Link to={`/community/${post.id}`} className="doran-post-image">{post.image_url ? <img src={post.image_url} alt="" loading="lazy" /> : <span><MessageCircle size={32} /></span>}<b>{post.kind}</b></Link><div className="doran-post-copy"><Link to={`/community/${post.id}`}><h2>{post.title}</h2><p>{post.body}</p></Link><span className="doran-author">♧ by. {post.author_name} <i>·</i> {relativeTime(post.created_at)}</span><div className="doran-post-meta"><span className="doran-category">{post.category === '피부' ? '스킨케어' : post.category}</span><div><LikeButton post={post} changed={changed} /><Link to={`/community/${post.id}#comments`} aria-label={`댓글 ${post.comment_count}개`}><MessageCircle size={17} />{post.comment_count}</Link></div></div></div></li>;
}
function PlaygroundLanding() {
  const score = fortuneForDay(localDay()).score;
  return <div className="neighborhood-play"><article className="neighborhood-game"><div className="neighborhood-game-art"><span className="feature-pill">지금 인기</span><div className="game-copy"><p>나만의 스타일 로드</p><h1>프리티 걸</h1><span>캐릭터를 키우고<br />예쁘게 꾸며보세요!</span></div><span className="neighborhood-game-avatar" role="img" aria-label="나만의 캐릭터 스타일 꾸미기" /></div><footer><Gamepad2 size={40} /><p>나만의 캐릭터를 키우는<br />스타일 육성 게임!</p><Link to="/mypage/playground">게임 시작하기</Link></footer></article><article className="neighborhood-fortune"><div className="neighborhood-fortune-art"><img src="/images/community/crystal.png" alt="별빛으로 빛나는 보라색 수정구슬" /><span className="feature-pill">새로 나왔어요</span><div><h2>오늘의 운세</h2><p>오늘 당신의 하루는<br /><strong>{score}</strong> 점입니다.</p><span>지금 확인해보세요 →</span></div></div><footer><Sparkles size={32} /><p>오늘의 운세, 컬러, 아이템을 통해<br />당신의 하루를 더 빛나게!</p><Link to="/fortune" state={{ playgroundReturnTo: "/community" }}>운세 확인하기</Link></footer></article><article className="neighborhood-roulette"><div className="neighborhood-roulette-art"><span className="feature-pill">매일 한 번</span><div className="roulette-card-copy"><p>오늘의 작은 행운</p><h2>행운 룰렛</h2><p>꽝 없이 만나는 선물<br /><strong>최대 100 P</strong></p><span>빙글빙글, 행운을 모아보세요 ✦</span></div><div className="roulette-card-wheel" aria-hidden="true"><RouletteWheel /><span>LUCKY</span><i /></div></div><footer><Gift size={32} /><p>매일 모은 포인트로<br />나만의 스타일을 완성해요!</p><Link to="/rewards?tab=roulette" state={{ playgroundReturnTo: "/community" }}>룰렛 만나보기</Link></footer></article></div>;
}
function WriteBanner() { return <aside className="doran-write-banner"><p>우리 동네 뷰티 정보를 함께 나눠요!</p><h2>꿀팁도, 후기도 함께해요!</h2><p>나누면 나눌수록 더 예뻐지는 우리 동네 ✨</p><div><Link to="/community/new?kind=꿀팁">꿀팁 공유하기 <Sparkles size={15} /></Link><Link to="/community/new?kind=내돈내산 후기">내돈내산 후기 작성하기 <Pencil size={15} /></Link></div></aside>; }
export function CommunityPage() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'doran' || params.get('board') === 'neighbors' ? 'doran' : 'playground';
  const category = params.get('category') ?? '';
  const region = params.get('region') ?? '전체';
  const mine = params.get('mine') === '1';
  const search = params.get('q') ?? '';
  const [searchText, setSearchText] = useState(search);
  const [regionOpen, setRegionOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [page, setPage] = useState(0);
  const member = useMemberAction();
  const { posts, loading, error, refresh, refreshError, likeChanged } = usePosts({ category: category || undefined, region: region === '전체' ? undefined : region, mine, search, offset: page * 30 });
  function filter(key: string, value: string) { const next = new URLSearchParams(params); if(value) next.set(key,value); else next.delete(key); setParams(next); setPage(0); }
  function searchPosts(event: FormEvent) { event.preventDefault(); filter('q',searchText.trim()); }
  return <main className="neighborhood-page"><NeighborhoodHeader><button className="neighborhood-region" onClick={() => setRegionOpen(true)}>{region === '전체' ? '우리동네' : region}<ChevronDown size={19} /></button></NeighborhoodHeader><nav className="neighborhood-tabs" aria-label="우리동네 메뉴"><Link to="/community" aria-current={tab === 'playground' ? 'page' : undefined}>놀이터 {tab === 'playground' && '✦'}</Link><Link to="/community?tab=doran" aria-current={tab === 'doran' ? 'page' : undefined}>도란도란 {tab === 'doran' && '✦'}</Link></nav>{tab === 'playground' ? <PlaygroundLanding /> : <><div className="doran-filters"><button aria-pressed={mine} onClick={() => member('/community?tab=doran&mine=1', () => filter('mine',mine ? '' : '1'))}>MY</button><button className="category-picker" aria-expanded={categoryOpen} onClick={() => setCategoryOpen(!categoryOpen)}>{category || '전체 카테고리'}<ChevronDown size={16} /></button>{COMMUNITY_CATEGORIES.slice(0,4).map(c => <button key={c} aria-pressed={category === c} onClick={() => filter('category',category === c ? '' : c)}>{c}</button>)}</div>{categoryOpen && <div className="doran-category-options"><button onClick={() => {filter('category',''); setCategoryOpen(false);}}>전체</button>{COMMUNITY_CATEGORIES.map(c => <button key={c} aria-pressed={category === c} onClick={() => {filter('category',c);setCategoryOpen(false);}}>{c}</button>)}</div>}{(params.has('search') || search) && <form className="doran-search" onSubmit={searchPosts}><Search size={18} /><input aria-label="게시글 검색어" placeholder="뷰티 이야기, 관리 팁을 검색해 보세요" value={searchText} onChange={e => setSearchText(e.target.value)} maxLength={100} /><button>검색</button>{search && <button type="button" aria-label="검색 초기화" onClick={() => {setSearchText('');filter('q','');}}><X size={17} /></button>}</form>}<section className="doran-feed" aria-label="도란도란 게시글">{mine && <h1 className="doran-my-title">내가 쓴 이야기</h1>}{loading ? <p className="doran-empty" role="status">이웃들의 이야기를 불러오고 있어요…</p> : error ? <ErrorPanel retry={refresh} /> : posts.length ? <ul>{posts.map(post => <PostCard key={post.id} post={post} changed={likeChanged} />)}</ul> : <div className="doran-empty"><MessageCircle size={30} /><h2>{mine ? '아직 작성한 글이 없어요' : '아직 이 조건에 맞는 이야기가 없어요'}</h2><p>첫 번째 이야기를 들려주세요.</p><Link to="/community/new">이야기 쓰기</Link></div>}{refreshError && <p className="doran-refresh-note" role="status">최신 정보를 확인하지 못했어요. <button type="button" onClick={refresh}>다시 확인</button></p>}{(page > 0 || posts.length === 30) && <div className="doran-pagination"><button disabled={page === 0} onClick={() => setPage(p=>p-1)}>이전</button><span>{page+1}</span><button disabled={posts.length < 30} onClick={() => setPage(p=>p+1)}>다음</button></div>}</section><WriteBanner /><Link to="/community/new" className="doran-floating-write" aria-label="도란도란 글쓰기"><Pencil size={17} />글쓰기</Link></>}{regionOpen && <div className="doran-dialog-backdrop" onClick={() => setRegionOpen(false)}><section role="dialog" aria-modal="true" aria-labelledby="region-title" className="doran-region-dialog" onClick={e => e.stopPropagation()}><header><h2 id="region-title">어느 동네 이야기가 궁금하세요?</h2><button aria-label="닫기" onClick={() => setRegionOpen(false)}><X size={20} /></button></header><div>{REGIONS.map(r => <button key={r} aria-pressed={region===r} onClick={() => {filter('region',r);setRegionOpen(false);}}><MapPin size={15} />{r === '전체' ? '모든 동네' : r}</button>)}</div></section></div>}</main>;
}
function DetailShell({title,children}: {title: string; children: ReactNode}) { return <main className="neighborhood-page doran-detail"><header className="doran-detail-header"><Link to="/community?tab=doran" aria-label="도란도란 목록"><ArrowLeft size={22} /></Link><h1>{title}</h1><Link to="/community/new" aria-label="글쓰기"><Pencil size={19} /></Link></header>{children}</main>; }
export function CommunityEditorPage() { return <RequireLogin><Editor /></RequireLogin>; }
function Editor() {
  const [params] = useSearchParams();
  const id = params.get('edit');
  const { posts, loading, error, refresh } = usePosts({ id: id ?? undefined });
  const user = useAuthStore(s => s.user);
  if (id && loading) return <DetailShell title="이야기 수정"><p className="doran-empty">글을 불러오는 중이에요…</p></DetailShell>;
  if (id && error) return <DetailShell title="이야기 수정"><ErrorPanel retry={refresh} /></DetailShell>;
  if (id && (!posts[0] || posts[0].author_id !== user?.id)) return <DetailShell title="이야기 수정"><p className="doran-empty">본인이 작성한 글만 수정할 수 있어요.</p></DetailShell>;
  const kind = COMMUNITY_KINDS.find(k=>k === params.get('kind')) ?? '꿀팁';
  return <DetailShell title={id ? '이야기 수정' : '도란도란 글쓰기'}><PostForm key={id ?? 'new'} existing={id ? posts[0] : undefined} initialKind={kind} /></DetailShell>;
}
function PostForm({ existing, initialKind }: { existing?: Post; initialKind: PostDraft['kind'] }) {
  const navigate = useNavigate();
  const user = useAuthStore(s=>s.user);
  const [draft,setDraft] = useState<PostDraft>(existing ?? {title:'',body:'',category:'피부',kind:initialKind,region:'청룡동',image_url:null});
  const id = useRef(existing?.id ?? crypto.randomUUID());
  const [file,setFile] = useState<File | null>(null);
  const [preview,setPreview] = useState(existing?.image_url ?? '');
  const [busy,setBusy] = useState(false);
  const lock = useRef(false);
  const uploaded = useRef<string | null>(null);
  const [error,setError] = useState('');
  function change<K extends keyof PostDraft>(key:K,value:PostDraft[K]) { setDraft(d=>({...d,[key]:value})); }
  const previewUrl = useRef<string | null>(null);
  const photoId = useRef(crypto.randomUUID());
  useEffect(() => () => { if (previewUrl.current) URL.revokeObjectURL(previewUrl.current); }, []);
  async function submit(e:FormEvent) {
    e.preventDefault(); if(lock.current || !user) return;
    lock.current=true;setBusy(true);setError('');
    try {
      let image = draft.image_url;
      if(file && !uploaded.current) {
        const path=`${user.id}/${photoId.current}.${file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'}`;
        const bucket=getSupabaseClient().storage.from('community-media');
        const {error}=await bucket.upload(path,file,{upsert:false,contentType:file.type});
        if(error && error.message !== 'The resource already exists') throw error;
        uploaded.current=bucket.getPublicUrl(path).data.publicUrl;
      }
      if(uploaded.current) image=uploaded.current;
      await savePost({title:draft.title.trim(),body:draft.body.trim(),category:draft.category,kind:draft.kind,region:draft.region,image_url:image},id.current,Boolean(existing));
      navigate(`/community/${id.current}`,{replace:true});
    } catch {setError('저장하지 못했어요. 입력한 내용은 유지되니 다시 시도해 주세요.');}
    finally {lock.current=false;setBusy(false);}
  }
  return <form className="doran-editor" onSubmit={submit}><p className="doran-editor-intro">작은 꿀팁부터 솔직한 후기까지, 이웃과 함께 나눠요 🌷</p><fieldset><legend>어떤 이야기인가요?</legend><div className="doran-choice">{COMMUNITY_KINDS.map(k=><button type="button" key={k} aria-pressed={draft.kind===k} onClick={()=>change('kind',k)}>{k}</button>)}</div></fieldset><fieldset><legend>카테고리</legend><div className="doran-choice">{COMMUNITY_CATEGORIES.map(c=><button type="button" key={c} aria-pressed={draft.category===c} onClick={()=>change('category',c)}>{c}</button>)}</div></fieldset><fieldset><legend>동네</legend><div className="doran-choice">{REGIONS.slice(1).map(r=><button type="button" key={r} aria-pressed={draft.region===r} onClick={()=>change('region',r)}>{r}</button>)}</div></fieldset><label>제목<input value={draft.title} onChange={e=>change('title',e.target.value)} maxLength={80} required placeholder="어떤 이야기를 나누고 싶나요?" /><small>{draft.title.length}/80</small></label><label>내용<textarea value={draft.body} onChange={e=>change('body',e.target.value)} maxLength={5000} minLength={1} required rows={8} placeholder="직접 경험한 이야기나 나만의 관리 팁을 편하게 적어주세요." /><small>{draft.body.length}/5,000</small></label><label className="doran-image-upload"><ImagePlus size={22} />사진 추가 <small>JPG·PNG·WebP / 최대 5 MB</small><input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={e=>{const f=e.target.files?.[0];if(!f)return;if(!['image/jpeg','image/png','image/webp'].includes(f.type)||f.size>5*1024*1024){setError('5 MB 이하의 JPG, PNG, WebP 사진을 선택해 주세요.');e.target.value='';return;}if(previewUrl.current) URL.revokeObjectURL(previewUrl.current); previewUrl.current=URL.createObjectURL(f); setPreview(previewUrl.current); photoId.current=crypto.randomUUID(); setFile(f);uploaded.current=null;setError('');}} /></label>{preview && <img className="doran-upload-preview" src={preview} alt="첨부 사진 미리보기" />}<p className="doran-editor-note">다른 사람의 개인정보나 동의받지 않은 사진은 올리지 말아주세요.</p>{error && <p role="alert" className="doran-error">{error}</p>}<button className="doran-primary" disabled={busy || !draft.title.trim() || !draft.body.trim()}>{busy ? '저장하고 있어요…' : existing ? '수정 완료' : '이야기 등록하기'}</button></form>;
}
export function CommunityPostPage() { const {postId}=useParams(); return <PostDetail key={postId} id={postId ?? ''} />; }
function PostDetail({id}:{id:string}) {
  const {posts,loading,error,refresh,refreshError,likeChanged}=usePosts({id});
  const post=posts[0];
  const user=useAuthStore(s=>s.user);
  const member=useMemberAction();
  const navigate=useNavigate();
  const [comments,setComments]=useState<Comment[]>([]);
  const [commentsError,setCommentsError]=useState(false);
  const [commentsLoading,setCommentsLoading]=useState(true);
  const [body,setBody]=useState('');
  const [editId,setEditId]=useState<string | null>(null);
  const [busy,setBusy]=useState(false);
  const lock=useRef(false);
  const commentId=useRef(crypto.randomUUID());
  const [feedback,setFeedback]=useState('');
  const [deleteTarget,setDeleteTarget]=useState<string | null>(null);
  const { hash } = useLocation();
  const commentsAnchor = useRef<HTMLElement>(null);
  const postImage = useRef<HTMLImageElement>(null);
  useEffect(() => {
    if (loading || hash !== '#comments') return;
    let frame = 0;
    const jump = () => { frame = requestAnimationFrame(() => commentsAnchor.current?.scrollIntoView({ block: 'start' })); };
    const image = postImage.current;
    if (image && !image.complete) { image.addEventListener('load', jump, { once: true }); image.addEventListener('error', jump, { once: true }); }
    else jump();
    return () => { cancelAnimationFrame(frame); image?.removeEventListener('load', jump); image?.removeEventListener('error', jump); };
  }, [loading, hash]);
  async function reloadComments() {setCommentsLoading(true);try{setComments(await loadComments(id));setCommentsError(false);}catch{setCommentsError(true);}finally{setCommentsLoading(false);}}
  useEffect(()=>{let active=true;loadComments(id).then(c=>{if(active)setComments(c);}).catch(()=>{if(active)setCommentsError(true);}).finally(()=>{if(active)setCommentsLoading(false);});return()=>{active=false;};},[id]);
  async function comment(e:FormEvent) {
    e.preventDefault();member(`/community/${id}#comments`,()=>{void send();});
    async function send(){if(lock.current||!body.trim())return;lock.current=true;setBusy(true);setFeedback('');try{await saveComment(id,body.trim(),editId??commentId.current,Boolean(editId));setBody('');setEditId(null);commentId.current=crypto.randomUUID();await reloadComments();refresh();setFeedback('댓글을 저장했어요.');}catch{setFeedback('댓글을 저장하지 못했어요. 다시 시도해 주세요.');}finally{lock.current=false;setBusy(false);}}
  }
  async function confirmDelete(){if(!deleteTarget||lock.current)return;lock.current=true;setBusy(true);try{if(deleteTarget==='post'){await removePost(id);navigate('/community?tab=doran',{replace:true});}else{await removeComment(deleteTarget);await reloadComments();refresh();}setDeleteTarget(null);}catch{setFeedback('삭제하지 못했어요. 다시 시도해 주세요.');}finally{lock.current=false;setBusy(false);}}
  if(loading)return <DetailShell title="도란도란"><p className="doran-empty">이야기를 불러오고 있어요…</p></DetailShell>;
  if(error)return <DetailShell title="도란도란"><ErrorPanel retry={refresh}/></DetailShell>;
  if(!post)return <DetailShell title="도란도란"><p className="doran-empty">삭제되었거나 찾을 수 없는 글이에요.</p></DetailShell>;
  return <DetailShell title="도란도란"><article className="doran-article"><div className="doran-article-tags"><span>{post.kind}</span><span>{post.category}</span><span>{post.region}</span></div><h1>{post.title}</h1><p className="doran-author">by. {post.author_name} · {relativeTime(post.created_at)}</p>{post.image_url&&<img ref={postImage} className="doran-article-image" src={post.image_url} alt="게시글 첨부 사진"/>}<p className="doran-article-body">{post.body}</p><div className="doran-article-actions"><LikeButton post={post} changed={likeChanged}/><span><MessageCircle size={17}/>댓글 {post.comment_count}</span>{user?.id===post.author_id&&<><Link to={`/community/new?edit=${id}`}>수정</Link><button onClick={()=>setDeleteTarget('post')}>삭제</button></>}</div></article>{refreshError && <p className="doran-refresh-note" role="status">최신 정보를 확인하지 못했어요. <button type="button" onClick={refresh}>다시 확인</button></p>}<section ref={commentsAnchor} id="comments" className="doran-comments"><h2>함께 나누는 이야기 <span>{post.comment_count}</span></h2>{commentsLoading&&!comments.length?<p role="status" className="doran-editor-note">댓글을 불러오고 있어요…</p>:commentsError?<ErrorPanel subject="댓글" retry={()=>void reloadComments()}/>:comments.length?<ul>{comments.map(c=><li key={c.id}><div><strong>{c.author_name}</strong><time>{relativeTime(c.created_at)}</time></div><p>{c.body}</p>{c.author_id===user?.id&&<div className="doran-comment-actions"><button onClick={()=>{setEditId(c.id);setBody(c.body);document.getElementById('comment-body')?.focus();}}>수정</button><button onClick={()=>setDeleteTarget(c.id)}>삭제</button></div>}</li>)}</ul>:<p className="doran-editor-note">첫 댓글로 이야기를 시작해 주세요.</p>}<form onSubmit={comment}><label htmlFor="comment-body">{editId?'댓글 수정':'댓글 남기기'}</label><textarea id="comment-body" value={body} onChange={e=>setBody(e.target.value)} maxLength={500} rows={3} placeholder={user?'따뜻한 댓글을 남겨주세요':'로그인 후 댓글을 남길 수 있어요'} required/><div>{editId&&<button type="button" onClick={()=>{setEditId(null);setBody('');}}>취소</button>}<button className="doran-primary" disabled={busy||!body.trim()}>{busy?'저장 중…':editId?'수정 완료':'댓글 등록'}</button></div></form><p role="status" className="doran-error">{feedback}</p></section>{deleteTarget&&<div className="doran-dialog-backdrop"><section role="dialog" aria-modal="true" aria-labelledby="delete-title" className="doran-region-dialog"><h2 id="delete-title">{deleteTarget==='post'?'이 이야기를 삭제할까요?':'이 댓글을 삭제할까요?'}</h2><p>{deleteTarget==='post'?'삭제한 글은 목록에서 숨겨집니다.':'댓글을 삭제하면 되돌릴 수 없어요.'}</p><div><button disabled={busy} onClick={()=>setDeleteTarget(null)}>취소</button><button disabled={busy} className="doran-primary" onClick={()=>void confirmDelete()}>삭제하기</button></div></section></div>}</DetailShell>;
}
