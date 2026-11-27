"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { useToast } from "@/lib/forms/useToast";

import {
  CollectionAddQuizzesDialog,
  CollectionAnalyticsPanel,
  CollectionHeader,
  CollectionQuizGrid,
  CollectionRemoveConfirm,
} from "@/features/bookmarks/components";
import {
  useAddQuizzesToCollection,
  useCollection,
  useCollectionAnalytics,
  useCollectionInvalidation,
  useCollectionQuizzes,
  useRemoveQuizzesFromCollection,
} from "@/features/bookmarks/hooks";

import { PAGE_CONTAINER_CLASS } from "@/shared/layout/constants";

import type { BulkOperationResult } from "@/features/bookmarks/types";

export interface CollectionDetailPageProps {
  collectionId: string;
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function CollectionNotFound() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <h1 className="text-2xl font-bold mb-2">Collection not found</h1>
      <p className="text-muted-foreground mb-4">
        This collection may have been deleted or you don&apos;t have access to
        it.
      </p>
      <button
        type="button"
        onClick={() => router.push("/bookmarks")}
        className="text-primary hover:underline"
      >
        Back to collections
      </button>
    </div>
  );
}

export function CollectionDetailPage({
  collectionId: id,
}: CollectionDetailPageProps) {
  const router = useRouter();
  const { push } = useToast();

  const isValidId = useMemo(() => UUID_REGEX.test(id), [id]);
  const validCollectionId = isValidId ? id : null;

  useEffect(() => {
    if (!isValidId) {
      router.replace("/bookmarks");
    }
  }, [isValidId, router]);

  const {
    collection,
    isLoading: isCollectionLoading,
    error: collectionError,
  } = useCollection(validCollectionId);
  const {
    quizzes,
    isLoading: isQuizzesLoading,
    hasMore,
    loadMore,
  } = useCollectionQuizzes(validCollectionId);
  const {
    analytics,
    isLoading: isAnalyticsLoading,
    isEmpty: isAnalyticsEmpty,
    mutate: refreshAnalytics,
  } = useCollectionAnalytics(validCollectionId);

  const { addQuizzes, isLoading: isAdding } = useAddQuizzesToCollection(
    validCollectionId ?? "",
  );
  const { removeQuizzes, isRemoving } = useRemoveQuizzesFromCollection(
    validCollectionId ?? "",
  );

  const { invalidateQuizzes, invalidateAnalytics } = useCollectionInvalidation(
    validCollectionId ?? "",
  );

  const [selectedQuizIds, setSelectedQuizIds] = useState<Set<string>>(
    new Set(),
  );

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);

  const isNotFound =
    isValidId && !isCollectionLoading && !collection && !collectionError;

  const handleAddSuccess = useCallback(
    (_quizIds: string[], addedCount: number) => {
      push({
        title: "Quizzes added",
        body: `Added ${addedCount} ${addedCount === 1 ? "quiz" : "quizzes"} to collection`,
        durationMs: 5000,
      });
      setShowAddDialog(false);

      invalidateQuizzes();
      invalidateAnalytics();
    },
    [invalidateQuizzes, invalidateAnalytics, push],
  );

  const handleAddQuizzes = useCallback(
    async (quizIds: string[]): Promise<{ results: BulkOperationResult[] }> => {
      if (!validCollectionId) {
        throw new Error("Invalid collection ID");
      }
      const result = await addQuizzes(quizIds);
      if (result.status === "success") {
        return { results: result.results ?? [] };
      }
      throw new Error("Failed to add quizzes");
    },
    [addQuizzes, validCollectionId],
  );

  const handleRemoveConfirm = useCallback(async () => {
    if (!validCollectionId) return;
    const quizIds = Array.from(selectedQuizIds);
    const result = await removeQuizzes(quizIds);
    if (result.status !== "success") {
      return;
    }
    setSelectedQuizIds(new Set());
    setShowRemoveConfirm(false);
    push({
      title: "Quizzes removed",
      body: `Removed ${quizIds.length} ${quizIds.length === 1 ? "quiz" : "quizzes"} from collection`,
      durationMs: 5000,
    });
    invalidateQuizzes();
    invalidateAnalytics();
  }, [
    validCollectionId,
    selectedQuizIds,
    removeQuizzes,
    invalidateQuizzes,
    invalidateAnalytics,
    push,
  ]);

  const handleSelectionChange = useCallback((ids: Set<string>) => {
    setSelectedQuizIds(ids);
  }, []);

  const quizLabels = useMemo(() => {
    const labels: Record<string, string> = {};
    quizzes.forEach((q) => {
      labels[q.quizId] = q.quizTitle;
    });
    return labels;
  }, [quizzes]);

  if (!isValidId) {
    return null;
  }

  if (isNotFound) {
    return (
      <div className={PAGE_CONTAINER_CLASS}>
        <CollectionNotFound />
      </div>
    );
  }

  return (
    <div className={`${PAGE_CONTAINER_CLASS} space-y-8`}>
      {/* Header */}
      <CollectionHeader
        collection={collection}
        isLoading={isCollectionLoading}
        onAddQuizzes={() => setShowAddDialog(true)}
      />

      {/* Quiz Grid */}
      <CollectionQuizGrid
        quizzes={quizzes}
        selectedQuizIds={selectedQuizIds}
        onSelectionChange={handleSelectionChange}
        hasMore={hasMore}
        isLoading={isQuizzesLoading}
        onLoadMore={loadMore}
        onRemoveSelected={() => setShowRemoveConfirm(true)}
        removeLabel={`Remove selected (${selectedQuizIds.size})`}
        onAddQuizzes={() => setShowAddDialog(true)}
      />

      {/* Analytics Panel */}
      <CollectionAnalyticsPanel
        analytics={analytics}
        isLoading={isAnalyticsLoading}
        isEmpty={isAnalyticsEmpty}
        onRefresh={refreshAnalytics}
      />

      {/* Add Quizzes Dialog */}
      <CollectionAddQuizzesDialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        onSuccess={handleAddSuccess}
        onAddQuizzes={handleAddQuizzes}
        isAdding={isAdding}
      />

      {/* Remove Confirm Dialog */}
      {collection && (
        <CollectionRemoveConfirm
          open={showRemoveConfirm}
          collectionName={collection.name}
          quizIds={Array.from(selectedQuizIds)}
          quizLabels={quizLabels}
          onConfirm={handleRemoveConfirm}
          onClose={() => setShowRemoveConfirm(false)}
          isRemoving={isRemoving}
        />
      )}
    </div>
  );
}
