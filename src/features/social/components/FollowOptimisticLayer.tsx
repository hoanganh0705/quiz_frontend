"use client";

import { FollowPendingIndicator } from "@/features/social/components/FollowPendingIndicator";

export interface FollowOptimisticLayerProps {

variant: "following" | "unfollowing";
}

export function FollowOptimisticLayer({
variant,
}: FollowOptimisticLayerProps) {
const label = variant === "following" ? "Following..." : "Unfollowing...";
return <FollowPendingIndicator text={label} size="md" />;
}
