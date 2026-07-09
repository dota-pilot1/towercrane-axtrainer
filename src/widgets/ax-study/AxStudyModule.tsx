import { useEffect, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  Globe,
  Lock,
  Plus,
  Trash2,
} from "lucide-react";
import PageHeader from "../../shared/ui/PageHeader";
import { Button } from "../../shared/ui/button";
import { toast } from "../../shared/ui/Toast";
import { getToken } from "../../shared/api/client";
import {
  createNote,
  createWorkspace,
  deleteNote,
  deleteWorkspace,
  getWorkspace,
  listWorkspaces,
  type AxStudyWorkspace,
  type AxStudyWorkspaceDetail,
} from "../../features/ax-study/api";

function VisibilityBadge({ v }: { v: string }) {
  const isPrivate = v === "private";
  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-text-muted">
      {isPrivate ? <Lock size={11} /> : <Globe size={11} />}
      {isPrivate ? "비공개" : v === "shared" ? "공유" : "공개"}
    </span>
  );
}

function AxStudyModule() {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <PageHeader>
        <span className="w-[26px] h-[26px] flex items-center justify-center text-brand-primary bg-brand-glass border border-brand-border rounded-lg">
          <BookOpen size={14} />
        </span>
        <span className="text-[14px] font-bold tracking-tight text-text-primary">
          AX 스터디
        </span>
      </PageHeader>

      <div className="flex-1 overflow-y-auto bg-surface-muted p-6">
        <div className="max-w-4xl mx-auto">
          {openId ? (
            <WorkspaceDetail
              workspaceId={openId}
              onBack={() => setOpenId(null)}
            />
          ) : (
            <WorkspaceList onOpen={setOpenId} />
          )}
        </div>
      </div>
    </div>
  );
}

