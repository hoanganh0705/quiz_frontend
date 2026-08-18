'use client'

import { useState, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { FolderPlus } from 'lucide-react'
import { useToast, DEFAULT_TOAST_DURATION_MS } from '@/lib/forms/useToast'
import {
useCollections,
useCreateCollection,
useUpdateCollection,
useDeleteCollection,
} from '@/features/bookmarks/hooks'
import type { BookmarkCollection } from '@/features/bookmarks/types'
import CollectionGrid from './CollectionGrid'
import EmptyBookmarks from './EmptyBookmarks'
import CollectionCreateDialog from './CollectionCreateDialog'
import CollectionRenameDialog from './CollectionRenameDialog'
import CollectionDeleteConfirm from './CollectionDeleteConfirm'
import CollectionColorPicker from './CollectionColorPicker'
import type { CreateCollectionDto, UpdateCollectionDto } from '@/lib/api/generated/schemas'

const RATE_LIMIT_MESSAGE = 'Slow down — try again in a minute'

const SERVER_ERROR_MESSAGE = 'Something went wrong. Please try again.'

export default function BookmarksDashboardPage() {
const toast = useToast()

const {
items: collections,
isLoading,
isLoadingMore,
hasMore,
loadMore,
refresh,
  } = useCollections({ limit: 20 })

const [createDialogOpen, setCreateDialogOpen] = useState(false)
const [renameDialogOpen, setRenameDialogOpen] = useState(false)
const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
const [colorPickerOpen, setColorPickerOpen] = useState(false)
const [selectedCollection, setSelectedCollection] = useState<BookmarkCollection | null>(null)

const createMutation = useCreateCollection({
onSuccess: (collection) => {
toast.push({
title: 'Collection created',
body: `"${collection.name}" is ready to use.`,
durationMs: DEFAULT_TOAST_DURATION_MS,
      })
    },
onError: (code) => {

if (code === 'RATE_LIMIT' || code === 'GLOBAL_RATE_LIMIT') {
toast.push({
title: 'Too many requests',
body: RATE_LIMIT_MESSAGE,
durationMs: DEFAULT_TOAST_DURATION_MS,
        })
      } else if (code.startsWith('GLOBAL_')) {
toast.push({
title: 'Server error',
body: SERVER_ERROR_MESSAGE,
durationMs: DEFAULT_TOAST_DURATION_MS,
        })
      }
    },
  })

const updateMutation = useUpdateCollection({
onSuccess: (collection) => {
toast.push({
title: 'Collection updated',
body: `Changes to "${collection.name}" saved.`,
durationMs: DEFAULT_TOAST_DURATION_MS,
      })
    },
onError: (code) => {
if (code === 'RATE_LIMIT' || code === 'GLOBAL_RATE_LIMIT') {
toast.push({
title: 'Too many requests',
body: RATE_LIMIT_MESSAGE,
durationMs: DEFAULT_TOAST_DURATION_MS,
        })
      } else if (code.startsWith('GLOBAL_')) {
toast.push({
title: 'Server error',
body: SERVER_ERROR_MESSAGE,
durationMs: DEFAULT_TOAST_DURATION_MS,
        })
      }
    },
  })

const deleteMutation = useDeleteCollection({
onSuccess: () => {
toast.push({
title: 'Collection deleted',
body: 'The collection has been permanently removed.',
durationMs: DEFAULT_TOAST_DURATION_MS,
      })
    },
onError: (code) => {
if (code === 'RATE_LIMIT' || code === 'GLOBAL_RATE_LIMIT') {
toast.push({
title: 'Too many requests',
body: RATE_LIMIT_MESSAGE,
durationMs: DEFAULT_TOAST_DURATION_MS,
        })
      } else if (code.startsWith('GLOBAL_')) {
toast.push({
title: 'Server error',
body: SERVER_ERROR_MESSAGE,
durationMs: DEFAULT_TOAST_DURATION_MS,
        })
      }
    },
  })

const handleCreate = useCallback(
async (data: CreateCollectionDto & { color?: string }) => {
await createMutation.create(data)
    },
[createMutation]
  )

const handleRename = useCallback(
async (data: UpdateCollectionDto) => {
if (!selectedCollection) return
await updateMutation.update(selectedCollection.collectionId, data)
    },
[selectedCollection, updateMutation]
  )

const handleColorChange = useCallback(
async (color: string) => {
if (!selectedCollection) return
await updateMutation.update(selectedCollection.collectionId, { color } as UpdateCollectionDto)
setColorPickerOpen(false)
    },
[selectedCollection, updateMutation]
  )

const handleDelete = useCallback(async () => {
if (!selectedCollection) return
await deleteMutation.remove(selectedCollection.collectionId)
  }, [selectedCollection, deleteMutation])

const handleRenameRequest = useCallback((collection: BookmarkCollection) => {
setSelectedCollection(collection)
setRenameDialogOpen(true)
  }, [])

const handleColorChangeRequest = useCallback((collection: BookmarkCollection) => {
setSelectedCollection(collection)
setColorPickerOpen(true)
  }, [])

const handleDeleteRequest = useCallback((collection: BookmarkCollection) => {
setSelectedCollection(collection)
setDeleteDialogOpen(true)
  }, [])

const hasCollections = collections.length > 0

return (
<div className='flex flex-col gap-6'>
{/* Header with "New Collection" CTA */}
<div className='flex items-center justify-between'>
<div>
<h2 className='text-xl font-semibold'>Your Collections</h2>
<p className='text-sm text-muted-foreground'>
{hasCollections
? `${collections.length} ${collections.length === 1 ? 'collection' : 'collections'}`
: 'Organize your bookmarks into collections'}
</p>
</div>
<Button
onClick={() => setCreateDialogOpen(true)}
className='bg-brand hover:bg-brand-hover text-white'
        >
<FolderPlus className='mr-2 h-4 w-4' aria-hidden='true' />
New Collection
        </Button>
</div>

{/* Collections Grid or Empty State */}
{hasCollections ? (
<CollectionGrid
collections={collections}
isLoading={isLoading}
isLoadingMore={isLoadingMore}
hasMore={hasMore}
onLoadMore={loadMore}
onRename={handleRenameRequest}
onChangeColor={handleColorChangeRequest}
onDelete={handleDeleteRequest}
        />
      ) : !isLoading ? (
<EmptyBookmarks
type='no-collections'
onCreateCollection={() => setCreateDialogOpen(true)}
        />
      ) : null}

{/* Create Dialog */}
<CollectionCreateDialog
open={createDialogOpen}
onOpenChange={setCreateDialogOpen}
onSubmit={handleCreate}
conflictError={createMutation.conflictError}
isSubmitting={createMutation.isPending}
      />

{/* Rename Dialog */}
{selectedCollection && (
<CollectionRenameDialog
open={renameDialogOpen}
onOpenChange={(open) => {
setRenameDialogOpen(open)
if (!open) setSelectedCollection(null)
          }}
collection={selectedCollection}
existingCollections={collections}
onSubmit={handleRename}
conflictError={updateMutation.conflictError}
isSubmitting={updateMutation.isPending}
        />
      )}

{/* Color Picker Dialog */}
{selectedCollection && (
<ColorPickerDialog
open={colorPickerOpen}
onOpenChange={(open) => {
setColorPickerOpen(open)
if (!open) setSelectedCollection(null)
          }}
collection={selectedCollection}
onColorChange={handleColorChange}
isSubmitting={updateMutation.isPending}
        />
      )}

{/* Delete Confirm Dialog */}
{selectedCollection && (
<CollectionDeleteConfirm
open={deleteDialogOpen}
onClose={() => {
setDeleteDialogOpen(false)
setSelectedCollection(null)
          }}
collection={selectedCollection}
onConfirm={handleDelete}
isDeleting={deleteMutation.isPending}
        />
      )}
</div>
  )
}

interface ColorPickerDialogProps {
open: boolean
onOpenChange: (open: boolean) => void
collection: BookmarkCollection
onColorChange: (color: string) => Promise<void>
isSubmitting: boolean
}

function ColorPickerDialog({
open,
onOpenChange,
collection,
onColorChange,
isSubmitting,
}: ColorPickerDialogProps) {
const [selectedColor, setSelectedColor] = useState(collection.color ?? '#3b82f6')

useEffect(() => {
if (open) {
setSelectedColor(collection.color ?? '#3b82f6')
    }
  }, [open, collection.color])

const handleSave = async () => {
await onColorChange(selectedColor)
onOpenChange(false)
  }

return (
<div
className={`fixed inset-0 z-50 flex items-center justify-center ${
open ? 'block' : 'hidden'
}`}
onClick={() => onOpenChange(false)}
    >
<div className='fixed inset-0 bg-black/50' />
<div
className='relative bg-background rounded-lg shadow-lg p-6 w-full max-w-sm mx-4'
onClick={(e) => e.stopPropagation()}
      >
<h3 className='text-lg font-semibold mb-4'>
Change color for "{collection.name}"
        </h3>
<div className='mb-6'>
<CollectionColorPicker
value={selectedColor}
onChange={setSelectedColor}
disabled={isSubmitting}
          />
</div>
<div className='flex gap-3 justify-end'>
<Button
variant='outline'
onClick={() => onOpenChange(false)}
disabled={isSubmitting}
          >
Cancel
          </Button>
<Button
onClick={handleSave}
disabled={isSubmitting}
className='bg-brand hover:bg-brand-hover text-white'
          >
{isSubmitting ? 'Saving...' : 'Save'}
</Button>
</div>
</div>
</div>
  )
}
