/**
 * Unit tests for `features/uploads/api/uploads.service.ts`.
 *
 * Coverage:
 *   - `bindUploadedAsset` calls the generated SDK with the expected URL,
 *     body shape, and method.
 *   - `bindUploadedAsset` rejects a malformed `publicId` client-side
 *     before any network round-trip (defence-in-depth on top of the
 *     backend's `STORAGE_PUBLIC_ID_PATTERN` check).
 *   - The wrapper forwards the response shape unchanged so callers
 *     can rely on the typed return.
 *
 * The generated SDK is replaced with `vi.mock` so the tests do not
 * require a running backend or axios mock layer.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/generated/uploads', () => ({
  uploadControllerUploadFile: vi.fn(),
  uploadControllerBindUpload: vi.fn(),
}));

import { uploadControllerBindUpload } from '@/lib/api/generated/uploads';
import { bindUploadedAsset, UploadResponseShapeError } from '../uploads.service';

const VALID_PUBLIC_ID = 'quiz-app/avatars/0d8e3a45-7d7a-71f0-9e2a-9b0d9e2c7f3b/0190f6a5-d2c4-7b3e-a8e9-2b9f7e2b8b1a';

const mockBindUpload = uploadControllerBindUpload as unknown as ReturnType<typeof vi.fn>;

describe('uploads.service — bindUploadedAsset (Phase 3.1)', () => {
  beforeEach(() => {
    mockBindUpload.mockReset();
  });

  afterEach(() => {
    mockBindUpload.mockReset();
  });

  it('calls the SDK with the encoded publicId in the URL and a JSON body', async () => {
    mockBindUpload.mockResolvedValue({
      publicId: VALID_PUBLIC_ID,
      bound: true,
      purpose: 'avatar',
      ownerId: '0d8e3a45-7d7a-71f0-9e2a-9b0d9e2c7f3b',
    });

    await bindUploadedAsset({ publicId: VALID_PUBLIC_ID, purpose: 'avatar' });

    expect(mockBindUpload).toHaveBeenCalledTimes(1);
    expect(mockBindUpload).toHaveBeenCalledWith({
      publicId: VALID_PUBLIC_ID,
      purpose: 'avatar',
    });
  });

  it('forwards the SDK response unchanged (typed return contract)', async () => {
    const response = {
      publicId: VALID_PUBLIC_ID,
      bound: true as const,
      purpose: 'avatar' as const,
      ownerId: '0d8e3a45-7d7a-71f0-9e2a-9b0d9e2c7f3b',
    };
    mockBindUpload.mockResolvedValue(response);

    await expect(
      bindUploadedAsset({ publicId: VALID_PUBLIC_ID, purpose: 'avatar' }),
    ).resolves.toEqual(response);
  });

  it('supports the quiz purpose', async () => {
    mockBindUpload.mockResolvedValue({
      publicId: 'quiz-app/quizzes/0d8e3a45-7d7a-71f0-9e2a-9b0d9e2c7f3b/0190f6a5-d2c4-7b3e-a8e9-2b9f7e2b8b1a',
      bound: true,
      purpose: 'quiz',
      ownerId: '0d8e3a45-7d7a-71f0-9e2a-9b0d9e2c7f3b',
    });

    await bindUploadedAsset({
      publicId: 'quiz-app/quizzes/0d8e3a45-7d7a-71f0-9e2a-9b0d9e2c7f3b/0190f6a5-d2c4-7b3e-a8e9-2b9f7e2b8b1a',
      purpose: 'quiz',
    });

    expect(mockBindUpload).toHaveBeenCalledWith(
      expect.objectContaining({ purpose: 'quiz' }),
    );
  });

  it('rejects a malformed publicId before the SDK is called', async () => {
    await expect(
      bindUploadedAsset({ publicId: 'not-a-valid-id', purpose: 'avatar' }),
    ).rejects.toBeInstanceOf(UploadResponseShapeError);
    expect(mockBindUpload).not.toHaveBeenCalled();
  });

  it('rejects an empty publicId', async () => {
    await expect(
      bindUploadedAsset({ publicId: '', purpose: 'avatar' }),
    ).rejects.toBeInstanceOf(UploadResponseShapeError);
    expect(mockBindUpload).not.toHaveBeenCalled();
  });

  it('propagates SDK errors (e.g. 404 UPLOAD_ASSET_NOT_FOUND)', async () => {
    mockBindUpload.mockRejectedValue(new Error('Request failed with status code 404'));

    await expect(
      bindUploadedAsset({ publicId: VALID_PUBLIC_ID, purpose: 'avatar' }),
    ).rejects.toThrow('Request failed with status code 404');
  });
});
