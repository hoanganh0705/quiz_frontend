'use client';

import type { ReactNode } from 'react';

import { FeatureFlagProvider } from '@/lib/feature-flags';

export function FeatureFlagsProvider({ children }: { children: ReactNode }) {
  return <FeatureFlagProvider>{children}</FeatureFlagProvider>;
}