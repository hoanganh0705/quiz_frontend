/**
 * `useAdminAuditLogEntry.spec.tsx` — useAdminAuditLogEntry hook tests.
 *
 * Source epic:   Epic 7.11 — Admin Audit Log Surface and Backend Capability Verification.
 * Source ticket: TKT-7.11.I2.
 */

import { type ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useAdminAuditLogEntry } from '../useAdminAuditLogEntry';

const { mockGetFeatureFlagValue, mockGetAuditLogEntry } = vi.hoisted(() => ({
  mockGetFeatureFlagValue: vi.fn(),
  mockGetAuditLogEntry: vi.fn(),
}));

vi.mock('@/lib/feature-flags', () => ({
  getFeatureFlagValue: (...args: unknown[]) => mockGetFeatureFlagValue(...args),
}));

vi.mock('@/features/admin/audit-admin/services/auditLogService', () => ({
  listAuditLog: vi.fn(),
  getAuditLogEntry: (...args: unknown[]) => mockGetAuditLogEntry(...args),
}));

function createWrapper() {
  return ({ children }: { children: ReactNode }) => (
    <SWRConfig value={{ provider: () => new Map() }}>{children}</SWRConfig>
  );
}

const MOCK_ENTRY = {
  id: 'audit-entry-1',
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
  mockGetAuditLogEntry.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useAdminAuditLogEntry', () => {
  // ─── Null entryId ────────────────────────────────────────────────────

  it('returns null entry when entryId is null', async () => {
    const { result } = renderHook(() => useAdminAuditLogEntry(null), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.entry).toBeNull();
    expect(mockGetAuditLogEntry).not.toHaveBeenCalled();
  });

  // ─── Success ────────────────────────────────────────────────────────

  it('fetches entry on success', async () => {
    mockGetAuditLogEntry.mockResolvedValueOnce(MOCK_ENTRY);

    const { result } = renderHook(() => useAdminAuditLogEntry('audit-entry-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.entry).toBeDefined();
    expect(result.current.entry?.id).toBe('audit-entry-1');
  });

  // ─── Error ──────────────────────────────────────────────────────────

  it('returns error when fetch fails', async () => {
    mockGetAuditLogEntry.mockRejectedValueOnce(new Error('Fetch failed'));

    const { result } = renderHook(() => useAdminAuditLogEntry('audit-entry-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.error).toBeDefined();
    });

    expect(result.current.entry).toBeNull();
  });

  // ─── Feature flag placeholder ────────────────────────────────────────

  it('returns null entry when feature flag is placeholder', async () => {
    mockGetFeatureFlagValue.mockReturnValue('placeholder');

    const { result } = renderHook(() => useAdminAuditLogEntry('audit-entry-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.entry).toBeNull();
    expect(mockGetAuditLogEntry).not.toHaveBeenCalled();
  });
});