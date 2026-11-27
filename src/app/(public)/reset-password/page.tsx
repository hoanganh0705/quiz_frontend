import { buildMetadata } from "@/shared/lib/seo";

import { ResetPasswordPageView } from "@/features/auth/pages/ResetPasswordPageView";

export const metadata = buildMetadata({
  title: "Reset Password | QuizHub",
  description: "Choose a new password for your QuizHub account.",
  path: "/reset-password",
  noIndex: true,
});

export default function ResetPasswordPage() {
  return <ResetPasswordPageView />;
}
