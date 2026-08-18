

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
act,
fireEvent,
render,
screen,
waitFor,
} from '@testing-library/react';

import { ApiError } from '@/lib/api/core/ApiError';

const TOURNAMENT_ID = '00000000-0000-4000-8000-000000000001';

function makeTournament() {
return {
tournamentId: TOURNAMENT_ID,
title: 'Spring Cup',
description: null,
difficulty: 'medium' as const,
status: 'upcoming' as const,
prize: null,
startAt: '2026-09-01T12:00:00.000Z',
endAt: '2026-09-02T12:00:00.000Z',
maxParticipants: 16,
categoryId: null,
ownerUserId: 'user-1',
createdAt: '2026-08-01T00:00:00.000Z',
updatedAt: '2026-08-01T00:00:00.000Z',
  };
}

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

const CASCADE_DATA = {
participants: 10,
rounds: 3,
leaderboards: 1,
};

const cascadeHarness = {
cascade: null as (typeof CASCADE_DATA & { hasMoreParticipants?: boolean }) | null,
isLoading: false,
};

const deleteHarness = {
remove: vi.fn(),
error: null as ApiError | null,
isPending: false,
};

vi.mock('@/features/admin/tournament-admin/hooks/useTournamentCascade', () => ({
useTournamentCascade: () => ({
cascade: cascadeHarness.cascade,
isLoading: cascadeHarness.isLoading,
  }),
}));

vi.mock('@/features/admin/tournament-admin/hooks/useDeleteTournament', () => ({
useDeleteTournament: () => ({
remove: deleteHarness.remove,
error: deleteHarness.error,
isPending: deleteHarness.isPending,
  }),
}));

vi.mock('@/features/admin/components/TypedConfirmDialog', () => ({
TypedConfirmDialog: ({
open,
onConfirm,
onCancel,
pending,
previousError,
children,
  }: {
open: boolean;
operation: string;
onConfirm: () => void;
onCancel: () => void;
pending: boolean;
previousError: ApiError | null;
children?: React.ReactNode;
  }) => {
if (!open) return null;
return (
<div data-testid="typed-confirm-dialog" data-pending={pending}>
{children}
<button
type="button"
data-testid="typed-confirm-dialog-confirm"
onClick={onConfirm}
disabled={pending}
        >
Confirm
        </button>
<button
type="button"
data-testid="typed-confirm-dialog-cancel"
onClick={onCancel}
disabled={pending}
        >
Cancel
        </button>
{previousError ? (
<div data-testid="admin-request-id-banner" data-code={previousError.code} />
        ) : null}
</div>
    );
  },
}));

beforeEach(() => {
cascadeHarness.cascade = CASCADE_DATA;
cascadeHarness.isLoading = false;
deleteHarness.remove.mockReset();
deleteHarness.remove.mockResolvedValue(undefined);
deleteHarness.error = null;
deleteHarness.isPending = false;
});

import { TournamentDeleteDialog } from '../TournamentDeleteDialog';

function renderDialog(
open = true,
onClose = vi.fn(),
onAlreadyStarted = vi.fn(),
onNotFound = vi.fn(),
) {
return render(
<TournamentDeleteDialog
open={open}
tournament={makeTournament()}
onClose={onClose}
onAlreadyStarted={onAlreadyStarted}
onNotFound={onNotFound}
    />,
  );
}

describe('TKT-7.7.D4 — TournamentDeleteDialog: render states', () => {
it('AC #2: renders nothing when open=false', () => {
renderDialog(false);

expect(
screen.queryByTestId('typed-confirm-dialog'),
    ).not.toBeInTheDocument();
  });

it('AC #2: renders the cascade notice at the top when open', () => {
cascadeHarness.isLoading = false;
cascadeHarness.cascade = CASCADE_DATA;
renderDialog();

expect(
screen.getByTestId('tournament-cascade-notice'),
    ).toBeInTheDocument();
  });

it('AC #2: renders the typed-confirm dialog', () => {
renderDialog();

expect(
screen.getByTestId('typed-confirm-dialog'),
    ).toBeInTheDocument();
  });
});

describe('TKT-7.7.D4 — TournamentDeleteDialog: confirm flow', () => {
it('AC #4: confirm click calls the delete hook and closes on success', async () => {
const onClose = vi.fn();
renderDialog(true, onClose);

await act(async () => {
fireEvent.click(screen.getByTestId('typed-confirm-dialog-confirm'));
await Promise.resolve();
    });

await waitFor(() => {
expect(deleteHarness.remove).toHaveBeenCalledTimes(1);
    });
expect(deleteHarness.remove).toHaveBeenCalledWith(TOURNAMENT_ID, {
confirmString: 'DELETE TOURNAMENT',
    });
  });
});

describe('TKT-7.7.D4 — TournamentDeleteDialog: error branches', () => {
it('AC #5: TOURNAMENT_HAS_PARTICIPANTS → notice + dialog stays open', () => {
cascadeHarness.cascade = CASCADE_DATA;
deleteHarness.error = makeApiError('TOURNAMENT_HAS_PARTICIPANTS', 409);
renderDialog();

expect(
screen.getByTestId('tournament-delete-has-participants-notice'),
    ).toBeInTheDocument();
expect(
screen.getByTestId('typed-confirm-dialog'),
    ).toBeInTheDocument();
  });

it('AC #6: TOURNAMENT_ALREADY_STARTED → closes + onAlreadyStarted', () => {
const onAlreadyStarted = vi.fn();
deleteHarness.error = makeApiError('TOURNAMENT_ALREADY_STARTED', 409);
renderDialog(true, vi.fn(), onAlreadyStarted);

expect(onAlreadyStarted).toHaveBeenCalledTimes(1);
expect(
screen.queryByTestId('typed-confirm-dialog'),
    ).not.toBeInTheDocument();
  });

it('AC #7: TOURNAMENT_NOT_FOUND → closes + onNotFound', () => {
const onNotFound = vi.fn();
deleteHarness.error = makeApiError('TOURNAMENT_NOT_FOUND', 404);
renderDialog(true, vi.fn(), vi.fn(), onNotFound);

expect(onNotFound).toHaveBeenCalledTimes(1);
expect(
screen.queryByTestId('typed-confirm-dialog'),
    ).not.toBeInTheDocument();
  });

it('AC #8: IRREVERSIBLE_CONFIRM_REQUIRED → dialog stays open', () => {
deleteHarness.error = makeApiError('IRREVERSIBLE_CONFIRM_REQUIRED', 422);
renderDialog();

expect(
screen.getByTestId('typed-confirm-dialog'),
    ).toBeInTheDocument();
  });

it('AC #9: ADMIN_FORBIDDEN → RequestIdBanner', () => {
deleteHarness.error = makeApiError('ADMIN_FORBIDDEN', 403, 'req-forbid');
renderDialog();

const banners = screen.getAllByTestId('admin-request-id-banner');
expect(banners.length).toBeGreaterThanOrEqual(1);
  });
});

describe('TKT-7.7.D4 — TournamentDeleteDialog: cascade states', () => {
it('renders the cascade loading skeleton when isLoading=true', () => {
cascadeHarness.isLoading = true;
cascadeHarness.cascade = null;
renderDialog();

expect(
screen.getByTestId('tournament-cascade-notice-loading'),
    ).toBeInTheDocument();
  });

it('renders the unavailable notice when cascade=null and not loading', () => {
cascadeHarness.isLoading = false;
cascadeHarness.cascade = null;
renderDialog();

expect(
screen.getByTestId('tournament-cascade-notice-unavailable'),
    ).toBeInTheDocument();
  });
});
