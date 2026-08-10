/**
 * `__tests__/RankingsAdminRouteHandoff.spec.tsx`
 *
 * Source epic:   Epic 7.9.
 * Source ticket: TKT-7.9.A3 + TKT-7.9.F2.
 */

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RankingsAdminRouteHandoff } from '../_components/RankingsAdminRouteHandoff';

// ─── Mock ────────────────────────────────────────────────────────────────────

vi.mock(
  '@/features/admin/hooks/useAdminFeatureFlag',
  () => ({
    useAdminFeatureFlag: vi.fn(),
  }),
);

vi.mock('@/features/admin/hooks/usePermission', () => ({
  usePermission: vi.fn(() => ({
    isLoading: false,
    error: null,
    hasPermission: true,
  })),
}));

vi.mock('@/app/(protected)/admin/_components/AdminPageHeader', () => ({
  AdminPageHeader: ({
    title,
    description,
  }: {
    title: string;
    description?: string;
  }) => (
    <div data-testid="admin-page-header">
      <h1>{title}</h1>
      {description ? <p>{description}</p> : null}
    </div>
  ),
}));

vi.mock('@/features/admin/ranking-admin/components/RecalculateRankingPanel', () => ({
  RecalculateRankingPanel: () => (
    <div data-testid="mock-recalculate-panel">Recalculate</div>
  ),
}));

vi.mock('@/features/admin/ranking-admin/components/PeriodResetPanel', () => ({
  PeriodResetPanel: () => (
    <div data-testid="mock-period-reset-panel">Reset</div>
  ),
}));

vi.mock('@/features/admin/ranking-admin/components/ConsistencyCheckPanel', () => ({
  ConsistencyCheckPanel: () => (
    <div data-testid="mock-consistency-panel">Consistency</div>
  ),
}));

const { useAdminFeatureFlag } = await import(
  '@/features/admin/hooks/useAdminFeatureFlag'
);

function setup(flagValue: 'live' | 'placeholder' = 'placeholder') {
  vi.mocked(useAdminFeatureFlag).mockReturnValue({
    flag: 'admin_ranking_live',
    value: flagValue,
    isLive: flagValue === 'live',
    isPlaceholder: flagValue === 'placeholder',
  });
}

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.mocked(useAdminFeatureFlag).mockReset();
});

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('RankingsAdminRouteHandoff', () => {
  it('renders disabled notice when flag is placeholder', () => {
    setup('placeholder');
    render(<RankingsAdminRouteHandoff />);
    expect(
      screen.getByTestId('ranking-admin-disabled-notice'),
    ).toBeInTheDocument();
    expect(screen.getByText(/Ranking admin coming soon/)).toBeInTheDocument();
    expect(
      screen.getByText(/admin_ranking_live/),
    ).toBeInTheDocument();
  });

  it('renders RankingAdminPage when flag is live', () => {
    setup('live');
    render(<RankingsAdminRouteHandoff />);
    // F1 has shipped — the flag-live state renders the actual page.
    expect(
      screen.queryByTestId('ranking-admin-disabled-notice'),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('ranking-admin-page')).toBeInTheDocument();
  });

  it('usesAdminFeatureFlag is called with admin_ranking_live', async () => {
    setup('placeholder');
    render(<RankingsAdminRouteHandoff />);
    expect(useAdminFeatureFlag).toHaveBeenCalledWith('admin_ranking_live');
  });

  it('renders correct description text for placeholder state', () => {
    setup('placeholder');
    render(<RankingsAdminRouteHandoff />);
    // The description text is split across multiple elements:
    // <code>admin_ranking_live</code> sits inside the sentence.
    // We verify the key phrase is present across all text nodes.
    const container = screen.getByTestId('ranking-admin-disabled-notice');
    const fullText = container.textContent ?? '';
    expect(fullText).toContain('admin_ranking_live');
    expect(fullText).toContain('default value');
    expect(fullText).toContain('Enable it to expose');
  });

  it('renders shield alert icon', () => {
    setup('placeholder');
    render(<RankingsAdminRouteHandoff />);
    // ShieldAlert renders as an SVG inside the container
    const container = screen.getByTestId('ranking-admin-disabled-notice');
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders without crashing for any flag value', () => {
    for (const flagValue of ['placeholder', 'live'] as const) {
      setup(flagValue);
      const { unmount } = render(<RankingsAdminRouteHandoff />);
      expect(() => unmount()).not.toThrow();
    }
  });
});
