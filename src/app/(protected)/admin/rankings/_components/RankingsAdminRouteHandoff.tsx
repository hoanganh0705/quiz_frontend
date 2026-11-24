"use client";

import { useEffect } from "react";

import { RankingAdminPage } from "@/features/admin/ranking-admin/components";
import { logger } from "@/shared/log";

export function RankingsAdminRouteHandoff() {
  useEffect(() => {
    logger.debug("admin.ranking", "mount");
  }, []);

  return <RankingAdminPage />;
}
