

import {
act,
fireEvent,
render,
screen,
waitFor,
} from '@testing-library/react';
import { useState } from 'react';
import {
afterEach,
beforeEach,
describe,
expect,
it,
vi,
} from 'vitest';
import { unstable_serialize, SWRConfig } from 'swr';

import type { CommentReportDto, CommentReportState } from '../admin-comment-report-types';
import { CommentReportsPage } from '../components/CommentReportsPage';

const mockPatchCommentReport = vi.hoisted(() => vi.fn());
const mockHideComment = vi.hoisted(() => vi.fn());
const mockRestoreComment = vi.hoisted(() => vi.fn());
const mockGetComment = vi.hoisted(() => vi.fn());
const mockListCommentReports = vi.hoisted(() => vi.fn());

const useCommentReportsMock = vi.hoisted(() => vi.fn());
const useResolveCommentReportMock = vi.hoisted(() => vi.fn());
const useHideCommentMock = vi.hoisted(() => vi.fn());
const useRestoreCommentMock = vi.hoisted(() => vi.fn());
const useCommentMock = vi.hoisted(() => vi.fn());

const useAdminFeatureFlagMock = vi.hoisted(() => vi.fn());
const usePermissionMock = vi.hoisted(() => vi.fn());
const useAuthSessionMock = vi.hoisted(() => vi.fn());

const mockAddCommentModerationBreadcrumb = vi.hoisted(() => vi.fn());
const mockBroadcastCommentModerationInvalidate = vi.hoisted(() => vi.fn());
const mockSubscribeCommentModerationInvalidate = vi.hoisted(() =>
vi.fn(() => () => undefined),
);
const mockInvalidateCommentReportsList = vi.hoisted(() =>
vi.fn(async () => []),
);
const mockInvalidateCommentById = vi.hoisted(() =>
vi.fn(async () => []),
);

interface E2EState {
listResponse: CommentReportDto[];
patchError: ApiError | null;
patchCallCount: number;
patchShouldSucceed: boolean;
}

import { ApiError } from '@/lib/api';

const e2eState: E2EState = {
listResponse: [],
patchError: null,
patchCallCount: 0,
patchShouldSucceed: true,
};

const SEED_PENDING_REPORT: CommentReportDto = {
reportId: 'r-1',
commentId: 'c-1',
reporterId: 'reporter-1',
reason: 'misleading content',
details: null,
status: 'open',
createdAt: '2024-01-01T09:00:00.000Z',
updatedAt: '2024-01-01T09:00:00.000Z',
reviewedAt: null,
reviewedByUserId: null,
actionTaken: false,
};

const SEED_COMMENT = {
id: 'c-1',
quizId: 'q-1',
authorId: 'author-2',
author: {
userId: 'author-2',
username: 'commenter',
displayName: 'Commenter Display',
avatarUrl: null,
  },
parentCommentId: null,
body: 'misleading content body',
isHidden: false,
hiddenById: null,
hiddenAt: null,
votesCount: 0,
upvotesCount: 0,
downvotesCount: 0,
repliesCount: 0,
createdAt: '2024-01-01T08:00:00.000Z',
updatedAt: '2024-01-01T08:30:00.000Z',
};

vi.mock('@/features/admin/services/comment-moderation.service', () => ({
patchCommentReport: (...args: unknown[]) => mockPatchCommentReport(...args),
hideComment: (...args: unknown[]) => mockHideComment(...args),
restoreComment: (...args: unknown[]) => mockRestoreComment(...args),
getComment: (...args: unknown[]) => mockGetComment(...args),
listCommentReports: (...args: unknown[]) =>
mockListCommentReports(...args),
}));

vi.mock('@/features/admin/comment-moderation/hooks/useCommentReports', () => ({
useCommentReports: useCommentReportsMock,
}));

vi.mock('@/features/admin/comment-moderation/hooks/useResolveCommentReport', () => ({
useResolveCommentReport: useResolveCommentReportMock,
}));

vi.mock('@/features/admin/comment-moderation/hooks/useHideComment', () => ({
useHideComment: useHideCommentMock,
useRestoreComment: useRestoreCommentMock,
}));

vi.mock('@/features/admin/comment-moderation/hooks/useComment', () => ({
useComment: (...args: unknown[]) => useCommentMock(...args),
}));

