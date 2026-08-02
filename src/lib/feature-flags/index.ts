/**
 * Feature-flags barrel.
 *
 * Source epic:   Epic 3.12 — `/daily-challenge` read-only render.
 * Source ticket: TKT-3.12.A2.
 *
 * Re-exports the public surface of the feature-flags implementation
 * so consumers can import from the stable per-feature path:
 *
 *   import { getFeatureFlagValue, isFeatureEnabled } from '@/lib/feature-flags'
 *
 * Mirrors the `@/lib/api` barrel convention (Epic 1.2 / TKT-1.2.1.1).
 */

export {
  FEATURE_FLAGS,
  getFeatureFlagValue,
  isFeatureEnabled,
} from './feature-flags'
export type {
  FeatureFlag,
  FeatureFlagValueMap,
} from './feature-flags'
