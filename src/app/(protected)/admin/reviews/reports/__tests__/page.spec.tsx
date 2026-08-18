

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SWRConfig } from 'swr';

import AdminReviewReportsPage from '../page';

const mockAddReviewModerationBreadcrumb = vi.hoisted(() => vi.fn());
const mockUseAdminFeatureFlag = vi.hoisted(() =>
vi.fn((_flag?: unknown) => ({
isLive: false,
value: 'placeholder',
isPlaceholder: true,
  })),
);

vi.mock('@/lib/admin/admin_live_sentry', () => ({
addReviewModerationBreadcrumb: (input: unknown) =>
mockAddReviewModerationBreadcrumb(input),
}));

vi.mock('@/features/admin/hooks/useAdminFeatureFlag', () => ({
useAdminFeatureFlag: (flag?: unknown) => mockUseAdminFeatureFlag(flag),
}));

vi.mock('@/features/admin/hooks', () => ({
useAdminFeatureFlag: (flag?: unknown) => mockUseAdminFeatureFlag(flag),
}));

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

vi.mock('@/features/admin/services/review-moderation.service', () => ({
listReviewReports: vi.fn(async () => ({
data: [],
meta: { pagination: { kind: 'cursor', limit: 20, nextCursor: null, hasNextPage: false } },
  })),
patchReviewReport: vi.fn(),
}));

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

it('reads the admin_review_moderation_live flag', () => {
renderPage();
expect(mockUseAdminFeatureFlag).toHaveBeenCalledWith(
'admin_review_moderation_live',
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