'use client'

import type React from 'react'
import { MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import {
DropdownMenu,
DropdownMenuContent,
DropdownMenuItem,
DropdownMenuLabel,
DropdownMenuSeparator,
DropdownMenuTrigger
} from '@/components/ui/DropdownMenu'
import {
Table,
TableBody,
TableCell,
TableHead,
TableHeader,
TableRow
} from '@/components/ui/Table'
import { Search } from 'lucide-react'

interface AdminTableColumn<T> {
key: string
header: string
render?: (item: T) => React.ReactNode
className?: string
}

interface AdminTableActions<T> {
label: string
icon: React.ElementType
onClick: (item: T) => void
variant?: 'default' | 'destructive'
}

interface AdminTableProps<T> {
  data: T[]
  columns: ReadonlyArray<AdminTableColumn<T>>
  actions?: AdminTableActions<T>[]
  searchPlaceholder?: string
  onSearchChange?: (value: string) => void
  searchValue?: string
  isLoading?: boolean
  emptyTitle?: string
  emptyDescription?: string
  /**
   * Stable identity for each row. Required when `data` can be filtered,
   * paginated, or reordered — using array indices as React keys causes
   * stale state and incorrect focus retention. Falls back to a JSON-derived
   * hash, then to the array index as a last resort.
   */
  getRowKey?: (item: T, index: number) => string
}

function defaultGetRowKey<T>(item: T, index: number): string {
  if (item && typeof item === 'object') {
    const candidate = (item as Record<string, unknown>).id
    if (typeof candidate === 'string' || typeof candidate === 'number') {
      return String(candidate)
    }
  }
  try {
    return `row-${JSON.stringify(item)}-${index}`
  } catch {
    return `row-${index}`
  }
}

export function AdminTable<T>({
  data,
  columns,
  actions = [],
  searchPlaceholder = 'Search...',
  onSearchChange,
  searchValue = '',
  isLoading = false,
  emptyTitle = 'No data found',
  emptyDescription = 'There are no items to display at this time.',
  getRowKey = defaultGetRowKey,
}: AdminTableProps<T>) {
  const hasActions = actions.length > 0

  return (
    <div className='space-y-4'>
      {onSearchChange && (
        <div className='flex items-center gap-3'>
          <div className='relative flex-1 max-w-sm'>
            <Search
              className='absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4'
              aria-hidden='true'
            />
            <Input
              type='search'
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              className='pl-10 bg-background border-border text-foreground placeholder-muted-foreground text-sm max-w-sm'
            />
          </div>
<div className='ml-auto'>
<span className='text-sm text-muted-foreground'>
{data.length} item{data.length !== 1 ? 's' : ''}
</span>
</div>
</div>
      )}

<div className='rounded-lg border border-border overflow-hidden'>
<Table>
<TableHeader>
<TableRow className='hover:bg-muted/50 border-border bg-muted/30'>
              {columns.map((col) => (
                <TableHead key={col.key} className={col.className} aria-sort='none'>
                  {col.header}
                </TableHead>
              ))}
{hasActions && <TableHead className='w-12' />}
</TableRow>
</TableHeader>
<TableBody>
{isLoading ? (
Array.from({ length: 5 }).map((_, idx) => (
<TableRow key={idx} className='border-border'>
{columns.map((col) => (
<TableCell key={col.key}>
<div className='h-4 w-24 bg-muted rounded animate-pulse' />
</TableCell>
                  ))}
{hasActions && <TableCell />}
</TableRow>
              ))
            ) : data.length === 0 ? (
<TableRow className='border-border'>
<TableCell
colSpan={columns.length + (hasActions ? 1 : 0)}
className='h-40 text-center'
                >
<p className='text-sm font-medium text-foreground'>{emptyTitle}</p>
<p className='text-xs text-muted-foreground mt-1'>{emptyDescription}</p>
</TableCell>
</TableRow>
            ) : (
data.map((item, index) => (
              <TableRow
                key={getRowKey(item, index)}
                className='border-border hover:bg-muted/30'
              >
{columns.map((col) => (
<TableCell key={col.key} className={col.className}>
{col.render
? col.render(item)
: (item as Record<string, unknown>)[col.key]?.toString() ?? '—'}
</TableCell>
                  ))}
{hasActions && (
<TableCell>
<DropdownMenu>
<DropdownMenuTrigger asChild>
<Button
variant='ghost'
size='icon'
className='h-8 w-8 text-muted-foreground hover:text-foreground'
                          >
<MoreHorizontal className='h-4 w-4' />
<span className='sr-only'>Open menu</span>
</Button>
</DropdownMenuTrigger>
<DropdownMenuContent align='end' className='w-40'>
<DropdownMenuLabel>Actions</DropdownMenuLabel>
<DropdownMenuSeparator />
{actions.map((action, idx) => {
const Icon = action.icon
return (
<DropdownMenuItem
key={idx}
onClick={() => action.onClick(item)}
className={
action.variant === 'destructive'
? 'text-destructive focus:text-destructive'
: ''
                                }
                              >
<Icon className='mr-2 h-4 w-4' />
{action.label}
</DropdownMenuItem>
                            )
                          })}
</DropdownMenuContent>
</DropdownMenu>
</TableCell>
                  )}
</TableRow>
              ))
            )}
</TableBody>
</Table>
</div>
</div>
  )
}
