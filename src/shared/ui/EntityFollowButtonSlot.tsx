"use client";

import { useCallback } from "react";

import { cn } from "@/shared/utils/merge-class-names";

import {
  FollowButton,
  FollowButtonSkeleton,
  type FollowButtonProps,
} from "@/components/primitives";

export interface EntityFollowButtonSlotProps {
  entityId: string | null;
  testId: string;
  isAuthenticated: boolean;
  isFollowing: boolean;
  isLoading: boolean;
  isPending: boolean;
  errorKind: FollowButtonProps["errorKind"];
  onFollow: () => Promise<unknown> | void;
  onUnfollow: () => Promise<unknown> | void;
  followerCount?: number | null;
  className?: string;
}

export function EntityFollowButtonSlot({
  entityId,
  testId,
  isAuthenticated,
  isFollowing,
  isLoading,
  isPending,
  errorKind,
  onFollow,
  onUnfollow,
  followerCount,
  className,
}: EntityFollowButtonSlotProps): React.ReactElement | null {
  const handleToggle = useCallback<FollowButtonProps["onToggle"]>(() => {
    if (isFollowing) {
      void onUnfollow();
    } else {
      void onFollow();
    }
  }, [isFollowing, onFollow, onUnfollow]);

  if (entityId === null) {
    return null;
  }

  if (isLoading) {
    return (
      <div
        data-testid={testId}
        data-state="loading"
        className={cn("flex flex-col items-start", className)}
      >
        <FollowButtonSkeleton />
      </div>
    );
  }

  return (
    <div
      data-testid={testId}
      data-state="resolved"
      data-following={isFollowing ? "true" : "false"}
      className={cn("flex flex-col items-start", className)}
    >
      <FollowButton
        isFollowing={isFollowing}
        isAuthenticated={isAuthenticated}
        isPending={isPending}
        errorKind={errorKind}
        onToggle={handleToggle}
      />
      {typeof followerCount === "number" ? (
        <span
          data-testid="follow-count"
          data-count={String(followerCount)}
          className="mt-1 text-xs font-mono text-muted-foreground tabular-nums"
        >
          {`${followerCount} follower${followerCount === 1 ? "" : "s"}`}
        </span>
      ) : null}
    </div>
  );
}
