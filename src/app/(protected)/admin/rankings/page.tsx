import { Suspense } from "react";

import { RankingAdminPage } from "@/features/admin/ranking-admin/components";

import AdminLoading from "../loading";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Rankings",
  description: "Recalculate, audit, and reset platform rankings.",
};

export default function AdminRankingsPage() {
  return (
    <Suspense fallback={<AdminLoading />}>
      <RankingAdminPage />
    </Suspense>
  );
}
