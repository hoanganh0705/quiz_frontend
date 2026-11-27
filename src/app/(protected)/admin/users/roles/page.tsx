import { Suspense } from "react";

import { UserRoleAdminPage } from "@/features/admin/user-role-admin/components/UserRoleAdminPage";

import AdminLoading from "../../loading";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "User Roles",
  description: "Inspect, grant, and revoke user administrative roles.",
};

export default function AdminUserRolesPage() {
  return (
    <Suspense fallback={<AdminLoading />}>
      <UserRoleAdminPage />
    </Suspense>
  );
}
