"use client";

import type React from "react";
import { memo } from "react";

import { ExternalLink } from "lucide-react";

import { TournamentStatusBadge } from "@/features/tournaments/components/TournamentStatusBadge";
import type { TournamentStatus } from "@/features/tournaments/types";
import { cn } from "@/shared/utils/merge-class-names";

import type { TournamentDto } from "../admin-tournament-types";
import { TournamentAdminActionMenu } from "./TournamentAdminActionMenu";

export const TOURNAMENT_TABLE_GRID_CLASS =
  "lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)_6.5rem_5.5rem_7.5rem_2.5rem] lg:items-center lg:gap-4";

const TOURNAMENT_DATE_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

const DIFFICULTY_STYLES: Record<
  TournamentDto["difficulty"],
  { label: string; className: string }
> = {
  easy: {
    label: "Easy",
    className:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  medium: {
    label: "Medium",
    className:
      "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  hard: {
    label: "Hard",
    className:
      "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  },
};

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return TOURNAMENT_DATE_FORMATTER.format(date);
}

export interface TournamentAdminItemProps {
  tournament: TournamentDto;

  onEdit: (id: string) => void;

  onDelete: (id: string) => void;
}

export const TournamentAdminItem = memo(function TournamentAdminItem({
  tournament,
  onEdit,
  onDelete,
}: TournamentAdminItemProps): React.ReactElement {
  const {
    tournamentId,
    title,
    description,
    difficulty,
    status,
    startAt,
    endAt,
    maxParticipants,
  } = tournament;

  const detailUrl = `/tournaments/${tournamentId}`;
  const scheduleText =
    startAt && endAt
      ? `${formatDateTime(startAt)} – ${formatDateTime(endAt)}`
      : "—";
  const difficultyMeta = DIFFICULTY_STYLES[difficulty] ?? {
    label: difficulty,
    className: "border-border bg-muted text-muted-foreground",
  };
  const capText =
    maxParticipants !== null && maxParticipants !== undefined
      ? maxParticipants.toLocaleString()
      : "Unlimited";

  return (
    <article
      className={cn(
        "flex flex-col gap-2.5 px-4 py-3.5 transition-colors hover:bg-muted/40",
        TOURNAMENT_TABLE_GRID_CLASS,
      )}
      data-testid="tournament-admin-item"
      data-tournament-id={tournamentId}
      data-tournament-status={status}
    >
      {/* Column 1: Tournament identity + mobile action trigger */}
      <div className="flex items-start justify-between gap-2 min-w-0">
        <a
          href={detailUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex-1 min-w-0 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          data-testid="tournament-admin-item-link"
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <h2
              className="truncate text-sm font-medium text-foreground group-hover:underline"
              data-testid="tournament-admin-item-title"
            >
              {title}
            </h2>
            <ExternalLink
              className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60 transition-colors group-hover:text-foreground"
              aria-hidden="true"
            />
          </div>
          {description ? (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {description}
            </p>
          ) : null}
        </a>

        <div className="shrink-0 lg:hidden">
          <TournamentAdminActionMenu
            tournament={tournament}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        </div>
      </div>

      {/* Column 2: Schedule window */}
      <p
        className="font-mono text-xs tabular-nums text-muted-foreground"
        data-testid="tournament-admin-item-window"
      >
        {scheduleText}
      </p>

      {/* Mobile metadata strip / Desktop columns 3–5 */}
      <div className="flex flex-wrap items-center gap-2 lg:contents">
        {/* Column 3: Difficulty */}
        <div>
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
              difficultyMeta.className,
            )}
          >
            {difficultyMeta.label}
          </span>
        </div>

        {/* Column 4: Capacity */}
        <div className="font-mono text-xs tabular-nums text-muted-foreground">
          <span className="lg:hidden">Cap: </span>
          <span className="text-foreground">{capText}</span>
        </div>

        {/* Column 5: Status */}
        <div className="shrink-0" data-testid="tournament-admin-item-status">
          <TournamentStatusBadge status={status as TournamentStatus} />
        </div>
      </div>

      {/* Column 6: Desktop action menu */}
      <div className="hidden lg:flex lg:justify-end shrink-0">
        <TournamentAdminActionMenu
          tournament={tournament}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </div>
    </article>
  );
});
