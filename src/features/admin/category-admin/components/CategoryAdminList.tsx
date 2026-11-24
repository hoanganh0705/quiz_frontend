"use client";

import { useCallback, useMemo, useState } from "react";

import { useRouter, useSearchParams } from "next/navigation";

import { PencilIcon, RotateCcwIcon, Search, Trash2Icon, X } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { usePermission } from "@/features/admin/hooks";

import type {
  CategoryListItem,
  DeletedCategoryListItem,
} from "../category-types";
import { useCategoryAdminList } from "../hooks/useCategoryAdminList";
import { CategoryAdminEmptyState } from "./CategoryAdminEmptyState";
import { CategoryAdminErrorState } from "./CategoryAdminErrorState";
import { CategoryAdminSkeleton } from "./CategoryAdminSkeleton";
import { CategoryEditDialog } from "./CategoryEditDialog";
import { CategoryDeleteConfirmDialog } from "./CategoryDeleteConfirmDialog";
import { CategoryRestoreDialog } from "./CategoryRestoreDialog";
import type { CategoryDto } from "../category-types";

export interface CategoryAdminListProps {
  onAddCategory?: () => void;
}

type ActiveCategoryListItem = CategoryListItem;
type SoftDeletedCategoryListItem = DeletedCategoryListItem;

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

