/**
 * `<TagEmptyState />` — reusable empty state for the tag directory,
 * the tag detail page's quiz sub-list, and the filter-no-match
 * empty state.
 *
 * Source epic: Epic 3.4 — Tag browse + detail (read-only).
 * Source ticket: TKT-3.4.C7.
 *
 * Renders one of three documented copy tokens:
 *
 *   - `'directory'`:        "No tags yet." (lines 457)
 *   - `'quizzes-by-tag'`:   "No quizzes tagged with this yet." (lines 458)
 *   - `'filter-no-match'`:  "No tags match '{query}'" + "Clear filter" (lines 459)
 *
 * The `'filter-no-match'` variant also renders a "Clear filter"
 * action that calls `onClearFilter()` when clicked (the parent
 * wires it to clear the controlled filter input).
 *
 * The component is a server-renderable prop-driven renderer — no
 * `'use client'` directive. It uses the global `EmptyState` UI
 * primitive for layout consistency with `CategoryEmptyState`
 * (Epic 3.3 / TKT-3.3.C4). The pattern is identical.
 *
 * The copy is intentionally written verbatim per the ticket
 * instructions — the strings are stable contracts and must not be
 * localised without a parallel ticket.
 */

import { SearchX, Tag as TagIcon } from 'lucide-react'

import { EmptyState } from '@/components/ui/EmptyState'

export type TagEmptyStateVariant =
  | 'directory'
  | 'quizzes-by-tag'
  | 'filter-no-match'

export interface TagEmptyStateProps {
  variant: TagEmptyStateVariant
  /** Substituted into the `'filter-no-match'` copy. Required for that variant. */
  query?: string
  /** Called when the user clicks "Clear filter" on the `'filter-no-match'` variant. */
  onClearFilter?: () => void
  /** Optional className for the outer container. */
  className?: string
}

interface StaticCopy {
  title: string
  description: string
  icon: typeof TagIcon
}

const STATIC_COPY: Record<
  Exclude<TagEmptyStateVariant, 'filter-no-match'>,
  StaticCopy
> = {
  directory: {
    title: 'No tags yet.',
    description: 'Tags will appear here once they are created.',
    icon: TagIcon,
  },
  'quizzes-by-tag': {
    title: 'No quizzes tagged with this yet.',
    description: 'Check back soon for new quizzes on this topic.',
    icon: SearchX,
  },
}

export function TagEmptyState({
  variant,
  query,
  onClearFilter,
  className,
}: TagEmptyStateProps): React.ReactElement {
  if (variant === 'filter-no-match') {
    // Defensive: a missing `query` falls back to an empty quoted
    // string — the format is still stable for the test, and the
    // component never crashes.
    const safeQuery = query ?? ''
    return (
      <div
        data-testid={`tag-empty-state-${variant}`}
        data-variant={variant}
        className={className}
      >
        <EmptyState
          icon={SearchX}
          title={`No tags match '${safeQuery}'`}
          description="Try a different keyword or clear the filter to see all tags."
          actions={[
            {
              label: 'Clear filter',
              variant: 'outline',
              onClick: onClearFilter,
            },
          ]}
        />
      </div>
    )
  }

  const copy = STATIC_COPY[variant]
  return (
    <div
      data-testid={`tag-empty-state-${variant}`}
      data-variant={variant}
      className={className}
    >
      <EmptyState
        icon={copy.icon}
        title={copy.title}
        description={copy.description}
      />
    </div>
  )
}
