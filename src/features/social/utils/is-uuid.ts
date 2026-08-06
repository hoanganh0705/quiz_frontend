/**
 * `is-uuid.ts` — UUID v4-style shape check.
 *
 * Source epic:   Epic 6.2 — Read-only social-graph views.
 * Source ticket: TKT-6.2.B1 (and B2 via the `/social/blocked` route).
 *
 * ## Purpose
 *
 * The Story 6.2 list routes (`/social/users/:id/followers`,
 * `/social/users/:id/following`, `/social/users/:id/friends`,
 * `/social/blocked`) read the `:id` segment from the URL and must
 * short-circuit to a 404 when the segment is not a UUID. The
 * backend would reject the request anyway, but the route should
 * not even attempt to render before the format is valid.
 *
 * ## Pattern
 *
 * The check is a regex match against the canonical UUID shape
 * (`xxxxxxxx-xxxx-Mxxx-Nxxx-xxxxxxxxxxxx`, where M is the version
 * nibble and N is the variant nibble). The match is case-insensitive
 * so the route accepts both upper- and lower-case ids.
 *
 * This is intentionally a *shape* check, not a strict v4 check —
 * the backend treats all UUID-shaped ids as opaque tokens. Future
 * work that needs a stricter check (e.g. v4-only) should add a
 * separate helper rather than tightening this one.
 *
 * ## Why this is a feature-local helper
 *
 * The dedicated frontend-wide validator lives at
 * `quiz_backend/src/common/pipes/parse-uuid-or-slug.pipe.ts`
 * (backend only). The frontend does not currently have a
 * counterpart helper; Story 6.2 introduces the **first** such
 * helper inside the social feature. Future tickets (e.g. the
 * search-result routing work in Story 6.5) can lift this to
 * `@/lib/validation/uuid` once a second caller needs it.
 *
 * ## Example
 *
 *   isUuid("00000000-0000-4000-8000-000000000000"); // true
 *   isUuid("not-a-uuid");                            // false
 *   isUuid("");                                      // false
 */

const UUID_SHAPE_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Returns `true` when the input string is a non-empty UUID.
 */
export function isUuid(value: string | null | undefined): value is string {
  if (typeof value !== "string") return false;
  if (value.length === 0) return false;
  return UUID_SHAPE_RE.test(value);
}
