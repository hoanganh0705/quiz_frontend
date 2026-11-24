import type { Metadata } from "next";
import { TagAdminPage } from "@/features/admin/tag-admin/components/TagAdminPage";

export const metadata: Metadata = {
  title: "Tags",
  description: "Organize and manage quiz tags for better discoverability.",
};

export default function AdminTagsPage() {
  return <TagAdminPage />;
}
