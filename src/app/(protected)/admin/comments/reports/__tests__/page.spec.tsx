

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SWRConfig } from 'swr';

import AdminCommentReportsPage from '../page';

const mockAddCommentModerationBreadcrumb = vi.hoisted(() => vi.fn());
const mockUseAdminFeatureFlag = vi.hoisted(() =>
vi.fn((flag: unknown) => {

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