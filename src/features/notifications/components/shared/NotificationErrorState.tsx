"use client";

import { AlertTriangle } from "lucide-react";

import { ErrorState } from "@/components/ui/loading-states/ErrorState";
import { getUserCopy } from "@/lib/api/error-codes";
import type { ApiError } from "@/lib/api/core/ApiError";

interface NotificationErrorStateProps {
  error: ApiError | null;
  onRetry?: () => void;
  className?: string;
}

export function NotificationErrorState({
  error,
  onRetry,
  className,
}: NotificationErrorStateProps) {
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
    <div className={className} data-testid="notification-error-state">
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

export const NOTIFICATION_ERROR_ICON = AlertTriangle;
