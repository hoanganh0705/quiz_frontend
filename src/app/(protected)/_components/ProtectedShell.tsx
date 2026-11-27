"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { AlertCircle, LogIn, RotateCcw } from "lucide-react";

import { ApiError } from "@/lib/api";

import { useAuthIdentity } from "@/features/auth/hooks/use-auth-session";
import {
  clearAuthToken,
  getAuthToken,
} from "@/features/auth/utils/auth-cookies";

import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";

import { PAGE_CONTAINER_CLASS } from "@/shared/layout/constants";
import { cn } from "@/shared/utils/merge-class-names";

import type { ReactNode } from "react";

export interface ProtectedShellProps {
  children: ReactNode;
}

function isUnauthorizedAuthError(error: Error | null): boolean {
  if (!error) return false;
  if (error instanceof ApiError) {
    return error.status === 401;
  }
  const status = (error as { status?: unknown }).status;
  return status === 401;
}

function getCurrentReturnPath(): string {
  if (typeof window === "undefined") return "/";
  return `${window.location.pathname}${window.location.search}`;
}

export function ProtectedShell({ children }: ProtectedShellProps) {
  const router = useRouter();
  const { currentUser, isLoading, error, refetch } = useAuthIdentity();
  const hasMounted = useRef(false);

  useEffect(() => {
    hasMounted.current = true;
  }, []);

  const hasToken = typeof document !== "undefined" && !!getAuthToken();
  const isTerminalUnauth =
    !isLoading &&
    !currentUser &&
    (!hasToken || !error || isUnauthorizedAuthError(error));
  const isTransientAuthError =
    !isLoading &&
    !currentUser &&
    hasToken &&
    error !== null &&
    !isUnauthorizedAuthError(error);

  useEffect(() => {
    if (!hasMounted.current) return;
    if (!isTerminalUnauth) return;

    if (hasToken) {
      clearAuthToken();
    }
    const returnPath = getCurrentReturnPath();
    router.replace(`/login?redirect=${encodeURIComponent(returnPath)}`);
  }, [hasToken, isTerminalUnauth, router]);

  if (isTransientAuthError) {
    return (
      <div
        role="alert"
        data-protected-shell-state="error"
        className={cn(
          PAGE_CONTAINER_CLASS,
          "flex flex-col items-start justify-center gap-4",
        )}
      >
        <div className="max-w-lg rounded-xl border border-destructive/30 bg-card p-6 shadow-xs space-y-4">
          <div className="flex items-start gap-3">
            <AlertCircle
              className="mt-0.5 h-5 w-5 shrink-0 text-destructive"
              aria-hidden="true"
            />
            <div className="space-y-1">
              <h1 className="text-lg font-bold tracking-tight text-foreground">
                Unable to verify your session
              </h1>
              <p className="text-sm text-muted-foreground">
                We couldn&apos;t reach the server to confirm your account. Retry
                below or sign in again.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => {
                void refetch();
              }}
              className="bg-default hover:bg-default-hover text-default-foreground"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Retry
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/login">
                <LogIn className="h-4 w-4" aria-hidden="true" />
                Sign in again
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading || !currentUser) {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-busy="true"
        data-protected-shell-state="checking"
        className={cn(PAGE_CONTAINER_CLASS, "flex flex-col gap-6")}
      >
        <div className="space-y-2">
          <Skeleton className="h-8 w-52" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        <div className="space-y-3" aria-hidden="true">
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
        <p className="sr-only">Checking authentication...</p>
      </div>
    );
  }

  return (
    <div
      data-protected-route="true"
      data-testid="protected-shell"
      role="region"
      aria-label="Authenticated content"
    >
      {children}
    </div>
  );
}
