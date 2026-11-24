"use client";

import { AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { ApiError } from "@/lib/api/core/ApiError";
import { RequestIdBanner } from "@/features/admin/components/RequestIdBanner";
import { cn } from "@/shared/utils/merge-class-names";

export interface ReviewReportErrorStateProps {
  error: ApiError;

  onRetry: () => void;

  className?: string;
}

const COPY: Readonly<
  Record<
    "forbidden" | "not-found" | "rate-limit" | "network" | "server" | "unknown",
    { title: string; description: string }
  >
> = Object.freeze({
  forbidden: {
    title: "Permission denied",
    description:
      "Your account no longer has permission to read review reports. Refresh the page or contact an administrator.",
  },
  "not-found": {
    title: "Reports not available",
    description:
      "The review-report endpoint is unavailable. Refresh the page and try again.",
  },
  "rate-limit": {
    title: "Too many requests",
    description:
      "You are sending requests too quickly. Wait a moment and try again.",
  },
  network: {
    title: "Connection lost",
    description:
      "We could not reach the moderation service. Check your connection and try again.",
  },
  server: {
    title: "Server error",
    description:
      "The moderation service is having trouble. Try again in a moment.",
  },
  unknown: {
    title: "Could not load reports",
    description:
      "An unexpected error occurred while loading review reports. Try again.",
  },
});

function classifyErrorCode(code: string | undefined | null): keyof typeof COPY {
  if (typeof code !== "string" || code.length === 0) return "unknown";
  if (code === "GLOBAL_FORBIDDEN" || code === "PERMISSION_DENIED") {
    return "forbidden";
  }
  if (code === "REVIEW_NOT_FOUND" || code === "GLOBAL_NOT_FOUND") {
    return "not-found";
  }
  if (code === "GLOBAL_RATE_LIMITED") return "rate-limit";
  if (
    code === "GLOBAL_NETWORK_ERROR" ||
    code === "GLOBAL_TIMEOUT" ||
    code === "NETWORK_ERROR"
  ) {
    return "network";
  }
  if (code === "GLOBAL_INTERNAL_ERROR" || code.startsWith("GLOBAL_5")) {
    return "server";
  }
  return "unknown";
}

export function ReviewReportErrorState({
  error,
  onRetry,
  className,
}: ReviewReportErrorStateProps): React.ReactElement {
  const copyKey = classifyErrorCode(error.code);
  const copy = COPY[copyKey];
  const code =
    typeof error.code === "string" && error.code.length > 0
      ? error.code
      : "UNKNOWN";

  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-start gap-3 rounded-xl border border-destructive/35 bg-destructive/10 p-5 text-sm text-destructive dark:bg-destructive/20",
        className,
      )}
      data-testid="review-report-error-state"
    >
      <div className="flex items-center gap-2">
        <AlertCircle className="size-5 shrink-0" aria-hidden="true" />
        <p className="font-semibold text-foreground">{copy.title}</p>
      </div>
      <p className="text-muted-foreground">{copy.description}</p>
      <p className="font-mono text-xs text-destructive/90">
        Error code: <span className="font-semibold">{code}</span>
      </p>
      <RequestIdBanner error={error} />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onRetry}
        className="mt-1"
        data-testid="review-report-error-state-retry"
      >
        Try again
      </Button>
    </div>
  );
}
