import { Suspense } from "react";

import { AuditLogPage } from "@/features/admin/audit-admin/components/AuditLogPage";

import AdminLoading from "../loading";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Audit Log",
  description: "View and filter administrative events and audit trail.",
};

export default function AdminAuditPage() {
  return (
    <Suspense fallback={<AdminLoading />}>
      <AuditLogPage />
    </Suspense>
  );
}
