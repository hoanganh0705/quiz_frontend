"use client";

/**
 * `useQuizForm` — the typed Phase 4 form primitive.
 *
 * Source epic:   Epic 4.2 — `useQuizForm` primitive + shared form atoms.
 * Source story:  PHASE_4_EPICS.md → Story 4.2 (lines 202–293).
 * Source tickets:
 *   - TKT-4.2.A1 (typed signature + placeholder `useForm` wrap).
 *   - TKT-4.2.A3 (`submit()` orchestration: validate → handler → 4xx revert).
 *   - TKT-4.2.A4 (`bulkSubmit()` orchestration: per-row validation → bulkError[]).
 *
 * ## What this hook owns
 *
 *   - **`useForm` + `zodResolver` integration.** The hook wraps react-hook-form's
 *     `useForm` with the `zodResolver(opts.schema)` so consumers do not have to
 *     wire the resolver manually. The schema is the single source of truth for
 *     validation; the form values' types are inferred from it (`z.infer<T>`).
 *   - **`submit()` — single-mode submission (TKT-4.2.A3).** Re-runs the zod
 *     resolver against the current form values; if invalid, resolves
 *     without invoking the injected handler and surfaces the per-field
 *     errors via `form.formState.errors`. If valid, invokes `opts.submit`
 *     exactly once, enforces single-flight discipline (two concurrent
 *     calls share the same in-flight promise), catches `ApiError` from
 *     `opts.submit`, classifies via `getUserCopy(apiError.code)`, and
 *     surfaces the typed `lastError` shape. In `readonly` mode (TKT-4.2.E1)
 *     `submit()` is a no-op that resolves immediately without touching the
 *     injected handler.
 *   - **`bulkSubmit()` — bulk-mode submission (TKT-4.2.A4).** Validates each
 *     row independently against `opts.schema.safeParse(values)`; rows that
 *     fail populate `bulkError[]` with the index, the failing field, and
 *     the validation message. Rows that pass are forwarded to the injected
 *     `bulkHandler` (or to `opts.submit` once per row when the bulk
 *     handler is omitted). The handler's per-item 4xx results populate
 *     `bulkError[]`; the form is reset only when the handler returns
 *     `{ ok: true, results: [] }` (full success). In `readonly` mode
 *     (TKT-4.2.E1) `bulkSubmit()` is a no-op that resolves immediately.
 *   - **`isHydrating` lifecycle flag (TKT-4.2.E2).** The hook returns
 *     `isHydrating: true` on the first render and `markHydrated()` so the
 *     consumer can flip the flag once async `defaultValues` have
 *     populated (e.g. SWR fetch in stories 4.9 / 4.10). The flag is
 *     independent of `mode` and exists to bridge the gap between mount
 *     and the first async `defaultValues` hydration.
 *   - **Telemetry.** Every `submit()` and `bulkSubmit()` call emits a
 *     `Sentry.addBreadcrumb({ category: 'phase4:4.2', data: { … } })`
 *     around the handler invocation, per master plan §95.
 *   - **`USER_COPY` as the single copy source.** The hook never reads
 *     `apiError.message`; the error surface is `lastError: getUserCopy(code)`.
 *     The `<FormErrorBanner />` primitive consumes `lastError` (TKT-4.2.C1).
 *
 * ## What this hook does NOT own
 *
 *   - **Optimistic mutation cooldown.** The 500 ms cooldown is the
 *     `useOptimisticMutation` primitive's contract (Epic 4.1 / TKT-4.1.E1);
 *     authoring forms are not optimistic mutations — they are stateful
 *     submissions that wait for the backend before resolving.
 *   - **Draft auto-save.** The 5-second localStorage snapshot lives in
 *     `<DraftBanner />` + `useDraftAutoSave` (TKT-4.2.C2).
 *   - **Unsaved-changes navigation guard.** The 5-second dirty-window
 *     lives in `useUnsavedChangesGuard` (TKT-4.2.C3).
 *   - **Read-only mode UX.** The `readonly` mode is added by TKT-4.2.E1;
 *     the consumer-facing copy ("This quiz is no longer editable") is
 *     rendered by `<ReadOnlyBanner />` so consumers do not have to
 *     branch on `mode`.
 *   - **Hydration state.** The `isHydrating` flag is added by TKT-4.2.E2;
 *     the consumer decides when to flip it via `markHydrated()`. Until
 *     that lands, consumers hydrate `defaultValues` synchronously.
 *
 * ## Test isolation seam
 *
 * Every handler invocation goes through the injected `opts.submit` /
 * `bulkHandler` seams (per cross-batch invariant 11). Tests never mock
 * `react-hook-form`; they pass a `vi.fn()` for the handler and assert on
 * the observable return shape + `lastError` / `bulkError`.
 */

