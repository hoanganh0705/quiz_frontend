import { Suspense } from "react";

import { RouteGateSkeleton } from "@/components/ui/loading-states";
import { buildMetadata } from "@/shared/lib/seo";

import { CoinsLandingPage } from "@/features/coins/components/CoinsLandingPage";

export const metadata = buildMetadata({
  title: "Coins | QuizHub",
  description:
    "Your coin balance, full transaction ledger, and spending controls.",
  path: "/coins",
});

export default function CoinsRoute(): React.ReactElement {
  return (
    <Suspense fallback={<RouteGateSkeleton />}>
      <CoinsLandingPage />
    </Suspense>
  );
}
