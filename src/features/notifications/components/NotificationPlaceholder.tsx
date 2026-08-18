"use client";

import { Bell } from "lucide-react";

import { EmptyState } from "@/components/ui/EmptyState";

export interface NotificationPlaceholderProps {

title?: string;

description?: string;

className?: string;
}

export function NotificationPlaceholder({
title,
description,
className,
}: NotificationPlaceholderProps) {
return (
<EmptyState
icon={Bell}
title={title ?? "Notifications Coming Soon"}
description={
description ??
"Notifications are currently under development. Check back soon for live updates, achievements, and tournament activity."
      }
size="lg"
className={className}
    />
  );
}