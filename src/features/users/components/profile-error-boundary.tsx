'use client';

/**
 * ProfileErrorBoundary — error boundary for profile-dependent components.
 *
 * Source epic: Epic 2.5 — Auth bootstrap and full-profile hydration.
 * Source ticket: TKT-2.5.11.
 *
 * ## Purpose
 *
 * Wraps profile-dependent components to handle cases where the profile fails to
 * load (5xx errors) while the user remains authenticated. Shows a fallback UI
 * instead of crashing the entire component tree.
 *
 * ## Usage
 *
 * ```tsx
 * <ProfileErrorBoundary>
 *   <ProfileDependentComponent />
 * </ProfileErrorBoundary>
 * ```
 *
 * ## Props
 *
 * - `children` — The profile-dependent components to wrap
 * - `fallback` — Optional custom fallback component
 * - `onRetry` — Optional callback to retry loading the profile
 */

import { Component, type ReactNode } from 'react';
import { logger } from '@/shared/log';

interface ProfileErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onRetry?: () => void;
}

interface ProfileErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ProfileErrorBoundary extends Component<
  ProfileErrorBoundaryProps,
  ProfileErrorBoundaryState
> {
  constructor(props: ProfileErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ProfileErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log the error for debugging
    logger.error('users.profile-error-boundary', 'caught an error', { error, errorInfo });
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
    this.props.onRetry?.();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          role="alert"
          className="flex flex-col items-center justify-center p-6 text-center"
        >
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
          <h3 className="mb-2 text-lg font-semibold text-foreground">
            Unable to load profile
          </h3>
          <p className="mb-4 text-sm text-muted-foreground">
            Your session is still active, but we couldn&apos;t load your profile
            data. This might be a temporary issue.
          </p>
          <button
            type="button"
            onClick={this.handleRetry}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
