'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
// Fix barrel imports (bundle-barrel-imports)
import { Dialog } from '@/components/ui/dialog'
import { DialogContent } from '@/components/ui/dialog'
import { DialogDescription } from '@/components/ui/dialog'
import { DialogFooter } from '@/components/ui/dialog'
import { DialogHeader } from '@/components/ui/dialog'
import { DialogTitle } from '@/components/ui/dialog'
import type { BookmarkCollection } from '@/types/bookmarks'

// Hoist static data (rendering-hoist-jsx)
const PRESET_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#14b8a6', // teal
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#6b7280' // gray
] as const

const COLOR_NAMES: Record<string, string> = {
  '#ef4444': 'red',
  '#f97316': 'orange',
  '#eab308': 'yellow',
  '#22c55e': 'green',
  '#14b8a6': 'teal',
  '#3b82f6': 'blue',
  '#8b5cf6': 'violet',
  '#ec4899': 'pink',
  '#6b7280': 'gray'
} as const

const getColorName = (color: string): string => COLOR_NAMES[color] || 'unknown'

interface CollectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (name: string, description: string, color: string) => void
  collection?: BookmarkCollection | null
  mode: 'create' | 'edit'
}

export default function CollectionDialog({
  open,
  onOpenChange,
  onSave,
  collection,
  mode
}: CollectionDialogProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState<string>(PRESET_COLORS[0])

  // Sync with collection prop when dialog opens or collection changes (rerender-derived-state-no-effect)
  useEffect(() => {
    if (open) {
      if (collection) {
        setName(collection.name)
        setDescription(collection.description || '')
        setColor(collection.color)
      } else {
        // Reset for create mode
        setName('')
        setDescription('')
        setColor(PRESET_COLORS[0])
      }
    }
  }, [open, collection])

  const handleSave = () => {
    if (!name.trim()) return
    onSave(name.trim(), description.trim(), color)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-106.25'>
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Create Collection' : 'Edit Collection'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Create a new collection to organize your bookmarked quizzes.'
              : 'Update your collection details.'}
          </DialogDescription>
        </DialogHeader>

        <div className='grid gap-4 py-4'>
          <div className='grid gap-2'>
            <Label htmlFor='name'>Name</Label>
            <Input
              id='name'
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='e.g., Science Quizzes'
              autoFocus
            />
          </div>

          <div className='grid gap-2'>
            <Label htmlFor='description'>Description (optional)</Label>
            <Textarea
              id='description'
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder='Add a description for this collection...'
              rows={2}
            />
          </div>

          <div className='grid gap-2'>
            <Label>Color</Label>
            <div
              className='flex gap-2 flex-wrap'
              role='radiogroup'
              aria-label='Choose collection color'
            >
              {PRESET_COLORS.map((presetColor) => (
                <button
                  key={presetColor}
                  type='button'
                  onClick={() => setColor(presetColor)}
                  className={`w-8 h-8 rounded-full transition-all ${
                    color === presetColor
                      ? 'ring-2 ring-offset-2 ring-offset-background ring-foreground scale-110'
                      : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: presetColor }}
                  aria-label={`Select ${getColorName(presetColor)} color`}
                  aria-checked={color === presetColor}
                  role='radio'
                />
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!name.trim()}
            className='bg-default hover:bg-default-hover text-white'
          >
            {mode === 'create' ? 'Create' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
