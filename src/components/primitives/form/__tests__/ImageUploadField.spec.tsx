import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { z } from 'zod';

import { ImageUploadField } from '../ImageUploadField';
import { wrapWithFormProvider } from './form-test-utils';

vi.mock('@/features/uploads/hooks/useUpload', () => {
  const uploadMock = vi.fn();
  return {
    useUpload: () => ({
      upload: uploadMock,
      isUploading: false,
      progress: null,
      error: null,
      retry: vi.fn(),
      reset: vi.fn(),
    }),
    __uploadMock: uploadMock,
  };
});

// Provide a valid publicId shape so the preview is rendered when the
// form value is set. The exact value is the "success" payload returned
// by the mocked `useUpload` below.
const VALID_PUBLIC_ID =
  'quiz-app/avatars/00000000-0000-7000-8000-000000000000/00000000-0000-7000-8000-000000000000';

const schema = z.object({
  imagePublicId: z.string().nullable().optional(),
});

function makeFile(name: string, sizeBytes: number, type = 'image/png'): File {
  const blob = new Blob([new ArrayBuffer(sizeBytes)], { type });
  return new File([blob], name, { type });
}

interface MockedUploadModule {
  __uploadMock: ReturnType<typeof vi.fn>;
  useUpload: () => unknown;
}

async function getUploadMock(): Promise<ReturnType<typeof vi.fn>> {
  const mod = (await import('@/features/uploads/hooks/useUpload')) as unknown as MockedUploadModule;
  return mod.__uploadMock;
}

async function setUploadResponse(publicId: string): Promise<void> {
  const mock = await getUploadMock();
  mock.mockResolvedValueOnce({
    publicId,
    url: 'https://res.cloudinary.com/demo/image/upload/' + publicId,
    bytes: 1234,
    format: 'png',
    width: 100,
    height: 100,
    purpose: 'avatar',
  });
}

describe('<ImageUploadField />', () => {
  beforeEach(async () => {
    const mock = await getUploadMock();
    mock.mockReset();
  });

  it('(a) renders an <input type="file"> when no value is present', () => {
    wrapWithFormProvider(
      <ImageUploadField<typeof schema> name='imagePublicId' label='Image' purpose='avatar' />,
      { schema, defaultValues: { imagePublicId: '' } },
    );
    const input = screen.getByTestId('image-upload-field-input-imagePublicId');
    expect(input).toBeInTheDocument();
    expect(input.getAttribute('type')).toBe('file');
    expect(input.getAttribute('accept')).toBe('image/*');
  });

  it('(b) renders a thumbnail preview + remove button when a value is set', () => {
    wrapWithFormProvider(
      <ImageUploadField<typeof schema> name='imagePublicId' label='Image' purpose='avatar' />,
      { schema, defaultValues: { imagePublicId: VALID_PUBLIC_ID } },
    );
    const preview = screen.getByTestId('image-upload-field-preview-imagePublicId');
    expect(preview).toBeInTheDocument();
    expect(screen.getByTestId('image-upload-field-remove-imagePublicId')).toBeInTheDocument();
  });

  it('(c) the remove button clears the form value', () => {
    const { methods } = wrapWithFormProvider(
      <ImageUploadField<typeof schema> name='imagePublicId' label='Image' purpose='avatar' />,
      { schema, defaultValues: { imagePublicId: VALID_PUBLIC_ID } },
    );

    fireEvent.click(screen.getByTestId('image-upload-field-remove-imagePublicId'));
    expect(methods.getValues('imagePublicId')).toBe('');
  });

  it('(d) oversized files short-circuit the upload and surface "Reduce file size"', async () => {
    const { methods } = wrapWithFormProvider(
      <ImageUploadField<typeof schema>
        name='imagePublicId'
        label='Image'
        purpose='avatar'
        maxBytes={1024}
      />,
      { schema, defaultValues: { imagePublicId: '' } },
    );

    const input = screen.getByTestId(
      'image-upload-field-input-imagePublicId',
    ) as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [makeFile('big.png', 5 * 1024 * 1024)] },
    });

    await waitFor(() => {
      expect(
        screen.getByTestId('image-upload-field-oversize-imagePublicId'),
      ).toBeInTheDocument();
    });

    expect(methods.getValues('imagePublicId')).toBe('');
    const uploadMock = await getUploadMock();
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it('(e) on a valid file select, calls useUpload.upload and writes the publicId', async () => {
    await setUploadResponse(VALID_PUBLIC_ID);

    const { methods } = wrapWithFormProvider(
      <ImageUploadField<typeof schema> name='imagePublicId' label='Image' purpose='avatar' />,
      { schema, defaultValues: { imagePublicId: '' } },
    );

    const input = screen.getByTestId(
      'image-upload-field-input-imagePublicId',
    ) as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [makeFile('avatar.png', 1024)] },
    });

    await waitFor(() => {
      expect(methods.getValues('imagePublicId')).toBe(VALID_PUBLIC_ID);
    });

    const uploadMock = await getUploadMock();
    expect(uploadMock).toHaveBeenCalledTimes(1);
    expect(uploadMock).toHaveBeenCalledWith(
      expect.objectContaining({ purpose: 'avatar' }),
    );
    const callArg = uploadMock.mock.calls[0]?.[0] as { file: File; purpose: string };
    expect(callArg.file).toBeInstanceOf(File);
    expect(callArg.file.name).toBe('avatar.png');
  });
});
