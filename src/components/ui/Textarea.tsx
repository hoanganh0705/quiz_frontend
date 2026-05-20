import * as React from 'react'

import { cn } from '@/shared/utils/merge-class-names'

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot='textarea'
      className={cn(
        'border-input placeholder:text-muted-foreground focus-visible:border-default  dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive bg-background flex field-sizing-content min-h-16 w-full rounded-md border px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
