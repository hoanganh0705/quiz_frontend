"use client";

/**
 * `TournamentHeader` — tournament detail header with metadata.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.2 — Tournament discovery and read-only detail surfaces.
 * Source ticket: TKT-5.2.E1.
 *
 * ## What this component owns
 *
 * - Renders tournament title, description, status badge, dates, and participant count.
 * - Pure presentational — driven by `TournamentDetail` type.
 *
 * ## What this component does NOT own
 *
 * - No countdown timer or client-side status advancement.
 * - No registration CTA (Story 5.3 concern).
 * - No service or hook imports.
 */

import * as React from "react";

import { Calendar, Users, Award, Crown } from "lucide-react";

import { cn } from "@/shared/utils/merge-class-names";

import type { TournamentDetail, TournamentStatus } from "@/features/tournaments/types";
import { TournamentStatusBadge } from "./TournamentStatusBadge";

export interface TournamentHeaderProps {
  /** Tournament detail data. */
  tournament: TournamentDetail;
  /** Optional class name. */
  className?: string;
}

function formatDate(dateString: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(dateString));
  } catch {
    return dateString;
  }
}

function formatShortDate(dateString: string): string {
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

export function TournamentHeader({ tournament, className }: TournamentHeaderProps) {
  const {
    id,
    title,
    description,
    status,
    startAt,
    endAt,
    difficulty,
    prize,
    maxParticipants,
    totalParticipants,
    ownerUserId,
    categoryName,
  } = tournament;

  // Map status to TournamentStatus
  const mappedStatus: TournamentStatus | undefined =
    status === "upcoming" ||
    status === "registration" ||
    status === "ongoing" ||
    status === "finished" ||
    status === "cancelled"
      ? status
      : undefined;

  return (
    <div className={cn("space-y-6", className)}>
      {/* Top row: status badge + difficulty */}
      <div className="flex items-start justify-between gap-4">
        <TournamentStatusBadge status={mappedStatus} />
        {difficulty && (
          <span className="text-sm text-muted-foreground capitalize">
            {difficulty}
          </span>
        )}
      </div>

      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {categoryName && (
          <p className="text-sm text-muted-foreground mt-1">{categoryName}</p>
        )}
      </div>

      {/* Description */}
      {description && (
        <p className="text-muted-foreground leading-relaxed">{description}</p>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Participants */}
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Users className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Participants</p>
            <p className="font-semibold">
              {totalParticipants.toLocaleString()}
              {maxParticipants && ` / ${maxParticipants.toLocaleString()}`}
            </p>
          </div>
        </div>

        {/* Prize */}
        {prize && (
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <Award className="h-5 w-5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Prize</p>
              <p className="font-semibold line-clamp-1">{prize}</p>
            </div>
          </div>
        )}

        {/* Host */}
        {ownerUserId && (
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-secondary/10">
              <Crown className="h-5 w-5 text-secondary" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Host</p>
              <p className="font-semibold">User #{ownerUserId.slice(0, 8)}</p>
            </div>
          </div>
        )}

        {/* Difficulty */}
        {difficulty && (
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-accent">
              <span className="text-xs font-bold uppercase">{difficulty}</span>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Difficulty</p>
              <p className="font-semibold capitalize">{difficulty}</p>
            </div>
          </div>
        )}
      </div>

      {/* Dates */}
      <div className="flex flex-wrap gap-6">
        {startAt && (
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <div>
              <span className="text-xs text-muted-foreground">Starts: </span>
              <span className="text-sm">{formatDate(startAt)}</span>
            </div>
          </div>
        )}
        {endAt && (
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <div>
              <span className="text-xs text-muted-foreground">Ends: </span>
              <span className="text-sm">{formatDate(endAt)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
