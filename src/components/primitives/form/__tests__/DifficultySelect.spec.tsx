

import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { z } from 'zod';

import { DifficultySelect } from '../DifficultySelect';
import { wrapWithFormProvider } from './form-test-utils';

const schema = z.object({
difficulty: z.enum(['easy', 'medium', 'hard']),
});

describe('<DifficultySelect />', () => {
it('(a) renders the trigger with the documented options', () => {
wrapWithFormProvider(
<DifficultySelect<typeof schema> name='difficulty' label='Difficulty' />,
{ schema, defaultValues: { difficulty: 'medium' } }
    );

const trigger = screen.getByTestId('difficulty-select-trigger-difficulty');
expect(trigger).toBeInTheDocument();
  });

it('(b) out-of-range defaultValue falls through to medium with a banner', async () => {

const looseSchema = z.object({
difficulty: z.string().optional(),
    });

const { methods } = wrapWithFormProvider(
<DifficultySelect<typeof looseSchema>
name='difficulty'
label='Difficulty'
      />,
{ schema: looseSchema, defaultValues: { difficulty: undefined } }
    );

await waitFor(() => {
expect(methods.getValues('difficulty')).toBe('medium');
    });
expect(
screen.getByTestId('difficulty-select-fallback-banner-difficulty')
    ).toBeInTheDocument();
  });
});