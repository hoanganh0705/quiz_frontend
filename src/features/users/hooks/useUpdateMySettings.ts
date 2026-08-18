

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

export interface UserCopyWithPasswordConfirm extends UserCopyEntry {

needsPasswordConfirmation: true;
}

export interface UseUpdateMySettingsOptions {

onSuccess?: () => void;

onError?: (code: string) => void;
}

export interface UseUpdateMySettingsReturn {

mutate: (
payload: UpdateMeSettingsDto,
  ) => Promise<OptimisticMutationResult<UserControllerUpdateMeSettingsResult>>;

isPending: boolean;

isSuccess: boolean;

isError: boolean;

lastError: UserCopyEntry | UserCopyWithPasswordConfirm | null;

lastApiError: ApiError | null;

resetError: () => void;
}

const SENTRY_CATEGORY = 'phase4:4.3:settings';

function emitBreadcrumb(
_category: string,
_data: { status: string; durationMs: number; code?: string },
): void {

void _category;
void _data;
}

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
