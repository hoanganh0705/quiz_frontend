/**
 * `TournamentCreateForm` — the create form for tournament admin.
 *
 * Source epic:   Epic 7.7 — Tournament Admin: Create, Update, Delete.
 * Source ticket: TKT-7.7.D2.
 *
 * ## What this component renders
 *
 * A controlled form that captures the documented `CreateTournamentDto`
 * fields and runs the create mutation through `AuditActionShell`. The
 * form is mounted by `TournamentAdminPage` when the admin selects
 * **New tournament** from the page-header action menu (D1).
 *
 * ## Form fields (per `CreateTournamentDto` / A1)
 *
 *   - `title`           (required, 1–255 chars)
 *   - `description`     (optional, ≤ 2000 chars)
 *   - `difficulty`      (required; `easy | medium | hard`)
 *   - `prize`           (optional, ≤ 1000 chars)
 *   - `startAt`         (required ISO 8601, must be in the future)
 *   - `endAt`           (required ISO 8601, must be strictly after `startAt`)
 *   - `maxParticipants` (optional, ≥ 2; empty means no limit)
 *   - `categoryId`      (optional UUID)
 *
 * ## Client-side validation (AC #2)
 *
 *   - `title` must be non-empty (already enforced by `required`).
 *   - `startAt > now` — wall-clock at submit time is the source of truth.
 *   - `endAt > startAt` — strict inequality.
 *   - `maxParticipants` is either empty or an integer ≥ 2.
 *   - `categoryId`, when supplied, must be a UUID.
 *
 * Validation errors surface inline next to the relevant field. The
 * submit button is disabled while the form is invalid; the click
 * handler re-checks validation and short-circuits if any field
 * fails. This keeps the audit trail clean — invalid submissions do
 * not fire a `started` breadcrumb.
 *
 * ## Audit trail (AC #3)
 *
 * On submit, the form wraps the mutation in `AuditActionShell`. The
 * shell:
 *
 *   - Emits a `started` breadcrumb carrying the form input as `before`.
 *   - Invokes the create hook (C2).
 *   - On success, emits a `success` breadcrumb with the new tournament
 *     payload.
 *   - On failure, emits a `failure` breadcrumb with the typed
 *     `errorCode`, `requestId`, `correlationId`, and a redacted
 *     payload derived from the `ApiError`.
 *
 * The shell redaction is configured to scrub `description` and
 * `prize` (free-text fields) from the breadcrumb payload — the
 * form's `before` snapshot is the unmodified input.
 *
 * ## Error branches (AC #5–#7)
 *
 *   - `TOURNAMENT_VALIDATION`         → inline form error banner.
 *   - `TOURNAMENT_SLUG_CONFLICT`     → inline form error banner
 *                                       (when the backend returns this
 *                                       code; not yet a member of the
 *                                       `ErrorCode` union).
 *   - `ADMIN_FORBIDDEN`               → `RequestIdBanner`.
 *   - everything else                 → `RequestIdBanner`.
 *
 * The form does not retry on its own. The shell's `retry` handle
 * is exposed on the submit button so the admin can re-fire the
 * mutation after reading the request id.
 *
 * ## Cross-batch invariants
 *
 *   - The form never calls services directly. The create hook
 *     (TKT-7.7.C2) is the only mutation surface.
 *   - On success the form calls `onSuccess(tournament)` and the page
 *     closes the form. The form does not reset internal state
 *     automatically — the parent re-mounts the form the next time
 *     it opens.
 *   - `RequestIdBanner` renders only when the error has a
 *     non-empty `requestId`.
 */

'use client';

