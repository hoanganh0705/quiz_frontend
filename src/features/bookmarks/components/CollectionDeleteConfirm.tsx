'use client'

/**
 * `CollectionDeleteConfirm` — typed-confirm dialog for hard-deleting collections.
 *
 * Source epic:   Epic 4.6 — Bookmark collections CRUD + hard-delete confirm.
 * Source ticket: T-4.6-D3.
 *
 * ## What this component owns
 *
 *   - Typed-confirm dialog requiring user to type collection name.
 *   - Shows bookmark count in the copy ("X quizzes will be removed").
 *   - Uses `<ConfirmDialog kind="destructive-permanent">`.
 *   - On confirm, triggers delete mutation.
 *   - 404 is handled silently (collection already removed from UI).
 *
 * ## Hard-delete semantic
 *
 * Bookmark collections are hard-deleted (no restore). The dialog copy is
 * explicit about permanence: "Permanently delete this collection?
 * This cannot be undone. X quizzes will be removed."
 */

import { useState, useCallback } from 'react'
import { ConfirmDialog } from '@/components/primitives'
import type { BookmarkCollection } from '@/features/bookmarks/types'

interface CollectionDeleteConfirmProps {
  /** Whether the dialog is open. */
  open: boolean
  /** The collection to delete. */
  collection: BookmarkCollection
  /** Callback when deletion is confirmed. */
  onConfirm: () => Promise<void>
  /** Callback when dialog should close. */
  onClose: () => void
  /** Whether the deletion is in progress. */
  isDeleting?: boolean
}

/**
 * Dialog for confirming permanent deletion of a bookmark collection.
 *
 * Features:
 * - Typed-confirm: user must type the collection name to enable delete
 * - Shows bookmark count in entityLabel
 * - Uses destructive-permanent ConfirmDialog kind
 * - Loading state with spinner during deletion
 *
 * @example
 * ```tsx
 * <CollectionDeleteConfirm
 *   open={showDelete}
 *   collection={collection}
 *   onConfirm={async () => {
 *     await delete.remove(collection.collectionId)
 *   }}
 *   onClose={() => setShowDelete(false)}
 *   isDeleting={delete.isPending}
 * />
 * ```
 */
export default function CollectionDeleteConfirm({
  open,
  collection,
  onConfirm,
  onClose,
  isDeleting = false
}: CollectionDeleteConfirmProps) {
  const [isDeletingLocal, setIsDeletingLocal] = useState(false)

  const handleConfirm = useCallback(async () => {
    setIsDeletingLocal(true)
    try {
      await onConfirm()
    } finally {
      setIsDeletingLocal(false)
    }
  }, [onConfirm])

  // Build entity label with bookmark count
  const entityLabel = collection.quizCount > 0
    ? `"${collection.name}" (${collection.quizCount} ${collection.quizCount === 1 ? 'quiz' : 'quizzes'})`
    : collection.name

  const isDeletingFinal = isDeleting || isDeletingLocal

  return (
    <ConfirmDialog
      open={open}
      kind='destructive-permanent'
      entityLabel={entityLabel}
      typedOverride={collection.name}
      onConfirm={handleConfirm}
      onCancel={onClose}
      loading={isDeletingFinal}
    />
  )
}