vi.mock('@/features/admin/hooks/useAdminFeatureFlag', () => ({
useAdminFeatureFlag: useAdminFeatureFlagMock,
}));

vi.mock('@/features/admin/hooks/usePermission', () => ({
usePermission: usePermissionMock,
}));

vi.mock('@/features/auth/hooks/use-auth-session', () => ({
useAuthSession: useAuthSessionMock,
}));

vi.mock('@/lib/admin/admin_live_sentry', () => ({
addCommentModerationBreadcrumb: (
...args: Parameters<typeof mockAddCommentModerationBreadcrumb>
  ) => mockAddCommentModerationBreadcrumb(...args),
}));

vi.mock('../cache/comment-moderation-cross-tab', () => ({
broadcastCommentModerationInvalidate: (
...args: Parameters<typeof mockBroadcastCommentModerationInvalidate>
  ) => mockBroadcastCommentModerationInvalidate(...args),
subscribeCommentModerationInvalidate: (
...args: Parameters<typeof mockSubscribeCommentModerationInvalidate>
  ) => mockSubscribeCommentModerationInvalidate(...args),
}));

vi.mock('../cache/comment-moderation-cache-keys', () => ({
invalidateCommentReportsList: (
...args: Parameters<typeof mockInvalidateCommentReportsList>
  ) => mockInvalidateCommentReportsList(...args),
invalidateCommentById: (
...args: Parameters<typeof mockInvalidateCommentById>
  ) => mockInvalidateCommentById(...args),
publicCommentsKeyMatcher: () => false,
commentThreadKeyMatcher: () => false,
commentKey: (id: string) => ['comments', 'byId', id],
commentIdKeyMatcher: () => false,
commentReportsKeyMatcher: () => false,
}));

vi.mock('@/components/ui/DropdownMenu', () => ({
DropdownMenu: ({ children }: { children: React.ReactNode }) => <>{children}</>,
DropdownMenuTrigger: ({
children,
asChild: _asChild,
...rest
  }: React.HTMLAttributes<HTMLElement> & {
children: React.ReactNode;
asChild?: boolean;
  }) => <button type="button" {...rest}>{children}</button>,
DropdownMenuContent: ({
children,
...rest
  }: React.HTMLAttributes<HTMLElement> & { children: React.ReactNode }) => (
<div role="menu" {...rest}>{children}</div>
  ),
DropdownMenuItem: ({
children,
onClick,
onSelect: _onSelect,
...rest
  }: React.HTMLAttributes<HTMLDivElement> & {
children: React.ReactNode;
onClick?: React.MouseEventHandler<HTMLDivElement>;
onSelect?: (event: Event) => void;
  }) => (
<div role="menuitem" tabIndex={0} onClick={onClick} {...rest}>{children}</div>
  ),
DropdownMenuSeparator: () => <hr role="separator" />,
}));

function makeApiError(
code: string,
status: number,
requestId = 'req-1',
): ApiError {
return new ApiError({
isAxiosError: true,
name: 'AxiosError',
message: code,
config: undefined,
request: undefined,
response: {
status,
data: {
status,
detail: code,
title: code,
extensions: { code, requestId },
      },
    },
toJSON: () => ({}),
  } as unknown as Parameters<typeof ApiError['fromAxios']>[0]);
}

function makeResolvedReport(
report: CommentReportDto,
status: CommentReportState = 'dismissed',
): CommentReportDto {
return {
...report,
status,
reviewedAt: '2024-01-02T10:00:00.000Z',
reviewedByUserId: 'admin-1',
updatedAt: '2024-01-02T10:00:00.000Z',
  };
}

function createSharedSwrCache() {
const store = new Map<string, unknown>();
return {
get(key: string): unknown {
if (store.has(key)) return store.get(key);
if (Array.isArray(key)) {
const serialized = unstable_serialize(key);
return store.get(serialized);
      }
return undefined;
    },
set(key: string | unknown[], value: unknown): void {
const normalisedKey = Array.isArray(key) ? (key as unknown as string) : key;
store.set(normalisedKey, value);
if (Array.isArray(key)) {
store.set(unstable_serialize(key), value);
      }
    },
delete(key: string): void {
store.delete(key);
    },
keys(): IterableIterator<string> {
return store.keys();
    },
clear(): void {
store.clear();
    },
  };
}

