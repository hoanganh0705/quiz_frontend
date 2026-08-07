/**
 * `app/admin/reviews/reports/__tests__/page.spec.tsx`
 *
 * Source epic:   Epic 7.5.
 * Source tickets: TKT-7.5.A3 (initial breadcrumb) + TKT-7.5.F2
 *   (route-level wiring + dev-time observability).
 *
 * Validates that the `/admin/reviews/reports` route file:
 *   1. Renders without crashing.
 *   2. Emits a `review.moderation.mount` breadcrumb on mount
 *      (F2 — supersedes the A3 `review.reports.mount` name).
 *   3. Renders the documented disabled notice when the
 *      `phase7_admin_review_moderation` flag is `'placeholder'`.
 *   4. Renders the documented "coming soon" placeholder when the
 *      flag is `'live'` but the queue's full UI is reserved.
 *   5. Does not call `axios` or `fetch(` directly (cross-batch
 *      invariant from `scripts/phase7-lint-invariants.mjs`).
 *   6. Routes through `<ReviewReportsRouteHandoff />` which
 *      delegates to `<ReviewReportsPage />`.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SWRConfig } from 'swr';

import AdminReviewReportsPage from '../page';

// ─── Mock hooks ─────────────────────────────────────────────────────────────

const mockAddReviewModerationBreadcrumb = vi.hoisted(() => vi.fn());
const mockUseAdminFeatureFlag = vi.hoisted(() =>
  vi.fn((_flag?: unknown) => ({
    isLive: false,
    value: 'placeholder',
    isPlaceholder: true,
  })),
);

vi.mock('@/lib/admin/phase7_admin_sentry', () => ({
  addReviewModerationBreadcrumb: (input: unknown) =>
    mockAddReviewModerationBreadcrumb(input),
}));

vi.mock('@/features/admin/hooks/useAdminFeatureFlag', () => ({
  useAdminFeatureFlag: (flag?: unknown) => mockUseAdminFeatureFlag(flag),
}));

vi.mock('@/features/admin/hooks', () => ({
  useAdminFeatureFlag: (flag?: unknown) => mockUseAdminFeatureFlag(flag),
}));

// Mock `next/navigation` so `useReviewReports` (rendered by the
// full `ReviewReportsPage` composition) can read URL state without
// a router being mounted. The mock is minimal: every URL is
// equivalent to "no search params", which matches the queue's
// default filter (`pending`).
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: vi.fn(),
    push: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/admin/reviews/reports',
}));

// Mock the review-moderation service so the queue does not fire
// a real HTTP request when SWR's default fallback fetcher mounts.
// The full `ReviewReportsPage` test exercises the live branch only
// for header/list rendering; the queue's behaviour is covered by
// `useReviewReports` and `ReviewReportsList` specs.
vi.mock('@/features/admin/services/review-moderation.service', () => ({
  listReviewReports: vi.fn(async () => ({
    data: [],
    meta: { pagination: { kind: 'cursor', limit: 20, nextCursor: null, hasNextPage: false } },
  })),
  patchReviewReport: vi.fn(),
}));

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('AdminReviewReportsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAdminFeatureFlag.mockReturnValue({
      isLive: false,
      value: 'placeholder',
      isPlaceholder: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function renderPage() {
    return render(
      <SWRConfig value={{ provider: () => new Map() }}>
        <AdminReviewReportsPage />
      </SWRConfig>,
    );
  }

  it('emits a review.moderation.mount breadcrumb on mount', () => {
    renderPage();
    expect(mockAddReviewModerationBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'review.moderation.mount',
        route: 'admin-review-moderation.page',
        status: 'started',
      }),
    );
  });

  it('renders the documented disabled notice when the flag is placeholder', () => {
    renderPage();
    expect(
      screen.getByText(/Review moderation coming soon/i),
    ).toBeInTheDocument();
  });

  it('renders the documented page when the flag is live', () => {
    mockUseAdminFeatureFlag.mockReturnValue({
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

  it('reads the phase7_admin_review_moderation flag', () => {
    renderPage();
    expect(mockUseAdminFeatureFlag).toHaveBeenCalledWith(
      'phase7_admin_review_moderation',
    );
  });

  it('route file source contains no axios or fetch() calls', () => {
    const source = readFileSync(
      resolve(__dirname, '..', 'page.tsx'),
      'utf-8',
    );
    expect(source).not.toMatch(/from\s+['"]axios['"]/);
    expect(source).not.toMatch(/(?:^|[^.\w])fetch\s*\(/);
  });

  it('handoff file source contains no axios or fetch() calls', () => {
    const source = readFileSync(
      resolve(__dirname, '..', '_components', 'ReviewReportsRouteHandoff.tsx'),
      'utf-8',
    );
    expect(source).not.toMatch(/from\s+['"]axios['"]/);
    expect(source).not.toMatch(/(?:^|[^.\w])fetch\s*\(/);
  });

  it('handoff file delegates to ReviewReportsPage via the documented import', () => {
    const source = readFileSync(
      resolve(__dirname, '..', '_components', 'ReviewReportsRouteHandoff.tsx'),
      'utf-8',
    );
    expect(source).toMatch(/ReviewReportsPage/);
    expect(source).toMatch(/return\s+<ReviewReportsPage\s*\/>/);
  });
});