"use client";

import { AlertCircle, ArrowLeft, Gamepad2, StopCircle, Trophy } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { EmptyState, type EmptyStateAction } from "@/components/ui/EmptyState";

import type { InstanceClosedEventDto } from "@/features/instances/play/types";

export type GameClosedVariant = "closed" | "cancelled" | "finished";

interface GameClosedSummaryProps {
  closure: InstanceClosedEventDto | null;
  instanceId?: string;
  className?: string;
}

const VARIANT_CONFIG: Record<
  GameClosedVariant,
  { icon: LucideIcon; title: string; description: string }
> = {
  finished: {
    icon: Trophy,
    title: "Battle Complete!",
    description:
      "The live battle has finished. Check out the final results below.",
  },
  closed: {
    icon: StopCircle,
    title: "Battle Concluded",
    description:
      "This battle has concluded and is no longer accepting answers.",
  },
  cancelled: {
    icon: AlertCircle,
    title: "Battle Cancelled",
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
  instanceId,
  className,
}: GameClosedSummaryProps) {
  if (closure === null) return null;

  const variant: GameClosedVariant =
    closure.status === "cancelled"
      ? "cancelled"
      : closure.status === "finished" || closure.reason === "normal"
        ? "finished"
        : "closed";

  const config = VARIANT_CONFIG[variant];
  const timestamp = formatTimestamp(closure.closedAt);

  const actions: EmptyStateAction[] = [
    ...(instanceId
      ? [
          {
            label: "Return to Lobby",
            href: `/instances/${instanceId}`,
            icon: ArrowLeft,
            variant: "default" as const,
          },
        ]
      : []),
    {
      label: "Browse Battles",
      href: "/instances",
      icon: Gamepad2,
      variant: "outline" as const,
    },
  ];

  return (
    <EmptyState
      icon={config.icon}
      title={config.title}
      description={
        timestamp !== null
          ? `${config.description} Concluded ${timestamp}.`
          : config.description
      }
      actions={actions}
      size="lg"
      className={className}
      data-testid="game-closed-summary"
      data-variant={variant}
    />
  );
}
