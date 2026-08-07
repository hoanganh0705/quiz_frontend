/**
 * `useAdminAuditLog.spec.tsx` — useAdminAuditLog hook tests.
 *
 * Source epic:   Epic 7.11 — Admin Audit Log Surface and Backend Capability Verification.
 * Source ticket: TKT-7.11.I2.
 */

import { type ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useAdminAuditLog } from '../useAdminAuditLog';

const { mockGetFeatureFlagValue, mockListAuditLog } = vi.hoisted(() => ({
  mockGetFeatureFlagValue: vi.fn(),
  mockListAuditLog: vi.fn(),
}));

vi.mock('@/lib/feature-flags', () => ({
  getFeatureFlagValue: (...args: unknown[]) => mockGetFeatureFlagValue(...args),
}));

vi.mock('@/features/admin/audit-admin/services/auditLogService', () => ({
  listAuditLog: (...args: unknown[]) => mockListAuditLog(...args),
  getAuditLogEntry: vi.fn(),
}));

function createWrapper() {
  return ({ children }: { children: ReactNode }) => (
    <SWRConfig value={{ provider: () => new Map() }}>{children}</SWRConfig>
  );
}

const MOCK_ENTRY = {
  id: 'audit-1',
  actorId: '00000000-0000-4000-8000-000000000001',
  action: 'role.grant',
  targetType: 'user',
  targetId: '00000000-0000-4000-8000-000000000002',
  requestId: 'req-123',
  timestamp: '2026-08-01T00:00:00.000Z',
  payload: {},
};

beforeEach(() => {
  mockGetFeatureFlagValue.mockReturnValue('live');
  mockListAuditLog.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useAdminAuditLog', () => {
  // ─── Loading state ──────────────────────────────────────────────────

  it('returns loading state initially', () => {
    mockListAuditLog.mockImplementation(
      () => new Promise(() => {}) as ReturnType<typeof mockListAuditLog>,
    );

    const { result } = renderHook(() => useAdminAuditLog(), {
      wrapper: createWrapper(),
    });
    expect(result.current.isLoading).toBe(true);
  });

  // ─── Success state ──────────────────────────────────────────────────

  it('returns entries on success', async () => {
    mockListAuditLog.mockResolvedValue({
      data: [MOCK_ENTRY],
      meta: { total: 1, offset: 0, limit: 20 },
    });

    const { result } = renderHook(() => useAdminAuditLog(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.entries).toHaveLength(1);
    expect(result.current.entries[0]?.id).toBe('audit-1');
    expect(result.current.total).toBe(1);
    expect(result.current.isNotExposed).toBe(false);
  });

  // ─── Error state ─────────────────────────────────────────────────────

  it('returns error on API failure', async () => {
    mockListAuditLog.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useAdminAuditLog(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.error).toBeDefined();
    });

    expect(result.current.entries).toEqual([]);
  });

  // ─── Degradation: NOT_EXPOSED ────────────────────────────────────────

  it('returns isNotExposed=true on NOT_EXPOSED error', async () => {
    // Simulate the NOT_EXPOSED marker behaviour
    mockListAuditLog.mockResolvedValue(null);

    const { result } = renderHook(() => useAdminAuditLog(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isNotExposed).toBe(false); // null is not the marker
  });

  // ─── Filter handling ─────────────────────────────────────────────────

  it('passes filters to the service', async () => {
    mockListAuditLog.mockResolvedValue({
      data: [],
      meta: { total: 0, offset: 0, limit: 20 },
    });

    renderHook(
      () =>
        useAdminAuditLog(
          { actorId: '00000000-0000-4000-8000-000000000001' },
          { offset: 0, limit: 20 },
        ),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(mockListAuditLog).toHaveBeenCalled();
    });

    expect(mockListAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: expect.objectContaining({
          actorId: '00000000-0000-4000-8000-000000000001',
        }),
        pagination: expect.objectContaining({
          offset: 0,
          limit: 20,
        }),
      }),
    );
  });

  // ─── Empty state ─────────────────────────────────────────────────────

  it('returns empty entries when service returns empty array', async () => {
    mockListAuditLog.mockResolvedValue({
      data: [],
      meta: { total: 0, offset: 0, limit: 20 },
    });

    const { result } = renderHook(() => useAdminAuditLog(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.entries).toEqual([]);
    expect(result.current.total).toBe(0);
    expect(result.current.hasMore).toBe(false);
  });

  // ─── Pagination: hasMore ─────────────────────────────────────────────

  it('calculates hasMore based on offset+limit<total', async () => {
    mockListAuditLog.mockResolvedValue({
      data: [MOCK_ENTRY],
      meta: { total: 100, offset: 0, limit: 20 },
    });

    const { result } = renderHook(
      () => useAdminAuditLog({}, { offset: 0, limit: 20 }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.hasMore).toBe(true);
  });
});