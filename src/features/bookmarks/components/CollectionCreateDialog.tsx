'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Textarea } from '@/components/ui/Textarea'
import { Dialog } from '@/components/ui/Dialog'
import { DialogContent } from '@/components/ui/Dialog'
import { DialogDescription } from '@/components/ui/Dialog'
import { DialogFooter } from '@/components/ui/Dialog'
import { DialogHeader } from '@/components/ui/Dialog'
import { DialogTitle } from '@/components/ui/Dialog'
import CollectionColorPicker from './CollectionColorPicker'
import type { BookmarkCollection } from '@/features/bookmarks/types'
import { PRESET_COLORS } from '@/features/bookmarks/types'
import type { CreateCollectionDto } from '@/lib/api/generated/schemas'
import type { UserCopyEntry } from '@/lib/api/error-codes'

interface CollectionCreateDialogProps {

open: boolean

onOpenChange: (open: boolean) => void

onSubmit: (data: CreateCollectionDto & { color?: string }) => Promise<void>

conflictError?: UserCopyEntry | null

fieldErrors?: {
name?: string[]
description?: string[]
  }

isSubmitting?: boolean
}

const NAME_MIN_LENGTH = 1
const NAME_MAX_LENGTH = 50

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

export default function CollectionCreateDialog({
open,
onOpenChange,
onSubmit,
conflictError,
fieldErrors,
isSubmitting = false
}: CollectionCreateDialogProps) {
const [name, setName] = useState('')
const [description, setDescription] = useState('')
const [color, setColor] = useState<string>(PRESET_COLORS[0])
const [touched, setTouched] = useState(false)
const [isSubmittingLocal, setIsSubmittingLocal] = useState(false)
const nameInputRef = useRef<HTMLInputElement>(null)

useEffect(() => {
if (open) {
setName('')
setDescription('')
setColor(PRESET_COLORS[0])
setTouched(false)

setTimeout(() => nameInputRef.current?.focus(), 50)
    }
  }, [open])

const nameError = touched
? validateName(name) ?? fieldErrors?.name?.[0] ?? conflictError?.body ?? null
: null

const handleSubmit = useCallback(async () => {
if (!name.trim()) return

setIsSubmittingLocal(true)
try {
await onSubmit({
name: name.trim(),
description: description.trim() || undefined,
color
      })
onOpenChange(false)
    } catch {
      // Error handling is done via props
    } finally {
setIsSubmittingLocal(false)
    }
  }, [name, description, color, onSubmit, onOpenChange])

const isSubmittingFinal = isSubmitting || isSubmittingLocal
const canSubmit = name.trim().length >= NAME_MIN_LENGTH && !isSubmittingFinal

return (
<Dialog open={open} onOpenChange={onOpenChange}>
<DialogContent className='sm:max-w-106.25'>
<DialogHeader>
<DialogTitle>Create Collection</DialogTitle>
<DialogDescription>
Create a new collection to organize your bookmarked quizzes.
          </DialogDescription>
</DialogHeader>

<div className='grid gap-4 py-4'>
{/* Name field */}
<div className='grid gap-2'>
<Label htmlFor='collection-name'>Name</Label>
<Input
ref={nameInputRef}
id='collection-name'
value={name}
onChange={(e) => setName(e.target.value)}
onBlur={() => setTouched(true)}
placeholder='e.g., Science Quizzes'
autoFocus
disabled={isSubmittingFinal}
aria-describedby={nameError ? 'collection-name-error' : undefined}
aria-invalid={!!nameError}
            />
{nameError && (
<p
id='collection-name-error'
className='text-sm text-destructive'
role='alert'
              >
{nameError}
</p>
            )}
</div>

{/* Description field */}
<div className='grid gap-2'>
<Label htmlFor='collection-description'>Description (optional)</Label>
<Textarea
id='collection-description'
value={description}
onChange={(e) => setDescription(e.target.value)}
placeholder='Add a description for this collection...'
rows={2}
disabled={isSubmittingFinal}
aria-describedby={fieldErrors?.description ? 'collection-description-error' : undefined}
            />
{fieldErrors?.description && (
<p
id='collection-description-error'
className='text-sm text-destructive'
role='alert'
              >
{fieldErrors.description[0]}
</p>
            )}
</div>

{/* Color picker */}
<div className='grid gap-2'>
<Label>Color</Label>
<CollectionColorPicker
value={color}
onChange={setColor}
disabled={isSubmittingFinal}
            />
</div>
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
{isSubmittingFinal ? 'Creating...' : 'Create'}
</Button>
</DialogFooter>
</DialogContent>
</Dialog>
  )
}