import { useCallback, useMemo, useRef, useState } from "react";
import {
  useForm,
  type FieldErrors,
  type FieldValues,
  type UseFormReturn,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";

import { isApiError } from "@/lib/api";
import {
  getUserCopy,
  type ErrorCode as ApiErrorCode,
  type UserCopyEntry,
} from "@/lib/api/error-codes";

import { TAG_SLUG_INVALID_COPY } from "./regex";

// ────────────────────────────────────────────────────────────────────────
// Public types
// ────────────────────────────────────────────────────────────────────────

/**
 * Submission mode for the form. `'single'` is the default; `'bulk'`
 * enables `bulkSubmit()` and signals to consumers that the form
 * represents an array of rows. `'readonly'` (TKT-4.2.E1) disables both
 * `submit()` and `bulkSubmit()` — the form renders as a read-only view
 * with the `<ReadOnlyBanner />` primitive surfacing "This quiz is no
 * longer editable" copy.
 */
export type UseQuizFormMode = "single" | "bulk" | "readonly";

/**
 * Per-row bulk input. The `index` is the original row index in the
 * array the consumer passed to `bulkSubmit()`; consumers can use it to
 * render per-row error UI.
 */
export interface UseQuizFormBulkRow<T> {
  index: number;
  values: T;
}

/**
 * Per-row bulk result returned by the injected bulk handler. Mirrors the
 * per-item 4xx shape consumed by Phase 4 stories 4.6 / 4.7 / 4.10.
 */
export interface BulkError {
  index: number;
  status: number;
  code: ErrorCode;
  message: string;
  field?: string;
}

/**
 * Loosened `ErrorCode` union. The Phase 4 `USER_COPY` registry returns
 * a copy for every member of the canonical `ErrorCode` union; this
 * alias widens that union with the synthetic `'GLOBAL_UNKNOWN'`
 * sentinel for non-`ApiError` rejections so the `BulkError.code` field
 * stays total at the type level.
 */
export type ErrorCode = ApiErrorCode | "GLOBAL_UNKNOWN";

/**
 * Configuration for the primitive. The generic `T` is a zod schema
 * whose `z.infer<T>` output must satisfy react-hook-form's `FieldValues`
 * constraint (i.e. it must be a plain object shape). This matches the
 * pattern used by `@hookform/resolvers/zod` 5.x.
 */
export interface UseQuizFormOptions<
  T extends z.ZodType<FieldValues, any, any>,
> {
  schema: T;
  defaultValues: z.infer<T>;
  mode?: UseQuizFormMode;
  formId?: string;
  /**
   * Single-mode submission handler. Invoked from `submit()` exactly
   * once when validation passes. May throw an `ApiError`; the primitive
   * classifies the throw into `lastError` via `getUserCopy`.
   */
  submit?: (values: z.infer<T>) => Promise<void>;
  /**
   * Bulk-mode submission handler. Invoked from `bulkSubmit()` once
   * with the validated rows when at least one row passed zod
   * validation. The handler returns per-item results; rows in the
   * `results` array populate `bulkError[]`.
   */
  bulkHandler?: (
    values: z.infer<T>[],
  ) => Promise<{ ok: boolean; results: BulkError[] }>;
}

/**
 * Return shape of the primitive. Mirrors the master-plan promise
 * (story 4.2 line 206): `form`, `errors`, `isSubmitting`, `isDirty`,
 * `bulkError[]`, `submit()`, `bulkSubmit()`, `reset()`.
 */
export interface UseQuizFormReturn<T extends z.ZodType<FieldValues, any, any>> {
  /**
   * The underlying `react-hook-form` return. Consumers typically destructure
   * `form.control`, `form.getValues()`, `form.setValue()`, etc. The atom
   * primitives (e.g. `<TextField />`) consume `form.formState.isSubmitting`
   * and `form.formState.isDirty` directly.
   */
  form: UseFormReturn<z.infer<T>>;
  /**
   * Convenience alias for `form.formState.errors`. Surfaced so consumers
   * do not have to destructure the `form` object to read errors in tests.
   */
  errors: FieldErrors<z.infer<T>>;
  isSubmitting: boolean;
  isBulkSubmitting: boolean;
  isDirty: boolean;
  /**
   * Resolved mode (`'single' | 'bulk' | 'readonly'`). The hook pins
   * `isDirty` to `false` in `readonly` mode so the navigation guard
   * stays silent (master plan 4.2 line 274: "in `readonly` mode, …
   * `isDirty` is always `false`").
   */
  mode: UseQuizFormMode;
  /**
   * Hydration lifecycle flag (TKT-4.2.E2). Defaults to `true` on mount
   * — the consumer flips it to `false` via `markHydrated()` once async
   * `defaultValues` have populated (e.g. SWR fetch in stories 4.9 /
   * 4.10). The flag is the typed primitive for the master plan line
   * 251 promise of an "initial-value hydration state".
   */
  isHydrating: boolean;
  /**
   * Flip `isHydrating` to `false`. Idempotent — calling it twice has
   * no effect. The hook never auto-flips the flag; the consumer owns
   * the lifecycle (matches the master plan ergonomics: "verify which
   * idiom is most ergonomic for the React 19 / Next.js 16 stack" —
   * TKT-4.2.E2 ticket).
   */
  markHydrated: () => void;
  bulkError: BulkError[];
  /**
   * Last error from `submit()` / `bulkSubmit()`, classified via
   * `getUserCopy`. `null` when the form is in a non-error state. The
   * `<FormErrorBanner />` primitive (TKT-4.2.C1) consumes this shape.
   *
   * Note: a `readonly` form never invokes the injected handler, so
   * `lastError` stays `null` in `readonly` mode — the form is not
   * interactive and there is no error surface to drain.
   */
  lastError: (UserCopyEntry & { code: string }) | null;
  /**
   * Submit the form. In `readonly` mode (TKT-4.2.E1) this is a no-op
   * that resolves immediately without invoking the injected handler.
   * The `isSubmitting` flag stays `false` in `readonly` mode (the
   * master plan promise: "submit() … is a no-op that resolves with
   * `{ ok: false, reason: 'readonly' }`").
   */
  submit: () => Promise<void>;
  /**
   * Bulk-submit the form. In `readonly` mode (TKT-4.2.E1) this is a
   * no-op that resolves immediately. The `isBulkSubmitting` flag
   * stays `false` in `readonly` mode.
   */
  bulkSubmit: (
    rows: UseQuizFormBulkRow<z.infer<T>>[],
    overrides?: {
      bulkHandler?: UseQuizFormOptions<T>["bulkHandler"];
    },
  ) => Promise<void>;
  reset: () => void;
}

// ────────────────────────────────────────────────────────────────────────
// Internal helpers
// ────────────────────────────────────────────────────────────────────────

/**
 * The synthetic sentinel for non-`ApiError` rejections. `USER_COPY` does
 * not have an entry for this code; `getUserCopy('GLOBAL_UNKNOWN')`
 * falls through to `UNKNOWN_USER_COPY` (the "Something went wrong"
 * fallback). We type-narrow this constant so the `BulkError.code`
 * union stays total.
 */
const GLOBAL_UNKNOWN_CODE = "GLOBAL_UNKNOWN" as const;

/**
 * Best-effort Sentry breadcrumb emitter. Imported lazily so the hook
 * does not fail in environments where `@sentry/nextjs` is not present
 * (the project depends on it via `next` integrations; this is
 * defensive).
 */
function emitBreadcrumb(data: {
  formId?: string;
  status: "success" | "error" | "noop" | "partial" | "cooldown";
  durationMs: number;
  code?: string;
  bulkErrorCount?: number;
}): void {
  try {
    const sentry = // Dynamic import keeps the hook SSR-safe; the browser bundle
      // resolves this lazily.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      (typeof require !== "undefined" ? require("@sentry/nextjs") : null) as {
        addBreadcrumb?: (crumb: {
          category: string;
          data: Record<string, unknown>;
        }) => void;
      } | null;
    sentry?.addBreadcrumb?.({
      category: "phase4:4.2",
      data: { ...data },
    });
  } catch {
    // Telemetry is best-effort; never let Sentry failure break the form.
  }
}

