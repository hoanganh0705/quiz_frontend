"use client";

/**
 * `ParticipantList` — tournament participants panel.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.2 — Tournament discovery and read-only detail surfaces.
 * Source ticket: TKT-5.2.E2.
 */

import * as React from "react";

import { Avatar, AvatarFallback } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Loader2 } from "lucide-react";
import { cn } from "@/shared/utils/merge-class-names";

import {
  ParticipantListSkeleton,
  TournamentEmptyState,
  TournamentErrorState,
} from "./shared";

import type { UseTournamentParticipantsResult } from "@/features/tournaments/hooks/useTournamentParticipants";

export interface ParticipantListProps {
  participantsResult: UseTournamentParticipantsResult;
  className?: string;
}

function formatDate(dateString: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(dateString));
  } catch {
    return dateString;
  }
}

function getInitials(username: string): string {
  return username
    .split(/[\s_-]+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export function ParticipantList({
  participantsResult,
  className,
}: ParticipantListProps) {
  const {
    items,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMore,
    error,
    refresh,
  } = participantsResult;

  if (isLoading) {
    return (
      <div className={cn("space-y-4", className)}>
        <h2 className="text-lg font-semibold">Participants</h2>
        <ParticipantListSkeleton count={10} />
      </div>
    );
  }

  if (error !== null) {
    return (
      <div className={cn("space-y-4", className)}>
        <h2 className="text-lg font-semibold">Participants</h2>
        <TournamentErrorState error={error} onRetry={refresh} />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className={cn("space-y-4", className)}>
        <h2 className="text-lg font-semibold">Participants</h2>
        <TournamentEmptyState variant="participants" />
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <h2 className="text-lg font-semibold">Participants</h2>

      <div className="space-y-3">
        {items.map((participant) => (
          <div
            key={participant.id}
            className="flex items-center gap-3 p-3 rounded-lg border"
          >
            <Avatar className="h-10 w-10">
              <AvatarFallback>{getInitials(participant.username)}</AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{participant.username}</p>
              <p className="text-xs text-muted-foreground">
                Joined {formatDate(participant.registeredAt)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center py-2">
          {isLoadingMore ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Loading more...</span>
            </div>
          ) : (
            <Button onClick={loadMore} variant="outline" size="sm">
              Load More
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
