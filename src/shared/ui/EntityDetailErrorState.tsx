"use client";

import Link from "next/link";

import { Home, RotateCcw, Search } from "lucide-react";

import { PAGE_GUTTER_CLASS } from "@/shared/layout/constants";

import { Button } from "@/components/ui/Button";

export interface EntityDetailNotFoundProps {
  entityTitle: string;
  entityNoun: string;
  browseHref: string;
  browseLabel: string;
  testId: string;
}

export function EntityDetailNotFound({
  entityTitle,
  entityNoun,
  browseHref,
  browseLabel,
  testId,
}: EntityDetailNotFoundProps): React.ReactElement {
  return (
    <div
      className={`${PAGE_GUTTER_CLASS} flex min-h-[70vh] items-center justify-center py-4 md:py-8 lg:py-12`}
      data-testid={testId}
    >
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <h1 className="font-mono text-7xl sm:text-8xl font-bold text-default mb-2 tabular-nums">
            404
          </h1>
          <div className="w-16 h-1 bg-default mx-auto rounded-full" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">
          {entityTitle} Not Found
        </h2>
        <p className="text-foreground-secondary mb-8">
          The {entityNoun} you&apos;re looking for doesn&apos;t exist or has
          been removed.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            asChild
            className="bg-default hover:bg-default-hover text-default-foreground"
          >
            <Link href="/">
              <Home className="w-4 h-4 mr-2" aria-hidden="true" />
              Go Home
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={browseHref}>
              <Search className="w-4 h-4 mr-2" aria-hidden="true" />
              {browseLabel}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

export interface EntityDetailErrorStateProps {
  entityNoun: string;
  testId: string;
  retryTestId: string;
  onRetry: () => void;
}

export function EntityDetailErrorState({
  entityNoun,
  testId,
  retryTestId,
  onRetry,
}: EntityDetailErrorStateProps): React.ReactElement {
  return (
    <div
      className={`${PAGE_GUTTER_CLASS} flex min-h-[70vh] items-center justify-center py-4 md:py-8 lg:py-12`}
      data-testid={testId}
    >
      <div className="max-w-md w-full text-center">
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Something went wrong
        </h2>
        <p className="text-foreground-secondary mb-6">
          We couldn&apos;t load this {entityNoun}. Please try again.
        </p>
        <Button
          variant="outline"
          onClick={onRetry}
          data-testid={retryTestId}
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Retry
        </Button>
      </div>
    </div>
  );
}
