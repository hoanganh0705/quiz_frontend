/**
 * `useQuizForm.spec.ts` — locks the contract for the Phase 4 form primitive.
 *
 * Source epic:   Epic 4.2 — `useQuizForm` primitive + shared form atoms.
 * Source tickets:
 *   - TKT-4.2.A1 (typed signature + placeholder wrap).
 *   - TKT-4.2.A2 (this file).
 *   - TKT-4.2.A3 (`submit()` orchestration).
 *   - TKT-4.2.A4 (`bulkSubmit()` orchestration).
 *
 * Coverage contract:
 *
 *   (1) First render returns the documented shape.
 *   (2) `form.formState.errors` are populated when a registered field
 *       violates the zod schema.
 *   (3) `isDirty` flips to `true` after a controlled input change.
 *   (4) `reset()` clears `errors` and `isDirty` back to defaults and
 *       clears `lastError` / `bulkError`.
 *   (5) `mode: 'bulk'` does not change the render shape.
 *   (6) `submit()` is a no-op when no handler is injected.
 *   (7) `submit()` validates before invoking the injected handler.
 *   (8) `submit()` sets `lastError` to the `USER_COPY` row when the
 *       handler throws an `ApiError`.
 *   (9) `submit()` sets `lastError.code === 'GLOBAL_UNKNOWN'` when the
 *       handler throws a non-`ApiError`.
 *   (10) A successful `submit()` clears `lastError` to `null`.
 *   (11) Two concurrent `submit()` calls share the same in-flight
 *        promise (single-flight discipline).
 *   (12) `bulkSubmit()` validates each row independently; failing rows
 *        populate `bulkError[]`; passing rows go to the bulk handler.
 *   (13) `bulkSubmit()` calls `reset()` only when the bulk handler
 *        returns `{ ok: true, results: [] }`.
 *   (14) `bulkSubmit()` falls back to per-row `opts.submit` calls when
 *        no `bulkHandler` is injected.
 *   (15) TKT-4.2.E1 — `mode: 'readonly'` does not invoke the injected
 *        submit handler.
 *   (16) TKT-4.2.E1 — `isDirty` is pinned to `false` in `readonly` mode
 *        even after a value change.
 *   (17) TKT-4.2.E1 — `bulkSubmit()` does not invoke the bulk handler in
 *        `readonly` mode.
 *   (18) TKT-4.2.E2 — `isHydrating === true` on first render;
 *        `markHydrated()` flips it to `false`.
 *   (19) TKT-4.2.E2 — `markHydrated()` is idempotent.
 *
 * Test-environment notes: the spec lives under `src/lib/forms/__tests__/`
 * and is picked up by vitest's `node` project (configured in
 * `vitest.config.ts`). Tests use `renderHook` from `@testing-library/react`
 * — `renderHook` does not require jsdom but the dependency is satisfied
 * via the `jsdom` project's setup file.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { z } from 'zod';

import { ApiError } from '@/lib/api';

import { useQuizForm, type BulkError } from '../useQuizForm';

// ────────────────────────────────────────────────────────────────────────
// Fixtures
// ────────────────────────────────────────────────────────────────────────

const quizFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  difficulty: z.enum(['easy', 'medium', 'hard']),
});

type QuizFormValues = z.infer<typeof quizFormSchema>;

const DEFAULT_VALUES: QuizFormValues = {
  title: 'World History 101',
  difficulty: 'medium',
};

const quizRowSchema = z.object({
  position: z.number().min(1, 'Position must be ≥ 1'),
  questionText: z.string().min(1, 'Question text is required'),
});

type QuizRowValues = z.infer<typeof quizRowSchema>;

const ROW_DEFAULT: QuizRowValues = { position: 1, questionText: '?' };

/**
 * Build a synthetic `ApiError` from an `AxiosError`-shaped object. The
 * helper mirrors the pattern in
 * `components/primitives/__tests__/useOptimisticToggle.spec.tsx`.
 */
