'use client'

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

export interface CollapsibleProps {

open?: boolean

defaultOpen?: boolean

onOpenChange?: (open: boolean) => void
children?: React.ReactNode
className?: string
}

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

export interface CollapsibleTriggerProps
extends React.ButtonHTMLAttributes<HTMLButtonElement> {

asChild?: boolean
children?: React.ReactNode
}

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

export interface CollapsibleContentProps
extends React.HTMLAttributes<HTMLDivElement> {
children?: React.ReactNode
}

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