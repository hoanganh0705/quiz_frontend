"use client";

import Link from "next/link";
import * as React from "react";

import { Clock, Crown, Lock, Swords, Users } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";

import { cn } from "@/shared/utils/merge-class-names";

import type { InstanceListItemDto } from "@/lib/api/generated/schemas";

export interface InstanceCardProps {
  instance: InstanceListItemDto;
  className?: string;
}

export function InstanceCard({ instance, className }: InstanceCardProps) {
  const {
    instanceId,
    quizTitle,
    hostDisplayName,
    hostUsername,
    playerCount,
    maxPlayers,
    status,
    difficulty,
  } = instance;

  const isJoinable = status === "open";
  const isStartingSoon = status === "countdown";
  const isRunning = status === "running";
  const isClosed = status === "closed" || status === "finished";

  const hostName = hostDisplayName || hostUsername || "Unknown Host";
  const roomUrl = `/instances/${instanceId}`;

  const renderStatusBadge = () => {
    switch (status) {
      case "open":
        return (
          <Badge
            variant="outline"
            className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium text-xs px-2.5 py-0.5"
          >
            Open Lobby
          </Badge>
        );
      case "countdown":
        return (
          <Badge
            variant="outline"
            className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 font-semibold text-xs px-2.5 py-0.5 animate-pulse motion-reduce:animate-none"
          >
            Starting Soon
          </Badge>
        );
      case "running":
        return (
          <Badge
            variant="outline"
            className="border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium text-xs px-2.5 py-0.5"
          >
            In Progress
          </Badge>
        );
      case "closed":
        return (
          <Badge
            variant="outline"
            className="border-slate-500/30 bg-slate-500/10 text-slate-600 dark:text-slate-400 font-medium text-xs px-2.5 py-0.5"
          >
            Closed
          </Badge>
        );
      case "finished":
      default:
        return (
          <Badge
            variant="outline"
            className="border-muted bg-muted/40 text-muted-foreground font-medium text-xs px-2.5 py-0.5"
          >
            Finished
          </Badge>
        );
    }
  };

  return (
    <Card
      className={cn(
        "group relative flex flex-col justify-between overflow-hidden transition-all duration-200 hover:shadow-md hover:border-brand/40 bg-card",
        isClosed && "opacity-80 bg-muted/20 border-muted/60",
        className,
      )}
      role="listitem"
      data-testid={`instance-card-${instanceId}`}
    >
      <CardContent className="p-5 flex flex-col flex-1 justify-between gap-4">
        <div className="space-y-3">
          {/* Header row: Status badge + Difficulty */}
          <div className="flex items-center justify-between gap-2">
            {renderStatusBadge()}
            {difficulty && (
              <span className="text-xs font-medium text-muted-foreground capitalize">
                {difficulty}
              </span>
            )}
          </div>

          {/* Quiz title */}
          <div>
            <h3 className="font-semibold text-lg line-clamp-2 leading-snug group-hover:text-brand transition-colors">
              {isRunning ? (
                <span>{quizTitle || "Untitled Quiz"}</span>
              ) : (
                <Link
                  href={roomUrl}
                  className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 hover:underline"
                >
                  {quizTitle || "Untitled Quiz"}
                </Link>
              )}
            </h3>
          </div>

          {/* Metadata: Host & Players */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground pt-1">
            <span
              className="inline-flex items-center gap-1.5"
              title={`Host: ${hostName}`}
            >
              <Crown className="h-3.5 w-3.5 text-amber-500 shrink-0" aria-hidden="true" />
              <span className="truncate max-w-32">{hostName}</span>
            </span>

            <span className="inline-flex items-center gap-1.5 font-mono tabular-nums">
              <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
              <span>
                {playerCount === 0
                  ? "No players"
                  : `${playerCount}${maxPlayers ? ` / ${maxPlayers}` : ""} ${playerCount === 1 ? "player" : "players"}`}
              </span>
            </span>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          {isJoinable ? (
            <Button
              asChild
              className="w-full bg-brand text-brand-foreground hover:bg-brand-hover shadow-sm font-medium"
              size="default"
              data-testid={`join-instance-button-${instanceId}`}
            >
              <Link href={roomUrl}>
                <Swords className="mr-2 h-4 w-4" />
                Join Battle
              </Link>
            </Button>
          ) : isStartingSoon || isRunning ? (
            <Button
              type="button"
              variant="outline"
              disabled
              className="w-full border-border/70 text-muted-foreground font-medium"
              size="default"
              data-testid={`in-progress-instance-button-${instanceId}`}
            >
              <Lock className="mr-2 h-4 w-4" aria-hidden="true" />
              {isStartingSoon ? "Starting Soon" : "Match in Progress"}
            </Button>
          ) : (
            <Button
              asChild
              variant="ghost"
              className="w-full text-muted-foreground hover:bg-muted font-medium"
              size="default"
              data-testid={`view-instance-button-${instanceId}`}
            >
              <Link href={roomUrl}>
                <Clock className="mr-2 h-4 w-4" />
                View Results
              </Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