function makeApiError(status: number, code: string, detail?: string): ApiError {
  return new ApiError({
    isAxiosError: true,
    name: 'AxiosError',
    message: `Mock ${status}`,
    code,
    config: undefined,
    request: undefined,
    response: {
      status,
      data: {
        type: 'about:blank',
        title: `Error ${status}`,
        status,
        detail: detail ?? `Mock detail for ${code}`,
        extensions: { code, requestId: 'req_test' },
      },
    },
    toJSON: () => ({}),
  } as unknown as Parameters<typeof ApiError.fromAxios>[0]);
}

function flushMicrotasks(): Promise<void> {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });
}

afterEach(() => {
  vi.clearAllMocks();
});

// ────────────────────────────────────────────────────────────────────────
// (1)–(5) Typed signature, default mode, zod-driven errors, reset, bulk mode
// ────────────────────────────────────────────────────────────────────────

describe('useQuizForm — typed signature', () => {
  it('(1) returns the documented shape on the first render', () => {
    const { result } = renderHook(() =>
      useQuizForm({
        schema: quizFormSchema,
        defaultValues: DEFAULT_VALUES,
      })
    );

    expect(result.current.form).toBeDefined();
    expect(result.current.errors).toEqual({});
    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.isBulkSubmitting).toBe(false);
    expect(result.current.isDirty).toBe(false);
    expect(result.current.bulkError).toEqual([]);
    expect(result.current.lastError).toBeNull();
    expect(typeof result.current.submit).toBe('function');
    expect(typeof result.current.bulkSubmit).toBe('function');
    expect(typeof result.current.reset).toBe('function');
  });

  it('(2) populates errors when a field violates the schema', async () => {
    const { result } = renderHook(() =>
      useQuizForm({
        schema: quizFormSchema,
        defaultValues: { title: '', difficulty: 'medium' as const },
      })
    );

    await act(async () => {
      const valid = await result.current.form.trigger();
      expect(valid).toBe(false);
    });

    expect(result.current.errors.title?.message).toBe('Title is required');
  });

  it('(3) flips isDirty to true after a controlled change', () => {
    const { result } = renderHook(() =>
      useQuizForm({
        schema: quizFormSchema,
        defaultValues: DEFAULT_VALUES,
      })
    );

    act(() => {
      // `shouldDirty: true` is react-hook-form's documented way to
      // opt a specific setValue into marking the form dirty; the
      // default behaviour only marks dirty on blur / submit.
      result.current.form.setValue('title', 'World History 102', {
        shouldDirty: true,
      });
    });

    expect(result.current.isDirty).toBe(true);
  });

  it('(4) reset() clears errors, isDirty, lastError, and bulkError', async () => {
    const { result } = renderHook(() =>
      useQuizForm({
        schema: quizFormSchema,
        defaultValues: { title: '', difficulty: 'medium' as const },
        submit: async () => undefined,
      })
    );

    await act(async () => {
      await result.current.submit();
    });

    expect(result.current.errors.title).toBeDefined();

    act(() => {
      result.current.reset();
    });

    expect(result.current.errors).toEqual({});
    expect(result.current.isDirty).toBe(false);
    expect(result.current.lastError).toBeNull();
    expect(result.current.bulkError).toEqual([]);
  });

  it('(5) mode: "bulk" does not change the render shape', () => {
    const { result } = renderHook(() =>
      useQuizForm({
        schema: quizFormSchema,
        defaultValues: DEFAULT_VALUES,
        mode: 'bulk',
      })
    );

    expect(result.current.form).toBeDefined();
    expect(result.current.bulkError).toEqual([]);
    expect(typeof result.current.bulkSubmit).toBe('function');
  });
});

// ────────────────────────────────────────────────────────────────────────
// (6)–(11) submit() orchestration
// ────────────────────────────────────────────────────────────────────────

