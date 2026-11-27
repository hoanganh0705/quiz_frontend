import { buildMetadata } from "@/shared/lib/seo";

import { ForgotPasswordPageView } from "@/features/auth/pages/ForgotPasswordPageView";

export const metadata = buildMetadata({
  title: "Forgot Password | QuizHub",
  description: "Request a password reset link to regain access to your QuizHub account.",
  path: "/forgot-password",
  noIndex: true,
});

export default function ForgotPasswordPage() {
  return <ForgotPasswordPageView />;
}
