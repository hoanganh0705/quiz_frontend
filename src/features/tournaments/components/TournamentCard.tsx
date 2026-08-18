"use client";

import * as React from "react";
import Link from "next/link";

import { Calendar } from "lucide-react";

import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { cn } from "@/shared/utils/merge-class-names";

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
const { id, title, description, status, startAt, endAt, difficulty, maxParticipants } =
tournament;

const tournamentUrl = "/tournaments/" + id;

return (
<Card className={cn("group hover:shadow-md transition-shadow", className)}>
<CardContent className="p-4 space-y-3">
{/* Header: status badge + difficulty */}
<div className="flex items-start justify-between gap-3">
<TournamentStatusBadge status={status} />
{difficulty && (
<span className="text-xs text-muted-foreground capitalize">
{difficulty}
</span>
          )}
</div>

{/* Title */}
<Link
href={tournamentUrl}
className="block group-hover:text-primary transition-colors"
        >
<h3 className="font-semibold text-base line-clamp-2 leading-snug">
{title}
</h3>
</Link>

{/* Description */}
{description && (
<p className="text-sm text-muted-foreground line-clamp-2">
{description}
</p>
        )}

{/* Dates */}
<div className="flex items-center gap-4 text-xs text-muted-foreground">
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

{/* Footer: max participants + CTA */}
<div className="flex items-center justify-between pt-2 border-t">
{maxParticipants && (
<span className="text-sm text-muted-foreground">
Max {maxParticipants.toLocaleString()} participants
            </span>
          )}
<Button asChild size="sm" variant="outline" className="ml-auto">
<Link href={tournamentUrl}>View</Link>
</Button>
</div>
</CardContent>
</Card>
  );
}
