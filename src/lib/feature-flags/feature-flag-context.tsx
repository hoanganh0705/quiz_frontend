/**
 * Client-side feature flag context.
 *
 * Reads every `NEXT_PUBLIC_*` flag once on mount, memoises the resulting map,
 * and exposes `useFeatureFlag(name)` so components do not re-read
 * `process.env` on every render. The Provider must wrap the application
 * root; without it `useFeatureFlag` throws to surface the wiring mistake.
 *
 * Server components continue to read flags via `getServerFeatureFlag()`
 * because RSC cannot use React context.
 */
'use client';

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';

import {
  FEATURE_FLAGS,
  getFeatureFlagValue,
  type FeatureFlag,
  type FeatureFlagValueMap,
} from './feature-flags';

const FeatureFlagContext = createContext<FeatureFlagValueMap | null>(null);

export interface FeatureFlagProviderProps {
  children: ReactNode;
}

export function FeatureFlagProvider({ children }: FeatureFlagProviderProps) {
  const value = useMemo<FeatureFlagValueMap>(() => {
    const map = {} as Record<FeatureFlag, FeatureFlagValueMap[FeatureFlag]>;
    for (const flag of FEATURE_FLAGS) {
      map[flag] = getFeatureFlagValue(flag);
    }
    return map as FeatureFlagValueMap;
  }, []);

  return (
    <FeatureFlagContext.Provider value={value}>
      {children}
    </FeatureFlagContext.Provider>
  );
}

/**
 * Returns the resolved value for a flag. Throws when used outside of a
 * `<FeatureFlagProvider>` so wiring mistakes surface during development.
 */
export function useFeatureFlag<K extends FeatureFlag>(
  flag: K,
): FeatureFlagValueMap[K] {
  const ctx = useContext(FeatureFlagContext);
  if (ctx === null) {
    throw new Error(
      'useFeatureFlag must be called inside <FeatureFlagProvider>.',
    );
  }
  return ctx[flag];
}