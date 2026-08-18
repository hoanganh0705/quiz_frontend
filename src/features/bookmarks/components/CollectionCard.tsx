'use client'

import { memo } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { DropdownMenu } from '@/components/ui/DropdownMenu'
import { DropdownMenuContent } from '@/components/ui/DropdownMenu'
import { DropdownMenuItem } from '@/components/ui/DropdownMenu'
import { DropdownMenuTrigger } from '@/components/ui/DropdownMenu'
import type { BookmarkCollection } from '@/features/bookmarks/types'
import { getCollectionColor } from '@/features/bookmarks/types'
import { MoreHorizontal, Pencil, Trash2, FolderOpen } from 'lucide-react'

interface CollectionCardProps {
collection: BookmarkCollection

isSelected?: boolean

onSelect?: () => void

onRename?: () => void

onChangeColor?: () => void

onDelete?: () => void
}

const CollectionCard = memo(function CollectionCard({
collection,
isSelected = false,
onSelect,
onRename,
onChangeColor,
onDelete
}: CollectionCardProps) {
const router = useRouter()
const displayColor = getCollectionColor(collection)
const hasActions = onRename || onChangeColor || onDelete

const handleSelect = () => {
if (onSelect) {
onSelect()
    } else {

router.push(`/bookmarks/${collection.collectionId}`)
    }
  }

return (
<div
onClick={handleSelect}
className={`group relative p-4 rounded-lg border cursor-pointer transition-all ${
isSelected
? 'border-default bg-default/5 shadow-sm'
: 'border-border hover:border-ring hover:shadow-sm'
}`}
    >
{/* Color indicator */}
<div
className='absolute top-0 left-0 w-1 h-full rounded-l-lg'
style={{ backgroundColor: displayColor }}
      />

<div className='flex items-start justify-between pl-2'>
<div className='flex-1 min-w-0'>
<div className='flex items-center gap-2 mb-1'>
<FolderOpen
className='h-4 w-4 shrink-0'
style={{ color: displayColor }}
aria-hidden='true'
            />
<h4 className='font-medium text-sm truncate'>{collection.name}</h4>
</div>

{collection.description && (
<p className='text-xs text-muted-foreground line-clamp-1 mb-2'>
{collection.description}
</p>
          )}

<span className='text-xs text-muted-foreground'>
{collection.quizCount === 0
? 'No quizzes saved yet'
: `${collection.quizCount} ${collection.quizCount === 1 ? 'quiz' : 'quizzes'}`
            }
</span>
</div>

{hasActions && (
<DropdownMenu>
<DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
<Button
variant='ghost'
size='icon'
className='h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity'
aria-label='Collection options'
              >
<MoreHorizontal className='h-4 w-4' aria-hidden='true' />
</Button>
</DropdownMenuTrigger>
<DropdownMenuContent align='end'>
{onRename && (
<DropdownMenuItem
onClick={(e) => {
e.stopPropagation()
onRename()
                  }}
                >
<Pencil className='mr-2 h-4 w-4' />
Rename
                </DropdownMenuItem>
              )}
{onChangeColor && (
<DropdownMenuItem
onClick={(e) => {
e.stopPropagation()
onChangeColor()
                  }}
                >
<FolderOpen className='mr-2 h-4 w-4' />
Change color
                </DropdownMenuItem>
              )}
{onDelete && (
<DropdownMenuItem
onClick={(e) => {
e.stopPropagation()
onDelete()
                  }}
className='text-red-600 dark:text-red-400'
                >
<Trash2 className='mr-2 h-4 w-4' />
Delete
                </DropdownMenuItem>
              )}
</DropdownMenuContent>
</DropdownMenu>
        )}
</div>
</div>
  )
})

export default CollectionCard
