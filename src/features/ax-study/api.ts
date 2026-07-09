import { apiRequest } from "../../shared/api/client";

export type AxStudyVisibility = "private" | "shared" | "public";

export type AxStudyNote = {
  id: string;
  workspaceId: string;
  userId: string;
  title: string;
  content: string;
  tags: string[];
  orderIdx: number;
  createdAt: string;
  updatedAt: string;
};

export type AxStudyWorkspace = {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  visibility: AxStudyVisibility;
  createdAt: string;
  updatedAt: string;
  isMine: boolean;
  ownerName?: string;
  noteCount?: number;
};

export type AxStudyWorkspaceDetail = AxStudyWorkspace & {
  notes: AxStudyNote[];
};

export function listWorkspaces(token: string): Promise<AxStudyWorkspace[]> {
  return apiRequest<AxStudyWorkspace[]>("/ax-study/workspaces", {
    token,
    errorMessage: "AX 스터디를 불러오지 못했습니다.",
  });
}

export function getWorkspace(
  token: string,
  workspaceId: string,
): Promise<AxStudyWorkspaceDetail> {
  return apiRequest<AxStudyWorkspaceDetail>(
    `/ax-study/workspaces/${workspaceId}`,
    { token, errorMessage: "워크스페이스를 불러오지 못했습니다." },
  );
}

export function createWorkspace(
  token: string,
  body: {
    title: string;
    description?: string | null;
    visibility?: AxStudyVisibility;
  },
): Promise<AxStudyWorkspaceDetail> {
  return apiRequest<AxStudyWorkspaceDetail>("/ax-study/workspaces", {
    method: "POST",
    body,
    token,
    errorMessage: "워크스페이스를 만들지 못했습니다.",
  });
}

export function deleteWorkspace(
  token: string,
  workspaceId: string,
): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>(
    `/ax-study/workspaces/${workspaceId}`,
    { method: "DELETE", token, errorMessage: "삭제하지 못했습니다." },
  );
}

export function createNote(
  token: string,
  workspaceId: string,
  body: { title: string; content?: string; tags?: string[] },
): Promise<AxStudyNote> {
  return apiRequest<AxStudyNote>(
    `/ax-study/workspaces/${workspaceId}/notes`,
    { method: "POST", body, token, errorMessage: "노트를 추가하지 못했습니다." },
  );
}

export function deleteNote(
  token: string,
  noteId: string,
): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>(`/ax-study/notes/${noteId}`, {
    method: "DELETE",
    token,
    errorMessage: "노트를 삭제하지 못했습니다.",
  });
}
