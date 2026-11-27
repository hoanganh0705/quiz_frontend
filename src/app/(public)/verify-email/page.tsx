import { buildMetadata } from "@/shared/lib/seo";

import { VerifyEmailPageView } from "@/features/auth/pages/VerifyEmailPageView";

export const metadata = buildMetadata({
  title: "Verify Email | QuizHub",
  description: "Verify your email address to activate your QuizHub account.",
  path: "/verify-email",
  noIndex: true,
});

export default function VerifyEmailPage() {
  return <VerifyEmailPageView />;
}
