import type { Metadata } from "next";
import { UserAdminContent } from "./_components/UserAdminContent";

export const metadata: Metadata = {
  title: "Users",
  description: "Manage user accounts, roles, and permissions.",
};

export default function AdminUsersPage() {
  return <UserAdminContent />;
}
