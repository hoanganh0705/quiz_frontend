"use client";

import { useState, useMemo, useCallback } from "react";
import { useBookmarks } from "@/features/bookmarks/hooks";
import type {
  BookmarkFilter,
  BookmarkSortOption,
} from "@/features/bookmarks/types";
import type {
  BookmarkCollectionResponseDto,
  BookmarkedQuizResponseDto,
} from "@/lib/api/generated/schemas";

export function useBookmarksPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<BookmarkFilter>("all");
  const [sortBy, setSortBy] = useState<BookmarkSortOption>("newest");
  const [selectedCollection, setSelectedCollection] = useState<string | null>(
    null,
  );
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [activeTab, setActiveTab] = useState<"all" | "collections">("all");

  const [collectionDialogOpen, setCollectionDialogOpen] = useState(false);
  const [editingCollection, setEditingCollection] =
    useState<BookmarkCollectionResponseDto | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [collectionToDelete, setCollectionToDelete] = useState<string | null>(
    null,
  );

  const {
    removeBookmark,
    addCollection,
    updateCollection,
    deleteCollection,
    collections,
    bookmarks,
    getCollectionCounts,
  } = useBookmarks();

  // Filter and sort bookmarks
  const filteredBookmarks = useMemo(() => {
    let result: BookmarkedQuizResponseDto[] = [...bookmarks];

    // Filter by collection
    if (activeTab === "collections" && selectedCollection) {
      result = result.filter(
        (b) => b.collection?.collectionId === selectedCollection,
      );
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((b) =>
        b.quiz?.title?.toLowerCase().includes(query),
      );
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return (
            new Date(b.bookmarkedAt).getTime() -
            new Date(a.bookmarkedAt).getTime()
          );
        case "oldest":
          return (
            new Date(a.bookmarkedAt).getTime() -
            new Date(b.bookmarkedAt).getTime()
          );
        case "name-asc":
          return (a.quiz?.title ?? "").localeCompare(b.quiz?.title ?? "");
        case "name-desc":
          return (b.quiz?.title ?? "").localeCompare(a.quiz?.title ?? "");
        default:
          return 0;
      }
    });

    return result;
  }, [activeTab, selectedCollection, bookmarks, searchQuery, sortBy]);

  const totalBookmarks = bookmarks.length;

  const handleCreateCollection = useCallback(
    (name: string, description: string, color: string) => {
      addCollection(name, description, color);
    },
    [addCollection],
  );

  const handleEditCollection = useCallback(
    (name: string, description: string, color: string) => {
      if (!editingCollection) return;
      updateCollection(editingCollection.collectionId, {
        name,
        description,
        color,
      });
      setEditingCollection(null);
    },
    [editingCollection, updateCollection],
  );

  const handleDeleteCollection = useCallback(() => {
    if (!collectionToDelete) return;
    deleteCollection(collectionToDelete);
    setCollectionToDelete(null);
    setDeleteDialogOpen(false);
    setSelectedCollection((prev) =>
      prev === collectionToDelete ? null : prev,
    );
  }, [collectionToDelete, deleteCollection]);

  const openEditDialog = useCallback(
    (collection: BookmarkCollectionResponseDto) => {
      setEditingCollection(collection);
      setCollectionDialogOpen(true);
    },
    [],
  );

  const openDeleteDialog = useCallback((collectionId: string) => {
    setCollectionToDelete(collectionId);
    setDeleteDialogOpen(true);
  }, []);

  return {
    searchQuery,
    setSearchQuery,
    filter,
    setFilter,
    sortBy,
    setSortBy,
    selectedCollection,
    setSelectedCollection,
    viewMode,
    setViewMode,
    activeTab,
    setActiveTab,
    collectionDialogOpen,
    setCollectionDialogOpen,
    editingCollection,
    setEditingCollection,
    deleteDialogOpen,
    setDeleteDialogOpen,
    removeBookmark,
    collections,
    getCollectionCounts,
    totalBookmarks,
    filteredBookmarks,
    handleCreateCollection,
    handleEditCollection,
    handleDeleteCollection,
    openEditDialog,
    openDeleteDialog,
  };
}
