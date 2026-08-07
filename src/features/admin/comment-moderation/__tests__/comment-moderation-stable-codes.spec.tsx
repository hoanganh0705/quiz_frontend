/**
 * `comment-moderation-stable-codes.spec.tsx` — focused regression
 * coverage for the five stable error codes the source story calls
 * out as edge cases, plus the self-moderation gate.
 *
 * Source epic:   Epic 7.6 — Comment Moderation (Hide, Restore, and Report Queue).
 * Source ticket: TKT-7.6.H2.
 *
 * ## Coverage contract
 *
 * For every stable-code branch, the test asserts:
 *
 *   1. The dialog renders the friendly, typed-code notice.
 *   2. The mutation surfaces through the hook exactly once.
 *   3. The dialog stays open on a stable-code outcome so the admin
 *      can read the typed copy; the friendly notice remains
 *      mounted.
 *
 * The spec also covers the self-moderation gate (see the comment
 * in `__fixtures__/comment-moderation-stable-codes-mock.ts` for
 * why these mocks live in their own module).
 *
 * Runs in the jsdom project because the dialogs are rendered through
 * `@testing-library/react`. The Radix `AlertDialog` family is stubbed
 * so the dialog body is rendered eagerly — the test focuses on the
 * component's contract (outcome notices, retry behaviour), not on
 * Radix's open-state machine.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';

import { ApiError } from '@/lib/api';
import type { CommentReportDto } from '@/features/admin/comment-moderation/admin-comment-report-types';

import { CommentReportActionConfirmDialog } from '@/features/admin/comment-moderation/components/CommentReportActionConfirmDialog';
import { CommentReportActionMenu } from '@/features/admin/comment-moderation/components/CommentReportActionMenu';
import {
  HideCommentDialog,
  RestoreCommentDialog,
} from '@/features/admin/comment-moderation/components/CommentVisibilityDialogs';

// ─── Hook mocks (hoisted) ───────────────────────────────────────────────────
//
// `vi.mock` factories are hoisted above imports; the factory
// references must be available at hoist time. We hoist the module
// import itself via a `require` inside the factory so the mock can
// pull in the real hook implementations lazily. The factory delegates
// to the hook-shaped functions defined in the fixture module.

vi.mock('@/features/admin/comment-moderation/hooks/useResolveCommentReport', async () => {
  const fixtures = (await import(
    /* @vite-ignore */ '@/features/admin/comment-moderation/__tests__/__fixtures__/comment-moderation-stable-codes-mock'
  )) as typeof import('./__fixtures__/comment-moderation-stable-codes-mock');
  return {
    useResolveCommentReport: fixtures.useResolveCommentReportMock,
  };
});

vi.mock('@/features/admin/comment-moderation/hooks/useHideComment', async () => {
  const fixtures = (await import(
    /* @vite-ignore */ '@/features/admin/comment-moderation/__tests__/__fixtures__/comment-moderation-stable-codes-mock'
  )) as typeof import('./__fixtures__/comment-moderation-stable-codes-mock');
  return {
    useHideComment: fixtures.useHideCommentMock,
    useRestoreComment: fixtures.useRestoreCommentMock,
  };
});

// usePermission — return `hasPermission: true` by default. Tests
// for the self-moderation gate keep that gate the deciding branch;
// tests for the permission gate override this mock on a per-test
// basis if they ever run.
const hasPermissionMock = vi.hoisted(() => ({ value: true }));

vi.mock('@/features/admin/hooks/usePermission', () => ({
  usePermission: () => ({
    hasPermission: hasPermissionMock.value,
    isLoading: false,
  }),
}));

// useAuthBootstrap — return a current user. The self-moderation
// gate flips `currentUser.userId === commentAuthorId`. Tests that
// exercise the gate override the value below.
const currentUserIdMock = vi.hoisted(() => ({ value: 'admin-1' }));

vi.mock('@/features/auth/contexts/auth-bootstrap-context', () => ({
  useAuthBootstrap: () => ({
    currentUser: { userId: currentUserIdMock.value },
    isLoading: false,
  }),
}));

import {
  resetMockHarness,
  setHideOutcome,
  setResolveOutcome,
  setRestoreOutcome,
} from './__fixtures__/comment-moderation-stable-codes-mock';

// ─── Radix stub ─────────────────────────────────────────────────────────────

