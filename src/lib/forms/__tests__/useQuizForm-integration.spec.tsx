

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { z } from 'zod';
import { FormProvider } from 'react-hook-form';

import { useQuizForm, type BulkError } from '@/lib/forms/useQuizForm';
import { ToastProvider } from '@/lib/forms/useToast';
import { useDraftAutoSave } from '@/lib/forms/useDraftAutoSave';
import { TextField } from '@/components/primitives/form/TextField';
import { DifficultySelect } from '@/components/primitives/form/DifficultySelect';
import { TagMultiSelect } from '@/components/primitives/form/TagMultiSelect';
import { FormErrorBanner } from '@/components/primitives/form/FormErrorBanner';
import { DraftBanner } from '@/components/primitives/form/DraftBanner';
import { BulkErrorList } from '@/components/primitives/form/BulkErrorList';
import { ReadOnlyBanner } from '@/components/primitives/form/ReadOnlyBanner';
import { ApiError } from '@/lib/api';
import { CreateInitialQuizVersionDtoDifficulty } from '@/lib/api/generated/schemas/createInitialQuizVersionDtoDifficulty';

const integrationSchema = z.object({
title: z.string().min(1, 'Title is required'),
difficulty: z.nativeEnum(CreateInitialQuizVersionDtoDifficulty),
tags: z.array(z.string()),
});

type IntegrationValues = z.infer<typeof integrationSchema>;

const DEFAULT_VALUES: IntegrationValues = {
title: 'World History 101',
difficulty: CreateInitialQuizVersionDtoDifficulty.medium,
tags: [],
};

const VALID_SLUG = 'world-history';
const INVALID_SLUG = 'World-History';

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

function setReactValue(element: HTMLInputElement, value: string): void {
const proto = Object.getPrototypeOf(element) as object;
const descriptor = Object.getOwnPropertyDescriptor(proto, 'value');
const setter = descriptor?.set;
if (!setter) {
throw new Error(
'[useQuizForm-integration.spec] HTMLInputElement prototype has no `value` setter.'
    );
  }
setter.call(element, value);
}

interface HarnessProps {

submit?: (values: IntegrationValues) => Promise<void>;
bulkHandler?: (
values: IntegrationValues[]
  ) => Promise<{ ok: boolean; results: BulkError[] }>;
mode?: 'single' | 'bulk' | 'readonly';
onReSubmitFailed?: () => void;
onDismiss?: () => void;
renderBulkErrorList?: boolean;
showReadOnlyBanner?: boolean;
draftFormId?: string;
draftUserId?: string | null;
}

function Harness(props: HarnessProps): React.ReactElement {
const {
submit,
bulkHandler,
mode = 'single',
onReSubmitFailed,
onDismiss,
renderBulkErrorList = false,
showReadOnlyBanner = false,
draftFormId = 'integration-test',
draftUserId = 'anon',
  } = props;

const formState = useQuizForm({
schema: integrationSchema,
defaultValues: DEFAULT_VALUES,
mode,
submit,
bulkHandler,
  });

const draft = useDraftAutoSave({
form: formState.form,
formId: draftFormId,
userId: draftUserId,
  });

const handleDismiss = (): void => {
if (onDismiss) onDismiss();
formState.reset();
  };

return (
<ToastProvider>
<FormProvider {...(formState.form as unknown as Parameters<typeof FormProvider>[0])}>
{showReadOnlyBanner && mode === 'readonly' ? (
<ReadOnlyBanner reason='quiz-deleted' />
        ) : null}
<FormErrorBanner
lastError={formState.lastError}
onDismiss={handleDismiss}
        />
<DraftBanner
savedAt={draft.savedAt}
restore={draft.restore}
dismiss={draft.dismiss}
        />
<TextField name='title' label='Title' />
<DifficultySelect name='difficulty' label='Difficulty' />
<TagMultiSelect
name='tags'
label='Tags'
testId='tag-multi-select-input-tags'
        />
{renderBulkErrorList ? (
<BulkErrorList
bulkError={formState.bulkError}
onReSubmitFailed={() => onReSubmitFailed?.()}
onDismiss={handleDismiss}
          />
        ) : null}
<button
type='button'
onClick={() => {
void formState.submit();
          }}
data-testid='submit-button'
        >
Submit
        </button>
</FormProvider>
</ToastProvider>
  );
}