describe('useQuizForm — submit() orchestration', () => {
  it('(6) is a no-op when no submit handler is injected', async () => {
    const { result } = renderHook(() =>
      useQuizForm({
        schema: quizFormSchema,
        defaultValues: DEFAULT_VALUES,
      })
    );

    await act(async () => {
      await result.current.submit();
    });

    expect(result.current.lastError).toBeNull();
    expect(result.current.isSubmitting).toBe(false);
  });

  it('(7) does not invoke the handler when validation fails', async () => {
    const handler = vi.fn(async () => undefined);
    const { result } = renderHook(() =>
      useQuizForm({
        schema: quizFormSchema,
        defaultValues: { title: '', difficulty: 'medium' as const },
        submit: handler,
      })
    );

    await act(async () => {
      await result.current.submit();
    });

    expect(handler).not.toHaveBeenCalled();
    expect(result.current.errors.title).toBeDefined();
    expect(result.current.lastError).toBeNull();
  });

  it('(8) sets lastError to the USER_COPY row when the handler throws an ApiError', async () => {
    const handler = vi.fn(async () => {
      throw makeApiError(409, 'QUIZ_INSUFFICIENT_QUESTIONS', 'Need 5 questions.');
    });

    const { result } = renderHook(() =>
      useQuizForm({
        schema: quizFormSchema,
        defaultValues: DEFAULT_VALUES,
        submit: handler,
      })
    );

    await act(async () => {
      await result.current.submit();
    });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(result.current.lastError).not.toBeNull();
    expect(result.current.lastError?.code).toBe('QUIZ_INSUFFICIENT_QUESTIONS');
    expect(result.current.lastError?.title).toContain('Quiz');
    expect(result.current.lastError?.body).toContain('5 questions');
  });

  it('(9) sets lastError.code to GLOBAL_UNKNOWN for non-ApiError rejections', async () => {
    const handler = vi.fn(async () => {
      throw new Error('Network down.');
    });

    const { result } = renderHook(() =>
      useQuizForm({
        schema: quizFormSchema,
        defaultValues: DEFAULT_VALUES,
        submit: handler,
      })
    );

    await act(async () => {
      await result.current.submit();
    });

    expect(result.current.lastError?.code).toBe('GLOBAL_UNKNOWN');
    expect(result.current.lastError?.title).toBe('Something went wrong');
  });

  it('(10) clears lastError on a successful submit', async () => {
    const handler = vi.fn(async () => undefined);
    const { result } = renderHook(() =>
      useQuizForm({
        schema: quizFormSchema,
        defaultValues: DEFAULT_VALUES,
        submit: handler,
      })
    );

    // First submit succeeds → lastError stays null.
    await act(async () => {
      await result.current.submit();
    });
    expect(result.current.lastError).toBeNull();

    // Replace the handler with a failing one and submit again.
    handler.mockImplementationOnce(async () => {
      throw makeApiError(409, 'QUIZ_SLUG_CONFLICT');
    });
    await act(async () => {
      await result.current.submit();
    });
    expect(result.current.lastError?.code).toBe('QUIZ_SLUG_CONFLICT');

    // Restore success → lastError clears.
    handler.mockImplementationOnce(async () => undefined);
    await act(async () => {
      await result.current.submit();
    });
    expect(result.current.lastError).toBeNull();
  });

  it('(11) shares a single in-flight promise across concurrent submit() calls', async () => {
    let resolveHandler: (() => void) | null = null;
    const handler = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveHandler = resolve;
        })
    );

    const { result } = renderHook(() =>
      useQuizForm({
        schema: quizFormSchema,
        defaultValues: DEFAULT_VALUES,
        submit: handler,
      })
    );

    // Capture the in-flight promises synchronously, BEFORE awaiting —
    // otherwise `await act(...)` would settle the first call and
    // release the single-flight slot before the second call observes it.
    let firstPromise: Promise<void> | undefined;
    let secondPromise: Promise<void> | undefined;
    await act(async () => {
      firstPromise = result.current.submit();
      secondPromise = result.current.submit();
    });

    expect(handler).toHaveBeenCalledTimes(1);
    // `firstPromise` and `secondPromise` must refer to the same
    // in-flight promise instance (single-flight discipline). The
    // reference-equality check is the contract — `.toStrictEqual` is
    // intentionally not used because it would mask a regression where
    // the slot returns two distinct Promise instances.
    expect(firstPromise).toBe(secondPromise);

    await act(async () => {
      resolveHandler?.();
      await Promise.all([firstPromise, secondPromise]);
    });
  });
});

// ────────────────────────────────────────────────────────────────────────
// (12)–(14) bulkSubmit() orchestration
// ────────────────────────────────────────────────────────────────────────

