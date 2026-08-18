

import Link from 'next/link'

import type { TagResponseDto } from '@/lib/api/generated/schemas'

export interface TagBreadcrumbProps {

tag: TagResponseDto

className?: string
}

export function TagBreadcrumb({
tag,
className,
}: TagBreadcrumbProps): React.ReactElement {
return (
<nav
aria-label='Breadcrumb'
className={
className ??
'mb-3 text-sm text-muted-foreground'
      }
data-testid='tag-breadcrumb'
    >
<ol className='flex flex-wrap items-center gap-1'>
<li>
<Link
href='/'
className='hover:text-foreground hover:underline'
          >
Home
          </Link>
</li>
<li aria-hidden='true'>/</li>
<li>
<Link
href='/tags'
className='hover:text-foreground hover:underline'
          >
Tags
          </Link>
</li>
<li aria-hidden='true'>/</li>
<li>
<Link
href={`/tags/${tag.slug}`}
className='hover:text-foreground hover:underline'
data-testid='tag-breadcrumb-canonical'
data-tag-slug={tag.slug}
          >
{tag.name}
</Link>
</li>
</ol>
</nav>
  )
}
