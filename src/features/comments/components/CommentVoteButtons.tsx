"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/shared/utils/merge-class-names";

import { useVoteComment } from "@/features/comments/hooks/useVoteComment";
import type {
  CommentUserVote,
  CommentVoteDirection,
} from "@/features/comments/types";

export interface CommentVoteButtonsProps {
  commentId: string;

  quizId?: string;

  userVote?: CommentUserVote;

  votesCount: number;
  upvotesCount: number;
  downvotesCount: number;

  isOwner?: boolean;

  isAuthenticated?: boolean;

  size?: "sm" | "md";

  showCounts?: boolean;

  className?: string;
}

export function CommentVoteButtons({
  commentId,
  quizId,
  userVote = null,
  votesCount,
  upvotesCount,
  downvotesCount,
  isOwner = false,
  isAuthenticated = true,
  size = "md",
  showCounts = true,
  className,
}: CommentVoteButtonsProps) {
  const { toggleVote, isLoading } = useVoteComment(commentId, { quizId });

  const [announcement, setAnnouncement] = useState<string>("");

  if (isOwner || !isAuthenticated) {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-2 text-xs text-muted-foreground tabular-nums",
          className,
        )}
        aria-label={isOwner ? "Your comment" : "Sign in to vote"}
        data-testid={`comment-vote-${commentId}`}
      >
        <span>{votesCount}</span>
      </div>
    );
  }

  const handleClick = (direction: CommentVoteDirection) => {
    setAnnouncement(
      direction === "upvote"
        ? "Vote recorded: upvoted"
        : "Vote recorded: downvoted",
    );
    void toggleVote(direction, userVote);
  };

  const iconSize = size === "sm" ? 14 : 16;
  const buttonSize = size === "sm" ? "h-8" : "h-9";
  const padding = size === "sm" ? "px-2" : "px-3";

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 text-muted-foreground",
        className,
      )}
      data-testid={`comment-vote-${commentId}`}
    >
      <Button
        type="button"
        variant={userVote === "upvote" ? "default" : "ghost"}
        size="icon"
        aria-label={`Upvote (${upvotesCount})`}
        aria-pressed={userVote === "upvote"}
        disabled={isLoading}
        onClick={() => handleClick("upvote")}
        className={cn(buttonSize, padding, "gap-1")}
        data-testid={`comment-vote-${commentId}-up`}
      >
        <ArrowUp size={iconSize} aria-hidden />
        {showCounts && (
          <span className="text-xs font-medium tabular-nums">
            {upvotesCount}
          </span>
        )}
      </Button>
      <Button
        type="button"
        variant={userVote === "downvote" ? "default" : "ghost"}
        size="icon"
        aria-label={`Downvote (${downvotesCount})`}
        aria-pressed={userVote === "downvote"}
        disabled={isLoading}
        onClick={() => handleClick("downvote")}
        className={cn(buttonSize, padding, "gap-1")}
        data-testid={`comment-vote-${commentId}-down`}
      >
        <ArrowDown size={iconSize} aria-hidden />
        {showCounts && (
          <span className="text-xs font-medium tabular-nums">
            {downvotesCount}
          </span>
        )}
      </Button>
      <span
        className="ml-1 text-xs font-medium tabular-nums"
        aria-label={`Net votes: ${votesCount}`}
      >
        {votesCount}
      </span>
      {/* Visually hidden live region for screen-reader announcements. */}
      <span className="sr-only" role="status" aria-live="polite">
        {announcement}
      </span>
    </div>
  );
}