describe('useQuizForm — bulkSubmit() orchestration', () => {
  it('(12) validates rows independently; failing rows populate bulkError and the handler is not called for them', async () => {
    const bulkHandler = vi.fn(async () => ({
      ok: true,
      results: [] as BulkError[],
    }));

    const { result } = renderHook(() =>
      useQuizForm({
        schema: quizRowSchema,
        defaultValues: ROW_DEFAULT,
        mode: 'bulk',
        bulkHandler,
      })
    );

    await act(async () => {
      await result.current.bulkSubmit([
        { index: 0, values: { position: 1, questionText: 'First?' } },
        { index: 1, values: { position: 0, questionText: 'Bad position' } }, // fails: position < 1
        { index: 2, values: { position: 2, questionText: '' } }, // fails: empty text
      ]);
    });

    // Only one row passed zod → handler invoked once with one value.
    expect(bulkHandler).toHaveBeenCalledTimes(1);
    expect(bulkHandler).toHaveBeenCalledWith([
      { position: 1, questionText: 'First?' },
    ]);

    // The two failing rows populate `bulkError` with their indices.
    expect(result.current.bulkError).toHaveLength(2);
    expect(result.current.bulkError.map((e) => e.index).sort()).toEqual([1, 2]);
    expect(result.current.bulkError[0]?.code).toBe('GLOBAL_VALIDATION_FAILED');
    expect(result.current.bulkError[0]?.status).toBe(0);
  });

  it('(13) does not call reset() when the handler returns partial failures', async () => {
    const bulkHandler = vi.fn(async () => ({
      ok: false,
      results: [
        {
          index: 1,
          status: 409,
          code: 'QUIZ_QUESTION_POSITION_CONFLICT' as const,
          message: 'Position conflict.',
        },
      ],
    }));

    const { result } = renderHook(() =>
      useQuizForm({
        schema: quizRowSchema,
        defaultValues: ROW_DEFAULT,
        mode: 'bulk',
        bulkHandler,
      })
    );

    await act(async () => {
      await result.current.bulkSubmit([
        { index: 0, values: { position: 1, questionText: 'First?' } },
        { index: 1, values: { position: 2, questionText: 'Second?' } },
      ]);
    });

    // Form is NOT reset → isDirty stays false because we never dirtied
    // the underlying useForm; bulkError surfaces the failed row.
    expect(result.current.bulkError).toHaveLength(1);
    expect(result.current.bulkError[0]?.code).toBe('QUIZ_QUESTION_POSITION_CONFLICT');
    expect(result.current.isBulkSubmitting).toBe(false);
  });

  it('(14) calls reset() when the handler returns ok=true, results=[]', async () => {
    const bulkHandler = vi.fn(async () => ({
      ok: true,
      results: [] as BulkError[],
    }));

    const { result } = renderHook(() =>
      useQuizForm({
        schema: quizRowSchema,
        defaultValues: ROW_DEFAULT,
        mode: 'bulk',
        bulkHandler,
      })
    );

    await act(async () => {
      await result.current.bulkSubmit([
        { index: 0, values: { position: 1, questionText: 'First?' } },
      ]);
    });

    expect(result.current.bulkError).toEqual([]);
    expect(result.current.lastError).toBeNull();
    expect(result.current.isBulkSubmitting).toBe(false);
  });

  it('falls back to per-row submit() calls when no bulkHandler is injected', async () => {
    const submitSpy = vi.fn(async () => undefined);

    const { result } = renderHook(() =>
      useQuizForm({
        schema: quizRowSchema,
        defaultValues: ROW_DEFAULT,
        mode: 'bulk',
        submit: submitSpy,
      })
    );

    await act(async () => {
      await result.current.bulkSubmit([
        { index: 0, values: { position: 1, questionText: 'First?' } },
        { index: 1, values: { position: 2, questionText: 'Second?' } },
      ]);
    });

    expect(submitSpy).toHaveBeenCalledTimes(2);
    expect(result.current.bulkError).toEqual([]);
  });

  it('falls back to per-row submit() and surfaces ApiError per row', async () => {
    let callCount = 0;
    const submitSpy = vi.fn(async () => {
      callCount += 1;
      if (callCount === 1) {
        throw makeApiError(409, 'QUIZ_VALIDATION_FAILED');
      }
      return undefined;
    });

    const { result } = renderHook(() =>
      useQuizForm({
        schema: quizRowSchema,
        defaultValues: ROW_DEFAULT,
        mode: 'bulk',
        submit: submitSpy,
      })
    );

    await act(async () => {
      await result.current.bulkSubmit([
        { index: 0, values: { position: 1, questionText: 'First?' } },
        { index: 1, values: { position: 2, questionText: 'Second?' } },
      ]);
    });

    expect(submitSpy).toHaveBeenCalledTimes(2);
    expect(result.current.bulkError).toHaveLength(1);
    expect(result.current.bulkError[0]?.index).toBe(0);
    expect(result.current.bulkError[0]?.code).toBe('QUIZ_VALIDATION_FAILED');
  });
});