function truncate(text: string | null | undefined, max = 80): string {
  if (!text) return "";
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

function ActiveCategoryCard({
  category,
  onEdit,
  onDelete,
}: {
  category: ActiveCategoryListItem;
  onEdit: (category: CategoryListItem) => void;
  onDelete: (category: CategoryListItem) => void;
}) {
  const canUpdate = usePermission("category_update").hasPermission;
  const canDelete = usePermission("category_delete").hasPermission;

  return (
    <div className="flex flex-col justify-between h-full min-h-[148px] rounded-xl border border-border/80 bg-card p-4 shadow-2xs transition-all duration-150 hover:-translate-y-0.5 hover:shadow-xs hover:border-primary/40">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span
            className="font-semibold text-sm text-foreground truncate"
            title={category.name}
          >
            {category.name}
          </span>
          <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded font-mono shrink-0">
            {category.slug}
          </span>
        </div>
        {category.description ? (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {truncate(category.description, 100)}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground/50 italic">
            No description provided.
          </p>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 pt-3 mt-3 border-t border-border/40">
        <span className="text-xs text-muted-foreground font-mono">
          {formatDate(category.createdAt)}
        </span>
        <div className="flex items-center gap-1.5">
          {canUpdate && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
              onClick={() => onEdit(category)}
              aria-label={`Edit ${category.name}`}
            >
              <PencilIcon className="h-4 w-4" />
            </Button>
          )}
          {canDelete && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
              onClick={() => onDelete(category)}
              aria-label={`Delete ${category.name}`}
            >
              <Trash2Icon className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function SoftDeletedCategoryCard({
  category,
  onRestore,
}: {
  category: SoftDeletedCategoryListItem;
  onRestore: (category: DeletedCategoryListItem) => void;
}) {
  const canRestore = usePermission("category_restore").hasPermission;

  return (
    <div className="flex flex-col justify-between h-full min-h-[148px] rounded-xl border border-border/80 bg-card p-4 shadow-2xs transition-all duration-150 hover:-translate-y-0.5 hover:shadow-xs hover:border-primary/40">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span
            className="font-semibold text-sm text-foreground truncate"
            title={category.name}
          >
            {category.name}
          </span>
          <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded font-mono shrink-0">
            {category.slug}
          </span>
        </div>
        {category.description ? (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {truncate(category.description, 100)}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground/50 italic">
            No description provided.
          </p>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 pt-3 mt-3 border-t border-border/40">
        <div className="text-xs text-muted-foreground space-y-0.5 font-mono">
          <div>Deleted {formatDateTime(category.deletedAt)}</div>
          <div>Created {formatDate(category.createdAt)}</div>
        </div>
        {canRestore && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-3 gap-1.5 text-xs shrink-0"
            onClick={() => onRestore(category)}
            aria-label={`Restore ${category.name}`}
          >
            <RotateCcwIcon className="h-3.5 w-3.5" />
            Restore
          </Button>
        )}
      </div>
    </div>
  );
}

export function CategoryAdminList({ onAddCategory }: CategoryAdminListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentTab =
    (searchParams.get("tab") as "active" | "deleted") ?? DEFAULT_TAB;
  const isDeletedTab = currentTab === TAB_DELETED;

  const { active, softDeleted, isLoading, isValidating, error, mutate } =
    useCategoryAdminList();

  const [searchQuery, setSearchQuery] = useState("");
  const [editTarget, setEditTarget] = useState<CategoryListItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CategoryListItem | null>(
    null,
  );
  const [restoreTarget, setRestoreTarget] =
    useState<DeletedCategoryListItem | null>(null);

  const filteredActive = useMemo(() => {
    if (!searchQuery.trim()) return active;
    const q = searchQuery.toLowerCase().trim();
    return active.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q) ||
        (c.description && c.description.toLowerCase().includes(q)),
    );
  }, [active, searchQuery]);

  const filteredSoftDeleted = useMemo(() => {
    if (!searchQuery.trim()) return softDeleted;
    const q = searchQuery.toLowerCase().trim();
    return softDeleted.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q) ||
        (c.description && c.description.toLowerCase().includes(q)),
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
    (_category: CategoryDto) => {
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
    (_category: CategoryDto) => {
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
    if (isInitialLoading) return <CategoryAdminSkeleton tab="active" />;
    if (error)
      return <CategoryAdminErrorState error={error} onRetry={mutate} />;
    if (active.length === 0) {
      return <CategoryAdminEmptyState tab="active" onCreate={onAddCategory} />;
    }
    if (filteredActive.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-card/50 py-12 px-6 text-center">
          <p className="text-sm font-semibold text-foreground">
            No categories matching &ldquo;{searchQuery}&rdquo;
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
        {filteredActive.map((category) => (
          <ActiveCategoryCard
            key={category.categoryId}
            category={category}
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
    onAddCategory,
  ]);

  const renderDeletedTabContent = useMemo(() => {
    if (isInitialLoading) return <CategoryAdminSkeleton tab="deleted" />;
    if (error)
      return <CategoryAdminErrorState error={error} onRetry={mutate} />;
    if (softDeleted.length === 0) {
      return <CategoryAdminEmptyState tab="deleted" />;
    }
    if (filteredSoftDeleted.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-card/50 py-12 px-6 text-center">
          <p className="text-sm font-semibold text-foreground">
            No soft-deleted categories matching &ldquo;{searchQuery}&rdquo;
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
        {filteredSoftDeleted.map((category) => (
          <SoftDeletedCategoryCard
            key={category.categoryId}
            category={category}
            onRestore={setRestoreTarget}
          />
        ))}
      </div>
    );
  }, [isInitialLoading, error, softDeleted, filteredSoftDeleted, searchQuery, mutate]);

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
              placeholder="Search categories…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 pl-9 pr-8 text-xs"
              aria-label="Search categories by name or slug"
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
      <CategoryEditDialog
        open={editTarget !== null}
        onOpenChange={handleEditOpenChange}
        category={editTarget}
        onUpdated={handleEditUpdated}
      />

      {/* Delete dialog */}
      <CategoryDeleteConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={handleDeleteOpenChange}
        category={deleteTarget}
        onDeleted={handleDeleteDeleted}
      />

      {/* Restore dialog */}
      <CategoryRestoreDialog
        open={restoreTarget !== null}
        onOpenChange={handleRestoreOpenChange}
        category={restoreTarget}
        onRestored={handleRestoreRestored}
      />
    </>
  );
}
