/**
 * `app/admin/reviews/reports/__tests__/page.spec.tsx`
 *
 * Source epic:   Epic 7.5.
 * Source ticket: TKT-7.5.A3.
 *
 * Validates that the `/admin/reviews/reports` route file:
 *   1. Renders without crashing.
 *   2. Emits a `review.reports.mount` breadcrumb on mount.
 *   3. Renders the documented disabled notice when the
 *      `phase7_admin_review_moderation` flag is `'placeholder'`.
 *   4. Renders the documented "coming soon" placeholder when the flag
 *      is `'live'` (the queue body arrives in Batches C–F).
 *   5. Does not call `axios` or `fetch(` directly (cross-batch
 *      invariant from `scripts/phase7-lint-invariants.mjs`).
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

  it('emits a review.reports.mount breadcrumb on mount', () => {
    renderPage();
    expect(mockAddReviewModerationBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'review.reports.mount',
        route: 'review-reports.page',
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

  it('renders the queue-reserved placeholder when the flag is live', () => {
    mockUseAdminFeatureFlag.mockReturnValue({
      isLive: true,
      value: 'live',
      isPlaceholder: false,
    });
    renderPage();
    expect(
      screen.getByText(/^The review moderation queue is reserved/i),
    ).toBeInTheDocument();
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
    expect(source).not.toMatch(/\bfetch\(/);
  });
});
