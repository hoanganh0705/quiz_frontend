'use client';

/**
 * `<FollowButton />` — the controlled follow / unfollow primitive.
 *
 * Source epic:   Story 3.9 — Follow / unfollow for categories + tags.
 * Source ticket: TKT-3.9.B2.
 *
 * ## What this primitive owns
 *
 *   - The disabled / aria / `data-testid` shape so the same primitive
 *     can be reused by the category and tag surfaces (B3 / B4 wire
 *     B1's hook to this primitive via the per-feature slot in B5).
 *   - The four branches: unauthenticated (disabled + tooltip),
 *     following (secondary variant), not-following (default variant),
 *     pending (disabled + busy, text from previous state).
 *   - The inline `<FollowErrorNotice />` rendered in the same DOM
 *     region above the button — no CLS.
 *
 * ## What this primitive does NOT own
 *
 *   - The optimistic update + rollback discipline (B1's
 *     `useOptimisticToggle` owns it; the slot components B5 wire
 *     B1's hook to this primitive via props).
 *   - The auth state — the parent passes `isAuthenticated` as a prop
 *     (B2 AC #10 keeps the primitive reusable outside the auth-aware
 *     slot composition).
 *   - The 429-backoff wrapper — the global `errorRetryCount: 3`
 *     policy in `SwrProvider` retries 429s before exposing them to
 *     B1; once exposed, the primitive treats them via
 *     `<FollowErrorNotice />`.
 */

import { Button } from '@/components/ui/Button';
import type { OptimisticToggleErrorKind } from '@/lib/api';
import { cn } from '@/shared/utils/merge-class-names';

import { FollowErrorNotice } from './FollowErrorNotice';

const SIGN_IN_TOOLTIP = 'Sign in to follow';

const FOLLOWING_TEST_ID = 'follow-button-following';
const NOT_FOLLOWING_TEST_ID = 'follow-button-not-following';
const SIGN_IN_TEST_ID = 'follow-button-signin-tooltip';

const BUTTON_BASE =
  'h-9 min-w-28 px-4 text-sm font-medium transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'

export interface FollowButtonProps {
  /**
   * Whether the authenticated user currently follows the entity.
   * The slot (B5) reads this from `useIsFollowingCategory` /
   * `useIsFollowingTag` (B3).
   */
  isFollowing: boolean;
  /**
   * Whether the user is authenticated. `false` renders the disabled
   * branch (no click action — the parent must pass a no-op
   * `onToggle`).
   */
  isAuthenticated: boolean;
  /**
   * Whether the most recent `toggle()` call is in-flight (the
   * `status === 'pending'` branch from `useOptimisticToggle`).
   * The primitive renders the busy state with the text from the
   * *previous* state (no flicker — Story 3.9 AC #3).
   */
  isPending: boolean;
  /**
   * The error kind from the most recent reverted toggle. `null`
   * renders no inline notice. The primitive owns the `<FollowErrorNotice />`
   * rendering in the same DOM region so it does NOT introduce CLS.
   */
  errorKind: OptimisticToggleErrorKind | null;
  /**
   * The click handler. The parent wires `onToggle={isFollowing ? unfollow : follow}`
   * via the per-feature hooks (B4). The primitive does NOT call any
   * auth / network hook directly.
   */
  onToggle: () => void;
  /**
   * Optional label override. Defaults to `'Follow'` / `'Following'`.
   * The per-feature slot (B5) uses the default; the page composition
   * (D1 / D2) may override to add an icon-aria-label.
   */
  label?: string;
  /**
   * Optional className applied to the outer flex column wrapper.
   */
  className?: string;
}

/**
 * Map `(isFollowing, isAuthenticated, isPending)` to the button label
 * AND the variant. The label is the text from the *previous* state
 * when `isPending` is true (Story 3.9 AC #3 — no flicker).
 */
