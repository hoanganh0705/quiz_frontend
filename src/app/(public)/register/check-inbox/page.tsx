import { buildMetadata } from "@/shared/lib/seo";

import { CheckInboxPageView } from "@/features/auth/pages/CheckInboxPageView";

export const metadata = buildMetadata({
  title: "Check Your Inbox | QuizHub",
  description: "Check your email inbox for your QuizHub verification link.",
  path: "/register/check-inbox",
  noIndex: true,
});

export default function CheckInboxPage() {
  return <CheckInboxPageView />;
}
