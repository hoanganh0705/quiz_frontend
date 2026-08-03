'use client';

/**
 * `CollectionRemoveConfirm` — typed-confirm dialog for bulk removing quizzes from a collection.
 *
 * Source epic:   Epic 4.7 — Collection detail + bulk add/remove + analytics.
 * Source ticket: EPIC-4.7-B3-4.
 *
 * ## What this component owns
 *
 *   - Confirmation dialog with destructive styling.
 *   - Lists selected quiz titles (first 5 + "and X more").
 *   - Requires typed confirmation (user must type collection name).
 *   - Confirm button shows loading state during deletion.
 *   - Idempotent: re-submitting same IDs is safe.
 */

import { useState, useCallback } from 'react';
import { ConfirmDialog } from '@/components/primitives';

interface CollectionRemoveConfirmProps {
  /** Whether the dialog is open. */
  open: boolean;
  /** The collection name (used for typed confirmation). */
  collectionName: string;
  /** Array of quiz IDs being removed. */
  quizIds: string[];
  /** Labels for the quiz IDs (quizId -> title). */
  quizLabels?: Record<string, string>;
  /** Callback when removal is confirmed. */
  onConfirm: () => Promise<void>;
  /** Callback when dialog should close. */
  onClose: () => void;
  /** Whether the removal is in progress. */
  isRemoving?: boolean;
}

/**
 * CollectionRemoveConfirm component.
 *
 * Features:
 * - Destructive-styled confirm dialog
 * - Lists selected quiz titles (first 5 + "and X more")
 * - Typed confirmation requiring collection name
 * - Loading state during deletion
 * - Idempotent (safe to re-submit)
 */
export default function CollectionRemoveConfirm({
  open,
  collectionName,
  quizIds,
  quizLabels = {},
  onConfirm,
  onClose,
  isRemoving = false,
}: CollectionRemoveConfirmProps) {
  const [isRemovingLocal, setIsRemovingLocal] = useState(false);

  const handleConfirm = useCallback(async () => {
    setIsRemovingLocal(true);
    try {
      await onConfirm();
    } finally {
      setIsRemovingLocal(false);
    }
  }, [onConfirm]);

  // Build entity label with quiz count
  const MAX_PREVIEW = 5;
  const visibleLabels = quizIds.slice(0, MAX_PREVIEW).map((id) => quizLabels[id] || `Quiz ${id.slice(0, 8)}...`);
  const hiddenCount = quizIds.length - MAX_PREVIEW;

  let entityLabel: string;
  if (visibleLabels.length === 0) {
    entityLabel = `${quizIds.length} quizzes`;
  } else if (hiddenCount > 0) {
    entityLabel = `"${collectionName}" (${quizIds.length} quizzes: ${visibleLabels.join(', ')} and ${hiddenCount} more)`;
  } else {
    entityLabel = `"${collectionName}" (${visibleLabels.join(', ')})`;
  }

  const isRemovingFinal = isRemoving || isRemovingLocal;

  return (
    <ConfirmDialog
      open={open}
      kind='destructive-idempotent'
      entityLabel={entityLabel}
      typedOverride={collectionName}
      onConfirm={handleConfirm}
      onCancel={onClose}
      loading={isRemovingFinal}
      confirmLabel='Remove'
    />
  );
}
