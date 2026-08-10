"use client";

/**
 * `InstancePlaceholder` — safe fallback when `multiplayer_instances_live` is
 * `'placeholder'`.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.7 — Instance lobby, authenticated room, and host
 *                lifecycle controls.
 * Source ticket: TKT-5.7.E1.
 *
 * Mirrors `TournamentPlaceholder` (Epic 5.2 TKT-5.2.F1) and
 * `NotificationPlaceholder` (Epic 5.4 TKT-5.4.E1). Renders a static
 * "Coming soon" surface. The component never instantiates any
 * socket connection, hook, or service call.
 */

import { Gamepad2 } from "lucide-react";

import { EmptyState } from "@/components/ui/EmptyState";

export interface InstancePlaceholderProps {
  /** Optional title override. */
  title?: string;
  /** Optional description override. */
  description?: string;
  /** Optional class name. */
  className?: string;
}

export function InstancePlaceholder({
  title,
  description,
  className,
}: InstancePlaceholderProps) {
  return (
    <EmptyState
      icon={Gamepad2}
      title={title ?? "Multiplayer Instances Coming Soon"}
      description={
        description ??
          "Live multiplayer instances are currently under development. Check back soon for the lobby, host controls, and realtime gameplay!"
      }
      size="lg"
      className={className}
      data-testid="instance-placeholder"
    />
  );
}