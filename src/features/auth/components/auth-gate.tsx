"use client";

/**
 * Auth Gate — route protection components.
 *
 * Source epic: Epic 2.5 — Auth bootstrap and full-profile hydration.
 * Source ticket: TKT-2.5.13.
 *
 * ## Purpose
 *
 * Provides gate components that protect routes based on auth and profile state:
 *
 * - `AuthGate` — protects routes requiring authentication
 * - `ProfileGate` — protects routes requiring a loaded profile
 *
 * ## Usage
 *
 * ```tsx
 * // Protect route requiring authentication
 * <AuthGate>
 *   <ProtectedPage />
 * </AuthGate>
 *
 * // Protect route requiring profile
 * <ProfileGate>
 *   <ProfilePage />
 * </ProfileGate>
 * ```
 */

import { type ReactNode } from "react";
import { redirectToLogin } from "@/features/auth/utils/auth-redirect";
import { useAuthBootstrap } from "@/features/auth/contexts/auth-bootstrap-context";
import {
  BootstrapSkeleton,
  ProfileSkeleton,
} from "@/features/auth/components/auth-skeleton";

interface AuthGateProps {
  children: ReactNode;
  fallback?: ReactNode;
  redirectTo?: string;
}

interface ProfileGateProps {
  children: ReactNode;
  fallback?: ReactNode;
  onDegraded?: ReactNode;
}

/**
 * AuthGate — protects routes requiring authentication.
 *
 * Renders children when authenticated, skeleton during bootstrap,
 * and redirects to login when unauthenticated.
 */
export function AuthGate({
  children,
  fallback,
  redirectTo,
}: AuthGateProps) {
  const { bootstrapState, isBootstrapping, isAuthenticated } =
    useAuthBootstrap();

  // During bootstrap, show skeleton
  if (isBootstrapping || bootstrapState === "idle") {
    return fallback ?? <BootstrapSkeleton />;
  }

  // Unauthenticated — redirect to login
  if (!isAuthenticated || bootstrapState === "unauthenticated") {
    // Redirect in useEffect to avoid rendering during SSR
    if (typeof window !== "undefined") {
      redirectToLogin(redirectTo);
    }
    return fallback ?? <BootstrapSkeleton />;
  }

  // Authenticated — render children
  return <>{children}</>;
}

/**
 * ProfileGate — protects routes requiring a loaded profile.
 *
 * Renders children when profile is loaded, skeleton during loading,
 * and fallback when in degraded state (profile failed to load).
 */
export function ProfileGate({
  children,
  fallback,
  onDegraded,
}: ProfileGateProps) {
  const { user, isBootstrapping, isDegraded } = useAuthBootstrap();

  // During loading, show skeleton
  if (isBootstrapping || !user) {
    return (
      fallback ?? (
        <div className="flex items-center justify-center p-8">
          <ProfileSkeleton className="w-full max-w-md" />
        </div>
      )
    );
  }

  // Degraded state — profile failed to load
  if (isDegraded) {
    return (
      onDegraded ?? (
        <div className="flex flex-col items-center justify-center p-8">
          <div className="mb-4 rounded-lg bg-amber-50 p-4 dark:bg-amber-950/20">
            <svg
              className="mx-auto h-12 w-12 text-amber-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h3 className="mb-2 text-lg font-semibold">Profile unavailable</h3>
          <p className="mb-4 text-sm text-muted-foreground text-center">
            Your session is active, but we couldn&apos;t load your profile data.
          </p>
        </div>
      )
    );
  }

  // Profile loaded — render children
  return <>{children}</>;
}

/**
 * DegradedProfileBanner — banner shown when profile is in degraded state.
 */
export function DegradedProfileBanner({
  onRetry,
}: {
  onRetry?: () => void;
}) {
  return (
    <div
      className="flex items-center justify-between rounded-lg bg-amber-50 px-4 py-2 dark:bg-amber-950/20"
      role="alert"
    >
      <div className="flex items-center gap-2">
        <svg
          className="h-5 w-5 text-amber-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
          Profile data unavailable
        </span>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-md bg-amber-100 px-3 py-1 text-sm font-medium text-amber-800 transition-colors hover:bg-amber-200 dark:bg-amber-900/50 dark:text-amber-200 dark:hover:bg-amber-900"
        >
          Retry
        </button>
      )}
    </div>
  );
}
