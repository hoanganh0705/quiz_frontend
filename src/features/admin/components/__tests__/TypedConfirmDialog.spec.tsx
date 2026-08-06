/**
 * `features/admin/components/__tests__/TypedConfirmDialog.spec.tsx`
 *
 * Source epic:   Epic 7.1.
 * Source ticket: TKT-7.1.C5.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api/core/ApiError';

import { TypedConfirmDialog } from '../TypedConfirmDialog';

const OPERATION = 'ranking.recalculate' as const;
const REQUIRED = 'RECALCULATE RANKINGS';

describe('TypedConfirmDialog', () => {
  it('disables the confirm button when input is empty', () => {
    render(
      <TypedConfirmDialog
        open={true}
        operation={OPERATION}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    const confirm = screen.getByTestId('typed-confirm-dialog-confirm');
    expect(confirm).toBeDisabled();
    expect(confirm).toHaveAttribute('aria-disabled', 'true');
  });

  it('disables the confirm button on case mismatch', () => {
    render(
      <TypedConfirmDialog
        open={true}
        operation={OPERATION}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
        expectedConfirmString={REQUIRED}
      />,
    );
    fireEvent.change(screen.getByTestId('typed-confirm-dialog-input'), {
      target: { value: 'recalculate rankings' },
    });
    const confirm = screen.getByTestId('typed-confirm-dialog-confirm');
    expect(confirm).toBeDisabled();
  });

  it('disables the confirm button on whitespace mismatch', () => {
    render(
      <TypedConfirmDialog
        open={true}
        operation={OPERATION}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
        expectedConfirmString={REQUIRED}
      />,
    );
    fireEvent.change(screen.getByTestId('typed-confirm-dialog-input'), {
      target: { value: `${REQUIRED} ` },
    });
    const confirm = screen.getByTestId('typed-confirm-dialog-confirm');
    expect(confirm).toBeDisabled();
  });

  it('enables the confirm button on an exact match', () => {
    render(
      <TypedConfirmDialog
        open={true}
        operation={OPERATION}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
        expectedConfirmString={REQUIRED}
      />,
    );
    fireEvent.change(screen.getByTestId('typed-confirm-dialog-input'), {
      target: { value: REQUIRED },
    });
    const confirm = screen.getByTestId('typed-confirm-dialog-confirm');
    expect(confirm).not.toBeDisabled();
  });

  it('calls onConfirm exactly once when the confirm button is clicked', () => {
    const onConfirm = vi.fn();
    render(
      <TypedConfirmDialog
        open={true}
        operation={OPERATION}
        onConfirm={onConfirm}
        onCancel={vi.fn()}
        expectedConfirmString={REQUIRED}
      />,
    );
    fireEvent.change(screen.getByTestId('typed-confirm-dialog-input'), {
      target: { value: REQUIRED },
    });
    fireEvent.click(screen.getByTestId('typed-confirm-dialog-confirm'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel and never onConfirm when cancelled', () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    render(
      <TypedConfirmDialog
        open={true}
        operation={OPERATION}
        onConfirm={onConfirm}
        onCancel={onCancel}
        expectedConfirmString={REQUIRED}
      />,
    );
    fireEvent.change(screen.getByTestId('typed-confirm-dialog-input'), {
      target: { value: REQUIRED },
    });
    fireEvent.click(screen.getByTestId('typed-confirm-dialog-cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('disables both buttons while pending', () => {
    render(
      <TypedConfirmDialog
        open={true}
        operation={OPERATION}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
        pending={true}
        expectedConfirmString={REQUIRED}
      />,
    );
    expect(screen.getByTestId('typed-confirm-dialog-cancel')).toBeDisabled();
    // The confirm button is disabled because pending is true, regardless of input.
    const confirm = screen.getByTestId('typed-confirm-dialog-confirm');
    expect(confirm).toBeDisabled();
  });

  it('renders a RequestIdBanner when previousError is supplied', () => {
    const error = new ApiError({
      isAxiosError: true,
      name: 'AxiosError',
      message: 'mock error',
      config: undefined,
      request: undefined,
      response: {
        status: 500,
        data: {
          status: 500,
          detail: 'server error',
          title: 'Internal Server Error',
          extensions: { requestId: 'req-abc' },
        },
      },
      toJSON: () => ({}),
    } as unknown as Parameters<typeof ApiError.fromAxios>[0]);

    render(
      <TypedConfirmDialog
        open={true}
        operation={OPERATION}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
        previousError={error}
      />,
    );
    expect(
      screen.getByTestId('admin-request-id-banner'),
    ).toBeInTheDocument();
  });
});
