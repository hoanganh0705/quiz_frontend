

import { describe, expect, it } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { z } from 'zod';

import { TagMultiSelect } from '../TagMultiSelect';
import { wrapWithFormProvider } from './form-test-utils';

const schema = z.object({
tags: z.array(z.string()).max(3, 'Too many tags'),
});

function setReactValue(element: HTMLInputElement, value: string): void {
const proto = Object.getPrototypeOf(element) as object;
const descriptor = Object.getOwnPropertyDescriptor(proto, 'value');
const setter = descriptor?.set;
if (!setter) {
throw new Error(
'[TagMultiSelect.spec] HTMLInputElement prototype has no `value` setter ' +
'— jsdom is missing or the polyfill in setup.ts did not run.'
    );
  }
setter.call(element, value);
}

describe('<TagMultiSelect />', () => {
it('(a) pressing Enter with a valid slug adds the tag', () => {
const { methods } = wrapWithFormProvider(
<TagMultiSelect<typeof schema>
name='tags'
label='Tags'
testId='tag-multi-select-input-tags'
      />,
{ schema, defaultValues: { tags: [] } }
    );

const input = screen.getByTestId('tag-multi-select-input-tags') as HTMLInputElement;
setReactValue(input, 'world-history');
fireEvent.input(input, { target: { value: 'world-history' } });
fireEvent.keyDown(input, { key: 'Enter' });

expect(methods.getValues('tags')).toEqual(['world-history']);

expect(screen.getByText('world-history')).toBeInTheDocument();
  });

it('(b) invalid slugs are rejected with the documented copy', () => {
wrapWithFormProvider(
<TagMultiSelect<typeof schema>
name='tags'
label='Tags'
testId='tag-multi-select-input-tags'
      />,
{ schema, defaultValues: { tags: [] } }
    );

const input = screen.getByTestId('tag-multi-select-input-tags') as HTMLInputElement;
setReactValue(input, 'Bad-Slug');
fireEvent.input(input, { target: { value: 'Bad-Slug' } });
fireEvent.keyDown(input, { key: 'Enter' });

expect(
screen.getByText(/Tags must be lowercase alphanumeric/)
    ).toBeInTheDocument();
  });

it('(c) duplicate slugs are silently dropped', () => {
const { methods } = wrapWithFormProvider(
<TagMultiSelect<typeof schema>
name='tags'
label='Tags'
testId='tag-multi-select-input-tags'
      />,
{ schema, defaultValues: { tags: ['history'] } }
    );

const input = screen.getByTestId('tag-multi-select-input-tags') as HTMLInputElement;
setReactValue(input, 'history');
fireEvent.input(input, { target: { value: 'history' } });
fireEvent.keyDown(input, { key: 'Enter' });

expect(methods.getValues('tags')).toEqual(['history']);
  });

it('(d) max enforcement disables the input once the cap is reached', () => {
wrapWithFormProvider(
<TagMultiSelect<typeof schema>
name='tags'
label='Tags'
max={2}
testId='tag-multi-select-input-tags'
      />,
{
schema,
defaultValues: { tags: ['a', 'b'] },
      }
    );

const input = screen.getByTestId('tag-multi-select-input-tags') as HTMLInputElement;
expect(input.disabled).toBe(true);
expect(input.placeholder).toContain('Maximum of 2 tags');
  });

it('(e) clicking the × button removes the tag from the array', () => {
const { methods } = wrapWithFormProvider(
<TagMultiSelect<typeof schema> name='tags' label='Tags' />,
{
schema,
defaultValues: { tags: ['history', 'science'] },
      }
    );

const removeButton = screen.getByTestId('tag-multi-select-remove-tags-0');
fireEvent.click(removeButton);

expect(methods.getValues('tags')).toEqual(['science']);
  });
});