"use client";

import { memo } from "react";
import Link from "next/link";

import { ChevronLeft, FolderOpen, Plus } from "lucide-react";

import { getCollectionColorClasses } from "@/features/bookmarks/types";

import { Button } from "@/components/ui/Button";

import type { BookmarkCollection } from "@/features/bookmarks/types";

interface CollectionHeaderProps {
  collection: BookmarkCollection | null;

  isLoading?: boolean;

  onAddQuizzes?: () => void;
}

function CollectionHeaderSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="flex items-center gap-2 mb-2">
        <div className="h-10 w-10 rounded-xl bg-muted" />
        <div className="h-8 w-48 rounded bg-muted" />
      </div>
      <div className="h-4 w-96 max-w-full rounded bg-muted mb-2" />
      <div className="h-4 w-24 rounded bg-muted" />
    </div>
  );
}

const CollectionHeader = memo(function CollectionHeader({
  collection,
  isLoading = false,
  onAddQuizzes,
}: CollectionHeaderProps) {
  if (isLoading || !collection) {
    return (
      <div className="space-y-4">
        <Link
          href="/bookmarks"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Back to collections
        </Link>
        <CollectionHeaderSkeleton />
      </div>
    );
  }

  const colorClasses = getCollectionColorClasses(collection);

  return (
    <header className="space-y-4">
      {/* Back navigation */}
      <Link
        href="/bookmarks"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        Back to collections
      </Link>

      {/* Header content */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          {/* Color indicator */}
          <div
            className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${colorClasses.badgeBg}`}
          >
            <FolderOpen
              className={`h-6 w-6 ${colorClasses.iconText}`}
              aria-hidden="true"
            />
          </div>

          {/* Title and description */}
          <div className="space-y-1 min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground truncate">
              {collection.name}
            </h1>
            {collection.description && (
              <p className="text-sm sm:text-base text-muted-foreground line-clamp-2 max-w-2xl">
                {collection.description}
              </p>
            )}
            <p className="text-sm text-muted-foreground font-mono tabular-nums">
              {collection.quizCount === 0
                ? "No quizzes saved yet"
                : `${collection.quizCount} ${collection.quizCount === 1 ? "quiz" : "quizzes"}`}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        {onAddQuizzes && (
          <div className="flex items-center gap-2 shrink-0">
            <Button onClick={onAddQuizzes} className="gap-2">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add quizzes
            </Button>
          </div>
        )}
      </div>
    </header>
  );
});

export default CollectionHeader;
