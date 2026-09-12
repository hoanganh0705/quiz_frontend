'use client'

/**
 * Shared "feature is on the roadmap" banner used by placeholder admin
 * sub-routes (e.g. `/admin/users` until the user-management surface
 * is wired). Extracted from the inline markup that previously lived
 * on `/admin/users` so other placeholder routes (`/admin/tags`,
 * `/admin/review-reports`, etc.) can reuse the same visual contract
 * without re-inventing the styling.
 *
 * Props:
 *   - `title`       (required) — short heading.
 *   - `description` (required) — paragraph copy. May include inline
 *                    `<code>` for hook names, paths, etc.
 *   - `codexLink?`  — when present, a `code` chip rendering the
 *                    hook name that will eventually back the feature
 *                    (e.g. `useAdminUserList`).
 *   - `cta?`        — optional right-aligned node (e.g. a link to a
 *                    related surface like `/admin/users/roles`).
 *
 * The banner is intentionally minimal: no icons, no animations. It
 * exists to be honest about what is and isn't wired.
 */

import type React from 'react'

interface FeaturePlaceholderBannerProps {
  title: string
  description: React.ReactNode
  codexLink?: string
  cta?: React.ReactNode
  /** Optional test id hook for assertions. */
  testId?: string
}

export function FeaturePlaceholderBanner({
  title,
  description,
  codexLink,
  cta,
  testId,
}: FeaturePlaceholderBannerProps): React.ReactElement {
  return (
    <div
      className='rounded-lg border border-dashed border-border p-8 text-center bg-muted/30'
      data-testid={testId}
    >
      <h2 className='text-lg font-semibold text-foreground'>{title}</h2>
      <div className='text-sm text-muted-foreground mt-2 max-w-md mx-auto'>
        {description}
        {codexLink && (
          <>
            {' '}
            The feature will be backed by{' '}
            <code className='rounded bg-background px-1 py-0.5 text-xs'>
              {codexLink}
            </code>
            .
          </>
        )}
      </div>
      {cta && <div className='mt-4 flex justify-center'>{cta}</div>}
    </div>
  )
}
