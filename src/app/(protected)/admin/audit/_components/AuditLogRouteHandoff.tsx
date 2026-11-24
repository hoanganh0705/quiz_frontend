"use client";

import { useEffect } from "react";
import { AuditLogPage } from "@/features/admin/audit-admin/components";
import { logger } from "@/shared/log";

export function AuditLogRouteHandoff() {
  useEffect(() => {
    logger.debug("admin.audit", "mount");
  }, []);

  return <AuditLogPage />;
}
