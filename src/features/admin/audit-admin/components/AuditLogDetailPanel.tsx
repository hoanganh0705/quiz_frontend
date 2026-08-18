'use client';

import { useEffect, useRef } from 'react';

import { ApiError } from '@/lib/api/core/ApiError';
import { RequestIdBanner } from '@/features/admin/components/RequestIdBanner';

import { useAdminAuditLogEntry } from '../hooks/useAdminAuditLogEntry';

import type { AuditLogEntryDto } from '../types';

function formatFullTimestamp(iso: string): string {
if (!iso) return '—';
return new Intl.DateTimeFormat('en-GB', {
weekday: 'short',
day: '2-digit',
month: 'short',
year: 'numeric',
hour: '2-digit',
minute: '2-digit',
second: '2-digit',
timeZoneName: 'short',
  }).format(new Date(iso));
}

export interface AuditLogDetailPanelProps {

entryId: string | null;

initialEntry?: AuditLogEntryDto | null;

onClose: () => void;
}

export function AuditLogDetailPanel({
entryId,
initialEntry,
onClose,
}: AuditLogDetailPanelProps): React.ReactElement | null {
const { entry, isLoading, error } = useAdminAuditLogEntry(entryId);
const panelRef = useRef<HTMLDivElement>(null);

useEffect(() => {
if (!entryId) return;
const handleKeyDown = (event: KeyboardEvent) => {
if (event.key === 'Escape') {
onClose();
      }
    };
document.addEventListener('keydown', handleKeyDown);
return () => document.removeEventListener('keydown', handleKeyDown);
  }, [entryId, onClose]);

const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
if (event.target === event.currentTarget) {
onClose();
    }
  };

if (!entryId) return null;

const displayedEntry: AuditLogEntryDto | null = entry ?? initialEntry ?? null;

return (
<div
className="fixed inset-0 z-50 flex items-stretch justify-end bg-black/40"
onClick={handleBackdropClick}
data-testid="audit-log-detail-backdrop"
role="dialog"
aria-modal="true"
aria-labelledby="audit-log-detail-title"
    >
<div
ref={panelRef}
className="flex w-full max-w-xl flex-col overflow-hidden bg-background shadow-xl"
data-testid="audit-log-detail-panel"
      >
{/* Header */}
<div className="flex items-center justify-between border-b border-border px-4 py-3">
<h2
id="audit-log-detail-title"
className="text-base font-semibold text-foreground"
          >
Audit log entry
          </h2>
<button
type="button"
className="rounded-md p-1 text-muted-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary"
onClick={onClose}
aria-label="Close detail panel"
data-testid="audit-log-detail-close"
          >
<svg
className="h-5 w-5"
fill="none"
viewBox="0 0 24 24"
stroke="currentColor"
strokeWidth={2}
aria-hidden="true"
            >
<path
strokeLinecap="round"
strokeLinejoin="round"
d="M6 18 18 6M6 6l12 12"
              />
</svg>
</button>
</div>

{/* Body */}
<div className="flex-1 overflow-y-auto p-4">
{isLoading && !displayedEntry && (
<p
className="text-sm text-muted-foreground"
data-testid="audit-log-detail-loading"
            >
Loading…
            </p>
          )}

{error && !displayedEntry && (
<div data-testid="audit-log-detail-error">
<RequestIdBanner error={error} />
</div>
          )}

{displayedEntry && (
<dl className="space-y-3 text-sm">
<div
className="rounded-md border border-border bg-muted/30 p-3"
data-testid="audit-log-detail-request-id"
              >
<dt className="text-xs font-medium uppercase text-muted-foreground">
Request ID
                </dt>
<dd className="mt-1 break-all font-mono text-sm">
{displayedEntry.requestId}
</dd>
</div>

{displayedEntry.correlationId && (
<div data-testid="audit-log-detail-correlation-id">
<dt className="text-xs font-medium uppercase text-muted-foreground">
Correlation ID
                  </dt>
<dd className="mt-1 break-all font-mono text-sm">
{displayedEntry.correlationId}
</dd>
</div>
              )}

<div data-testid="audit-log-detail-timestamp">
<dt className="text-xs font-medium uppercase text-muted-foreground">
Timestamp
                </dt>
<dd className="mt-1">
{formatFullTimestamp(displayedEntry.timestamp)}
</dd>
</div>

<div data-testid="audit-log-detail-action">
<dt className="text-xs font-medium uppercase text-muted-foreground">
Action
                </dt>
<dd className="mt-1">
<span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
{displayedEntry.action}
</span>
</dd>
</div>

<div data-testid="audit-log-detail-actor">
<dt className="text-xs font-medium uppercase text-muted-foreground">
Actor
                </dt>
<dd className="mt-1 break-all font-mono text-sm">
{displayedEntry.actorId}
</dd>
</div>

<div data-testid="audit-log-detail-target">
<dt className="text-xs font-medium uppercase text-muted-foreground">
Target
                </dt>
<dd className="mt-1 break-all font-mono text-sm">
{displayedEntry.targetType}: {displayedEntry.targetId}
</dd>
</div>

<div data-testid="audit-log-detail-id">
<dt className="text-xs font-medium uppercase text-muted-foreground">
Entry ID
                </dt>
<dd className="mt-1 break-all font-mono text-sm">
{displayedEntry.id}
</dd>
</div>

{/*
                Payload is intentionally NOT rendered.
                Per `docs/AUDIT_ENDPOINT_CONTRACT.md`, payload is redacted
                server-side and the frontend must not display it.
              */}
<div className="rounded-md border border-dashed border-border bg-muted/20 p-3 text-xs text-muted-foreground">
Sensitive payload fields are not displayed.
              </div>
</dl>
          )}
</div>
</div>
</div>
  );
}