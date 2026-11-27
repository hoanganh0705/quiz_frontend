import { buildMetadata } from "@/shared/lib/seo";

import { SignupPageView } from "@/features/auth/pages/SignupPageView";

export const metadata = buildMetadata({
  title: "Sign Up | QuizHub",
  description: "Create your QuizHub account and start playing quizzes.",
  path: "/signup",
  noIndex: true,
});

export default function SignupPage() {
  return <SignupPageView />;
}
