/**
 * `app/admin/comments/reports/__tests__/page.spec.tsx`
 *
 * Source epic:   Epic 7.6 — Comment Moderation (Hide, Restore, and Report Queue).
 * Source tickets: TKT-7.6.A3 (initial breadcrumb + disabled notice)
 *   + TKT-7.6.F2 (route-level wiring delegates to `CommentReportsPage`).
 *
 * Validates that the `/admin/comments/reports` route file:
 *   1. Renders without crashing.
 *   2. Emits a `comment.moderation.mount` breadcrumb on mount
 *      (A3 + F2 — documented stable string).
 *   3. Renders the documented disabled notice when the
 *      `admin_comment_moderation_live` flag is `'placeholder'`
 *      (flag gate moved into `CommentReportsPage` via TKT-7.6.F1).
 *   4. Renders the documented full page composition (`<CommentReportsPage />`)
 *      when the flag is `'enabled'` (F2 supersedes the A3 "coming soon"
 *      placeholder).
 *   5. Does not call `axios` or `fetch(` directly (cross-batch
 *      invariant from `scripts/admin-lint-invariants.mjs`).
 *   6. Routes through `<CommentReportsRouteHandoff />` which
 *      delegates to `<CommentReportsPage />`.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SWRConfig } from 'swr';

import AdminCommentReportsPage from '../page';

// ─── Mock hooks ─────────────────────────────────────────────────────────────

const mockAddCommentModerationBreadcrumb = vi.hoisted(() => vi.fn());
const mockUseAdminFeatureFlag = vi.hoisted(() =>
  vi.fn((flag: unknown) => {
    // Reference the argument so the linter does not flag it as
    // unused. The mock returns a constant for every input.
    void flag;
    return {
      isLive: false,
      value: 'placeholder',
      isPlaceholder: true,
    };
  }),
);

vi.mock('@/lib/admin/admin_live_sentry', () => ({
  addCommentModerationBreadcrumb: (input: unknown) =>
    mockAddCommentModerationBreadcrumb(input),
}));

vi.mock('@/features/admin/hooks/useAdminFeatureFlag', () => ({
  useAdminFeatureFlag: (flag: unknown) => mockUseAdminFeatureFlag(flag),
}));

vi.mock('@/features/admin/hooks', () => ({
  useAdminFeatureFlag: (flag?: unknown) => mockUseAdminFeatureFlag(flag),
}));

// Mock `next/navigation` so `useCommentReports` (rendered by the
// full `CommentReportsPage` composition) can read URL state without
// a router being mounted.
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
  usePathname: () => '/admin/comments/reports',
}));

// Mock the comment-moderation service so the queue does not fire
// a real HTTP request when SWR's default fallback fetcher mounts.
// The full `CommentReportsPage` test exercises the live branch only
// for header/list rendering; the queue's behaviour is covered by
// `useCommentReports` and `CommentReportsList` specs.
vi.mock('@/features/admin/services/comment-moderation.service', () => ({
  listCommentReports: vi.fn(async () => ({
    items: [],
    hasNextPage: false,
    nextCursor: null,
  })),
  patchCommentReport: vi.fn(),
  hideComment: vi.fn(),
  restoreComment: vi.fn(),
}));

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('AdminCommentReportsPage', () => {
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
        <AdminCommentReportsPage />
      </SWRConfig>,
    );
  }

  it('emits a comment.moderation.mount breadcrumb on mount', () => {
    renderPage();
    expect(mockAddCommentModerationBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'comment.moderation.mount',
        route: 'admin-comment-moderation.page',
        status: 'started',
      }),
    );
  });

  it('renders the documented "coming soon" notice when the flag is placeholder', () => {
    renderPage();
    expect(
      screen.getByText(/Comment moderation coming soon/i),
    ).toBeInTheDocument();
  });

  it('renders the documented full page composition (header + list) when the flag is enabled', () => {
    mockUseAdminFeatureFlag.mockReturnValue({
      isLive: true,
      value: 'enabled',
      isPlaceholder: false,
    });
    renderPage();
    expect(
      screen.getByRole('heading', { name: /Comment moderation/i, level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('comment-reports-list')).toBeInTheDocument();
  });

  it('reads the admin_comment_moderation_live flag', () => {
    renderPage();
    expect(mockUseAdminFeatureFlag).toHaveBeenCalledWith(
      'admin_comment_moderation_live',
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
      resolve(__dirname, '..', '_components', 'CommentReportsRouteHandoff.tsx'),
      'utf-8',
    );
    expect(source).not.toMatch(/from\s+['"]axios['"]/);
    expect(source).not.toMatch(/(?:^|[^.\w])fetch\s*\(/);
  });

  it('route file delegates to CommentReportsRouteHandoff via the documented import', () => {
    const source = readFileSync(
      resolve(__dirname, '..', 'page.tsx'),
      'utf-8',
    );
    expect(source).toMatch(/CommentReportsRouteHandoff/);
    expect(source).toMatch(/return\s+<CommentReportsRouteHandoff\s*\/>/);
  });

  it('handoff file delegates to CommentReportsPage via the documented import', () => {
    const source = readFileSync(
      resolve(__dirname, '..', '_components', 'CommentReportsRouteHandoff.tsx'),
      'utf-8',
    );
    expect(source).toMatch(/CommentReportsPage/);
    expect(source).toMatch(/return\s+<CommentReportsPage\s*\/>/);
  });
});