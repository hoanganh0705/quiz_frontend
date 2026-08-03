'use client'

/**
 * `CollectionRenameDialog` — dialog for renaming existing bookmark collections.
 *
 * Source epic:   Epic 4.6 — Bookmark collections CRUD + hard-delete confirm.
 * Source ticket: T-4.6-D2.
 *
 * ## What this component owns
 *
 *   - Form for renaming a collection.
 *   - Fields: name (required) with current name pre-filled.
 *   - Name validation (1-50 chars).
 *   - Live validation with 300ms debounce against existing names.
 *   - 409 conflict error handling with inline error display.
 *   - Dialog stays open on error (per epic spec).
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Dialog } from '@/components/ui/Dialog'
import { DialogContent } from '@/components/ui/Dialog'
import { DialogDescription } from '@/components/ui/Dialog'
import { DialogFooter } from '@/components/ui/Dialog'
import { DialogHeader } from '@/components/ui/Dialog'
import { DialogTitle } from '@/components/ui/Dialog'
import CollectionColorPicker from './CollectionColorPicker'
import type { BookmarkCollection } from '@/features/bookmarks/types'
import type { UpdateCollectionDto } from '@/lib/api/generated/schemas'
import type { UserCopyEntry } from '@/lib/api/error-codes'

interface CollectionRenameDialogProps {
  /** Whether the dialog is open. */
  open: boolean
  /** Callback when open state changes. */
  onOpenChange: (open: boolean) => void
  /** The collection to rename. */
  collection: BookmarkCollection
  /** All existing collections (for live name validation). */
  existingCollections?: readonly BookmarkCollection[]
  /** Callback when form is submitted. */
  onSubmit: (data: UpdateCollectionDto) => Promise<void>
  /** Callback when color is changed separately (for separate color update). */
  onColorChange?: (color: string) => Promise<void>
  /** Inline error for name conflicts (409 COLLECTION_CONFLICT). */
  conflictError?: UserCopyEntry | null
  /** Per-field errors (422). */
  fieldErrors?: {
    name?: string[]
  }
  /** Whether the form is being submitted. */
  isSubmitting?: boolean
}

/**
 * Name length constraints (mirrors backend validation).
 */
const NAME_MIN_LENGTH = 1
const NAME_MAX_LENGTH = 50

/**
 * Debounce delay for live name validation (ms).
 */
const LIVE_VALIDATION_DELAY = 300

/**
 * Validate the name field.
 */
function validateName(name: string): string | null {
  const trimmed = name.trim()
  if (trimmed.length < NAME_MIN_LENGTH) {
    return 'Name is required'
  }
  if (trimmed.length > NAME_MAX_LENGTH) {
    return `Name must be ${NAME_MAX_LENGTH} characters or less`
  }
  return null
}

/**
 * Check if a name conflicts with existing collections.
 * Excludes the current collection from the check.
 */
function checkNameConflict(
  name: string,
  currentCollectionId: string,
  existingCollections?: readonly BookmarkCollection[]
): boolean {
  if (!existingCollections) return false
  const normalizedName = name.trim().toLowerCase()
  return existingCollections.some(
    (c) =>
      c.collectionId !== currentCollectionId &&
      c.name.trim().toLowerCase() === normalizedName
  )
}

/**
 * Dialog for renaming a bookmark collection.
 *
 * Features:
 * - Current name pre-filled on open
 * - Name validation (1-50 chars)
 * - Live validation with 300ms debounce
 * - Inline error display for 409 conflicts
 * - Dialog stays open on error (epic spec)
 */
export default function CollectionRenameDialog({
  open,
  onOpenChange,
  collection,
  existingCollections,
  onSubmit,
  onColorChange,
  conflictError,
  fieldErrors,
  isSubmitting = false
}: CollectionRenameDialogProps) {
  const [name, setName] = useState('')
  const [touched, setTouched] = useState(false)
  const [isSubmittingLocal, setIsSubmittingLocal] = useState(false)
  const [liveConflict, setLiveConflict] = useState(false)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Reset form when dialog opens or collection changes
  useEffect(() => {
    if (open) {
      setName(collection.name)
      setTouched(false)
      setLiveConflict(false)
      // Auto-focus name field after a brief delay for animation
      setTimeout(() => nameInputRef.current?.focus(), 50)
    }
  }, [open, collection.collectionId, collection.name])

  // Debounced live validation
  useEffect(() => {
    if (!touched) return

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(() => {
      const isConflict = checkNameConflict(name, collection.collectionId, existingCollections)
      setLiveConflict(isConflict)
    }, LIVE_VALIDATION_DELAY)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [name, touched, collection.collectionId, existingCollections])

  // Determine if name has changed
  const nameChanged = useMemo(() => {
    return name.trim() !== collection.name.trim()
  }, [name, collection.name])

  // Combine validation errors
  const nameError = touched
    ? validateName(name) ??
      (liveConflict ? 'A collection with this name already exists' : null) ??
      fieldErrors?.name?.[0] ??
      conflictError?.body ??
      null
    : null

  const handleSubmit = useCallback(async () => {
    const trimmedName = name.trim()
    if (!trimmedName) return

    setIsSubmittingLocal(true)
    try {
      const payload: UpdateCollectionDto = {}

      // Only include changed fields
      if (nameChanged) {
        payload.name = trimmedName
      }

      await onSubmit(payload)
      onOpenChange(false)
    } catch {
      // Error handling is done via props
    } finally {
      setIsSubmittingLocal(false)
    }
  }, [name, nameChanged, onSubmit, onOpenChange])

  const handleColorChange = useCallback(
    async (newColor: string) => {
      if (onColorChange) {
        await onColorChange(newColor)
      }
    },
    [onColorChange]
  )

  const isSubmittingFinal = isSubmitting || isSubmittingLocal
  const canSubmit = name.trim().length >= NAME_MIN_LENGTH && nameChanged && !isSubmittingFinal && !liveConflict

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-106.25'>
        <DialogHeader>
          <DialogTitle>Rename Collection</DialogTitle>
          <DialogDescription>
            Update your collection name.
          </DialogDescription>
        </DialogHeader>

        <div className='grid gap-4 py-4'>
          {/* Name field */}
          <div className='grid gap-2'>
            <Label htmlFor='collection-rename-name'>Name</Label>
            <Input
              ref={nameInputRef}
              id='collection-rename-name'
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => setTouched(true)}
              placeholder='e.g., Science Quizzes'
              disabled={isSubmittingFinal}
              aria-describedby={nameError ? 'collection-rename-error' : undefined}
              aria-invalid={!!nameError}
            />
            {nameError && (
              <p
                id='collection-rename-error'
                className='text-sm text-destructive'
                role='alert'
              >
                {nameError}
              </p>
            )}
          </div>

          {/* Color picker */}
          {onColorChange && (
            <div className='grid gap-2'>
              <Label>Color</Label>
              <CollectionColorPicker
                value={collection.color ?? '#3b82f6'}
                onChange={handleColorChange}
                disabled={isSubmittingFinal}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type='button'
            variant='outline'
            onClick={() => onOpenChange(false)}
            disabled={isSubmittingFinal}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className='bg-default hover:bg-default-hover text-white'
          >
            {isSubmittingFinal ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}