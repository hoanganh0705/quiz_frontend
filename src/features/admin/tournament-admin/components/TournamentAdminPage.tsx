"use client";

import type React from "react";
import { forwardRef, useCallback, useRef } from "react";

import { Plus } from "lucide-react";

import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import { usePermission } from "@/features/admin/hooks/usePermission";
import { PERMISSIONS } from "@/features/admin/permissions";
import { PAGE_CONTAINER_CLASS } from "@/shared/layout/constants";

import { TournamentAdminList } from "./TournamentAdminList";
import type { TournamentAdminListHandle } from "./TournamentAdminList";

export type TournamentAdminPageProps = Record<string, never>;

export type TournamentAdminPageHandle = Record<string, never>;

export const TournamentAdminPage = forwardRef<
  TournamentAdminPageHandle,
  TournamentAdminPageProps
>(function TournamentAdminPage(): React.ReactElement {
  const createPermission = usePermission(PERMISSIONS.tournament_create);
  const canCreate =
    !createPermission.isLoading && createPermission.hasPermission;

  const listRef = useRef<TournamentAdminListHandle | null>(null);

  const handleNewTournament = useCallback(() => {
    listRef.current?.requestCreate();
  }, []);

  return (
    <div className={PAGE_CONTAINER_CLASS}>
      <AdminPageHeader
        title="Tournament Management"
        description="Create, edit, and delete tournaments. Filter by status or search by title."
        actionLabel={canCreate ? "New tournament" : undefined}
        actionIcon={canCreate ? Plus : undefined}
        onAction={canCreate ? handleNewTournament : undefined}
      />
      <TournamentAdminList ref={listRef} canCreate={canCreate} />
    </div>
  );
});