import { useCallback, useMemo, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';

import { AuditActionShell } from '@/features/admin/components/AuditActionShell';
import { RequestIdBanner } from '@/features/admin/components/RequestIdBanner';

import { useCreateTournament } from '@/features/admin/tournament-admin/hooks/useCreateTournament';
import { getUserCopy } from '@/lib/api/error-codes';
import type { ApiError } from '@/lib/api/core/ApiError';

import type {
  TournamentCreateDto,
  TournamentDto,
} from '../admin-tournament-types';

// ─── Validation helpers ────────────────────────────────────────────────────

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

  const startAt = parseDateTimeLocal(state.startAt);
  if (startAt === null) {
    issues.push({
      field: 'startAt',
      message: 'Start time is required.',
    });
  } else if (startAt.getTime() <= now.getTime()) {
    issues.push({
      field: 'startAt',
      message: 'Start time must be in the future.',
    });
  }

  const endAt = parseDateTimeLocal(state.endAt);
  if (endAt === null) {
    issues.push({
      field: 'endAt',
      message: 'End time is required.',
    });
  } else if (startAt !== null && endAt.getTime() <= startAt.getTime()) {
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

/**
 * Parse a `datetime-local` input value (`YYYY-MM-DDTHH:mm`) into a
 * `Date`. Returns `null` when the input is empty or malformed.
 */
function parseDateTimeLocal(value: string): Date | null {
  if (value.length === 0) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

/**
 * Build the `TournamentCreateDto` shape from the controlled form
 * state. Returns `null` when the form is invalid (caller short-
 * circuits the mutation).
 */
function buildPayload(state: FormState): TournamentCreateDto | null {
  const title = state.title.trim();
  if (title.length === 0) return null;
  const startAt = parseDateTimeLocal(state.startAt);
  const endAt = parseDateTimeLocal(state.endAt);
  if (startAt === null || endAt === null) return null;
  if (startAt.getTime() >= endAt.getTime()) return null;

  const payload: TournamentCreateDto = {
    title,
    difficulty: state.difficulty,
    startAt: startAt.toISOString(),
    endAt: endAt.toISOString(),
  };

  if (state.description.length > 0) {
    // The generated schema types description/prize as `{ [key: string]: unknown }`,
    // which is an Orval quirk. We assign the raw string value.
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

// ─── Form state shape ──────────────────────────────────────────────────────

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

const INITIAL_FORM_STATE: FormState = {
  title: '',
  description: '',
  difficulty: 'medium',
  prize: '',
  startAt: '',
  endAt: '',
  maxParticipants: '',
  categoryId: '',
};

const DIFFICULTY_OPTIONS: ReadonlyArray<{
  value: 'easy' | 'medium' | 'hard';
  label: string;
}> = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
];

// ─── Error-message resolution ──────────────────────────────────────────────

const INLINE_ERROR_CODES = new Set(['TOURNAMENT_VALIDATION']);

function resolveInlineErrorMessage(code: string): string | null {
  if (code === 'TOURNAMENT_VALIDATION') {
    return getUserCopy('TOURNAMENT_VALIDATION').body;
  }
  if (code === 'TOURNAMENT_SLUG_CONFLICT') {
    // Defensive fallback — the typed code is not yet a member of the
    // `ErrorCode` union, so we can't call `getUserCopy` directly.
    return 'A tournament with this title already exists. Please choose a different title.';
  }
  return null;
}

// ─── Component props ────────────────────────────────────────────────────────

export interface TournamentCreateFormProps {
  /** Invoked on successful create with the new tournament payload. */
  onSuccess: (tournament: TournamentDto) => void;
  /** Invoked when the admin cancels the form (without creating). */
  onCancel: () => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function TournamentCreateForm({
  onSuccess,
  onCancel,
}: TournamentCreateFormProps): React.ReactElement {
  const { create, error, isPending } = useCreateTournament();

  const [state, setState] = useState<FormState>(INITIAL_FORM_STATE);
  const [touched, setTouched] = useState<boolean>(false);
  const [successHandled, setSuccessHandled] = useState<boolean>(false);

  const issues = useMemo<ReadonlyArray<ValidationIssue>>(
    () => validateForm(state, new Date()),
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

  const isValid = issues.length === 0;

  const updateField = useCallback(
    <K extends keyof FormState>(field: K, value: FormState[K]) => {
      setState((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const handleBreadcrumb = useCallback(
    (breadcrumb: unknown) => {
      if (successHandled) return;
      // The shell emits a `started` breadcrumb before the mutation
      // and a `success` breadcrumb after. Only the success breadcrumb
      // carries the new tournament payload; we surface
      // `onSuccess` exactly once, on the success breadcrumb.
      if (
        typeof breadcrumb === 'object' &&
        breadcrumb !== null &&
        'status' in breadcrumb &&
        (breadcrumb as { status?: string }).status === 'success'
      ) {
        const payload = (
          breadcrumb as unknown as { after: TournamentDto }
        ).after;
        if (payload !== undefined && payload !== null) {
          setSuccessHandled(true);
          onSuccess(payload);
        }
      }
    },
    [onSuccess, successHandled],
  );

  // Inline error banner is rendered for stable codes that are
  // friendly to display without a request id. Everything else
  // surfaces via `RequestIdBanner` (rendered by the AuditActionShell
  // when the error carries a requestId).
  const inlineErrorMessage =
    error !== null ? resolveInlineErrorMessage(error.code) : null;
  const showRequestIdBanner =
    error !== null &&
    inlineErrorMessage === null &&
    error.requestId.length > 0;

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        setTouched(true);
      }}
      data-testid="tournament-create-form"
      noValidate
    >
      <div className="space-y-2">
        <Label htmlFor="tournament-create-title">Title</Label>
        <Input
          id="tournament-create-title"
          name="title"
          value={state.title}
          onChange={(event) => updateField('title', event.target.value)}
          maxLength={255}
          placeholder="Spring Cup"
          aria-invalid={
            touched && issuesByField.title !== undefined ? 'true' : 'false'
          }
          data-testid="tournament-create-input-title"
        />
        {touched && issuesByField.title !== undefined ? (
          <p
            className="text-xs text-destructive"
            data-testid="tournament-create-error-title"
          >
            {issuesByField.title}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="tournament-create-description">Description</Label>
        <textarea
          id="tournament-create-description"
          name="description"
          value={state.description}
          onChange={(event) =>
            updateField('description', event.target.value)
          }
          maxLength={2000}
          placeholder="Tournament description (optional)"
          rows={3}
          aria-invalid={
            touched && issuesByField.description !== undefined
              ? 'true'
              : 'false'
          }
          data-testid="tournament-create-input-description"
          className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:border-default focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        />
        {touched && issuesByField.description !== undefined ? (
          <p
            className="text-xs text-destructive"
            data-testid="tournament-create-error-description"
          >
            {issuesByField.description}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="tournament-create-difficulty">Difficulty</Label>
        <select
          id="tournament-create-difficulty"
          name="difficulty"
          value={state.difficulty}
          onChange={(event) =>
            updateField(
              'difficulty',
              event.target.value as FormState['difficulty'],
            )
          }
          data-testid="tournament-create-input-difficulty"
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
        <Label htmlFor="tournament-create-prize">Prize</Label>
        <Input
          id="tournament-create-prize"
          name="prize"
          value={state.prize}
          onChange={(event) => updateField('prize', event.target.value)}
          maxLength={1000}
          placeholder="Prize description (optional)"
          aria-invalid={
            touched && issuesByField.prize !== undefined ? 'true' : 'false'
          }
          data-testid="tournament-create-input-prize"
        />
        {touched && issuesByField.prize !== undefined ? (
          <p
            className="text-xs text-destructive"
            data-testid="tournament-create-error-prize"
          >
            {issuesByField.prize}
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="tournament-create-startAt">Start time</Label>
          <Input
            id="tournament-create-startAt"
            name="startAt"
            type="datetime-local"
            value={state.startAt}
            onChange={(event) => updateField('startAt', event.target.value)}
            aria-invalid={
              touched && issuesByField.startAt !== undefined ? 'true' : 'false'
            }
            data-testid="tournament-create-input-startAt"
          />
          {touched && issuesByField.startAt !== undefined ? (
            <p
              className="text-xs text-destructive"
              data-testid="tournament-create-error-startAt"
            >
              {issuesByField.startAt}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="tournament-create-endAt">End time</Label>
          <Input
            id="tournament-create-endAt"
            name="endAt"
            type="datetime-local"
            value={state.endAt}
            onChange={(event) => updateField('endAt', event.target.value)}
            aria-invalid={
              touched && issuesByField.endAt !== undefined ? 'true' : 'false'
            }
            data-testid="tournament-create-input-endAt"
          />
          {touched && issuesByField.endAt !== undefined ? (
            <p
              className="text-xs text-destructive"
              data-testid="tournament-create-error-endAt"
            >
              {issuesByField.endAt}
            </p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="tournament-create-maxParticipants">
            Max participants
          </Label>
          <Input
            id="tournament-create-maxParticipants"
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
            data-testid="tournament-create-input-maxParticipants"
          />
          {touched && issuesByField.maxParticipants !== undefined ? (
            <p
              className="text-xs text-destructive"
              data-testid="tournament-create-error-maxParticipants"
            >
              {issuesByField.maxParticipants}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="tournament-create-categoryId">Category UUID</Label>
          <Input
            id="tournament-create-categoryId"
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
            data-testid="tournament-create-input-categoryId"
          />
          {touched && issuesByField.categoryId !== undefined ? (
            <p
              className="text-xs text-destructive"
              data-testid="tournament-create-error-categoryId"
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
          data-testid="tournament-create-form-error"
        >
          <p className="font-semibold">Could not create the tournament</p>
          <p className="mt-1">{inlineErrorMessage}</p>
        </div>
      ) : null}

      {showRequestIdBanner && error !== null ? (
        <RequestIdBanner error={error} />
      ) : null}

      <AuditActionShell
        action="tournament.create"
        before={state}
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
          return create(payload);
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
              data-testid="tournament-create-cancel"
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
              data-testid="tournament-create-submit"
            >
              {shell.isPending || isPending ? 'Creating…' : 'Create tournament'}
            </Button>
          </div>
        )}
      </AuditActionShell>
    </form>
  );
}