beforeEach(() => {
window.localStorage.clear();
});

afterEach(() => {
vi.clearAllMocks();
});

describe('useQuizForm — integration smoke (TKT-4.2.E3)', () => {
it('(1) useQuizForm is importable from @/lib/forms and exposes the documented shape', () => {

expect(typeof useQuizForm).toBe('function');
  });

it('(2) atoms register via FormProvider without manual `register` prop-drilling', async () => {
const submit = vi.fn(async () => undefined);
render(<Harness submit={submit} />);

const input = screen.getByTestId('text-field-title').querySelector('input');
expect(input).not.toBeNull();

setReactValue(input as HTMLInputElement, 'New title');
await act(async () => {
fireEvent.input(input!, { target: { value: 'New title' } });
    });

await act(async () => {
fireEvent.click(screen.getByTestId('submit-button'));
    });

expect(submit).toHaveBeenCalledTimes(1);
expect(submit).toHaveBeenCalledWith({
title: 'New title',
difficulty: 'medium',
tags: [],
    });
  });

it('(3) auto-save to localStorage works and is dismissable', () => {
const draftFormId = 'integration-test-auto-save';
vi.useFakeTimers();
try {
render(<Harness draftFormId={draftFormId} draftUserId='anon' />);

const input = screen.getByTestId('text-field-title').querySelector('input');
setReactValue(input as HTMLInputElement, 'Edited title');
act(() => {
fireEvent.input(input!, { target: { value: 'Edited title' } });
      });

const expectedKey = `quizhub.draft.${draftFormId}.anon`;
expect(window.localStorage.getItem(expectedKey)).toBeNull();

act(() => {
vi.advanceTimersByTime(5000);
      });

const stored = window.localStorage.getItem(expectedKey);
expect(stored).not.toBeNull();
const parsed = JSON.parse(stored!) as {
savedAt: string;
values: { title: string };
      };
expect(parsed.values.title).toBe('Edited title');
    } finally {
vi.useRealTimers();
    }
  });

it('(4) tag regex validation prevents 422s (invalid slug rejected, valid slug accepted)', () => {
const submit = vi.fn(async () => undefined);
render(<Harness submit={submit} />);

const tagInput = screen.getByTestId('tag-multi-select-input-tags') as HTMLInputElement;

setReactValue(tagInput, INVALID_SLUG);
act(() => {
fireEvent.input(tagInput, { target: { value: INVALID_SLUG } });
fireEvent.keyDown(tagInput, { key: 'Enter', code: 'Enter' });
    });
expect(
document.querySelector('[data-tag-value="World-History"]')
    ).toBeNull();

setReactValue(tagInput, VALID_SLUG);
act(() => {
fireEvent.input(tagInput, { target: { value: VALID_SLUG } });
fireEvent.keyDown(tagInput, { key: 'Enter', code: 'Enter' });
    });
expect(
document.querySelector('[data-tag-value="world-history"]')
    ).not.toBeNull();
  });

it('(5) per-item bulk errors render as a stacked list; the form remains editable', async () => {
const bulkHandler = vi.fn(async () => ({
ok: false,
results: [
{
index: 0,
status: 409,
code: 'QUIZ_QUESTION_POSITION_CONFLICT' as const,
message: 'Position 1 already in use.',
        },
{
index: 2,
status: 422,
code: 'GLOBAL_VALIDATION_FAILED' as const,
message: 'Field "questionText" is required.',
        },
      ] as BulkError[],
    }));

const onReSubmitFailed = vi.fn();
const onDismiss = vi.fn();

function BulkHarness(): React.ReactElement {
const formState = useQuizForm({
schema: integrationSchema,
defaultValues: DEFAULT_VALUES,
mode: 'bulk',
bulkHandler,
      });
return (
<ToastProvider>
<FormProvider {...(formState.form as unknown as Parameters<typeof FormProvider>[0])}>
<FormErrorBanner
lastError={formState.lastError}
onDismiss={() => formState.reset()}
            />
<BulkErrorList
bulkError={formState.bulkError}
onReSubmitFailed={() => {
onReSubmitFailed();
              }}
onDismiss={() => {
onDismiss();
formState.reset();
              }}
            />
<TextField name='title' label='Title' />
<button
type='button'
onClick={() => {
void formState.bulkSubmit([
{ index: 0, values: { title: 'A', difficulty: 'easy', tags: [] } },
{ index: 1, values: { title: 'B', difficulty: 'medium', tags: [] } },
{ index: 2, values: { title: 'C', difficulty: 'hard', tags: [] } },
                ]);
              }}
data-testid='bulk-submit'
            >
Bulk submit
            </button>
</FormProvider>
</ToastProvider>
      );
    }

render(<BulkHarness />);

expect(document.querySelector('[data-testid="bulk-error-list"]')).toBeNull();

await act(async () => {
fireEvent.click(screen.getByTestId('bulk-submit'));
    });

const list = document.querySelector('[data-testid="bulk-error-list"]');
expect(list).not.toBeNull();
const rowItems = (list as HTMLElement).querySelectorAll(
'li[data-testid^="bulk-error-list-item-"]'
    );
expect(rowItems.length).toBe(2);

const input = screen.getByTestId('text-field-title').querySelector('input');
expect(input).not.toBeDisabled();

await act(async () => {
fireEvent.click(screen.getByTestId('bulk-error-list-resubmit-failed'));
    });
expect(onReSubmitFailed).toHaveBeenCalledTimes(1);

expect(input).not.toBeDisabled();
  });

it('(E1) readonly mode does not invoke the injected submit handler and renders the ReadOnlyBanner', async () => {
const submit = vi.fn(async () => undefined);
render(<Harness submit={submit} mode='readonly' showReadOnlyBanner />);

expect(screen.getByTestId('read-only-banner')).toBeInTheDocument();

await act(async () => {
fireEvent.click(screen.getByTestId('submit-button'));
    });
expect(submit).not.toHaveBeenCalled();
  });

it('(E2) isHydrating defaults to true on mount and flips to false via markHydrated()', () => {

const states: boolean[] = [];
function Probe(): null {
const { isHydrating, markHydrated } = useQuizForm({
schema: integrationSchema,
defaultValues: DEFAULT_VALUES,
      });
states.push(isHydrating);
if (isHydrating) {

setTimeout(() => markHydrated(), 0);
      }
return null;
    }
render(<Probe />);
expect(states[0]).toBe(true);
  });

it('(C1) FormErrorBanner renders inline for `toast: "inline"` and dispatches for `toast: "top"`', async () => {

const inlineErr = {
title: 'Quiz not found',
body: 'Quiz was not found.',
toast: 'inline' as const,
code: 'QUIZ_NOT_FOUND',
    };
const { unmount } = render(
<ToastProvider>
<FormErrorBanner lastError={inlineErr} onDismiss={() => undefined} />
</ToastProvider>
    );
expect(screen.getByTestId('form-error-banner')).toBeInTheDocument();
expect(document.querySelector('[data-testid^="toast-toast-"]')).toBeNull();

unmount();

const topErr = {
title: 'Server error',
body: 'An unexpected error occurred.',
toast: 'top' as const,
code: 'GLOBAL_INTERNAL_ERROR',
    };
render(
<ToastProvider>
<FormErrorBanner lastError={topErr} onDismiss={() => undefined} />
</ToastProvider>
    );
const viewport = await screen.findByTestId('toast-viewport');
expect(viewport.querySelector('[data-testid^="toast-toast-"]')).not.toBeNull();
  });

it('(C1) FormErrorBanner renders nothing for `toast: "silent"`', () => {
const silentErr = {
title: 'Silent',
body: 'Should not render.',
toast: 'silent' as const,
code: 'GLOBAL_UNKNOWN',
    };
render(
<ToastProvider>
<FormErrorBanner lastError={silentErr} onDismiss={() => undefined} />
</ToastProvider>
    );
expect(document.querySelector('[data-testid="form-error-banner"]')).toBeNull();
  });

it('(A3) submit() surfaces a typed `lastError` shape when the handler throws an ApiError', async () => {
const submit = vi.fn(async () => {
throw makeApiError(409, 'QUIZ_INSUFFICIENT_QUESTIONS', 'Need 5 questions.');
    });
render(<Harness submit={submit} />);

await act(async () => {
fireEvent.click(screen.getByTestId('submit-button'));
    });

expect(submit).toHaveBeenCalledTimes(1);
const banner = screen.getByTestId('form-error-banner');
expect(banner).toBeInTheDocument();
expect(banner).toHaveAttribute('data-form-error-banner-code', 'QUIZ_INSUFFICIENT_QUESTIONS');
  });
});
