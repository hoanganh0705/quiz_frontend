/**
 * `<TagMultiSelect />` unit tests.
 *
 * Source epic:   Epic 4.2 — `useQuizForm` primitive + shared form atoms.
 * Source ticket: TKT-4.2.B3.
 *
 * Coverage contract:
 *   (a) pressing Enter with a valid slug adds the tag to the array.
 *   (b) invalid slugs are rejected with the documented copy.
 *   (c) duplicate slugs are silently dropped.
 *   (d) `max` enforcement disables the input once the cap is reached.
 *   (e) clicking the × button removes the tag from the array.
 *
 * The chip input is registered through `useController`, which means
 * React 19 re-installs the `value` setter on the prototype after
 * mount. `@testing-library/dom`'s `setNativeValue` then sees
 * "The given element does not have a value setter" because the
 * input-level descriptor now shadows the prototype descriptor. We
 * use `setReactValue` (mirroring the upstream
 * `@testing-library/user-event` workaround) to call the captured
 * setter on the element instance directly.
 */

import { describe, expect, it } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { z } from 'zod';

import { TagMultiSelect } from '../TagMultiSelect';
import { wrapWithFormProvider } from './form-test-utils';

const schema = z.object({
  tags: z.array(z.string()).max(3, 'Too many tags'),
});

/**
 * Set the input's `value` through the natively-captured setter so React
 * 19 + jsdom dispatches a `change` event.
 */
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
    // The chip is rendered with the slug text.
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