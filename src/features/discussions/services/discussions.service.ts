/**
 * `discussions.service.ts` — Discussions service (Phase 1 migration).
 *
 * Source epic: Phase 1 — HTTP layer unification.
 * Source ticket: TKT-Phase-1.D1.
 *
 * ## Purpose
 *
 * Replaces `features/discussions/api/discussions.ts` (which imported the
 * legacy `apiClient` from `@/shared/lib/api/client`) with a service that
 * uses the canonical `customInstance` from `@/lib/api`. There is no
 * generated SDK for `discussions` (the backend's `DiscussionController`
 * is not exposed in OpenAPI yet), so the service hits the wire directly
 * via `customInstance` — same shape the rest of the codebase uses for
 * non-SDK requests.
 *
 * ## Why not the legacy `apiClient`?
 *
 * The legacy client lacks:
 *   - RFC 7807 error unwrapping
 *   - Cross-tab `BroadcastChannel('auth')` logout publication
 *   - Refresh-token coordination via `inFlightRefresh` / `lastLogoutTimestamp`
 *
 * Routes hitting `/discussions/*` therefore lose the cross-tab logout
 * sync and the dedup'd 401-refresh path. Using `customInstance` restores
 * both for free.
 *
 * ## Same surface as the legacy module
 *
 * The exported function names, parameter shapes, and return types are
 * intentionally identical to `features/discussions/api/discussions.ts`
 * so consumers (`use-discussions-page.ts`, the `(protected)/discussions`
 * page, the `Discussion` type) can migrate without code churn.
 */
import * as Sentry from "@sentry/nextjs";

import { customInstance } from "@/lib/api";

// ─── Types (preserved from the legacy module) ──────────────────────────────

export type DiscussionDifficulty = "Easy" | "Medium" | "Hard";

export interface DiscussionUser {
  username: string;
  avatarSrc?: string;
  avatarFallback: string;
}

export interface Discussion {
  id: string;
  title: string;
  category: string;
  difficulty: DiscussionDifficulty;
  lastActivity: string;
  user: DiscussionUser;
  comments: number;
  correct: number;
  incorrect: number;
  percentage: number;
  quizId?: string;
  createdAt: string;
}

export interface GetDiscussionsResponse {
  discussions: Discussion[];
  total: number;
}

export interface GetDiscussionsParams {
  category?: string;
  difficulty?: DiscussionDifficulty;
  sortBy?: "recent" | "popular";
  page?: number;
  limit?: number;
}

export interface CreateDiscussionRequest {
  title: string;
  category: string;
  difficulty: DiscussionDifficulty;
  quizId?: string;
  content: string;
}

export interface CreateDiscussionResponse {
  discussion: Discussion;
  message: string;
}

export interface DiscussionComment {
  id: string;
  discussionId: string;
  userId: string;
  username: string;
  avatarSrc?: string;
  avatarFallback: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  likes: number;
  isLiked: boolean;
}

export interface GetDiscussionCommentsResponse {
  comments: DiscussionComment[];
  total: number;
  hasMore: boolean;
}

export interface AddCommentRequest {
  discussionId: string;
  content: string;
}

export interface AddCommentResponse {
  comment: DiscussionComment;
  message: string;
}

// ─── Internal helpers ─────────────────────────────────────────────────────

async function request<T>(config: Parameters<typeof customInstance.request>[0]): Promise<T> {
  const response = await customInstance.request<T>(config);
  return response.data;
}

// ─── Reads ────────────────────────────────────────────────────────────────

export async function getDiscussions(params?: GetDiscussionsParams): Promise<GetDiscussionsResponse> {
  Sentry.addBreadcrumb({ category: "phase1:service", message: "discussions.getDiscussions" });
  return request<GetDiscussionsResponse>({
    url: "/discussions",
    method: "GET",
    params,
  });
}

export async function getDiscussion(discussionId: string): Promise<Discussion> {
  Sentry.addBreadcrumb({
    category: "phase1:service",
    message: `discussions.getDiscussion(${discussionId})`,
  });
  return request<Discussion>({
    url: `/discussions/${discussionId}`,
    method: "GET",
  });
}

export async function getDiscussionComments(
  discussionId: string,
  page = 1,
  limit = 20,
): Promise<GetDiscussionCommentsResponse> {
  Sentry.addBreadcrumb({
    category: "phase1:service",
    message: `discussions.getDiscussionComments(${discussionId})`,
  });
  return request<GetDiscussionCommentsResponse>({
    url: `/discussions/${discussionId}/comments`,
    method: "GET",
    params: { page, limit },
  });
}

export async function getDiscussionCategories(): Promise<string[]> {
  Sentry.addBreadcrumb({ category: "phase1:service", message: "discussions.getDiscussionCategories" });
  return request<string[]>({
    url: "/discussions/categories",
    method: "GET",
  });
}

// ─── Writes ───────────────────────────────────────────────────────────────

export async function createDiscussion(payload: CreateDiscussionRequest): Promise<CreateDiscussionResponse> {
  Sentry.addBreadcrumb({ category: "phase1:service", message: "discussions.createDiscussion" });
  return request<CreateDiscussionResponse>({
    url: "/discussions",
    method: "POST",
    data: payload,
  });
}

export async function addComment(payload: AddCommentRequest): Promise<AddCommentResponse> {
  Sentry.addBreadcrumb({
    category: "phase1:service",
    message: `discussions.addComment(${payload.discussionId})`,
  });
  return request<AddCommentResponse>({
    url: `/discussions/${payload.discussionId}/comments`,
    method: "POST",
    data: { content: payload.content },
  });
}