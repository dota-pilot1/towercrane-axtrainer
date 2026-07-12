import { useEffect, useMemo, useState } from "react";
import {
  Check,
  CircleDashed,
  ExternalLink,
  Globe,
  ListChecks,
  Loader2,
  Lock,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  StickyNote,
  Trash2,
  UserSearch,
  Users,
  X,
} from "lucide-react";
import PageHeader from "../../shared/ui/PageHeader";
import { Button } from "../../shared/ui/button";
import { LexicalEditor } from "../../shared/ui/lexical/lexical-editor";
import { CompactSelect } from "../../shared/ui/compact-select";
import { toast } from "../../shared/ui/Toast";
import { getToken } from "../../shared/api/client";
import {
  createItem,
  createItemNote,
  createPlan,
  deleteItem,
  deleteItemNote,
  deletePlan,
  getPlan,
  listItemNotes,
  listPlans,
  listUsers,
  updateItem,
  updateItemNote,
  updatePlan,
  type StudyItemStatus,
  type AiStudyNote,
  type AiStudyNoteDetail,
  type PlanOwner,
  type AiStudyNoteItem,
  type AiStudyNoteItemNote,
  type AiStudyNoteVisibility,
} from "../../features/ai-study-note/api";

const STATUS_META: Record<
  StudyItemStatus,
  { label: string; chip: string; dot: string }
> = {
  todo: {
    label: "예정",
    chip: "bg-surface-muted text-text-muted border-surface-border-soft",
    dot: "border-surface-border text-transparent",
  },
  doing: {
    label: "진행중",
    chip: "bg-brand-glass text-brand-primary border-brand-border",
    dot: "border-brand-border text-transparent",
  },
  done: {
    label: "완료",
    chip: "bg-brand-glass text-brand-primary border-brand-border",
    dot: "border-brand-primary bg-brand-primary text-text-on-brand",
  },
};

const STATUS_ORDER: StudyItemStatus[] = ["todo", "doing", "done"];

function VisibilityBadge({ v }: { v: string }) {
  const isPrivate = v === "private";
  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-text-muted">
      {isPrivate ? <Lock size={11} /> : <Globe size={11} />}
      {isPrivate ? "비공개" : "공개"}
    </span>
  );
}

const VISIBILITY_OPTIONS: {
  value: AiStudyNoteVisibility;
  label: string;
  icon: typeof Lock;
}[] = [
  { value: "private", label: "비공개", icon: Lock },
  { value: "public", label: "공개", icon: Globe },
];

// 계획 소유자용 — 비공개/공개 세그먼트 토글. 공개면 다른 사람 목록에 노출됨.
function VisibilityToggle({
  value,
  onChange,
}: {
  value: AiStudyNoteVisibility;
  onChange: (v: AiStudyNoteVisibility) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-surface-border-soft bg-surface-muted p-0.5">
      {VISIBILITY_OPTIONS.map(({ value: v, label, icon: Icon }) => {
        const on = value === v;
        return (
          <button
            key={v}
            onClick={() => onChange(v)}
            title={label}
            className={
              "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold transition " +
              (on
                ? "bg-brand-primary text-text-on-brand shadow-sm"
                : "text-text-secondary hover:text-text-primary")
            }
          >
            <Icon size={11} />
            {label}
          </button>
        );
      })}
    </div>
  );
}

