/**
 * `useReportComment` — report-comment mutation hook.
 *
 * Source epic:   Epic 4.12 — Comments on a quiz.
 * Source ticket: T-4.12.10.
 *
 * ## What this hook owns
 *
 * - POST a report against a comment via `reportComment(commentId,
 *   { reason, details? })`.
 * - On success: sets `reported: true` flag for the UI to surface the
 *   mute state ("Reported — thank you"). The hook does NOT hide the
 *   comment (the backend retains that decision for moderator actions).
 * - On `COMMENT_SELF_REPORT` (400): surface the typed error so the UI
 *   shows the toast. (Defensive — the UI hides controls when the
 *   viewer is the author.)
 * - On `COMMENT_DUPLICATE_REPORT` (409): sets `isAlreadyReported:
 *   true`. The UI shows the "You've already reported this comment"
 *   message; the dialog stays open.
 * - `clearReportSuccess()` resets the success state so the UI can
 *   dismiss the "Reported" banner (or re-open the dialog for a new
 *   attempt — the backend will reject with duplicate-report).
 *
 * ## Public read
 *
 * The hook does NOT require authentication, but the backend rejects
 * anonymous requests. The dialog opener (Epic 4.12 / T-4.12.12) is
 * responsible for the auth gate.
 */

'use client';

import { useCallback, useRef, useState } from 'react';

import { isApiError, type ApiError } from '@/lib/api';
import { getUserCopy, type UserCopyEntry } from '@/lib/api/error-codes';
import { logger } from '@/shared/log';

import { reportComment } from '@/features/comments/services/comments.service';

// ─── Public types ──────────────────────────────────────────────────────────

export interface UseReportCommentOptions {
  /** Callback when the report is submitted successfully. */
  onSuccess?: () => void;
  /** Callback when the report fails. */
  onError?: (error: ApiError) => void;
}

export interface UseReportCommentResult {
  /**
   * Submit a report. Resolves with `true` on success, `false` when
   * skipped (single-flight guard / cooldown). Errors surface via
   * `error` and special `isAlreadyReported` flag.
   */
  report: (payload: { reason: string; description?: string }) => Promise<boolean>;
  /** `true` while a report is in flight. */
  isLoading: boolean;
  /** `true` when the most recent call succeeded. Cleared by `clearReportSuccess`. */
  reported: boolean;
  /** `true` when the backend returned 409 COMMENT_DUPLICATE_REPORT. */
  isAlreadyReported: boolean;
  /** The most recent error from the last submission (excluding duplicate-report). */
  error: ApiError | null;
  /** Classified user-copy entry for `error`. */
  errorCopy: UserCopyEntry | null;
  /** Clear the success / already-reported state. */
  clearReportSuccess: () => void;
  /** Clear the current error and reset to idle. */
  resetError: () => void;
}

// ─── Telemetry ─────────────────────────────────────────────────────────────

function emitBreadcrumb(
  category: string,
  data: { status: string; durationMs: number; code?: string },
): void {
  // TODO (T-4.12.10): wire to Sentry.addBreadcrumb once feature flag is enabled.
  void category;
  void data;
}

// ─── Hook ─────────────────────────────────────────────────────────────────

export function useReportComment(
  commentId: string,
  options: UseReportCommentOptions = {},
): UseReportCommentResult {
  const { onSuccess, onError } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [reported, setReported] = useState(false);
  const [isAlreadyReported, setIsAlreadyReported] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const inFlightRef = useRef<Promise<boolean> | null>(null);

  const errorCopy = error ? getUserCopy(error.code) : null;

  const handleReport = useCallback(
    async ({
      reason,
      description,
    }: {
      reason: string;
      description?: string;
    }): Promise<boolean> => {
      if (inFlightRef.current) {
        return inFlightRef.current;
      }

      setIsLoading(true);
      setError(null);
      setIsAlreadyReported(false);
      setReported(false);

      const startedAt = Date.now();

      const core = (async (): Promise<boolean> => {
        try {
          await reportComment(commentId, {
            reason,
            details: description,
          });
          setReported(true);
          emitBreadcrumb('phase4:4.12:report-comment', {
            status: 'success',
            durationMs: Date.now() - startedAt,
          });
          onSuccess?.();
          return true;
        } catch (err) {
          if (isApiError(err)) {
            // 409 COMMENT_DUPLICATE_REPORT — treat as a soft success
            // for the user's "I've reported this" feedback state.
            if (err.code === 'COMMENT_DUPLICATE_REPORT') {
              setIsAlreadyReported(true);
              emitBreadcrumb('phase4:4.12:report-comment', {
                status: 'success',
                durationMs: Date.now() - startedAt,
                code: err.code,
              });
              return true;
            }

            setError(err);
            onError?.(err);

            emitBreadcrumb('phase4:4.12:report-comment', {
              status: 'error',
              durationMs: Date.now() - startedAt,
              code: err.code,
            });
            return false;
          }

          emitBreadcrumb('phase4:4.12:report-comment', {
            status: 'error',
            durationMs: Date.now() - startedAt,
            code: 'GLOBAL_UNKNOWN',
          });
          logger.warn('comments.report', 'unexpected rejection', err);
          return false;
        }
      })();

      inFlightRef.current = core;
      try {
        return await core;
      } finally {
        setIsLoading(false);
        inFlightRef.current = null;
      }
    },
    [commentId, onSuccess, onError],
  );

  const clearReportSuccess = useCallback(() => {
    setReported(false);
    setIsAlreadyReported(false);
  }, []);

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  return {
    report: handleReport,
    isLoading,
    reported,
    isAlreadyReported,
    error,
    errorCopy,
    clearReportSuccess,
    resetError,
  };
}
