import { apiRequest } from "../../shared/api/client";

export type AiStudyNoteVisibility = "private" | "public";
export type StudyItemStatus = "todo" | "doing" | "done";

export type AiStudyNoteItem = {
  id: string;
  planId: string;
  userId: string;
  title: string;
  content: string;
  resourceUrl: string | null;
  status: StudyItemStatus;
  orderIdx: number;
  createdAt: string;
  updatedAt: string;
};

export type AiStudyNoteItemNote = {
  id: string;
  itemId: string;
  userId: string;
  title: string;
  content: string;
  orderIdx: number;
  createdAt: string;
  updatedAt: string;
  ownerName?: string;
};

export type AiStudyNote = {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  visibility: AiStudyNoteVisibility;
  createdAt: string;
  updatedAt: string;
  isMine: boolean;
  ownerName?: string;
  itemCount?: number;
  doneCount?: number;
};

export type AiStudyNoteDetail = AiStudyNote & {
  items: AiStudyNoteItem[];
};

export type PlanOwner = {
  id: string;
  name: string;
  profileImageUrl: string | null;
  role: "admin" | "user";
};

// 유저 목록(전체) — "유저 목록" 버튼에서 소유자를 골라 그 사람 학습 노트만 보기 위함
export function listUsers(token: string): Promise<PlanOwner[]> {
  return apiRequest<PlanOwner[]>("/users/assignable", {
    token,
    errorMessage: "유저 목록을 불러오지 못했습니다.",
  });
}

export function listPlans(token: string): Promise<AiStudyNote[]> {
  return apiRequest<AiStudyNote[]>("/ai-study-note/plans", {
    token,
    errorMessage: "학습 노트을 불러오지 못했습니다.",
  });
}

export function getPlan(
  token: string,
  planId: string,
): Promise<AiStudyNoteDetail> {
  return apiRequest<AiStudyNoteDetail>(`/ai-study-note/plans/${planId}`, {
    token,
    errorMessage: "학습 노트을 불러오지 못했습니다.",
  });
}

export function createPlan(
  token: string,
  body: {
    title: string;
    description?: string | null;
    visibility?: AiStudyNoteVisibility;
  },
): Promise<AiStudyNoteDetail> {
  return apiRequest<AiStudyNoteDetail>("/ai-study-note/plans", {
    method: "POST",
    body,
    token,
    errorMessage: "학습 노트을 만들지 못했습니다.",
  });
}

export function updatePlan(
  token: string,
  planId: string,
  body: {
    title?: string;
    description?: string | null;
    visibility?: AiStudyNoteVisibility;
  },
): Promise<AiStudyNoteDetail> {
  return apiRequest<AiStudyNoteDetail>(`/ai-study-note/plans/${planId}`, {
    method: "PATCH",
    body,
    token,
    errorMessage: "학습 노트을 수정하지 못했습니다.",
  });
}

export function deletePlan(
  token: string,
  planId: string,
): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>(`/ai-study-note/plans/${planId}`, {
    method: "DELETE",
    token,
    errorMessage: "삭제하지 못했습니다.",
  });
}

export function createItem(
  token: string,
  planId: string,
  body: {
    title: string;
    content?: string;
    resourceUrl?: string | null;
    status?: StudyItemStatus;
  },
): Promise<AiStudyNoteItem> {
  return apiRequest<AiStudyNoteItem>(`/ai-study-note/plans/${planId}/items`, {
    method: "POST",
    body,
    token,
    errorMessage: "학습 항목을 추가하지 못했습니다.",
  });
}

export function updateItem(
  token: string,
  itemId: string,
  body: {
    title?: string;
    content?: string;
    resourceUrl?: string | null;
    status?: StudyItemStatus;
  },
): Promise<AiStudyNoteItem> {
  return apiRequest<AiStudyNoteItem>(`/ai-study-note/items/${itemId}`, {
    method: "PATCH",
    body,
    token,
    errorMessage: "학습 항목을 수정하지 못했습니다.",
  });
}

export function deleteItem(
  token: string,
  itemId: string,
): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>(`/ai-study-note/items/${itemId}`, {
    method: "DELETE",
    token,
    errorMessage: "학습 항목을 삭제하지 못했습니다.",
  });
}

// ── 항목별 단계 노트(카드) ─────────────────────────────────────────
export function listItemNotes(
  token: string,
  itemId: string,
): Promise<AiStudyNoteItemNote[]> {
  return apiRequest<AiStudyNoteItemNote[]>(`/ai-study-note/items/${itemId}/notes`, {
    token,
    errorMessage: "노트를 불러오지 못했습니다.",
  });
}

export function createItemNote(
  token: string,
  itemId: string,
  body: { title?: string; content: string },
): Promise<AiStudyNoteItemNote> {
  return apiRequest<AiStudyNoteItemNote>(`/ai-study-note/items/${itemId}/notes`, {
    method: "POST",
    body,
    token,
    errorMessage: "노트를 추가하지 못했습니다.",
  });
}

export function updateItemNote(
  token: string,
  noteId: string,
  body: { title?: string; content?: string },
): Promise<AiStudyNoteItemNote> {
  return apiRequest<AiStudyNoteItemNote>(`/ai-study-note/notes/${noteId}`, {
    method: "PATCH",
    body,
    token,
    errorMessage: "노트를 수정하지 못했습니다.",
  });
}

export function deleteItemNote(
  token: string,
  noteId: string,
): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>(`/ai-study-note/notes/${noteId}`, {
    method: "DELETE",
    token,
    errorMessage: "노트를 삭제하지 못했습니다.",
  });
}
