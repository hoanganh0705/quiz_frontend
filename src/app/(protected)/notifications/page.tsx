import { Suspense } from "react";
import { RouteGateSkeleton } from "@/components/ui/loading-states";
import { NotificationCenterPage } from "@/features/notifications/components/NotificationCenterPage";
import { buildMetadata } from "@/shared/lib/seo";

export const metadata = buildMetadata({
title: "Notifications | QuizHub",
description:
"Stay updated on quiz invites, achievements, friend activity, and more.",
path: "/notifications",
});

export default function NotificationsRoute(): React.ReactElement {
return (
<Suspense fallback={<RouteGateSkeleton />}>
<NotificationCenterPage />
</Suspense>
  );
}