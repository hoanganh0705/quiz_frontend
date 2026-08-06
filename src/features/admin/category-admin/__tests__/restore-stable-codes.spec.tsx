/**
 * `restore-stable-codes.spec.tsx`
 *
 * Source epic:   Epic 7.4 — Category admin CRUD + restore.
 * Source ticket: TKT-7.4.H2.
 *
 * Focused regression coverage for the two stable error codes the
 * source story calls out as restore edge cases:
 *
 *   - `CATEGORY_ALREADY_ACTIVE`     — the category is not soft-deleted;
 *                                    restore is operationally meaningless
 *                                    and the server refuses with a stable
 *                                    code.
 *   - `CATEGORY_RESTORE_INVARIANT`  — a documented system constraint
 *                                    prevents restoration; the server
 *                                    refuses with a stable code.
 *
 * For both codes, the contract is:
 *
 *   - The `useRestoreCategory` hook propagates the `ApiError` without
 *     retry and emits no cross-tab invalidation broadcast.
 *   - The `CategoryRestoreDialog` renders a stable notice and a "Close"
 *     button in place of the "Restore category" CTA — the dialog does
 *     NOT auto-retry, and clicking "Close" cancels the dialog cleanly.
 *
 * These tests lock that contract so future refactors of either the
 * hook or the dialog cannot regress the documented behaviour.
 *
 * Mirrors Epic 7.3 TKT-7.3.H2 (`restore-stable-codes.spec.tsx`).
 */

import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SWRConfig } from 'swr';

import { ApiError } from '@/lib/api';
import type { CategoryDto, DeletedCategoryListItem } from '../category-types';
import { CategoryRestoreDialog } from '../components/CategoryRestoreDialog';

// ─── Mock data ──────────────────────────────────────────────────────────────

const MOCK_DELETED_CATEGORY: DeletedCategoryListItem = {
  categoryId: 'cat-deleted',
  name: 'Mathematics',
  slug: 'mathematics',
  description: null,
  imageUrl: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-06-01T00:00:00.000Z',
  deletedAt: '2026-06-01T12:00:00.000Z',
};

const RESTORED_CATEGORY: CategoryDto = {
  categoryId: 'cat-deleted',
  name: 'Mathematics',
  slug: 'mathematics',
  description: null,
  imageUrl: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-06-02T00:00:00.000Z',
};

// ─── Mocked broadcasts (the hooks broadcast on success; we mock the
//    cross-tab module so the broadcast is observable in tests but does
//    not reach a real BroadcastChannel).
// ────────────────────────────────────────────────────────────────────────────

const mockBroadcastCategoryAdminInvalidate = vi.hoisted(() => vi.fn());
const mockSubscribeCategoryAdminInvalidate = vi.hoisted(() =>
  vi.fn().mockReturnValue(() => {}),
);

const mockUsePermission = vi.hoisted(() =>
  vi.fn(() => ({ hasPermission: true, isLoading: false, error: null })),
);

vi.mock('@/features/admin/hooks', () => ({
  usePermission: () =>
    (mockUsePermission as unknown as () => { hasPermission: boolean })(),
}));

vi.mock('../cache/category-cross-tab', () => ({
  broadcastCategoryAdminInvalidate: mockBroadcastCategoryAdminInvalidate,
  subscribeCategoryAdminInvalidate: mockSubscribeCategoryAdminInvalidate,
  CATEGORY_ADMIN_CHANNEL_NAME: 'phase7-admin-category',
}));

// The dialog imports `useRestoreCategory` from `'../hooks/useRestoreCategory'`.
// We do NOT mock that module here — the regression test deliberately
// exercises the real `useRestoreCategory` against the mocked
// `restoreCategory` service so the END-TO-END contract (hook + service)
// for these codes is locked.

// ─── Service mock (the only thing we mock to inject errors) ─────────────

let nextRestore: { value?: CategoryDto; error?: ApiError } | null = null;
let restoreCallCount = 0;

const mockRestoreCategory = vi.hoisted(() => vi.fn());

vi.mock('@/features/admin/services/category-admin.service', () => ({
  restoreCategory: mockRestoreCategory,
}));

// ─── Setup ───────────────────────────────────────────────────────────────

function makeApiError(
  code: 'CATEGORY_ALREADY_ACTIVE' | 'CATEGORY_RESTORE_INVARIANT',
  detail = 'mock error',
  requestId = 'req-stable-test',
): ApiError {
  return new ApiError({
    isAxiosError: true,
    response: {
      status: 409,
      data: {
        detail,
        extensions: { code, requestId },
      },
    },
  } as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  nextRestore = null;
  restoreCallCount = 0;
  mockUsePermission.mockReturnValue({
    hasPermission: true,
    isLoading: false,
    error: null,
  });
  mockRestoreCategory.mockImplementation(async () => {
    restoreCallCount += 1;
    if (nextRestore?.error) throw nextRestore.error;
    if (nextRestore?.value) return nextRestore.value;
    return RESTORED_CATEGORY;
  });
  mockSubscribeCategoryAdminInvalidate.mockReturnValue(() => {});
});

// ─── Helpers ─────────────────────────────────────────────────────────────

