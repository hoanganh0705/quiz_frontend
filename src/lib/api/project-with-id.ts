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

/**
 * Runtime mirror of the `ProjectWithId<T, Alias>` type alias.
 *
 * Given an array of items that name their primary identifier under
 * a non-`id` field (`userId`, `quizId`, `tournamentId`, …),
 * `projectWithId` returns a new array where each item also exposes
 * that primary identifier as `id`. This is the runtime counterpart
 * to the type-level `ProjectWithId` helper; both should be used in
 * tandem so consumers can pass projected items to primitives that
 * require `T extends { id: string }` (e.g. `appendUniqueById`,
 * `useCursorPaginated`) without losing the original alias field.
 *
 * The function is **pure**: it allocates a new array and new
 * objects, leaving the inputs untouched. The output objects are
 * type-compatible with `ProjectWithId<T, Alias>` because `id` is
 * `readonly` on the type but writable at runtime — the structural
 * shape is identical.
 *
 * @example
 * ```typescript
 * const projected = projectWithId(items, 'quizId');
 * // → Array<ProjectWithId<QuizListItemDto, 'quizId'>>
 * appendUniqueById(prev, projected); // works.
 * ```
 *
 * @typeParam T      — The original item type.
 * @typeParam Alias  — The field name on `T` that should be aliased
 *                     as `id`. Defaults to `'id'` (no-op passthrough).
 * @param items      — The items to project.
 * @param alias      — The alias field on each item.
 * @returns          — A new array with `id` added to each item.
 */
export function projectWithId<
  T extends Record<string, unknown>,
  Alias extends keyof T,
>(items: readonly T[], alias: Alias): Array<ProjectWithId<T, Alias>> {
  return items.map((item) => ({
    ...item,
    id: item[alias],
  })) as Array<ProjectWithId<T, Alias>>;
}