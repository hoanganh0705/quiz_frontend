import { cn } from "@/shared/utils/merge-class-names";

import type { ReactNode } from "react";

export interface AuthCardLayoutProps {
  testId?: string;
  className?: string;
  children: ReactNode;
}

export function AuthCardLayout({
  testId,
  className,
  children,
}: AuthCardLayoutProps) {
  return (
    <main
      className="min-h-screen flex items-center justify-center bg-background px-4"
      data-testid={testId}
    >
      <div
        className={cn(
          "w-full max-w-md space-y-6 rounded-xl border border-border bg-card p-6 shadow-sm",
          className,
        )}
      >
        {children}
      </div>
    </main>
  );
}

export interface AuthCardSkeletonProps {
  testId?: string;
  rows?: number;
}

export function AuthCardSkeleton({
  testId,
  rows = 2,
}: AuthCardSkeletonProps) {
  return (
    <AuthCardLayout testId={testId}>
      <div className="space-y-2">
        <div className="h-7 w-56 animate-pulse rounded bg-muted" />
        <div className="h-4 w-full animate-pulse rounded bg-muted" />
      </div>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="h-10 w-full animate-pulse rounded bg-muted" />
      ))}
      <div className="h-9 w-full animate-pulse rounded bg-muted" />
    </AuthCardLayout>
  );
}
