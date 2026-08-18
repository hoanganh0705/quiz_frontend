import { uploadControllerUploadFile } from '@/lib/api/generated/uploads';
import { STORAGE_PUBLIC_ID_PATTERN, STORAGE_PUBLIC_ID_INVALID_MESSAGE } from '@/lib/storage/public-id-pattern';

import type { UploadFileRequest, UploadFileResponse } from '@/lib/api/generated/uploads';

export type { UploadFileRequest, UploadFileResponse };

export class UploadResponseShapeError extends Error {
  constructor(publicId: string) {
    super(`Upload endpoint returned a malformed publicId: ${publicId}. ${STORAGE_PUBLIC_ID_INVALID_MESSAGE}`);
    this.name = 'UploadResponseShapeError';
  }
}

/**
 * Thin wrapper around the generated `uploadControllerUploadFile` SDK.
 * Validates the returned `publicId` shape at the client boundary so a
 * forged or malformed response surfaces as a structured error before
 * the form value is written (defence-in-depth on top of the backend's
 * `STORAGE_PUBLIC_ID_PATTERN` check).
 */
export async function uploadFile(payload: UploadFileRequest): Promise<UploadFileResponse> {
  const result = await uploadControllerUploadFile(payload);
  if (!STORAGE_PUBLIC_ID_PATTERN.test(result.publicId)) {
    throw new UploadResponseShapeError(result.publicId);
  }
  return result;
}
