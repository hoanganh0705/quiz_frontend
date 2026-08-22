'use client'

import { useState } from 'react'
import { Filter } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { Label } from '@/components/ui/Label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/RadioGroup'
import {
Select,
SelectContent,
SelectItem,
SelectTrigger,
SelectValue
} from '@/components/ui/Select'
import {
Sheet,
SheetClose,
SheetContent,
SheetHeader,
SheetTitle,
SheetTrigger
} from '@/components/ui/Sheet'
import type { CategoryResponseDto, TagResponseDto } from '@/lib/api/generated/schemas'
import type {
QuizDifficultyFilter,
QuizFilterUrlState,
QuizSort
} from '@/features/quizzes/types/quiz-filter-params'
import { QUIZ_SORT_VALUES } from '@/features/quizzes/types/quiz-filter-params'

import { cn } from '@/shared/utils/merge-class-names'

export interface FilterBarProps {
state: QuizFilterUrlState
categories: readonly CategoryResponseDto[]
tags: readonly TagResponseDto[]
onChange: (next: QuizFilterUrlState) => void
className?: string
}

const DIFFICULTY_OPTIONS: Array<{
value: QuizDifficultyFilter
label: string
id: string
}> = [
{ value: 'all', label: 'All levels', id: 'difficulty-all' },
{ value: 'easy', label: 'Easy', id: 'difficulty-easy' },
{ value: 'medium', label: 'Medium', id: 'difficulty-medium' },
{ value: 'hard', label: 'Hard', id: 'difficulty-hard' }
]

const SORT_LABELS: Record<QuizSort, string> = {
newest: 'Newest',
popular: 'Popular',
top_rated: 'Top rated',
trending: 'Trending'
}

const ALL_CATEGORIES_VALUE = '__all__'
const DEFAULT_SORT_VALUE = '__default__'
const MAX_VISIBLE_TAGS = 10

export function FilterBar({
state,
categories,
tags,
onChange,
className
}: FilterBarProps): React.ReactElement {
return (
<div className={cn('w-full', className)} data-testid='filter-bar'>
{/* Desktop layout: visible at `md` and above */}
<div className='hidden md:block' data-testid='filter-bar-desktop'>
<FilterBarContent
state={state}
categories={categories}
tags={tags}
onChange={onChange}
        />
</div>
{/* Mobile layout: Sheet via "Filters" button */}
<div className='md:hidden' data-testid='filter-bar-mobile'>
<FilterBarMobileSheet
state={state}
categories={categories}
tags={tags}
onChange={onChange}
        />
</div>
</div>
  )
}

interface FilterBarContentProps {
state: QuizFilterUrlState
categories: readonly CategoryResponseDto[]
tags: readonly TagResponseDto[]
onChange: (next: QuizFilterUrlState) => void
className?: string
}

