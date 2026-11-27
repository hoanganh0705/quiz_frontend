import { Suspense } from "react";

import { SocialFeedRouteGate } from "@/features/social/components/SocialFeedRouteGate";

import { RouteGateSkeleton } from "@/components/ui/loading-states";

import { buildMetadata } from "@/shared/lib/seo";

export const metadata = buildMetadata({
  title: "Social Feed | QuizHub",
  description:
    "Follow friend quiz completions, milestones, and community activity.",
  path: "/social",
  noIndex: true,
});

export default function SocialFeedRootRoute(): React.ReactElement {
  return (
    <Suspense fallback={<RouteGateSkeleton />}>
      <SocialFeedRouteGate />
    </Suspense>
  );
}
