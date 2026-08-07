/**
 * `TournamentEditForm` unit tests.
 *
 * Source epic:   Epic 7.7 — Tournament Admin: Create, Update, Delete.
 * Source ticket: TKT-7.7.D3.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';

import { ApiError } from '@/lib/api/core/ApiError';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const TOURNAMENT_ID = '00000000-0000-4000-8000-000000000001';

function makeTournament(
  overrides: Partial<{
    status: 'upcoming' | 'registration' | 'ongoing' | 'finished' | 'cancelled';
    difficulty: 'easy' | 'medium' | 'hard';
  }> = {},
) {
  return {
    tournamentId: TOURNAMENT_ID,
    title: 'Spring Cup',
    description: 'Annual Spring Cup tournament.',
    difficulty: (overrides.difficulty ?? 'medium') as 'easy' | 'medium' | 'hard',
    status: (overrides.status ?? 'upcoming') as
      | 'upcoming'
      | 'registration'
      | 'ongoing'
      | 'finished'
      | 'cancelled',
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

const UPDATED_TOURNAMENT = {
  ...makeTournament(),
  title: 'Updated Spring Cup',
};

// The AuditActionShell redacts `description` and `prize` in the `after`
// breadcrumb payload. The `onSuccess` call receives the redacted payload,
// not the raw hook result. This matcher accounts for the redaction.
function matchUpdatedTournament(actual: unknown): boolean {
  if (typeof actual !== 'object' || actual === null) return false;
  const t = actual as Record<string, unknown>;
  return (
    t.tournamentId === TOURNAMENT_ID &&
    t.title === 'Updated Spring Cup' &&
    t.status === 'upcoming'
  );
}

// ─── Shared harness (module-level, mutable) ──────────────────────────────────

const harness: {
  tournament: {
    tournament: ReturnType<typeof makeTournament> | null;
    isLoading: boolean;
    error: ApiError | null;
  };
  update: {
    update: ReturnType<typeof vi.fn>;
    error: ApiError | null;
    isPending: boolean;
  };
} = {
  tournament: {
    tournament: null,
    isLoading: true,
    error: null,
  },
  update: {
    update: vi.fn(),
    error: null,
    isPending: false,
  },
};

vi.mock(
  '@/features/admin/tournament-admin/hooks/useTournament',
  () => ({
    useTournament: () => ({
      get tournament() {
        return harness.tournament.tournament;
      },
      get isLoading() {
        return harness.tournament.isLoading;
      },
      get error() {
        return harness.tournament.error;
      },
    }),
  }),
);

vi.mock(
  '@/features/admin/tournament-admin/hooks/useUpdateTournament',
  () => ({
    useUpdateTournament: () => ({
      get update() {
        return harness.update.update;
      },
      get error() {
        return harness.update.error;
      },
      get isPending() {
        return harness.update.isPending;
      },
    }),
  }),
);

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  harness.tournament.tournament = null;
  harness.tournament.isLoading = true;
  harness.tournament.error = null;
  harness.update.error = null;
  harness.update.isPending = false;
  harness.update.update.mockReset();
  harness.update.update.mockResolvedValue(UPDATED_TOURNAMENT);
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

import { TournamentEditForm } from '../TournamentEditForm';

function renderForm(
  tournamentId = TOURNAMENT_ID,
  onSuccess = vi.fn(),
  onCancel = vi.fn(),
) {
  return render(
    <TournamentEditForm
      tournamentId={tournamentId}
      onSuccess={onSuccess}
      onCancel={onCancel}
    />,
  );
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('TKT-7.7.D3 — TournamentEditForm: loading state', () => {
  it('AC #2: renders a skeleton when loading', () => {
    // Default harness: isLoading=true → skeleton.
    renderForm();

    expect(
      screen.getByTestId('tournament-edit-form-loading'),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId('tournament-edit-form'),
    ).not.toBeInTheDocument();
  });

  it('AC #2: skeleton disappears when tournament loads', async () => {
    // Seed the harness BEFORE render so the component mounts with the loaded state.
    harness.tournament.isLoading = false;
    harness.tournament.tournament = makeTournament({ status: 'upcoming' });
    renderForm();

    await waitFor(() => {
      expect(
        screen.queryByTestId('tournament-edit-form-loading'),
      ).not.toBeInTheDocument();
    });
    expect(screen.getByTestId('tournament-edit-form')).toBeInTheDocument();
  });
});

describe('TKT-7.7.D3 — TournamentEditForm: prefilled fields', () => {
  it('AC #1: shows every documented field when loaded', () => {
    harness.tournament.isLoading = false;
    harness.tournament.tournament = makeTournament({ status: 'upcoming' });
    renderForm();

    expect(
      (screen.getByTestId('tournament-edit-input-title') as HTMLInputElement)
        .value,
    ).toBe('Spring Cup');
    expect(
      (
        screen.getByTestId(
          'tournament-edit-input-description',
        ) as HTMLTextAreaElement
      ).value,
    ).toBe('Annual Spring Cup tournament.');
    expect(
      (
        screen.getByTestId('tournament-edit-input-difficulty') as HTMLSelectElement
      ).value,
    ).toBe('medium');
  });
});

describe('TKT-7.7.D3 — TournamentEditForm: started-status guard', () => {
  it('AC #3: ongoing → cannot edit notice (no form)', () => {
    harness.tournament.isLoading = false;
    harness.tournament.tournament = makeTournament({ status: 'ongoing' });
    renderForm();

    expect(
      screen.getByTestId('tournament-edit-already-started'),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId('tournament-edit-form'),
    ).not.toBeInTheDocument();
  });

  it('AC #3: finished → cannot edit notice', () => {
    harness.tournament.isLoading = false;
    harness.tournament.tournament = makeTournament({ status: 'finished' });
    renderForm();

    expect(
      screen.getByTestId('tournament-edit-already-started'),
    ).toBeInTheDocument();
  });

  it('AC #3: cancelled → cannot edit notice', () => {
    harness.tournament.isLoading = false;
    harness.tournament.tournament = makeTournament({ status: 'cancelled' });
    renderForm();

    expect(
      screen.getByTestId('tournament-edit-already-started'),
    ).toBeInTheDocument();
  });

  it('AC #3: upcoming → form renders (not edit-blocking)', () => {
    harness.tournament.isLoading = false;
    harness.tournament.tournament = makeTournament({ status: 'upcoming' });
    renderForm();

    expect(screen.getByTestId('tournament-edit-form')).toBeInTheDocument();
    expect(
      screen.queryByTestId('tournament-edit-already-started'),
    ).not.toBeInTheDocument();
  });
});

describe('TKT-7.7.D3 — TournamentEditForm: submit + success', () => {
  it('AC #4 + #5: submit calls onSuccess with the updated tournament', async () => {
    const onSuccess = vi.fn();
    harness.tournament.isLoading = false;
    harness.tournament.tournament = makeTournament({ status: 'upcoming' });

    renderForm(TOURNAMENT_ID, onSuccess);

    fireEvent.change(screen.getByTestId('tournament-edit-input-title'), {
      target: { value: 'Updated Spring Cup' },
    });

    const submit = screen.getByTestId('tournament-edit-submit');
    await act(async () => {
      fireEvent.click(submit);
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });
    // The shell's `after` breadcrumb carries the redacted tournament
    // (description/prize replaced with '[redacted]'), so we match on
    // the stable fields rather than exact equality.
    expect(matchUpdatedTournament(onSuccess.mock.calls[0]?.[0])).toBe(true);
  });

  it('AC #4: the submitted payload carries the tournament id', async () => {
    harness.tournament.isLoading = false;
    harness.tournament.tournament = makeTournament({ status: 'upcoming' });

    renderForm();

    const submit = screen.getByTestId('tournament-edit-submit');
    await act(async () => {
      fireEvent.click(submit);
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(harness.update.update).toHaveBeenCalledTimes(1);
    });
    const [id, payload] = harness.update.update.mock.calls[0];
    expect(id).toBe(TOURNAMENT_ID);
    expect(typeof payload).toBe('object');
  });
});

describe('TKT-7.7.D3 — TournamentEditForm: prefetch errors', () => {
  it('AC #7: TOURNAMENT_NOT_FOUND → not-found notice', () => {
    harness.tournament.isLoading = false;
    harness.tournament.tournament = null;
    harness.tournament.error = makeApiError('TOURNAMENT_NOT_FOUND', 404);
    renderForm();

    expect(
      screen.getByTestId('tournament-edit-not-found'),
    ).toBeInTheDocument();
  });

  it('AC #9: ADMIN_FORBIDDEN on prefetch → RequestIdBanner', () => {
    harness.tournament.isLoading = false;
    harness.tournament.tournament = null;
    harness.tournament.error = makeApiError(
      'ADMIN_FORBIDDEN',
      403,
      'req-forbid',
    );
    renderForm();

    expect(
      screen.getByTestId('tournament-edit-form-prefetch-forbidden'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('admin-request-id-banner'),
    ).toBeInTheDocument();
  });
});

describe('TKT-7.7.D3 — TournamentEditForm: mutation error branches', () => {
  it('AC #8: TOURNAMENT_VALIDATION → inline form error banner', () => {
    harness.tournament.isLoading = false;
    harness.tournament.tournament = makeTournament({ status: 'upcoming' });
    harness.update.error = makeApiError('TOURNAMENT_VALIDATION', 400);
    renderForm();

    expect(screen.getByTestId('tournament-edit-form')).toBeInTheDocument();
    expect(
      screen.getByTestId('tournament-edit-form-error'),
    ).toBeInTheDocument();
  });

  it('AC #6: TOURNAMENT_ALREADY_STARTED → non-blocking notice', () => {
    harness.tournament.isLoading = false;
    harness.tournament.tournament = makeTournament({ status: 'upcoming' });
    harness.update.error = makeApiError('TOURNAMENT_ALREADY_STARTED', 409);
    renderForm();

    expect(screen.getByTestId('tournament-edit-form')).toBeInTheDocument();
    expect(
      screen.getByTestId('tournament-edit-already-started-notice'),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId('admin-request-id-banner'),
    ).not.toBeInTheDocument();
  });

  it('AC #9: ADMIN_FORBIDDEN on update → RequestIdBanner', () => {
    harness.tournament.isLoading = false;
    harness.tournament.tournament = makeTournament({ status: 'upcoming' });
    harness.update.error = makeApiError('ADMIN_FORBIDDEN', 403, 'req-abc');
    renderForm();

    expect(screen.getByTestId('tournament-edit-form')).toBeInTheDocument();
    expect(
      screen.getByTestId('admin-request-id-banner'),
    ).toBeInTheDocument();
  });
});

describe('TKT-7.7.D3 — TournamentEditForm: cancel', () => {
  it('cancel button invokes onCancel', () => {
    const onCancel = vi.fn();
    harness.tournament.isLoading = false;
    harness.tournament.tournament = makeTournament({ status: 'upcoming' });

    renderForm(TOURNAMENT_ID, vi.fn(), onCancel);

    fireEvent.click(screen.getByTestId('tournament-edit-cancel'));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