function renderDialog(
  overrides: {
    open?: boolean;
    category?: DeletedCategoryListItem | null;
    onOpenChange?: (open: boolean) => void;
    onRestored?: (category: CategoryDto) => void;
  } = {},
) {
  const onOpenChange = overrides.onOpenChange ?? (() => {});
  const onRestored = overrides.onRestored ?? (() => {});
  return {
    onOpenChange,
    onRestored,
    ...render(
      <SWRConfig value={{ provider: () => new Map() }}>
        <CategoryRestoreDialog
          open={overrides.open ?? true}
          onOpenChange={onOpenChange}
          category={overrides.category ?? MOCK_DELETED_CATEGORY}
          onRestored={onRestored}
        />
      </SWRConfig>,
    ),
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────

describe('restore-stable-codes — CATEGORY_ALREADY_ACTIVE (TKT-7.4.H2)', () => {
  it('step 1: the hook rejects with CATEGORY_ALREADY_ACTIVE and does NOT broadcast', async () => {
    nextRestore = { error: makeApiError('CATEGORY_ALREADY_ACTIVE') };
    const { renderHook, act } = await import('@testing-library/react');
    const { useRestoreCategory } = await import('../hooks/useRestoreCategory');
    const { result } = renderHook(() => useRestoreCategory());

    await act(async () => {
      await expect(
        result.current.restore('cat-deleted'),
      ).rejects.toMatchObject({
        code: 'CATEGORY_ALREADY_ACTIVE',
        requestId: expect.any(String),
      });
    });

    expect(restoreCallCount).toBe(1);
    expect(mockBroadcastCategoryAdminInvalidate).not.toHaveBeenCalled();
  });

  it('step 2: the dialog surfaces the stable notice and replaces Restore with Close', async () => {
    nextRestore = { error: makeApiError('CATEGORY_ALREADY_ACTIVE') };
    const onOpenChange = vi.fn();
    renderDialog({ onOpenChange });

    const confirm = within(
      screen.getByRole('alertdialog'),
    ).getByRole('button', { name: /Restore category/i });
    fireEvent.click(confirm);

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(/already active/i);
    });

    const dialog = screen.getByRole('alertdialog');
    expect(
      within(dialog).queryByRole('button', { name: /Restore category/i }),
    ).not.toBeInTheDocument();
    const closeButton = within(dialog).getByRole('button', { name: /Close/i });
    fireEvent.click(closeButton);

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(mockRestoreCategory).toHaveBeenCalledTimes(1);
  });

  it('step 3: the dialog does not auto-retry on CATEGORY_ALREADY_ACTIVE', async () => {
    nextRestore = { error: makeApiError('CATEGORY_ALREADY_ACTIVE') };
    renderDialog();

    const confirm = within(
      screen.getByRole('alertdialog'),
    ).getByRole('button', { name: /Restore category/i });
    fireEvent.click(confirm);

    await waitFor(() => {
      expect(mockRestoreCategory).toHaveBeenCalledTimes(1);
    });

    // The Restore CTA is replaced with a Close button; nothing else
    // can re-issue the mutation. Subsequent renders do not call
    // `mockRestoreCategory` again.
    await new Promise((r) => setTimeout(r, 50));
    expect(mockRestoreCategory).toHaveBeenCalledTimes(1);
  });
});

describe('restore-stable-codes — CATEGORY_RESTORE_INVARIANT (TKT-7.4.H2)', () => {
  it('step 1: the hook rejects with CATEGORY_RESTORE_INVARIANT and does NOT broadcast', async () => {
    nextRestore = { error: makeApiError('CATEGORY_RESTORE_INVARIANT') };
    const { renderHook, act } = await import('@testing-library/react');
    const { useRestoreCategory } = await import('../hooks/useRestoreCategory');
    const { result } = renderHook(() => useRestoreCategory());

    await act(async () => {
      await expect(
        result.current.restore('cat-deleted'),
      ).rejects.toMatchObject({
        code: 'CATEGORY_RESTORE_INVARIANT',
        requestId: expect.any(String),
      });
    });

    expect(restoreCallCount).toBe(1);
    expect(mockBroadcastCategoryAdminInvalidate).not.toHaveBeenCalled();
  });

  it('step 2: the dialog surfaces the invariant stable notice and replaces Restore with Close', async () => {
    nextRestore = { error: makeApiError('CATEGORY_RESTORE_INVARIANT') };
    const onOpenChange = vi.fn();
    renderDialog({ onOpenChange });

    const confirm = within(
      screen.getByRole('alertdialog'),
    ).getByRole('button', { name: /Restore category/i });
    fireEvent.click(confirm);

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(
        /system constraint|cannot be restored/i,
      );
    });

    const dialog = screen.getByRole('alertdialog');
    expect(
      within(dialog).queryByRole('button', { name: /Restore category/i }),
    ).not.toBeInTheDocument();
    const closeButton = within(dialog).getByRole('button', { name: /Close/i });
    fireEvent.click(closeButton);

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(mockRestoreCategory).toHaveBeenCalledTimes(1);
  });
});

describe('restore-stable-codes — Sanity: happy path still works (TKT-7.4.H2)', () => {
  it('a successful restore still emits the cross-tab broadcast', async () => {
    nextRestore = { value: RESTORED_CATEGORY };
    const { renderHook, act } = await import('@testing-library/react');
    const { useRestoreCategory } = await import('../hooks/useRestoreCategory');
    const { result } = renderHook(() => useRestoreCategory());

    await act(async () => {
      await result.current.restore('cat-deleted');
    });

    expect(mockBroadcastCategoryAdminInvalidate).toHaveBeenCalledWith(
      'restore',
      'cat-deleted',
    );
  });
});
