import { Suspense } from "react";

import AdminSettingsPage from "@/features/admin/components/AdminSettingsPage";

import AdminLoading from "../loading";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings",
  description: "Inspect platform status, cache controls, and system diagnostics.",
};

export default function AdminSettingsRoute() {
  return (
    <Suspense fallback={<AdminLoading />}>
      <AdminSettingsPage />
    </Suspense>
  );
}