function AiStudyNoteModule() {
  const [plans, setPlans] = useState<AiStudyNote[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  const [detail, setDetail] = useState<AiStudyNoteDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const [creatingPlan, setCreatingPlan] = useState(false);
  const [newPlanTitle, setNewPlanTitle] = useState("");
  const [addingItem, setAddingItem] = useState(false);
  const [newItemTitle, setNewItemTitle] = useState("");

  // 유저 목록에서 소유자를 골라 그 사람 학습 노트만 보기
  const [users, setUsers] = useState<PlanOwner[]>([]);
  const [userPickerOpen, setUserPickerOpen] = useState(false);
  const [ownerFilter, setOwnerFilter] = useState<string | null>(null);

  // 좌측 계획 목록 사이드바 너비 — 드래그로 조절, localStorage 유지
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    const saved = Number(localStorage.getItem("aiStudyNoteSidebarWidth"));
    return saved >= 260 && saved <= 640 ? saved : 340;
  });

  useEffect(() => {
    localStorage.setItem("aiStudyNoteSidebarWidth", String(sidebarWidth));
  }, [sidebarWidth]);

  function startSidebarResize(e: React.MouseEvent) {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = sidebarWidth;
    const onMove = (ev: MouseEvent) => {
      const next = Math.min(640, Math.max(260, startWidth + ev.clientX - startX));
      setSidebarWidth(next);
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  async function loadPlans(preferId?: string) {
    const token = getToken();
    if (!token) {
      setLoadingPlans(false);
      setError("로그인이 필요합니다.");
      return;
    }
    setLoadingPlans(true);
    try {
      const list = await listPlans(token);
      setPlans(list);
      setError(null);
      setSelectedPlanId((prev) => {
        const keep = preferId ?? prev;
        if (keep && list.some((p) => p.id === keep)) return keep;
        return list[0]?.id ?? null;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "불러오지 못했습니다.");
    } finally {
      setLoadingPlans(false);
    }
  }

  async function loadDetail(planId: string) {
    const token = getToken();
    if (!token) return;
    setLoadingDetail(true);
    try {
      const d = await getPlan(token, planId);
      setDetail(d);
      setSelectedItemId((prev) =>
        prev && d.items.some((i) => i.id === prev) ? prev : (d.items[0]?.id ?? null),
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "불러오지 못했습니다.");
    } finally {
      setLoadingDetail(false);
    }
  }

  async function refresh() {
    await loadPlans();
    if (selectedPlanId) await loadDetail(selectedPlanId);
  }

  async function loadUsers() {
    const token = getToken();
    if (!token) return;
    try {
      setUsers(await listUsers(token));
    } catch {
      // 유저 목록 실패는 치명적이지 않음 — 조용히 무시
    }
  }

  useEffect(() => {
    void loadPlans();
    void loadUsers();
  }, []);

  useEffect(() => {
    if (selectedPlanId) void loadDetail(selectedPlanId);
    else setDetail(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlanId]);

  const progress = useMemo(() => {
    const items = detail?.items ?? [];
    const total = items.length;
    const done = items.filter((i) => i.status === "done").length;
    return { total, done, pct: total ? Math.round((done / total) * 100) : 0 };
  }, [detail]);

  const selectedItem = detail?.items.find((i) => i.id === selectedItemId) ?? null;
  const canEdit = detail?.isMine ?? false;

  const currentUserId = plans.find((p) => p.isMine)?.userId ?? null;
  const visiblePlans = useMemo(
    () => (ownerFilter ? plans.filter((p) => p.userId === ownerFilter) : plans),
    [plans, ownerFilter],
  );

  // 소유자 필터가 바뀌면 선택된 계획이 목록에 없을 수 있으니 첫 계획으로 보정
  useEffect(() => {
    if (selectedPlanId && visiblePlans.some((p) => p.id === selectedPlanId)) return;
    setSelectedItemId(null);
    setSelectedPlanId(visiblePlans[0]?.id ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerFilter]);

  function pickOwner(userId: string | null) {
    setOwnerFilter(userId);
    setUserPickerOpen(false);
  }

  async function submitCreatePlan() {
    const token = getToken();
    if (!token || !newPlanTitle.trim()) return;
    try {
      const created = await createPlan(token, {
        title: newPlanTitle.trim(),
        visibility: "public",
      });
      setNewPlanTitle("");
      setCreatingPlan(false);
      toast.success("학습 노트을 만들었습니다.");
      await loadPlans(created.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "만들지 못했습니다.");
    }
  }

  async function removeCurrentPlan() {
    const token = getToken();
    if (!token || !detail?.isMine) return;
    try {
      await deletePlan(token, detail.id);
      toast.success("학습 노트을 삭제했습니다.");
      setDetail(null);
      setSelectedItemId(null);
      await loadPlans();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "삭제하지 못했습니다.");
    }
  }

  async function changeVisibility(visibility: AiStudyNoteVisibility) {
    const token = getToken();
    if (!token || !detail?.isMine || detail.visibility === visibility) return;
    try {
      const updated = await updatePlan(token, detail.id, { visibility });
      setDetail((d) => (d ? { ...d, visibility: updated.visibility } : d));
      void loadPlans();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "변경하지 못했습니다.");
    }
  }

  async function submitAddItem() {
    const token = getToken();
    if (!token || !selectedPlanId || !newItemTitle.trim()) return;
    try {
      const created = await createItem(token, selectedPlanId, {
        title: newItemTitle.trim(),
      });
      setNewItemTitle("");
      setAddingItem(false);
      await loadDetail(selectedPlanId);
      setSelectedItemId(created.id);
      void loadPlans();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "추가하지 못했습니다.");
    }
  }

  async function quickToggle(item: AiStudyNoteItem) {
    const token = getToken();
    if (!token || !canEdit) return;
    const next: StudyItemStatus = item.status === "done" ? "todo" : "done";
    // 낙관적 업데이트
    setDetail((d) =>
      d
        ? { ...d, items: d.items.map((i) => (i.id === item.id ? { ...i, status: next } : i)) }
        : d,
    );
    try {
      await updateItem(token, item.id, { status: next });
      void loadPlans();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "변경하지 못했습니다.");
      if (selectedPlanId) void loadDetail(selectedPlanId);
    }
  }

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <PageHeader>
        <span className="w-[26px] h-[26px] flex items-center justify-center text-brand-primary bg-brand-glass border border-brand-border rounded-lg">
          <ListChecks size={14} />
        </span>
        <span className="text-[14px] font-bold tracking-tight text-text-primary">
          학습 노트
          {detail?.ownerName ? (
            <span className="ml-1 font-semibold text-text-secondary">
              ({detail.ownerName})
            </span>
          ) : null}
        </span>
      </PageHeader>

      {/* 본문 — 좌: 목록 / 우: 본문 */}
      <div className="flex-1 min-h-0 flex">
        {/* 좌측 목록 — 계획 전환 + 진행률 + 항목 리스트 */}
        <aside
          style={{ width: sidebarWidth }}
          className="shrink-0 flex flex-col border-r border-surface-border-soft bg-surface-muted"
        >
          {/* 계획 헤더 */}
          <div className="px-3 py-3 border-b border-surface-border-soft bg-surface-raised flex flex-col gap-2.5">
            {creatingPlan ? (
              <div className="flex items-center gap-1.5">
                <input
                  autoFocus
                  value={newPlanTitle}
                  onChange={(e) => setNewPlanTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void submitCreatePlan();
                    if (e.key === "Escape") {
                      setCreatingPlan(false);
                      setNewPlanTitle("");
                    }
                  }}
                  placeholder="새 학습 노트 이름"
                  className="ui-input flex-1"
                />
                <Button size="sm" onClick={() => void submitCreatePlan()}>
                  추가
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setCreatingPlan(false);
                    setNewPlanTitle("");
                  }}
                >
                  취소
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <CompactSelect
                  value={selectedPlanId ?? ""}
                  onChange={(e) => {
                    setSelectedItemId(null);
                    setSelectedPlanId(e.target.value || null);
                  }}
                  disabled={visiblePlans.length === 0}
                  wrapperClassName="flex-1"
                >
                  {visiblePlans.length === 0 && (
                    <option value="">계획 없음</option>
                  )}
                  {visiblePlans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                      {p.isMine ? "" : ` · ${p.ownerName ?? "공유"}`}
                    </option>
                  ))}
                </CompactSelect>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setUserPickerOpen(true)}
                  title="유저 목록에서 보기"
                >
                  <UserSearch size={15} />
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => void refresh()}
                  disabled={loadingPlans || loadingDetail}
                  title="새로고침"
                >
                  <RefreshCw
                    size={14}
                    className={loadingPlans || loadingDetail ? "animate-spin" : ""}
                  />
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setCreatingPlan(true)}
                  title="새 계획"
                >
                  <Plus size={15} />
                </Button>
              </div>
            )}

            {/* 소유자 필터 칩 — 특정 유저 계획만 보는 중일 때 */}
            {!creatingPlan && ownerFilter && (
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-full border border-brand-border bg-brand-glass px-2 py-0.5 text-[11px] font-semibold text-brand-primary">
                  <Users size={11} />
                  {ownerFilter === currentUserId
                    ? "내 계획"
                    : `${
                        users.find((u) => u.id === ownerFilter)?.name ??
                        detail?.ownerName ??
                        "선택한 유저"
                      }님의 계획`}
                  <button
                    onClick={() => pickOwner(null)}
                    className="ml-0.5 hover:text-text-primary"
                    title="전체 보기"
                  >
                    <X size={11} />
                  </button>
                </span>
              </div>
            )}

            {!creatingPlan && detail && (
              <div className="flex items-center justify-between gap-2">
                {detail.isMine ? (
                  <VisibilityToggle
                    value={detail.visibility}
                    onChange={(v) => void changeVisibility(v)}
                  />
                ) : (
                  <VisibilityBadge v={detail.visibility} />
                )}
                {detail.isMine && (
                  <button
                    onClick={() => void removeCurrentPlan()}
                    className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-text-muted hover:text-text-primary transition"
                  >
                    <Trash2 size={11} />
                    계획 삭제
                  </button>
                )}
              </div>
            )}

            {detail && (
              <div>
                <div className="flex items-center justify-between text-[12px] mb-1.5">
                  <span className="font-semibold text-text-secondary">진행률</span>
                  <span className="tabular-nums text-text-muted">
                    {progress.done}/{progress.total} · {progress.pct}%
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-surface-border-soft overflow-hidden">
                  <div
                    className="h-full rounded-full bg-brand-primary transition-all duration-300"
                    style={{ width: `${progress.pct}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* 항목 추가 + 리스트 */}
          {loadingPlans ? (
            <div className="p-6 text-[13px] text-text-muted text-center">
              불러오는 중…
            </div>
          ) : error ? (
            <div className="p-6 text-[13px] text-text-muted text-center">{error}</div>
          ) : plans.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 p-6 text-center">
              <ListChecks className="size-8 text-text-muted" strokeWidth={1.5} />
              <span className="text-[13px] text-text-secondary">
                아직 학습 노트이 없습니다.
              </span>
              <span className="text-[12px] text-text-muted">
                위 + 버튼으로 첫 계획을 만들어보세요.
              </span>
            </div>
          ) : (
            <>
              {canEdit && (
                <div className="px-3 py-2.5 border-b border-surface-border-soft">
                  {addingItem ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        autoFocus
                        value={newItemTitle}
                        onChange={(e) => setNewItemTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") void submitAddItem();
                          if (e.key === "Escape") {
                            setAddingItem(false);
                            setNewItemTitle("");
                          }
                        }}
                        placeholder="학습 항목 제목"
                        className="ui-input flex-1"
                      />
                      <Button size="sm" onClick={() => void submitAddItem()}>
                        추가
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="w-full"
                      onClick={() => setAddingItem(true)}
                    >
                      <Plus size={14} />항목 추가
                    </Button>
                  )}
                </div>
              )}

              {/* 항목 리스트 */}
              <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
                {loadingDetail ? (
                  <div className="p-6 text-center text-text-muted">
                    <Loader2 className="size-4 animate-spin inline" />
                  </div>
                ) : !detail || detail.items.length === 0 ? (
                  <div className="p-6 text-[13px] text-text-muted text-center">
                    학습 항목을 추가해 계획을 채워보세요.
                  </div>
                ) : (
                  detail.items.map((item) => {
                    const meta = STATUS_META[item.status];
                    const active = item.id === selectedItemId;
                    const isDone = item.status === "done";
                    return (
                      <button
                        key={item.id}
                        onClick={() => setSelectedItemId(item.id)}
                        className={
                          "group flex items-start gap-2 rounded-lg px-2.5 py-2 text-left transition " +
                          (active
                            ? "bg-brand-glass border border-brand-border"
                            : "border border-transparent hover:bg-surface-raised")
                        }
                      >
                        <span
                          role={canEdit ? "checkbox" : undefined}
                          aria-checked={isDone}
                          onClick={(e) => {
                            if (!canEdit) return;
                            e.stopPropagation();
                            void quickToggle(item);
                          }}
                          className={
                            "mt-0.5 grid size-[18px] shrink-0 place-items-center rounded-full border transition " +
                            meta.dot +
                            (canEdit ? " cursor-pointer" : "")
                          }
                        >
                          <Check size={11} strokeWidth={3} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span
                            className={
                              "block text-[13px] font-semibold truncate " +
                              (isDone
                                ? "text-text-muted line-through"
                                : "text-text-primary")
                            }
                          >
                            {item.title}
                          </span>
                          <span
                            className={
                              "mt-1 inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-bold " +
                              meta.chip
                            }
                          >
                            {meta.label}
                          </span>
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </>
          )}
        </aside>

        {/* 사이드바 너비 조절 스플리터 */}
        <div
          onMouseDown={startSidebarResize}
          className="w-1.5 shrink-0 cursor-col-resize bg-transparent hover:bg-brand-border active:bg-brand-primary/60 transition-colors"
          title="너비 조절"
        />

        {/* 우측 상세 */}
        <section className="flex-1 min-w-0 overflow-y-auto bg-surface-strong">
          {!selectedItem ? (
            <div className="h-full flex flex-col items-center justify-center gap-2 text-center px-6">
              <CircleDashed className="size-9 text-text-muted" strokeWidth={1.5} />
              <span className="text-[14px] font-semibold text-text-secondary">
                학습 항목을 선택하세요
              </span>
              <span className="text-[12px] text-text-muted">
                왼쪽 목록에서 항목을 클릭하면 상세 내용이 여기에 표시됩니다.
              </span>
            </div>
          ) : (
            <ItemDetail
              key={selectedItem.id}
              item={selectedItem}
              canEdit={canEdit}
              onSaved={(updated) => {
                setDetail((d) =>
                  d
                    ? {
                        ...d,
                        items: d.items.map((i) =>
                          i.id === updated.id ? updated : i,
                        ),
                      }
                    : d,
                );
                void loadPlans();
              }}
              onDeleted={(id) => {
                setDetail((d) =>
                  d ? { ...d, items: d.items.filter((i) => i.id !== id) } : d,
                );
                setSelectedItemId(null);
                void loadPlans();
              }}
            />
          )}
        </section>
      </div>

      {userPickerOpen && (
        <UserPickerDialog
          users={users}
          plans={plans}
          currentUserId={currentUserId}
          activeOwnerId={ownerFilter}
          onPick={pickOwner}
          onClose={() => setUserPickerOpen(false)}
        />
      )}
    </div>
  );
}

// 유저 목록 모달 — 소유자를 골라 그 사람의 (공유/공개) 학습 노트만 보기
function UserPickerDialog({
  users,
  plans,
  currentUserId,
  activeOwnerId,
  onPick,
  onClose,
}: {
  users: PlanOwner[];
  plans: AiStudyNote[];
  currentUserId: string | null;
  activeOwnerId: string | null;
  onPick: (userId: string | null) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const planCount = (userId: string) =>
    plans.filter((p) => p.userId === userId).length;

  const q = query.trim().toLowerCase();
  const filtered = q
    ? users.filter((u) => u.name.toLowerCase().includes(q))
    : users;
  const myPlanCount = currentUserId ? planCount(currentUserId) : 0;

  return (
    <div
      className="ui-overlay fixed inset-0 z-50 flex items-center justify-center px-6"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[420px] max-w-full flex flex-col gap-3 p-5 bg-surface-raised border border-surface-border rounded-2xl shadow-2xl"
      >
        <div className="flex items-center gap-2">
          <UserSearch size={16} className="text-brand-primary" />
          <h2 className="text-[15px] font-bold text-text-primary">유저 목록</h2>
          <button
            onClick={onClose}
            className="ui-icon-button size-7 ml-auto"
            title="닫기"
          >
            <X size={14} />
          </button>
        </div>

        <p className="text-[12px] text-text-muted">
          유저를 선택하면 그 사람의 공유된 학습 노트만 보여줍니다.
        </p>

        {/* 유저 이름 검색 */}
        <div className="relative">
          <Search
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
          />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="이름으로 검색"
            className="ui-input"
            style={{ paddingLeft: "2.25rem" }}
          />
        </div>

        {/* 내 노트 — 내 학습 노트으로 바로 가기 */}
        <button
          onClick={() => onPick(currentUserId)}
          className={
            "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition " +
            (activeOwnerId === currentUserId
              ? "bg-brand-glass border border-brand-border"
              : "border border-transparent hover:bg-surface-muted")
          }
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-glass border border-brand-border text-brand-primary">
            <StickyNote size={15} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-semibold text-text-primary">
              내 노트
            </span>
            <span className="block text-[11px] text-text-muted">
              학습 노트 {myPlanCount}개
            </span>
          </span>
          {activeOwnerId === currentUserId && (
            <Check size={15} className="text-brand-primary" />
          )}
        </button>

        <div className="max-h-[300px] overflow-y-auto flex flex-col gap-1 border-t border-surface-border-soft pt-2">
          {filtered
            .filter((u) => u.id !== currentUserId)
            .map((u) => {
            const count = planCount(u.id);
            const active = activeOwnerId === u.id;
            return (
              <button
                key={u.id}
                onClick={() => onPick(u.id)}
                className={
                  "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition " +
                  (active
                    ? "bg-brand-glass border border-brand-border"
                    : "border border-transparent hover:bg-surface-muted")
                }
              >
                {u.profileImageUrl ? (
                  <img
                    src={u.profileImageUrl}
                    alt=""
                    className="size-8 shrink-0 rounded-full object-cover border border-surface-border-soft"
                  />
                ) : (
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-glass border border-brand-border text-[13px] font-bold text-brand-primary">
                    {u.name.slice(0, 1)}
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-semibold text-text-primary truncate">
                    {u.name}
                  </span>
                  <span className="block text-[11px] text-text-muted">
                    학습 노트 {count}개
                  </span>
                </span>
                {active && <Check size={15} className="text-brand-primary" />}
              </button>
            );
          })}

          {filtered.filter((u) => u.id !== currentUserId).length === 0 && (
            <div className="py-6 text-center text-[13px] text-text-muted">
              {q ? "검색 결과가 없습니다." : "다른 유저가 없습니다."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ItemDetail({
  item,
  canEdit,
  onSaved,
  onDeleted,
}: {
  item: AiStudyNoteItem;
  canEdit: boolean;
  onSaved: (item: AiStudyNoteItem) => void;
  onDeleted: (id: string) => void;
}) {
  const [title, setTitle] = useState(item.title);
  const [resourceUrl, setResourceUrl] = useState(item.resourceUrl ?? "");
  const [status, setStatus] = useState<StudyItemStatus>(item.status);
  const [saving, setSaving] = useState(false);

  const dirty =
    title !== item.title ||
    (resourceUrl || "") !== (item.resourceUrl ?? "") ||
    status !== item.status;

  async function save(next?: Partial<{ status: StudyItemStatus }>) {
    const token = getToken();
    if (!token || !title.trim()) return;
    setSaving(true);
    try {
      const updated = await updateItem(token, item.id, {
        title: title.trim(),
        resourceUrl: resourceUrl.trim() || null,
        status: next?.status ?? status,
      });
      onSaved(updated);
      toast.success("저장했습니다.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    const token = getToken();
    if (!token) return;
    try {
      await deleteItem(token, item.id);
      onDeleted(item.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "삭제하지 못했습니다.");
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-6 flex flex-col gap-4">
      {/* 제목 */}
      {canEdit ? (
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="ui-input text-[16px] font-bold"
          placeholder="학습 항목 제목"
        />
      ) : (
        <h2 className="text-[18px] font-bold text-text-primary">{item.title}</h2>
      )}

      {/* 상태 세그먼트 */}
      <div className="flex items-center gap-2">
        <span className="text-[12px] font-semibold text-text-secondary">상태</span>
        <div className="inline-flex rounded-lg border border-surface-border-soft bg-surface-muted p-0.5">
          {STATUS_ORDER.map((s) => {
            const on = status === s;
            return (
              <button
                key={s}
                disabled={!canEdit}
                onClick={() => {
                  setStatus(s);
                  if (canEdit) void save({ status: s });
                }}
                className={
                  "px-3 py-1 rounded-md text-[12px] font-bold transition disabled:cursor-default " +
                  (on
                    ? "bg-brand-primary text-text-on-brand shadow-sm"
                    : "text-text-secondary hover:text-text-primary")
                }
              >
                {STATUS_META[s].label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 학습 자료 링크 */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[12px] font-semibold text-text-secondary">
          학습 자료 링크
        </span>
        <div className="flex items-center gap-2">
          {canEdit ? (
            <input
              value={resourceUrl}
              onChange={(e) => setResourceUrl(e.target.value)}
              placeholder="https://…"
              className="ui-input flex-1"
            />
          ) : (
            <span className="text-[13px] text-text-secondary flex-1 truncate">
              {item.resourceUrl || "—"}
            </span>
          )}
          {item.resourceUrl && (
            <a
              href={item.resourceUrl}
              target="_blank"
              rel="noreferrer"
              className="ui-icon-button size-8 shrink-0"
              title="링크 열기"
            >
              <ExternalLink size={14} />
            </a>
          )}
        </div>
      </div>

      {/* 기본 정보 저장 / 항목 삭제 */}
      {canEdit && (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            disabled={!dirty || saving || !title.trim()}
            onClick={() => void save()}
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            기본 정보 저장
          </Button>
          <div className="flex-1" />
          <Button size="sm" variant="ghost" tone="danger" onClick={() => void remove()}>
            <Trash2 size={13} />
            항목 삭제
          </Button>
        </div>
      )}

      {/* 단계별 학습 노트 — 댓글식 카드 */}
      <ItemNotes itemId={item.id} canEdit={canEdit} />
    </div>
  );
}

type NoteDialogState =
  | { mode: "create" }
  | { mode: "edit"; note: AiStudyNoteItemNote }
  | null;

function ItemNotes({ itemId, canEdit }: { itemId: string; canEdit: boolean }) {
  const [notes, setNotes] = useState<AiStudyNoteItemNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState<NoteDialogState>(null);

  async function load() {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      setNotes(await listItemNotes(token, itemId));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId]);

  async function remove(id: string) {
    const token = getToken();
    if (!token) return;
    try {
      await deleteItemNote(token, id);
      setNotes((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "삭제하지 못했습니다.");
    }
  }

  return (
    <div className="flex flex-col gap-3 border-t border-surface-border-soft pt-4">
      <div className="flex items-center gap-1.5">
        <StickyNote size={14} className="text-brand-primary" />
        <span className="text-[13px] font-bold text-text-primary">
          단계별 학습 노트
        </span>
        <span className="text-[11px] text-text-muted">· {notes.length}</span>
        {canEdit && (
          <Button
            size="sm"
            variant="secondary"
            className="ml-auto"
            onClick={() => setDialog({ mode: "create" })}
          >
            <Plus size={14} />
            노트 추가
          </Button>
        )}
      </div>

      {/* 노트 카드 3열 */}
      {loading ? (
        <div className="py-6 text-center text-text-muted">
          <Loader2 className="size-4 animate-spin inline" />
        </div>
      ) : notes.length === 0 ? (
        <div className="py-6 text-[13px] text-text-muted text-center">
          아직 노트가 없습니다. 단계별로 기록을 남겨보세요.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {notes.map((note, idx) => (
            <NoteCard
              key={note.id}
              note={note}
              index={idx}
              canEdit={canEdit}
              onEdit={() => setDialog({ mode: "edit", note })}
              onDelete={() => void remove(note.id)}
            />
          ))}
        </div>
      )}

      {dialog && (
        <NoteDialog
          itemId={itemId}
          state={dialog}
          onClose={() => setDialog(null)}
          onSaved={(saved) => {
            setNotes((prev) => {
              const exists = prev.some((n) => n.id === saved.id);
              return exists
                ? prev.map((n) => (n.id === saved.id ? saved : n))
                : [...prev, saved];
            });
            setDialog(null);
          }}
        />
      )}
    </div>
  );
}

function NoteCard({
  note,
  index,
  canEdit,
  onEdit,
  onDelete,
}: {
  note: AiStudyNoteItemNote;
  index: number;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="ui-panel p-0 flex flex-col min-h-[120px] overflow-hidden">
      {/* 헤더바 1 — 번호 + 제목 + 액션 */}
      <div className="flex items-center gap-1.5 px-3 pt-3 pb-2">
        <span className="grid size-[20px] shrink-0 place-items-center rounded-full bg-brand-glass border border-brand-border text-[10px] font-black text-brand-primary tabular-nums">
          {index + 1}
        </span>
        <span className="min-w-0 flex-1 text-[13px] font-bold text-text-primary truncate">
          {note.title?.trim() || "제목 없음"}
        </span>
        {canEdit && (
          <div className="flex items-center gap-0.5">
            <button onClick={onEdit} className="ui-icon-button size-6" title="수정">
              <Pencil size={11} />
            </button>
            <button
              onClick={onDelete}
              className="ui-icon-button size-6"
              title="삭제"
            >
              <Trash2 size={11} />
            </button>
          </div>
        )}
      </div>

      {/* 작성일 */}
      <div className="flex justify-end px-3 py-1 border-b border-surface-border-soft">
        <span className="text-[11px] text-text-muted tabular-nums">
          {note.createdAt.slice(0, 10)}
        </span>
      </div>

      {/* 본문 — Lexical readOnly 렌더링 */}
      <div className="min-w-0 flex-1 overflow-hidden">
        <LexicalEditor readOnly initialState={note.content} minHeight="0" />
      </div>
    </div>
  );
}

// Lexical JSON 문자열에서 순수 텍스트만 추출 — 빈 노트 저장 방지용.
function lexicalPlainText(value: string): string {
  try {
    const root = JSON.parse(value)?.root;
    const walk = (node: { text?: string; children?: unknown[] }): string =>
      (node.text ?? "") +
      ((node.children as typeof node[] | undefined)?.map(walk).join("") ?? "");
    return root ? walk(root).trim() : value.trim();
  } catch {
    return value.trim();
  }
}

function NoteDialog({
  itemId,
  state,
  onClose,
  onSaved,
}: {
  itemId: string;
  state: Exclude<NoteDialogState, null>;
  onClose: () => void;
  onSaved: (note: AiStudyNoteItemNote) => void;
}) {
  const editing = state.mode === "edit" ? state.note : null;
  const [title, setTitle] = useState(editing?.title ?? "");
  const [content, setContent] = useState(editing?.content ?? "");
  const [busy, setBusy] = useState(false);
  const hasContent = lexicalPlainText(content).length > 0;

  async function submit() {
    const token = getToken();
    if (!token || !hasContent || busy) return;
    setBusy(true);
    try {
      const saved = editing
        ? await updateItemNote(token, editing.id, {
            title: title.trim(),
            content,
          })
        : await createItemNote(token, itemId, {
            title: title.trim(),
            content,
          });
      onSaved(saved);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "저장하지 못했습니다.");
      setBusy(false);
    }
  }

  return (
    <div
      className="ui-overlay fixed inset-0 z-50 flex items-center justify-center px-6"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[640px] max-w-full flex flex-col gap-3.5 p-6 bg-surface-raised border border-surface-border rounded-2xl shadow-2xl"
      >
        <div className="flex items-center gap-2">
          <StickyNote size={16} className="text-brand-primary" />
          <h2 className="text-[15px] font-bold text-text-primary">
            {editing ? "노트 수정" : "노트 추가"}
          </h2>
          <button
            onClick={onClose}
            className="ui-icon-button size-7 ml-auto"
            title="닫기"
          >
            <X size={14} />
          </button>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-semibold text-text-secondary">제목</span>
          <input
            autoFocus
            value={title}
            maxLength={200}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예) Docker 이미지 vs 컨테이너"
            className="ui-input"
          />
        </label>

        <div className="flex flex-col gap-1.5">
          <span className="text-[12px] font-semibold text-text-secondary">내용</span>
          <div className="overflow-hidden rounded-xl border border-surface-border-soft">
            <LexicalEditor
              initialState={editing?.content}
              onChange={setContent}
              placeholder="이번 단계에서 배운 내용을 적어보세요."
              minHeight="220px"
              toolbarVariant="full"
            />
          </div>
        </div>

        <div className="mt-1 flex items-center gap-2">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={onClose}
          >
            취소
          </Button>
          <Button
            className="flex-1"
            disabled={!hasContent || busy}
            onClick={() => void submit()}
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            저장
          </Button>
        </div>
      </div>
    </div>
  );
}

export default AiStudyNoteModule;