function WorkspaceList({ onOpen }: { onOpen: (id: string) => void }) {
  const [workspaces, setWorkspaces] = useState<AxStudyWorkspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  async function load() {
    const token = getToken();
    if (!token) {
      setLoading(false);
      setError("로그인이 필요합니다.");
      return;
    }
    setLoading(true);
    try {
      setWorkspaces(await listWorkspaces(token));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function submitCreate() {
    const token = getToken();
    if (!token || !newTitle.trim()) return;
    try {
      await createWorkspace(token, {
        title: newTitle.trim(),
        visibility: "shared",
      });
      setNewTitle("");
      setCreating(false);
      toast.success("워크스페이스를 만들었습니다.");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "만들지 못했습니다.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-[13px] text-text-secondary">
          AX 학습 자료를 워크스페이스로 정리하고 팀과 공유하세요.
        </span>
        {creating ? (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void submitCreate()}
              placeholder="워크스페이스 이름"
              className="ui-input w-52"
            />
            <Button size="sm" onClick={() => void submitCreate()}>
              추가
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setCreating(false);
                setNewTitle("");
              }}
            >
              취소
            </Button>
          </div>
        ) : (
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus size={14} />새 워크스페이스
          </Button>
        )}
      </div>

      {loading ? (
        <div className="text-[13px] text-text-muted py-10 text-center">
          불러오는 중…
        </div>
      ) : error ? (
        <div className="text-[13px] text-text-muted py-10 text-center">
          {error}
        </div>
      ) : workspaces.length === 0 ? (
        <div className="text-[13px] text-text-muted py-10 text-center">
          아직 워크스페이스가 없습니다. 새로 만들어보세요.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {workspaces.map((w) => (
            <button
              key={w.id}
              onClick={() => onOpen(w.id)}
              className="ui-panel text-left p-4 flex flex-col gap-2 hover:border-brand-border transition"
            >
              <div className="flex items-center gap-1.5">
                <BookOpen size={15} className="text-brand-primary" />
                <span className="text-[14px] font-bold text-text-primary truncate">
                  {w.title}
                </span>
              </div>
              {w.description && (
                <span className="text-[13px] text-text-secondary line-clamp-2">
                  {w.description}
                </span>
              )}
              <div className="flex items-center gap-2 mt-auto pt-1">
                <VisibilityBadge v={w.visibility} />
                <span className="text-[11px] text-text-muted">
                  · 노트 {w.noteCount ?? 0}
                </span>
                {!w.isMine && w.ownerName && (
                  <span className="ml-auto text-[11px] text-text-muted">
                    {w.ownerName}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function WorkspaceDetail({
  workspaceId,
  onBack,
}: {
  workspaceId: string;
  onBack: () => void;
}) {
  const [detail, setDetail] = useState<AxStudyWorkspaceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [adding, setAdding] = useState(false);

  async function load() {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      setDetail(await getWorkspace(token, workspaceId));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  async function submitNote() {
    const token = getToken();
    if (!token || !noteTitle.trim()) return;
    try {
      await createNote(token, workspaceId, {
        title: noteTitle.trim(),
        content: noteContent,
      });
      setNoteTitle("");
      setNoteContent("");
      setAdding(false);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "추가하지 못했습니다.");
    }
  }

  async function removeNote(noteId: string) {
    const token = getToken();
    if (!token) return;
    try {
      await deleteNote(token, noteId);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "삭제하지 못했습니다.");
    }
  }

  async function removeWorkspace() {
    const token = getToken();
    if (!token || !detail?.isMine) return;
    try {
      await deleteWorkspace(token, workspaceId);
      toast.success("워크스페이스를 삭제했습니다.");
      onBack();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "삭제하지 못했습니다.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="ui-icon-button size-8">
          <ArrowLeft size={14} />
        </button>
        <span className="text-[15px] font-bold text-text-primary">
          {detail?.title ?? "…"}
        </span>
        {detail && <VisibilityBadge v={detail.visibility} />}
        <div className="flex-1" />
        {detail?.isMine && (
          <Button
            size="sm"
            variant="ghost"
            tone="danger"
            onClick={() => void removeWorkspace()}
          >
            <Trash2 size={13} />
            워크스페이스 삭제
          </Button>
        )}
      </div>

      <div className="ui-panel p-3 flex flex-col gap-2">
        {adding ? (
          <>
            <input
              autoFocus
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              placeholder="노트 제목"
              className="ui-input"
            />
            <textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="내용 (선택)"
              rows={3}
              className="ui-input h-auto py-2 resize-none"
            />
            <div className="flex items-center gap-2 self-end">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setAdding(false);
                  setNoteTitle("");
                  setNoteContent("");
                }}
              >
                취소
              </Button>
              <Button
                size="sm"
                disabled={!noteTitle.trim()}
                onClick={() => void submitNote()}
              >
                노트 추가
              </Button>
            </div>
          </>
        ) : (
          detail?.isMine && (
            <Button size="sm" variant="secondary" onClick={() => setAdding(true)}>
              <Plus size={14} />
              노트 추가
            </Button>
          )
        )}
      </div>

      {loading ? (
        <div className="text-[13px] text-text-muted py-6 text-center">
          불러오는 중…
        </div>
      ) : !detail || detail.notes.length === 0 ? (
        <div className="text-[13px] text-text-muted py-6 text-center">
          아직 노트가 없습니다.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {detail.notes.map((n) => (
            <div key={n.id} className="ui-panel p-4 flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-bold text-text-primary">
                  {n.title}
                </span>
                {detail.isMine && (
                  <button
                    onClick={() => void removeNote(n.id)}
                    className="ml-auto ui-icon-button size-6"
                    title="노트 삭제"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
              {n.content && (
                <p className="text-[13px] text-text-secondary leading-relaxed whitespace-pre-wrap">
                  {n.content}
                </p>
              )}
              {n.tags.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap">
                  {n.tags.map((t) => (
                    <span
                      key={t}
                      className="text-[11px] px-1.5 py-0.5 rounded border border-surface-border-soft bg-surface-muted text-text-secondary"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AxStudyModule;
