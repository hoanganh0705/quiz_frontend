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
import { Textarea } from "@/components/ui/Textarea";
import { AuditActionShell } from "@/features/admin/components/AuditActionShell";
import { RequestIdBanner } from "@/features/admin/components/RequestIdBanner";
import { useCreateTournament } from "@/features/admin/tournament-admin/hooks/useCreateTournament";
import { getUserCopy } from "@/lib/api/error-codes";

import type {
  TournamentCreateDto,
  TournamentDto,
} from "../admin-tournament-types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

interface ValidationIssue {
  readonly field: keyof FormState;
  readonly message: string;
}

function parseDateTimeLocal(value: string): Date | null {
  if (value.length === 0) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
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

  const startAt = parseDateTimeLocal(state.startAt);
  if (startAt === null) {
    issues.push({
      field: "startAt",
      message: "Start time is required.",
    });
  } else if (startAt.getTime() <= nowMs) {
    issues.push({
      field: "startAt",
      message: "Start time must be in the future.",
    });
  }

  const endAt = parseDateTimeLocal(state.endAt);
  if (endAt === null) {
    issues.push({
      field: "endAt",
      message: "End time is required.",
    });
  } else if (startAt !== null && endAt.getTime() <= startAt.getTime()) {
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
    payload.description =
      state.description as unknown as TournamentCreateDto["description"];
  }
  if (state.prize.length > 0) {
    payload.prize = state.prize as unknown as TournamentCreateDto["prize"];
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

const INITIAL_FORM_STATE: FormState = {
  title: "",
  description: "",
  difficulty: "medium",
  prize: "",
  startAt: "",
  endAt: "",
  maxParticipants: "",
  categoryId: "",
};

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
  if (code === "TOURNAMENT_SLUG_CONFLICT") {
    return "A tournament with this title already exists. Please choose a different title.";
  }
  return null;
}

export interface TournamentCreateFormProps {
  onSuccess: (tournament: TournamentDto) => void;

  onCancel: () => void;
}

export function TournamentCreateForm({
  onSuccess,
  onCancel,
}: TournamentCreateFormProps): React.ReactElement {
  const { create, error, isPending } = useCreateTournament();

  const [referenceNowMs] = useState<number>(() => Date.now());
  const [state, setState] = useState<FormState>(INITIAL_FORM_STATE);
  const [touched, setTouched] = useState<boolean>(false);
  const [successHandled, setSuccessHandled] = useState<boolean>(false);

  const issues = useMemo<ReadonlyArray<ValidationIssue>>(
    () => validateForm(state, referenceNowMs),
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

  const inlineErrorMessage =
    error !== null ? resolveInlineErrorMessage(error.code) : null;
  const showRequestIdBanner =
    error !== null && inlineErrorMessage === null && error.requestId.length > 0;

  return (
    <AuditActionShell
      action="tournament.create"
      before={state}
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
        return create(payload);
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
              if (!isValid || submitting) return;
              await shell.retry();
            }}
            data-testid="tournament-create-form"
            noValidate
          >
            <div className="space-y-1.5">
              <Label htmlFor="tournament-create-title">
                Title
                <span className="ml-0.5 text-destructive" aria-hidden="true">
                  *
                </span>
              </Label>
              <Input
                id="tournament-create-title"
                name="title"
                required
                value={state.title}
                onChange={(event) => updateField("title", event.target.value)}
                maxLength={255}
                placeholder="Spring Cup"
                aria-invalid={
                  touched && issuesByField.title !== undefined
                    ? "true"
                    : "false"
                }
                aria-describedby={
                  touched && issuesByField.title !== undefined
                    ? "tournament-create-error-title"
                    : undefined
                }
                data-testid="tournament-create-input-title"
              />
              {touched && issuesByField.title !== undefined ? (
                <p
                  id="tournament-create-error-title"
                  role="alert"
                  className="text-xs text-destructive"
                  data-testid="tournament-create-error-title"
                >
                  {issuesByField.title}
                </p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tournament-create-description">Description</Label>
              <Textarea
                id="tournament-create-description"
                name="description"
                value={state.description}
                onChange={(event) =>
                  updateField("description", event.target.value)
                }
                maxLength={2000}
                placeholder="Tournament description (optional)"
                rows={3}
                aria-invalid={
                  touched && issuesByField.description !== undefined
                    ? "true"
                    : "false"
                }
                aria-describedby={
                  touched && issuesByField.description !== undefined
                    ? "tournament-create-error-description"
                    : undefined
                }
                data-testid="tournament-create-input-description"
              />
              {touched && issuesByField.description !== undefined ? (
                <p
                  id="tournament-create-error-description"
                  role="alert"
                  className="text-xs text-destructive"
                  data-testid="tournament-create-error-description"
                >
                  {issuesByField.description}
                </p>
              ) : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="tournament-create-difficulty">Difficulty</Label>
                <Select
                  value={state.difficulty}
                  onValueChange={(value) =>
                    updateField("difficulty", value as FormState["difficulty"])
                  }
                >
                  <SelectTrigger
                    id="tournament-create-difficulty"
                    className="w-full"
                    data-testid="tournament-create-input-difficulty"
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
                <Label htmlFor="tournament-create-prize">Prize</Label>
                <Input
                  id="tournament-create-prize"
                  name="prize"
                  value={state.prize}
                  onChange={(event) => updateField("prize", event.target.value)}
                  maxLength={1000}
                  placeholder="Prize description (optional)"
                  aria-invalid={
                    touched && issuesByField.prize !== undefined
                      ? "true"
                      : "false"
                  }
                  aria-describedby={
                    touched && issuesByField.prize !== undefined
                      ? "tournament-create-error-prize"
                      : undefined
                  }
                  data-testid="tournament-create-input-prize"
                />
                {touched && issuesByField.prize !== undefined ? (
                  <p
                    id="tournament-create-error-prize"
                    role="alert"
                    className="text-xs text-destructive"
                    data-testid="tournament-create-error-prize"
                  >
                    {issuesByField.prize}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="tournament-create-startAt">
                  Start time
                  <span className="ml-0.5 text-destructive" aria-hidden="true">
                    *
                  </span>
                </Label>
                <Input
                  id="tournament-create-startAt"
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
                      ? "tournament-create-error-startAt"
                      : undefined
                  }
                  data-testid="tournament-create-input-startAt"
                />
                {touched && issuesByField.startAt !== undefined ? (
                  <p
                    id="tournament-create-error-startAt"
                    role="alert"
                    className="text-xs text-destructive"
                    data-testid="tournament-create-error-startAt"
                  >
                    {issuesByField.startAt}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="tournament-create-endAt">
                  End time
                  <span className="ml-0.5 text-destructive" aria-hidden="true">
                    *
                  </span>
                </Label>
                <Input
                  id="tournament-create-endAt"
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
                      ? "tournament-create-error-endAt"
                      : undefined
                  }
                  data-testid="tournament-create-input-endAt"
                />
                {touched && issuesByField.endAt !== undefined ? (
                  <p
                    id="tournament-create-error-endAt"
                    role="alert"
                    className="text-xs text-destructive"
                    data-testid="tournament-create-error-endAt"
                  >
                    {issuesByField.endAt}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
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
                      ? "tournament-create-error-maxParticipants"
                      : undefined
                  }
                  data-testid="tournament-create-input-maxParticipants"
                />
                {touched && issuesByField.maxParticipants !== undefined ? (
                  <p
                    id="tournament-create-error-maxParticipants"
                    role="alert"
                    className="text-xs text-destructive"
                    data-testid="tournament-create-error-maxParticipants"
                  >
                    {issuesByField.maxParticipants}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="tournament-create-categoryId">
                  Category UUID
                </Label>
                <Input
                  id="tournament-create-categoryId"
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
                      ? "tournament-create-error-categoryId"
                      : undefined
                  }
                  data-testid="tournament-create-input-categoryId"
                />
                {touched && issuesByField.categoryId !== undefined ? (
                  <p
                    id="tournament-create-error-categoryId"
                    role="alert"
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
                className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive"
                data-testid="tournament-create-form-error"
              >
                <p className="font-semibold">Could not create the tournament</p>
                <p className="mt-1">{inlineErrorMessage}</p>
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
                data-testid="tournament-create-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="default"
                disabled={submitting}
                className="gap-2"
                data-testid="tournament-create-submit"
              >
                {submitting ? (
                  <>
                    <Loader2
                      className="h-4 w-4 animate-spin"
                      aria-hidden="true"
                    />
                    Creating…
                  </>
                ) : (
                  "Create tournament"
                )}
              </Button>
            </div>
          </form>
        );
      }}
    </AuditActionShell>
  );
}
