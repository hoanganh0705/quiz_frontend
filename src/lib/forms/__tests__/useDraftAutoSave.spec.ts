/**
 * `useDraftAutoSave.spec.ts` — locks the auto-save hook contract.
 *
 * Source epic:   Epic 4.2 — `useQuizForm` primitive + shared form atoms.
 * Source ticket: TKT-4.2.C2.
 *
 * Coverage contract:
 *
 *   (1) On mount, when no snapshot exists, `savedAt` is `null`.
 *   (2) After a field change, the localStorage snapshot is written
 *       after `intervalMs` (default 5 s) with `{ savedAt, values }`.
 *   (3) When `isDirty === false`, no localStorage write occurs.
 *   (4) `restore()` calls `form.reset(snapshot.values)`.
 *   (5) `dismiss()` removes the snapshot.
 *   (6) On a clean form (transition from dirty → clean), the snapshot
 *       is removed (auto-save cleared on submit).
 *   (7) The idempotent write path: identical serialized values are
 *       not re-written.
 *   (8) Corrupt localStorage entries are dropped on read.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { useDraftAutoSave, type DraftStorage } from '../useDraftAutoSave';

const schema = z.object({
  title: z.string(),
  body: z.string(),
});
type Values = z.infer<typeof schema>;

const STORAGE_KEY = 'quizhub.draft.test-form.user-1';

function createInMemoryStorage(): DraftStorage & { dump: () => Record<string, string> } {
  const map = new Map<string, string>();
  return {
    getItem: (key) => (map.has(key) ? (map.get(key) as string) : null),
    setItem: (key, value) => {
      map.set(key, value);
    },
    removeItem: (key) => {
      map.delete(key);
    },
    dump: () => Object.fromEntries(map.entries()),
  };
}

describe('useDraftAutoSave', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('(1) on mount, when no snapshot exists, savedAt is null', () => {
    const storage = createInMemoryStorage();
    const { result } = renderHook(() =>
      useForm<Values>({ defaultValues: { title: '', body: '' } })
    );
    const draft = renderHook(() =>
      useDraftAutoSave({
        form: result.current,
        formId: 'test-form',
        userId: 'user-1',
        storage,
      })
    );
    expect(draft.result.current.savedAt).toBeNull();
  });

  it('(2) writes a snapshot to storage after `intervalMs` when the form is dirty', async () => {
    const storage = createInMemoryStorage();
    const formHook = renderHook(() =>
      useForm<Values>({ defaultValues: { title: '', body: '' } })
    );
    const draft = renderHook(() =>
      useDraftAutoSave({
        form: formHook.result.current,
        formId: 'test-form',
        userId: 'user-1',
        intervalMs: 1000,
        storage,
      })
    );

    // Mark the form dirty and set a value.
    await act(async () => {
      formHook.result.current.setValue('title', 'Hello', { shouldDirty: true });
    });

    // After 1s, a snapshot is written.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(draft.result.current.savedAt).not.toBeNull();
    const stored = storage.getItem(STORAGE_KEY);
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored as string);
    expect(parsed.values).toEqual({ title: 'Hello', body: '' });
    expect(typeof parsed.savedAt).toBe('string');
  });

  it('(3) does not write to storage when the form is not dirty', async () => {
    const storage = createInMemoryStorage();
    const formHook = renderHook(() =>
      useForm<Values>({ defaultValues: { title: '', body: '' } })
    );
    const draft = renderHook(() =>
      useDraftAutoSave({
        form: formHook.result.current,
        formId: 'test-form',
        userId: 'user-1',
        intervalMs: 1000,
        storage,
      })
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    expect(draft.result.current.savedAt).toBeNull();
    expect(storage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('(4) restore() calls form.reset with the snapshot values', async () => {
    // Pre-seed a snapshot.
    const storage = createInMemoryStorage();
    const savedAt = new Date().toISOString();
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({ savedAt, values: { title: 'Restored', body: 'Body' } })
    );

    const formHook = renderHook(() =>
      useForm<Values>({ defaultValues: { title: '', body: '' } })
    );
    const draft = renderHook(() =>
      useDraftAutoSave({
        form: formHook.result.current,
        formId: 'test-form',
        userId: 'user-1',
        storage,
      })
    );

    expect(draft.result.current.savedAt).toBe(savedAt);

    act(() => {
      draft.result.current.restore();
    });

    expect(formHook.result.current.getValues()).toEqual({
      title: 'Restored',
      body: 'Body',
    });
  });

  it('(5) dismiss() removes the snapshot from storage', async () => {
    const storage = createInMemoryStorage();
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({ savedAt: '2026-01-01T00:00:00Z', values: { title: 'X', body: '' } })
    );

    const formHook = renderHook(() =>
      useForm<Values>({ defaultValues: { title: '', body: '' } })
    );
    const draft = renderHook(() =>
      useDraftAutoSave({
        form: formHook.result.current,
        formId: 'test-form',
        userId: 'user-1',
        storage,
      })
    );

    expect(draft.result.current.savedAt).not.toBeNull();

    act(() => {
      draft.result.current.dismiss();
    });

    expect(draft.result.current.savedAt).toBeNull();
    expect(storage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('(6) clears snapshot on a clean transition (dirty → clean simulates submit)', async () => {
    const storage = createInMemoryStorage();
    const formHook = renderHook(() =>
      useForm<Values>({ defaultValues: { title: '', body: '' } })
    );
    const draft = renderHook(() =>
      useDraftAutoSave({
        form: formHook.result.current,
        formId: 'test-form',
        userId: 'user-1',
        intervalMs: 1000,
        storage,
      })
    );

    // Dirty → write.
    await act(async () => {
      formHook.result.current.setValue('title', 'Dirty', { shouldDirty: true });
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(storage.getItem(STORAGE_KEY)).not.toBeNull();

    // Reset cleans the form (simulates a successful submit).
    await act(async () => {
      formHook.result.current.reset({ title: '', body: '' });
      await vi.advanceTimersByTimeAsync(100);
    });

    expect(storage.getItem(STORAGE_KEY)).toBeNull();
    expect(draft.result.current.savedAt).toBeNull();
  });

  it('(7) does not re-write identical serialized values', async () => {
    const storage = createInMemoryStorage();
    const formHook = renderHook(() =>
      useForm<Values>({ defaultValues: { title: '', body: '' } })
    );
    const draft = renderHook(() =>
      useDraftAutoSave({
        form: formHook.result.current,
        formId: 'test-form',
        userId: 'user-1',
        intervalMs: 1000,
        storage,
      })
    );

    await act(async () => {
      formHook.result.current.setValue('title', 'Stable', { shouldDirty: true });
    });

    // First tick — write.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    const firstWrite = storage.getItem(STORAGE_KEY);
    expect(firstWrite).not.toBeNull();

    // Second tick — no change → no new write.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    const secondWrite = storage.getItem(STORAGE_KEY);
    expect(secondWrite).toBe(firstWrite);
    expect(draft.result.current.savedAt).not.toBeNull();
  });

  it('(8) drops corrupt localStorage entries on read', () => {
    const storage = createInMemoryStorage();
    storage.setItem(STORAGE_KEY, 'not-json');

    const formHook = renderHook(() =>
      useForm<Values>({ defaultValues: { title: '', body: '' } })
    );
    const draft = renderHook(() =>
      useDraftAutoSave({
        form: formHook.result.current,
        formId: 'test-form',
        userId: 'user-1',
        storage,
      })
    );

    expect(draft.result.current.savedAt).toBeNull();
  });

  it('uses "anon" when userId is null', () => {
    const storage = createInMemoryStorage();
    const formHook = renderHook(() =>
      useForm<Values>({ defaultValues: { title: '', body: '' } })
    );
    // Pre-seed an anonymous snapshot.
    storage.setItem(
      'quizhub.draft.test-form.anon',
      JSON.stringify({ savedAt: '2026-01-01T00:00:00Z', values: { title: 'Anon', body: '' } })
    );

    const draft = renderHook(() =>
      useDraftAutoSave({
        form: formHook.result.current,
        formId: 'test-form',
        userId: null,
        storage,
      })
    );

    expect(draft.result.current.savedAt).toBe('2026-01-01T00:00:00Z');
  });
});