'use client'

import { useEffect, useState } from 'react'

export type ClientDateMode = 'date' | 'time' | 'datetime'

export interface ClientDateProps {

value: string | number | Date

mode?: ClientDateMode

locale?: string

options?: Intl.DateTimeFormatOptions

fallback?: string

className?: string
}

export function ClientDate({
value,
mode = 'date',
locale,
options,
fallback = '',
className,
}: ClientDateProps): React.ReactElement {
const [hydrated, setHydrated] = useState(false)

useEffect(() => {
setHydrated(true)
  }, [])

const date = value instanceof Date ? value : new Date(value)
if (isNaN(date.getTime())) {
return <span className={className}>{fallback}</span>
  }

if (!hydrated) {
return <span className={className}>{date.toISOString()}</span>
  }

const resolvedLocale = locale ?? (typeof navigator !== 'undefined' ? navigator.language : undefined)
const mergedOptions: Intl.DateTimeFormatOptions = options ?? defaultOptions(mode)
const formatted = new Intl.DateTimeFormat(resolvedLocale, mergedOptions).format(date)

return <span className={className}>{formatted}</span>
}

function defaultOptions(mode: ClientDateMode): Intl.DateTimeFormatOptions {
switch (mode) {
case 'time':
return { hour: '2-digit', minute: '2-digit' }
case 'datetime':
return {
year: 'numeric',
month: 'short',
day: 'numeric',
hour: '2-digit',
minute: '2-digit',
      }
case 'date':
default:
return { year: 'numeric', month: 'short', day: 'numeric' }
  }
}