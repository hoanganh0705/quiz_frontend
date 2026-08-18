'use client'

import { memo } from 'react'
import { cn } from '@/shared/utils/merge-class-names'
import { PRESET_COLORS } from '@/features/bookmarks/types'
import type { PresetColor } from '@/features/bookmarks/types'

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

function getColorName(color: string): string {
return COLOR_NAMES[color] ?? 'custom'
}

interface CollectionColorPickerProps {

value: string

onChange: (color: string) => void

className?: string

disabled?: boolean
}

const CollectionColorPicker = memo(function CollectionColorPicker({
value,
onChange,
className,
disabled = false
}: CollectionColorPickerProps) {
return (
<div
className={cn('flex gap-2 flex-wrap', className)}
role='radiogroup'
aria-label='Choose collection color'
    >
{PRESET_COLORS.map((presetColor) => {
const isSelected = value === presetColor
const colorName = getColorName(presetColor)

return (
<button
key={presetColor}
type='button'
onClick={() => !disabled && onChange(presetColor)}
disabled={disabled}
className={cn(
'w-8 h-8 rounded-full transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
isSelected
? 'ring-2 ring-offset-2 ring-offset-background ring-foreground scale-110'
: 'hover:scale-105',
disabled && 'opacity-50 cursor-not-allowed'
            )}
style={{ backgroundColor: presetColor }}
aria-label={`Select ${colorName} color`}
aria-checked={isSelected}
role='radio'
          />
        )
      })}
</div>
  )
})

export default CollectionColorPicker