'use client'

/**
 * `<TagFilterInput>` — debounced client-side filter input for the
 * tag directory page.
 *
 * Source epic: Epic 3.4 — Tag browse + detail (read-only).
 * Source ticket: TKT-3.4.C1.
 *
 * A controlled `<Input>` that fires `onChange(debouncedValue)` 250 ms
 * after the user stops typing (matching the Story 3.3 E1 debounce).
 *
 * ## Validation contract (closes Story 3.4 AC #3)
 *
 * "Filter input never causes a 422." The component never sends a
 * network request — the filter is purely client-side. The typed
 * value (before debounce) is checked against `TAG_SLUG_REGEX`
 * (`src/features/tags/utils/tag-slug-regex.ts`); when the typed
 * value violates the regex, the component renders the inline helper
 * message "Tags use lowercase letters, numbers, and dashes only"
 * below the input. The helper message disappears as soon as the
 * typed value matches the regex again.
 *
 * The debounced value is what the parent applies to the in-memory
 * list — the parent can choose to also filter `value` to safe
 * characters at the consumer boundary if it wants to be defensive
 * against future callers that bypass this component. The current
 * `TagsDirectoryPage` does NOT call `isValidTagSlug` itself — the
 * filter input owns the validation UI, and the directory filters
 * the in-memory list by substring match (a valid slug is a
 * substring of any list entry).
 *
 * ## Controlled component
 *
 * The component is fully controlled — `value` + `onChange` are the
 * only state surface. The local `useState` for the typed value
 * exists only to allow the debounced input to fire `onChange` after
 * a quiet period. The parent (the directory page) holds the
 * authoritative filter state.
 */

import { useEffect, useState } from 'react'

import { Input } from '@/components/ui/Input'
import { isValidTagSlug } from '@/features/tags/utils'
import { useDebouncedValue } from '@/lib/utils/use-debounced-value'

const SEARCH_DEBOUNCE_MS = 250

export interface TagFilterInputProps {
  /** The current applied query (held by the parent). */
  value: string
  /**
   * Called with the debounced typed value (250 ms after typing
   * stops). Receives the empty string when the user clears the
   * input (the parent should treat empty as "no filter").
   */
  onChange: (debouncedValue: string) => void
  /** Optional className for the outer wrapper. */
  className?: string
}

/**
 * Returns `true` while the typed value is non-empty AND does not
 * match the slug regex. The empty string is NOT a violation (it
 * means the user cleared the input).
 */
function isViolation(raw: string): boolean {
  if (raw === '') return false
  return !isValidTagSlug(raw)
}

export function TagFilterInput({
  value,
  onChange,
  className,
}: TagFilterInputProps): React.ReactElement {
  // Local typed-value state — drives both the validation UI
  // (instant) and the debounced parent state (250 ms later).
  const [typed, setTyped] = useState(value)
  const { debouncedValue: debounced } = useDebouncedValue(typed, SEARCH_DEBOUNCE_MS)

  // Sync the local typed state when the parent's value changes
  // externally (e.g. a "Clear filter" link resets the input).
  // We do NOT sync from `debounced` — that would create an
  // infinite loop (debounced → setTyped → debounced again).
  useEffect(() => {
    setTyped((current) => (current === value ? current : value))
  }, [value])

  // Fire the parent's `onChange` whenever the debounced value
  // changes. The parent decides whether to apply the filter.
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
