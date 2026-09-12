import {
  uploadControllerUploadFile,
  uploadControllerBindUpload,
} from '@/lib/api/generated/uploads';
import { STORAGE_PUBLIC_ID_PATTERN, STORAGE_PUBLIC_ID_INVALID_MESSAGE } from '@/lib/storage/public-id-pattern';

import type {
  UploadFileRequest,
  UploadFileResponse,
  BindUploadRequest,
  BindUploadResponse,
} from '@/lib/api/generated/uploads';

export type { UploadFileRequest, UploadFileResponse, BindUploadRequest, BindUploadResponse };

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

/**
 * Phase 3.1 — thin wrapper around the generated
 * `uploadControllerBindUpload` SDK. Re-validates the supplied
 * `publicId` shape before the network round-trip so a malformed value
 * is caught client-side and the user gets a structured error instead
 * of a 4xx from the server.
 *
 * Use after a direct-to-Cloudinary upload (via `POST /uploads/sign` →
 * Cloudinary `uploadUrl`) to persist the `(publicId, ownerId, purpose)`
 * ownership row. The server validates the asset row exists and the
 * user is authenticated; this wrapper validates the wire shape only.
 */
export async function bindUploadedAsset(payload: BindUploadRequest): Promise<BindUploadResponse> {
  if (!STORAGE_PUBLIC_ID_PATTERN.test(payload.publicId)) {
    throw new UploadResponseShapeError(payload.publicId);
  }
  return uploadControllerBindUpload(payload);
}
