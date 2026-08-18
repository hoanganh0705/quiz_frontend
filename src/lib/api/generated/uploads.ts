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

export const getUploads = () => {
  return { uploadControllerUploadFile };
};
