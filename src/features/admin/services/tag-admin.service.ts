/**
 * `features/admin/services/tag-admin.service.ts` — Tag admin service.
 *
 * Source epic:   Epic 7.1.
 * Source ticket: TKT-7.1.E1.
 *
 * ## Purpose
 *
 * Thin service layer that wraps the regenerated tag admin SDK
 * functions. The service is the only layer under
 * `features/admin/**` that touches the SDK for tag admin; every
 * `features/admin/hooks/**` consumer of tag admin mutations imports
 * from this service. The cross-batch invariant `service-only-http`
 * is enforced by `scripts/phase7-lint-invariants.mjs` (TKT-7.1.B6).
 *
 * ## Functions
 *
 *   - `createTag(input)`         — wraps `tagControllerCreateTag`.
 *   - `updateTag(id, input)`     — wraps `tagControllerUpdateTag`.
 *   - `deleteTag(id)`            — wraps `tagControllerDeleteTag`.
 *   - `restoreTag(id)`           — wraps `tagControllerRestoreTag`.
 *                                  May throw `TAG_SLUG_CONFLICT`
 *                                  when a soft-deleted tag is
 *                                  restored and the slug is taken.
 *   - `getTag(id)`               — wraps `tagControllerGetTagById`.
 *
 * ## Error contract
 *
 * Each function propagates the SDK's `ApiError` directly. The
 * `ApiError.code` getter resolves to a typed `ErrorCode` from
 * `@/lib/api/error-codes`, including the Phase 7 admin codes
 * registered in `TKT-7.1.A3`. Consumers branch on `code` (string
 * union), falling back to `status` (number) for legacy paths.
 */

import { getTags } from '@/lib/api';
import type {
  CreateTagDto,
  TagResponseDto,
  UpdateTagDto,
} from '@/lib/api/generated/schemas';

export type {
  TagControllerCreateTagResult,
  TagControllerUpdateTagResult,
  TagControllerDeleteTagResult,
  TagControllerRestoreTagResult,
  TagControllerGetTagByIdResult,
} from '@/lib/api/generated/tags/tags';

/**
 * The normalised tag DTO returned by every read/write tag admin
 * function. The SDK wraps responses in an envelope; the service
 * unwraps and returns the canonical `TagResponseDto`.
 */
export type TagDto = TagResponseDto;

/**
 * Create a new tag.
 *
 * @throws `ApiError<ErrorCode>` with `code: TAG_SLUG_CONFLICT` when
 *         the supplied slug is already in use.
 * @throws `ApiError<ErrorCode>` with `code: TAG_NAME_TAKEN` when
 *         the supplied name is already in use.
 */
export async function createTag(input: CreateTagDto): Promise<TagDto> {
  const sdk = getTags();
  const wrapped = await sdk.tagControllerCreateTag(input);
  return (wrapped.data.data as TagDto) ?? (wrapped.data as unknown as TagDto);
}

/**
 * Update an existing tag. Pass only the fields to update; omitted
 * fields are left unchanged.
 *
 * @throws `ApiError<ErrorCode>` with `code: TAG_NOT_FOUND` when
 *         the tag id does not exist.
 */
export async function updateTag(
  id: string,
  input: UpdateTagDto,
): Promise<TagDto> {
  const sdk = getTags();
  const wrapped = await sdk.tagControllerUpdateTag(id, input);
  return (wrapped.data.data as TagDto) ?? (wrapped.data as unknown as TagDto);
}

/**
 * Soft-delete a tag. The backend preserves the slug for restore.
 */
export async function deleteTag(id: string): Promise<void> {
  const sdk = getTags();
  await sdk.tagControllerDeleteTag(id);
}

/**
 * Restore a soft-deleted tag.
 *
 * @throws `ApiError<ErrorCode>` with `code: TAG_SLUG_CONFLICT` when
 *         the soft-deleted tag's slug has since been claimed by
 *         another tag. The admin must rename the conflicting tag
 *         or supply a new slug before retrying.
 * @throws `ApiError<ErrorCode>` with `code: TAG_NOT_FOUND` when the
 *         tag id does not exist (or has been hard-deleted).
 */
export async function restoreTag(id: string): Promise<TagDto> {
  const sdk = getTags();
  const wrapped = await sdk.tagControllerRestoreTag(id);
  return (wrapped.data.data as TagDto) ?? (wrapped.data as unknown as TagDto);
}

/**
 * Fetch a single tag by id.
 *
 * @throws `ApiError<ErrorCode>` with `code: TAG_NOT_FOUND` when the
 *         tag id does not exist.
 */
export async function getTag(id: string): Promise<TagDto> {
  const sdk = getTags();
  const wrapped = await sdk.tagControllerGetTagById(id);
  return (wrapped.data.data as TagDto) ?? (wrapped.data as unknown as TagDto);
}
