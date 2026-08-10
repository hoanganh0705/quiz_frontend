/**
 * `RankingAdminPage` unit tests.
 *
 * Source epic:   Epic 7.9 — Ranking Admin: Recalculate, Consistency Check, Period Reset.
 * Source ticket: TKT-7.9.F1.
 */

import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useAdminFeatureFlag } from '@/features/admin/hooks/useAdminFeatureFlag';
import { usePermission } from '@/features/admin/hooks/usePermission';

import { RankingAdminPage } from '../RankingAdminPage';

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('@/features/admin/hooks/useAdminFeatureFlag', () => ({
  useAdminFeatureFlag: vi.fn(),
}));

vi.mock('@/features/admin/hooks/usePermission', () => ({
  usePermission: vi.fn(),
}));

vi.mock('../RecalculateRankingPanel', () => ({
  RecalculateRankingPanel: () => (
    <div data-testid="mock-recalculate-ranking-panel">Recalculate</div>
  ),
}));

vi.mock('../PeriodResetPanel', () => ({
  PeriodResetPanel: () => (
    <div data-testid="mock-period-reset-panel">Reset</div>
  ),
}));

vi.mock('../ConsistencyCheckPanel', () => ({
  ConsistencyCheckPanel: () => (
    <div data-testid="mock-consistency-check-panel">Consistency</div>
  ),
}));

// ─── Setup / Teardown ────────────────────────────────────────────────────────

beforeEach(() => {
  vi.mocked(useAdminFeatureFlag).mockReset();
  vi.mocked(usePermission).mockReset();
  // Default: flag live, permission granted, not loading.
  vi.mocked(useAdminFeatureFlag).mockReturnValue({
    flag: 'admin_ranking_live',
    value: 'live',
    isLive: true,
    isPlaceholder: false,
  });
  vi.mocked(usePermission).mockReturnValue({
    isLoading: false,
    error: null,
    hasPermission: true,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('TKT-7.9.F1 — RankingAdminPage', () => {
  it('renders all three panels when flag is live and permission is granted', () => {
    render(<RankingAdminPage />);

    expect(screen.getByTestId('ranking-admin-page')).toBeInTheDocument();
    expect(
      screen.getByTestId('mock-recalculate-ranking-panel'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('mock-period-reset-panel'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('mock-consistency-check-panel'),
    ).toBeInTheDocument();
  });

  it('renders the page header with title and description', () => {
    render(<RankingAdminPage />);

    expect(screen.getByText('Ranking Admin')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Recalculate rankings, check consistency, and reset ranking periods.',
      ),
    ).toBeInTheDocument();
  });

  it('renders the responsive grid layout', () => {
    render(<RankingAdminPage />);

    expect(screen.getByTestId('ranking-admin-grid')).toBeInTheDocument();
  });

  it('renders the disabled notice when flag is placeholder', () => {
    vi.mocked(useAdminFeatureFlag).mockReturnValue({
      flag: 'admin_ranking_live',
      value: 'placeholder',
      isLive: false,
      isPlaceholder: true,
    });

    render(<RankingAdminPage />);

    expect(
      screen.getByTestId('ranking-admin-disabled-notice'),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId('ranking-admin-page'),
    ).not.toBeInTheDocument();
  });

  it('renders the permission-pending skeleton when permission is loading', () => {
    vi.mocked(usePermission).mockReturnValue({
      isLoading: true,
      error: null,
      hasPermission: false,
    });

    render(<RankingAdminPage />);

    expect(
      screen.getByTestId('ranking-admin-permission-pending'),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId('ranking-admin-page'),
    ).not.toBeInTheDocument();
  });

  it('renders the page when permission is not granted', () => {
    vi.mocked(usePermission).mockReturnValue({
      isLoading: false,
      error: null,
      hasPermission: false,
    });

    render(<RankingAdminPage />);

    // The page still renders the layout — the panels themselves gate
    // their action buttons.
    expect(screen.getByTestId('ranking-admin-page')).toBeInTheDocument();
    expect(
      screen.getByTestId('mock-recalculate-ranking-panel'),
    ).toBeInTheDocument();
  });
});
