"use client";

import * as React from "react";
import Link from "next/link";
import { Users, Crown, Swords, Play, Clock } from "lucide-react";

import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
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

  const isJoinable = status === "open" || status === "countdown";
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
            className="border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium text-xs px-2.5 py-0.5 animate-pulse"
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
              <Link
                href={roomUrl}
                className="focus:outline-none focus:underline"
              >
                {quizTitle || "Untitled Quiz"}
              </Link>
            </h3>
          </div>

          {/* Metadata: Host & Players */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground pt-1">
            <span
              className="inline-flex items-center gap-1.5"
              title={`Host: ${hostName}`}
            >
              <Crown className="h-3.5 w-3.5 text-amber-500" />
              <span className="truncate max-w-32">{hostName}</span>
            </span>

            <span className="inline-flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
              <span>
                {playerCount === 0 ? (
                  "No players"
                ) : (
                  <>
                    {playerCount}
                    {maxPlayers ? ` / ${maxPlayers}` : ""}{" "}
                    {playerCount === 1 ? "player" : "players"}
                  </>
                )}
              </span>
            </span>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          {isJoinable ? (
            <Button
              asChild
              className="w-full bg-brand text-white hover:bg-brand-hover shadow-sm font-medium"
              size="default"
              data-testid={`join-instance-button-${instanceId}`}
            >
              <Link href={roomUrl}>
                <Swords className="mr-2 h-4 w-4" />
                Join Battle
              </Link>
            </Button>
          ) : isRunning ? (
            <Button
              asChild
              variant="outline"
              className="w-full border-blue-500/30 text-blue-600 hover:bg-blue-500/10 dark:text-blue-400 font-medium"
              size="default"
              data-testid={`view-instance-button-${instanceId}`}
            >
              <Link href={roomUrl}>
                <Play className="mr-2 h-4 w-4" />
                Watch Match
              </Link>
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
