/**
 * `analytics-zero-widget-catalog.ts` — Catalogue of analytics widgets
 * known to return zeros, plus the documented reason for each.
 *
 * Source epic:   Epic 6.3 — Social Counts, User Stats, My Analytics,
 *                and Friend Leaderboard.
 * Source story:  `projectDocs/Epics/PHASE_6_IMPLEMENTATION_PLAN.md` →
 *                Story 6.3 (lines 181–221).
 * Source ticket: TKT-6.3.A4.
 *
 * ## Purpose
 *
 * Story 6.3 Exit Criterion #4 ("Analytics widgets known to return
 * zeros are not rendered as meaningful data") is enforced here as a
 * single source of truth. The UI consults `isZeroWidget(id)` before
 * rendering a widget; if the widget is in the catalogue, the
 * `AnalyticsChart` primitive (TKT-6.3.C2) returns `null` rather than
 * rendering a "0" tile or an empty placeholder that looks like data.
 *
 * The catalogue intentionally separates two concerns:
 *
 *   1. **Closed union (`AnalyticsWidgetId`)** — the wire-format
 *      widget id set every analytics hook (`useMySocialAnalytics`,
 *      `useUserSocialStats`) MUST narrow to. A new widget id is a
 *      type error until this union is updated.
 *   2. **Zero list (`ANALYTICS_ZERO_WIDGETS`)** — the subset the UI
 *      must hide. The list is editable without changing the union
 *      (e.g. when the backend stabilises and a widget is no longer
 *      zero).
 *
 * The reasons in `ANALYTICS_ZERO_WIDGET_REASON` are the human-readable
 * audit trail referenced by the Epic 6.3 backend verification
 * checklist (Story 6.3 line 211: "Analytics-zero endpoints are
 * explicitly listed so the UI can hide them"). Every zero widget
 * MUST carry a reason; the spec asserts the invariant.
 *
 * ## Source of truth for additions / removals
 *
 * `projectDocs/Tickets/Phase6/evidence/EPIC_6_3_A1.md` (the Epic 6.1 /
 * 6.2 deliverable evidence file) and the backend's OpenAPI report are
 * the canonical sources. When the backend team reports that a widget
 * is no longer zero, the entry is removed from `ANALYTICS_ZERO_WIDGETS`
 * (and `ANALYTICS_ZERO_WIDGET_REASON`) in this file and the change
 * is documented in the next Epic 6.3 evidence file.
 *
 * ## SSR-safety
 *
 * The module declares types and frozen constants only. It is safe to
 * import from Server Components and from the App Router's route
 * modules.
 */

/**
 * The closed union of analytics widget ids the frontend recognises.
 *
 * Phase 6: removed `quizzes_published` and `attempts_completed` from
 * the union. The deep-analytics DTO has no per-period source for
 * these metrics; the only way to render them was to use a
 * hard-coded `0` (the silent-fallback anti-pattern the audit W-29
 * targeted). The widgets remain in the master plan Phase 6 backlog
 * for a follow-up that introduces a dedicated endpoints.
 */
export type AnalyticsWidgetId =
  | "achievements_earned"
  | "ranking_xp_week"
  | "ranking_xp_month"
  | "ranking_xp_all"
  | "friend_count"
  | "follower_count"
  | "following_count"
  | "social_score_week"
  | "social_score_month"
  | "social_score_all";

/**
 * The widgets the UI must NOT render as meaningful data.
 *
 * The list is intentionally editable without changing the
 * `AnalyticsWidgetId` union (e.g. when the backend stabilises a
 * widget, the entry is removed here but the union stays the same).
 *
 * The catalogue mirrors `PHASE_6_IMPLEMENTATION_PLAN.md` Story 6.3
 * Backend Verification Checklist line 211 and the master plan Phase 6
 * Out-of-Scope line 48 ("Achievement / ranking analytics widgets that
 * are known to return zeros").
 */
export const ANALYTICS_ZERO_WIDGETS: readonly AnalyticsWidgetId[] = [
  // The ranking XP widgets are zero because the backend does not yet
  // ship XP for the social module (master plan Phase 6 Out-of-Scope).
  "ranking_xp_week",
  "ranking_xp_month",
  "ranking_xp_all",
  // The social-score widgets are zero for the same reason.
  "social_score_week",
  "social_score_month",
  "social_score_all",
  // The achievement counter is zero in the initial rollout because
  // the achievement module has not been connected to the social
  // domain yet.
  "achievements_earned",
] as const;

/**
 * The documented reason for each zero widget.
 *
 * Every entry in `ANALYTICS_ZERO_WIDGETS` MUST have a matching entry
 * here. The spec asserts the invariant. Reasons are short, factual,
 * and reference the source (master plan section, backend ticket, or
 * Epic 6.3 verification note).
 */
export const ANALYTICS_ZERO_WIDGET_REASON: Record<AnalyticsWidgetId, string> = {
  achievements_earned:
    "Returned by backend with zero in initial rollout — the achievement module is not yet connected to the social domain.",
  ranking_xp_week:
    "Returned by backend with zero in initial rollout — ranking XP is not yet shipped for the social module (master plan Phase 6 Out-of-Scope line 48).",
  ranking_xp_month:
    "Returned by backend with zero in initial rollout — ranking XP is not yet shipped for the social module (master plan Phase 6 Out-of-Scope line 48).",
  ranking_xp_all:
    "Returned by backend with zero in initial rollout — ranking XP is not yet shipped for the social module (master plan Phase 6 Out-of-Scope line 48).",
  friend_count: "",
  follower_count: "",
  following_count: "",
  social_score_week:
    "Returned by backend with zero in initial rollout — social score is a placeholder widget pending backend stabilisation.",
  social_score_month:
    "Returned by backend with zero in initial rollout — social score is a placeholder widget pending backend stabilisation.",
  social_score_all:
    "Returned by backend with zero in initial rollout — social score is a placeholder widget pending backend stabilisation.",
};

/**
 * Lookup helper. Returns `true` when the widget is in the zero
 * catalogue, `false` otherwise.
 *
 * The helper is the only public way to query the catalogue. The
 * `AnalyticsChart` primitive (TKT-6.3.C2) imports it; no other module
 * is permitted to reach into the underlying array directly.
 */
export function isZeroWidget(id: AnalyticsWidgetId): boolean {
  return (ANALYTICS_ZERO_WIDGETS as readonly AnalyticsWidgetId[]).includes(id);
}

/**
 * Type-guard that returns the reason for a zero widget, or `null`
 * when the widget is not in the catalogue.
 *
 * Used by the analytics-zero verification command and by future
 * admin surfaces that want to surface the reason to operators.
 */
export function getZeroWidgetReason(
  id: AnalyticsWidgetId,
): string | null {
  if (!isZeroWidget(id)) return null;
  const reason = ANALYTICS_ZERO_WIDGET_REASON[id];
  return reason.length > 0 ? reason : null;
}

/**
 * Read-only record exposing every constant in this module. Re-exported
 * from `@/features/social` so list components and admin tools can
 * read `ANALYTICS_ZERO_WIDGET_CATALOG.zeroWidgets` without needing
 * to remember the exact identifier.
 */
export const ANALYTICS_ZERO_WIDGET_CATALOG = Object.freeze({
  zeroWidgets: ANALYTICS_ZERO_WIDGETS,
  reasons: ANALYTICS_ZERO_WIDGET_REASON,
});
