import { Suspense } from "react";

import { SettingsPageContent } from "@/features/users/components/settings/SettingsPageContent";

import { buildMetadata } from "@/shared/lib/seo";

import SettingsLoading from "./loading";

export const metadata = buildMetadata({
  title: "Settings | QuizHub",
  description:
    "Manage your account profile, notification preferences, privacy controls, and regional settings.",
  path: "/settings",
  noIndex: true,
});

export default function SettingsRoute(): React.ReactElement {
  return (
    <Suspense fallback={<SettingsLoading />}>
      <SettingsPageContent />
    </Suspense>
  );
}
