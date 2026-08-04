import { Suspense } from "react";
import { NotificationCenterPage } from "@/features/notifications/components/NotificationCenterPage";
import { buildMetadata } from "@/shared/lib/seo";

/**
 * `/notifications` — notification center route.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.4 — Live notification stream and notification center.
 * Source ticket: TKT-5.4.F3.
 *
 * Thin route entry that delegates to `<NotificationCenterPage />`. The
 * route is mounted at the root path (not the `(protected)` route group)
 * because auth is enforced by `proxy.ts` middleware, which is the
 * canonical pattern for Phase 5 routes that need auth without leaning on
 * the `(protected)` layout's deletion-guard.
 *
 * ## Authentication
 *
 * This route is in `proxy.ts`'s `PROTECTED_PREFIXES` list, so
 * unauthenticated users are redirected to `/login?redirect=/notifications`.
 *
 * ## Metadata
 *
 * Page title and description are set via `buildMetadata` so the route
 * has stable SEO metadata. No notification data is rendered into
 * metadata before the user is authenticated.
 */

export const metadata = buildMetadata({
  title: "Notifications | QuizHub",
  description:
    "Stay updated on quiz invites, achievements, friend activity, and more.",
  path: "/notifications",
});

export default function NotificationsRoute(): React.ReactElement {
  return (
    <Suspense fallback={null}>
      <NotificationCenterPage />
    </Suspense>
  );
}