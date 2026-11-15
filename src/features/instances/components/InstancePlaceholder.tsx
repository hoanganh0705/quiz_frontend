"use client";

import { Gamepad2 } from "lucide-react";

import { EmptyState } from "@/components/ui/EmptyState";

export interface InstancePlaceholderProps {

title?: string;

description?: string;

className?: string;
}

export function InstancePlaceholder({
title,
description,
className,
}: InstancePlaceholderProps) {
return (
<div data-testid="instance-placeholder" className={className}>
<EmptyState
icon={Gamepad2}
title={title ?? "Multiplayer Instances Coming Soon"}
description={
description ??
"Live multiplayer instances are currently under development. Check back soon for the lobby, host controls, and realtime gameplay!"
      }
size="lg"
    />
</div>
  );
}