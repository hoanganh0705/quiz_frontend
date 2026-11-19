declare const process: {
  env: Record<string, string | undefined>;
};

/**
 * Storage `public_id` shape validation + URL derivation.
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
 *     `publicId` to a public delivery URL using `NEXT_PUBLIC_STORAGE_PUBLIC_URL`
 *     or `NEXT_PUBLIC_R2_PUBLIC_URL`.
 */

const UUID_V7_PATTERN =
  "[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";

export const STORAGE_PUBLIC_ID_PATTERN = new RegExp(
  `^quiz-app/(avatars|quizzes)/(${UUID_V7_PATTERN})/(${UUID_V7_PATTERN})$`,
);

export const STORAGE_PUBLIC_ID_TAIL_PATTERN = new RegExp(
  `^(${UUID_V7_PATTERN})/(${UUID_V7_PATTERN})$`,
);

export const STORAGE_PUBLIC_ID_INVALID_MESSAGE =
  "publicId must match the expected shape: quiz-app/<purpose>/<uuidv7>/<uuidv7>";

export type UploadPurpose = "avatar" | "quiz";

/**
 * Pure URL derivation for client-side preview rendering.
 *
 * Reads public URL from `NEXT_PUBLIC_STORAGE_PUBLIC_URL` or `NEXT_PUBLIC_R2_PUBLIC_URL`.
 * When missing, returns the raw `publicId`.
 */
export function deriveUrlClient(
  publicId: string,
  _purpose?: UploadPurpose,
): string {
  if (publicId.startsWith("http://") || publicId.startsWith("https://")) {
    return publicId;
  }
  const storagePublicUrl =
    process.env.NEXT_PUBLIC_STORAGE_PUBLIC_URL ||
    process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
  if (storagePublicUrl) {
    const base = storagePublicUrl.replace(/\/+$/, "");
    return `${base}/${publicId}`;
  }
  return publicId;
}
