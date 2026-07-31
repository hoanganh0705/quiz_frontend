'use client';

/**
 * AuthSkeleton — skeleton UI for bootstrap loading state.
 *
 * Source epic: Epic 2.5 — Auth bootstrap and full-profile hydration.
 * Source ticket: TKT-2.5.12.
 *
 * ## Purpose
 *
 * Provides skeleton UI components that render during the bootstrap loading state.
 * These skeletons match the final layout dimensions to prevent content flash.
 *
 * ## Usage
 *
 * ```tsx
 * // Identity skeleton (smaller)
 * <AuthSkeleton />
 *
 * // Profile skeleton (larger, includes avatar, stats, etc.)
 * <ProfileSkeleton />
 *
 * // Combined wrapper for protected layouts
 * <BootstrapSkeleton />
 * ```
 */

import { Skeleton } from '@/components/ui/Skeleton';

interface AuthSkeletonProps {
  className?: string;
}

interface ProfileSkeletonProps {
  className?: string;
}

/**
 * AuthSkeleton — compact skeleton for identity-only loading.
 * Matches the header/user dropdown dimensions.
 */
export function AuthSkeleton({ className }: AuthSkeletonProps) {
  return (
    <div className={className} aria-busy="true" aria-label="Loading user data">
      <Skeleton className="h-8 w-8 rounded-full" />
    </div>
  );
}

/**
 * ProfileSkeleton — full skeleton for profile-dependent layouts.
 * Includes avatar, name, and stats placeholders.
 */
export function ProfileSkeleton({ className }: ProfileSkeletonProps) {
  return (
    <div
      className={className}
      aria-busy="true"
      aria-label="Loading profile data"
    >
      <div className="flex items-center gap-4">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
    </div>
  );
}

/**
 * ProfileStatsSkeleton — skeleton for XP and streak stats.
 */
export function ProfileStatsSkeleton({ className }: ProfileSkeletonProps) {
  return (
    <div
      className={className}
      aria-busy="true"
      aria-label="Loading profile stats"
    >
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-4 w-12" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-4 w-12" />
        </div>
      </div>
    </div>
  );
}

/**
 * BootstrapSkeleton — full skeleton for protected layout bootstrap.
 * Includes both auth and profile placeholders.
 */
export function BootstrapSkeleton({ className }: AuthSkeletonProps) {
  return (
    <div
      className={className}
      aria-busy="true"
      aria-label="Loading application"
    >
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-pulse rounded-full bg-muted" />
          <div className="flex flex-col items-center gap-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * CompactSkeleton — minimal skeleton for inline loading states.
 */
export function CompactSkeleton({ className }: AuthSkeletonProps) {
  return (
    <div className={className} aria-busy="true" aria-label="Loading">
      <Skeleton className="h-4 w-20" />
    </div>
  );
}
