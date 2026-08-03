"use client";

/**
 * `useDraftAutoSave` — the auto-save hook behind `<DraftBanner />`.
 *
 * Source epic:   Epic 4.2 — `useQuizForm` primitive + shared form atoms.
 * Source story:  PHASE_4_EPICS.md → Story 4.2 (lines 202–293).
 * Source ticket: TKT-4.2.C2.
 *
 * ## What this hook owns
 *
 *   - **localStorage persistence** — every `intervalMs` (default 5_000),
 *     the hook writes a snapshot `{ savedAt, values }` to
 *     `localStorage[`quizhub.draft.<formId>.<userId-or-anon>`]`. The
 *     key is namespaced by `formId` so multiple forms don't collide.
 *   - **Dirty gating** — the interval is paused when
 *     `form.formState.isDirty` is `false`. Idle forms never write to
 *     localStorage.
 *   - **Restore** — on mount, if a snapshot exists, the hook exposes
 *     `savedAt` and a `restore()` callback. `<DraftBanner />` renders a
 *     "Restore draft from HH:MM?" CTA and calls `restore` on confirm.
 *   - **Dismiss** — the consumer can call `dismiss()` to clear the
 *     snapshot without restoring.
 *   - **Submit cleanup** — when `isDirty` flips from `true` to `false`
 *     (typical for a successful submit that calls `form.reset`), the
 *     hook drops the snapshot so the banner does not re-prompt on
 *     reload.
 *
 * ## What this hook does NOT own
 *
 *   - **Banner UI.** The banner is `<DraftBanner />` (TKT-4.2.C2).
 *   - **Per-key encryption.** Drafts are stored in plaintext
 *     localStorage; sensitive content (e.g. auth forms) opt out by
 *     not mounting this hook.
 *   - **SSR.** The hook reads localStorage in `useEffect` only; the
 *     initial render reports `savedAt: null` regardless of pre-existing
 *     snapshots.
 *
 * ## Test isolation seam
 *
 * `storage` is injectable so tests can assert against an in-memory
 * shim rather than the real `window.localStorage`. The default reads
 * `window.localStorage` when available.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  useFormState,
  type FieldValues,
  type UseFormReturn,
} from "react-hook-form";

const STORAGE_NAMESPACE = "quizhub.draft";

/**
 * Storage seam — defaults to `window.localStorage` when available.
 * Tests inject an in-memory shim here.
 */
export interface DraftStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const defaultStorage: DraftStorage = {
  getItem: (key) =>
    typeof window === "undefined" ? null : window.localStorage.getItem(key),
  setItem: (key, value) => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(key, value);
  },
  removeItem: (key) => {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(key);
  },
};

export interface UseDraftAutoSaveOptions<T extends FieldValues> {
  form: UseFormReturn<T>;
  /** Stable form identifier (`'quiz-create'`, `'question-bulk'`, …). */
  formId: string;
  /** User identifier (`<userId>` or `'anon'`). Stable across the session. */
  userId: string | null;
  /**
   * Auto-save interval in ms. Defaults to 5_000 (master-plan rule).
   */
  intervalMs?: number;
  /** Optional storage seam (test override). Defaults to `window.localStorage`. */
  storage?: DraftStorage;
}

export interface DraftSnapshot<T extends FieldValues> {
  savedAt: string;
  values: T;
}

export interface UseDraftAutoSaveReturn<T extends FieldValues> {
  /** ISO timestamp of the saved snapshot, or `null` when no snapshot exists. */
  savedAt: string | null;
  /** Restore the form to the snapshot's values. */
  restore: () => void;
  /** Drop the snapshot without restoring. */
  dismiss: () => void;
  /** Clear the snapshot on a successful submit (no UI side effect). */
  clearOnSubmit: () => void;
}

function buildKey(formId: string, userIdOrAnon: string): string {
  return `${STORAGE_NAMESPACE}.${formId}.${userIdOrAnon}`;
}

function readSnapshot(
  storage: DraftStorage,
  key: string,
): DraftSnapshot<FieldValues> | null {
  const raw = storage.getItem(key);
  if (raw === null || raw.length === 0) return null;
  try {
    const parsed = JSON.parse(raw) as DraftSnapshot<FieldValues>;
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      typeof parsed.savedAt === "string" &&
      typeof parsed.values === "object" &&
      parsed.values !== null
    ) {
      return parsed;
    }
  } catch {
    // Fall through to null — corrupt entries are dropped.
  }
  return null;
}

