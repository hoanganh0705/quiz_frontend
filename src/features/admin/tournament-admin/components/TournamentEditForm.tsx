"use client";

import type React from "react";
import { useCallback, useMemo, useState } from "react";

import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { Textarea } from "@/components/ui/Textarea";
import { AuditActionShell } from "@/features/admin/components/AuditActionShell";
import { RequestIdBanner } from "@/features/admin/components/RequestIdBanner";
import { useTournament } from "@/features/admin/tournament-admin/hooks/useTournament";
import { useUpdateTournament } from "@/features/admin/tournament-admin/hooks/useUpdateTournament";
import { isTournamentStartedForEdit } from "@/features/admin/tournament-admin/tournament-id-validation";
import { getUserCopy } from "@/lib/api/error-codes";

import type {
  TournamentDto,
  TournamentUpdateDto,
} from "../admin-tournament-types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isoToDateTimeLocal(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => n.toString().padStart(2, "0");
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
  difficulty: "easy" | "medium" | "hard";
  prize: string;
  startAt: string;
  endAt: string;
  maxParticipants: string;
  categoryId: string;
}

function initialFormState(tournament: TournamentDto): FormState {
  return {
    title: tournament.title,
    description: tournament.description ?? "",
    difficulty: tournament.difficulty,
    prize: tournament.prize ?? "",
    startAt: isoToDateTimeLocal(tournament.startAt),
    endAt: isoToDateTimeLocal(tournament.endAt),
    maxParticipants:
      tournament.maxParticipants !== null &&
      tournament.maxParticipants !== undefined
        ? String(tournament.maxParticipants)
        : "",
    categoryId: tournament.categoryId ?? "",
  };
}

function isFormStateEqual(a: FormState, b: FormState): boolean {
  return (
    a.title === b.title &&
    a.description === b.description &&
    a.difficulty === b.difficulty &&
    a.prize === b.prize &&
    a.startAt === b.startAt &&
    a.endAt === b.endAt &&
    a.maxParticipants === b.maxParticipants &&
    a.categoryId === b.categoryId
  );
}

interface ValidationIssue {
  readonly field: keyof FormState;
  readonly message: string;
}

