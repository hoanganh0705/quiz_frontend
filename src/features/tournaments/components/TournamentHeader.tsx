"use client";

import * as React from "react";
import Link from "next/link";
import { Calendar, Users, Award, Crown } from "lucide-react";

import { cn } from "@/shared/utils/merge-class-names";

import type { TournamentDetail, TournamentStatus } from "@/features/tournaments/types";
import { TournamentStatusBadge } from "./TournamentStatusBadge";
import { HEADER_STAT_ICONS } from "@/features/tournaments/lib/tournament-tokens";

export interface TournamentHeaderProps {

  tournament: TournamentDetail;

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

export function TournamentHeader({ tournament, className }: TournamentHeaderProps) {
  const {
    title,
    description,
    status,
    startAt,
    endAt,
    difficulty,
    prize,
    maxParticipants,
    totalParticipants,
    categoryName,
  } = tournament;

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
      {/* Back navigation */}
      <div>
        <Link
          href="/tournaments"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <svg
            aria-hidden="true"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Tournaments
        </Link>
      </div>

      {/* Top row: status badge */}
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
          <div className={cn("p-2 rounded-lg", HEADER_STAT_ICONS.participants.bg)}>
            <Users className={cn("h-5 w-5", HEADER_STAT_ICONS.participants.icon)} aria-hidden="true" />
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
            <div className={cn("p-2 rounded-lg", HEADER_STAT_ICONS.prize.bg)}>
              <Award className={cn("h-5 w-5", HEADER_STAT_ICONS.prize.icon)} aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Prize</p>
              <p className="font-semibold line-clamp-1">{prize}</p>
            </div>
          </div>
        )}

        {/* Difficulty */}
        {difficulty && (
          <div className="flex items-start gap-3">
            <div className={cn("p-2 rounded-lg", HEADER_STAT_ICONS.difficulty.bg)}>
              <span className="text-xs font-bold uppercase">{difficulty[0]}</span>
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
