/**
 * `<ImageUploadField />` unit tests.
 *
 * Source epic:   Epic 4.2 — `useQuizForm` primitive + shared form atoms.
 * Source ticket: TKT-4.2.B6.
 *
 * Coverage contract:
 *   (a) renders an `<input type="file">` when no value is present.
 *   (b) renders a thumbnail preview + remove button when a value is set.
 *   (c) the remove button clears the form value.
 *   (d) oversized files surface the "Reduce file size" message and do
 *       NOT update the form value.
 */

import { describe, expect, it, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { z } from 'zod';

import { ImageUploadField } from '../ImageUploadField';
import { wrapWithFormProvider } from './form-test-utils';

const schema = z.object({
  imageUrl: z.string().nullable().optional(),
});

function makeFile(name: string, sizeBytes: number): File {
  // Create a stub File whose `size` is reported as `sizeBytes`.
  const blob = new Blob([new ArrayBuffer(sizeBytes)], { type: 'image/png' });
  return new File([blob], name, { type: 'image/png' });
}

describe('<ImageUploadField />', () => {
  it('(a) renders an <input type="file"> when no value is present', () => {
    wrapWithFormProvider(
      <ImageUploadField<typeof schema> name='imageUrl' label='Image' />,
      { schema, defaultValues: { imageUrl: '' } }
    );
    const input = screen.getByTestId('image-upload-field-input-imageUrl');
    expect(input).toBeInTheDocument();
    expect(input.getAttribute('type')).toBe('file');
    expect(input.getAttribute('accept')).toBe('image/*');
  });

  it('(b) renders a thumbnail preview + remove button when a value is set', () => {
    wrapWithFormProvider(
      <ImageUploadField<typeof schema> name='imageUrl' label='Image' />,
      { schema, defaultValues: { imageUrl: 'data:image/png;base64,abc' } }
    );
    const preview = screen.getByTestId('image-upload-field-preview-imageUrl');
    expect(preview).toBeInTheDocument();
    expect(screen.getByTestId('image-upload-field-remove-imageUrl')).toBeInTheDocument();
  });

  it('(c) the remove button clears the form value', () => {
    const { methods } = wrapWithFormProvider(
      <ImageUploadField<typeof schema> name='imageUrl' label='Image' />,
      { schema, defaultValues: { imageUrl: 'data:image/png;base64,abc' } }
    );

    fireEvent.click(screen.getByTestId('image-upload-field-remove-imageUrl'));
    expect(methods.getValues('imageUrl')).toBe('');
  });

  it('(d) oversized files surface "Reduce file size" and do NOT update the value', async () => {
    // FileReader is provided by jsdom. Stub `readAsDataURL` so the
    // oversize branch can complete synchronously without network IO.
    const origReadAsDataURL = FileReader.prototype.readAsDataURL;
    FileReader.prototype.readAsDataURL = vi.fn(function readAsDataURLStub(
      this: FileReader
    ): void {
      // The atom calls `reader.onload` after `readAsDataURL`. We
      // dispatch an empty string so the form value is unchanged on
      // an oversize file (the atom short-circuits before invoking
      // FileReader, so this stub is mostly a defensive backstop).
      setTimeout(() => {
        const event = new ProgressEvent('load') as ProgressEvent<FileReader>;
        Object.defineProperty(this, 'result', {
          value: 'data:image/png;base64,',
          configurable: true,
        });
        if (typeof this.onload === 'function') {
          this.onload.call(this, event);
        }
      }, 0);
    });

    try {
      const { methods } = wrapWithFormProvider(
        <ImageUploadField<typeof schema>
          name='imageUrl'
          label='Image'
          maxBytes={1024}
        />,
        { schema, defaultValues: { imageUrl: '' } }
      );

      const input = screen.getByTestId(
        'image-upload-field-input-imageUrl'
      ) as HTMLInputElement;
      fireEvent.change(input, {
        target: { files: [makeFile('big.png', 5 * 1024 * 1024)] },
      });

      await waitFor(() => {
        expect(
          screen.getByTestId('image-upload-field-oversize-imageUrl')
        ).toBeInTheDocument();
      });
      // The form value is NOT updated.
      expect(methods.getValues('imageUrl')).toBe('');
    } finally {
      FileReader.prototype.readAsDataURL = origReadAsDataURL;
    }
  });
});