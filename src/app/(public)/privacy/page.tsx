import { LEGAL_ROUTES } from "@/shared/config/routes";
import { buildMetadata } from "@/shared/lib/seo";

import { PrivacyPolicyPage } from "@/features/legal";

export const metadata = buildMetadata({
  title: "Privacy Policy | QuizHub",
  description:
    "Learn how QuizHub collects, uses, protects, and deletes account, authentication, cookie, and gameplay information.",
  path: LEGAL_ROUTES.privacy,
});

export default function PrivacyPage() {
  return <PrivacyPolicyPage />;
}
