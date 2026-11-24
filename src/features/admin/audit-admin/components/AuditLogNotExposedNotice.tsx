"use client";

import { AlertTriangle } from "lucide-react";

export function AuditLogNotExposedNotice(): React.ReactElement {
  return (
    <section
      role="alert"
      aria-labelledby="audit-log-not-exposed-title"
      className="rounded-xl border border-warning/30 bg-warning/10 p-6 text-foreground"
      data-testid="audit-log-not-exposed-notice"
    >
      <div className="flex items-start gap-3.5">
        <AlertTriangle
          aria-hidden="true"
          className="mt-0.5 h-5 w-5 shrink-0 text-warning"
        />
        <div className="flex-1 space-y-3">
          <div>
            <h2
              id="audit-log-not-exposed-title"
              className="text-base font-semibold text-foreground"
              data-testid="audit-log-not-exposed-title"
            >
              Audit Log Endpoints Not Exposed by Backend
            </h2>
            <p
              className="mt-1 text-sm text-muted-foreground leading-relaxed"
              data-testid="audit-log-not-exposed-body"
            >
              The admin audit log surface connects to{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
                GET /admin/audit
              </code>{" "}
              and{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
                GET /admin/audit/:entryId
              </code>
              . The backend currently reports these endpoints as unavailable.
              Administrative actions continue to be recorded in application breadcrumbs.
            </p>
          </div>

          <p
            className="text-xs text-muted-foreground"
            data-testid="audit-log-not-exposed-footnote"
          >
            When the backend service exposes the audit log API, this viewer
            will automatically populate with live platform events.
          </p>
        </div>
      </div>
    </section>
  );
}
