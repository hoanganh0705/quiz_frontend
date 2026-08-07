/**
 * `TournamentEditForm` — the edit form for tournament admin.
 *
 * Source epic:   Epic 7.7 — Tournament Admin: Create, Update, Delete.
 * Source ticket: TKT-7.7.D3.
 *
 * ## What this component renders
 *
 * A controlled form that prefills the documented edit fields from
 * `useTournament(tournamentId)` (TKT-7.7.C5), runs the update mutation
 * through `AuditActionShell`, and surfaces the documented error branches.
 *
 * ## Lifecycle
 *
 *   1. **Loading** — `useTournament(id).isLoading === true`. Renders a
 *      skeleton (D5) so the page layout stays consistent.
 *   2. **Permission denied / `id === null`** — renders the documented
 *      permission-denied notice (defensive fallback; the page guards
 *      the route so this is rare).
 *   3. **Documented error — `TOURNAMENT_NOT_FOUND`** — renders the
 *      "tournament not found" notice and the page closes the form
 *      (the form also closes itself via `onCancel`).
 *   4. **Permission denied — `ADMIN_FORBIDDEN`** — renders
 *      `RequestIdBanner`.
 *   5. **Prefilled form** — `useTournament(id).tournament !== null`.
 *      The form inputs are seeded from the fetched row.
 *   6. **Started race** — if the prefilled tournament's status is
 *      edit-blocking (`ongoing | finished | cancelled`) the form
 *      renders the documented "cannot edit" notice in place of the
 *      inputs. This is the defensive guard for the race where the
 *      tournament started between the list fetch and the form open.
 *   7. **Submit** — runs through `AuditActionShell`. On success the
 *      form calls `onSuccess(tournament)` and the page closes.
 *
 * ## Error branches (AC #6–#9)
 *
 *   - `TOURNAMENT_ALREADY_STARTED` → non-blocking notice rendered
 *     in place of the form (the form reverts to the prefilled state;
 *     no retry).
 *   - `TOURNAMENT_NOT_FOUND`       → documented "tournament not found"
 *     notice; the form closes.
 *   - `TOURNAMENT_VALIDATION`       → inline form error banner.
 *   - `ADMIN_FORBIDDEN`             → `RequestIdBanner`.
 *   - everything else               → `RequestIdBanner`.
 *
 * ## Cross-batch invariants
 *
 *   - The form never calls services directly. The single-fetch and
 *     update hooks (TKT-7.7.C5 / C3) are the only I/O surface.
 *   - On success the form calls `onSuccess(tournament)`. The form
 *     does NOT reset its internal state automatically — the parent
 *     re-mounts the form the next time it opens.
 *   - `RequestIdBanner` renders only when the error has a
 *     non-empty `requestId`.
 */

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';

import { AuditActionShell } from '@/features/admin/components/AuditActionShell';
import { RequestIdBanner } from '@/features/admin/components/RequestIdBanner';

import { useTournament } from '@/features/admin/tournament-admin/hooks/useTournament';
import { useUpdateTournament } from '@/features/admin/tournament-admin/hooks/useUpdateTournament';
import { isTournamentStartedForEdit } from '@/features/admin/tournament-admin/tournament-id-validation';
import { getUserCopy } from '@/lib/api/error-codes';
import type { ApiError } from '@/lib/api/core/ApiError';

import type {
  TournamentDto,
  TournamentUpdateDto,
} from '../admin-tournament-types';

// ─── Helpers ────────────────────────────────────────────────────────────────

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Convert an ISO 8601 timestamp into the `datetime-local` input value
 * (`YYYY-MM-DDTHH:mm`). The conversion is in the **local** timezone
 * because the input is timezone-naive. The form submits the field
 * back as an ISO 8601 string in UTC.
 */
