/**
 * `<CategoryEmptyState />` — reusable empty state for the directory
 * and the detail page.
 *
 * Source epic: Epic 3.3 — Category browse + detail (read-only).
 * Source ticket: TKT-3.3.C4.
 *
 * Renders one of two documented empty-state copy tokens:
 *
 *   - `'directory'`: `"No categories yet. Check back soon."`
 *   - `'quizzes-in-category'`: `"No quizzes in this category yet."`
 *
 * The component is a server-renderable prop-driven renderer — no
 * `'use client'` directive. It uses the global `EmptyState` UI
 * primitive (from `src/components/ui/EmptyState.tsx`) for layout
 * consistency with other empty states in the app.
 *
 * The copy is intentionally written verbatim per the ticket
 * instructions — the strings are stable contracts and must not be
 * localised without a parallel ticket.
 */

import { FolderOpen, SearchX } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'

export type CategoryEmptyStateVariant =
  | 'directory'
  | 'quizzes-in-category'

export interface CategoryEmptyStateProps {
  variant: CategoryEmptyStateVariant
  /** Optional className for the outer container. */
  className?: string
}

const COPY: Record<
  CategoryEmptyStateVariant,
  { title: string; description: string }
> = {
  directory: {
    title: 'No categories yet.',
    description: 'Check back soon.',
  },
  'quizzes-in-category': {
    title: 'No quizzes in this category yet.',
    description: 'Check back soon for new quizzes.',
  },
}

export function CategoryEmptyState({
  variant,
  className,
}: CategoryEmptyStateProps): React.ReactElement {
  const copy = COPY[variant]
  const Icon = variant === 'directory' ? FolderOpen : SearchX
  return (
    <div
      data-testid={`category-empty-state-${variant}`}
      data-variant={variant}
    >
      <EmptyState
        icon={Icon}
        title={copy.title}
        description={copy.description}
        className={className}
      />
    </div>
  )
}
