import { apiRequest } from "../../shared/api/client";

export type AxBoardCategory = "news" | "tips" | "qna" | "free";

export const AX_BOARD_CATEGORIES: { id: AxBoardCategory; label: string }[] = [
  { id: "news", label: "뉴스" },
  { id: "tips", label: "활용팁" },
  { id: "qna", label: "질문" },
  { id: "free", label: "자유" },
];

export function categoryLabel(id: string): string {
  return AX_BOARD_CATEGORIES.find((c) => c.id === id)?.label ?? id;
}

export type AxBoardPost = {
  id: string;
  userId: string;
  category: AxBoardCategory;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  authorName: string;
  isMine: boolean;
  commentCount: number;
};

export type AxBoardComment = {
  id: string;
  postId: string;
  userId: string;
  content: string;
  createdAt: string;
  authorName: string;
  isMine: boolean;
};

export type AxBoardPostDetail = Omit<AxBoardPost, "commentCount"> & {
  comments: AxBoardComment[];
};

export function listPosts(
  token: string,
  category?: AxBoardCategory,
): Promise<AxBoardPost[]> {
  const q = category ? `?category=${category}` : "";
  return apiRequest<AxBoardPost[]>(`/ax-board/posts${q}`, {
    token,
    errorMessage: "게시글을 불러오지 못했습니다.",
  });
}

export function getPost(
  token: string,
  postId: string,
): Promise<AxBoardPostDetail> {
  return apiRequest<AxBoardPostDetail>(`/ax-board/posts/${postId}`, {
    token,
    errorMessage: "게시글을 불러오지 못했습니다.",
  });
}

export function createPost(
  token: string,
  body: { category: AxBoardCategory; title: string; content?: string },
): Promise<AxBoardPostDetail> {
  return apiRequest<AxBoardPostDetail>("/ax-board/posts", {
    method: "POST",
    body,
    token,
    errorMessage: "게시글을 등록하지 못했습니다.",
  });
}

export function updatePost(
  token: string,
  postId: string,
  body: { category?: AxBoardCategory; title?: string; content?: string },
): Promise<AxBoardPostDetail> {
  return apiRequest<AxBoardPostDetail>(`/ax-board/posts/${postId}`, {
    method: "PATCH",
    body,
    token,
    errorMessage: "게시글을 수정하지 못했습니다.",
  });
}

export function deletePost(
  token: string,
  postId: string,
): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>(`/ax-board/posts/${postId}`, {
    method: "DELETE",
    token,
    errorMessage: "게시글을 삭제하지 못했습니다.",
  });
}

export function addComment(
  token: string,
  postId: string,
  content: string,
): Promise<AxBoardPostDetail> {
  return apiRequest<AxBoardPostDetail>(`/ax-board/posts/${postId}/comments`, {
    method: "POST",
    body: { content },
    token,
    errorMessage: "댓글을 등록하지 못했습니다.",
  });
}

export function deleteComment(
  token: string,
  commentId: string,
): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>(`/ax-board/comments/${commentId}`, {
    method: "DELETE",
    token,
    errorMessage: "댓글을 삭제하지 못했습니다.",
  });
}
