

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
act,
fireEvent,
render,
screen,
waitFor,
} from '@testing-library/react';

import { ApiError } from '@/lib/api/core/ApiError';

const mockCreate = vi.hoisted(() => vi.fn());
const mockReset = vi.hoisted(() => vi.fn());

const createState = vi.hoisted(() => ({
isPending: false,
error: null as ApiError | null,
beforeInput: null,
afterTournament: null,
}));

vi.mock(
'@/features/admin/tournament-admin/hooks/useCreateTournament',
() => ({
useCreateTournament: () => ({
create: mockCreate,
isPending: createState.isPending,
error: createState.error,
reset: mockReset,
audit: {
beforeInput: createState.beforeInput,
afterTournament: createState.afterTournament,
      },
    }),
  }),
);

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

const CREATED_TOURNAMENT = {
tournamentId: '00000000-0000-4000-8000-000000000099',
title: 'Spring Cup',
status: 'upcoming',
};

function futureStart(offsetMinutes = 60): string {
const d = new Date(Date.now() + offsetMinutes * 60_000);

const pad = (n: number) => n.toString().padStart(2, '0');
return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function futureEnd(startValue: string, durationMinutes = 120): string {
const d = new Date(startValue);
d.setMinutes(d.getMinutes() + durationMinutes);
const pad = (n: number) => n.toString().padStart(2, '0');
return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

beforeEach(() => {
mockCreate.mockReset();
mockReset.mockReset();
createState.isPending = false;
createState.error = null;
createState.beforeInput = null;
createState.afterTournament = null;
mockCreate.mockResolvedValue(CREATED_TOURNAMENT);
});

import { TournamentCreateForm } from '../TournamentCreateForm';

function renderForm(onSuccess = vi.fn(), onCancel = vi.fn()) {

return render(
<TournamentCreateForm onSuccess={onSuccess} onCancel={onCancel} />,
  );
}

function fillValidForm() {
const start = futureStart(60);
const end = futureEnd(start, 120);
fireEvent.change(screen.getByTestId('tournament-create-input-title'), {
target: { value: 'Spring Cup' },
  });
fireEvent.change(screen.getByTestId('tournament-create-input-startAt'), {
target: { value: start },
  });
fireEvent.change(screen.getByTestId('tournament-create-input-endAt'), {
target: { value: end },
  });
}

describe('TKT-7.7.D2 — TournamentCreateForm: field rendering', () => {
it('AC #1: every documented field renders with the right input primitive', () => {
renderForm();

expect(
screen.getByTestId('tournament-create-input-title'),
    ).toBeInTheDocument();
expect(
screen.getByTestId('tournament-create-input-description'),
    ).toBeInTheDocument();
expect(
screen.getByTestId('tournament-create-input-difficulty'),
    ).toBeInTheDocument();
expect(
screen.getByTestId('tournament-create-input-prize'),
    ).toBeInTheDocument();
expect(
screen.getByTestId('tournament-create-input-startAt'),
    ).toBeInTheDocument();
expect(
screen.getByTestId('tournament-create-input-endAt'),
    ).toBeInTheDocument();
expect(
screen.getByTestId('tournament-create-input-maxParticipants'),
    ).toBeInTheDocument();
expect(
screen.getByTestId('tournament-create-input-categoryId'),
    ).toBeInTheDocument();
  });

it('AC #1: default difficulty is "medium"', () => {
renderForm();

expect(
screen.getByTestId('tournament-create-input-difficulty'),
    ).toHaveValue('medium');
  });
});

describe('TKT-7.7.D2 — TournamentCreateForm: client-side validation', () => {
it('AC #2: submit is disabled when title is empty', () => {
renderForm();

const submit = screen.getByTestId('tournament-create-submit');
expect(submit).toBeDisabled();
  });

it('AC #2: submit stays disabled when startAt is in the past', () => {
renderForm();

fireEvent.change(screen.getByTestId('tournament-create-input-title'), {
target: { value: 'Spring Cup' },
    });

const past = futureStart(-60);
fireEvent.change(screen.getByTestId('tournament-create-input-startAt'), {
target: { value: past },
    });
fireEvent.change(screen.getByTestId('tournament-create-input-endAt'), {
target: { value: futureEnd(past, 120) },
    });

expect(screen.getByTestId('tournament-create-submit')).toBeDisabled();
  });

it('AC #2: submit stays disabled when endAt <= startAt', () => {
renderForm();

fireEvent.change(screen.getByTestId('tournament-create-input-title'), {
target: { value: 'Spring Cup' },
    });
const start = futureStart(60);
fireEvent.change(screen.getByTestId('tournament-create-input-startAt'), {
target: { value: start },
    });

fireEvent.change(screen.getByTestId('tournament-create-input-endAt'), {
target: { value: start },
    });

expect(screen.getByTestId('tournament-create-submit')).toBeDisabled();
  });

it('AC #2: submit stays disabled when maxParticipants is below 2', () => {
renderForm();

fireEvent.change(screen.getByTestId('tournament-create-input-title'), {
target: { value: 'Spring Cup' },
    });
const start = futureStart(60);
const end = futureEnd(start, 120);
fireEvent.change(screen.getByTestId('tournament-create-input-startAt'), {
target: { value: start },
    });
fireEvent.change(screen.getByTestId('tournament-create-input-endAt'), {
target: { value: end },
    });
fireEvent.change(
screen.getByTestId('tournament-create-input-maxParticipants'),
{
target: { value: '1' },
      },
    );

expect(screen.getByTestId('tournament-create-submit')).toBeDisabled();
  });

it('AC #2: submit stays disabled when categoryId is not a UUID', () => {
renderForm();

fireEvent.change(screen.getByTestId('tournament-create-input-title'), {
target: { value: 'Spring Cup' },
    });
const start = futureStart(60);
const end = futureEnd(start, 120);
fireEvent.change(screen.getByTestId('tournament-create-input-startAt'), {
target: { value: start },
    });
fireEvent.change(screen.getByTestId('tournament-create-input-endAt'), {
target: { value: end },
    });
fireEvent.change(
screen.getByTestId('tournament-create-input-categoryId'),
{
target: { value: 'not-a-uuid' },
      },
    );

expect(screen.getByTestId('tournament-create-submit')).toBeDisabled();
  });

it('AC #2: surfaces inline errors when the form is submitted invalid', () => {
renderForm();

const form = screen.getByTestId('tournament-create-form');
fireEvent.submit(form);

expect(
screen.getByTestId('tournament-create-error-title'),
    ).toBeInTheDocument();
expect(
screen.getByTestId('tournament-create-error-startAt'),
    ).toBeInTheDocument();
expect(
screen.getByTestId('tournament-create-error-endAt'),
    ).toBeInTheDocument();
  });
});

describe('TKT-7.7.D2 — TournamentCreateForm: submit + success', () => {
it('AC #3 + #4: successful submit calls onSuccess(tournament)', async () => {
const onSuccess = vi.fn();
renderForm(onSuccess);

fillValidForm();

const submit = screen.getByTestId('tournament-create-submit');
await act(async () => {
fireEvent.click(submit);
await Promise.resolve();
    });

await waitFor(() => {
expect(mockCreate).toHaveBeenCalledTimes(1);
    });
expect(onSuccess).toHaveBeenCalledWith(CREATED_TOURNAMENT);
  });

it('AC #3: the input payload matches the documented DTO shape', async () => {
const onSuccess = vi.fn();
renderForm(onSuccess);

fillValidForm();
fireEvent.change(
screen.getByTestId('tournament-create-input-description'),
{ target: { value: 'A Spring Cup tournament.' } },
    );

fireEvent.click(screen.getByTestId('tournament-create-submit'));
await waitFor(() => {
expect(mockCreate).toHaveBeenCalledTimes(1);
    });

const payload = mockCreate.mock.calls[0]?.[0] as Record<string, unknown>;
expect(payload.title).toBe('Spring Cup');
expect(payload.description).toBe('A Spring Cup tournament.');
expect(payload.difficulty).toBe('medium');
expect(typeof payload.startAt).toBe('string');
expect(typeof payload.endAt).toBe('string');

expect(payload.startAt as string).toMatch(/Z$/);
expect(payload.endAt as string).toMatch(/Z$/);
  });

it('AC #3: optional fields are omitted when empty', async () => {
renderForm();

fillValidForm();

fireEvent.click(screen.getByTestId('tournament-create-submit'));
await waitFor(() => {
expect(mockCreate).toHaveBeenCalledTimes(1);
    });

const payload = mockCreate.mock.calls[0]?.[0] as Record<string, unknown>;
expect(payload.description).toBeUndefined();
expect(payload.prize).toBeUndefined();
expect(payload.maxParticipants).toBeUndefined();
expect(payload.categoryId).toBeUndefined();
  });
});

describe('TKT-7.7.D2 — TournamentCreateForm: error branches', () => {
it('AC #5: TOURNAMENT_VALIDATION → inline form error banner', () => {
createState.error = makeApiError('TOURNAMENT_VALIDATION', 400);
renderForm();

expect(
screen.getByTestId('tournament-create-form-error'),
    ).toBeInTheDocument();
expect(
screen.queryByTestId('admin-request-id-banner'),
    ).not.toBeInTheDocument();
  });

it('AC #6: TOURNAMENT_SLUG_CONFLICT → inline form error banner', () => {
createState.error = makeApiError('TOURNAMENT_SLUG_CONFLICT', 409);
renderForm();

expect(
screen.getByTestId('tournament-create-form-error'),
    ).toBeInTheDocument();
expect(
screen.getByTestId('tournament-create-form-error').textContent,
    ).toMatch(/already exists/i);
  });

it('AC #7: ADMIN_FORBIDDEN → RequestIdBanner', () => {
createState.error = makeApiError('ADMIN_FORBIDDEN', 403, 'req-abc-123');
renderForm();

expect(
screen.getByTestId('admin-request-id-banner'),
    ).toBeInTheDocument();
expect(
screen.queryByTestId('tournament-create-form-error'),
    ).not.toBeInTheDocument();
  });

it('AC #7: any other error → RequestIdBanner', () => {
createState.error = makeApiError('INTERNAL_SERVER_ERROR', 500, 'req-xyz');
renderForm();

expect(
screen.getByTestId('admin-request-id-banner'),
    ).toBeInTheDocument();
  });
});

describe('TKT-7.7.D2 — TournamentCreateForm: cancel', () => {
it('cancel button invokes onCancel', () => {
const onCancel = vi.fn();
renderForm(vi.fn(), onCancel);

fireEvent.click(screen.getByTestId('tournament-create-cancel'));

expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
