'use client';

import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { getAuthToken } from '@/features/auth/utils/auth-cookies';

export interface ProtectedShellProps {
  children: ReactNode;
}

export function ProtectedShell({ children }: ProtectedShellProps) {
  const router = useRouter();
  const { currentUser, isLoading } = useAuth();
  const hasMounted = useRef(false);

  useEffect(() => {
    hasMounted.current = true;
  }, []);

  // Redirect to login only when:
  // 1. Auth check is complete (not loading)
  // 2. No user data AND no valid token
  // This prevents redirect loops when user data is loading or when we have a token but /auth/me hasn't resolved
  useEffect(() => {
    if (!hasMounted.current) return;

    const hasToken = !!getAuthToken();

    if (!isLoading && !currentUser && !hasToken) {
      // No token and no user data = not authenticated, redirect to login
      const currentPath = window.location.pathname;
      router.replace(`/login?redirect=${encodeURIComponent(currentPath)}`);
    }
  }, [isLoading, currentUser, router]);

  // Show loading state while auth is being checked
  // We don't redirect here - we wait for the auth check to complete
  if (isLoading || !currentUser) {
    return (
      <div
        role='status'
        aria-live='polite'
        data-protected-shell-state='checking'
        style={{
          padding: '2rem',
          textAlign: 'center',
          opacity: 0.7,
        }}
      >
        Checking authentication...
      </div>
    );
  }

  return (
    <div
      data-protected-route='true'
      data-testid='protected-shell'
      role='region'
      aria-label='Authenticated content'
    >
      {children}
    </div>
  );
}