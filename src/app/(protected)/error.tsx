"use client";

import { useEffect } from "react";
import Link from "next/link";

import { AlertTriangle, Home, RotateCw } from "lucide-react";

import { Button } from "@/components/ui/Button";

import { PAGE_CONTAINER_CLASS } from "@/shared/layout/constants";
import { logger } from "@/shared/log";

export interface ProtectedErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ProtectedError({
  error,
  reset,
}: ProtectedErrorProps): React.ReactElement {
  useEffect(() => {
    logger.error("protected.error-boundary", "Unhandled route error", error);
  }, [error]);

  return (
    <main
      className={`${PAGE_CONTAINER_CLASS} flex items-center justify-center`}
      role="alert"
    >
      <div className="w-full max-w-md rounded-xl border border-destructive/30 bg-card p-6 text-center space-y-4 shadow-xs">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertTriangle className="h-6 w-6" aria-hidden="true" />
        </div>
        <div className="space-y-1.5">
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Something went wrong
          </h1>
          <p className="text-sm text-muted-foreground">
            We hit an unexpected error loading this page. Try again or return
            home.
          </p>
          {error.digest && (
            <p className="font-mono text-xs text-muted-foreground/80">
              Reference: {error.digest}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
          <Button type="button" onClick={reset} size="sm" className="gap-1.5">
            <RotateCw className="h-4 w-4" aria-hidden="true" />
            Try again
          </Button>
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <Link href="/">
              <Home className="h-4 w-4" aria-hidden="true" />
              Back to Home
            </Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
