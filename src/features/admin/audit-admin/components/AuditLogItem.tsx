'use client';

/**
 * `AuditLogItem.tsx`
 *
 * Source epic:   Epic 7.11 — Admin Audit Log Surface and Backend Capability Verification.
 * Source ticket: TKT-7.11.D3.
 *
 * ## What this component owns
 *
 * One row for a single audit log entry:
 *   - Action (e.g., 'role.grant', 'tournament.delete')
 *   - Target type + ID
 *   - Actor ID
 *   - Localized timestamp
 *   - Request ID (when available)
 *
 * Click handler opens the detail panel via parent's callback.
 *
 * ## Sensitive payload redaction
 *
 * The component never renders the raw `payload` field. The `payload` is
 * redacted server-side per `docs/AUDIT_ENDPOINT_CONTRACT.md`.
 */

import { memo } from 'react';

import type { AuditLogEntryDto } from '../types';

// ─── Date helper ─────────────────────────────────────────────────────────────

function formatTimestamp(iso: string): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

// ─── Action display helper ──────────────────────────────────────────────────

/**
 * Format an action string for display.
 * Converts 'role.grant' → 'Role Grant', 'tournament.delete' → 'Tournament Delete'.
 */
function formatAction(action: string): string {
  return action
    .split('.')
    .map((part) =>
      part
        .split('_')
        .map((w) => (w.length === 0 ? w : w[0]!.toUpperCase() + w.slice(1)))
        .join(' '),
    )
    .join(' › ');
}

// ─── Props ──────────────────────────────────────────────────────────────────

export interface AuditLogItemProps {
  /** The audit log entry to display. */
  entry: AuditLogEntryDto;
  /** Invoked when the row is clicked. */
  onClick: (entry: AuditLogEntryDto) => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

export const AuditLogItem = memo(function AuditLogItem({
  entry,
  onClick,
}: AuditLogItemProps): React.ReactElement {
  const handleClick = () => {
    onClick(entry);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick(entry);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      className="flex cursor-pointer items-center gap-3 rounded-md border border-border bg-background p-3 transition-colors hover:bg-muted/40 focus:outline-none focus:ring-2 focus:ring-primary"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      data-testid="audit-log-item"
      data-entry-id={entry.id}
    >
      {/* Action */}
      <span
        className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
        data-testid="audit-log-item-action"
      >
        {formatAction(entry.action)}
      </span>

      {/* Target */}
      <div
        className="flex items-center gap-1 text-xs text-muted-foreground"
        data-testid="audit-log-item-target"
      >
        <span className="font-medium">{entry.targetType}</span>
        <span className="font-mono text-muted-foreground/70">
          {entry.targetId.slice(0, 8)}
          {entry.targetId.length > 8 ? '…' : ''}
        </span>
      </div>

      {/* Actor */}
      <div
        className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex"
        data-testid="audit-log-item-actor"
      >
        <span>by</span>
        <span className="font-mono">{entry.actorId.slice(0, 8)}…</span>
      </div>

      {/* Request ID (only if available) */}
      {entry.requestId && (
        <span
          className="hidden font-mono text-xs text-muted-foreground/60 lg:inline"
          data-testid="audit-log-item-request-id"
        >
          {entry.requestId.slice(0, 12)}
        </span>
      )}

      {/* Timestamp (pushed to right) */}
      <span
        className="ml-auto whitespace-nowrap text-xs text-muted-foreground"
        data-testid="audit-log-item-timestamp"
      >
        {formatTimestamp(entry.timestamp)}
      </span>
    </div>
  );
});