function resolveVisualState(
  isFollowing: boolean,
  isAuthenticated: boolean,
  isPending: boolean,
): {
  disabled: boolean
  ariaBusy: boolean
  text: string
  variant: 'default' | 'secondary'
  testId: string
  ariaPressed: boolean | undefined
  title: string | undefined
  ariaDescribedBy: string | undefined
} {
  // 1. Unauthenticated branch — disabled + tooltip.
  if (!isAuthenticated) {
    return {
      disabled: true,
      ariaBusy: false,
      text: 'Follow',
      variant: 'default',
      testId: SIGN_IN_TEST_ID,
      ariaPressed: undefined,
      title: SIGN_IN_TOOLTIP,
      ariaDescribedBy: 'follow-button-signin-tooltip-description',
    }
  }

  // 2. Pending branch — disabled + busy; text from the *previous*
  //    state so the user does not see the label flip during the
  //    in-flight window (no flicker — Story 3.9 AC #3).
  if (isPending) {
    return {
      disabled: true,
      ariaBusy: true,
      text: isFollowing ? 'Following' : 'Follow',
      variant: isFollowing ? 'secondary' : 'default',
      testId: isFollowing ? FOLLOWING_TEST_ID : NOT_FOLLOWING_TEST_ID,
      ariaPressed: isFollowing,
      title: undefined,
      ariaDescribedBy: undefined,
    }
  }

  // 3. Authenticated + not pending — render the resolved state.
  if (isFollowing) {
    return {
      disabled: false,
      ariaBusy: false,
      text: 'Following',
      variant: 'secondary',
      testId: FOLLOWING_TEST_ID,
      ariaPressed: true,
      title: undefined,
      ariaDescribedBy: undefined,
    }
  }

  return {
    disabled: false,
    ariaBusy: false,
    text: 'Follow',
    variant: 'default',
    testId: NOT_FOLLOWING_TEST_ID,
    ariaPressed: false,
    title: undefined,
    ariaDescribedBy: undefined,
  }
}

export function FollowButton({
  isFollowing,
  isAuthenticated,
  isPending,
  errorKind,
  onToggle,
  label,
  className,
}: FollowButtonProps) {
  const visual = resolveVisualState(isFollowing, isAuthenticated, isPending)

  // Stable click handler — wraps the parent's `onToggle` so the
  // unauthenticated branch can short-circuit to a no-op without the
  // parent wiring two callbacks (B2 AC #2 + AC #6).
  const handleClick = () => {
    if (!isAuthenticated || isPending) return
    onToggle()
  }

  // The description for the sign-in tooltip — also referenced via
  // `aria-describedby` on the button so screen readers announce
  // the tooltip on focus.
  const tooltipDescriptionId = 'follow-button-signin-tooltip-description'

  return (
    <div
      className={cn('flex flex-col items-start gap-1', className)}
      data-testid='follow-button-slot'
    >
      {errorKind !== null && errorKind !== 'unknown' ? (
        <FollowErrorNotice errorKind={errorKind} />
      ) : null}
      <Button
        type='button'
        variant={visual.variant}
        disabled={visual.disabled}
        aria-busy={visual.ariaBusy ? 'true' : undefined}
        aria-pressed={visual.ariaPressed}
        aria-disabled={visual.disabled ? 'true' : undefined}
        aria-describedby={
          visual.ariaDescribedBy ? tooltipDescriptionId : undefined
        }
        title={visual.title}
        data-testid={visual.testId}
        data-following={isFollowing ? 'true' : 'false'}
        data-authenticated={isAuthenticated ? 'true' : 'false'}
        data-pending={isPending ? 'true' : 'false'}
        onClick={handleClick}
        className={BUTTON_BASE}
      >
        {label ?? visual.text}
      </Button>
      {/* The hidden description node for the sign-in tooltip. */}
      {visual.ariaDescribedBy ? (
        <span
          id={tooltipDescriptionId}
          className='sr-only'
          data-testid='follow-button-signin-tooltip-description'
        >
          {SIGN_IN_TOOLTIP}
        </span>
      ) : null}
    </div>
  )
}

/**
 * Re-export the error-kind type so consumers can import it from
 * the primitive's barrel without reaching into `@/lib/api`. The
 * primitive is the canonical consumer; the slot composition (B5)
 * imports from here.
 */
export type { OptimisticToggleErrorKind }
// Re-export from the lib/api barrel so the primitive is the only
// place a follow-button consumer ever imports the type.
export type { FollowErrorNoticeProps } from './FollowErrorNotice'