import { Suspense } from "react";

import { TournamentAdminPage } from "@/features/admin/tournament-admin/components/TournamentAdminPage";

import AdminLoading from "../loading";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tournaments",
  description: "Create, edit, and manage tournaments across the platform.",
};

export default function AdminTournamentsPage() {
  return (
    <Suspense fallback={<AdminLoading />}>
      <TournamentAdminPage />
    </Suspense>
  );
}
