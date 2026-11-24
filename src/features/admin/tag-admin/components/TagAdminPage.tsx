"use client";

import { useCallback, useEffect, useState } from "react";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { usePermission } from "@/features/admin/hooks";
import { useToast, DEFAULT_TOAST_DURATION_MS } from "@/lib/forms/useToast";
import { getQueryClient } from "@/providers/QueryProvider";
import { addTagAdminBreadcrumb } from "@/lib/admin/admin_live_sentry";

import { TagAdminList } from "./TagAdminList";
import { TagCreateDialog } from "./TagCreateDialog";
import type { TagDto } from "../tag-types";
import { TAG_ADMIN_LIST_KEY } from "../hooks/useTagAdminList";
import { invalidatePublicTagCaches } from "../cache/tag-cache-keys";
import { subscribeTagAdminInvalidate } from "../cache/tag-cross-tab";

const PERMISSION_CREATE = "tag_create";

export interface TagAdminPageProps {
  onAddTag?: never;
}

export function TagAdminPage(_props: TagAdminPageProps) {
  const { hasPermission } = usePermission(PERMISSION_CREATE);
  const { push } = useToast();

  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    addTagAdminBreadcrumb({
      action: "tag.admin.mount",
      route: "tag-admin.page",
      status: "started",
      durationMs: 0,
    });
  }, []);

  const handleCreated = useCallback(
    (tag: TagDto) => {
      push({
        title: "Tag created",
        body: `"${tag.name}" has been created successfully.`,
        durationMs: DEFAULT_TOAST_DURATION_MS,
      });
    },
    [push],
  );

  useEffect(() => {
    const unsubscribe = subscribeTagAdminInvalidate(() => {
      try {
        const qc = getQueryClient();
        void qc.invalidateQueries({ queryKey: [TAG_ADMIN_LIST_KEY] });
      } catch {}
      void invalidatePublicTagCaches();
    });
    return unsubscribe;
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 pb-8 space-y-6 pt-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Tags
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Organize and manage quiz tags for better discoverability.
          </p>
        </div>
        {hasPermission && (
          <Button
            onClick={() => setCreateOpen(true)}
            className="gap-2 shrink-0 self-start sm:self-auto shadow-xs transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
          >
            <Plus className="h-4 w-4" />
            <span>Add Tag</span>
          </Button>
        )}
      </div>

      <TagAdminList
        onAddTag={hasPermission ? () => setCreateOpen(true) : undefined}
      />

      <TagCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={handleCreated}
      />
    </div>
  );
}
