/**
 * FollowButton primitive barrel.
 *
 * Source epic:   Story 3.9 — Follow / unfollow for categories + tags.
 * Source ticket: TKT-3.9.B2.
 *
 * Re-exports the controlled `<FollowButton />` primitive + its
 * `<FollowErrorNotice />` inline notice + the `<FollowButtonSkeleton />`
 * placeholder so the per-feature slot (B5) and the page composition
 * (D1 / D2) can import them from the public `@/components/primitives`
 * barrel without reaching into the FollowButton directory.
 */

export { FollowButton } from './FollowButton';
export type { FollowButtonProps } from './FollowButton';

export { FollowErrorNotice } from './FollowErrorNotice';
export type { FollowErrorNoticeProps } from './FollowErrorNotice';

export { FollowButtonSkeleton } from './FollowButtonSkeleton';
export type { FollowButtonSkeletonProps } from './FollowButtonSkeleton';