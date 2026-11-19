"use client";

import * as React from "react";
import { Save } from "lucide-react";
import type { FieldValues } from "react-hook-form";

import { Button } from "@/components/ui/Button";
import { cn } from "@/shared/utils/merge-class-names";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface DraftBannerProps<_T extends FieldValues = FieldValues> {
  savedAt: string | null;

  restore: () => void;

  dismiss: () => void;

  showRestorePrompt?: boolean;

  className?: string;

  testId?: string;
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function DraftBanner<_T extends FieldValues = FieldValues>(
  props: DraftBannerProps<_T>,
): React.ReactElement | null {
  const {
    savedAt,
    restore,
    dismiss,
    showRestorePrompt = true,
    className,
    testId = "draft-banner",
  } = props;

  if (!savedAt || !showRestorePrompt) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid={testId}
      className={cn(
        "flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/10 p-3.5 text-sm text-foreground backdrop-blur-xs shadow-xs",
        className,
      )}
    >
      <Save className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
      <div className="flex-1">
        <p className="font-medium" data-testid={`${testId}-message`}>
          Restore draft from{" "}
          <span className="font-mono font-semibold">{formatTime(savedAt)}</span>
          ?
        </p>
        <p className="text-xs text-muted-foreground">
          We saved your progress to this browser. Pick up where you left off.
        </p>
      </div>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={dismiss}
          data-testid={`${testId}-dismiss`}
        >
          Dismiss
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={restore}
          data-testid={`${testId}-restore`}
        >
          Restore
        </Button>
      </div>
    </div>
  );
}
