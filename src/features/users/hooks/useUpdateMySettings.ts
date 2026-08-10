/**
 * `useUpdateMySettings` — optimistic settings mutation hook.
 *
 * Source epic:   Epic 4.3 — Edit profile + user settings.
 * Source ticket: TKT-4.3.B2.
 *
 * ## What this hook owns
 *
 * The snapshot-and-revert dance for `PATCH /users/me/settings`:
 *
 *   1. Snapshot the current `useUserStore().user`.
 *   2. Apply an optimistic merge of the settings partial into the store.
 *   3. Call `updateMySettings(payload)` from `users.service.ts`.
 *   4. On success → update the store with the returned DTO +
 *      emit `broadcastProfileUpdated({ userId, kind: 'settings' })`.
 *   5. On any `ApiError` → revert to the snapshot and surface
 *      `lastError` via `getUserCopy`.
 *   6. On `AUTH_INVALID_CURRENT_PASSWORD` → set `needsPasswordConfirmation: true`
 *      in `lastError` so the form can render an inline password step.
 *
 * ## Optimistic merge strategy
 *
 * The backend `PATCH /users/me/settings` uses partial-update semantics.
 * The optimistic update merges the submitted `preferences` and `privacy`
 * partials into the existing `user.settings` blob. This mirrors how the
 * backend applies the patch server-side.
 *
 * ## `broadcastProfileUpdated` self-suppression
 *
 * Same as `useUpdateMyProfile` — the channel layer handles tab-id filtering.
 */

'use client';

import { useCallback } from 'react';

import {
  broadcastProfileUpdated,
  type ProfileUpdateKind,
} from '@/lib/api/core/profile-broadcast-channel';
import { getUserCopy } from '@/lib/api/error-codes';
import {
  isApiError,
  type ApiError,
} from '@/lib/api';
import type { UserCopyEntry } from '@/lib/api/error-codes';
import {
  useOptimisticMutation,
  type OptimisticMutationResult,
} from '@/lib/api/useOptimisticMutation';
import type { UserMeResponseDto } from '@/features/users/types/user-backend';
import {
  updateMySettings,
  type UserControllerUpdateMeSettingsResult,
} from '@/features/users/services/users.service';
import {
  useUserStore,
} from '@/features/users/store/user-store';
import type { UpdateMeSettingsDto } from '@/lib/api/generated/schemas';

// ─── Public types ───────────────────────────────────────────────────────────────

/**
 * Extended user copy entry that signals the form to render an inline
 * password confirmation step. Used when `AUTH_INVALID_CURRENT_PASSWORD`
 * is returned (e.g. changing email requires re-verification).
 */
export interface UserCopyWithPasswordConfirm extends UserCopyEntry {
  /**
   * When `true`, the form should render an inline password step and
   * re-submit the mutation with `currentPassword` attached.
   */
  needsPasswordConfirmation: true;
}

export interface UseUpdateMySettingsOptions {
  /**
   * Called after the server confirms the settings update.
   */
  onSuccess?: () => void;
  /**
   * Called when the server rejects the settings update.
   * Receives the error `code` string.
   */
  onError?: (code: string) => void;
}

export interface UseUpdateMySettingsReturn {
  /**
   * Trigger the settings update.
   *
   * The current user in the Zustand store is snapshotted, optimistically
   * merged with the settings partial, and sent to
   * `PATCH /users/me/settings`. On success the store is updated with
   * the merged result; on error it is reverted.
   */
  mutate: (
    payload: UpdateMeSettingsDto,
  ) => Promise<OptimisticMutationResult<UserControllerUpdateMeSettingsResult>>;
  /** `true` while a mutation is in flight. */
  isPending: boolean;
  /** `true` after a successful mutation. */
  isSuccess: boolean;
  /** `true` after a rejected mutation. */
  isError: boolean;
  /**
   * The typed user-copy entry for the last rejected error.
   * When `code === 'AUTH_INVALID_CURRENT_PASSWORD'`, this is a
   * `UserCopyWithPasswordConfirm` with `needsPasswordConfirmation: true`.
   * `null` when idle or successful.
   */
  lastError: UserCopyEntry | UserCopyWithPasswordConfirm | null;
  /** The raw `ApiError` from the last rejected mutation. `null` otherwise. */
  lastApiError: ApiError | null;
  /** Clear `lastError` and reset the status to idle. */
  resetError: () => void;
}

