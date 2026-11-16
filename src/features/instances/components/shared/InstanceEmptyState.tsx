"use client";

import { Users, QrCode, Copy } from "lucide-react";

import { EmptyState } from "@/components/ui/EmptyState";

export interface InstanceEmptyStateProps {
  onShowQr?: () => void;
  onCopyLink?: () => void;
  className?: string;
}

export function InstanceEmptyState({
  onShowQr,
  onCopyLink,
  className,
}: InstanceEmptyStateProps) {
  const actions = [];
  if (onCopyLink) {
    actions.push({
      label: "Copy Link",
      icon: Copy,
      onClick: onCopyLink,
      variant: "default" as const,
    });
  }
  if (onShowQr) {
    actions.push({
      label: "Show QR Code",
      icon: QrCode,
      onClick: onShowQr,
      variant: "outline" as const,
    });
  }

  return (
    <div data-testid="instance-empty-state" className={className}>
      <EmptyState
        icon={Users}
        title="Waiting for players"
        description="No players have joined this instance yet. Share the link or invite your friends to start the game."
        size="md"
        actions={actions.length > 0 ? actions : undefined}
      />
    </div>
  );
}