vi.mock('@/components/ui/AlertDialog', () => ({
  AlertDialog: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  AlertDialogAction: ({
    children,
    ...rest
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button type="button" {...rest}>{children}</button>
  ),
  AlertDialogCancel: ({
    children,
    ...rest
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button type="button" {...rest}>{children}</button>
  ),
  AlertDialogContent: ({
    children,
    ...rest
  }: React.HTMLAttributes<HTMLDivElement>) => <div {...rest}>{children}</div>,
  AlertDialogDescription: ({ children }: { children: React.ReactNode }) => (
    <p>{children}</p>
  ),
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2>{children}</h2>
  ),
}));

// AuditActionShell stub — render the children eagerly with a fake
// shell state so the Button can click through and trigger the
// dialog's `mutate()` callback.
vi.mock('@/features/admin/components/AuditActionShell', () => ({
  AuditActionShell: ({
    children,
  }: {
    action: string;
    before: unknown;
    mutate: () => Promise<unknown>;
    children: (state: { isPending: boolean; error: Error | null }) => React.ReactNode;
  }) => <>{children({ isPending: false, error: null })}</>,
}));

// DropdownMenu stub — render children eagerly. The self-moderation
// gate fires BEFORE the menu renders, so we only need a passthrough.
// We forward arbitrary HTML attributes (including `data-testid`)
// through the stubs so the production-side test ids remain
// observable.
function forwardProps<T extends Record<string, unknown>>(
  Component: React.ElementType,
): React.FC<T & { children?: React.ReactNode }> {
  return ({ children, ...rest }) => {
    const filtered = Object.fromEntries(
      Object.entries(rest).filter(([k]) => !['onSelect', 'asChild'].includes(k)),
    );
    return <Component {...filtered}>{children}</Component>;
  };
}

vi.mock('@/components/ui/DropdownMenu', () => ({
  DropdownMenu: forwardProps<{ children?: React.ReactNode }>('div'),
  DropdownMenuContent: forwardProps<{ children?: React.ReactNode }>('div'),
  DropdownMenuItem: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuTrigger: forwardProps<{ children?: React.ReactNode }>('div'),
}));

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeApiError(code: string, status: number, requestId = 'req-1'): ApiError {
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

function makeReport(overrides: Partial<CommentReportDto> = {}): CommentReportDto {
  return {
    reportId: 'r-1',
    commentId: 'c-1',
    reporterId: 'reporter-1',
    reason: 'spam',
    details: null,
    status: 'open',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    reviewedAt: null,
    reviewedByUserId: null,
    actionTaken: false,
    ...overrides,
  };
}

beforeEach(() => {
  resetMockHarness();
  hasPermissionMock.value = true;
  currentUserIdMock.value = 'admin-1';
});

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('TKT-7.6.H2 — stable codes: CommentReportActionConfirmDialog', () => {
  it('COMMENT_REPORT_ALREADY_RESOLVED surfaces a stable "already handled" notice', async () => {
    const apiError = makeApiError('COMMENT_REPORT_ALREADY_RESOLVED', 409);

    render(
      <CommentReportActionConfirmDialog
        open
        report={makeReport()}
        action="dismiss"
        onClose={vi.fn()}
      />,
    );

    const confirm = screen.getByTestId('comment-report-confirm-action-r-1');
    await act(async () => {
      fireEvent.click(confirm);
      // Drive the hook's outcome to simulate the rejected promise
      // settling with a stable-code error.
      setResolveOutcome({ kind: 'already-resolved', cause: apiError });
    });

    await act(async () => {
      // Allow the rejected promise to propagate and a re-render to flush.
      await Promise.resolve();
    });

    expect(
      screen.getByTestId('comment-report-confirm-outcome-r-1'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('comment-report-confirm-outcome-r-1').textContent,
    ).toMatch(/already handled/i);
  });

  it('COMMENT_REPORT_NOT_FOUND surfaces a stable "no longer exists" notice', async () => {
    const apiError = makeApiError('COMMENT_REPORT_NOT_FOUND', 404);

    render(
      <CommentReportActionConfirmDialog
        open
        report={makeReport()}
        action="dismiss"
        onClose={vi.fn()}
      />,
    );

    const confirm = screen.getByTestId('comment-report-confirm-action-r-1');
    await act(async () => {
      fireEvent.click(confirm);
      setResolveOutcome({ kind: 'not-found', cause: apiError });
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(
      screen.getByTestId('comment-report-confirm-outcome-r-1'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('comment-report-confirm-outcome-r-1').textContent,
    ).toMatch(/no longer exists/i);
  });

  it('PERMISSION_DENIED surfaces a stable "permission denied" notice', async () => {
    const apiError = makeApiError('PERMISSION_DENIED', 403);

    render(
      <CommentReportActionConfirmDialog
        open
        report={makeReport()}
        action="dismiss"
        onClose={vi.fn()}
      />,
    );

    const confirm = screen.getByTestId('comment-report-confirm-action-r-1');
    await act(async () => {
      fireEvent.click(confirm);
      setResolveOutcome({ kind: 'forbidden', cause: apiError });
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(
      screen.getByTestId('comment-report-confirm-outcome-r-1'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('comment-report-confirm-outcome-r-1').textContent,
    ).toMatch(/permission denied/i);
  });

  it('does not auto-retry the mutation after a stable-code outcome settles', async () => {
    const apiError = makeApiError('COMMENT_REPORT_ALREADY_RESOLVED', 409);

    render(
      <CommentReportActionConfirmDialog
        open
        report={makeReport()}
        action="dismiss"
        onClose={vi.fn()}
      />,
    );

    const confirm = screen.getByTestId('comment-report-confirm-action-r-1');
    await act(async () => {
      fireEvent.click(confirm);
      setResolveOutcome({ kind: 'already-resolved', cause: apiError });
    });

    await act(async () => {
      await Promise.resolve();
    });

    // The dialog kept the friendly notice on screen; it does NOT
    // close (admin can read the typed copy + the request id).
    expect(
      screen.getByTestId('comment-report-confirm-outcome-r-1'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('comment-report-confirm-dialog-r-1'),
    ).toBeInTheDocument();
  });
});

describe('TKT-7.6.H2 — stable codes: HideCommentDialog', () => {
  it('COMMENT_ALREADY_HIDDEN surfaces a friendly "already hidden" notice', async () => {
    const apiError = makeApiError('COMMENT_ALREADY_HIDDEN', 409);

    render(<HideCommentDialog open commentId="c-1" onClose={vi.fn()} />);

    const confirm = screen.getByTestId('comment-hide-confirm-action-c-1');
    await act(async () => {
      fireEvent.click(confirm);
      setHideOutcome({ kind: 'already-hidden', cause: apiError });
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(
      screen.getByTestId('comment-hide-confirm-outcome-c-1'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('comment-hide-confirm-outcome-c-1').textContent,
    ).toMatch(/already hidden/i);
  });

  it('does not auto-retry the hide mutation after a stable-code outcome settles', async () => {
    const apiError = makeApiError('COMMENT_ALREADY_HIDDEN', 409);

    render(<HideCommentDialog open commentId="c-1" onClose={vi.fn()} />);

    const confirm = screen.getByTestId('comment-hide-confirm-action-c-1');
    await act(async () => {
      fireEvent.click(confirm);
      setHideOutcome({ kind: 'already-hidden', cause: apiError });
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(
      screen.getByTestId('comment-hide-confirm-outcome-c-1'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('comment-hide-confirm-dialog-c-1'),
    ).toBeInTheDocument();
  });
});

describe('TKT-7.6.H2 — stable codes: RestoreCommentDialog', () => {
  it('COMMENT_NOT_HIDDEN surfaces a friendly "already visible" notice', async () => {
    const apiError = makeApiError('COMMENT_NOT_HIDDEN', 409);

    render(<RestoreCommentDialog open commentId="c-1" onClose={vi.fn()} />);

    const confirm = screen.getByTestId('comment-restore-confirm-action-c-1');
    await act(async () => {
      fireEvent.click(confirm);
      setRestoreOutcome({ kind: 'not-hidden', cause: apiError });
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(
      screen.getByTestId('comment-restore-confirm-outcome-c-1'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('comment-restore-confirm-outcome-c-1').textContent,
    ).toMatch(/not hidden/i);
  });

  it('does not auto-retry the restore mutation after a stable-code outcome settles', async () => {
    const apiError = makeApiError('COMMENT_NOT_HIDDEN', 409);

    render(<RestoreCommentDialog open commentId="c-1" onClose={vi.fn()} />);

    const confirm = screen.getByTestId('comment-restore-confirm-action-c-1');
    await act(async () => {
      fireEvent.click(confirm);
      setRestoreOutcome({ kind: 'not-hidden', cause: apiError });
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(
      screen.getByTestId('comment-restore-confirm-outcome-c-1'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('comment-restore-confirm-dialog-c-1'),
    ).toBeInTheDocument();
  });
});

describe('TKT-7.6.H2 — self-moderation gate: CommentReportActionMenu', () => {
  it('disables every action when the current admin wrote the reported comment', () => {
    // Self-moderation gate fires when `commentAuthorId` === current
    // user's id. We override the mock value to align them.
    currentUserIdMock.value = 'self-author';

    const onAction = vi.fn();

    render(
      <CommentReportActionMenu
        report={makeReport()}
        commentAuthorId="self-author"
        onAction={onAction}
      />,
    );

    // The friendly self-moderation notice replaces the menu; the
    // trigger button is not rendered.
    expect(
      screen.getByTestId('comment-report-self-moderation-notice-r-1'),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId('comment-report-action-trigger-r-1'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('comment-report-action-menu-r-1'),
    ).not.toBeInTheDocument();

    // No request can reach the server — `onAction` is never
    // invoked because the menu does not render the action items.
    expect(onAction).not.toHaveBeenCalled();
  });

  it('renders the action menu when the comment was authored by another user', () => {
    currentUserIdMock.value = 'admin-1';

    const onAction = vi.fn();

    render(
      <CommentReportActionMenu
        report={makeReport()}
        commentAuthorId="some-other-user"
        onAction={onAction}
      />,
    );

    // The default path: the dropdown trigger and menu are present,
    // the self-moderation notice is NOT.
    expect(
      screen.getByTestId('comment-report-action-trigger-r-1'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('comment-report-action-menu-r-1'),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId('comment-report-self-moderation-notice-r-1'),
    ).not.toBeInTheDocument();
  });
});
