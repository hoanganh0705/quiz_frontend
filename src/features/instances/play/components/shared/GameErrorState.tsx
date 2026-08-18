"use client";

import { ApiError } from "@/lib/api";
import { getUserCopy } from "@/lib/api/error-codes";
import { ErrorState } from "@/components/ui/loading-states/ErrorState";

interface GameErrorStateProps {

error: ApiError | null;

onRetry?: () => void;
className?: string;
}

export function GameErrorState({
error,
onRetry,
className,
}: GameErrorStateProps) {
const copy = error !== null ? getUserCopy(error.code) : null;
const title = copy?.title ?? "Something went wrong";
const message =
copy?.body ?? "An unexpected error occurred. Please try again.";

const variant: "network" | "server" | "notFound" | "default" =
error?.status === 0
? "network"
: error?.status === 404
? "notFound"
: error !== null && error.status >= 500
? "server"
: "default";

return (
<div className={className} data-testid="game-error-state">
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
