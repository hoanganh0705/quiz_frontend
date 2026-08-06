'use client';

/**
 * `features/admin/hooks/useAdminIdentity.ts`
 *
 * Source epic:   Epic 7.1.
 * Source ticket: TKT-7.1.D3.
 *
 * Admin-aware identity-fetch fallback.
 *
 * ## Purpose
 *
 * The slim `/auth/me` payload (`CurrentUserResponseDto`) typically
 * exposes `role: string` for admin users. Phase 7's `useAdminRole`
 * reads the role from that payload (`useAuth().currentUser.role`)
 * and is the primary consumer.
 *
 * When the backend's `/auth/me` does NOT include `role` (older
 * versions, or admin-only routes that intentionally slim the
 * payload), this hook performs a fallback fetch to a documented
 * admin-aware identity endpoint and returns the resolved role.
 *
 * ## When the fallback is exercised
 *
 * The hook is a no-op when the slim payload already includes `role`.
 * According to the TKT-7.1.A1 verification catalogue, the slim
 * payload DOES include `role` today, so the hook short-circuits in
 * the common case. The fetch path is wired up so that when the
 * backend's admin-aware identity endpoint is added (or when
 * `/auth/me` is slimmed down by mistake), the hook is ready to take
 * over without a cross-cutting refactor.
 *
 * ## Phase 7 surface
 *
 *   - `useAdminRole` (TKT-7.1.B3) is the primary consumer. When the
 *     role resolves from the slim payload, the role-based selectors
 *     fire immediately. When `useAuth().currentUser.role` is absent,
 *     the hook fetches the fallback endpoint and returns the
 *     resolved role.
 *   - The hook is gated by the `phase7_admin` feature flag — when
 *     the flag is off, the hook does not fetch.
 *
 * ## Non-blocking semantics
 *
 * The hook never blocks on the fetch. It returns `isLoading: true`
 * while the fetch is in flight and lets consumers render a skeleton.
 * On error, it returns `{ role: null, isLoading: false, error }`
 * without retrying — the consumer decides whether to surface a retry
 * affordance.
 */

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

/**
 * Internal: best-effort fetch of the admin-aware identity endpoint.
 *
 * The endpoint is intentionally NOT in the SDK yet (it lands in a
 * later Phase 7 story). The fetch is guarded by the `phase7_admin`
 * feature flag so the hook makes no network traffic by default.
 *
 * The endpoint path is documented in TKT-7.1.A1 and recorded in the
 * `ADMIN_ENDPOINTS` catalogue. When the SDK ships the endpoint, this
 * function is replaced with the generated SDK call (no API change).
 */
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
  const flag = useAdminFeatureFlag('phase7_admin');
  const [state, setState] = useState<{
    role: 'admin' | null;
    isLoading: boolean;
    error: ApiError | null;
  }>({ role: null, isLoading: false, error: null });

  // Fast path: the slim payload already exposes the role. No fetch.
  const slimRole = currentUser?.role;
  if (slimRole === 'admin') {
    return { role: 'admin', isLoading: false, error: null };
  }

  // Fallback path: only when the feature flag is live and the slim
  // payload is silent about the role. We do not block; the hook
  // reports `isLoading: true` while the fetch is in flight.
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

  return state;
}
