import type { Metadata } from "next";
import { CategoryAdminPage } from "@/features/admin/category-admin/components/CategoryAdminPage";

export const metadata: Metadata = {
  title: "Categories",
  description: "Organize and manage quiz categories for better discoverability.",
};

export default function AdminCategoriesPage() {
  return <CategoryAdminPage />;
}
