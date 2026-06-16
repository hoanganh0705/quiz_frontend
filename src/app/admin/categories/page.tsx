"use client";

import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, AlertCircle, CheckCircle } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { AdminPageHeader } from "../_components";
import { AdminTable } from "../_components/AdminTable";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import type { Category } from "@/features/categories/types";
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "@/features/categories/api/categories-admin";

interface CategoryFormData {
  name: string;
  slug: string;
  description: string;
}

const initialFormData: CategoryFormData = {
  name: "",
  slug: "",
  description: "",
};

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState("");

  // Dialog states
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null,
  );
  const [formData, setFormData] = useState<CategoryFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchCategories = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getCategories({ limit: 100 });
      setCategories(data.items);
    } catch {
      setError("Failed to load categories");
      showToast("Failed to load categories", "error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleOpenCreate = () => {
    setFormData(initialFormData);
    setCreateOpen(true);
  };

  const handleOpenEdit = (category: Category) => {
    setSelectedCategory(category);
    setFormData({
      name: category.name,
      slug: category.slug,
      description: category.description ?? "",
    });
    setEditOpen(true);
  };

  const handleOpenDelete = (category: Category) => {
    setSelectedCategory(category);
    setDeleteOpen(true);
  };

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      showToast("Category name is required", "error");
      return;
    }
    try {
      setIsSubmitting(true);
      await createCategory({
        name: formData.name,
        slug: formData.slug || undefined,
        description: formData.description || undefined,
      });
      setCreateOpen(false);
      showToast("Category created successfully", "success");
      fetchCategories();
    } catch {
      showToast("Failed to create category", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedCategory || !formData.name.trim()) {
      showToast("Category name is required", "error");
      return;
    }
    try {
      setIsSubmitting(true);
      await updateCategory(selectedCategory.categoryId, {
        name: formData.name,
        slug: formData.slug || undefined,
        description: formData.description || undefined,
      });
      setEditOpen(false);
      showToast("Category updated successfully", "success");
      fetchCategories();
    } catch {
      showToast("Failed to update category", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedCategory) return;
    try {
      setIsSubmitting(true);
      await deleteCategory(selectedCategory.categoryId);
      setDeleteOpen(false);
      showToast("Category deleted successfully", "success");
      fetchCategories();
    } catch {
      showToast("Failed to delete category", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCategories = categories.filter((cat) => {
    const query = searchValue.toLowerCase();
    return (
      cat.name.toLowerCase().includes(query) ||
      cat.slug.toLowerCase().includes(query) ||
      (cat.description?.toLowerCase().includes(query) ?? false)
    );
  });

  const columns = [
    {
      key: "name",
      header: "Name",
      render: (item: Category) => (
        <div className="flex flex-col">
          <span className="font-medium text-foreground">{item.name}</span>
          <span className="text-xs text-muted-foreground">{item.slug}</span>
        </div>
      ),
    },
    {
      key: "description",
      header: "Description",
      render: (item: Category) => (
        <span className="text-sm text-muted-foreground max-w-xs truncate block">
          {item.description ?? "—"}
        </span>
      ),
    },
    {
      key: "createdAt",
      header: "Created",
      render: (item: Category) => (
        <span className="text-sm text-muted-foreground">
          {new Date(item.createdAt).toLocaleDateString()}
        </span>
      ),
    },
  ] as const;

  return (
    <div className="px-4 sm:px-6 pb-8">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-20 right-4 z-[100] flex items-center gap-2 px-4 py-3 rounded-lg border shadow-lg text-sm font-medium ${
            toast.type === "success"
              ? "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/30 dark:border-green-800 dark:text-green-400"
              : "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          {toast.message}
        </div>
      )}

      <AdminPageHeader
        title="Categories"
        description="Manage quiz categories across the platform."
        actionLabel="Add Category"
        actionIcon={Plus}
        onAction={handleOpenCreate}
      />

      <AdminTable
        data={filteredCategories}
        columns={columns}
        searchPlaceholder="Search categories..."
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        isLoading={isLoading}
        emptyTitle="No categories found"
        emptyDescription="Try adjusting your search or create a new category."
        actions={[
          { label: "Edit", icon: Pencil, onClick: handleOpenEdit },
          {
            label: "Delete",
            icon: Trash2,
            onClick: handleOpenDelete,
            variant: "destructive",
          },
        ]}
      />

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Category</DialogTitle>
            <DialogDescription>
              Create a new category to organize quizzes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="create-name">Name *</Label>
              <Input
                id="create-name"
                placeholder="e.g. Science & Nature"
                value={formData.name}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, name: e.target.value }))
                }
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-slug">Slug (optional)</Label>
              <Input
                id="create-slug"
                placeholder="e.g. science-nature"
                value={formData.slug}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, slug: e.target.value }))
                }
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-desc">Description</Label>
              <Input
                id="create-desc"
                placeholder="Brief description of this category"
                value={formData.description}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, description: e.target.value }))
                }
                disabled={isSubmitting}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={isSubmitting || !formData.name.trim()}
            >
              {isSubmitting ? "Creating..." : "Create Category"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>
              Update the details for &quot;{selectedCategory?.name}&quot;.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name *</Label>
              <Input
                id="edit-name"
                placeholder="Category name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, name: e.target.value }))
                }
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-slug">Slug</Label>
              <Input
                id="edit-slug"
                placeholder="category-slug"
                value={formData.slug}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, slug: e.target.value }))
                }
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-desc">Description</Label>
              <Input
                id="edit-desc"
                placeholder="Brief description"
                value={formData.description}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, description: e.target.value }))
                }
                disabled={isSubmitting}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={isSubmitting || !formData.name.trim()}
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Category</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{selectedCategory?.name}
              &quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Deleting..." : "Delete Category"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
