"use client";

import { HelpCircle } from "lucide-react";

import { EmptyState } from "@/components/ui/EmptyState";

interface GameEmptyStateProps {
className?: string;
}

export function GameEmptyState({ className }: GameEmptyStateProps) {
return (
<EmptyState
icon={HelpCircle}
title="Waiting for the next question"
description="The next question will appear here as soon as the host reveals it. Stay tuned!"
size="md"
className={className}
data-testid="game-empty-state"
    />
  );
}
