"use client";

import { StopCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { EmptyState } from "@/components/ui/EmptyState";

import type { InstanceClosedEventDto } from "@/features/instances/play/types";

export type GameClosedVariant = "closed" | "cancelled";

interface GameClosedSummaryProps {

closure: InstanceClosedEventDto | null;
className?: string;
}

const VARIANT_CONFIG: Record<
GameClosedVariant,
{ icon: LucideIcon; title: string; description: string }
> = {
closed: {
icon: StopCircle,
title: "Game closed",
description:
"The host has closed this game. It is no longer accepting answers.",
  },
cancelled: {
icon: StopCircle,
title: "Game cancelled",
description:
"This game was cancelled before it could finish. Please join another instance to play.",
  },
};

function formatTimestamp(iso: string | null | undefined): string | null {
if (typeof iso !== "string" || iso.length === 0) return null;
try {
return new Intl.DateTimeFormat("en-US", {
month: "short",
day: "numeric",
hour: "numeric",
minute: "2-digit",
    }).format(new Date(iso));
  } catch {
return iso;
  }
}

export function GameClosedSummary({
closure,
className,
}: GameClosedSummaryProps) {
if (closure === null) return null;

const variant: GameClosedVariant =
closure.status === "cancelled" ? "cancelled" : "closed";
const config = VARIANT_CONFIG[variant];
const timestamp = formatTimestamp(closure.closedAt);

return (
<EmptyState
icon={config.icon}
title={config.title}
description={
timestamp !== null
? `${config.description} Closed ${timestamp}.`
: config.description
      }
size="lg"
className={className}
data-testid="game-closed-summary"
data-variant={variant}
    />
  );
}
