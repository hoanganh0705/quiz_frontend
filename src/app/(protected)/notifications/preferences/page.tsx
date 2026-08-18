import { Suspense } from "react";
import { RouteGateSkeleton } from "@/components/ui/loading-states";
import { NotificationPreferencesPage } from "@/features/notifications/components/NotificationPreferencesPage";
import { buildMetadata } from "@/shared/lib/seo";

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