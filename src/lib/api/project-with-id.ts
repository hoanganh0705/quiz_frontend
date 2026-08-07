/**
 * `ProjectWithId<T, Alias>` — Phase 9 (P1-24) helper.
 *
 * A generic, ergonomic way to make any item type `T` that has a
 * stable identifier field under a non-`id` alias (e.g. `userId`,
 * `quizId`, `categoryId`) usable with `appendUniqueById`,
 * `useCursorPaginated`, and any other primitive that requires
 * `T extends { id: string }`.
 *
 * ## Why
 *
 * Many of the Orval-generated DTOs name their primary identifier
 * `userId` / `quizId` / `categoryId` rather than `id`. The pagination
 * primitives (`useCursorPaginated`, `useOffsetPaginated`) and the
 * dedup helper (`appendUniqueById`) all constrain to `T extends
 * { id: string }`. Without `ProjectWithId`, callers either
 *
 *   1. hand-write a one-off mapping layer, or
 *   2. add an `id: T[Alias]` property to a hand-typed projection, or
 *   3. duplicate the entire DTO with an `id` field added.
 *
 * `ProjectWithId` collapses all three into a single type-level
 * adapter.
 *
 * ## How
 *
 * The mapped type adds an `id: T[Alias]` field on top of `T`. The
 * `Alias` defaults to `'id'` so the helper is a no-op (passthrough)
 * for DTOs that already expose the canonical `id` field. The
 * original alias field is preserved so consumers can still read it.
 *
 * @example
 * ```typescript
 * // Given `UserMeResponseDto { userId: string; ... }`:
 * type UserListItem = ProjectWithId<UserMeResponseDto, 'userId'>;
 * // → UserMeResponseDto & { readonly id: string }
 *
 * appendUniqueById<UserListItem>(prev, next); // works.
 * ```
 *
 * @typeParam T      The original item type (typically an Orval DTO).
 * @typeParam Alias  The field name on `T` that should be aliased as
 *                   `id`. Defaults to `'id'` (no-op).
 */
export type ProjectWithId<
  T,
  Alias extends keyof T = keyof T & 'id',
> = T & { readonly id: T[Alias & keyof T] };