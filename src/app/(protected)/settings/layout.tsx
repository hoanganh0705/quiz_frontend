import { DeletionGuard } from "@/features/auth/guards/deletion-guard";

import { buildMetadata } from "@/shared/lib/seo";

import type { ReactNode } from "react";

export const metadata = buildMetadata({
  title: "Settings | QuizHub",
  description: "Manage your account preferences and privacy settings.",
  path: "/settings",
  noIndex: true,
});

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return <DeletionGuard>{children}</DeletionGuard>;
}
