"use client";

import { getUserCopy } from "@/lib/api/error-codes";

import { ErrorState } from "@/components/ui/loading-states/ErrorState";

import type { ApiError } from "@/lib/api/core/ApiError";

export type SocialSearchErrorCode =
  | "GLOBAL_UNAUTHENTICATED"
  | "GLOBAL_FORBIDDEN"
  | "GLOBAL_NOT_FOUND"
  | "GLOBAL_INTERNAL_ERROR"
  | "GLOBAL_BAD_REQUEST"
  | "GLOBAL_VALIDATION_FAILED";

export interface SearchErrorStateProps {
  error?: ApiError | null;
  errorCode?: SocialSearchErrorCode;
  onRetry?: () => void;
  className?: string;
}

function buildCodeCopy(code: SocialSearchErrorCode): {
  title: string;
  body: string;
} {
  switch (code) {
    case "GLOBAL_UNAUTHENTICATED":
      return {
        title: "Sign in required",
        body: "Sign in to see social suggestions and search results.",
      };
    case "GLOBAL_FORBIDDEN":
      return {
        title: "Access denied",
        body: "You don't have permission to view this content.",
      };
    case "GLOBAL_NOT_FOUND":
      return {
        title: "Not found",
        body: "We couldn't find what you were looking for.",
      };
    case "GLOBAL_BAD_REQUEST":
      return {
        title: "Invalid search",
        body: "Your search query is invalid. Try a different search.",
      };
    case "GLOBAL_VALIDATION_FAILED":
      return {
        title: "Invalid search",
        body: "Your search query contains invalid characters. Try a different search.",
      };
    case "GLOBAL_INTERNAL_ERROR":
    default:
      return {
        title: "Something went wrong",
        body: "We couldn't load results. Please try again.",
      };
  }
}

export function SearchErrorState({
  error,
  errorCode,
  onRetry,
  className,
}: SearchErrorStateProps): React.ReactElement {
  if (errorCode) {
    const copy = buildCodeCopy(errorCode);
    return (
      <div
        role="alert"
        aria-live="assertive"
        data-testid="search-error-state"
        data-error-code={errorCode}
        className="flex flex-col gap-2 p-6 text-center"
      >
        <p className="text-base font-semibold">{copy.title}</p>
        <p className="text-sm text-muted-foreground">{copy.body}</p>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 mx-auto rounded-md border border-border px-4 py-2 text-sm hover:bg-muted transition-colors"
            data-testid="search-error-retry"
          >
            Try again
          </button>
        ) : null}
      </div>
    );
  }

  const copy = error ? getUserCopy(error.code) : null;
  const title = copy?.title ?? "Something went wrong";
  const message =
    copy?.body ?? "An unexpected error occurred. Please try again.";

  const variant: "network" | "server" | "notFound" | "default" =
    error?.status === 0
      ? "network"
      : error?.status === 404
        ? "notFound"
        : error && error.status >= 500
          ? "server"
          : "default";

  return (
    <div className={className} data-testid="search-error-state">
      <ErrorState
        title={title}
        message={message}
        onRetry={onRetry}
        variant={variant}
        showIcon={true}
      />
    </div>
  );
}
