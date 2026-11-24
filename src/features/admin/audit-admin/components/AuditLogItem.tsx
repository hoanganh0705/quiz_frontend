"use client";

import { memo } from "react";

import type { AuditLogEntryDto } from "../types";

function formatTimestamp(iso: string): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function formatAction(action: string): string {
  return action
    .split(".")
    .map((part) =>
      part
        .split("_")
        .map((w) => (w.length === 0 ? w : w[0]!.toUpperCase() + w.slice(1)))
        .join(" "),
    )
    .join(" › ");
}

export interface AuditLogItemProps {
  entry: AuditLogEntryDto;

  onClick: (entry: AuditLogEntryDto) => void;
}

function getActionBadgeStyle(action: string): string {
  const lower = action.toLowerCase();
  if (lower.includes("delete") || lower.includes("revoke") || lower.includes("ban")) {
    return "bg-destructive/10 text-destructive border border-destructive/20";
  }
  if (lower.includes("grant") || lower.includes("create") || lower.includes("add")) {
    return "bg-primary/10 text-primary border border-primary/20";
  }
  return "bg-muted text-foreground/80 border border-border/50";
}

export const AuditLogItem = memo(function AuditLogItem({
  entry,
  onClick,
}: AuditLogItemProps): React.ReactElement {
  const handleClick = () => {
    onClick(entry);
  };

  const badgeStyle = getActionBadgeStyle(entry.action);

  return (
    <button
      type="button"
      aria-label={`View audit entry for ${formatAction(entry.action)} on ${entry.targetType}`}
      className="group w-full cursor-pointer rounded-lg border border-border/80 bg-card p-3 sm:p-3.5 text-left shadow-2xs transition-all duration-150 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-muted/30 hover:shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onClick={handleClick}
      data-testid="audit-log-item"
      data-entry-id={entry.id}
    >
      <div className="flex flex-col gap-2 sm:grid sm:grid-cols-[140px_1fr_auto] lg:grid-cols-[160px_1fr_160px_110px_auto] sm:items-center sm:gap-4">
        {/* Col 1: Action Badge (+ Mobile Timestamp) */}
        <div className="flex items-center justify-between sm:justify-start">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-mono text-xs font-medium shrink-0 truncate max-w-[150px] ${badgeStyle}`}
            data-testid="audit-log-item-action"
          >
            {formatAction(entry.action)}
          </span>
          {/* Mobile-only timestamp */}
          <span className="sm:hidden font-mono text-xs text-muted-foreground whitespace-nowrap">
            {formatTimestamp(entry.timestamp)}
          </span>
        </div>

        {/* Col 2: Target */}
        <div
          className="flex items-center gap-1.5 text-xs min-w-0"
          data-testid="audit-log-item-target"
        >
          <span className="font-semibold text-foreground shrink-0">
            {entry.targetType}
          </span>
          <span className="font-mono text-muted-foreground truncate">
            {entry.targetId}
          </span>
        </div>

        {/* Col 3: Actor */}
        <div
          className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0"
          data-testid="audit-log-item-actor"
        >
          <span className="shrink-0 text-muted-foreground/70">by</span>
          <span className="font-mono text-foreground/80 truncate">
            {entry.actorId}
          </span>
        </div>

        {/* Col 4: Request ID (Desktop only) */}
        <div
          className="hidden lg:block font-mono text-xs text-muted-foreground/80 truncate"
          data-testid="audit-log-item-request-id"
        >
          {entry.requestId ? `${entry.requestId.slice(0, 10)}…` : "—"}
        </div>

        {/* Col 5: Timestamp (Tablet & Desktop) */}
        <div
          className="hidden sm:block text-right font-mono text-xs text-muted-foreground whitespace-nowrap"
          data-testid="audit-log-item-timestamp"
        >
          {formatTimestamp(entry.timestamp)}
        </div>
      </div>
    </button>
  );
});
