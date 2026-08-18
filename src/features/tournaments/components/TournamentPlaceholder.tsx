"use client";

import * as React from "react";

import { Trophy } from "lucide-react";

import { EmptyState } from "@/components/ui/EmptyState";

export interface TournamentPlaceholderProps {

title?: string;

description?: string;

className?: string;
}

export function TournamentPlaceholder({
title,
description,
className,
}: TournamentPlaceholderProps) {
return (
<EmptyState
icon={Trophy}
title={title ?? "Tournaments Coming Soon"}
description={
description ??
"Tournament features are currently under development. Check back soon!"
      }
size="lg"
className={className}
    />
  );
}
