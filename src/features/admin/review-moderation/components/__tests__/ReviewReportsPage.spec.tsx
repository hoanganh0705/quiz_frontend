/**
 * `ReviewReportsPage.spec.tsx` — unit tests for the queue's page
 * composition.
 *
 * Source epic:   Epic 7.5 — Review moderation queue.
 * Source ticket: TKT-7.5.F1.
 *
 * Coverage contract (TKT-7.5.F1 acceptance criteria):
 *
 *   AC #1 — `phase7_admin_review_moderation === 'placeholder'`
 *           renders the documented "coming soon" disabled notice.
 *   AC #2 — `phase7_admin_review_moderation === 'live'` renders
 *           the header, the list, and no extra CTA.
 *   AC #3 — no service / axios / fetch calls originate from this
 *           component.
 *   AC #4 — type-check exits 0 (handled by `pnpm type-check`).
 *
 * Runs in the jsdom project because the page renders React
 * subtrees via `@testing-library/react`.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SWRConfig } from 'swr';

import { ReviewReportsPage } from '@/features/admin/review-moderation/components/ReviewReportsPage';

// ─── Hook mocks (hoisted) ──────────────────────────────────────────────────

const useAdminFeatureFlagMock = vi.hoisted(() =>
  vi.fn((_flag?: unknown) => ({
    isLive: false,
    value: 'placeholder' as 'placeholder' | 'live' | 'enabled' | 'disabled',
    isPlaceholder: true,
  })),
);

const useReviewReportsMock = vi.hoisted(() =>
  vi.fn(() => ({
    items: [],
    isLoading: false,
    isLoadingMore: false,
    hasMore: false,
    loadMore: vi.fn(async () => undefined),
    error: null,
    refresh: vi.fn(async () => undefined),
    retryBannerVisible: false,
    show: 'pending' as 'pending' | 'resolved',
    setShow: vi.fn(),
  })),
);

vi.mock('@/features/admin/hooks/useAdminFeatureFlag', () => ({
  useAdminFeatureFlag: useAdminFeatureFlagMock,
}));

vi.mock('@/features/admin/review-moderation/hooks/useReviewReports', () => ({
  useReviewReports: useReviewReportsMock,
}));

vi.mock('@/features/admin/hooks', () => ({
  useAdminFeatureFlag: useAdminFeatureFlagMock,
}));

// ─── Helpers ────────────────────────────────────────────────────────────────

function renderPage() {
  return render(
    <SWRConfig value={{ provider: () => new Map() }}>
      <ReviewReportsPage />
    </SWRConfig>,
  );
}

// ─── Setup ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  useAdminFeatureFlagMock.mockReturnValue({
    isLive: false,
    value: 'placeholder',
    isPlaceholder: true,
  });
  useReviewReportsMock.mockReturnValue({
    items: [],
    isLoading: false,
    isLoadingMore: false,
    hasMore: false,
    loadMore: vi.fn(async () => undefined),
    error: null,
    refresh: vi.fn(async () => undefined),
    retryBannerVisible: false,
    show: 'pending',
    setShow: vi.fn(),
  });
});

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('TKT-7.5.F1 — ReviewReportsPage: flag gate', () => {
  it('renders the documented "coming soon" notice when the flag is "placeholder"', () => {
    useAdminFeatureFlagMock.mockReturnValue({
      isLive: false,
      value: 'placeholder',
      isPlaceholder: true,
    });

    renderPage();
    expect(
      screen.getByText(/Review moderation coming soon/i),
    ).toBeInTheDocument();
  });

  it('renders the documented "disabled" notice when the flag value is non-live (e.g. "disabled")', () => {
    useAdminFeatureFlagMock.mockReturnValue({
      isLive: false,
      value: 'disabled',
      isPlaceholder: false,
    });

    renderPage();
    expect(
      screen.getByText(/Review moderation is disabled/i),
    ).toBeInTheDocument();
  });

  it('renders the documented header + list when the flag is "live"', () => {
    useAdminFeatureFlagMock.mockReturnValue({
      isLive: true,
      value: 'live',
      isPlaceholder: false,
    });

    renderPage();
    expect(
      screen.getByRole('heading', { name: /Review moderation/i, level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('review-reports-list')).toBeInTheDocument();
  });

  it('renders the documented header + list when the flag is "enabled"', () => {
    useAdminFeatureFlagMock.mockReturnValue({
      isLive: true,
      value: 'enabled',
      isPlaceholder: false,
    });

    renderPage();
    expect(
      screen.getByRole('heading', { name: /Review moderation/i, level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('review-reports-list')).toBeInTheDocument();
  });

  it('reads the phase7_admin_review_moderation flag', () => {
    renderPage();
    expect(useAdminFeatureFlagMock).toHaveBeenCalledWith(
      'phase7_admin_review_moderation',
    );
  });
});

describe('TKT-7.5.F1 — ReviewReportsPage: no service imports', () => {
  it('the component source contains no axios or fetch() calls', async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const source = readFileSync(
      resolve(__dirname, '..', 'ReviewReportsPage.tsx'),
      'utf-8',
    );
    expect(source).not.toMatch(/from\s+['"]axios['"]/);
    expect(source).not.toMatch(/(?:^|[^.\w])fetch\s*\(/);
    expect(source).not.toMatch(/from\s+['"]@\/features\/admin\/services\/review-moderation\.service['"]/);
  });
});