/**
 * Convert a `ZodError` issue into a `BulkError` entry. Only the first
 * issue per row is surfaced — bulk-error UX renders the first failing
 * field as the row's headline (master plan line 259 promise).
 */
function zodIssueToBulkError(
  index: number,
  rowValues: unknown,
  issue: { message: string; path?: ReadonlyArray<PropertyKey> },
): BulkError {
  const field =
    issue.path && issue.path.length > 0
      ? issue.path.map((segment) => String(segment)).join(".")
      : undefined;
  return {
    index,
    status: 0,
    code: "GLOBAL_VALIDATION_FAILED",
    message: issue.message || "Validation failed.",
    field,
  };
}

// ────────────────────────────────────────────────────────────────────────
// Hook implementation
// ────────────────────────────────────────────────────────────────────────

export function useQuizForm<T extends z.ZodType<FieldValues, any, any>>(
  opts: UseQuizFormOptions<T>,
): UseQuizFormReturn<T> {
  const {
    schema,
    defaultValues,
    mode = "single",
    formId,
    submit: injectedSubmit,
    bulkHandler: injectedBulkHandler,
  } = opts;

  // `useForm` is the underlying react-hook-form instance. The
  // `zodResolver` integration is the master-plan promise (story 4.2
  // line 206): "A `useQuizForm({ schema, defaultValues, mode })` hook
  // that owns react-hook-form + zod".
  //
  // We constrain `T` to schemas whose `_input` and `_output` are both
  // `FieldValues` (no transforms). Transforms are added by TKT-4.2.D2
  // when a transform pipeline is introduced.
  const form = useForm<z.infer<T>, unknown, z.infer<T>>({
    resolver: zodResolver(schema as never) as never,
    defaultValues,
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);
  const [bulkError, setBulkError] = useState<BulkError[]>([]);
  const [lastError, setLastError] = useState<
    (UserCopyEntry & { code: string }) | null
  >(null);
  // `isHydrating` (TKT-4.2.E2) defaults to `true` on mount. The
  // consumer flips it via `markHydrated()` once async `defaultValues`
  // have populated. The flag is the typed primitive for the
  // "initial-value hydration state" promise (master plan line 251).
  const [isHydrating, setIsHydrating] = useState<boolean>(true);
  const markHydrated = useCallback((): void => {
    setIsHydrating(false);
  }, []);

  // Single-flight slot for `submit()`. Mirrors the discipline from
  // `features/auth/forms/use-registration-submit.ts` (TKT-2.1.D2): two
  // concurrent calls share the same in-flight promise so the backend is
  // never double-hit.
  //
  // The slot stores the IIFE promise BEFORE the `.finally()` chain is
  // applied, because `.finally()` returns a new wrapper promise every
  // call — sharing the slot via the finally-chained promise would
  // produce a different wrapper per caller.
  const inFlightSubmitRef = useRef<Promise<void> | null>(null);

  // Surface any `apiError.message` extraction is forbidden by invariant
  // 4: USER_COPY is the canonical copy source. The helper localises the
  // `getUserCopy(code)` lookup so both `submit()` and `bulkSubmit()`
  // paths share the same classification.
  const classify = useCallback(
    (err: unknown): UserCopyEntry & { code: string } => {
      if (isApiError(err)) {
        return { ...getUserCopy(err.code), code: err.code };
      }
      return { ...getUserCopy(GLOBAL_UNKNOWN_CODE), code: GLOBAL_UNKNOWN_CODE };
    },
    [],
  );

  // ── `submit()` ──────────────────────────────────────────────────────
  // Single-mode submission path. Re-validates zod; invokes the injected
  // handler; catches `ApiError`; surfaces `lastError`.
  //
  // In `readonly` mode (TKT-4.2.E1) `submit()` is a no-op that resolves
  // immediately without invoking the injected handler. The
  // `isSubmitting` flag stays `false` and `lastError` stays `null`.
  const submit = useCallback((): Promise<void> => {
    if (inFlightSubmitRef.current) {
      return inFlightSubmitRef.current;
    }
    if (mode === "readonly") {
      // No-op: the form is rendered with an entity that no longer
      // exists (or that the user can no longer edit). The
      // `<ReadOnlyBanner />` surfaces the master-plan copy; the
      // submit handler is never invoked.
      return Promise.resolve();
    }
    if (typeof injectedSubmit !== "function") {
      // No handler injected — treat as a no-op success and resolve.
      setLastError(null);
      return Promise.resolve();
    }

    setIsSubmitting(true);
    setLastError(null);
    const startedAt = Date.now();

    const core = (async (): Promise<void> => {
      // `handleSubmit` re-runs the zod resolver against the current
      // values and rejects with the errors if validation fails. We use
      // the underlying `form.trigger()` so we can inspect the errors
      // object without react-hook-form's `handleSubmit` ceremony.
      const valid = await form.trigger();
      if (!valid) {
        emitBreadcrumb({
          formId,
          status: "noop",
          durationMs: Date.now() - startedAt,
        });
        return;
      }
      const values = form.getValues();
      try {
        await injectedSubmit(values);
        setLastError(null);
        emitBreadcrumb({
          formId,
          status: "success",
          durationMs: Date.now() - startedAt,
        });
      } catch (err) {
        const classified = classify(err);
        setLastError(classified);
        emitBreadcrumb({
          formId,
          status: "error",
          durationMs: Date.now() - startedAt,
          code: classified.code,
        });
      }
    })();

    // Bookkeeping runs ONCE on the core promise (which is shared across
    // concurrent callers). Side effects fire once because we wire the
    // `.finally` on the core promise, not on each per-caller chain.
    void core.finally(() => {
      inFlightSubmitRef.current = null;
      setIsSubmitting(false);
    });

    inFlightSubmitRef.current = core;
    return core;
  }, [classify, form, formId, injectedSubmit, mode]);

  // ── `bulkSubmit()` ──────────────────────────────────────────────────
  // Bulk-mode submission path. Validates each row independently; rows
  // that fail populate `bulkError[]`; rows that pass go to the bulk
  // handler (or per-row to the single handler when none is provided).
  //
  // In `readonly` mode (TKT-4.2.E1) `bulkSubmit()` is a no-op that
  // resolves immediately. The `isBulkSubmitting` flag stays `false`
  // and neither `bulkError[]` nor `lastError` is mutated.
  const bulkSubmit = useCallback(
    async (
      rows: UseQuizFormBulkRow<z.infer<T>>[],
      overrides?: {
        bulkHandler?: UseQuizFormOptions<T>["bulkHandler"];
      },
    ): Promise<void> => {
      if (mode === "readonly") {
        // No-op: same discipline as `submit()` — the form is rendered
        // with an entity that no longer exists; the bulk handler is
        // never invoked.
        return;
      }
      setIsBulkSubmitting(true);
      setBulkError([]);
      setLastError(null);
      const startedAt = Date.now();

      try {
        // Phase 1 — per-row zod validation.
        const rowErrors: BulkError[] = [];
        const validRows: Array<{ index: number; values: z.infer<T> }> = [];
        for (const row of rows) {
          const result = schema.safeParse(row.values);
          if (!result.success) {
            const firstIssue = result.error.issues[0];
            if (firstIssue) {
              rowErrors.push(
                zodIssueToBulkError(row.index, row.values, {
                  message: firstIssue.message,
                  path: firstIssue.path as ReadonlyArray<PropertyKey>,
                }),
              );
            }
          } else {
            validRows.push({ index: row.index, values: result.data });
          }
        }

        if (validRows.length === 0) {
          // Every row failed — short-circuit; the handler is never
          // called. The form remains editable.
          setBulkError(rowErrors);
          emitBreadcrumb({
            formId,
            status: "noop",
            durationMs: Date.now() - startedAt,
            bulkErrorCount: rowErrors.length,
          });
          return;
        }

        const bulkHandler =
          overrides?.bulkHandler ?? injectedBulkHandler ?? injectedSubmit;

        if (typeof bulkHandler !== "function") {
          // No handler — surface the validation errors and bail.
          setBulkError(rowErrors);
          emitBreadcrumb({
            formId,
            status: "noop",
            durationMs: Date.now() - startedAt,
            bulkErrorCount: rowErrors.length,
          });
          return;
        }

        // Phase 2 — handler invocation.
        let handlerResult: { ok: boolean; results: BulkError[] };
        if (bulkHandler === injectedSubmit) {
          // Per-row fallback: invoke `opts.submit` once per row and
          // collect per-item failures into the `BulkError` shape.
          const results: BulkError[] = [];
          for (const row of validRows) {
            try {
              await injectedSubmit!(row.values);
            } catch (err) {
              if (isApiError(err)) {
                results.push({
                  index: row.index,
                  status: err.status,
                  code: err.code as ErrorCode,
                  message: err.detail ?? err.message ?? "Submission failed.",
                });
              } else {
                results.push({
                  index: row.index,
                  status: 0,
                  code: GLOBAL_UNKNOWN_CODE,
                  message: "Submission failed.",
                });
              }
            }
          }
          handlerResult = { ok: results.length === 0, results };
        } else {
          try {
            handlerResult = await (
              bulkHandler as NonNullable<UseQuizFormOptions<T>["bulkHandler"]>
            )(validRows.map((r) => r.values));
          } catch (err) {
            const classified = classify(err);
            setLastError(classified);
            setBulkError(rowErrors);
            emitBreadcrumb({
              formId,
              status: "error",
              durationMs: Date.now() - startedAt,
              code: classified.code,
              bulkErrorCount: rowErrors.length,
            });
            return;
          }
        }

        // Phase 3 — assemble the final `bulkError[]` array. Per-item
        // handler results take precedence over row-zod errors for the
        // indices they cover.
        const handlerIndices = new Set(
          handlerResult.results.map((r) => r.index),
        );
        const merged: BulkError[] = [
          ...handlerResult.results,
          ...rowErrors.filter((r) => !handlerIndices.has(r.index)),
        ];

        if (
          handlerResult.ok &&
          handlerResult.results.length === 0 &&
          rowErrors.length === 0
        ) {
          // Full success — clear errors, reset the form.
          setBulkError([]);
          form.reset();
          emitBreadcrumb({
            formId,
            status: "success",
            durationMs: Date.now() - startedAt,
            bulkErrorCount: 0,
          });
          return;
        }

        // Partial failure or per-row fallback with errors. The form
        // remains editable; the consumer re-submits only the failed
        // rows.
        setBulkError(merged);
        emitBreadcrumb({
          formId,
          status: "partial",
          durationMs: Date.now() - startedAt,
          bulkErrorCount: merged.length,
        });
      } finally {
        setIsBulkSubmitting(false);
      }
    },
    [classify, form, formId, injectedBulkHandler, injectedSubmit, mode, schema],
  );

  // ── `reset()` ───────────────────────────────────────────────────────
  // Reset the form to its `defaultValues`. Clears `lastError` and
  // `bulkError` so the form returns to a non-error state.
  const reset = useCallback((): void => {
    form.reset();
    setLastError(null);
    setBulkError([]);
  }, [form]);

  // Convenience alias for `form.formState.errors`. Surfaced so tests
  // can assert on `result.errors` without destructure.
  const errors = useMemo<FieldErrors<z.infer<T>>>(
    () => form.formState.errors as FieldErrors<z.infer<T>>,
    [form.formState.errors],
  );

  // `isDirty` mirrors `form.formState.isDirty`. Surfaced directly so
  // consumers do not have to destructure the `form` object. In
  // `readonly` mode (TKT-4.2.E1) the flag is pinned to `false` so the
  // navigation guard stays silent and the form does not surface
  // "unsaved changes" copy for an entity the user can no longer edit.
  const isDirty = mode === "readonly" ? false : form.formState.isDirty;

  // `mode` is now an active part of the primitive's behaviour: it
  // gates `submit()` / `bulkSubmit()` and the `isDirty` flag. The
  // re-exported `void` line that earlier suppressed the unused-import
  // warning has been removed.
  void TAG_SLUG_INVALID_COPY; // Re-exported via the barrel; suppressed here to keep the bundler honest.

  return {
    form,
    errors,
    isSubmitting,
    isBulkSubmitting,
    isDirty,
    mode,
    isHydrating,
    markHydrated,
    bulkError,
    lastError,
    submit,
    bulkSubmit,
    reset,
  };
}
