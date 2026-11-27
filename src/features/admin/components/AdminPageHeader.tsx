"use client";

import { Button } from "@/components/ui/Button";

import type { LucideIcon } from "lucide-react";

interface AdminPageHeaderProps {
  title: string;
  description?: string;
  actionLabel?: string;
  actionIcon?: LucideIcon;
  onAction?: () => void;
}

export function AdminPageHeader({
  title,
  description,
  actionLabel,
  actionIcon: ActionIcon,
  onAction,
}: AdminPageHeaderProps) {
  return (
    <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      {actionLabel && onAction && (
        <Button
          type="button"
          onClick={onAction}
          className="h-10 sm:h-9 gap-2 shrink-0 self-start sm:self-auto"
        >
          {ActionIcon && <ActionIcon className="h-4 w-4" aria-hidden="true" />}
          {actionLabel}
        </Button>
      )}
    </header>
  );
}
