import { Suspense } from "react";

import { UserAdminPage } from "@/features/admin/user-admin/components/UserAdminPage";

import AdminLoading from "../loading";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Users",
  description: "Manage user accounts, roles, and permissions.",
};

export default function AdminUsersPage() {
  return (
    <Suspense fallback={<AdminLoading />}>
      <UserAdminPage />
    </Suspense>
  );
}
