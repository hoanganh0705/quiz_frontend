

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

export const ANALYTICS_ZERO_WIDGETS: readonly AnalyticsWidgetId[] = [

"ranking_xp_week",
"ranking_xp_month",
"ranking_xp_all",

"social_score_week",
"social_score_month",
"social_score_all",

"achievements_earned",
] as const;

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

export function isZeroWidget(id: AnalyticsWidgetId): boolean {
return (ANALYTICS_ZERO_WIDGETS as readonly AnalyticsWidgetId[]).includes(id);
}

export function getZeroWidgetReason(
id: AnalyticsWidgetId,
): string | null {
if (!isZeroWidget(id)) return null;
const reason = ANALYTICS_ZERO_WIDGET_REASON[id];
return reason.length > 0 ? reason : null;
}

export const ANALYTICS_ZERO_WIDGET_CATALOG = Object.freeze({
zeroWidgets: ANALYTICS_ZERO_WIDGETS,
reasons: ANALYTICS_ZERO_WIDGET_REASON,
});
