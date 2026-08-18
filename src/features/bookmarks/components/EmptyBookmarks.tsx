'use client'

import { memo } from 'react'
import { Bookmark, FolderPlus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'

type EmptyBookmarksType = 'no-collections' | 'no-results' | 'empty-collection'

interface EmptyBookmarksProps {

type: EmptyBookmarksType

collectionName?: string

onCreateCollection?: () => void

onAddQuizzes?: () => void
}

const EmptyBookmarks = memo(function EmptyBookmarks({
type,
collectionName,
onCreateCollection,
onAddQuizzes
}: EmptyBookmarksProps) {
if (type === 'no-collections') {
return (
<div className='flex flex-col items-center justify-center py-16 px-4 text-center'>
<div className='rounded-full bg-muted p-6 mb-4' aria-hidden='true'>
<FolderPlus className='h-12 w-12 text-muted-foreground' />
</div>
<h3 className='text-xl font-semibold mb-2'>Create your first collection</h3>
<p className='text-muted-foreground max-w-sm mb-6'>
Organize your bookmarked quizzes into collections. Create a collection to get started.
        </p>
<div className='flex gap-3'>
{onCreateCollection && (
<Button
onClick={onCreateCollection}
className='bg-default hover:bg-default-hover text-white'
            >
<FolderPlus className='mr-2 h-4 w-4' aria-hidden='true' />
Create Collection
            </Button>
          )}
<Button
asChild
variant='outline'
          >
<Link href='/quizzes'>Explore Quizzes</Link>
</Button>
</div>
</div>
    )
  }

if (type === 'no-results') {
return (
<div className='flex flex-col items-center justify-center py-12 px-4 text-center'>
<div className='rounded-full bg-muted p-4 mb-4' aria-hidden='true'>
<Bookmark className='h-8 w-8 text-muted-foreground' />
</div>
<h3 className='text-lg font-semibold mb-2'>No matching collections</h3>
<p className='text-muted-foreground text-sm'>
Try adjusting your search to find what you&apos;re looking for.
        </p>
</div>
    )
  }

if (type === 'empty-collection') {
return (
<div className='flex flex-col items-center justify-center py-12 px-4 text-center'>
<div className='rounded-full bg-muted p-4 mb-4' aria-hidden='true'>
<FolderPlus className='h-8 w-8 text-muted-foreground' />
</div>
<h3 className='text-lg font-semibold mb-2'>
{collectionName
? `"${collectionName}" is empty`
: 'Collection is empty'}
</h3>
<p className='text-muted-foreground text-sm max-w-xs mb-6'>
Add quizzes to this collection from the quiz details page or browse quizzes to get started.
        </p>
<div className='flex gap-3'>
{onAddQuizzes && (
<Button
onClick={onAddQuizzes}
variant='outline'
            >
Browse Quizzes
            </Button>
          )}
<Button
asChild
className='bg-default hover:bg-default-hover text-white'
          >
<Link href='/quizzes'>Explore Quizzes</Link>
</Button>
</div>
</div>
    )
  }

return null
})

export default EmptyBookmarks
