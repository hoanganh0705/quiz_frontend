/**
 * Cloudinary `public_id` shape validation + URL derivation.
 *
 * Mirrors the server-side validation in
 * `quiz_backend/src/common/utils/storage-public-id.util.ts` so the
 * frontend can defend-in-depth at the form boundary even before the
 * backend rejects the request. The authoritative ownership check
 * remains the `storage_assets` table; this client-side validation
 * only catches typos and forged ids.
 *
 * The full public_id shape is `${folder}/${purposeFolder}/${ownerId}/${uuidv7}`
 * — the document default is `quiz-app/(avatars|quizzes)/<uuidv7>/<uuidv7>`.
 * This module exports:
 *   - `STORAGE_PUBLIC_ID_PATTERN`       — the strict full shape.
 *   - `STORAGE_PUBLIC_ID_TAIL_PATTERN`  — the trailing
 *     `${ownerId}/${uuidv7}` portion (used by zod schemas that don't
 *     want to lock the folder prefix into the wire contract).
 *   - `STORAGE_PUBLIC_ID_INVALID_MESSAGE` — human-readable error string.
 *   - `deriveUrlClient(publicId, purpose)` — pure function that maps a
 *     `publicId` to a Cloudinary delivery URL using the public
 *     `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` env var.
 *   - `extractPublicIdFromCloudinaryUrl` — reversed; useful for legacy
 *     rows whose `avatarUrl` is a Cloudinary URL.
 */

const UUID_V7_PATTERN = '[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}';

export const STORAGE_PUBLIC_ID_PATTERN = new RegExp(
  `^quiz-app/(avatars|quizzes)/(${UUID_V7_PATTERN})/(${UUID_V7_PATTERN})$`,
);

export const STORAGE_PUBLIC_ID_TAIL_PATTERN = new RegExp(
  `^(${UUID_V7_PATTERN})/(${UUID_V7_PATTERN})$`,
);

export const STORAGE_PUBLIC_ID_INVALID_MESSAGE =
  'publicId must match the Cloudinary-assigned shape: quiz-app/<purpose>/<uuidv7>/<uuidv7>';

export type UploadPurpose = 'avatar' | 'quiz';

/**
 * Pure URL derivation for client-side preview rendering.
 *
 * Reads the cloud name from `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`. When
 * the env var is missing (e.g. local dev without Cloudinary), returns
 * the raw `publicId` so the caller can still render a placeholder
 * instead of crashing.
 *
 * The transformation params here intentionally mirror the per-purpose
 * shape the backend uses in `UPLOAD_POLICY`. They are kept in sync
 * manually because the client cannot query the backend for the
 * policy at every preview render.
 */
export function deriveUrlClient(publicId: string, purpose: UploadPurpose): string {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  if (!cloudName) {
    return publicId;
  }
  const transformation =
    purpose === 'avatar'
      ? 'w_512,h_512,c_fill,g_auto,q_auto,f_auto'
      : 'w_1600,h_900,c_fill,g_auto,q_auto,f_auto';
  return `https://res.cloudinary.com/${cloudName}/image/upload/${transformation}/${publicId}`;
}

/**
 * Reverse of `deriveUrlClient`: extract the `public_id` from a
 * Cloudinary `secure_url`. Used when migrating legacy rows whose
 * `avatarUrl` is a Cloudinary URL rather than a base64 data URL.
 *
 * Returns `null` when the input does not look like a Cloudinary URL.
 */
export function extractPublicIdFromCloudinaryUrl(url: string): string | null {
  if (!url || !url.includes('res.cloudinary.com')) {
    return null;
  }
  const match = url.match(/\/upload\/(?:[^/]+\/)*?(.+?)\.\w+(?:\?.*)?$/);
  if (!match || !match[1]) {
    return null;
  }
  return match[1];
}
