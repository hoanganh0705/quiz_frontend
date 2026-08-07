'use client';

/**
 * `AuditLogList.tsx`
 *
 * Source epic:   Epic 7.11 — Admin Audit Log Surface and Backend Capability Verification.
 * Source ticket: TKT-7.11.D2.
 *
 * ## What this component owns
 *
 * The paginated audit log entries list. Each entry is rendered via
 * the `AuditLogItem` component. Handles empty state via the parent
 * (this component is a list renderer, not a state orchestrator).
 *
 * ## Accessibility
 *
 * - Uses `<ul>` semantics with `role="list"` for proper ARIA labelling
 * - Each item is a `role="button"` for keyboard navigation
 */

import type { AuditLogEntryDto } from '../types';

import { AuditLogItem } from './AuditLogItem';

// ─── Props ──────────────────────────────────────────────────────────────────

export interface AuditLogListProps {
  /** Array of audit log entries to render. */
  entries: readonly AuditLogEntryDto[];
  /** Invoked when an entry is clicked. */
  onEntryClick: (entry: AuditLogEntryDto) => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function AuditLogList({
  entries,
  onEntryClick,
}: AuditLogListProps): React.ReactElement {
  return (
    <ul
      role="list"
      aria-label="Audit log entries"
      className="m-0 list-none space-y-2 p-0"
      data-testid="audit-log-list"
    >
      {entries.map((entry) => (
        <li key={entry.id} className="list-none">
          <AuditLogItem entry={entry} onClick={onEntryClick} />
        </li>
      ))}
    </ul>
  );
}