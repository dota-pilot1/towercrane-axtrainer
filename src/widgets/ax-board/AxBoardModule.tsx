import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  MessageSquare,
  Newspaper,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import PageHeader from "../../shared/ui/PageHeader";
import { Button } from "../../shared/ui/button";
import { toast } from "../../shared/ui/Toast";
import { getToken } from "../../shared/api/client";
import {
  AX_BOARD_CATEGORIES,
  addComment,
  categoryLabel,
  createPost,
  deleteComment,
  deletePost,
  getPost,
  listPosts,
  updatePost,
  type AxBoardCategory,
  type AxBoardPost,
  type AxBoardPostDetail,
} from "../../features/ax-board/api";

function formatTime(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function CategoryChip({ id }: { id: string }) {
  return (
    <span className="text-[11px] font-bold px-1.5 py-0.5 rounded border border-brand-border bg-brand-glass text-brand-primary">
      {categoryLabel(id)}
    </span>
  );
}

type View =
  | { kind: "list" }
  | { kind: "detail"; postId: string }
  | { kind: "edit"; post: AxBoardPostDetail | null };

function AxBoardModule() {
  const [view, setView] = useState<View>({ kind: "list" });
  const [filter, setFilter] = useState<AxBoardCategory | "all">("all");
  const [posts, setPosts] = useState<AxBoardPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadList() {
    const token = getToken();
    if (!token) {
      setLoading(false);
      setError("로그인이 필요합니다.");
      return;
    }
    setLoading(true);
    try {
      setPosts(await listPosts(token, filter === "all" ? undefined : filter));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (view.kind === "list") void loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, view.kind]);

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <PageHeader>
        <span className="w-[26px] h-[26px] flex items-center justify-center text-brand-primary bg-brand-glass border border-brand-border rounded-lg">
          <Newspaper size={14} />
        </span>
        <span className="text-[14px] font-bold tracking-tight text-text-primary">
          AX 보드
        </span>
      </PageHeader>

      {view.kind === "list" && (
        <>
          {/* 카테고리 필터 + 글쓰기 — 윈도우 버튼과 안 겹치게 별도 줄 */}
          <div className="h-11 shrink-0 flex items-center gap-1 px-4 bg-surface-raised border-b border-surface-border-soft">
            <FilterChip
              active={filter === "all"}
              onClick={() => setFilter("all")}
              label="전체"
            />
            {AX_BOARD_CATEGORIES.map((c) => (
              <FilterChip
                key={c.id}
                active={filter === c.id}
                onClick={() => setFilter(c.id)}
                label={c.label}
              />
            ))}
            <div className="flex-1" />
            <Button
              size="sm"
              onClick={() => setView({ kind: "edit", post: null })}
            >
              <Plus size={14} />
              글쓰기
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto bg-surface-muted p-6">
            <div className="max-w-3xl mx-auto">
              {loading ? (
                <div className="text-[13px] text-text-muted py-10 text-center">
                  불러오는 중…
                </div>
              ) : error ? (
                <div className="text-[13px] text-text-muted py-10 text-center">
                  {error}
                </div>
              ) : posts.length === 0 ? (
                <div className="text-[13px] text-text-muted py-10 text-center">
                  아직 게시글이 없습니다. 첫 글을 남겨보세요.
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {posts.map((p) => (
                    <button
                      key={p.id}
                      onClick={() =>
                        setView({ kind: "detail", postId: p.id })
                      }
                      className="ui-panel text-left p-4 hover:border-brand-border transition flex flex-col gap-1.5"
                    >
                      <div className="flex items-center gap-2">
                        <CategoryChip id={p.category} />
                        <span className="text-[14px] font-bold text-text-primary truncate">
                          {p.title}
                        </span>
                        {p.commentCount > 0 && (
                          <span className="ml-auto flex items-center gap-1 text-[12px] text-text-muted">
                            <MessageSquare size={12} />
                            {p.commentCount}
                          </span>
                        )}
                      </div>
                      {p.content && (
                        <span className="text-[13px] text-text-secondary line-clamp-2">
                          {p.content}
                        </span>
                      )}
                      <span className="text-[12px] text-text-muted">
                        {p.authorName} · {formatTime(p.createdAt)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {view.kind === "detail" && (
        <PostDetail
          postId={view.postId}
          onBack={() => setView({ kind: "list" })}
          onEdit={(post) => setView({ kind: "edit", post })}
        />
      )}

      {view.kind === "edit" && (
        <PostEditor
          post={view.post}
          onDone={() => setView({ kind: "list" })}
          onCancel={() =>
            setView(
              view.post
                ? { kind: "detail", postId: view.post.id }
                : { kind: "list" },
            )
          }
        />
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "h-8 px-3 rounded-md text-[13px] font-semibold transition-colors " +
        (active
          ? "bg-brand-glass text-brand-primary border border-brand-border"
          : "text-text-secondary hover:bg-surface-muted")
      }
    >
      {label}
    </button>
  );
}

function PostDetail({
  postId,
  onBack,
  onEdit,
}: {
  postId: string;
  onBack: () => void;
  onEdit: (post: AxBoardPostDetail) => void;
}) {
  const [post, setPost] = useState<AxBoardPostDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function load() {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      setPost(await getPost(token, postId));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "불러오지 못했습니다.");
      onBack();
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  async function submitComment() {
    const token = getToken();
    if (!token || !comment.trim()) return;
    try {
      setPost(await addComment(token, postId, comment.trim()));
      setComment("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "댓글 등록 실패");
    }
  }

  async function removeComment(commentId: string) {
    const token = getToken();
    if (!token) return;
    try {
      await deleteComment(token, commentId);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "삭제 실패");
    }
  }

  async function removePost() {
    const token = getToken();
    if (!token) return;
    try {
      await deletePost(token, postId);
      toast.success("게시글을 삭제했습니다.");
      onBack();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "삭제 실패");
    }
  }

  return (
    <>
      <div className="h-11 shrink-0 flex items-center gap-2 px-4 bg-surface-raised border-b border-surface-border-soft">
        <button onClick={onBack} className="ui-icon-button size-8">
          <ArrowLeft size={14} />
        </button>
        <span className="text-[13px] text-text-secondary">게시글</span>
        <div className="flex-1" />
        {post?.isMine && (
          <>
            <Button size="sm" variant="ghost" onClick={() => onEdit(post)}>
              <Pencil size={13} />
              수정
            </Button>
            {confirmDelete ? (
              <>
                <span className="text-[12px] text-text-secondary">삭제할까요?</span>
                <Button
                  size="sm"
                  variant="ghost"
                  tone="danger"
                  onClick={() => void removePost()}
                >
                  삭제
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setConfirmDelete(false)}
                >
                  취소
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                tone="danger"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 size={13} />
                삭제
              </Button>
            )}
          </>
        )}
      </div>

      <div className="flex-1 overflow-y-auto bg-surface-muted p-6">
        <div className="max-w-3xl mx-auto flex flex-col gap-4">
          {loading || !post ? (
            <div className="text-[13px] text-text-muted py-10 text-center">
              불러오는 중…
            </div>
          ) : (
            <>
              <div className="ui-panel p-5 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <CategoryChip id={post.category} />
                  <span className="text-[12px] text-text-muted">
                    {post.authorName} · {formatTime(post.createdAt)}
                  </span>
                </div>
                <h1 className="text-[18px] font-bold text-text-primary">
                  {post.title}
                </h1>
                <p className="text-[14px] text-text-primary leading-relaxed whitespace-pre-wrap">
                  {post.content}
                </p>
              </div>

              <div className="ui-panel p-4 flex flex-col gap-3">
                <span className="text-[13px] font-bold text-text-primary">
                  댓글 {post.comments.length}
                </span>
                <div className="flex items-center gap-2 pb-3 border-b border-surface-border-soft">
                  <input
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && void submitComment()}
                    placeholder="댓글을 남겨주세요"
                    className="ui-input flex-1"
                  />
                  <Button
                    size="sm"
                    disabled={!comment.trim()}
                    onClick={() => void submitComment()}
                  >
                    등록
                  </Button>
                </div>
                {post.comments.length === 0 ? (
                  <span className="text-[12px] text-text-muted">
                    첫 댓글을 남겨보세요.
                  </span>
                ) : (
                  <div className="flex flex-col gap-3">
                    {post.comments.map((c) => (
                      <div key={c.id} className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] font-bold text-text-primary">
                            {c.authorName}
                          </span>
                          <span className="text-[11px] text-text-muted">
                            {formatTime(c.createdAt)}
                          </span>
                          {c.isMine && (
                            <button
                              onClick={() => void removeComment(c.id)}
                              className="ml-auto ui-icon-button size-5"
                              title="댓글 삭제"
                            >
                              <Trash2 size={11} />
                            </button>
                          )}
                        </div>
                        <p className="text-[13px] text-text-secondary leading-relaxed whitespace-pre-wrap">
                          {c.content}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

function PostEditor({
  post,
  onDone,
  onCancel,
}: {
  post: AxBoardPostDetail | null;
  onDone: () => void;
  onCancel: () => void;
}) {
  const editing = !!post;
  const [category, setCategory] = useState<AxBoardCategory>(
    post?.category ?? "free",
  );
  const [title, setTitle] = useState(post?.title ?? "");
  const [content, setContent] = useState(post?.content ?? "");
  const [saving, setSaving] = useState(false);
  const canSave = useMemo(() => title.trim().length > 0, [title]);

  async function save() {
    const token = getToken();
    if (!token || !canSave) return;
    setSaving(true);
    try {
      if (editing && post) {
        await updatePost(token, post.id, { category, title, content });
        toast.success("수정했습니다.");
      } else {
        await createPost(token, { category, title, content });
        toast.success("등록했습니다.");
      }
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="h-11 shrink-0 flex items-center gap-2 px-4 bg-surface-raised border-b border-surface-border-soft">
        <button onClick={onCancel} className="ui-icon-button size-8">
          <ArrowLeft size={14} />
        </button>
        <span className="text-[13px] text-text-secondary">
          {editing ? "게시글 수정" : "새 게시글"}
        </span>
        <div className="flex-1" />
        <Button size="sm" disabled={!canSave || saving} onClick={() => void save()}>
          {editing ? "수정" : "등록"}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto bg-surface-muted p-6">
        <div className="max-w-3xl mx-auto flex flex-col gap-3">
          <div className="flex items-center gap-1.5">
            {AX_BOARD_CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => setCategory(c.id)}
                className={
                  "h-8 px-3 rounded-md text-[13px] font-semibold transition-colors " +
                  (category === c.id
                    ? "bg-brand-glass text-brand-primary border border-brand-border"
                    : "text-text-secondary hover:bg-surface-muted border border-surface-border-soft")
                }
              >
                {c.label}
              </button>
            ))}
          </div>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="제목"
            className="ui-input"
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="내용을 입력하세요"
            rows={12}
            className="ui-input h-auto py-2 resize-none"
          />
        </div>
      </div>
    </>
  );
}

export default AxBoardModule;
