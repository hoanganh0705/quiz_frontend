/**
 * `GrantRoleDialog` unit tests.
 *
 * Source epic:   Epic 7.10 — User Role Grant: USER_GRANT_ROLE with Secondary Confirm.
 * Source ticket: TKT-7.10.E2.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api';

// Mock hooks
vi.mock('../../hooks/useGrantUserRole', () => ({
  useGrantUserRole: vi.fn(),
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

import { useGrantUserRole } from '../../hooks/useGrantUserRole';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { GrantRoleDialog } from '../GrantRoleDialog';
import type { UseGrantUserRoleResult } from '../../hooks/useGrantUserRole';

const USER_ID = '00000000-0000-4000-8000-000000000001';
const DIFFERENT_USER_ID = '00000000-0000-4000-8000-000000000099';

const mockedUseGrantUserRole = vi.mocked(useGrantUserRole);
const mockedUseAuth = vi.mocked(useAuth);

function makeGrantMockResult(
  overrides: Partial<UseGrantUserRoleResult> = {},
): UseGrantUserRoleResult {
  return {
    grant: vi.fn(),
    isPending: false,
    error: null,
    audit: { before: null, after: null },
    reset: vi.fn(),
    ...overrides,
  };
}

describe('GrantRoleDialog', () => {
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

  it('renders the dialog when isOpen is true', () => {
    mockedUseGrantUserRole.mockReturnValue(makeGrantMockResult());

    render(
      <GrantRoleDialog
        userId={DIFFERENT_USER_ID}
        username="targetUser"
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );

    expect(screen.getByTestId('grant-role-dialog')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    mockedUseGrantUserRole.mockReturnValue(makeGrantMockResult());

    render(
      <GrantRoleDialog
        userId={DIFFERENT_USER_ID}
        username="targetUser"
        isOpen={false}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );

    expect(screen.queryByTestId('grant-role-dialog')).not.toBeInTheDocument();
  });

  it('Grant Role button is disabled until a role is selected', () => {
    mockedUseGrantUserRole.mockReturnValue(makeGrantMockResult());

    render(
      <GrantRoleDialog
        userId={DIFFERENT_USER_ID}
        username="targetUser"
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );

    const grantButton = screen.getByTestId('grant-confirm-button');
    expect(grantButton).toBeDisabled();
  });

  it('opens TypedConfirmDialog on Grant Role click after selecting a role', async () => {
    mockedUseGrantUserRole.mockReturnValue(
      makeGrantMockResult({
        grant: vi.fn().mockResolvedValue({
          userId: DIFFERENT_USER_ID,
          role: 'user_grant_role',
          grantedAt: new Date().toISOString(),
        }),
      }),
    );

    render(
      <GrantRoleDialog
        userId={DIFFERENT_USER_ID}
        username="targetUser"
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );

    const firstRole = screen.getAllByTestId('role-picker-option')[0]!;
    fireEvent.click(firstRole);

    const grantButton = screen.getByTestId('grant-confirm-button');
    fireEvent.click(grantButton);

    await waitFor(() => {
      expect(
        screen.getByTestId('typed-confirm-dialog'),
      ).toBeInTheDocument();
    });
  });

  it('calls onSuccess and onClose after successful grant', async () => {
    const onSuccess = vi.fn();
    const onClose = vi.fn();
    const grant = vi.fn().mockResolvedValue({
      userId: DIFFERENT_USER_ID,
      role: 'user_grant_role',
      grantedAt: new Date().toISOString(),
    });

    mockedUseGrantUserRole.mockReturnValue(
      makeGrantMockResult({ grant }),
    );

    render(
      <GrantRoleDialog
        userId={DIFFERENT_USER_ID}
        username="targetUser"
        isOpen={true}
        onClose={onClose}
        onSuccess={onSuccess}
      />,
    );

    const firstRole = screen.getAllByTestId('role-picker-option')[0]!;
    fireEvent.click(firstRole);

    fireEvent.click(screen.getByTestId('grant-confirm-button'));

    await waitFor(() => {
      expect(
        screen.getByTestId('typed-confirm-dialog'),
      ).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('typed-confirm-accept'));

    await waitFor(() => {
      expect(grant).toHaveBeenCalled();
      expect(onSuccess).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('renders error notice and RequestIdBanner on failure', () => {
    const apiError = new ApiError({
      isAxiosError: true,
      name: 'AxiosError',
      message: 'Already granted',
      config: undefined,
      request: undefined,
      response: {
        status: 409,
        data: {
          status: 409,
          detail: 'Already granted',
          title: 'AlreadyGranted',
          extensions: { code: 'ALREADY_GRANTED', requestId: 'req-123' },
        },
      },
      toJSON: () => ({}),
    } as unknown as Parameters<typeof ApiError.fromAxios>[0]);

    mockedUseGrantUserRole.mockReturnValue(
      makeGrantMockResult({ error: apiError }),
    );

    render(
      <GrantRoleDialog
        userId={DIFFERENT_USER_ID}
        username="targetUser"
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );

    expect(screen.getByTestId('grant-error-notice')).toBeInTheDocument();
    expect(screen.getByTestId('request-id-banner')).toBeInTheDocument();
  });
});
