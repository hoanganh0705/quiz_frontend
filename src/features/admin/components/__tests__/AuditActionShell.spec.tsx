/**
 * `features/admin/components/__tests__/AuditActionShell.spec.tsx`
 *
 * Source epic:   Epic 7.1.
 * Source ticket: TKT-7.1.C3.
 */

import { act, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api/core/ApiError';

import { AuditActionShell } from '../AuditActionShell';
import type { AuditActionBreadcrumb } from '../AuditActionShell';

describe('AuditActionShell', () => {
  it('emits a started breadcrumb and renders isPending before mutate resolves', async () => {
    const breadcrumbs: AuditActionBreadcrumb[] = [];
    let resolve!: (value: unknown) => void;
    const mutate = vi.fn(
      () =>
        new Promise<unknown>((r) => {
          resolve = r;
        }),
    );

    render(
      <AuditActionShell
        action="ranking.recalculate"
        before={{ userId: 'u-1' }}
        mutate={mutate}
        onBreadcrumb={(b) => breadcrumbs.push(b)}
      >
        {(state) => (
          <button
            type="button"
            onClick={() => state.retry()}
            data-testid="trigger"
          >
            {state.isPending ? 'pending' : 'idle'}
          </button>
        )}
      </AuditActionShell>,
    );

    await act(async () => {
      screen.getByTestId('trigger').click();
    });

    expect(breadcrumbs[0]?.status).toBe('started');
    expect(screen.getByTestId('trigger')).toHaveTextContent('pending');

    await act(async () => {
      resolve({ ok: true });
    });

    await waitFor(() => {
      expect(screen.getByTestId('trigger')).toHaveTextContent('idle');
    });
    expect(breadcrumbs.map((b) => b.status)).toEqual(['started', 'success']);
  });

  it('emits a failure breadcrumb with requestId and correlationId on error', async () => {
    const breadcrumbs: AuditActionBreadcrumb[] = [];

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
          detail: 'boom',
          title: 'Internal Server Error',
          extensions: {
            requestId: 'req-abc',
            correlationId: 'corr-xyz',
          },
        },
      },
      toJSON: () => ({}),
    } as unknown as Parameters<typeof ApiError.fromAxios>[0]);

    render(
      <AuditActionShell
        action="ranking.recalculate"
        before={{}}
        mutate={vi.fn().mockRejectedValue(error)}
        onBreadcrumb={(b) => breadcrumbs.push(b)}
      >
        {(state) => (
          <button type="button" onClick={() => state.retry()}>
            {state.error?.code ?? 'none'}
          </button>
        )}
      </AuditActionShell>,
    );

    await act(async () => {
      screen.getByRole('button').click();
    });

    await waitFor(() => {
      expect(breadcrumbs.some((b) => b.status === 'failure')).toBe(true);
    });

    const failure = breadcrumbs.find(
      (b) => b.status === 'failure',
    ) as Extract<AuditActionBreadcrumb, { status: 'failure' }>;
    expect(failure.requestId).toBe('req-abc');
    expect(failure.correlationId).toBe('corr-xyz');
    expect(screen.getByTestId('admin-request-id-banner')).toBeInTheDocument();
  });

  it('redacts fields in the breadcrumb payload', async () => {
    const breadcrumbs: AuditActionBreadcrumb[] = [];

    render(
      <AuditActionShell
        action="ranking.recalculate"
        before={{ secret: 'hunter2', public: 'ok' }}
        mutate={vi.fn().mockResolvedValue({ secret: 'after-secret', public: 'ok' })}
        redactFields={['secret']}
        onBreadcrumb={(b) => breadcrumbs.push(b)}
      >
        {(state) => (
          <button type="button" onClick={() => state.retry()}>
            {state.status}
          </button>
        )}
      </AuditActionShell>,
    );

    await act(async () => {
      screen.getByRole('button').click();
    });

    await waitFor(() => {
      expect(breadcrumbs.some((b) => b.status === 'success')).toBe(true);
    });

    const success = breadcrumbs.find(
      (b) => b.status === 'success',
    ) as Extract<AuditActionBreadcrumb, { status: 'success' }>;
    expect((success.before as Record<string, unknown>).secret).toBe(
      '[redacted]',
    );
    expect((success.after as Record<string, unknown>).secret).toBe(
      '[redacted]',
    );
  });

  it('does not retry the mutation automatically — consumer drives retry()', async () => {
    const mutate = vi.fn().mockResolvedValue({ ok: true });
    render(
      <AuditActionShell
        action="noop"
        before={{}}
        mutate={mutate}
        onBreadcrumb={() => undefined}
      >
        {(state) => (
          <button type="button" onClick={() => state.retry()}>
            retry
          </button>
        )}
      </AuditActionShell>,
    );

    // No auto-run on mount.
    expect(mutate).not.toHaveBeenCalled();
  });
});