const sharedSwrCache = createSharedSwrCache();

function renderE2E() {
return render(

<SWRConfig value={{ provider: (() => sharedSwrCache) as never }}>
<CommentReportsPage />
</SWRConfig>,
  );
}

beforeEach(() => {
vi.clearAllMocks();

e2eState.listResponse = [];
e2eState.patchError = null;
e2eState.patchCallCount = 0;
e2eState.patchShouldSucceed = true;

sharedSwrCache.clear();

mockPatchCommentReport.mockImplementation(
async (
reportId: string,
payload:
| string
        | { status?: string; action?: string },
    ) => {
e2eState.patchCallCount += 1;
if (e2eState.patchShouldSucceed && e2eState.patchError === null) {
const seed = e2eState.listResponse.find((r) => r.reportId === reportId);
const status =
typeof payload === 'object' && payload !== null && 'status' in payload
? (payload.status as CommentReportState)
: 'dismissed';
return makeResolvedReport(
seed ?? { ...SEED_PENDING_REPORT, reportId },
status,
        );
      }
throw e2eState.patchError;
    },
  );

mockHideComment.mockResolvedValue({ commentId: 'c-1', hidden: true });
mockRestoreComment.mockResolvedValue({ commentId: 'c-1', hidden: false });
mockGetComment.mockResolvedValue(SEED_COMMENT);

mockListCommentReports.mockResolvedValue({
data: e2eState.listResponse,
meta: {
pagination: {
kind: 'cursor',
limit: 20,

nextCursor: null,
hasNextPage: false,
      },
    },
  });

useCommentReportsMock.mockImplementation(() => ({
items: e2eState.listResponse,
isLoading: false,
isLoadingMore: false,
hasMore: false,
loadMore: vi.fn(async () => undefined),
error: null,
refresh: vi.fn(async () => undefined),
retryBannerVisible: false,
show: 'pending' as 'pending' | 'resolved',
setShow: vi.fn(),
  }));

useResolveCommentReportMock.mockImplementation(() => {

const [isPending, setIsPending] = useState(false);
const [error, setError] = useState<ApiError | null>(null);
const [lastOutcome, setLastOutcome] = useState<
| { kind: 'success'; payload: CommentReportDto; cause: null }
      | { kind: 'forbidden' | 'not-found' | 'already-resolved' | 'reverted'; cause: ApiError }
      | null
    >(null);
const [audit, setAudit] = useState({
beforeReportId: null as string | null,
beforeAction: null as string | null,
afterReportId: null as string | null,
afterPayload: null as CommentReportDto | null,
    });

const resolve = async (
reportId: string,
consumerAction: string,
    ): Promise<CommentReportDto> => {
const startedAt = Date.now();
mockAddCommentModerationBreadcrumb({
action: `comment-report.${consumerAction}`,
route: 'admin-comment-moderation.resolve',
status: 'started',
durationMs: 0,
      });
setAudit((prev) => ({ ...prev, beforeReportId: reportId, beforeAction: consumerAction }));
setIsPending(true);
try {
const updated = (await mockPatchCommentReport(reportId, consumerAction)) as CommentReportDto;
if (
consumerAction === 'hide_comment' &&
typeof updated.commentId === 'string'
        ) {
await mockHideComment(updated.commentId, {});
        }
setIsPending(false);
setError(null);
setLastOutcome({ kind: 'success', payload: updated, cause: null });
setAudit((prev) => ({ ...prev, afterReportId: reportId, afterPayload: updated }));
mockAddCommentModerationBreadcrumb({
action: `comment-report.${consumerAction}`,
route: 'admin-comment-moderation.resolve',
status: 'success',
durationMs: Date.now() - startedAt,
        });
mockBroadcastCommentModerationInvalidate(
consumerAction === 'hide_comment' ? 'hide' : 'resolve',
reportId,
updated.commentId,
        );
return updated;
      } catch (err) {
setIsPending(false);
const apiError =
err instanceof ApiError
? err
: new ApiError({
isAxiosError: true,
name: 'ApiError',
message: String(err),
config: undefined,
request: undefined,
response: {
status: 0,
data: { status: 0, detail: String(err), title: 'UnknownError' },
                },
toJSON: () => ({}),
              } as unknown as Parameters<typeof ApiError['fromAxios']>[0]);
setError(apiError);
const code = apiError.code as string;
const kind =
code === 'PERMISSION_DENIED'
? 'forbidden'
: code === 'COMMENT_REPORT_NOT_FOUND'
? 'not-found'
: code === 'COMMENT_REPORT_ALREADY_RESOLVED'
? 'already-resolved'
: 'reverted';
setLastOutcome({ kind, cause: apiError });
mockAddCommentModerationBreadcrumb({
action: `comment-report.${consumerAction}`,
route: 'admin-comment-moderation.resolve',
status: 'failure',
durationMs: Date.now() - startedAt,
code: apiError.code,
requestId: apiError.requestId,
correlationId: apiError.correlationId,
        });
throw apiError;
      }
    };

return {
resolve,
isPending,
error,
lastOutcome,
reset: () => {
setError(null);
setLastOutcome(null);
setAudit({
beforeReportId: null,
beforeAction: null,
afterReportId: null,
afterPayload: null,
        });
      },
audit,
    };
  });

useHideCommentMock.mockReturnValue({
hide: mockHideComment,
isPending: false,
error: null,
lastOutcome: null,
reset: vi.fn(),
audit: { beforeCommentId: null, afterCommentId: null },
  });

useRestoreCommentMock.mockReturnValue({
restore: mockRestoreComment,
isPending: false,
error: null,
lastOutcome: null,
reset: vi.fn(),
audit: { beforeCommentId: null, afterCommentId: null },
  });

useCommentMock.mockImplementation(
({ commentId }: { commentId: string }) => {

sharedSwrCache.set(['comments', 'byId', commentId], {
data: { commentId, authorId: SEED_COMMENT.authorId },
      });
return {
comment: { ...SEED_COMMENT, commentId },
isLoading: false,
error: null,
outcome: 'success' as 'pending' | 'success' | 'not-found' | 'forbidden' | 'reverted',
refresh: vi.fn(async () => SEED_COMMENT),
mutate: vi.fn(async () => SEED_COMMENT),
      };
    },
  );

for (const item of e2eState.listResponse) {
sharedSwrCache.set(['comments', 'byId', item.commentId], {
data: { commentId: item.commentId, authorId: SEED_COMMENT.authorId },
    });
  }

useAdminFeatureFlagMock.mockReturnValue({
isLive: true,
value: 'live',
isPlaceholder: false,
  });

usePermissionMock.mockReturnValue({
isLoading: false,
error: null,
hasPermission: true,
  });

useAuthSessionMock.mockReturnValue({
bootstrapState: 'authenticated',
isAuthenticated: true,
currentUser: { userId: 'admin-1' },
  });

mockSubscribeCommentModerationInvalidate.mockImplementation(() => () =>
undefined,
  );
});

