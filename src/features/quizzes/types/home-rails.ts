/**
 * `home-rails.ts` — typed shape + constants for the Story 3.7 home-page
 * rails (featured / trending / popular).
 *
 * Source epic: Story 3.7 — Featured / trending / popular rails on `/`.
 * Source ticket: TKT-3.7.A3.
 *
 * Two exports:
 *
 *   1. `HomeRailCategory` — the per-rail category state shape stored
 *      in `useHomeCategoryStore` (TKT-3.7.B1). `trendingCategoryId` and
 *      `popularCategoryId` are the independent per-rail fields; the
 *      featured rail has NO `featuredCategoryId` because the featured
 *      endpoint does not accept a category filter (TKT-3.7.A1 §4.1).
 *
 *   2. The three rail-limit constants. Featured is capped at 6
 *      (Story 3.7 line 810: "Featured cap is small (probably ≤ 6);
 *      truncate at the cap and render no scroll"). Trending and
 *      Popular are capped at 10 — the same horizontal-scroller count
 *      used by Epic 3.5's `PopularQuizzesStrip` / `TrendingQuizzesStrip`
 *      (no explicit number is given in Story 3.7 line 747, so the
 *      existing convention wins).
 *
 * The three wire DTOs (`QuizListItemDto`, `PopularQuizItemDto`,
 * `TrendingQuizItemDto`) are re-exported from the generated SDK so
 * consumers of the rails can import them from one place. NO DTO is
 * duplicated here — the SDK is the source of truth.
 */

import type {
  PopularQuizItemDto,
  QuizListItemDto,
  TrendingQuizItemDto,
} from '@/lib/api/generated/schemas'

// ---------------------------------------------------------------------------
// Per-rail category state shape
// ---------------------------------------------------------------------------

/**
 * The typed per-rail category state stored in `useHomeCategoryStore`.
 *
 * - `trendingCategoryId?: string` — drives the trending rail filter.
 * - `popularCategoryId?: string` — drives the popular rail filter.
 *
 * `featuredCategoryId` is intentionally absent. The featured endpoint
 * (`GET /quizzes/featured`) does NOT accept a `categoryId` parameter
 * (TKT-3.7.A1 §4.1) — featured is an editorial fixed set. Adding the
 * field here would force a runtime branch in `<QuizRail />` that has
 * no implementation behind it.
 */
export interface HomeRailCategory {
  trendingCategoryId?: string
  popularCategoryId?: string
}

// ---------------------------------------------------------------------------
// Rail-limit constants
// ---------------------------------------------------------------------------

/**
 * Featured rail cap (Story 3.7 line 810). The featured response from
 * `getQuizzesFeatured` is truncated server-side at the cap; we also
 * truncate client-side as a defence-in-depth so a misbehaving backend
 * cannot blow up the rail's CLS budget (Story 3.7 AC #3).
 */
export const FEATURED_RAIL_LIMIT = 6 as const

/**
 * Trending rail cap. Story 3.7 line 747 describes the rail as a
 * "horizontal scroller of `<QuizCard />`s" without an explicit number;
 * the Epic 3.5 `TrendingQuizzesStrip` precedent uses 10, so this story
 * matches.
 */
export const TRENDING_RAIL_LIMIT = 10 as const

/**
 * Popular rail cap. Same rationale as `TRENDING_RAIL_LIMIT`.
 */
export const POPULAR_RAIL_LIMIT = 10 as const

// ---------------------------------------------------------------------------
// Wire DTO re-exports
// ---------------------------------------------------------------------------

/**
 * Re-export the three rail DTOs from the generated SDK so consumers of
 * the rails can import them from one place (this module). NO DTO is
 * redefined; the SDK is the source of truth per TKT-3.7.A1 §3.
 */
export type { PopularQuizItemDto, QuizListItemDto, TrendingQuizItemDto }
