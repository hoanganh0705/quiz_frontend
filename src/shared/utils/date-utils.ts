

export type DateRangeFilter =
| 'all'
  | 'today'
  | 'week'
  | 'month'
  | '3months'
  | 'year'

export function isWithinDateRange(
date: string,
range: DateRangeFilter
): boolean {
if (range === 'all') return true

const d = new Date(date)
if (isNaN(d.getTime())) return false

const now = new Date()

switch (range) {
case 'today':
return d.toDateString() === now.toDateString()

case 'week': {
const weekAgo = new Date(now)
weekAgo.setDate(weekAgo.getDate() - 7)
return d >= weekAgo
    }

case 'month': {
const monthAgo = new Date(now)
monthAgo.setMonth(monthAgo.getMonth() - 1)
return d >= monthAgo
    }

case '3months': {
const ago = new Date(now)
ago.setMonth(ago.getMonth() - 3)
return d >= ago
    }

case 'year': {
const yearAgo = new Date(now)
yearAgo.setFullYear(yearAgo.getFullYear() - 1)
return d >= yearAgo
    }

default:
return true
  }
}

export function formatRelativeTime(dateString: string): string {
const date = new Date(dateString)
if (isNaN(date.getTime())) return dateString

const now = new Date()
const diffMs = now.getTime() - date.getTime()
const diffMins = Math.floor(diffMs / (1000 * 60))
const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

if (diffMins < 1) return 'Just now'
if (diffMins < 60) return `${diffMins} min ago`
if (diffHours < 24)
return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
return date.toLocaleDateString()
}
