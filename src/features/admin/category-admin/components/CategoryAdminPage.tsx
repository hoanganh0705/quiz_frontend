"use client";

import { useCallback, useEffect, useState } from "react";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { usePermission } from "@/features/admin/hooks";
import { useToast, DEFAULT_TOAST_DURATION_MS } from "@/lib/forms/useToast";
import { getQueryClient } from "@/providers/QueryProvider";
import { addCategoryAdminBreadcrumb } from "@/lib/admin/admin_live_sentry";

import { CategoryAdminList } from "./CategoryAdminList";
import { CategoryCreateDialog } from "./CategoryCreateDialog";
import type { CategoryDto } from "../category-types";
import { CATEGORY_ADMIN_LIST_KEY } from "../hooks/useCategoryAdminList";
import { publicCategoriesKeyMatcher } from "../cache/category-cache-keys";
import { subscribeCategoryAdminInvalidate } from "../cache/category-cross-tab";

const PERMISSION_CREATE = "category_create";

export interface CategoryAdminPageProps {
  onAddCategory?: never;
}

export function CategoryAdminPage(_props: CategoryAdminPageProps) {
  const { hasPermission } = usePermission(PERMISSION_CREATE);
  const { push } = useToast();

  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    addCategoryAdminBreadcrumb({
      action: "category.admin.mount",
      route: "category-admin.page",
      status: "started",
      durationMs: 0,
    });
  }, []);

  const handleCreated = useCallback(
    (category: CategoryDto) => {
      push({
        title: "Category created",
        body: `"${category.name}" has been created successfully.`,
        durationMs: DEFAULT_TOAST_DURATION_MS,
      });
    },
    [push],
  );

  useEffect(() => {
    const unsubscribe = subscribeCategoryAdminInvalidate(() => {
      try {
        const qc = getQueryClient();
        void qc.invalidateQueries({ queryKey: [CATEGORY_ADMIN_LIST_KEY] });
        void qc.invalidateQueries({
          predicate: (query) => publicCategoriesKeyMatcher(query.queryKey),
        });
      } catch {}
    });
    return unsubscribe;
  }, []);

  return (
    <div className="min-h-screen w-full text-foreground p-4 md:p-8 lg:p-12 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Categories
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Organize and manage quiz categories for better discoverability.
          </p>
        </div>
        {hasPermission && (
          <Button
            onClick={() => setCreateOpen(true)}
            className="gap-2 shrink-0 self-start sm:self-auto shadow-xs transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0"
          >
            <Plus className="h-4 w-4" />
            Add Category
          </Button>
        )}
      </div>

      <CategoryAdminList onAddCategory={() => setCreateOpen(true)} />

      <CategoryCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={handleCreated}
      />
    </div>
  );
}
