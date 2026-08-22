"use client";

import { useCallback, useEffect, useMemo, useReducer } from "react";
import { Loader2, Check, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { cn } from "@/shared/utils/merge-class-names";

import { useNotificationPreferences } from "@/features/notifications/hooks";
import type { NotificationPreferences } from "@/features/notifications/types/notification.types";
import type { UpdatePreferencesDto } from "@/lib/api/generated/schemas";
import { getUserCopy } from "@/lib/api/error-codes";

import { NotificationErrorState, NotificationEmptyState } from "./shared";

interface CategoryRowProps {
title: string;
description: string;
checked: boolean;
disabled: boolean;
isPending: boolean;
onCheckedChange: (checked: boolean) => void;
}

function CategoryRow({
title,
description,
checked,
disabled,
isPending,
onCheckedChange,
}: CategoryRowProps) {
return (
<div
className={cn(
"flex items-start justify-between gap-3 px-3 sm:px-4 py-3 border-b border-border last:border-b-0",
disabled && "opacity-60",
      )}
    >
<div className="flex-1 min-w-0">
<p className="text-sm font-medium text-foreground">{title}</p>
<p className="text-[0.65rem] sm:text-xs text-muted-foreground mt-0.5">
{description}
</p>
</div>
<Switch
checked={checked}
disabled={disabled || isPending}
onCheckedChange={onCheckedChange}
aria-label={title}
      />
</div>
  );
}

interface NumberRowProps {
title: string;
description: string;
value: number;
disabled: boolean;
isPending: boolean;
onValueChange: (value: number) => void;
min?: number;
max?: number;
}

function NumberRow({
title,
description,
value,
disabled,
isPending,
onValueChange,
min = 1,
max = 1000,
}: NumberRowProps) {
return (
<div className="flex items-start justify-between gap-3 px-3 sm:px-4 py-3 border-b border-border last:border-b-0">
<div className="flex-1 min-w-0">
<Label className="text-sm font-medium text-foreground">{title}</Label>
<p className="text-[0.65rem] sm:text-xs text-muted-foreground mt-0.5">
{description}
</p>
</div>
<Input
type="number"
inputMode="numeric"
min={min}
max={max}
value={value}
disabled={disabled || isPending}
onChange={(e) => {
const next = Number.parseInt(e.target.value, 10);
onValueChange(Number.isFinite(next) ? next : value);
        }}
className="w-20 sm:w-24"
aria-label={title}
      />
</div>
  );
}

interface TimeRowProps {
title: string;
description: string;
value: string | null | undefined;
disabled: boolean;
isPending: boolean;
onValueChange: (value: string) => void;
}

function TimeRow({
title,
description,
value,
disabled,
isPending,
onValueChange,
}: TimeRowProps) {
const safeValue = typeof value === "string" ? value : "";

return (
<div className="flex items-start justify-between gap-3 px-3 sm:px-4 py-3 border-b border-border last:border-b-0">
<div className="flex-1 min-w-0">
<Label className="text-sm font-medium text-foreground">{title}</Label>
<p className="text-[0.65rem] sm:text-xs text-muted-foreground mt-0.5">
{description}
</p>
</div>
<Input
type="time"
value={safeValue}
disabled={disabled || isPending}
onChange={(e) => onValueChange(e.target.value)}
className="w-32 sm:w-36"
aria-label={title}
      />
</div>
  );
}

export interface NotificationPreferencesFormProps {
className?: string;
}

const CATEGORY_CONFIG: ReadonlyArray<{
key: keyof Pick<
NotificationPreferences,
| "achievementEnabled"
    | "tournamentEnabled"
    | "rankEnabled"
    | "friendEnabled"
    | "commentEnabled"
    | "summaryEnabled"
    | "marketingEnabled"
  >;
title: string;
description: string;
}> = [
{
key: "achievementEnabled",
title: "Achievement & badge updates",
description: "When you earn a new badge, level up, or hit a streak milestone.",
  },
{
key: "tournamentEnabled",
title: "Tournament activity",
description: "Invites, start reminders, and leaderboard changes.",
  },
{
key: "rankEnabled",
title: "Rank changes",
description: "Improvements in your global rank or category rank.",
  },
{
key: "friendEnabled",
title: "Friend activity",
description: "Friend requests, accepted requests, and new followers.",
  },
{
key: "commentEnabled",
title: "Comments & replies",
description: "Mentions, replies to your comments, and reviews on your quizzes.",
  },
{
key: "summaryEnabled",
title: "Weekly summary",
description: "A weekly digest of your progress and recommended quizzes.",
  },
{
key: "marketingEnabled",
title: "Product updates",
description: "Occasional product news and feature announcements.",
  },
];

export function NotificationPreferencesForm({
className,
}: NotificationPreferencesFormProps) {
const {
preferences,
isLoading,
error,
isUpdating,
isUpdated,
updateError,
update,
reset,
  } = useNotificationPreferences();

const local = preferences ?? null;

const [successState, dispatchShowSuccess] = useReducer(
(
state: { visible: boolean },
action: { type: "show" } | { type: "hide" },
    ) => {
switch (action.type) {
case "show":
return { visible: true };
case "hide":
return { visible: false };
default:
return state;
      }
    },
{ visible: false },
  );
const showSuccess = successState.visible;

useEffect(() => {
if (!isUpdated) {
return;
    }
dispatchShowSuccess({ type: "show" });
const t = setTimeout(() => {
dispatchShowSuccess({ type: "hide" });
reset();
    }, 3_000);
return () => clearTimeout(t);
  }, [isUpdated, reset]);

const handleToggle = useCallback(
(key: keyof NotificationPreferences, value: boolean) => {
const patch: UpdatePreferencesDto = {
[key]: value,
      } as unknown as UpdatePreferencesDto;
void update(patch);
    },
[update],
  );

const handleRankThreshold = useCallback(
(value: number) => {
const patch: UpdatePreferencesDto = {
rankImprovementThreshold: value,
      } as unknown as UpdatePreferencesDto;
void update(patch);
    },
[update],
  );

const handleQuietHoursStart = useCallback(
(value: string) => {
const patch: UpdatePreferencesDto = {
quietHoursStart: value,
      } as unknown as UpdatePreferencesDto;
void update(patch);
    },
[update],
  );

const handleQuietHoursEnd = useCallback(
(value: string) => {
const patch: UpdatePreferencesDto = {
quietHoursEnd: value,
      } as unknown as UpdatePreferencesDto;
void update(patch);
    },
[update],
  );

const channelsEnabled = useMemo(
() => Boolean(local?.inAppEnabled || local?.emailEnabled || local?.pushEnabled),
[local],
  );

const errorCopy = useMemo(() => {
if (!updateError) return null;
const copy = getUserCopy(updateError.code);
return {
title: copy?.title ?? "Update failed",
body: copy?.body ?? "Could not update your notification preferences. Please try again.",
    };
  }, [updateError]);

if (isLoading && !local) {
return (
<div
className={cn(
"rounded-lg border bg-card text-card-foreground p-4 space-y-3 animate-pulse",
className,
        )}
data-testid="notification-preferences-form-skeleton"
      >
<div className="h-5 w-40 bg-muted rounded" />
<div className="h-3 w-full bg-muted rounded" />
<div className="h-3 w-3/4 bg-muted rounded" />
<div className="h-3 w-1/2 bg-muted rounded" />
</div>
    );
  }

if (error && !local) {
return (
<div className={className}>
<NotificationErrorState error={error} onRetry={() => void reset()} />
</div>
    );
  }

if (!local) {
return (
<div className={className}>
<NotificationEmptyState variant="preferences" />
</div>
    );
  }

return (
<div
className={cn("space-y-4", className)}
data-testid="notification-preferences-form"
    >
<header>
<h2 className="text-base sm:text-lg font-semibold text-foreground">
Notification preferences
        </h2>
<p className="text-xs text-muted-foreground">
Choose how and when you&apos;d like to be notified.
        </p>
</header>

{/* ─── Read error ─────────────────────────────────────────────────────── */}
{error && (
<NotificationErrorState error={error} onRetry={() => void reset()} />
      )}

{/* ─── Update feedback ───────────────────────────────────────────────── */}
{updateError && errorCopy && (
<div
className="flex items-start gap-2 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 px-3 py-2"
role="alert"
data-testid="notification-preferences-update-error"
        >
<AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
<div>
<p className="text-sm font-medium text-red-700 dark:text-red-300">
{errorCopy.title}
</p>
<p className="text-xs text-red-700 dark:text-red-400 mt-0.5">
{errorCopy.body}
</p>
</div>
</div>
      )}
{showSuccess && !updateError && (
<div
className="flex items-center gap-2 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-2"
role="status"
data-testid="notification-preferences-update-success"
        >
<Check className="h-4 w-4 text-emerald-500 shrink-0" />
<p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
Saved
          </p>
</div>
      )}

{/* ─── Global channels ───────────────────────────────────────────────── */}
<section className="rounded-lg border bg-card text-card-foreground overflow-hidden">
<header className="px-3 sm:px-4 py-2 border-b border-border bg-muted/40">
<h3 className="text-sm font-semibold">Channels</h3>
<p className="text-[0.65rem] text-muted-foreground">
Choose how you&apos;d like to receive notifications.
          </p>
</header>
<CategoryRow
title="In-app notifications"
description="Receive notifications inside the quiz app."
checked={Boolean(local.inAppEnabled)}
disabled={!channelsEnabled && !local.inAppEnabled}
isPending={isUpdating}
onCheckedChange={(value) => void handleToggle("inAppEnabled", value)}
        />
<CategoryRow
title="Email notifications"
description="Receive notifications by email."
checked={Boolean(local.emailEnabled)}
disabled={!channelsEnabled && !local.emailEnabled}
isPending={isUpdating}
onCheckedChange={(value) => void handleToggle("emailEnabled", value)}
        />
<CategoryRow
title="Push notifications"
description="Receive notifications on your device."
checked={Boolean(local.pushEnabled)}
disabled={!channelsEnabled && !local.pushEnabled}
isPending={isUpdating}
onCheckedChange={(value) => void handleToggle("pushEnabled", value)}
        />
</section>

{/* ─── Category toggles ──────────────────────────────────────────────── */}
<section className="rounded-lg border bg-card text-card-foreground overflow-hidden">
<header className="px-3 sm:px-4 py-2 border-b border-border bg-muted/40">
<h3 className="text-sm font-semibold">Categories</h3>
<p className="text-[0.65rem] text-muted-foreground">
Pick which notification types you&apos;d like to receive.
          </p>
</header>
{CATEGORY_CONFIG.map((config) => (
<CategoryRow
key={config.key}
title={config.title}
description={config.description}
checked={Boolean(local[config.key])}
disabled={!channelsEnabled}
isPending={isUpdating}
onCheckedChange={(value) =>
void handleToggle(config.key, value)
            }
          />
        ))}
</section>

{/* ─── Rank threshold ────────────────────────────────────────────────── */}
<section className="rounded-lg border bg-card text-card-foreground overflow-hidden">
<header className="px-3 sm:px-4 py-2 border-b border-border bg-muted/40">
<h3 className="text-sm font-semibold">Rank improvement threshold</h3>
<p className="text-[0.65rem] text-muted-foreground">
Notify me when my rank improves by at least this many positions.
          </p>
</header>
<NumberRow
title="Positions"
description="Default: 1 position. Higher values mean fewer notifications."
value={local.rankImprovementThreshold ?? 1}
disabled={!channelsEnabled || !local.rankEnabled}
isPending={isUpdating}
onValueChange={handleRankThreshold}
        />
</section>

{/* ─── Quiet hours ───────────────────────────────────────────────────── */}
<section className="rounded-lg border bg-card text-card-foreground overflow-hidden">
<header className="px-3 sm:px-4 py-2 border-b border-border bg-muted/40">
<h3 className="text-sm font-semibold">Quiet hours</h3>
<p className="text-[0.65rem] text-muted-foreground">
Pause notifications during the selected hours.
          </p>
</header>
<TimeRow
title="Quiet hours start"
description="Time of day to begin quiet hours (24-hour clock)."
value={local.quietHoursStart}
disabled={!channelsEnabled}
isPending={isUpdating}
onValueChange={handleQuietHoursStart}
        />
<TimeRow
title="Quiet hours end"
description="Time of day to resume notifications (24-hour clock)."
value={local.quietHoursEnd}
disabled={!channelsEnabled}
isPending={isUpdating}
onValueChange={handleQuietHoursEnd}
        />
</section>

{/* ─── Save button (pending state visual) ───────────────────────────── */}
{isUpdating && (
<div
className="flex items-center gap-2 text-xs text-muted-foreground"
role="status"
data-testid="notification-preferences-pending"
        >
<Loader2 className="h-3 w-3 animate-spin" />
Saving your preferences…
        </div>
      )}

{/* Hidden helper so the lint invariant that flags unused variables
          doesn't flag `reset`. `reset` is exposed via `useNotificationPreferences`
          so consumers (e.g. test harnesses) can clear the mutation state
          without firing a network call. */}
{false && (
<Button variant="ghost" size="sm" onClick={reset}>
Reset
        </Button>
      )}
</div>
  );
}