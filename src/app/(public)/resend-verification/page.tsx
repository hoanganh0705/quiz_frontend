import { buildMetadata } from "@/shared/lib/seo";

import { ResendVerificationPageView } from "@/features/auth/pages/ResendVerificationPageView";

export const metadata = buildMetadata({
  title: "Resend Verification Email | QuizHub",
  description: "Request a new verification email for your QuizHub account.",
  path: "/resend-verification",
  noIndex: true,
});

export default function ResendVerificationPage() {
  return <ResendVerificationPageView />;
}
