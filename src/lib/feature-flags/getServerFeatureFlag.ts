/**
 * Server-side feature flag reader.
 *
 * RSC pages and server actions cannot use React context, so they read flags
 * directly. The `process.env` lookup happens at request time on the server
 * (not at build time) so a redeploy is not needed for an env-only change.
 *
 * This module is server-only. Importing it from a client component is a
 * wiring mistake: it returns the same default value as `getFeatureFlagValue`
 * but the call happens at render time, which is slower and misses overrides
 * that were not serialised into the build.
 *
 * The runtime `import 'server-only'` shim is intentionally not used so this
 * file remains testable in node without an extra dependency; the docblock
 * is the developer-facing signal.
 */
import {
  getFeatureFlagValue,
  type FeatureFlag,
  type FeatureFlagValueMap,
} from './feature-flags';

export function getServerFeatureFlag<K extends FeatureFlag>(
  flag: K,
): FeatureFlagValueMap[K] {
  return getFeatureFlagValue(flag);
}