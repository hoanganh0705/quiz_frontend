'use client'

/**
 * `<QuizRailEmpty />` — per-rail empty state with an optional
 * single-action button.
 *
 * Source epic: Story 3.7 — Featured / trending / popular rails on `/`.
 * Source ticket: TKT-3.7.B4.
 *
 * The rails render a `<QuizRailEmpty />` when their respective data
 * returns an empty array (Story 3.7 lines 794–795). The empty state
 * is narrower than `<QuizGridEmpty />` from Epic 3.5 D1 — it has at
 * most ONE action button instead of a full filter reset, because
 * each rail has its own narrow scope (one category filter).
 *
 * Typical use:
 *
 *   - When the user has narrowed a rail to a category that returns
 *     no items, the action is a "Reset filter" CTA that calls the
 *     store's setter with `undefined`.
 *   - When the rail is empty in its default state ("All categories")
 *     the action is omitted entirely (no empty button wrapper).
 */

import { Inbox } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { cn } from '@/shared/utils/merge-class-names'

export interface QuizRailEmptyProps {
  /** Heading text for the empty panel. */
  title: string
  /** Optional paragraph below the heading. */
  description?: string
  /** Optional CTA label. When omitted, no button is rendered. */
  actionLabel?: string
  /** Optional CTA click handler. */
  onAction?: () => void
  className?: string
}

export function QuizRailEmpty({
  title,
  description,
  actionLabel,
  onAction,
  className,
}: QuizRailEmptyProps): React.ReactElement {
  const hasAction = Boolean(actionLabel && onAction)

  return (
    <div
      data-testid='quiz-rail-empty'
      data-has-action={hasAction ? 'true' : 'false'}
      className={cn(
        'flex min-h-[8rem] w-full items-center justify-center',
        className,
      )}
    >
      <EmptyState
        icon={Inbox}
        title={title}
        description={description ?? ''}
        size='sm'
        actions={
          hasAction
            ? [
                {
                  label: actionLabel!,
                  onClick: onAction,
                  variant: 'outline',
                },
              ]
            : undefined
        }
      />
    </div>
  )
}

/**
 * Convenience wrapper for callers that want to compose a bare
 * `<Button>` outside the `<EmptyState />` layout (e.g. test code or
 * a rails-specific variant that wants different button styling).
 */
export function QuizRailEmptyActionButton({
  label,
  onAction,
}: {
  label: string
  onAction: () => void
}) {
  return (
    <Button variant='outline' onClick={onAction} data-testid='quiz-rail-empty-action'>
      {label}
    </Button>
  )
}
