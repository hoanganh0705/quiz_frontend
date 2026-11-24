"use client";

import { useEffect } from "react";

import { ShieldAlert } from "lucide-react";

import { AchievementAdminUserPage } from "@/features/admin/achievement-admin/components/AchievementAdminUserPage";
import { logger } from "@/shared/log";


export interface AchievementAdminUserRouteHandoffProps {
  userId: string;
}

export function AchievementAdminUserRouteHandoff({
  userId,
}: AchievementAdminUserRouteHandoffProps) {

  useEffect(() => {
    logger.debug("admin.achievement", "mount", { userId });
  }, [userId]);

  return <AchievementAdminUserPage userId={userId} />;
}
