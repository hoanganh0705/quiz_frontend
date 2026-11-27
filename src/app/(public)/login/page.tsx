import { buildMetadata } from "@/shared/lib/seo";

import { LoginPageView } from "@/features/auth/pages/LoginPageView";

export const metadata = buildMetadata({
  title: "Sign In | QuizHub",
  description: "Sign in to continue your quiz journey on QuizHub.",
  path: "/login",
  noIndex: true,
});

export default function LoginPage() {
  return <LoginPageView />;
}
