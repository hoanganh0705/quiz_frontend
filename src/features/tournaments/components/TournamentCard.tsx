"use client";

import * as React from "react";
import Link from "next/link";

import { Calendar } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { cn } from "@/shared/utils/merge-class-names";

import {
  isTournamentClosed,
  resolveEffectiveTournamentStatus,
} from "@/features/tournaments/lib/tournament-lifecycle";
import type { TournamentSummary } from "@/features/tournaments/types";

import { TournamentStatusBadge } from "./TournamentStatusBadge";

export interface TournamentCardProps {
  tournament: TournamentSummary;
  className?: string;
}

function formatDate(dateString: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(dateString));
  } catch {
    return dateString;
  }
}

export function TournamentCard({ tournament, className }: TournamentCardProps) {
  const {
    id,
    title,
    description,
    status,
    startAt,
    endAt,
    difficulty,
    maxParticipants,
  } = tournament;

  const effectiveStatus = resolveEffectiveTournamentStatus(tournament) ?? status;
  const closed = isTournamentClosed(tournament);
  const tournamentUrl = "/tournaments/" + id;
  const ctaLabel =
    effectiveStatus === "finished"
      ? "View Results"
      : effectiveStatus === "cancelled"
        ? "Details"
        : "View";

  return (
    <Card
      className={cn(
        "group relative flex flex-col justify-between overflow-hidden transition-all duration-200 bg-card",
        closed
          ? "border-border/80 opacity-90 hover:opacity-100 hover:border-border"
          : "hover:shadow-md hover:border-brand/40",
        className,
      )}
      role="listitem"
    >
      <CardContent className="p-5 space-y-3 flex flex-col flex-1 justify-between">
        <div className="space-y-3">
          {/* Header: status badge + difficulty */}
          <div className="flex items-start justify-between gap-3">
            <TournamentStatusBadge status={effectiveStatus} />
            {difficulty && (
              <span className="text-xs font-medium text-muted-foreground capitalize">
                {difficulty}
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="font-semibold text-base line-clamp-2 leading-snug group-hover:text-primary transition-colors">
            <Link
              href={tournamentUrl}
              className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 hover:underline"
            >
              {title}
            </Link>
          </h3>

          {/* Description */}
          {description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {description}
            </p>
          )}

          {/* Dates */}
          <div className="flex items-center gap-4 text-xs font-mono tabular-nums text-muted-foreground">
            {startAt && (
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{formatDate(startAt)}</span>
              </span>
            )}
            {endAt && (
              <>
                <span aria-hidden="true">—</span>
                <span>{formatDate(endAt)}</span>
              </>
            )}
          </div>
        </div>

        {/* Footer: max participants + CTA */}
        <div className="flex items-center justify-between pt-2 border-t border-border/60 mt-auto">
          {maxParticipants && (
            <span className="text-sm font-mono tabular-nums text-muted-foreground">
              Max {maxParticipants.toLocaleString()} participants
            </span>
          )}
          <Button asChild size="sm" variant="outline" className="ml-auto">
            <Link href={tournamentUrl} aria-label={`View ${title} tournament`}>
              {ctaLabel}
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