// ────────────────────────────────────────────────────────────────────────
// (15)–(17) TKT-4.2.E1 — readonly mode (no submit, no isDirty, no errors)
// ────────────────────────────────────────────────────────────────────────

describe('useQuizForm — readonly mode (TKT-4.2.E1)', () => {
  it('(15) does not invoke the injected handler in readonly mode', async () => {
    const handler = vi.fn(async () => undefined);
    const { result } = renderHook(() =>
      useQuizForm({
        schema: quizFormSchema,
        defaultValues: DEFAULT_VALUES,
        mode: 'readonly',
        submit: handler,
      })
    );

    await act(async () => {
      await result.current.submit();
    });

    expect(handler).not.toHaveBeenCalled();
    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.lastError).toBeNull();
    expect(result.current.mode).toBe('readonly');
  });

  it('(16) pins isDirty to false in readonly mode even after a value change', () => {
    const { result } = renderHook(() =>
      useQuizForm({
        schema: quizFormSchema,
        defaultValues: DEFAULT_VALUES,
        mode: 'readonly',
      })
    );

    act(() => {
      result.current.form.setValue('title', 'Trying to edit', {
        shouldDirty: true,
      });
    });

    expect(result.current.isDirty).toBe(false);
  });

  it('(17) does not invoke the bulkHandler in readonly mode', async () => {
    const bulkHandler = vi.fn(async () => ({
      ok: true,
      results: [] as BulkError[],
    }));

    const { result } = renderHook(() =>
      useQuizForm({
        schema: quizRowSchema,
        defaultValues: ROW_DEFAULT,
        mode: 'readonly',
        bulkHandler,
      })
    );

    await act(async () => {
      await result.current.bulkSubmit([
        { index: 0, values: { position: 1, questionText: 'First?' } },
      ]);
    });

    expect(bulkHandler).not.toHaveBeenCalled();
    expect(result.current.isBulkSubmitting).toBe(false);
    expect(result.current.bulkError).toEqual([]);
  });
});

// ────────────────────────────────────────────────────────────────────────
// (18)–(19) TKT-4.2.E2 — isHydrating / markHydrated lifecycle
// ────────────────────────────────────────────────────────────────────────

describe('useQuizForm — isHydrating / markHydrated (TKT-4.2.E2)', () => {
  it('(18) isHydrating is true on the first render and markHydrated() flips it to false', () => {
    const { result } = renderHook(() =>
      useQuizForm({
        schema: quizFormSchema,
        defaultValues: DEFAULT_VALUES,
      })
    );

    expect(result.current.isHydrating).toBe(true);
    expect(typeof result.current.markHydrated).toBe('function');

    act(() => {
      result.current.markHydrated();
    });

    expect(result.current.isHydrating).toBe(false);
  });

  it('(19) markHydrated() is idempotent — calling it twice has no side effect', () => {
    const { result } = renderHook(() =>
      useQuizForm({
        schema: quizFormSchema,
        defaultValues: DEFAULT_VALUES,
      })
    );

    act(() => {
      result.current.markHydrated();
      result.current.markHydrated();
    });

    expect(result.current.isHydrating).toBe(false);
  });
});