/**
 * `useDraftAutoSave({ form, formId, userId, intervalMs?, storage? })` —
 * persisted draft snapshot with restore/dismiss semantics.
 *
 * Implementation note: react-hook-form's `formState` is a Proxy that
 * only triggers re-renders when its values are accessed through a
 * subscriber. We use `useFormState({ control })` to read `isDirty` so
 * the hook re-renders (and the effect re-runs) when the form becomes
 * dirty. Reading `form.formState.isDirty` directly in a `useEffect`
 * dep array would not trigger the effect because the dep-array value
 * is a primitive (`true`/`false`) and the surrounding component
 * doesn't re-render.
 */
export function useDraftAutoSave<T extends FieldValues>(
  options: UseDraftAutoSaveOptions<T>,
): UseDraftAutoSaveReturn<T> {
  const {
    form,
    formId,
    userId,
    intervalMs = 5000,
    storage = defaultStorage,
  } = options;

  const userIdOrAnon = userId ?? "anon";
  const storageKey = buildKey(formId, userIdOrAnon);

  const [savedAt, setSavedAt] = useState<string | null>(null);
  const snapshotRef = useRef<DraftSnapshot<T> | null>(null);
  const lastWrittenRef = useRef<string | null>(null);

  // `useFormState` subscribes to the form's `formState` proxy, so a
  // re-render fires whenever `isDirty` (or other tracked fields)
  // change. The hook's effects then re-evaluate against the fresh
  // `isDirty` value.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { isDirty } = useFormState({ control: form.control as any });

  // On mount, read any pre-existing snapshot. The unconditional read
  // guarantees the banner can render a "Restore" prompt on the first
  // render after a refresh.
  useEffect(() => {
    const snapshot = readSnapshot(storage, storageKey);
    if (snapshot) {
      snapshotRef.current = snapshot as DraftSnapshot<T>;
      setSavedAt(snapshot.savedAt);
    }
    // The storage key is stable per formId+userId; intentionally not
    // reactive on the hook's identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  // Auto-save interval. The effect re-runs whenever `isDirty` flips
  // (via `useFormState`). The timer body reads `form.getValues()` so
  // the snapshot reflects the latest value at each tick.
  useEffect(() => {
    if (!isDirty) return;

    const timer = setInterval(() => {
      const values = form.getValues();
      const serialized = JSON.stringify(values);
      if (serialized === lastWrittenRef.current) return;
      const snapshot: DraftSnapshot<T> = {
        savedAt: new Date().toISOString(),
        values,
      };
      storage.setItem(storageKey, JSON.stringify(snapshot));
      lastWrittenRef.current = serialized;
      snapshotRef.current = snapshot;
      setSavedAt(snapshot.savedAt);
    }, intervalMs);

    return () => {
      clearInterval(timer);
    };
  }, [form, isDirty, intervalMs, storage, storageKey]);

  // When the form returns to clean (e.g. a successful submit), drop
  // the stored snapshot so the banner does not re-prompt on reload.
  const wasDirtyRef = useRef(false);
  useEffect(() => {
    if (wasDirtyRef.current && !isDirty) {
      storage.removeItem(storageKey);
      snapshotRef.current = null;
      lastWrittenRef.current = null;
      setSavedAt(null);
    }
    wasDirtyRef.current = isDirty;
  }, [isDirty, storage, storageKey]);

  const restore = useCallback(() => {
    const snapshot = snapshotRef.current;
    if (!snapshot) return;
    form.reset(snapshot.values as Parameters<typeof form.reset>[0]);
  }, [form]);

  const dismiss = useCallback(() => {
    storage.removeItem(storageKey);
    snapshotRef.current = null;
    lastWrittenRef.current = null;
    setSavedAt(null);
  }, [storage, storageKey]);

  const clearOnSubmit = useCallback(() => {
    storage.removeItem(storageKey);
    snapshotRef.current = null;
    lastWrittenRef.current = null;
    setSavedAt(null);
  }, [storage, storageKey]);

  return { savedAt, restore, dismiss, clearOnSubmit };
}
