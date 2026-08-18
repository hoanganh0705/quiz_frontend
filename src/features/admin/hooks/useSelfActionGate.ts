'use client';

import { useCallback, useMemo } from 'react';

import { useUser } from '@/features/users/hooks/use-user';

export interface UseSelfActionGate {

isSelfAction: (targetUserId: string) => boolean;

gate: <T>(targetUserId: string, fn: () => T) => T | null;
}

export function useSelfActionGate(): UseSelfActionGate {
const { user } = useUser();

const currentUserId = user?.userId ?? null;

const isSelfAction = useCallback(
(targetUserId: string) => {
if (currentUserId === null) return false;
return currentUserId === targetUserId;
    },
[currentUserId],
  );

const gate = useCallback(
<T>(targetUserId: string, fn: () => T): T | null => {

if (currentUserId === null) return null;
if (currentUserId === targetUserId) return null;
return fn();
    },
[currentUserId],
  );

return useMemo<UseSelfActionGate>(
() => ({
isSelfAction,
gate,
    }),
[isSelfAction, gate],
  );
}
