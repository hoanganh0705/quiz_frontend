"use client";

import { Users } from "lucide-react";

import { EmptyState } from "@/components/ui/EmptyState";

interface InstanceEmptyStateProps {
className?: string;
}

export function InstanceEmptyState({ className }: InstanceEmptyStateProps) {
return (
<EmptyState
icon={Users}
title="Waiting for players"
description="No players have joined this instance yet. Share the link or invite your friends to start the game."
size="md"
className={className}
data-testid="instance-empty-state"
    />
  );
}