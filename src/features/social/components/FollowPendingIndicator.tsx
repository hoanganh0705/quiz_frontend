"use client";

import { LoadingSpinner } from "@/components/ui/loading-states/LoadingSpinner";

export interface FollowPendingIndicatorProps {

text?: string;

size?: "sm" | "md";
}

export function FollowPendingIndicator({
text = "Following...",
size = "md",
}: FollowPendingIndicatorProps) {
return (
<LoadingSpinner
size={size}
variant="secondary"
text={text}
aria-label={text}
    />
  );
}
