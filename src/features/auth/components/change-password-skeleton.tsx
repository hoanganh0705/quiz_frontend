'use client';

import { Skeleton } from '@/components/ui/Skeleton';
import {
Card,
CardContent,
CardHeader,
CardTitle,
} from '@/components/ui/Card';

const SKELETON_FIELD_CLASSES = 'space-y-2';

export function ChangePasswordSkeleton() {
return (
<Card
data-testid='change-password-skeleton'
data-status='loading'
aria-busy='true'
className='mt-6'
    >
<CardHeader>
<CardTitle className='text-xl'>
<Skeleton className='h-6 w-48' />
</CardTitle>
</CardHeader>
<CardContent className='space-y-4' aria-hidden='true'>
{/* Field 1 — current password */}
<div className={SKELETON_FIELD_CLASSES}>
<Skeleton className='h-4 w-36' />
<Skeleton className='h-9 w-full' />
</div>

{/* Field 2 — new password (with strength meter placeholder) */}
<div className={SKELETON_FIELD_CLASSES}>
<Skeleton className='h-4 w-32' />
<Skeleton className='h-9 w-full' />
<Skeleton className='h-1.5 w-full' />
<Skeleton className='h-3 w-3/4' />
</div>

{/* Field 3 — confirm new password */}
<div className={SKELETON_FIELD_CLASSES}>
<Skeleton className='h-4 w-40' />
<Skeleton className='h-9 w-full' />
</div>

{/* Footer — forgot link + submit button */}
<div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-2 border-t border-border'>
<Skeleton className='h-4 w-40' />
<div className='flex gap-2'>
<Skeleton className='h-9 w-20' />
<Skeleton className='h-9 w-32' />
</div>
</div>
</CardContent>
</Card>
  );
}