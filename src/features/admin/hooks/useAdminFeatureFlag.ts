'use client';

/**
 * `features/admin/hooks/useAdminFeatureFlag.ts`
 *
 * Source epic:   Epic 7.1.
 * Source ticket: TKT-7.1.B5.
 *
 * ## Purpose
 *
 * Convenience hook that reads one of the eight Phase 7 admin flags
 * (`admin_live` or any of the seven sub-flags) and returns a
 * structured document. Consumers wiring an admin page call this
 * instead of importing `getFeatureFlagValue` directly so:
 *
 *   1. The flag type is narrowed — the union is named
 *      `AdminFeatureFlag`.
 *   2. The component can render a "Coming soon" placeholder when the
 *      flag is at its default (`'placeholder'`) without a per-call
 *      `isFeatureEnabled(...)` ceremony.
 *   3. The CI invariant `admin-flag-no-raw-process-env` (in
 *      `admin-lint-invariants.mjs`) can be enforced by locking on the
 *      stable `AdminFeatureFlag` union.
 *
 * ## Cross-tab / cross-revalidation
 *
 *   The hook reads the synchronous `getFeatureFlagValue` reader from
 *   `feature-flags`, which is SSR-safe. When the env-var override
 *   changes (HMR in dev, build-time replacement in prod) the whole
 *   process reloads; there is no runtime mutation to listen for.
 *
 *   For users who flip a flag at runtime via a future admin console,
 *   the cross-tab channel Phase 6 introduced already broadcasts a
 *   `flag_override_changed` event; future batches can wire the hook
 *   to that channel.
 *
 * ## Loading semantics
 *
 *   The hook is synchronous and SSR-safe: `isLive` reflects the
 *   resolved value of the flag at the current render.
 */

import { getFeatureFlagValue } from '@/lib/feature-flags';

export type AdminFeatureFlag =
  | 'admin_live'
  | 'admin_review_moderation_live'
  | 'admin_comment_moderation_live'
  | 'admin_tag_live'
  | 'admin_category_live'
  | 'admin_ranking_live'
  | 'admin_achievement_live'
  | 'admin_tournament_live'
  | 'admin_user_role_live'
  | 'admin_audit_live';

export interface UseAdminFeatureFlag {
  flag: AdminFeatureFlag;
  value: 'live' | 'placeholder';
  isLive: boolean;
  isPlaceholder: boolean;
}

export function useAdminFeatureFlag(flag: AdminFeatureFlag): UseAdminFeatureFlag {
  const value = getFeatureFlagValue(flag);
  const narrowed: 'live' | 'placeholder' =
    value === 'live' ? 'live' : 'placeholder';
  const isLive = narrowed === 'live';
  const isPlaceholder = narrowed === 'placeholder';
  return { flag, value: narrowed, isLive, isPlaceholder };
}
