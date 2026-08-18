

import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { z } from 'zod';

import { ApiError } from '@/lib/api';

import { useQuizForm, type BulkError } from '../useQuizForm';

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

await act(async () => {
await result.current.submit();
    });
expect(result.current.lastError).toBeNull();

handler.mockImplementationOnce(async () => {
throw makeApiError(409, 'QUIZ_SLUG_CONFLICT');
    });
await act(async () => {
await result.current.submit();
    });
expect(result.current.lastError?.code).toBe('QUIZ_SLUG_CONFLICT');

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

let firstPromise: Promise<void> | undefined;
let secondPromise: Promise<void> | undefined;
await act(async () => {
firstPromise = result.current.submit();
secondPromise = result.current.submit();
    });

expect(handler).toHaveBeenCalledTimes(1);

expect(firstPromise).toBe(secondPromise);

await act(async () => {
resolveHandler?.();
await Promise.all([firstPromise, secondPromise]);
    });
  });
});

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
{ index: 1, values: { position: 0, questionText: 'Bad position' } },
{ index: 2, values: { position: 2, questionText: '' } }, // fails: empty text
      ]);
    });

expect(bulkHandler).toHaveBeenCalledTimes(1);
expect(bulkHandler).toHaveBeenCalledWith([
{ position: 1, questionText: 'First?' },
    ]);

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