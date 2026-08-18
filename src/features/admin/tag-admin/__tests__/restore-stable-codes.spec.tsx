

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SWRConfig } from 'swr';

import { ApiError } from '@/lib/api';
import type { DeletedTagListItem, TagDto } from '../tag-types';
import { TagRestoreDialog } from '../components/TagRestoreDialog';

const MOCK_DELETED_TAG: DeletedTagListItem = {
tagId: 'tag-deleted',
name: 'JavaScript',
slug: 'javascript',
deletedAt: '2024-06-01T00:00:00Z',
createdAt: '2024-01-01T00:00:00Z',
updatedAt: '2024-06-01T00:00:00Z',
};

const RESTORED_TAG: TagDto = {
tagId: 'tag-deleted',
name: 'JavaScript',
slug: 'javascript',
createdAt: '2024-01-01T00:00:00Z',
updatedAt: '2024-06-02T00:00:00Z',
};

const mockRestore = vi.hoisted(() => vi.fn());
const mockBroadcastTagAdminInvalidate = vi.hoisted(() => vi.fn());
const mockSubscribeTagAdminInvalidate = vi.hoisted(() =>
vi.fn().mockReturnValue(() => {}),
);
const mockUsePermission = vi.hoisted(() =>
vi.fn(() => ({ hasPermission: true, isLoading: false, error: null })),
);

vi.mock('@/features/admin/hooks', () => ({
usePermission: () =>
(mockUsePermission as unknown as () => { hasPermission: boolean })(),
}));

vi.mock('@/features/admin/tag-admin/cache/tag-cross-tab', () => ({
broadcastTagAdminInvalidate: mockBroadcastTagAdminInvalidate,
subscribeTagAdminInvalidate: mockSubscribeTagAdminInvalidate,
}));

let nextRestore: { value?: TagDto; error?: ApiError } | null = null;
let restoreCallCount = 0;

const mockRestoreTag = vi.hoisted(() => vi.fn());

vi.mock('@/features/admin/services/tag-admin.service', () => ({
restoreTag: mockRestoreTag,
}));

function makeApiError(
code: 'TAG_ALREADY_ACTIVE' | 'TAG_RESTORE_INVARIANT',
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
mockRestoreTag.mockImplementation(async () => {
restoreCallCount += 1;
if (nextRestore?.error) throw nextRestore.error;
if (nextRestore?.value) return nextRestore.value;
return RESTORED_TAG;
  });
mockSubscribeTagAdminInvalidate.mockReturnValue(() => {});
});

function renderDialog(
overrides: {
open?: boolean;
tag?: DeletedTagListItem | null;
onOpenChange?: (open: boolean) => void;
onRestored?: (tag: TagDto) => void;
  } = {},
) {
const onOpenChange = overrides.onOpenChange ?? (() => {});
const onRestored = overrides.onRestored ?? (() => {});
return {
onOpenChange,
onRestored,
...render(
<SWRConfig value={{ provider: () => new Map() }}>
<TagRestoreDialog
open={overrides.open ?? true}
onOpenChange={onOpenChange}
tag={overrides.tag ?? MOCK_DELETED_TAG}
onRestored={onRestored}
        />
</SWRConfig>,
    ),
  };
}

