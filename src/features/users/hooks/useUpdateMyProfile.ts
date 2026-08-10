/**
 * `useUpdateMyProfile` — optimistic profile mutation hook.
 *
 * Source epic:   Epic 4.3 — Edit profile + user settings.
 * Source ticket: TKT-4.3.B1.
 *
 * ## What this hook owns
 *
 * The snapshot-and-revert dance for `PATCH /users/me`:
 *
 *   1. Snapshot the current `useUserStore().user`.
 *   2. Apply an optimistic patch (merge `displayName`, `bio`, `avatarUrl`
 *      into the store).
 *   3. Call `updateMyProfile(payload)` from `users.service.ts`.
 *   4. On success → update the store with the returned DTO +
 *      emit `broadcastProfileUpdated({ userId, kind: 'me' })`.
 *   5. On any `ApiError` → revert to the snapshot and surface
 *      `lastError` via `getUserCopy`.
 *
 * ## `broadcastProfileUpdated` self-suppression
 *
 * The `profile-broadcast-channel.ts` layer filters same-tab messages
 * using `tabId`. The hook does NOT need to suppress its own broadcast.
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
  updateMyProfile,
  type UserControllerUpdateMeResult,
} from '@/features/users/services/users.service';
import {
  useUserStore,
} from '@/features/users/store/user-store';
import type { UpdateMeDto } from '@/lib/api/generated/schemas';

// ─── Public types ───────────────────────────────────────────────────────────────

export interface UseUpdateMyProfileOptions {
  /** Called after the server confirms the update. */
  onSuccess?: (data: UserMeResponseDto) => void;
  /** Called when the server rejects the update. Receives the error code. */
  onError?: (code: string) => void;
}

export interface UseUpdateMyProfileReturn {
  /** Trigger the profile update. */
  mutate: (payload: UpdateMeDto) => Promise<OptimisticMutationResult<UserControllerUpdateMeResult>>;
  /** `true` while a mutation is in flight. */
  isPending: boolean;
  /** `true` after a successful mutation. */
  isSuccess: boolean;
  /** `true` after a rejected mutation. */
  isError: boolean;
  /** The typed user-copy entry for the last rejected error. `null` otherwise. */
  lastError: UserCopyEntry | null;
  /** The raw `ApiError` from the last rejected mutation. `null` otherwise. */
  lastApiError: ApiError | null;
  /** Clear `lastError` and reset the status to idle. */
  resetError: () => void;
}

// ─── Telemetry ────────────────────────────────────────────────────────────────

/**
 * Breadcrumb emitter — currently a no-op. Replace with Sentry once the SDK
 * is wired in a later epic. The call site signature is fixed:
 * `addBreadcrumb({ category, data: { status, durationMs, code? } })`.
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
 * Optimistic profile mutation hook.
 *
 * @example
 * ```ts
 * const { mutate, isPending, lastError } = useUpdateMyProfile({
 *   onSuccess: () => toast.success('Profile saved'),
 * });
 * await mutate({ displayName: 'New Name' });
 * ```
 */
export function useUpdateMyProfile(
  options: UseUpdateMyProfileOptions = {},
): UseUpdateMyProfileReturn {
  const { onSuccess, onError } = options;

  const storeUser = useUserStore((s) => s.user);
  const setUser = useUserStore((s) => s.setUser);

  const { mutate, lastResult, lastError: rawLastError, reset } =
    useOptimisticMutation();

  const mutateProfile = useCallback(
    async (payload: UpdateMeDto) => {
      const userId = storeUser?.userId;
      // Snapshot the current store user. This is always defined when the
      // user is authenticated (the hook is only called in authenticated pages).
      const snapshot = storeUser;

      const startMs = Date.now();

      const result = await mutate({
        key: ['user-profile', userId ?? 'anonymous'],
        optimisticData: (_current: UserMeResponseDto | undefined): UserMeResponseDto | undefined => {
          // Apply the partial payload optimistically to the snapshot.
          // If no snapshot (should not happen for authenticated users), return undefined.
          if (!snapshot) return undefined;
          return { ...snapshot, ...payload, updatedAt: new Date().toISOString() };
        },
        run: async () => {
          const sdkResult = await updateMyProfile(payload);
          return sdkResult;
        },
        onSuccess: (updated) => {
          // Update the Zustand store with the server's response.
          // The SDK wraps the response in `data`; the intersection type
          // `WrappedDtoData & UserMeResponseDto` requires a cast.
          if (updated?.data) {
            setUser(updated.data as UserMeResponseDto);
          }
          // Broadcast to other tabs.
          if (userId) {
            broadcastProfileUpdated({ userId, kind: 'me' satisfies ProfileUpdateKind });
          }
          onSuccess?.(updated?.data as UserMeResponseDto);
        },
        onError: (apiError: ApiError | unknown) => {
          const code = isApiError(apiError) ? apiError.code : 'GLOBAL_UNKNOWN';
          onError?.(code);
        },
        broadcasts: undefined,
      });

      emitBreadcrumb('phase4:4.3:profile', {
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

  const lastError: UserCopyEntry | null =
    lastApiError !== null ? getUserCopy(lastApiError.code) : null;

  const resetError = useCallback(() => {
    reset();
  }, [reset]);

  return {
    mutate: mutateProfile,
    isPending,
    isSuccess,
    isError,
    lastError,
    lastApiError,
    resetError,
  };
}