function validateForm(
  state: FormState,
  nowMs: number,
): ReadonlyArray<ValidationIssue> {
  const issues: ValidationIssue[] = [];

  if (state.title.trim().length === 0) {
    issues.push({ field: "title", message: "Title is required." });
  } else if (state.title.trim().length > 255) {
    issues.push({
      field: "title",
      message: "Title must be 255 characters or fewer.",
    });
  }

  if (state.description.length > 2000) {
    issues.push({
      field: "description",
      message: "Description must be 2000 characters or fewer.",
    });
  }

  if (state.prize.length > 1000) {
    issues.push({
      field: "prize",
      message: "Prize description must be 1000 characters or fewer.",
    });
  }

  const startAt = dateTimeLocalToIso(state.startAt);
  if (startAt === null) {
    issues.push({
      field: "startAt",
      message: "Start time is required.",
    });
  } else if (new Date(startAt).getTime() <= nowMs) {
    issues.push({
      field: "startAt",
      message: "Start time must be in the future.",
    });
  }

  const endAt = dateTimeLocalToIso(state.endAt);
  if (endAt === null) {
    issues.push({
      field: "endAt",
      message: "End time is required.",
    });
  } else if (
    startAt !== null &&
    new Date(endAt).getTime() <= new Date(startAt).getTime()
  ) {
    issues.push({
      field: "endAt",
      message: "End time must be after start time.",
    });
  }

  if (state.maxParticipants.length > 0) {
    const parsed = Number.parseInt(state.maxParticipants, 10);
    if (Number.isNaN(parsed) || parsed < 2) {
      issues.push({
        field: "maxParticipants",
        message: "Maximum participants must be a number ≥ 2.",
      });
    }
  }

  if (state.categoryId.length > 0 && !UUID_RE.test(state.categoryId)) {
    issues.push({
      field: "categoryId",
      message: "Category UUID is invalid.",
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
    payload.description =
      state.description as unknown as TournamentUpdateDto["description"];
  }
  if (state.prize.length > 0) {
    payload.prize = state.prize as unknown as TournamentUpdateDto["prize"];
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
  value: "easy" | "medium" | "hard";
  label: string;
}> = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
];

function resolveInlineErrorMessage(code: string): string | null {
  if (code === "TOURNAMENT_VALIDATION") {
    return getUserCopy("TOURNAMENT_VALIDATION").body;
  }
  return null;
}

export interface TournamentEditFormProps {
  tournamentId: string;

  onSuccess: (tournament: TournamentDto) => void;

  onCancel: () => void;
}

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

  const [referenceNowMs] = useState<number>(() => Date.now());
  const baseState = useMemo<FormState | null>(
    () => (tournament !== null ? initialFormState(tournament) : null),
    [tournament],
  );
  const [draft, setDraft] = useState<FormState | null>(null);
  const state = draft ?? baseState;
  const [touched, setTouched] = useState<boolean>(false);
  const [successHandled, setSuccessHandled] = useState<boolean>(false);

  const issues = useMemo<ReadonlyArray<ValidationIssue>>(
    () => (state !== null ? validateForm(state, referenceNowMs) : []),
    [state, referenceNowMs],
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
  const isDirty =
    state !== null && baseState !== null && !isFormStateEqual(state, baseState);
  const started = tournament !== null && isTournamentStartedForEdit(tournament);

  const updateField = useCallback(
    <K extends keyof FormState>(field: K, value: FormState[K]) => {
      setDraft((prev) => {
        const current = prev ?? baseState;
        return current === null ? null : { ...current, [field]: value };
      });
    },
    [baseState],
  );

  const handleBreadcrumb = useCallback(
    (breadcrumb: unknown) => {
      if (successHandled) return;
      if (
        typeof breadcrumb === "object" &&
        breadcrumb !== null &&
        "status" in breadcrumb &&
        (breadcrumb as { status?: string }).status === "success"
      ) {
        const payload = (breadcrumb as unknown as { after: TournamentDto })
          .after;
        if (payload !== undefined && payload !== null) {
          setSuccessHandled(true);
          onSuccess(payload);
        }
      }
    },
    [onSuccess, successHandled],
  );

  if (prefetchError !== null && prefetchError.code === "TOURNAMENT_NOT_FOUND") {
    return (
      <div
        role="alert"
        className="space-y-3 rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-800 dark:text-amber-300"
        data-testid="tournament-edit-not-found"
      >
        <p className="font-semibold">Tournament not found</p>
        <p>
          This tournament no longer exists. It may have been deleted by another
          admin.
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

  if (
    prefetchError !== null &&
    prefetchError.code === "ADMIN_FORBIDDEN" &&
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

  if (prefetchError !== null) {
    return (
      <div
        role="alert"
        className="space-y-3 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-xs text-destructive"
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

  if (isPrefilling || state === null) {
    return (
      <div
        className="space-y-4"
        role="status"
        data-testid="tournament-edit-form-loading"
        aria-busy="true"
        aria-label="Loading tournament details"
      >
        <Skeleton className="h-9 w-2/3" />
        <Skeleton className="h-20 w-full" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      </div>
    );
  }

  if (started) {
    return (
      <div
        role="alert"
        className="space-y-3 rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-800 dark:text-amber-300"
        data-testid="tournament-edit-already-started"
      >
        <p className="font-semibold">Tournament already started</p>
        <p>This tournament has already started and cannot be edited.</p>
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

  const inlineErrorMessage =
    error !== null ? resolveInlineErrorMessage(error.code) : null;
  const showRequestIdBanner =
    error !== null &&
    inlineErrorMessage === null &&
    error.code !== "TOURNAMENT_ALREADY_STARTED" &&
    error.code !== "TOURNAMENT_NOT_FOUND" &&
    error.requestId.length > 0;
  const showAlreadyStartedNotice =
    error !== null && error.code === "TOURNAMENT_ALREADY_STARTED";

  return (
    <AuditActionShell
      action="tournament.update"
      before={{ id: tournamentId, input: state }}
      redactFields={["description", "prize"]}
      mutate={async () => {
        if (!isValid) {
          setTouched(true);
          throw new Error("Form is invalid");
        }
        const payload = buildPayload(state);
        if (payload === null) {
          setTouched(true);
          throw new Error("Form is invalid");
        }
        return update(tournamentId, payload);
      }}
      onBreadcrumb={handleBreadcrumb}
    >
      {(shell) => {
        const submitting = shell.isPending || isPending;
        return (
          <form
            className="space-y-4"
            onSubmit={async (event) => {
              event.preventDefault();
              setTouched(true);
              if (!isValid || !isDirty || submitting) return;
              await shell.retry();
            }}
            data-testid="tournament-edit-form"
            noValidate
          >
            <div className="space-y-1.5">
              <Label htmlFor="tournament-edit-title">
                Title
                <span className="ml-0.5 text-destructive" aria-hidden="true">
                  *
                </span>
              </Label>
              <Input
                id="tournament-edit-title"
                name="title"
                required
                value={state.title}
                onChange={(event) => updateField("title", event.target.value)}
                maxLength={255}
                aria-invalid={
                  touched && issuesByField.title !== undefined
                    ? "true"
                    : "false"
                }
                aria-describedby={
                  touched && issuesByField.title !== undefined
                    ? "tournament-edit-error-title"
                    : undefined
                }
                data-testid="tournament-edit-input-title"
              />
              {touched && issuesByField.title !== undefined ? (
                <p
                  id="tournament-edit-error-title"
                  role="alert"
                  className="text-xs text-destructive"
                  data-testid="tournament-edit-error-title"
                >
                  {issuesByField.title}
                </p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tournament-edit-description">Description</Label>
              <Textarea
                id="tournament-edit-description"
                name="description"
                value={state.description}
                onChange={(event) =>
                  updateField("description", event.target.value)
                }
                maxLength={2000}
                rows={3}
                aria-invalid={
                  touched && issuesByField.description !== undefined
                    ? "true"
                    : "false"
                }
                aria-describedby={
                  touched && issuesByField.description !== undefined
                    ? "tournament-edit-error-description"
                    : undefined
                }
                data-testid="tournament-edit-input-description"
              />
              {touched && issuesByField.description !== undefined ? (
                <p
                  id="tournament-edit-error-description"
                  role="alert"
                  className="text-xs text-destructive"
                  data-testid="tournament-edit-error-description"
                >
                  {issuesByField.description}
                </p>
              ) : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="tournament-edit-difficulty">Difficulty</Label>
                <Select
                  value={state.difficulty}
                  onValueChange={(value) =>
                    updateField("difficulty", value as FormState["difficulty"])
                  }
                >
                  <SelectTrigger
                    id="tournament-edit-difficulty"
                    className="w-full"
                    data-testid="tournament-edit-input-difficulty"
                  >
                    <SelectValue placeholder="Select difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    {DIFFICULTY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="tournament-edit-prize">Prize</Label>
                <Input
                  id="tournament-edit-prize"
                  name="prize"
                  value={state.prize}
                  onChange={(event) => updateField("prize", event.target.value)}
                  maxLength={1000}
                  aria-invalid={
                    touched && issuesByField.prize !== undefined
                      ? "true"
                      : "false"
                  }
                  aria-describedby={
                    touched && issuesByField.prize !== undefined
                      ? "tournament-edit-error-prize"
                      : undefined
                  }
                  data-testid="tournament-edit-input-prize"
                />
                {touched && issuesByField.prize !== undefined ? (
                  <p
                    id="tournament-edit-error-prize"
                    role="alert"
                    className="text-xs text-destructive"
                    data-testid="tournament-edit-error-prize"
                  >
                    {issuesByField.prize}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="tournament-edit-startAt">
                  Start time
                  <span className="ml-0.5 text-destructive" aria-hidden="true">
                    *
                  </span>
                </Label>
                <Input
                  id="tournament-edit-startAt"
                  name="startAt"
                  type="datetime-local"
                  required
                  value={state.startAt}
                  onChange={(event) =>
                    updateField("startAt", event.target.value)
                  }
                  aria-invalid={
                    touched && issuesByField.startAt !== undefined
                      ? "true"
                      : "false"
                  }
                  aria-describedby={
                    touched && issuesByField.startAt !== undefined
                      ? "tournament-edit-error-startAt"
                      : undefined
                  }
                  data-testid="tournament-edit-input-startAt"
                />
                {touched && issuesByField.startAt !== undefined ? (
                  <p
                    id="tournament-edit-error-startAt"
                    role="alert"
                    className="text-xs text-destructive"
                    data-testid="tournament-edit-error-startAt"
                  >
                    {issuesByField.startAt}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="tournament-edit-endAt">
                  End time
                  <span className="ml-0.5 text-destructive" aria-hidden="true">
                    *
                  </span>
                </Label>
                <Input
                  id="tournament-edit-endAt"
                  name="endAt"
                  type="datetime-local"
                  required
                  value={state.endAt}
                  onChange={(event) => updateField("endAt", event.target.value)}
                  aria-invalid={
                    touched && issuesByField.endAt !== undefined
                      ? "true"
                      : "false"
                  }
                  aria-describedby={
                    touched && issuesByField.endAt !== undefined
                      ? "tournament-edit-error-endAt"
                      : undefined
                  }
                  data-testid="tournament-edit-input-endAt"
                />
                {touched && issuesByField.endAt !== undefined ? (
                  <p
                    id="tournament-edit-error-endAt"
                    role="alert"
                    className="text-xs text-destructive"
                    data-testid="tournament-edit-error-endAt"
                  >
                    {issuesByField.endAt}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
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
                    updateField("maxParticipants", event.target.value)
                  }
                  placeholder="Unlimited"
                  aria-invalid={
                    touched && issuesByField.maxParticipants !== undefined
                      ? "true"
                      : "false"
                  }
                  aria-describedby={
                    touched && issuesByField.maxParticipants !== undefined
                      ? "tournament-edit-error-maxParticipants"
                      : undefined
                  }
                  data-testid="tournament-edit-input-maxParticipants"
                />
                {touched && issuesByField.maxParticipants !== undefined ? (
                  <p
                    id="tournament-edit-error-maxParticipants"
                    role="alert"
                    className="text-xs text-destructive"
                    data-testid="tournament-edit-error-maxParticipants"
                  >
                    {issuesByField.maxParticipants}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="tournament-edit-categoryId">
                  Category UUID
                </Label>
                <Input
                  id="tournament-edit-categoryId"
                  name="categoryId"
                  value={state.categoryId}
                  onChange={(event) =>
                    updateField("categoryId", event.target.value)
                  }
                  placeholder="Optional"
                  aria-invalid={
                    touched && issuesByField.categoryId !== undefined
                      ? "true"
                      : "false"
                  }
                  aria-describedby={
                    touched && issuesByField.categoryId !== undefined
                      ? "tournament-edit-error-categoryId"
                      : undefined
                  }
                  data-testid="tournament-edit-input-categoryId"
                />
                {touched && issuesByField.categoryId !== undefined ? (
                  <p
                    id="tournament-edit-error-categoryId"
                    role="alert"
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
                className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive"
                data-testid="tournament-edit-form-error"
              >
                <p className="font-semibold">Could not save the tournament</p>
                <p className="mt-1">{inlineErrorMessage}</p>
              </div>
            ) : null}

            {showAlreadyStartedNotice ? (
              <div
                role="alert"
                className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300"
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

            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:items-center sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={submitting}
                data-testid="tournament-edit-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="default"
                disabled={!isDirty || submitting}
                className="gap-2"
                data-testid="tournament-edit-submit"
              >
                {submitting ? (
                  <>
                    <Loader2
                      className="h-4 w-4 animate-spin"
                      aria-hidden="true"
                    />
                    Saving…
                  </>
                ) : (
                  "Save changes"
                )}
              </Button>
            </div>
          </form>
        );
      }}
    </AuditActionShell>
  );
}
