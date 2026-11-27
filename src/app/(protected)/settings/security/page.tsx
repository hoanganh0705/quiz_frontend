import { Suspense } from "react";

import SecuritySettingsPage from "@/features/auth/components/SecuritySettingsPage";

import { buildMetadata } from "@/shared/lib/seo";

import SettingsLoading from "../loading";

export const metadata = buildMetadata({
  title: "Security & Sessions | QuizHub",
  description:
    "Update your password, review login activity, and revoke active sessions.",
  path: "/settings/security",
  noIndex: true,
});

export default function SecuritySettingsRoute(): React.ReactElement {
  return (
    <Suspense fallback={<SettingsLoading />}>
      <SecuritySettingsPage />
    </Suspense>
  );
}
