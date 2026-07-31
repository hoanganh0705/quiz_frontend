"use client";

import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { Plus, AlertCircle, CheckCircle } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { AdminPageHeader } from "../_components";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import type { Tag } from "@/features/tags/types";
import {
  getTags,
  createTag,
  updateTag,
  deleteTag,
} from "@/features/tags/api/tags-admin";

interface TagFormData {
  name: string;
  slug: string;
}

const initialFormData: TagFormData = {
  name: "",
  slug: "",
};

export default function AdminTagsPage() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchValue] = useState("");

  // Dialog states
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedTag, setSelectedTag] = useState<Tag | null>(null);
  const [formData, setFormData] = useState<TagFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchTags = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getTags({ limit: 100 });
      setTags(data.items);
    } catch {
      setError("Failed to load tags");
      showToast("Failed to load tags", "error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  const handleOpenCreate = () => {
    setFormData(initialFormData);
    setCreateOpen(true);
  };

  const handleOpenEdit = (tag: Tag) => {
    setSelectedTag(tag);
    setFormData({ name: tag.name, slug: tag.slug });
    setEditOpen(true);
  };

  const handleOpenDelete = (tag: Tag) => {
    setSelectedTag(tag);
    setDeleteOpen(true);
  };

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      showToast("Tag name is required", "error");
      return;
    }
    try {
      setIsSubmitting(true);
      await createTag({
        name: formData.name,
        slug: formData.slug || undefined,
      });
      setCreateOpen(false);
      showToast("Tag created successfully", "success");
      fetchTags();
    } catch {
      showToast("Failed to create tag", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedTag || !formData.name.trim()) {
      showToast("Tag name is required", "error");
      return;
    }
    try {
      setIsSubmitting(true);
      await updateTag(selectedTag.tagId, {
        name: formData.name,
        slug: formData.slug || undefined,
      });
      setEditOpen(false);
      showToast("Tag updated successfully", "success");
      fetchTags();
    } catch {
      showToast("Failed to update tag", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedTag) return;
    try {
      setIsSubmitting(true);
      await deleteTag(selectedTag.tagId);
      setDeleteOpen(false);
      showToast("Tag deleted successfully", "success");
      fetchTags();
    } catch {
      showToast("Failed to delete tag", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredTags = tags.filter((tag) => {
    const query = searchValue.toLowerCase();
    return (
      tag.name.toLowerCase().includes(query) ||
      tag.slug.toLowerCase().includes(query)
    );
  });

  return (
    <div className="px-4 sm:px-6 pb-8">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-20 right-4 z-100 flex items-center gap-2 px-4 py-3 rounded-lg border shadow-lg text-sm font-medium ${
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
        title="Tags"
        description="Organize and manage quiz tags for better discoverability."
        actionLabel="Add Tag"
        actionIcon={Plus}
        onAction={handleOpenCreate}
      />

      {/* Search */}
      <div className="mb-4">
        <div className="relative max-w-sm">
          <span className="text-sm text-muted-foreground">
            {filteredTags.length} of {tags.length} tags
          </span>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="rounded-lg border border-border p-4 animate-pulse"
            >
              <div className="h-6 w-24 bg-muted rounded mb-3" />
              <div className="h-4 w-16 bg-muted rounded" />
            </div>
          ))}
        </div>
      ) : filteredTags.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="p-4 rounded-full bg-muted mb-4">
            <span className="text-2xl">🏷️</span>
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">
            No tags found
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {searchValue
              ? "Try adjusting your search."
              : "Create your first tag to get started."}
          </p>
          {!searchValue && (
            <Button onClick={handleOpenCreate} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Tag
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredTags.map((tag) => (
            <div
              key={tag.tagId}
              className="rounded-lg border border-border p-4 hover:border-brand/50 transition-colors group"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted text-sm font-medium text-foreground">
                      #{tag.name}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    /{tag.slug}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Created {new Date(tag.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleOpenEdit(tag)}
                  className="flex-1 px-2 py-1.5 text-xs font-medium rounded-md border border-border hover:bg-muted transition-colors text-foreground"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleOpenDelete(tag)}
                  className="flex-1 px-2 py-1.5 text-xs font-medium rounded-md border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Tag</DialogTitle>
            <DialogDescription>
              Create a new tag to label and organize quizzes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="create-name">Name *</Label>
              <Input
                id="create-name"
                placeholder="e.g. beginner-friendly"
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
                placeholder="e.g. beginner-friendly"
                value={formData.slug}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, slug: e.target.value }))
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
              {isSubmitting ? "Creating..." : "Create Tag"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Tag</DialogTitle>
            <DialogDescription>
              Update the details for &quot;{selectedTag?.name}&quot;.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name *</Label>
              <Input
                id="edit-name"
                placeholder="Tag name"
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
                placeholder="tag-slug"
                value={formData.slug}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, slug: e.target.value }))
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
            <DialogTitle>Delete Tag</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{selectedTag?.name}&quot;?
              This action cannot be undone.
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
              {isSubmitting ? "Deleting..." : "Delete Tag"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