function FilterBarContent({
state,
categories,
tags,
onChange,
className
}: FilterBarContentProps): React.ReactElement {
const selectedSlugs = state.tagSlugs ?? []
const selectedTagIds = new Set(selectedSlugs)
const [showAllTags, setShowAllTags] = useState(false)

const toggleTag = (slug: string) => {
const next = new Set(selectedSlugs)
if (next.has(slug)) {
next.delete(slug)
    } else {
next.add(slug)
    }
onChange({
...state,
tagSlugs: next.size > 0 ? Array.from(next) : undefined
    })
  }

const visibleTags = showAllTags ? tags : tags.slice(0, MAX_VISIBLE_TAGS)
const hiddenTagCount = tags.length - MAX_VISIBLE_TAGS

return (
<div
className={cn(
'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4',
className
      )}
    >
{/* Category dropdown */}
<div className='flex flex-col gap-1.5'>
<Label htmlFor='filter-bar-category'>Category</Label>
<Select
value={state.categoryId ?? ALL_CATEGORIES_VALUE}
onValueChange={(value) => {
onChange({
...state,
categoryId:
value === ALL_CATEGORIES_VALUE ? undefined : value
            })
          }}
        >
<SelectTrigger id='filter-bar-category' data-testid='filter-bar-category-trigger'>
<SelectValue placeholder='All categories' />
</SelectTrigger>
<SelectContent>
<SelectItem value={ALL_CATEGORIES_VALUE}>
All categories
            </SelectItem>
{categories.map((category) => (
<SelectItem
key={category.categoryId}
value={category.categoryId}
              >
{category.name}
</SelectItem>
            ))}
</SelectContent>
</Select>
</div>

{/* Sort dropdown */}
<div className='flex flex-col gap-1.5'>
<Label htmlFor='filter-bar-sort'>Sort</Label>
<Select
value={state.sort ?? DEFAULT_SORT_VALUE}
onValueChange={(value) => {
onChange({
...state,
sort:
value === DEFAULT_SORT_VALUE
? undefined
: (value as QuizSort)
            })
          }}
        >
<SelectTrigger id='filter-bar-sort' data-testid='filter-bar-sort-trigger'>
<SelectValue placeholder='Default' />
</SelectTrigger>
<SelectContent>
<SelectItem value={DEFAULT_SORT_VALUE}>Default</SelectItem>
{QUIZ_SORT_VALUES.map((sortValue) => (
<SelectItem key={sortValue} value={sortValue}>
{SORT_LABELS[sortValue]}
</SelectItem>
            ))}
</SelectContent>
</Select>
</div>

{/* Difficulty radio group */}
<div className='flex flex-col gap-1.5'>
<Label>Difficulty</Label>
<RadioGroup
value={state.difficulty ?? 'all'}
onValueChange={(value) => {
onChange({
...state,
difficulty:
value === 'all' ? undefined : (value as 'easy' | 'medium' | 'hard')
            })
          }}
aria-label='Filter by difficulty'
className='mt-2'
data-testid='filter-bar-difficulty'
        >
{DIFFICULTY_OPTIONS.map((option) => (
<div
key={option.value}
className='flex items-center space-x-2'
            >
<RadioGroupItem
value={option.value ?? 'all'}
id={
option.id === 'difficulty-all'
? 'filter-bar-difficulty-all'
: option.id === 'difficulty-easy'
? 'filter-bar-difficulty-easy'
: option.id === 'difficulty-medium'
? 'filter-bar-difficulty-medium'
: 'filter-bar-difficulty-hard'
                }
              />
<Label
htmlFor={
option.id === 'difficulty-all'
? 'filter-bar-difficulty-all'
: option.id === 'difficulty-easy'
? 'filter-bar-difficulty-easy'
: option.id === 'difficulty-medium'
? 'filter-bar-difficulty-medium'
: 'filter-bar-difficulty-hard'
                }
              >
{option.label}
</Label>
</div>
          ))}
</RadioGroup>
</div>

{/* Tag multi-select via pills */}
<div className='flex flex-col gap-1.5 sm:col-span-2 lg:col-span-1'>
<Label>Tags</Label>
<div
className='flex flex-wrap items-center gap-2 rounded-md border border-input bg-background p-2'
data-testid='filter-bar-tags'
        >
{visibleTags.length === 0 ? (
<span className='text-xs text-muted-foreground'>No tags</span>
          ) : (
visibleTags.map((tag) => {
const isSelected = selectedTagIds.has(tag.slug)
return (
<button
key={tag.tagId}
type='button'
onClick={() => toggleTag(tag.slug)}
aria-pressed={isSelected}
className={cn(
'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
isSelected
? 'border-primary bg-primary text-primary-foreground'
: 'bg-background hover:bg-accent'
                  )}
data-testid='filter-bar-tag-pill'
data-tag-slug={tag.slug}
data-selected={isSelected ? 'true' : 'false'}
                >
              <span
                aria-hidden='true'
                className={cn(
                  'inline-block h-2 w-2 rounded-full',
                  swatchClassFromTagId(tag.tagId)
                )}
              />
<span>{tag.name}</span>
</button>
              )
            })
          )}
{hiddenTagCount > 0 && !showAllTags && (
<button
type='button'
onClick={() => setShowAllTags(true)}
className='rounded text-xs text-muted-foreground underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
data-testid='filter-bar-tags-show-more'
            >
+{hiddenTagCount} more
            </button>
          )}
</div>
</div>
</div>
  )
}

function FilterBarMobileSheet({
  state,
  categories,
  tags,
  onChange,
}: FilterBarContentProps): React.ReactElement {
  const hasFilters = Boolean(
    state.categoryId ||
    (state.tagSlugs && state.tagSlugs.length > 0) ||
    state.sort ||
    (state.difficulty && state.difficulty !== 'all'),
  )
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant='outline'
          data-testid='filter-bar-mobile-trigger'
          className='w-full'
        >
          <Filter className='mr-2 h-4 w-4' aria-hidden='true' />
          Filters
          {hasFilters ? (
            <span
              aria-hidden='true'
              className='ml-2 inline-flex h-2 w-2 rounded-full bg-primary'
            />
          ) : null}
        </Button>
      </SheetTrigger>
      <SheetContent side='right' className='w-full sm:max-w-md'>
        <SheetHeader>
          <SheetTitle>Filters</SheetTitle>
        </SheetHeader>
        <div className='flex-1 overflow-y-auto p-4'>
          <FilterBarContent
            state={state}
            categories={categories}
            tags={tags}
            onChange={onChange}
          />
        </div>
        <div className='flex gap-2 border-t p-4'>
          <Button
            variant='ghost'
            disabled={!hasFilters}
            onClick={() => onChange({})}
            data-testid='filter-bar-mobile-clear'
            className='shrink-0'
          >
            Clear filters
          </Button>
          <SheetClose asChild>
            <Button className='flex-1' data-testid='filter-bar-mobile-apply'>
              Done
            </Button>
          </SheetClose>
        </div>
      </SheetContent>
    </Sheet>
  )
}

const TAG_SWATCH_CLASSES = [
  'bg-tag-swatch-1',
  'bg-tag-swatch-2',
  'bg-tag-swatch-3',
  'bg-tag-swatch-4',
  'bg-tag-swatch-5'
] as const

function swatchClassFromTagId(tagId: string): string {
  let hash = 0
  for (let i = 0; i < tagId.length; i += 1) {
    hash = (hash * 31 + tagId.charCodeAt(i)) >>> 0
  }
  const index = hash % TAG_SWATCH_CLASSES.length
  return TAG_SWATCH_CLASSES[index]!
}
