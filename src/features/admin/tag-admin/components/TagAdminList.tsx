"use client";

import { useCallback, useMemo, useState } from "react";

import { useRouter, useSearchParams } from "next/navigation";

import { PencilIcon, RotateCcwIcon, Search, Trash2Icon, X } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { usePermission } from "@/features/admin/hooks";

import type { DeletedTagListItem, TagListItem } from "../tag-types";
import { useTagAdminList } from "../hooks/useTagAdminList";
import { TagAdminEmptyState } from "./TagAdminEmptyState";
import { TagAdminErrorState } from "./TagAdminErrorState";
import { TagAdminSkeleton } from "./TagAdminSkeleton";
import { TagEditDialog } from "./TagEditDialog";
import { TagDeleteConfirmDialog } from "./TagDeleteConfirmDialog";
import { TagRestoreDialog } from "./TagRestoreDialog";
import type { TagDto } from "../tag-types";

export interface TagAdminListProps {
  onAddTag?: () => void;
}

type ActiveTagListItem = TagListItem;
type SoftDeletedTagListItem = DeletedTagListItem;

const TAB_ACTIVE = "active";
const TAB_DELETED = "deleted";
const DEFAULT_TAB = TAB_ACTIVE;

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function formatDateTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function ActiveTagCard({
  tag,
  onEdit,
  onDelete,
}: {
  tag: ActiveTagListItem;
  onEdit: (tag: TagListItem) => void;
  onDelete: (tag: TagListItem) => void;
}) {
  const canUpdate = usePermission("tag_update").hasPermission;
  const canDelete = usePermission("tag_delete").hasPermission;

  return (
    <div className="flex flex-col justify-between h-full min-h-[110px] rounded-xl border border-border/80 bg-card p-4 shadow-2xs transition-all duration-150 hover:-translate-y-0.5 hover:shadow-xs hover:border-primary/40">
      <div className="flex items-center justify-between gap-2">
        <span
          className="font-semibold text-sm text-foreground truncate"
          title={tag.name}
        >
          {tag.name}
        </span>
        <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded font-mono shrink-0">
          {tag.slug}
        </span>
      </div>

      <div className="flex items-center justify-between gap-2 pt-3 mt-3 border-t border-border/40">
        <span className="text-xs text-muted-foreground font-mono">
          {formatDate(tag.createdAt)}
        </span>
        <div className="flex items-center gap-1.5">
          {canUpdate && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
              onClick={() => onEdit(tag)}
              aria-label={`Edit ${tag.name}`}
            >
              <PencilIcon className="h-4 w-4" />
            </Button>
          )}
          {canDelete && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
              onClick={() => onDelete(tag)}
              aria-label={`Delete ${tag.name}`}
            >
              <Trash2Icon className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function SoftDeletedTagCard({
  tag,
  onRestore,
}: {
  tag: SoftDeletedTagListItem;
  onRestore: (tag: DeletedTagListItem) => void;
}) {
  const canRestore = usePermission("tag_restore").hasPermission;

  return (
    <div className="flex flex-col justify-between h-full min-h-[110px] rounded-xl border border-border/80 bg-card p-4 shadow-2xs transition-all duration-150 hover:-translate-y-0.5 hover:shadow-xs hover:border-primary/40">
      <div className="flex items-center justify-between gap-2">
        <span
          className="font-semibold text-sm text-foreground truncate"
          title={tag.name}
        >
          {tag.name}
        </span>
        <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded font-mono shrink-0">
          {tag.slug}
        </span>
      </div>

      <div className="flex items-center justify-between gap-2 pt-3 mt-3 border-t border-border/40">
        <div className="text-xs text-muted-foreground space-y-0.5 font-mono">
          <div>Deleted {formatDateTime(tag.deletedAt)}</div>
          <div>Created {formatDate(tag.createdAt)}</div>
        </div>
        {canRestore && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-3 gap-1.5 text-xs rounded-lg transition-all hover:bg-primary/10 hover:text-primary hover:border-primary/40"
            onClick={() => onRestore(tag)}
            aria-label={`Restore ${tag.name}`}
          >
            <RotateCcwIcon className="h-3.5 w-3.5" />
            Restore
          </Button>
        )}
      </div>
    </div>
  );
}

export function TagAdminList({ onAddTag }: TagAdminListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentTab =
    (searchParams.get("tab") as typeof TAB_ACTIVE | typeof TAB_DELETED) ??
    DEFAULT_TAB;
  const isDeletedTab = currentTab === TAB_DELETED;

  const { active, softDeleted, isLoading, isValidating, error, mutate } =
    useTagAdminList();

  const [searchQuery, setSearchQuery] = useState("");
  const [editTarget, setEditTarget] = useState<TagListItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TagListItem | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<DeletedTagListItem | null>(
    null,
  );

  const filteredActive = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return active;
    return active.filter(
      (tag) =>
        tag.name.toLowerCase().includes(q) ||
        tag.slug.toLowerCase().includes(q),
    );
  }, [active, searchQuery]);

  const filteredSoftDeleted = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return softDeleted;
    return softDeleted.filter(
      (tag) =>
        tag.name.toLowerCase().includes(q) ||
        tag.slug.toLowerCase().includes(q),
    );
  }, [softDeleted, searchQuery]);

  const handleTabChange = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", value);
      router.push(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const handleEditOpenChange = useCallback((open: boolean) => {
    if (!open) setEditTarget(null);
  }, []);

  const handleDeleteOpenChange = useCallback((open: boolean) => {
    if (!open) setDeleteTarget(null);
  }, []);

  const handleRestoreOpenChange = useCallback((open: boolean) => {
    if (!open) setRestoreTarget(null);
  }, []);

  const handleEditUpdated = useCallback(
    (_tag: TagDto) => {
      setEditTarget(null);
      mutate();
    },
    [mutate],
  );

  const handleDeleteDeleted = useCallback(
    (_id: string) => {
      setDeleteTarget(null);
      mutate();
    },
    [mutate],
  );

  const handleRestoreRestored = useCallback(
    (_tag: TagDto) => {
      setRestoreTarget(null);
      mutate();
    },
    [mutate],
  );

  const isInitialLoading =
    isLoading &&
    !isValidating &&
    active.length === 0 &&
    softDeleted.length === 0;

  const renderActiveTabContent = useMemo(() => {
    if (isInitialLoading) return <TagAdminSkeleton tab="active" />;
    if (error) return <TagAdminErrorState error={error} onRetry={mutate} />;
    if (active.length === 0) {
      return <TagAdminEmptyState tab="active" onCreate={onAddTag} />;
    }
    if (filteredActive.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-card/50 py-12 px-6 text-center">
          <p className="text-sm font-semibold text-foreground">
            No tags matching &ldquo;{searchQuery}&rdquo;
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Try adjusting your search terms or clearing the filter.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4 text-xs h-8 px-3"
            onClick={() => setSearchQuery("")}
          >
            Clear search
          </Button>
        </div>
      );
    }
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredActive.map((tag) => (
          <ActiveTagCard
            key={tag.tagId}
            tag={tag}
            onEdit={setEditTarget}
            onDelete={setDeleteTarget}
          />
        ))}
      </div>
    );
  }, [
    isInitialLoading,
    error,
    active,
    filteredActive,
    searchQuery,
    mutate,
    onAddTag,
  ]);

  const renderDeletedTabContent = useMemo(() => {
    if (isInitialLoading) return <TagAdminSkeleton tab="deleted" />;
    if (error) return <TagAdminErrorState error={error} onRetry={mutate} />;
    if (softDeleted.length === 0) {
      return <TagAdminEmptyState tab="deleted" />;
    }
    if (filteredSoftDeleted.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-card/50 py-12 px-6 text-center">
          <p className="text-sm font-semibold text-foreground">
            No soft-deleted tags matching &ldquo;{searchQuery}&rdquo;
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Try adjusting your search terms or clearing the filter.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4 text-xs h-8 px-3"
            onClick={() => setSearchQuery("")}
          >
            Clear search
          </Button>
        </div>
      );
    }
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredSoftDeleted.map((tag) => (
          <SoftDeletedTagCard
            key={tag.tagId}
            tag={tag}
            onRestore={setRestoreTarget}
          />
        ))}
      </div>
    );
  }, [
    isInitialLoading,
    error,
    softDeleted,
    filteredSoftDeleted,
    searchQuery,
    mutate,
  ]);

  return (
    <>
      <Tabs value={currentTab} onValueChange={handleTabChange}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
          <TabsList>
            <TabsTrigger value={TAB_ACTIVE}>
              Active
              {!isDeletedTab && active.length > 0 && (
                <span className="ml-2 inline-flex items-center rounded-full bg-muted px-2 py-0.5 font-mono text-xs font-medium text-muted-foreground">
                  {active.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value={TAB_DELETED}>
              Soft-deleted
              {isDeletedTab && softDeleted.length > 0 && (
                <span className="ml-2 inline-flex items-center rounded-full bg-muted px-2 py-0.5 font-mono text-xs font-medium text-muted-foreground">
                  {softDeleted.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Search filter input */}
          <div className="relative w-full sm:w-64">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
              aria-hidden="true"
            />
            <Input
              type="text"
              placeholder="Search tags…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 pl-9 pr-8 text-xs"
              aria-label="Search tags by name or slug"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search query"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        <TabsContent value={TAB_ACTIVE}>{renderActiveTabContent}</TabsContent>
        <TabsContent value={TAB_DELETED}>{renderDeletedTabContent}</TabsContent>
      </Tabs>

      {/* Edit dialog */}
      <TagEditDialog
        open={editTarget !== null}
        onOpenChange={handleEditOpenChange}
        tag={editTarget}
        onUpdated={handleEditUpdated}
      />

      {/* Delete dialog */}
      <TagDeleteConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={handleDeleteOpenChange}
        tag={deleteTarget}
        onDeleted={handleDeleteDeleted}
      />

      {/* Restore dialog */}
      <TagRestoreDialog
        open={restoreTarget !== null}
        onOpenChange={handleRestoreOpenChange}
        tag={restoreTarget}
        onRestored={handleRestoreRestored}
      />
    </>
  );
}