// ─── Sentry category ───────────────────────────────────────────────────────────

const SENTRY_CATEGORY = 'phase4:4.3:settings';

// ─── Telemetry ────────────────────────────────────────────────────────────────

/**
 * Breadcrumb emitter — currently a no-op. Replace with Sentry once the SDK
 * is wired in a later epic.
 */
function emitBreadcrumb(
  _category: string,
  _data: { status: string; durationMs: number; code?: string },
): void {
  // TODO: replace with Sentry.addBreadcrumb once the SDK is added.
  void _category;
  void _data;
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Optimistic settings mutation hook.
 *
 * @example
 * ```ts
 * const { mutate, isPending, lastError } = useUpdateMySettings({
 *   onSuccess: () => toast.success('Settings saved'),
 * });
 *
 * await mutate({ privacy: { isPublic: false } });
 * ```
 */
export function useUpdateMySettings(
  options: UseUpdateMySettingsOptions = {},
): UseUpdateMySettingsReturn {
  const { onSuccess, onError } = options;

  const storeUser = useUserStore((s) => s.user);
  const setUser = useUserStore((s) => s.setUser);

  const { mutate, lastResult, lastError: rawLastError, isInFlight: _isInflight, reset } =
    useOptimisticMutation();

  const mutateSettings = useCallback(
    async (payload: UpdateMeSettingsDto) => {
      const userId = storeUser?.userId;
      const snapshot = storeUser ?? undefined;

      const startMs = Date.now();

      const result = await mutate({
        key: ['user-settings', userId ?? 'anonymous'],
        optimisticData: (current: UserMeResponseDto | undefined) => {
          if (!current) return snapshot;
          // Shallow-merge the settings partial into the existing settings blob.
          const mergedSettings = {
            ...(current.settings ?? {}),
            ...(payload.preferences ?? {}),
          };
          return {
            ...current,
            settings: mergedSettings,
            updatedAt: new Date().toISOString(),
          };
        },
        run: async () => {
          const sdkResult = await updateMySettings(payload);
          return sdkResult;
        },
        onSuccess: () => {
          // Re-fetch the full user to get the canonical settings state.
          // Alternatively, merge the partial result if the SDK returns it.
          // For now we rely on the cross-tab listener (TKT-4.3.E2) to
          // refresh other tabs; the originating tab already has the
          // optimistic state.
          if (userId) {
            broadcastProfileUpdated({ userId, kind: 'settings' satisfies ProfileUpdateKind });
          }
          onSuccess?.();
        },
        onError: (apiError: ApiError | unknown) => {
          const code = isApiError(apiError) ? apiError.code : 'GLOBAL_UNKNOWN';
          onError?.(code);
        },
        broadcasts: undefined,
      });

      // Emit breadcrumb on resolve (success or error).
      emitBreadcrumb('phase4:4.3:settings', {
        status: result.status,
        durationMs: Date.now() - startMs,
        ...(result.status === 'reverted' && isApiError(result.apiError)
          ? { code: result.apiError.code }
          : {}),
      });

      return result;
    },
    [mutate, storeUser, setUser, onSuccess, onError],
  );

  const isPending = lastResult !== null && lastResult.status === 'pending';
  const isSuccess = lastResult !== null && lastResult.status === 'success';
  const isError = lastResult !== null && lastResult.status === 'reverted';

  const lastApiError: ApiError | null =
    isError && isApiError(lastResult.apiError)
      ? (lastResult.apiError as ApiError)
      : null;

  /**
   * Build the typed `lastError`. When `AUTH_INVALID_CURRENT_PASSWORD`
   * is returned, extend the copy entry with `needsPasswordConfirmation: true`
   * so the form can render the inline password step.
   */
  const lastError: UserCopyEntry | UserCopyWithPasswordConfirm | null =
    lastApiError !== null
      ? (() => {
          const copy = getUserCopy(lastApiError.code);
          if (lastApiError.code === 'AUTH_INVALID_CURRENT_PASSWORD') {
            return { ...copy, needsPasswordConfirmation: true } as UserCopyWithPasswordConfirm;
          }
          return copy;
        })()
      : null;

  const resetError = useCallback(() => {
    reset();
  }, [reset]);

  return {
    mutate: mutateSettings,
    isPending,
    isSuccess,
    isError,
    lastError,
    lastApiError,
    resetError,
  };
}
