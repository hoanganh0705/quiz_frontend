import { OnboardingFlowPage } from "@/features/onboarding/components/OnboardingFlowPage";

import { buildMetadata } from "@/shared/lib/seo";

export const metadata = buildMetadata({
  title: "Welcome to QuizHub | Onboarding",
  description: "Personalize your topics and set up your player profile.",
  path: "/onboarding",
  noIndex: true,
});

export default function OnboardingRoute(): React.ReactElement {
  return <OnboardingFlowPage />;
}
