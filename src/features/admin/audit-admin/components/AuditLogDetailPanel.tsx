"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAdminAuditLogEntry } from "../hooks/useAdminAuditLogEntry";
import type { AuditLogEntryDto } from "../types";
import { RequestIdBanner } from "@/features/admin/components/RequestIdBanner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/Sheet";

function formatFullTimestamp(iso: string): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  }).format(new Date(iso));
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
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = (field: string, text: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1800);
  };

  const displayedEntry: AuditLogEntryDto | null = entry ?? initialEntry ?? null;

  return (
    <Sheet open={Boolean(entryId)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg overflow-y-auto p-0"
        data-testid="audit-log-detail-panel"
      >
        <SheetHeader className="border-b border-border px-6 py-4">
          <SheetTitle
            id="audit-log-detail-title"
            data-testid="audit-log-detail-title"
            className="text-base font-semibold text-foreground"
          >
            Audit Log Entry
          </SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground">
            Detailed parameter inspection and security metadata.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6">
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
            <div className="space-y-5 text-sm">
              {/* Event Summary Card */}
              <div className="rounded-lg border border-border/80 bg-card p-4 space-y-3">
                <div data-testid="audit-log-detail-action">
                  <span className="text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground block mb-1">
                    Action
                  </span>
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 font-mono text-xs font-medium ${getActionBadgeStyle(
                      displayedEntry.action,
                    )}`}
                  >
                    {displayedEntry.action}
                  </span>
                </div>

                <div data-testid="audit-log-detail-timestamp">
                  <span className="text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground block mb-1">
                    Timestamp
                  </span>
                  <span className="font-mono text-sm text-foreground">
                    {formatFullTimestamp(displayedEntry.timestamp)}
                  </span>
                </div>
              </div>

              {/* Resource & Actor Card */}
              <div className="rounded-lg border border-border/80 bg-card p-4 space-y-3.5">
                <div data-testid="audit-log-detail-target">
                  <span className="text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground block mb-1">
                    Target
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">
                      {displayedEntry.targetType}
                    </span>
                    <span className="break-all font-mono text-xs text-muted-foreground">
                      ({displayedEntry.targetId})
                    </span>
                  </div>
                </div>

                <div data-testid="audit-log-detail-actor">
                  <span className="text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground block mb-1">
                    Actor
                  </span>
                  <span className="break-all font-mono text-sm text-foreground">
                    {displayedEntry.actorId}
                  </span>
                </div>
              </div>

              {/* Identity & Traceability Card */}
              <div className="rounded-lg border border-border/80 bg-muted/30 p-4 space-y-3">
                <div data-testid="audit-log-detail-id">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">
                      Entry ID
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy("id", displayedEntry.id)}
                      className="h-6 px-1.5 text-xs text-muted-foreground hover:text-foreground gap-1"
                      title="Copy Entry ID"
                    >
                      {copiedField === "id" ? (
                        <>
                          <Check className="h-3 w-3 text-emerald-500" />
                          <span className="text-xs text-emerald-500 font-mono">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          <span className="text-xs font-mono">Copy</span>
                        </>
                      )}
                    </Button>
                  </div>
                  <span className="mt-1 block break-all font-mono text-xs text-foreground">
                    {displayedEntry.id}
                  </span>
                </div>

                <div data-testid="audit-log-detail-request-id">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">
                      Request ID
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy("requestId", displayedEntry.requestId)}
                      className="h-6 px-1.5 text-xs text-muted-foreground hover:text-foreground gap-1"
                      title="Copy Request ID"
                    >
                      {copiedField === "requestId" ? (
                        <>
                          <Check className="h-3 w-3 text-emerald-500" />
                          <span className="text-xs text-emerald-500 font-mono">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          <span className="text-xs font-mono">Copy</span>
                        </>
                      )}
                    </Button>
                  </div>
                  <span className="mt-1 block break-all font-mono text-xs text-foreground">
                    {displayedEntry.requestId}
                  </span>
                </div>

                {displayedEntry.correlationId && (
                  <div data-testid="audit-log-detail-correlation-id">
                    <span className="text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground block mb-1">
                      Correlation ID
                    </span>
                    <span className="break-all font-mono text-xs text-foreground">
                      {displayedEntry.correlationId}
                    </span>
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-dashed border-border bg-muted/20 p-3.5 text-xs text-muted-foreground">
                Sensitive payload fields are not displayed.
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