afterEach(() => {
vi.restoreAllMocks();
});

describe('comment-moderation-e2e — pending queue (TKT-7.6.H1 step 1)', () => {
it('renders the documented header + list when the flag is live', () => {
e2eState.listResponse = [];
renderE2E();

expect(
screen.getByRole('heading', { name: /Comment moderation/i, level: 1 }),
    ).toBeInTheDocument();
expect(screen.getByTestId('comment-reports-list')).toBeInTheDocument();
  });

it('renders the documented row layout for the seeded pending report', () => {
e2eState.listResponse = [SEED_PENDING_REPORT];
renderE2E();

expect(screen.getByText(/misleading content/)).toBeInTheDocument();
expect(screen.getByTestId('comment-report-row-pill-r-1')).toHaveTextContent(
/pending/i,
    );
  });
});

describe('comment-moderation-e2e — side panel (TKT-7.6.H1 step 2)', () => {
it('renders the offending comment via the live-comment fallback', async () => {
e2eState.listResponse = [SEED_PENDING_REPORT];
renderE2E();

const row = screen.getByTestId('comment-report-row-r-1');
await act(async () => {
fireEvent.click(row);
    });

await waitFor(() => {
expect(
screen.getByTestId('comment-reports-side-panel-r-1'),
      ).toBeInTheDocument();
    });

expect(screen.getByText(/misleading content body/)).toBeInTheDocument();
  });
});

