

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api';

vi.mock('../../hooks/useRevokeUserRole', () => ({
useRevokeUserRole: vi.fn(),
}));

vi.mock('@/features/auth/hooks/use-auth', () => ({
useAuth: vi.fn(),
}));

vi.mock('@/features/admin/components/RequestIdBanner', () => ({
RequestIdBanner: ({ error }: { error: { requestId: string } }) => (
<div data-testid="request-id-banner">
requestId={error.requestId}
</div>
  ),
}));

vi.mock('@/features/admin/components/TypedConfirmDialog', () => ({
TypedConfirmDialog: ({
open,
onConfirm,
  }: {
open: boolean;
onConfirm: () => void;
operation: string;
  }) =>
open ? (
<div data-testid="typed-confirm-dialog">
<button
data-testid="typed-confirm-accept"
onClick={() => onConfirm()}
        >
Confirm
        </button>
</div>
    ) : null,
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
<div data-testid="alert-dialog">
{children}
<button data-testid="alert-dialog-close" onClick={() => onOpenChange(false)}>
close
        </button>
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
AlertDialogFooter: ({ children }: { children: React.ReactNode }) => (
<div>{children}</div>
  ),
}));

import { useRevokeUserRole } from '../../hooks/useRevokeUserRole';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { RevokeRoleDialog } from '../RevokeRoleDialog';

const USER_ID = '00000000-0000-4000-8000-000000000001';
const DIFFERENT_USER_ID = '00000000-0000-4000-8000-000000000099';

const mockedUseRevokeUserRole = vi.mocked(useRevokeUserRole);
const mockedUseAuth = vi.mocked(useAuth);

describe('RevokeRoleDialog', () => {
beforeEach(() => {
vi.clearAllMocks();
mockedUseAuth.mockReturnValue({
currentUser: {
userId: USER_ID,
username: 'admin',
email: 'admin@example.com',
role: 'admin',
isVerified: true,
      },
isLoading: false,
error: null,
refetch: vi.fn(),
    });
  });

afterEach(() => {
vi.restoreAllMocks();
  });

it('renders self-revocation notice when target is current admin', () => {
mockedUseRevokeUserRole.mockReturnValue({
revoke: vi.fn(),
isPending: false,
error: null,
isSelfRevoke: false,
audit: { before: null, after: null },
reset: vi.fn(),
    });

render(
<RevokeRoleDialog
userId={USER_ID}
username="self"
currentRoles={[]}
role="user_grant_role"
isOpen={true}
onClose={vi.fn()}
onSuccess={vi.fn()}
      />,
    );

expect(
screen.getByTestId('self-role-revoke-forbidden-notice'),
    ).toBeInTheDocument();
  });

it('disables revoke button when target is current admin', () => {
mockedUseRevokeUserRole.mockReturnValue({
revoke: vi.fn(),
isPending: false,
error: null,
isSelfRevoke: false,
audit: { before: null, after: null },
reset: vi.fn(),
    });

render(
<RevokeRoleDialog
userId={USER_ID}
username="self"
currentRoles={[]}
role="user_grant_role"
isOpen={true}
onClose={vi.fn()}
onSuccess={vi.fn()}
      />,
    );

expect(screen.getByTestId('revoke-confirm-button')).toBeDisabled();
  });

it('opens TypedConfirmDialog on Revoke Role click (non-self)', async () => {
mockedUseRevokeUserRole.mockReturnValue({
revoke: vi.fn().mockResolvedValue({
userId: DIFFERENT_USER_ID,
role: 'user_grant_role',
grantedAt: new Date().toISOString(),
      }),
isPending: false,
error: null,
isSelfRevoke: false,
audit: { before: null, after: null },
reset: vi.fn(),
    });

render(
<RevokeRoleDialog
userId={DIFFERENT_USER_ID}
username="targetUser"
currentRoles={[
{ role: 'user_grant_role', grantedAt: new Date().toISOString() },
        ]}
role="user_grant_role"
isOpen={true}
onClose={vi.fn()}
onSuccess={vi.fn()}
      />,
    );

fireEvent.click(screen.getByTestId('revoke-confirm-button'));

await waitFor(() => {
expect(
screen.getByTestId('typed-confirm-dialog'),
      ).toBeInTheDocument();
    });
  });

it('calls onSuccess and onClose after successful revoke', async () => {
const onSuccess = vi.fn();
const onClose = vi.fn();
const revoke = vi.fn().mockResolvedValue({
userId: DIFFERENT_USER_ID,
role: 'user_grant_role',
grantedAt: new Date().toISOString(),
    });

mockedUseRevokeUserRole.mockReturnValue({
revoke,
isPending: false,
error: null,
isSelfRevoke: false,
audit: { before: null, after: null },
reset: vi.fn(),
    });

render(
<RevokeRoleDialog
userId={DIFFERENT_USER_ID}
username="targetUser"
currentRoles={[
{ role: 'user_grant_role', grantedAt: new Date().toISOString() },
        ]}
role="user_grant_role"
isOpen={true}
onClose={onClose}
onSuccess={onSuccess}
      />,
    );

fireEvent.click(screen.getByTestId('revoke-confirm-button'));

await waitFor(() => {
expect(
screen.getByTestId('typed-confirm-dialog'),
      ).toBeInTheDocument();
    });
fireEvent.click(screen.getByTestId('typed-confirm-accept'));

await waitFor(() => {
expect(revoke).toHaveBeenCalled();
expect(onSuccess).toHaveBeenCalled();
expect(onClose).toHaveBeenCalled();
    });
  });

it('renders error notice and RequestIdBanner on failure', () => {
const apiError = new ApiError({
isAxiosError: true,
name: 'AxiosError',
message: 'Not granted',
config: undefined,
request: undefined,
response: {
status: 409,
data: {
status: 409,
detail: 'Not granted',
title: 'NotGranted',
extensions: { code: 'NOT_GRANTED', requestId: 'req-456' },
        },
      },
toJSON: () => ({}),
    } as unknown as Parameters<typeof ApiError.fromAxios>[0]);

mockedUseRevokeUserRole.mockReturnValue({
revoke: vi.fn(),
isPending: false,
error: apiError,
isSelfRevoke: false,
audit: { before: null, after: null },
reset: vi.fn(),
    });

render(
<RevokeRoleDialog
userId={DIFFERENT_USER_ID}
username="targetUser"
currentRoles={[]}
role="user_grant_role"
isOpen={true}
onClose={vi.fn()}
onSuccess={vi.fn()}
      />,
    );

expect(screen.getByTestId('revoke-error-notice')).toBeInTheDocument();
expect(screen.getByTestId('request-id-banner')).toBeInTheDocument();
  });

it('renders the role to revoke', () => {
mockedUseRevokeUserRole.mockReturnValue({
revoke: vi.fn(),
isPending: false,
error: null,
isSelfRevoke: false,
audit: { before: null, after: null },
reset: vi.fn(),
    });

render(
<RevokeRoleDialog
userId={DIFFERENT_USER_ID}
username="targetUser"
currentRoles={[]}
role="user_grant_role"
isOpen={true}
onClose={vi.fn()}
onSuccess={vi.fn()}
      />,
    );

expect(screen.getByTestId('revoke-role-display')).toBeInTheDocument();
  });
});
