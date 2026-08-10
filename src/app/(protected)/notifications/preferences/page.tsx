import { Suspense } from "react";
import { RouteGateSkeleton } from "@/components/ui/loading-states";
import { NotificationPreferencesPage } from "@/features/notifications/components/NotificationPreferencesPage";
import { buildMetadata } from "@/shared/lib/seo";

/**
 * `/notifications/preferences` — notification preferences route.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.4 — Live notification stream and notification center.
 * Source ticket: TKT-5.4.F4.
 *
 * Thin route entry that delegates to `<NotificationPreferencesPage />`.
 * Mounted at the root path (not the `(protected)` route group) because
 * auth is enforced by `proxy.ts` middleware, which is the canonical
 * pattern for Phase 5 routes that need auth without leaning on the
 * `(protected)` layout's deletion-guard.
 *
 * ## Authentication
 *
 * This route is in `proxy.ts`'s `PROTECTED_PREFIXES` list, so
 * unauthenticated users are redirected to
 * `/login?redirect=/notifications/preferences`.
 *
 * ## Metadata
 *
 * Page title is set via `buildMetadata`. The title is a stable string
 * and never embeds preference values, so no metadata leakage risk.
 */

export const metadata = buildMetadata({
  title: "Notification preferences | QuizHub",
  description:
    "Choose how and when you'd like to receive quiz invites, achievement updates, friend activity, and other notifications.",
  path: "/notifications/preferences",
});

export default function NotificationPreferencesRoute(): React.ReactElement {
  return (
    <Suspense fallback={<RouteGateSkeleton />}>
      <NotificationPreferencesPage />
    </Suspense>
  );
}