"use client";

import { useEffect } from "react";

import { ShieldAlert } from "lucide-react";

import { addTournamentAdminBreadcrumb } from "@/lib/admin/admin_live_sentry";
import { TournamentAdminPage } from "@/features/admin/tournament-admin/components/TournamentAdminPage";

export function TournamentAdminRouteHandoff() {

  useEffect(() => {
    addTournamentAdminBreadcrumb({
      action: "tournament-admin.mount",
      route: "tournament-admin.page",
      status: "started",
      durationMs: 0,
    });
  }, []);

  return <TournamentAdminPage />;
}
