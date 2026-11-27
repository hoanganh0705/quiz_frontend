import { LEGAL_ROUTES } from "@/shared/config/routes";
import { buildMetadata } from "@/shared/lib/seo";

import { TermsOfServicePage } from "@/features/legal";

export const metadata = buildMetadata({
  title: "Terms of Service | QuizHub",
  description:
    "Read the QuizHub Terms of Service covering accounts, community-authored quizzes, fair play, moderation, and account deletion.",
  path: LEGAL_ROUTES.terms,
});

export default function TermsPage() {
  return <TermsOfServicePage />;
}
