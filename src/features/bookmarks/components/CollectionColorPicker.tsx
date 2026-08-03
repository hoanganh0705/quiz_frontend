'use client'

/**
 * `CollectionColorPicker` — standalone color picker for collection colors.
 *
 * Source epic:   Epic 4.6 — Bookmark collections CRUD + hard-delete confirm.
 * Source ticket: T-4.6-D4.
 *
 * ## What this component owns
 *
 *   - Renders a preset palette of 9 colors.
 *   - Handles selection with visual feedback.
 *   - Provides accessible color selection with aria-labels.
 */

import { memo } from 'react'
import { cn } from '@/shared/utils/merge-class-names'
import { PRESET_COLORS } from '@/features/bookmarks/types'
import type { PresetColor } from '@/features/bookmarks/types'

/**
 * Map of color values to human-readable names for accessibility.
 */
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

/**
 * Get a human-readable name for a color.
 */
function getColorName(color: string): string {
  return COLOR_NAMES[color] ?? 'custom'
}

interface CollectionColorPickerProps {
  /** Currently selected color (hex value). */
  value: string
  /** Callback when a color is selected. */
  onChange: (color: string) => void
  /** Optional className for the container. */
  className?: string
  /** Whether the picker is disabled. */
  disabled?: boolean
}

/**
 * Collection color picker component.
 *
 * Renders a preset palette of 9 colors. Each color has:
 * - aria-label for accessibility
 * - Ring indicator when selected
 * - Hover state on unselected colors
 */
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