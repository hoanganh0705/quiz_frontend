import { Suspense } from "react";

import { MyProfilePageContent } from "@/features/users/components/my-profile/MyProfilePageContent";

import { buildMetadata } from "@/shared/lib/seo";

import ProfileLoading from "./loading";

export const metadata = buildMetadata({
  title: "My Profile | QuizHub",
  description:
    "View your XP level, streaks, quiz activity, achievements, and personal statistics.",
  path: "/my-profile",
  noIndex: true,
});

export default function MyProfileRoute(): React.ReactElement {
  return (
    <Suspense fallback={<ProfileLoading />}>
      <MyProfilePageContent />
    </Suspense>
  );
}
