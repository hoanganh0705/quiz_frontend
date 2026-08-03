/**
 * `<RichTextArea />` unit tests.
 *
 * Source epic:   Epic 4.2 — `useQuizForm` primitive + shared form atoms.
 * Source ticket: TKT-4.2.B2.
 *
 * Coverage contract:
 *   (a) renders a `<Textarea>` wired via `useController`.
 *   (b) toggling the preview swaps the textarea for a preview pane.
 *   (c) renders a character counter when `maxLength` is provided.
 *   (d) surfaces a zod error message.
 */

import { describe, expect, it } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { z } from 'zod';

import { RichTextArea } from '../RichTextArea';
import { wrapWithFormProvider } from './form-test-utils';

const schema = z.object({
  description: z.string().min(10, 'Description is too short'),
});

describe('<RichTextArea />', () => {
  it('(a) renders the textarea wired via useController', () => {
    wrapWithFormProvider(
      <RichTextArea<typeof schema> name='description' label='Description' />,
      { schema, defaultValues: { description: 'Hello world' } }
    );
    const textarea = screen.getByLabelText('Description') as HTMLTextAreaElement;
    expect(textarea).toBeInTheDocument();
    expect(textarea.value).toBe('Hello world');
  });

  it('(b) toggling the preview swaps the textarea for a preview pane', () => {
    wrapWithFormProvider(
      <RichTextArea<typeof schema>
        name='description'
        label='Description'
        previewLabel='Show preview'
      />,
      { schema, defaultValues: { description: 'Hello world' } }
    );

    const toggle = screen.getByTestId('rich-text-area-preview-toggle-description');
    fireEvent.click(toggle);

    // The textarea should be gone; the preview pane should be present.
    expect(screen.queryByLabelText('Description')).toBeNull();
    const preview = screen.getByTestId('rich-text-area-preview-description');
    expect(preview.textContent).toContain('Hello world');
  });

  it('(c) renders a character counter when maxLength is provided', () => {
    wrapWithFormProvider(
      <RichTextArea<typeof schema>
        name='description'
        label='Description'
        maxLength={20}
      />,
      { schema, defaultValues: { description: 'Hello' } }
    );
    const counter = screen.getByTestId('rich-text-area-counter-description');
    expect(counter.textContent).toBe('5/20');
  });

  it('(d) surfaces a zod error message', async () => {
    const { methods } = wrapWithFormProvider(
      <RichTextArea<typeof schema> name='description' label='Description' />,
      { schema, defaultValues: { description: '' } }
    );

    methods.trigger('description');
    await waitFor(() => {
      expect(screen.getByText('Description is too short')).toBeInTheDocument();
    });
  });
});