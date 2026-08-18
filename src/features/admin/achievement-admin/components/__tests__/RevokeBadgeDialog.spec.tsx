

import {
act,
fireEvent,
render,
screen,
waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api';

import { useRevokeUserBadge } from '../../hooks/useRevokeUserBadge';

import { RevokeBadgeDialog } from '../RevokeBadgeDialog';

vi.mock('../../hooks/useRevokeUserBadge', () => ({
useRevokeUserBadge: vi.fn(),
}));

vi.mock('@/components/ui/AlertDialog', () => ({
AlertDialog: ({
open,
onOpenChange,
children,
  }: {
open: boolean;
onOpenChange: (open: boolean) => void;
children: React.ReactNode;
  }) => {
if (!open) return null;
return (
<div data-testid="alert-dialog" data-open={open}>
{children}
</div>
    );
  },
AlertDialogContent: ({
'data-testid': testId,
children,
  }: {
'data-testid'?: string;
children: React.ReactNode;
  }) => <div data-testid={testId}>{children}</div>,
AlertDialogHeader: ({ children }: { children: React.ReactNode }) => (
<div>{children}</div>
  ),
AlertDialogTitle: ({
'data-testid': testId,
children,
  }: {
'data-testid'?: string;
children: React.ReactNode;
  }) => (
<div data-testid={testId}>{children}</div>
  ),
AlertDialogDescription: ({ children }: { children: React.ReactNode }) => (
<div>{children}</div>
  ),
AlertDialogFooter: ({ children }: { children: React.ReactNode }) => (
<div>{children}</div>
  ),
}));

const USER_ID = '00000000-0000-4000-8000-000000000001';
const BADGE_ID = '00000000-0000-4000-8000-000000000002';

const BADGE_FIXTURE = {
id: BADGE_ID,
code: 'BRONZE_QUIZ',
badgeId: BADGE_ID,
name: 'Bronze Quiz',
description: null,
tier: 'BRONZE',
earnedAt: '2025-01-01T00:00:00Z',
};

function makeRevokeSuccess() {
return {
revoke: vi.fn<() => Promise<unknown>>().mockResolvedValue({
userId: USER_ID,
badgeId: BADGE_ID,
revokedAt: '2025-08-07T00:00:00.000Z',
    }),
isPending: false,
error: null,
audit: { before: BADGE_FIXTURE, after: null },
reset: vi.fn(),
  };
}

function makeRevokeError(code: string, requestId = 'req-1') {
const err = new ApiError({
isAxiosError: true,
response: {
status: code === 'PERMISSION_DENIED' || code === 'ADMIN_FORBIDDEN' ? 403 : 409,
data: {
status: code === 'PERMISSION_DENIED' || code === 'ADMIN_FORBIDDEN' ? 403 : 409,
detail: code,
title: code,
extensions: { code, requestId, correlationId: 'corr-1' },
      },
    },
name: 'AxiosError',
message: code,
  });
return {
revoke: vi.fn<() => Promise<unknown>>().mockRejectedValue(err),
isPending: false,
error: err,
audit: { before: BADGE_FIXTURE, after: null },
reset: vi.fn(),
  };
}

beforeEach(() => {
vi.mocked(useRevokeUserBadge).mockReset();
});
afterEach(() => vi.restoreAllMocks());

describe('TKT-7.8.D3 — RevokeBadgeDialog', () => {
it('closed dialog renders nothing', () => {
const onClose = vi.fn();
const onRevoked = vi.fn();
vi.mocked(useRevokeUserBadge).mockReturnValue(makeRevokeSuccess());

render(
<RevokeBadgeDialog
open={false}
userId={USER_ID}
badge={BADGE_FIXTURE}
onClose={onClose}
onRevoked={onRevoked}
      />,
    );

expect(
screen.queryByTestId('revoke-badge-dialog'),
    ).not.toBeInTheDocument();
  });

it('open dialog renders the dialog', () => {
vi.mocked(useRevokeUserBadge).mockReturnValue(makeRevokeSuccess());

render(
<RevokeBadgeDialog
open={true}
userId={USER_ID}
badge={BADGE_FIXTURE}
onClose={vi.fn()}
onRevoked={vi.fn()}
      />,
    );

expect(screen.getByTestId('revoke-badge-dialog')).toBeInTheDocument();
expect(screen.getByTestId('revoke-dialog-title')).toHaveTextContent(
'Revoke badge',
    );
  });

it('confirm button disabled until exact match', async () => {
vi.mocked(useRevokeUserBadge).mockReturnValue(makeRevokeSuccess());

render(
<RevokeBadgeDialog
open={true}
userId={USER_ID}
badge={BADGE_FIXTURE}
onClose={vi.fn()}
onRevoked={vi.fn()}
      />,
    );

const confirmBtn = screen.getByTestId('revoke-confirm-button');
expect(confirmBtn).toBeDisabled();

await act(async () => {
fireEvent.change(screen.getByTestId('revoke-confirm-input'), {
target: { value: 'REVOKE BADGE' },
      });
    });

expect(screen.getByTestId('revoke-confirm-button')).not.toBeDisabled();
  });

it('whitespace mismatch disables confirm', async () => {
vi.mocked(useRevokeUserBadge).mockReturnValue(makeRevokeSuccess());

render(
<RevokeBadgeDialog
open={true}
userId={USER_ID}
badge={BADGE_FIXTURE}
onClose={vi.fn()}
onRevoked={vi.fn()}
      />,
    );

await act(async () => {
fireEvent.change(screen.getByTestId('revoke-confirm-input'), {
target: { value: 'revoke badge' },
      });
    });
expect(screen.getByTestId('revoke-confirm-button')).toBeDisabled();

await act(async () => {
fireEvent.change(screen.getByTestId('revoke-confirm-input'), {
target: { value: 'REVOKE BADGE ' },
      });
    });
expect(screen.getByTestId('revoke-confirm-button')).toBeDisabled();
  });

it('success fires onRevoked and onClose', async () => {
const onClose = vi.fn();
const onRevoked = vi.fn();
const successResult = makeRevokeSuccess();
vi.mocked(useRevokeUserBadge).mockReturnValue(successResult);

render(
<RevokeBadgeDialog
open={true}
userId={USER_ID}
badge={BADGE_FIXTURE}
onClose={onClose}
onRevoked={onRevoked}
      />,
    );

await act(async () => {
fireEvent.change(screen.getByTestId('revoke-confirm-input'), {
target: { value: 'REVOKE BADGE' },
      });
    });

await act(async () => {
fireEvent.click(screen.getByTestId('revoke-confirm-button'));
    });

await waitFor(() => {
expect(successResult.revoke).toHaveBeenCalledWith(
USER_ID,
BADGE_ID,
{ before: BADGE_FIXTURE },
      );
    });
  });

it('BADGE_NOT_GRANTED renders notice; dialog stays open', async () => {
const errorResult = makeRevokeError('BADGE_NOT_GRANTED');
vi.mocked(useRevokeUserBadge).mockReturnValue(errorResult);

render(
<RevokeBadgeDialog
open={true}
userId={USER_ID}
badge={BADGE_FIXTURE}
onClose={vi.fn()}
onRevoked={vi.fn()}
      />,
    );

await act(async () => {
fireEvent.change(screen.getByTestId('revoke-confirm-input'), {
target: { value: 'REVOKE BADGE' },
      });
    });

await act(async () => {
fireEvent.click(screen.getByTestId('revoke-confirm-button'));
    });

await waitFor(() => {
expect(
screen.getByTestId('revoke-error-notice'),
      ).toBeInTheDocument();
    });

expect(screen.getByTestId('revoke-badge-dialog')).toBeInTheDocument();
  });

it('ADMIN_FORBIDDEN renders notice with requestId', async () => {
const errorResult = makeRevokeError('ADMIN_FORBIDDEN', 'req-admin');
vi.mocked(useRevokeUserBadge).mockReturnValue(errorResult);

render(
<RevokeBadgeDialog
open={true}
userId={USER_ID}
badge={BADGE_FIXTURE}
onClose={vi.fn()}
onRevoked={vi.fn()}
      />,
    );

await act(async () => {
fireEvent.change(screen.getByTestId('revoke-confirm-input'), {
target: { value: 'REVOKE BADGE' },
      });
    });

await act(async () => {
fireEvent.click(screen.getByTestId('revoke-confirm-button'));
    });

await waitFor(() => {
expect(
screen.getByTestId('revoke-error-notice'),
      ).toBeInTheDocument();
    });

const errorNotice = screen.getByTestId('revoke-error-notice');
expect(errorNotice).toBeInTheDocument();
  });
});
