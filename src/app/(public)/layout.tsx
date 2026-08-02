/**
 * `(public)` route group layout.
 *
 * Source epic:   Story 3.9 — Follow / unfollow for categories + tags.
 * Source ticket: TKT-3.9.D2.
 *
 * Composes the `<FollowedLookupHydrator />` and `<BookmarksLookupHydrator />`
 * at the top of the children tree so the `useFollowedLookup` and
 * `useBookmarkedQuizIds` SWR caches are populated on the first
 * authenticated render of any public route — including `/quizzes`,
 * quiz detail, `/categories/[idOrSlug]`, `/tags/[slug]`, and the home
 * page.
 *
 * The hydrators are zero-DOM `'use client'` components that mount the
 * lookup's two SWR subscriptions; they do not affect the route's
 * children or layout. Without these hydrators, the follow / bookmark
 * button surfaces would briefly render their loading branches while
 * the lookups hydrate (Story 3.9 AC #1 + Story 3.10 hydration ticket
 * E3 — "reloading the page preserves the followed / bookmarked state
 * via SWR").
 *
 * ## Why `(public)` and not the root layout
 *
 * The hydrators are only relevant for public routes (where follow /
 * bookmark buttons can appear). The `(protected)` route group has its
 * own auth gate and doesn't need the hydrators (no follow or bookmark
 * buttons yet on protected routes). Composing here keeps the protected
 * routes free of the lookups' network footprint.
 *
 * ## Hydrator placement order
 *
 * The order of hydrators in the layout is incidental — both are
 * zero-DOM and SWR-deduped, so they compose without coordination. We
 * follow the existing alphabetical-by-feature convention so the layout
 * remains easy to read as the feature set grows.
 *
 * ## No other layout logic
 *
 * This layout is intentionally minimal — the per-feature layouts
 * (e.g. `categories/layout.tsx`, `tags/layout.tsx`) own the
 * metadata + their own children. The hydrators are the only things
 * this layer contributes.
 */

import type { ReactNode } from 'react'

import { BookmarksLookupHydrator } from '@/features/bookmarks/components/BookmarksLookupHydrator'
import { FollowedLookupHydrator } from '@/features/tags/components/FollowedLookupHydrator'

export default function PublicLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <>
      <FollowedLookupHydrator />
      <BookmarksLookupHydrator />
      {children}
    </>
  )
}