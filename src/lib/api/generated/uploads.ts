/**
 * TODO: Hand-edited — regenerate via `pnpm orval` once the backend is
 * running with the Phase 3/4 decorators present.
 *
 * The upload endpoint (`POST /api/v1/uploads`) takes a multipart
 * `multipart/form-data` payload with two fields:
 *   - `file`    (required) — the binary image
 *   - `purpose` (required) — one of 'avatar' | 'quiz'
 *
 * Orval's generated mutator always sets `Content-Type: application/json`
 * which is incompatible with multipart uploads. We override the header
 * to `undefined` so axios sets the multipart boundary itself, and ship
 * a `FormData` body.
 *
 * Phase 3.1 — `POST /api/v1/uploads/:publicId/bind` is also
 * hand-maintained. After the client uploads a file directly to
 * Cloudinary via a signed envelope (see `signUpload` in the backend),
 * it must call this endpoint to persist the `(publicId, ownerId,
 * purpose)` ownership row. The route requires an authenticated user.
 */

import { customInstance } from '../core/custom-instance';

export interface UploadFileRequest {
  file: File;
  purpose: 'avatar' | 'quiz';
}

export interface UploadFileResponse {
  publicId: string;
  url: string;
  bytes: number;
  format: string;
  width: number;
  height: number;
  purpose: 'avatar' | 'quiz';
}

export type UploadControllerUploadFileResult = UploadFileResponse;

export const uploadControllerUploadFile = async (
  payload: UploadFileRequest,
): Promise<UploadFileResponse> => {
  const formData = new FormData();
  formData.append('file', payload.file);
  formData.append('purpose', payload.purpose);

  const response = await customInstance.request<UploadFileResponse>({
    url: '/api/v1/uploads',
    method: 'POST',
    data: formData,
    headers: {
      'Content-Type': undefined,
    },
  });
  return response.data;
};

/**
 * Phase 3.1 — bind a previously uploaded asset (the client uploaded
 * the file directly to Cloudinary via a signed envelope) to the
 * authenticated user.
 *
 * The URL is encoded with `encodeURIComponent` because Cloudinary
 * `public_id` slugs contain slashes (`quiz-app/avatars/u/uuid`) that
 * axios will otherwise split into path segments.
 */
export interface BindUploadRequest {
  publicId: string;
  purpose: 'avatar' | 'quiz';
}

export interface BindUploadResponse {
  publicId: string;
  bound: true;
  purpose: 'avatar' | 'quiz';
  ownerId: string;
}

export type UploadControllerBindUploadResult = BindUploadResponse;

export const uploadControllerBindUpload = async (
  payload: BindUploadRequest,
): Promise<BindUploadResponse> => {
  const response = await customInstance.request<BindUploadResponse>({
    url: `/api/v1/uploads/${encodeURIComponent(payload.publicId)}/bind`,
    method: 'POST',
    data: { purpose: payload.purpose },
  });
  return response.data;
};

export const getUploads = () => {
  return { uploadControllerUploadFile, uploadControllerBindUpload };
};
