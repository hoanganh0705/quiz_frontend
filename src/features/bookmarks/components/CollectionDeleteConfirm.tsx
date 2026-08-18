'use client'

import { useState, useCallback } from 'react'
import { ConfirmDialog } from '@/components/primitives'
import type { BookmarkCollection } from '@/features/bookmarks/types'

interface CollectionDeleteConfirmProps {

open: boolean

collection: BookmarkCollection

onConfirm: () => Promise<void>

onClose: () => void

isDeleting?: boolean
}

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
