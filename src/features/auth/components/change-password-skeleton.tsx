'use client';

/**
 * `ChangePasswordSkeleton` — stable loading footprint for the
 * change-password card.
 *
 * Source epic: Epic 2.9 — Password re-verification and password change.
 * Source ticket: 2.9.T12.
 *
 * ## Why this exists
 *
 * Reserves vertical space so the loading → populated transition
 * does not shift the page layout. The populated card has three
 * labeled rows + a submit row; the skeleton mirrors that footprint
 * exactly.
 *
 * The card is mounted only after a successful verify-password
 * confirmation (T14), so the `'loading'` state that uses this
 * skeleton is reserved for the rare cases where the hook's
 * initial fetch is in flight (currently unused — the hook returns
 * idle immediately). The skeleton is therefore a defensive
 * precaution against future lazy-loading paths.
 *
 * ## Footprint discipline
 *
 * The skeleton mirrors the populated card's grid:
 *
 *   - 3 labeled rows with an input bar (label height matches
 *     `text-sm font-medium`; input bar matches `h-9` from the
 *     `<Input>` primitive)
 *   - 1 footer row with a forgot-link placeholder + a CTA
 *     placeholder
 *
 * ## Accessibility
 *
 * `aria-hidden="true"` on the placeholder rows; `aria-busy="true"`
 * on the outer wrapper. The card's label/title text is rendered
 * from the populated header even when the skeleton is showing —
 * the placeholder rows are skipped by screen readers.
 *
 * @see ChangePasswordCard (2.9.T11)
 */

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