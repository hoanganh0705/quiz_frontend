/**
 * `AuditLogPage.spec.tsx` — AuditLogPage component tests.
 *
 * Source epic:   Epic 7.11 — Admin Audit Log Surface and Backend Capability Verification.
 * Source ticket: TKT-7.11.I3.
 */

import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { mockGetFeatureFlagValue, mockUseAdminAuditLog } = vi.hoisted(() => ({
  mockGetFeatureFlagValue: vi.fn(),
  mockUseAdminAuditLog: vi.fn(),
}));

vi.mock('@/lib/feature-flags', () => ({
  getFeatureFlagValue: (...args: unknown[]) => mockGetFeatureFlagValue(...args),
}));

vi.mock('@/features/admin/hooks/useAdminFeatureFlag', () => ({
  useAdminFeatureFlag: (flag: string) => {
    const value = mockGetFeatureFlagValue(flag);
    return { flag, value, isLive: value === 'live', isPlaceholder: value !== 'live' };
  },
}));

vi.mock('../../hooks/useAdminAuditLog', () => ({
  useAdminAuditLog: (...args: unknown[]) => mockUseAdminAuditLog(...args),
}));

vi.mock('../../hooks/useAuditLogFilters', () => ({
  useAuditLogFilters: () => ({
    filters: {},
    hasActiveFilters: false,
    setFilter: vi.fn(),
    setFilters: vi.fn(),
    resetFilters: vi.fn(),
    getFilter: vi.fn(() => undefined),
  }),
}));

vi.mock('../../hooks/useOffsetPaginatedAuditLogs', () => ({
  useOffsetPaginatedAuditLogs: () => ({
    offset: 0,
    limit: 20,
    page: 1,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
    goToPage: vi.fn(),
    nextPage: vi.fn(),
    prevPage: vi.fn(),
    resetPagination: vi.fn(),
    setOffset: vi.fn(),
    setLimit: vi.fn(),
  }),
  useOffsetPaginated: () => ({
    offset: 0,
    limit: 20,
    page: 1,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
    goToPage: vi.fn(),
    nextPage: vi.fn(),
    prevPage: vi.fn(),
    resetPagination: vi.fn(),
    setOffset: vi.fn(),
    setLimit: vi.fn(),
  }),
  AUDIT_LOG_DEFAULT_PAGE_SIZE: 20,
  AUDIT_LOG_MAX_PAGE_SIZE: 100,
}));

// Mock next/navigation for useAuditLogFilters
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/admin/audit',
}));

import { AuditLogPage } from '../AuditLogPage';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AuditLogPage', () => {
  // ─── Disabled state (feature flag = placeholder) ────────────────────

  it('renders disabled notice when feature flag is placeholder', () => {
    mockGetFeatureFlagValue.mockReturnValue('placeholder');
    mockUseAdminAuditLog.mockReturnValue({
      entries: [],
      total: 0,
      hasMore: false,
      isLoading: false,
      isValidating: false,
      error: null,
      isNotExposed: false,
      mutate: vi.fn(),
    });

    render(<AuditLogPage />);

    expect(screen.getByTestId('audit-log-disabled-notice')).toBeInTheDocument();
  });

  // ─── Loading state ──────────────────────────────────────────────────

  it('renders skeleton during loading', () => {
    mockGetFeatureFlagValue.mockReturnValue('live');
    mockUseAdminAuditLog.mockReturnValue({
      entries: [],
      total: 0,
      hasMore: false,
      isLoading: true,
      isValidating: false,
      error: null,
      isNotExposed: false,
      mutate: vi.fn(),
    });

    render(<AuditLogPage />);

    expect(screen.getByTestId('audit-log-skeleton')).toBeInTheDocument();
  });

  // ─── Empty state ────────────────────────────────────────────────────

  it('renders empty state when no entries', () => {
    mockGetFeatureFlagValue.mockReturnValue('live');
    mockUseAdminAuditLog.mockReturnValue({
      entries: [],
      total: 0,
      hasMore: false,
      isLoading: false,
      isValidating: false,
      error: null,
      isNotExposed: false,
      mutate: vi.fn(),
    });

    render(<AuditLogPage />);

    expect(screen.getByTestId('audit-log-empty-state')).toBeInTheDocument();
  });

  // ─── Success state ──────────────────────────────────────────────────

  it('renders list when entries are present', () => {
    mockGetFeatureFlagValue.mockReturnValue('live');
    mockUseAdminAuditLog.mockReturnValue({
      entries: [
        {
          id: 'audit-1',
          actorId: '00000000-0000-4000-8000-000000000001',
          action: 'role.grant',
          targetType: 'user',
          targetId: '00000000-0000-4000-8000-000000000002',
          requestId: 'req-1',
          timestamp: '2026-08-01T00:00:00.000Z',
          payload: {},
        },
      ],
      total: 1,
      hasMore: false,
      isLoading: false,
      isValidating: false,
      error: null,
      isNotExposed: false,
      mutate: vi.fn(),
    });

    render(<AuditLogPage />);

    expect(screen.getAllByTestId('audit-log-list').length).toBeGreaterThan(0);
    expect(screen.getByTestId('audit-log-item')).toBeInTheDocument();
  });

  // ─── Error state ────────────────────────────────────────────────────

  it('renders error state when error is present', () => {
    mockGetFeatureFlagValue.mockReturnValue('live');
    mockUseAdminAuditLog.mockReturnValue({
      entries: [],
      total: 0,
      hasMore: false,
      isLoading: false,
      isValidating: false,
      error: { code: 'GLOBAL_INTERNAL_ERROR', message: 'Error' } as never,
      isNotExposed: false,
      mutate: vi.fn(),
    });

    render(<AuditLogPage />);

    expect(screen.getByTestId('audit-log-error-state')).toBeInTheDocument();
  });

  // ─── Not exposed state ──────────────────────────────────────────────

  it('renders not-exposed notice when isNotExposed is true', () => {
    mockGetFeatureFlagValue.mockReturnValue('live');
    mockUseAdminAuditLog.mockReturnValue({
      entries: [],
      total: 0,
      hasMore: false,
      isLoading: false,
      isValidating: false,
      error: null,
      isNotExposed: true,
      mutate: vi.fn(),
    });

    render(<AuditLogPage />);

    expect(
      screen.getByTestId('audit-log-not-exposed-notice'),
    ).toBeInTheDocument();
  });
});