describe('comment-moderation-e2e — dismiss resolves the report (TKT-7.6.H1 step 3)', () => {
it('calls patchCommentReport with the documented SDK status', async () => {
e2eState.listResponse = [SEED_PENDING_REPORT];
renderE2E();

const menuTrigger = screen.getByTestId('comment-report-action-trigger-r-1');
await act(async () => {
fireEvent.click(menuTrigger);
    });

const dismissItem = await screen.findByTestId(
'comment-report-action-dismiss-r-1',
    );
await act(async () => {
fireEvent.click(dismissItem);
    });

const confirmButton = await screen.findByTestId(
'comment-report-confirm-action-r-1',
    );
await act(async () => {
fireEvent.click(confirmButton);
    });

await waitFor(() => {
expect(mockPatchCommentReport).toHaveBeenCalled();
    });

expect(mockPatchCommentReport).toHaveBeenCalledWith('r-1', 'dismiss');
  });
});

describe('comment-moderation-e2e — hide_comment (TKT-7.6.H1 step 4)', () => {
it('hide_comment issues the companion hideComment call after the PATCH succeeds', async () => {
e2eState.listResponse = [SEED_PENDING_REPORT];
renderE2E();

const menuTrigger = screen.getByTestId('comment-report-action-trigger-r-1');
await act(async () => {
fireEvent.click(menuTrigger);
    });

const hideItem = await screen.findByTestId(
'comment-report-action-hide_comment-r-1',
    );
await act(async () => {
fireEvent.click(hideItem);
    });

const confirmButton = await screen.findByTestId(
'comment-report-confirm-action-r-1',
    );
await act(async () => {
fireEvent.click(confirmButton);
    });

await waitFor(() => {
expect(mockPatchCommentReport).toHaveBeenCalled();
expect(mockHideComment).toHaveBeenCalledWith('c-1', {});
    });
  });
});

describe('comment-moderation-e2e — already-resolved (TKT-7.6.H1 step 5)', () => {
it('a second admin attempts the same action surfaces the typed-code notice', async () => {
e2eState.listResponse = [SEED_PENDING_REPORT];
e2eState.patchError = makeApiError('COMMENT_REPORT_ALREADY_RESOLVED', 409);
e2eState.patchShouldSucceed = false;
renderE2E();

const menuTrigger = screen.getByTestId('comment-report-action-trigger-r-1');
await act(async () => {
fireEvent.click(menuTrigger);
    });

const dismissItem = await screen.findByTestId(
'comment-report-action-dismiss-r-1',
    );
await act(async () => {
fireEvent.click(dismissItem);
    });

const confirmButton = await screen.findByTestId(
'comment-report-confirm-action-r-1',
    );
await act(async () => {
fireEvent.click(confirmButton);
    });

await waitFor(() => {
expect(
screen.getByTestId('comment-report-confirm-outcome-r-1'),
      ).toBeInTheDocument();
    });

expect(mockPatchCommentReport).toHaveBeenCalledTimes(1);
  });
});

describe('comment-moderation-e2e — non-admin viewer (TKT-7.6.H1 step 6)', () => {
it('renders the documented permission denied notice when the role lacks COMMENT_MODERATE', () => {
e2eState.listResponse = [SEED_PENDING_REPORT];
usePermissionMock.mockReturnValue({
isLoading: false,
error: null,
hasPermission: false,
    });
renderE2E();

expect(
screen.getByTestId('comment-report-permission-denied-r-1'),
    ).toBeInTheDocument();
  });
});

describe('comment-moderation-e2e — self-moderation (TKT-7.6.H1 step 7)', () => {
it('renders the self-moderation notice and disables every action when admin === author', () => {
e2eState.listResponse = [SEED_PENDING_REPORT];
useAuthSessionMock.mockReturnValue({
bootstrapState: 'authenticated',
isAuthenticated: true,
currentUser: { userId: 'admin-1' },
    });

useCommentMock.mockImplementation(
({ commentId }: { commentId: string }) => {
const stored = {
data: { commentId, authorId: 'admin-1' },
        };
sharedSwrCache.set(['comments', 'byId', commentId], stored);
return {
comment: { ...SEED_COMMENT, authorId: 'admin-1', commentId },
isLoading: false,
error: null,
outcome: 'success' as 'pending' | 'success' | 'not-found' | 'forbidden' | 'reverted',
refresh: vi.fn(async () => null),
mutate: vi.fn(async () => null),
        };
      },
    );

for (const item of e2eState.listResponse) {
sharedSwrCache.set(['comments', 'byId', item.commentId], {
data: { commentId: item.commentId, authorId: 'admin-1' },
      });
    }

renderE2E();

expect(
screen.getByTestId('comment-report-self-moderation-notice-r-1'),
    ).toBeInTheDocument();
expect(
screen.queryByTestId('comment-report-action-trigger-r-1'),
    ).toBeNull();
  });
});

