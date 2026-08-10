"use client";

/**
 * `AchievementsPage` — Story 5.5 achievement surfaces composition.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.5 — Ranking, leaderboards, milestones, and achievement surfaces.
 * Source ticket: TKT-5.5.F2.
 *
 * Composes:
 *
 *   - `<BadgeGallery />` (TKT-5.5.D3) — full catalog grouped by tier.
 *   - `<EarnedBadgeList />` (TKT-5.5.D4) — personal earned badges
 *     with informational progress.
 *   - `<AchievementHistory />` (TKT-5.5.D4) — chronological history
 *     with category filter.
 *
 * The page mounts the
 * `useAchievementNotificationRevalidation()` bridge so a
 * `notification:sent` event of type `'achievement'` revalidates the
 * matching SWR caches on this tab. As a fallback for environments
 * where the notification socket is unavailable, the page also
 * subscribes to window focus events and revalidates the same SWR
 * key set when focus returns (TKT-5.5.F2 AC #5).
 *
 * ## Feature flag gating (F2 AC #1)
 *
 * When `achievements_live === 'placeholder'`, the page renders the
 * documented Phase 3 placeholder view (`AchievementsPlaceholder`).
 * Without this, every child component would early-return `null` and
 * the shell would be empty — that's a regression from the Phase 3
 * convention where every gated page shows an explicit "coming soon"
 * card.
 *
 * ## Visibility split (F2 AC #2 / #3)
 *
 * The catalog (`BadgeGallery`) is visible to all visitors. Earned
 * badges and history are visible only to authenticated users (the
 * child components self-gate on `useAuthBootstrap`).
 *
 * ## Catalog filter UX (F2 AC #6)
 *
 * The catalog and history filter controls write to URL query state
 * inside their own components (`BadgeGallery`, `AchievementHistory`)
 * for shareable / refreshable URLs.
 *
 * ## SSR-safety
 *
 * The page is a client component. The route entry
 * (`app/(public)/achievements/page.tsx`) owns the metadata and wraps
 * this component in `<Suspense>` to satisfy the `useSearchParams`
 * Next.js requirement.
 *
 * ## Focus revalidation (F2 AC #5)
 *
 * Notifications are the primary signal that an achievement was
 * earned. When the notification socket is unavailable (the realtime
 * flag is off, the socket lost connection, etc.), a window-focus
 * revalidation fires after the user returns to the page so freshly
 * earned badges appear without manual refresh. The bridge is
 * mounted at the page level (so it lives only when the user is on
 * the achievements route) and is gated on the same predicate chain
 * as the notification bridge (placeholder flag = no-op).
 */

import { Suspense } from "react";

import { AchievementsPlaceholder } from "@/features/rankings/components/shared/Placeholder";
import { isAchievementSurfaceEnabled } from "@/features/achievements/flags";
import { BadgeGallery } from "@/features/achievements/components/BadgeGallery";
import { EarnedBadgeList } from "@/features/achievements/components/EarnedBadgeList";
import { AchievementHistory } from "@/features/achievements/components/AchievementHistory";
import { useAchievementNotificationRevalidation } from "@/features/achievements/hooks/useAchievementNotificationRevalidation";
import { useAchievementFocusRevalidation } from "@/features/achievements/hooks/useAchievementFocusRevalidation";

interface AchievementsPageProps {
  className?: string;
}

/**
 * Render the Story 5.5 achievements page composition.
 *
 * Honours TKT-5.5.F2:
 *
 *   - F2 AC #1 — renders a placeholder view when
 *     `achievements_live === 'placeholder'`.
 *   - F2 AC #2 — catalog visible to all visitors.
 *   - F2 AC #3 — earned badges / history visible only to authenticated
 *     users (child-component auth gating).
 *   - F2 AC #4 — mounts `useAchievementNotificationRevalidation` so a
 *     newly earned badge appears after a `notification:sent` event.
 *   - F2 AC #5 — mounts `useAchievementFocusRevalidation` so manual
 *     focus events trigger revalidation when notifications are
 *     unavailable.
 *   - F2 AC #6 — catalog filter controls (in `BadgeGallery`) write to
 *     URL query state.
 */
export function AchievementsPage({ className }: AchievementsPageProps) {
  const isLive = isAchievementSurfaceEnabled();

  if (!isLive) {
    return (
      <main
        data-testid="achievements-page-placeholder"
        className={`mx-auto max-w-4xl p-4 sm:p-6 lg:p-8 ${className ?? ""}`}
      >
        <AchievementsPlaceholder />
      </main>
    );
  }

  // Hooks below are mounted unconditionally inside the live branch.
  // Both bridges are no-ops when their respective flags are
  // `'placeholder'`, so they are safe to mount alongside each other.
  return <AchievementsPageLive className={className} />;
}

/**
 * Live-surface shell.
 *
 * Pulled out so all hooks sit above every early return; the
 * `isLive` short-circuit happens BEFORE these hooks mount, which is
 * the rules-of-hooks-correct pattern. (A single `isLive`-gated
 * jump mounts the page or returns the placeholder.)
 */
function AchievementsPageLive({ className }: AchievementsPageProps) {
  // Wire the notification-driven revalidation bridge so achievement
  // notifications from the socket refresh this tab's caches.
  useAchievementNotificationRevalidation();

  // Fallback: when the realtime socket is unavailable, revalidate on
  // window focus so freshly earned badges appear without manual
  // refresh.
  useAchievementFocusRevalidation();

  return (
    <main
      data-testid="achievements-page"
      className={`mx-auto max-w-4xl space-y-6 p-4 sm:p-6 lg:p-8 ${className ?? ""}`}
    >
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Achievements</h1>
        <p className="text-sm text-muted-foreground">
          Browse the badge catalog, your earned badges, and your full
          achievement history.
        </p>
      </header>

      {/* `BadgeGallery` uses `useSearchParams`; wrap in Suspense so
          Next.js can prerender the rest of the page when the flag is
          off (the gallery returns `null` in that case anyway). */}
      <Suspense fallback={null}>
        <BadgeGallery />
      </Suspense>
      <EarnedBadgeList />
      <Suspense fallback={null}>
        <AchievementHistory />
      </Suspense>
    </main>
  );
}
