/**
 * `analytics-zero-widget-catalog.spec.ts` — Locks the catalogue
 * contract (TKT-6.3.A4).
 *
 * Asserts:
 *
 *   - `AnalyticsWidgetId` is a closed union (the spec enumerates
 *     every documented id).
 *   - `ANALYTICS_ZERO_WIDGETS` is non-empty when the backend
 *     verification report lists zero widgets (it does today; see
 *     the planning ticket's note on master plan Phase 6 Out-of-Scope
 *     line 48).
 *   - Every entry in `ANALYTICS_ZERO_WIDGETS` has a non-empty
 *     reason in `ANALYTICS_ZERO_WIDGET_REASON`.
 *   - `isZeroWidget` returns `true` for members of the catalogue
 *     and `false` for everything else.
 *   - `getZeroWidgetReason` returns the reason for zero widgets and
 *     `null` otherwise.
 *   - The frozen `ANALYTICS_ZERO_WIDGET_CATALOG` record exposes
 *     every constant.
 */

import { describe, expect, it } from "vitest";

import {
  ANALYTICS_ZERO_WIDGETS,
  ANALYTICS_ZERO_WIDGET_REASON,
  type AnalyticsWidgetId,
  isZeroWidget,
  getZeroWidgetReason,
  ANALYTICS_ZERO_WIDGET_CATALOG,
} from "@/features/social/analytics-zero-widget-catalog";

describe("AnalyticsWidgetId closed union", () => {
  it("is enumerable so a type-level regression is also a runtime regression", () => {
    const expected: AnalyticsWidgetId[] = [
      "quizzes_published",
      "attempts_completed",
      "achievements_earned",
      "ranking_xp_week",
      "ranking_xp_month",
      "ranking_xp_all",
      "friend_count",
      "follower_count",
      "following_count",
      "social_score_week",
      "social_score_month",
      "social_score_all",
    ];
    for (const id of expected) {
      // isZeroWidget accepts the union and returns a boolean — the
      // type system has already narrowed `id` to AnalyticsWidgetId.
      // We only assert the helper does not throw on documented ids.
      expect(typeof isZeroWidget(id)).toBe("boolean");
    }
  });
});

describe("ANALYTICS_ZERO_WIDGETS", () => {
  it("is non-empty", () => {
    expect(ANALYTICS_ZERO_WIDGETS.length).toBeGreaterThan(0);
  });

  it("contains only documented AnalyticsWidgetId members", () => {
    const knownIds: readonly AnalyticsWidgetId[] = [
      "quizzes_published",
      "attempts_completed",
      "achievements_earned",
      "ranking_xp_week",
      "ranking_xp_month",
      "ranking_xp_all",
      "friend_count",
      "follower_count",
      "following_count",
      "social_score_week",
      "social_score_month",
      "social_score_all",
    ];
    for (const id of ANALYTICS_ZERO_WIDGETS) {
      expect((knownIds as readonly string[]).includes(id)).toBe(true);
    }
  });
});

describe("ANALYTICS_ZERO_WIDGET_REASON", () => {
  it("has a non-empty reason for every catalogue entry", () => {
    for (const id of ANALYTICS_ZERO_WIDGETS) {
      const reason = ANALYTICS_ZERO_WIDGET_REASON[id];
      expect(reason, `zero widget ${id} must have a reason`).toBeTruthy();
      expect(reason.length).toBeGreaterThan(0);
    }
  });

  it("covers every AnalyticsWidgetId key (empty string is allowed for non-zero widgets)", () => {
    const knownIds: readonly AnalyticsWidgetId[] = [
      "quizzes_published",
      "attempts_completed",
      "achievements_earned",
      "ranking_xp_week",
      "ranking_xp_month",
      "ranking_xp_all",
      "friend_count",
      "follower_count",
      "following_count",
      "social_score_week",
      "social_score_month",
      "social_score_all",
    ];
    for (const id of knownIds) {
      expect(typeof ANALYTICS_ZERO_WIDGET_REASON[id]).toBe("string");
    }
  });
});

describe("isZeroWidget", () => {
  it("returns true for every catalogue entry", () => {
    for (const id of ANALYTICS_ZERO_WIDGETS) {
      expect(isZeroWidget(id)).toBe(true);
    }
  });

  it("returns false for known widget ids that are NOT in the catalogue", () => {
    const knownIds: readonly AnalyticsWidgetId[] = [
      "quizzes_published",
      "attempts_completed",
      "friend_count",
      "follower_count",
      "following_count",
    ];
    for (const id of knownIds) {
      if ((ANALYTICS_ZERO_WIDGETS as readonly AnalyticsWidgetId[]).includes(id)) {
        continue;
      }
      expect(isZeroWidget(id)).toBe(false);
    }
  });
});

describe("getZeroWidgetReason", () => {
  it("returns the reason for catalogue entries", () => {
    for (const id of ANALYTICS_ZERO_WIDGETS) {
      const reason = getZeroWidgetReason(id);
      expect(reason).not.toBeNull();
      expect(typeof reason).toBe("string");
      expect((reason ?? "").length).toBeGreaterThan(0);
    }
  });

  it("returns null for non-catalogue entries", () => {
    const knownNonZeroIds: readonly AnalyticsWidgetId[] = [
      "quizzes_published",
      "attempts_completed",
      "friend_count",
      "follower_count",
      "following_count",
    ];
    for (const id of knownNonZeroIds) {
      if ((ANALYTICS_ZERO_WIDGETS as readonly AnalyticsWidgetId[]).includes(id)) {
        continue;
      }
      expect(getZeroWidgetReason(id)).toBeNull();
    }
  });
});

describe("ANALYTICS_ZERO_WIDGET_CATALOG", () => {
  it("is frozen", () => {
    expect(Object.isFrozen(ANALYTICS_ZERO_WIDGET_CATALOG)).toBe(true);
  });

  it("mirrors the individual exports", () => {
    expect(ANALYTICS_ZERO_WIDGET_CATALOG.zeroWidgets).toEqual(
      ANALYTICS_ZERO_WIDGETS,
    );
    expect(ANALYTICS_ZERO_WIDGET_CATALOG.reasons).toBe(
      ANALYTICS_ZERO_WIDGET_REASON,
    );
  });
});
