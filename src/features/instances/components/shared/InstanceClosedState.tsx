"use client";

import { StopCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { EmptyState } from "@/components/ui/EmptyState";
import type { InstanceStatus } from "@/features/instances/types/instance.types";

export type InstanceClosedVariant = "closed" | "cancelled" | "finished";

interface InstanceClosedStateProps {

status?: InstanceStatus;

cancelled?: boolean;

closedAt?: string | null;
className?: string;
}

const VARIANT_CONFIG: Record<
InstanceClosedVariant,
{ icon: LucideIcon; title: string; description: string }
> = {
closed: {
icon: StopCircle,
title: "Instance closed",
description:
"The host has closed this instance. It is no longer accepting players.",
  },
cancelled: {
icon: StopCircle,
title: "Instance cancelled",
description:
"This instance was cancelled before it could begin. Please join another instance to play.",
  },
finished: {
icon: StopCircle,
title: "Instance finished",
description: "This instance has finished. Thanks for playing!",
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

function deriveVariant(
status: InstanceStatus | undefined,
cancelled: boolean,
): InstanceClosedVariant | null {
if (status === undefined) return null;
if (status === "finished") return "finished";
if (status === "closed") return cancelled ? "cancelled" : "closed";
return null;
}

export function InstanceClosedState({
status,
cancelled = false,
closedAt,
className,
}: InstanceClosedStateProps) {
const variant = deriveVariant(status, cancelled);
if (variant === null) return null;

const config = VARIANT_CONFIG[variant];
const timestamp = formatTimestamp(closedAt);

return (
<EmptyState
icon={config.icon}
title={config.title}
description={
timestamp !== null
? `${config.description} Closed at ${timestamp}.`
: config.description
      }
size="md"
className={className}
data-testid="instance-closed-state"
data-variant={variant}
    />
  );
}