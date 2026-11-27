import { Suspense } from "react";

import { AchievementAdminUserPage } from "@/features/admin/achievement-admin/components/AchievementAdminUserPage";

import AdminLoading from "../../../loading";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "User Achievements",
  description: "Re-evaluate user achievements and manage earned badges.",
};

export default async function AdminAchievementUserPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;

  return (
    <Suspense fallback={<AdminLoading />}>
      <AchievementAdminUserPage userId={userId} />
    </Suspense>
  );
}
