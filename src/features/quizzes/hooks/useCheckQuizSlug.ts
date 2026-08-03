/**
 * `useCheckQuizSlug` — debounced slug availability checker.
 *
 * Source epic:   Epic 4.8 — Quiz create form.
 * Source ticket: TKT-4.8-B2.
 *
 * ## What this hook owns
 *
 * Checks whether a slug is available by calling `GET /quizzes/{slug}`.
 * A `404` response means the slug is not in use (available); any
 * non-404 response means it is taken.
 *
 * The check is debounced at 400 ms to avoid hammering the API on every
 * keystroke. Only the last slug within the debounce window triggers a
 * request.
 *
 * ## Return shape
 *
 *   - `available`: `null` = not yet checked; `true` = available; `false` = taken.
 *   - `isChecking`: `true` while the request is in flight.
 *   - `error`: set on network errors.
 *   - `check(slug)`: call this to trigger a debounced availability check.
 *
 * ## Edge cases
 *
 *   - `check('')` or `check(null)` — no-op, does not trigger a request.
 *   - Empty slug after a previous check — resets state to initial.
 *   - Network error — sets `available: false` with an error message.
 *
 * @see QuizSlugField — the UI component that uses this hook.
 */

'use client';

import { useCallback, useRef, useState } from 'react';

import { getQuizzes } from '@/lib/api';
import type { ApiError } from '@/lib/api';
import { isApiError } from '@/lib/api';

const CHECK_DEBOUNCE_MS = 400;

export interface UseCheckQuizSlugReturn {
  /** `null` = not checked yet; `true` = available; `false` = taken. */
  available: boolean | null;
  /** `true` while the availability check is in flight. */
  isChecking: boolean;
  /** Error message on network failure. `null` otherwise. */
  error: string | null;
  /**
   * Trigger a debounced availability check for `slug`.
   * Empty slug is a no-op.
   */
  check: (slug: string) => void;
  /** Reset all state to initial. */
  reset: () => void;
}

function isNotFoundError(err: unknown): boolean {
  return isApiError(err) && err.status === 404;
}

export function useCheckQuizSlug(): UseCheckQuizSlugReturn {
  const [available, setAvailable] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs shared across the debounce closure so we always cancel
  // the previous timer before starting a new one.
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const check = useCallback((slug: string) => {
    // Normalise: treat blank / whitespace-only slugs as a no-op.
    if (!slug || slug.trim() === '') {
      // Cancel any in-flight request.
      abortRef.current?.abort();
      abortRef.current = null;
      // Reset state to initial.
      setAvailable(null);
      setIsChecking(false);
      setError(null);
      return;
    }

    // Cancel the previous timer before starting a new debounce window.
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
    }

    // Cancel the previous in-flight request.
    abortRef.current?.abort();

    timerRef.current = setTimeout(async () => {
      setIsChecking(true);
      setError(null);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        await getQuizzes().quizControllerGetQuizById(slug);
        // Non-404 → slug is taken.
        setAvailable(false);
      } catch (err) {
        if (controller.signal.aborted) {
          // Request was cancelled — don't update state.
          return;
        }
        if (isNotFoundError(err)) {
          // 404 → slug is available.
          setAvailable(true);
        } else if (isApiError(err)) {
          // Network / server error — treat as unavailable with error message.
          setAvailable(false);
          setError(
            err.detail ?? err.message ?? 'Could not check slug availability.',
          );
        } else {
          // Unknown error.
          setAvailable(false);
          setError('Could not check slug availability.');
        }
      } finally {
        setIsChecking(false);
        abortRef.current = null;
      }
    }, CHECK_DEBOUNCE_MS);
  }, []);

  const reset = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    abortRef.current?.abort();
    abortRef.current = null;
    setAvailable(null);
    setIsChecking(false);
    setError(null);
  }, []);

  return { available, isChecking, error, check, reset };
}
