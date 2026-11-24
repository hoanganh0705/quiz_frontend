import type { Metadata } from "next";
import { AuditLogRouteHandoff } from "./_components/AuditLogRouteHandoff";

export const metadata: Metadata = {
  title: "Audit Log",
  description: "View and filter administrative events and audit trail.",
};

export default function AdminAuditPage() {
  return <AuditLogRouteHandoff />;
}
