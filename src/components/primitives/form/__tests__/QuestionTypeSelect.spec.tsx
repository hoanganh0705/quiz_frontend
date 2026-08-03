/**
 * `<QuestionTypeSelect />` unit tests.
 *
 * Source epic:   Epic 4.2 — `useQuizForm` primitive + shared form atoms.
 * Source ticket: TKT-4.2.B5.
 *
 * Coverage contract:
 *   (a) renders the trigger with all five documented options.
 *   (b) on out-of-range defaultValue, writes `single_choice` back to
 *       the form state and surfaces the fallback banner.
 */

import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { z } from 'zod';

import { QuestionTypeSelect, QUESTION_TYPE_VALUES } from '../QuestionTypeSelect';
import { wrapWithFormProvider } from './form-test-utils';

describe('<QuestionTypeSelect />', () => {
  it('(a) renders the trigger with all five documented options', () => {
    const schema = z.object({
      type: z.enum(QUESTION_TYPE_VALUES as unknown as [string, ...string[]]),
    });
    wrapWithFormProvider(
      <QuestionTypeSelect<typeof schema> name='type' label='Question type' />,
      { schema, defaultValues: { type: 'single_choice' } }
    );
    expect(
      screen.getByTestId('question-type-select-trigger-type')
    ).toBeInTheDocument();
  });

  it('(b) out-of-range defaultValue falls through to single_choice with a banner', async () => {
    const looseSchema = z.object({
      type: z.string().optional(),
    });

    const { methods } = wrapWithFormProvider(
      <QuestionTypeSelect<typeof looseSchema> name='type' label='Question type' />,
      { schema: looseSchema, defaultValues: { type: undefined } }
    );

    await waitFor(() => {
      expect(methods.getValues('type')).toBe('single_choice');
    });
    expect(
      screen.getByTestId('question-type-select-fallback-banner-type')
    ).toBeInTheDocument();
  });
});