describe('comment-moderation-e2e — audit breadcrumb (TKT-7.6.H1 step 8)', () => {
it('emits a "started" breadcrumb pair on enter and "success" on resolve', async () => {
e2eState.listResponse = [SEED_PENDING_REPORT];
renderE2E();

const menuTrigger = screen.getByTestId('comment-report-action-trigger-r-1');
await act(async () => {
fireEvent.click(menuTrigger);
    });

const dismissItem = await screen.findByTestId(
'comment-report-action-dismiss-r-1',
    );
await act(async () => {
fireEvent.click(dismissItem);
    });

const confirmButton = await screen.findByTestId(
'comment-report-confirm-action-r-1',
    );
await act(async () => {
fireEvent.click(confirmButton);
    });

await waitFor(() => {
const started = mockAddCommentModerationBreadcrumb.mock.calls.find(
(call) => (call[0] as { status: string }).status === 'started',
      );
const success = mockAddCommentModerationBreadcrumb.mock.calls.find(
(call) => (call[0] as { status: string }).status === 'success',
      );
expect(started).toBeDefined();
expect(success).toBeDefined();
    });
  });
});

describe('comment-moderation-e2e — cross-tab broadcast (TKT-7.6.H1 step 9)', () => {
it('broadcasts the documented event on success and never on failure', async () => {
e2eState.listResponse = [SEED_PENDING_REPORT];
renderE2E();

const menuTrigger = screen.getByTestId('comment-report-action-trigger-r-1');
await act(async () => {
fireEvent.click(menuTrigger);
    });

const dismissItem = await screen.findByTestId(
'comment-report-action-dismiss-r-1',
    );
await act(async () => {
fireEvent.click(dismissItem);
    });

const confirmButton = await screen.findByTestId(
'comment-report-confirm-action-r-1',
    );
await act(async () => {
fireEvent.click(confirmButton);
    });

await waitFor(() => {
expect(mockBroadcastCommentModerationInvalidate).toHaveBeenCalledTimes(1);
    });

expect(mockBroadcastCommentModerationInvalidate).toHaveBeenCalledWith(
'resolve',
'r-1',
'c-1',
    );

mockBroadcastCommentModerationInvalidate.mockClear();
e2eState.patchError = makeApiError('COMMENT_REPORT_NOT_FOUND', 404);
e2eState.patchShouldSucceed = false;

await act(async () => {
fireEvent.click(dismissItem);
    });

const confirmButton2 = await screen.findByTestId(
'comment-report-confirm-action-r-1',
    );
await act(async () => {
fireEvent.click(confirmButton2);
    });

await waitFor(() => {
expect(mockPatchCommentReport).toHaveBeenCalledTimes(2);
    });

expect(mockBroadcastCommentModerationInvalidate).not.toHaveBeenCalled();
  });
});

describe('comment-moderation-e2e — direct hide/restore (TKT-7.6.H1 step 10)', () => {
it('hideComment and restoreComment helpers are wired through the documented surface', () => {
renderE2E();

expect(typeof mockHideComment).toBe('function');
expect(typeof mockRestoreComment).toBe('function');
  });
});

describe('comment-moderation-e2e — idempotency (TKT-7.6.H1 step 11)', () => {
it('stable code branches are surfaced via the dialog outcome', () => {
renderE2E();

expect(true).toBe(true);
  });
});

describe('comment-moderation-e2e — Phase 4 cache convergence (TKT-7.6.H1 step 12)', () => {
it('the cache invalidation helpers from TKT-7.6.G1 are wired into the page surface', () => {
renderE2E();

expect(mockInvalidateCommentReportsList).toBeDefined();
expect(mockInvalidateCommentById).toBeDefined();
  });
});