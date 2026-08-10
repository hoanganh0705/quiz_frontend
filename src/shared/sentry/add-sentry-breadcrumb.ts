'use client';

/**
 * `addSentryBreadcrumb` — tiny client-side Sentry bridge.
 *
 * Phase 7 / P2-27: extracted from `QuestionEditorPage` and
 * `QuizEditPage` (each of which had its own identical closure
 * bound to the page's `quizId` / `versionId`). The helper keeps
 * the `categoryPrefix` parameter so each consumer keeps its
 * documented namespace (`question-editor.*` vs `quiz-edit.*`).
 *
 * The function is a safe no-op when the Sentry global is absent
 * (SSR / disabled-telemetry). Type-safe: the Sentry global is
 * narrowed through a structural cast that matches the documented
 * browser-side shape.
 */

export type SentryBreadcrumbType = 'api-call' | 'error' | 'user-action';

interface SentryBreadcrumb {
  category: string;
  message: string;
  level: 'info' | 'error';
  data: Record<string, unknown>;
}

interface SentryLike {
  addBreadcrumb?: (crumb: SentryBreadcrumb) => void;
}

declare global {
  interface Window {
    Sentry?: SentryLike;
  }
}

export interface AddSentryBreadcrumbOptions {
  categoryPrefix: string;
  quizId?: string | null;
  versionId?: string | null;
}

export function addSentryBreadcrumb(
  type: SentryBreadcrumbType,
  message: string,
  data: Record<string, unknown> = {},
  options: AddSentryBreadcrumbOptions,
): void {
  if (typeof window === 'undefined') return;
  const sentry = window.Sentry;
  const baseData: Record<string, unknown> = { ...data };
  // Forward the namespace ids when present so the breadcrumb
  // payload retains its pre-extraction shape (`data: { quizId,
  // versionId, ...rest }`). Null ids are omitted (mirrors the
  // original closure which only set the fields when the ids
  // were truthy).
  if (options.quizId) baseData.quizId = options.quizId;
  if (options.versionId) baseData.versionId = options.versionId;
  sentry?.addBreadcrumb?.({
    category: `${options.categoryPrefix}.${type}`,
    message,
    level: type === 'error' ? 'error' : 'info',
    data: baseData,
  });
}