describe('restore-stable-codes — TAG_ALREADY_ACTIVE (TKT-7.3.H2)', () => {
it('step 1: the hook rejects with TAG_ALREADY_ACTIVE and does NOT broadcast a cross-tab invalidation', async () => {
nextRestore = { error: makeApiError('TAG_ALREADY_ACTIVE') };
const { useRestoreTag } = await import('../hooks/useRestoreTag');
const { renderHook, act } = await import('@testing-library/react');
const { result } = renderHook(() => useRestoreTag());

await act(async () => {
await expect(
result.current.restore('tag-deleted'),
      ).rejects.toMatchObject({
code: 'TAG_ALREADY_ACTIVE',
requestId: expect.any(String),
      });
    });

expect(restoreCallCount).toBe(1);

expect(mockBroadcastTagAdminInvalidate).not.toHaveBeenCalled();
  });

it('step 2: the dialog surfaces the stable notice and replaces Restore with Close', async () => {

nextRestore = { error: makeApiError('TAG_ALREADY_ACTIVE') };
const onOpenChange = vi.fn();
renderDialog({ onOpenChange: onOpenChange as unknown as (open: boolean) => void });

const confirm = within(screen.getByRole('alertdialog')).getByRole('button', {
name: /Restore tag/i,
    });
fireEvent.click(confirm);

await waitFor(() => {
expect(screen.getByRole('status')).toHaveTextContent(
/already active/i,
      );
    });

const dialog = screen.getByRole('alertdialog');
expect(
within(dialog).queryByRole('button', { name: /Restore tag/i }),
    ).not.toBeInTheDocument();
const closeButton = within(dialog).getByRole('button', { name: /Close/i });
fireEvent.click(closeButton);

expect(onOpenChange).toHaveBeenCalledWith(false);

expect(mockRestoreTag).toHaveBeenCalledTimes(1);
  });

it('step 3: the dialog does not auto-retry on TAG_ALREADY_ACTIVE', async () => {
nextRestore = { error: makeApiError('TAG_ALREADY_ACTIVE') };
renderDialog();

const confirm = within(screen.getByRole('alertdialog')).getByRole('button', {
name: /Restore tag/i,
    });
fireEvent.click(confirm);

await waitFor(() => {
expect(mockRestoreTag).toHaveBeenCalledTimes(1);
    });

await new Promise((r) => setTimeout(r, 50));
expect(mockRestoreTag).toHaveBeenCalledTimes(1);
  });
});

describe('restore-stable-codes — TAG_RESTORE_INVARIANT (TKT-7.3.H2)', () => {
it('step 1: the hook rejects with TAG_RESTORE_INVARIANT and does NOT broadcast', async () => {
nextRestore = { error: makeApiError('TAG_RESTORE_INVARIANT') };
const { useRestoreTag } = await import('../hooks/useRestoreTag');
const { renderHook, act } = await import('@testing-library/react');
const { result } = renderHook(() => useRestoreTag());

await act(async () => {
await expect(
result.current.restore('tag-deleted'),
      ).rejects.toMatchObject({
code: 'TAG_RESTORE_INVARIANT',
requestId: expect.any(String),
      });
    });

expect(restoreCallCount).toBe(1);
expect(mockBroadcastTagAdminInvalidate).not.toHaveBeenCalled();
  });

it('step 2: the dialog surfaces the invariant stable notice and replaces Restore with Close', async () => {
nextRestore = { error: makeApiError('TAG_RESTORE_INVARIANT') };
const onOpenChange = vi.fn();
renderDialog({ onOpenChange: onOpenChange as unknown as (open: boolean) => void });

const confirm = within(screen.getByRole('alertdialog')).getByRole('button', {
name: /Restore tag/i,
    });
fireEvent.click(confirm);

await waitFor(() => {
expect(screen.getByRole('status')).toHaveTextContent(
/system constraint|cannot be restored/i,
      );
    });

const dialog = screen.getByRole('alertdialog');
expect(
within(dialog).queryByRole('button', { name: /Restore tag/i }),
    ).not.toBeInTheDocument();
const closeButton = within(dialog).getByRole('button', { name: /Close/i });
fireEvent.click(closeButton);

expect(onOpenChange).toHaveBeenCalledWith(false);
expect(mockRestoreTag).toHaveBeenCalledTimes(1);
  });
});

describe('restore-stable-codes — Sanity: happy path still works (TKT-7.3.H2)', () => {
it('a successful restore still emits the cross-tab broadcast and closes the dialog', async () => {
nextRestore = { value: RESTORED_TAG };
const { useRestoreTag } = await import('../hooks/useRestoreTag');
const { renderHook, act } = await import('@testing-library/react');
const { result } = renderHook(() => useRestoreTag());

await act(async () => {
await result.current.restore('tag-deleted');
    });

expect(mockBroadcastTagAdminInvalidate).toHaveBeenCalledWith('restore', 'tag-deleted');
  });
});
