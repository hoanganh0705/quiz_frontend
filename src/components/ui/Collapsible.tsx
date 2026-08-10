'use client'

/**
 * `Collapsible` — Radix-free collapsible primitive.
 *
 * Implemented with a controlled `open` state and native CSS
 * transitions (no `@radix-ui/react-collapsible` dependency). The
 * contract mirrors Radix's API so consumers can migrate to Radix
 * later by swapping the imports only:
 *
 *   - `Collapsible` accepts `open` / `onOpenChange` / `defaultOpen`
 *     and renders a wrapper element.
 *   - `CollapsibleTrigger` accepts `asChild` and forwards a click
 *     handler that toggles the open state.
 *   - `CollapsibleContent` is hidden when `open === false` and
 *     shown when `open === true`. A `data-state` attribute mirrors
 *     Radix's contract for animation hooks.
 *
 * Source epic:   Phase 8 production-readiness hardening.
 * Source ticket: PROD-A1 — restore missing UI primitives.
 */

import * as React from 'react'

import { cn } from '@/shared/utils/merge-class-names'

interface CollapsibleContextValue {
  open: boolean
  setOpen: (open: boolean) => void
  triggerId: string
  contentId: string
}

const CollapsibleContext =
  React.createContext<CollapsibleContextValue | null>(null)

function useCollapsibleContext(component: string): CollapsibleContextValue {
  const ctx = React.useContext(CollapsibleContext)
  if (!ctx) {
    throw new Error(
      `<${component}> must be used within <Collapsible>`,
    )
  }
  return ctx
}

// ─── Root ────────────────────────────────────────────────────────────────────

export interface CollapsibleProps {
  /** Whether the collapsible is open. Use with `onOpenChange` for controlled mode. */
  open?: boolean
  /** Initial open state when uncontrolled. */
  defaultOpen?: boolean
  /** Called when the open state changes (user clicks the trigger). */
  onOpenChange?: (open: boolean) => void
  children?: React.ReactNode
  className?: string
}

/**
 * Root wrapper. Pass either `open` + `onOpenChange` (controlled) or
 * `defaultOpen` (uncontrolled). The trigger / content elements read
 * the resolved state from context.
 */
function Collapsible({
  open,
  defaultOpen,
  onOpenChange,
  children,
  className,
}: CollapsibleProps) {
  const isControlled = open !== undefined
  const [uncontrolledOpen, setUncontrolledOpen] =
    React.useState<boolean>(defaultOpen ?? false)
  const resolvedOpen = isControlled ? (open as boolean) : uncontrolledOpen

  const setOpen = React.useCallback(
    (next: boolean) => {
      if (!isControlled) setUncontrolledOpen(next)
      onOpenChange?.(next)
    },
    [isControlled, onOpenChange],
  )

  const reactId = React.useId()
  const triggerId = `collapsible-trigger-${reactId}`
  const contentId = `collapsible-content-${reactId}`

  const value = React.useMemo<CollapsibleContextValue>(
    () => ({ open: resolvedOpen, setOpen, triggerId, contentId }),
    [resolvedOpen, setOpen, triggerId, contentId],
  )

  return (
    <CollapsibleContext.Provider value={value}>
      <div
        data-slot='collapsible'
        data-state={resolvedOpen ? 'open' : 'closed'}
        className={className}
      >
        {children}
      </div>
    </CollapsibleContext.Provider>
  )
}

// ─── Trigger ─────────────────────────────────────────────────────────────────

export interface CollapsibleTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** When true, the trigger forwards its handler to a single child. */
  asChild?: boolean
  children?: React.ReactNode
}

/**
 * Toggle button. With `asChild`, the click handler is cloned onto
 * the child element so a `<Button>` can act as the trigger.
 */
const CollapsibleTrigger = React.forwardRef<
  HTMLButtonElement,
  CollapsibleTriggerProps
>(function CollapsibleTrigger(
  { asChild, onClick, children, ...props },
  ref,
) {
  const ctx = useCollapsibleContext('CollapsibleTrigger')

  const handleClick = React.useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(event)
      if (!event.defaultPrevented) {
        ctx.setOpen(!ctx.open)
      }
    },
    [ctx, onClick],
  )

  if (asChild && React.isValidElement(children)) {
    const childProps = {
      onClick: handleClick,
      'aria-controls': ctx.contentId,
      'aria-expanded': ctx.open,
      'data-slot': 'collapsible-trigger',
      'data-state': ctx.open ? 'open' : 'closed',
    } as const
    return React.cloneElement(children, childProps)
  }

  return (
    <button
      ref={ref}
      type='button'
      aria-controls={ctx.contentId}
      aria-expanded={ctx.open}
      data-slot='collapsible-trigger'
      data-state={ctx.open ? 'open' : 'closed'}
      onClick={handleClick}
      {...props}
    >
      {children}
    </button>
  )
})

// ─── Content ─────────────────────────────────────────────────────────────────

export interface CollapsibleContentProps
  extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode
}

/**
 * The expandable content. Hidden with `display: none` when closed
 * to avoid the layout-shift cost of a CSS animation in production.
 */
const CollapsibleContent = React.forwardRef<
  HTMLDivElement,
  CollapsibleContentProps
>(function CollapsibleContent({ className, children, ...props }, ref) {
  const ctx = useCollapsibleContext('CollapsibleContent')

  if (!ctx.open) return null

  return (
    <div
      ref={ref}
      id={ctx.contentId}
      role='region'
      aria-labelledby={ctx.triggerId}
      data-slot='collapsible-content'
      data-state={ctx.open ? 'open' : 'closed'}
      className={cn('overflow-hidden text-sm', className)}
      {...props}
    >
      {children}
    </div>
  )
})

export { Collapsible, CollapsibleTrigger, CollapsibleContent }