/**
 * `feed-pagination-invariants.ts` — Cross-batch invariants for the
 * Story 6.9 feed pagination contract.
 *
 * Source epic:   Epic 6.9 — Global Social Feed.
 * Source story:  `projectDocs/Epics/PHASE_6_IMPLEMENTATION_PLAN.md` →
 *                Story 6.9 (lines 428–469).
 * Source tickets: TKT-6.9.D1, TKT-6.9.D2, TKT-6.9.F1.
 *
 * ## Purpose
 *
 * Single source of truth for the feed pagination constants every
 * Batch-D hook (`useFeed`, `useOffsetPaginated`) and every Batch-F
 * chrome primitive (`FeedSkeleton`) shares. Importing this module
 * is the canonical way to assert compliance without sprinkling
 * magic numbers across the surface.
 *
 * ## What this file owns
 *
 *   1. **Default page size (`FEED_DEFAULT_LIMIT`).** The number of
 *      items the feed requests per page. Mirrors the Epic 6.4
 *      `ACTIVITY_PAGE_SIZE = 20` precedent. The value is the
 *      default for the first page; the value is also exposed as
 *      the `FEED_PAGE_SIZE` alias for clarity at the call site.
 *   2. **Maximum page size (`FEED_MAX_LIMIT`).** The upper bound
 *      the `useOffsetPaginated` primitive (TKT-6.9.D1) clamps the
 *      caller's requested limit to. The value (50) matches the
 *      SDK's `SocialControllerGetFeedParams.limit` `@maximum 100`
 *      with a 50% headroom for payload size.
 *   3. **Consistency with the primitive.** The
 *      `useOffsetPaginated` primitive (TKT-6.9.D1) re-exports the
 *      constants from here; the import paths converge at this
 *      single source.
 *
 * ## SSR-safety
 *
 * The module declares constants only. Safe to import from Server
 * Components and from the App Router's route modules.
 */

import {
  FEED_DEFAULT_LIMIT as FEED_DEFAULT_LIMIT_FROM_PRIMITIVE,
  FEED_MAX_LIMIT as FEED_MAX_LIMIT_FROM_PRIMITIVE,
} from "@/lib/api";

/**
 * The default page size the Story 6.9 feed requests. Mirrors
 * the Epic 6.4 `ACTIVITY_PAGE_SIZE = 20` precedent.
 */
export const FEED_DEFAULT_LIMIT: number = FEED_DEFAULT_LIMIT_FROM_PRIMITIVE;

/**
 * The maximum page size the Story 6.9 feed accepts. The
 * `useOffsetPaginated` primitive clamps the caller's requested
 * limit to this value.
 */
export const FEED_MAX_LIMIT: number = FEED_MAX_LIMIT_FROM_PRIMITIVE;

/**
 * Alias for `FEED_DEFAULT_LIMIT` so the hook layer
 * (`useFeed`, TKT-6.9.D2) can read the value under the
 * conventional `PAGE_SIZE` name without confusing the reader.
 */
export const FEED_PAGE_SIZE: number = FEED_DEFAULT_LIMIT;