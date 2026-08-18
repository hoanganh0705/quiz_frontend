

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

export interface UseUpdateMyProfileOptions {

onSuccess?: (data: UserMeResponseDto) => void;

onError?: (code: string) => void;
}

export interface UseUpdateMyProfileReturn {

mutate: (payload: UpdateMeDto) => Promise<OptimisticMutationResult<UserControllerUpdateMeResult>>;

isPending: boolean;

isSuccess: boolean;

isError: boolean;

lastError: UserCopyEntry | null;

lastApiError: ApiError | null;

resetError: () => void;
}

function emitBreadcrumb(
_category: string,
_data: { status: string; durationMs: number; code?: string },
): void {

void _category;
void _data;
}

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

const snapshot = storeUser;

const startMs = Date.now();

const result = await mutate({
key: ['user-profile', userId ?? 'anonymous'],
optimisticData: (_current: UserMeResponseDto | undefined): UserMeResponseDto | undefined => {

if (!snapshot) return undefined;
return { ...snapshot, ...payload, updatedAt: new Date().toISOString() };
        },
run: async () => {
const sdkResult = await updateMyProfile(payload);
return sdkResult;
        },
onSuccess: (updated) => {

if (updated?.data) {
setUser(updated.data as UserMeResponseDto);
          }

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
