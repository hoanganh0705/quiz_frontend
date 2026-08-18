'use client'

import { Inbox } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { cn } from '@/shared/utils/merge-class-names'

export interface QuizRailEmptyProps {

title: string

description?: string

actionLabel?: string

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