function isoToDateTimeLocal(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function dateTimeLocalToIso(value: string): string | null {
  if (value.length === 0) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

interface FormState {
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  prize: string;
  startAt: string;
  endAt: string;
  maxParticipants: string;
  categoryId: string;
}

function initialFormState(tournament: TournamentDto): FormState {
  return {
    title: tournament.title,
    description: tournament.description ?? '',
    difficulty: tournament.difficulty,
    prize: tournament.prize ?? '',
    startAt: isoToDateTimeLocal(tournament.startAt),
    endAt: isoToDateTimeLocal(tournament.endAt),
    maxParticipants:
      tournament.maxParticipants !== null && tournament.maxParticipants !== undefined
        ? String(tournament.maxParticipants)
        : '',
    categoryId: tournament.categoryId ?? '',
  };
}

interface ValidationIssue {
  readonly field: keyof FormState;
  readonly message: string;
}

function validateForm(
  state: FormState,
  now: Date,
): ReadonlyArray<ValidationIssue> {
  const issues: ValidationIssue[] = [];

  if (state.title.trim().length === 0) {
    issues.push({ field: 'title', message: 'Title is required.' });
  } else if (state.title.trim().length > 255) {
    issues.push({
      field: 'title',
      message: 'Title must be 255 characters or fewer.',
    });
  }

  if (state.description.length > 2000) {
    issues.push({
      field: 'description',
      message: 'Description must be 2000 characters or fewer.',
    });
  }

  if (state.prize.length > 1000) {
    issues.push({
      field: 'prize',
      message: 'Prize description must be 1000 characters or fewer.',
    });
  }

  const startAt = dateTimeLocalToIso(state.startAt);
  if (startAt === null) {
    issues.push({
      field: 'startAt',
      message: 'Start time is required.',
    });
  } else if (new Date(startAt).getTime() <= now.getTime()) {
    issues.push({
      field: 'startAt',
      message: 'Start time must be in the future.',
    });
  }

  const endAt = dateTimeLocalToIso(state.endAt);
  if (endAt === null) {
    issues.push({
      field: 'endAt',
      message: 'End time is required.',
    });
  } else if (startAt !== null && new Date(endAt).getTime() <= new Date(startAt).getTime()) {
    issues.push({
      field: 'endAt',
      message: 'End time must be after start time.',
    });
  }

  if (state.maxParticipants.length > 0) {
    const parsed = Number.parseInt(state.maxParticipants, 10);
    if (Number.isNaN(parsed) || parsed < 2) {
      issues.push({
        field: 'maxParticipants',
        message: 'Maximum participants must be a number ≥ 2.',
      });
    }
  }

  if (state.categoryId.length > 0 && !UUID_RE.test(state.categoryId)) {
    issues.push({
      field: 'categoryId',
      message: 'Category UUID is invalid.',
    });
  }

  return issues;
}

function buildPayload(state: FormState): TournamentUpdateDto | null {
  const title = state.title.trim();
  if (title.length === 0) return null;
  const startAt = dateTimeLocalToIso(state.startAt);
  const endAt = dateTimeLocalToIso(state.endAt);
  if (startAt === null || endAt === null) return null;
  if (new Date(startAt).getTime() >= new Date(endAt).getTime()) return null;

  const payload: TournamentUpdateDto = {
    title,
    difficulty: state.difficulty,
    startAt,
    endAt,
  };

  if (state.description.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (payload as any).description = state.description;
  }
  if (state.prize.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (payload as any).prize = state.prize;
  }
  if (state.maxParticipants.length > 0) {
    const parsed = Number.parseInt(state.maxParticipants, 10);
    if (!Number.isNaN(parsed) && parsed >= 2) {
      payload.maxParticipants = parsed;
    }
  }
  if (state.categoryId.length > 0 && UUID_RE.test(state.categoryId)) {
    payload.categoryId = state.categoryId;
  }

  return payload;
}

const DIFFICULTY_OPTIONS: ReadonlyArray<{
  value: 'easy' | 'medium' | 'hard';
  label: string;
}> = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
];

// ─── Error resolution ──────────────────────────────────────────────────────

const INLINE_ERROR_CODES = new Set(['TOURNAMENT_VALIDATION']);

function resolveInlineErrorMessage(code: string): string | null {
  if (code === 'TOURNAMENT_VALIDATION') {
    return getUserCopy('TOURNAMENT_VALIDATION').body;
  }
  return null;
}

// ─── Component props ────────────────────────────────────────────────────────

export interface TournamentEditFormProps {
  /** Tournament id to edit. */
  tournamentId: string;
  /** Invoked on successful update with the patched tournament payload. */
  onSuccess: (tournament: TournamentDto) => void;
  /** Invoked when the admin cancels the form (without updating). */
  onCancel: () => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function TournamentEditForm({
  tournamentId,
  onSuccess,
  onCancel,
}: TournamentEditFormProps): React.ReactElement {
  const {
    tournament,
    isLoading: isPrefilling,
    error: prefetchError,
  } = useTournament(tournamentId);
  const { update, error, isPending } = useUpdateTournament();

  const [state, setState] = useState<FormState | null>(null);
  const [touched, setTouched] = useState<boolean>(false);
  const [successHandled, setSuccessHandled] = useState<boolean>(false);

  // Seed form state when the prefilled tournament lands.
  useEffect(() => {
    if (tournament !== null && state === null) {
      setState(initialFormState(tournament));
    }
  }, [tournament, state]);

  const issues = useMemo<ReadonlyArray<ValidationIssue>>(
    () => (state !== null ? validateForm(state, new Date()) : []),
    [state],
  );
  const issuesByField = useMemo(() => {
    const map: Partial<Record<keyof FormState, string>> = {};
    for (const issue of issues) {
      if (map[issue.field] === undefined) {
        map[issue.field] = issue.message;
      }
    }
    return map;
  }, [issues]);

  const isValid = state !== null && issues.length === 0;
  const started = tournament !== null && isTournamentStartedForEdit(tournament);

  const updateField = useCallback(
    <K extends keyof FormState>(field: K, value: FormState[K]) => {
      setState((prev) => (prev === null ? null : { ...prev, [field]: value }));
    },
    [],
  );

  const handleBreadcrumb = useCallback(
    (breadcrumb: unknown) => {
      if (successHandled) return;
      if (
        typeof breadcrumb === 'object' &&
        breadcrumb !== null &&
        'status' in breadcrumb &&
        (breadcrumb as { status?: string }).status === 'success'
      ) {
        const payload = (breadcrumb as unknown as { after: TournamentDto }).after;
        if (payload !== undefined && payload !== null) {
          setSuccessHandled(true);
          onSuccess(payload);
        }
      }
    },
    [onSuccess, successHandled],
  );

  // ─── Prefetch error: TOURNAMENT_NOT_FOUND ────────────────────────
  // Check errors BEFORE the loading/null guard so error notices render
  // even when the form state hasn't been seeded yet.
  if (
    prefetchError !== null &&
    prefetchError.code === 'TOURNAMENT_NOT_FOUND'
  ) {
    return (
      <div
        role="alert"
        className="space-y-3 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-900"
        data-testid="tournament-edit-not-found"
      >
        <p className="font-semibold">Tournament not found</p>
        <p>
          This tournament no longer exists. It may have been deleted by
          another admin.
        </p>
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            data-testid="tournament-edit-not-found-close"
          >
            Close
          </Button>
        </div>
      </div>
    );
  }

  // ─── Prefetch error: ADMIN_FORBIDDEN → RequestIdBanner ───────────
  if (
    prefetchError !== null &&
    prefetchError.code === 'ADMIN_FORBIDDEN' &&
    prefetchError.requestId.length > 0
  ) {
    return (
      <div
        className="space-y-3"
        data-testid="tournament-edit-form-prefetch-forbidden"
      >
        <RequestIdBanner error={prefetchError} />
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            data-testid="tournament-edit-prefetch-forbidden-close"
          >
            Close
          </Button>
        </div>
      </div>
    );
  }

  // ─── Other prefetch error (rare) ─────────────────────────────────
  if (prefetchError !== null) {
    return (
      <div
        role="alert"
        className="space-y-3 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-xs text-red-900"
        data-testid="tournament-edit-form-prefetch-error"
      >
        <p className="font-semibold">Could not load the tournament</p>
        <p>{prefetchError.message}</p>
        {prefetchError.requestId.length > 0 ? (
          <RequestIdBanner error={prefetchError} />
        ) : null}
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            data-testid="tournament-edit-prefetch-error-close"
          >
            Close
          </Button>
        </div>
      </div>
    );
  }

  // ─── Loading state ──────────────────────────────────────────────
  // Rendered after error checks so error notices appear even when
  // the form state hasn't been seeded yet.
  if (isPrefilling || state === null) {
    return (
      <div
        className="space-y-3"
        data-testid="tournament-edit-form-loading"
        aria-busy="true"
      >
        <div className="h-9 w-1/2 animate-pulse rounded bg-muted" />
        <div className="h-9 w-full animate-pulse rounded bg-muted" />
        <div className="h-9 w-full animate-pulse rounded bg-muted" />
        <div className="h-9 w-full animate-pulse rounded bg-muted" />
      </div>
    );
  }

  // ─── Started race: render the "cannot edit" notice in place ─────
  if (started) {
    return (
      <div
        role="alert"
        className="space-y-3 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-900"
        data-testid="tournament-edit-already-started"
      >
        <p className="font-semibold">Tournament already started</p>
        <p>
          This tournament has already started and cannot be edited.
        </p>
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            data-testid="tournament-edit-already-started-close"
          >
            Close
          </Button>
        </div>
      </div>
    );
  }

  // ─── Mutation outcome branches ───────────────────────────────────
  const inlineErrorMessage =
    error !== null ? resolveInlineErrorMessage(error.code) : null;
  const showRequestIdBanner =
    error !== null &&
    inlineErrorMessage === null &&
    error.code !== 'TOURNAMENT_ALREADY_STARTED' &&
    error.code !== 'TOURNAMENT_NOT_FOUND' &&
    error.requestId.length > 0;
  const showAlreadyStartedNotice =
    error !== null && error.code === 'TOURNAMENT_ALREADY_STARTED';

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        setTouched(true);
      }}
      data-testid="tournament-edit-form"
      noValidate
    >
      <div className="space-y-2">
        <Label htmlFor="tournament-edit-title">Title</Label>
        <Input
          id="tournament-edit-title"
          name="title"
          value={state.title}
          onChange={(event) => updateField('title', event.target.value)}
          maxLength={255}
          aria-invalid={
            touched && issuesByField.title !== undefined ? 'true' : 'false'
          }
          data-testid="tournament-edit-input-title"
        />
        {touched && issuesByField.title !== undefined ? (
          <p
            className="text-xs text-destructive"
            data-testid="tournament-edit-error-title"
          >
            {issuesByField.title}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="tournament-edit-description">Description</Label>
        <textarea
          id="tournament-edit-description"
          name="description"
          value={state.description}
          onChange={(event) =>
            updateField('description', event.target.value)
          }
          maxLength={2000}
          rows={3}
          aria-invalid={
            touched && issuesByField.description !== undefined
              ? 'true'
              : 'false'
          }
          data-testid="tournament-edit-input-description"
          className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:border-default focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="tournament-edit-difficulty">Difficulty</Label>
        <select
          id="tournament-edit-difficulty"
          name="difficulty"
          value={state.difficulty}
          onChange={(event) =>
            updateField(
              'difficulty',
              event.target.value as FormState['difficulty'],
            )
          }
          data-testid="tournament-edit-input-difficulty"
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:border-default focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        >
          {DIFFICULTY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="tournament-edit-prize">Prize</Label>
        <Input
          id="tournament-edit-prize"
          name="prize"
          value={state.prize}
          onChange={(event) => updateField('prize', event.target.value)}
          maxLength={1000}
          data-testid="tournament-edit-input-prize"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="tournament-edit-startAt">Start time</Label>
          <Input
            id="tournament-edit-startAt"
            name="startAt"
            type="datetime-local"
            value={state.startAt}
            onChange={(event) => updateField('startAt', event.target.value)}
            aria-invalid={
              touched && issuesByField.startAt !== undefined ? 'true' : 'false'
            }
            data-testid="tournament-edit-input-startAt"
          />
          {touched && issuesByField.startAt !== undefined ? (
            <p
              className="text-xs text-destructive"
              data-testid="tournament-edit-error-startAt"
            >
              {issuesByField.startAt}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="tournament-edit-endAt">End time</Label>
          <Input
            id="tournament-edit-endAt"
            name="endAt"
            type="datetime-local"
            value={state.endAt}
            onChange={(event) => updateField('endAt', event.target.value)}
            aria-invalid={
              touched && issuesByField.endAt !== undefined ? 'true' : 'false'
            }
            data-testid="tournament-edit-input-endAt"
          />
          {touched && issuesByField.endAt !== undefined ? (
            <p
              className="text-xs text-destructive"
              data-testid="tournament-edit-error-endAt"
            >
              {issuesByField.endAt}
            </p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="tournament-edit-maxParticipants">
            Max participants
          </Label>
          <Input
            id="tournament-edit-maxParticipants"
            name="maxParticipants"
            type="number"
            min={2}
            value={state.maxParticipants}
            onChange={(event) =>
              updateField('maxParticipants', event.target.value)
            }
            placeholder="Unlimited"
            aria-invalid={
              touched && issuesByField.maxParticipants !== undefined
                ? 'true'
                : 'false'
            }
            data-testid="tournament-edit-input-maxParticipants"
          />
          {touched && issuesByField.maxParticipants !== undefined ? (
            <p
              className="text-xs text-destructive"
              data-testid="tournament-edit-error-maxParticipants"
            >
              {issuesByField.maxParticipants}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="tournament-edit-categoryId">Category UUID</Label>
          <Input
            id="tournament-edit-categoryId"
            name="categoryId"
            value={state.categoryId}
            onChange={(event) =>
              updateField('categoryId', event.target.value)
            }
            placeholder="Optional"
            aria-invalid={
              touched && issuesByField.categoryId !== undefined
                ? 'true'
                : 'false'
            }
            data-testid="tournament-edit-input-categoryId"
          />
          {touched && issuesByField.categoryId !== undefined ? (
            <p
              className="text-xs text-destructive"
              data-testid="tournament-edit-error-categoryId"
            >
              {issuesByField.categoryId}
            </p>
          ) : null}
        </div>
      </div>

      {inlineErrorMessage !== null ? (
        <div
          role="alert"
          className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-900"
          data-testid="tournament-edit-form-error"
        >
          <p className="font-semibold">Could not save the tournament</p>
          <p className="mt-1">{inlineErrorMessage}</p>
        </div>
      ) : null}

      {showAlreadyStartedNotice ? (
        <div
          role="alert"
          className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900"
          data-testid="tournament-edit-already-started-notice"
        >
          <p className="font-semibold">Tournament already started</p>
          <p className="mt-1">
            The tournament started while you were editing. The form
            reverts to the prefilled state.
          </p>
        </div>
      ) : null}

      {showRequestIdBanner && error !== null ? (
        <RequestIdBanner error={error} />
      ) : null}

      <AuditActionShell
        action="tournament.update"
        before={{ id: tournamentId, input: state }}
        redactFields={['description', 'prize']}
        mutate={async () => {
          if (!isValid) {
            setTouched(true);
            throw new Error('Form is invalid');
          }
          const payload = buildPayload(state);
          if (payload === null) {
            setTouched(true);
            throw new Error('Form is invalid');
          }
          return update(tournamentId, payload);
        }}
        onBreadcrumb={handleBreadcrumb}
      >
        {(shell) => (
          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={shell.isPending}
              data-testid="tournament-edit-cancel"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="default"
              disabled={!isValid || shell.isPending}
              onClick={async () => {
                setTouched(true);
                if (!isValid) return;
                await shell.retry();
              }}
              data-testid="tournament-edit-submit"
            >
              {shell.isPending || isPending ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        )}
      </AuditActionShell>
    </form>
  );
}
