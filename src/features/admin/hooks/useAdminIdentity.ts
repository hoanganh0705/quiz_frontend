'use client';

import { useEffect, useState } from 'react';

import { useAuth } from '@/features/auth/hooks/use-auth';
import { ApiError } from '@/lib/api/core/ApiError';

import { useAdminFeatureFlag } from './useAdminFeatureFlag';

export interface UseAdminIdentityResult {
role: 'admin' | null;
isLoading: boolean;
error: ApiError | null;
}

interface AdminIdentityResponse {
role?: string;
}

async function fetchAdminIdentityPath(): Promise<AdminIdentityResponse> {
const response = await fetch('/admin/me', {
credentials: 'same-origin',
headers: { Accept: 'application/json' },
  });
if (!response.ok) {
throw new ApiError({
isAxiosError: true,
name: 'AxiosError',
message: 'admin identity fetch failed',
config: undefined,
request: undefined,
response: {
status: response.status,
data: {
status: response.status,
detail: 'admin identity fetch failed',
title: 'AdminIdentityError',
        },
      },
toJSON: () => ({}),
    } as unknown as Parameters<typeof ApiError.fromAxios>[0]);
  }
return (await response.json()) as AdminIdentityResponse;
}

export function useAdminIdentity(): UseAdminIdentityResult {
const { currentUser } = useAuth();
const flag = useAdminFeatureFlag('admin_live');
const [state, setState] = useState<{
role: 'admin' | null;
isLoading: boolean;
error: ApiError | null;
  }>({ role: null, isLoading: false, error: null });

const slimRole = currentUser?.role;
const isAdminFastPath = slimRole === 'admin';

useEffect(() => {
if (!flag.isLive) return;
if (currentUser === null) return;
if (slimRole !== undefined) return;
let cancelled = false;
setState({ role: null, isLoading: true, error: null });
fetchAdminIdentityPath()
      .then((payload) => {
if (cancelled) return;
const role = payload.role === 'admin' ? 'admin' : null;
setState({ role, isLoading: false, error: null });
      })
      .catch((caught: unknown) => {
if (cancelled) return;
const error =
caught instanceof ApiError
? caught
: new ApiError({
isAxiosError: true,
name: 'AxiosError',
message: String(caught),
config: undefined,
request: undefined,
response: {
status: 0,
data: { status: 0, detail: String(caught), title: 'UnknownError' },
                },
toJSON: () => ({}),
              } as unknown as Parameters<typeof ApiError.fromAxios>[0]);
setState({ role: null, isLoading: false, error });
      });
return () => {
cancelled = true;
    };
  }, [flag.isLive, slimRole, currentUser]);

if (isAdminFastPath) {
return { role: 'admin', isLoading: false, error: null };
  }

return state;
}
