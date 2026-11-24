"use client";

import { useEffect } from "react";

import { UserRoleAdminPage } from "@/features/admin/user-role-admin/components/UserRoleAdminPage";
import { logger } from "@/shared/log";

export function UserRoleAdminRouteHandoff() {

  useEffect(() => {
    logger.debug("admin.user-role", "mount");
  }, []);

  return <UserRoleAdminPage />;
}
