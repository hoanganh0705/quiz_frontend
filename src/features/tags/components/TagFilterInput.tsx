'use client'

import { useEffect, useState } from 'react'

import { Input } from '@/components/ui/Input'
import { isValidTagSlug } from '@/features/tags/utils'
import { useDebouncedValue } from '@/lib/utils/use-debounced-value'

const SEARCH_DEBOUNCE_MS = 250

export interface TagFilterInputProps {

value: string

onChange: (debouncedValue: string) => void

className?: string
}

function isViolation(raw: string): boolean {
if (raw === '') return false
return !isValidTagSlug(raw)
}

export function TagFilterInput({
value,
onChange,
className,
}: TagFilterInputProps): React.ReactElement {

const [typed, setTyped] = useState(value)
const { debouncedValue: debounced } = useDebouncedValue(typed, SEARCH_DEBOUNCE_MS)

useEffect(() => {
setTyped((current) => (current === value ? current : value))
  }, [value])

useEffect(() => {
onChange(debounced)
    // The `onChange` prop is captured at mount time. If the parent
    // passes a new `onChange` reference, the hook re-fires with the
    // current debounced value — this is intentional: a "Clear filter"
    // link wired via `setValue('')` updates `value`, which updates
    // `typed` (above), which updates `debounced`, which fires
    // `onChange('')`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced])

return (
<div className={className}>
<Input
type='search'
placeholder='Filter tags…'
value={typed}
onChange={(e) => setTyped(e.target.value)}
autoComplete='off'
spellCheck={false}
aria-label='Filter tags by slug'
data-testid='tag-filter-input'
aria-invalid={isViolation(typed) ? true : undefined}
aria-describedby={
isViolation(typed) ? 'tag-filter-input-helper' : undefined
        }
      />
{isViolation(typed) ? (
<p
id='tag-filter-input-helper'
role='status'
data-testid='tag-filter-input-helper'
className='mt-2 text-xs text-muted-foreground'
        >
Tags use lowercase letters, numbers, and dashes only
        </p>
      ) : null}
</div>
  )
}
