'use client';

/**
 * `AuditLogNotExposedNotice.tsx`
 *
 * Source epic:   Epic 7.11 — Admin Audit Log Surface and Backend Capability Verification.
 * Source ticket: TKT-7.11.E1.
 *
 * ## What this component owns
 *
 * The degradation notice displayed when the backend does not expose
 * `GET /admin/audit` (per TKT-7.11.A1 verification).
 *
 * The notice:
 *   - Clearly states the audit log is not exposed by the backend
 *   - Links to the local Sentry project for triage
 *   - Includes a documentation reference
 *   - Does not suggest functionality that does not exist
 *
 * ## What this component does NOT do
 *
 *   - It does NOT fetch data
 *   - It does NOT retry
 *   - It does NOT log to Sentry (callers handle observability)
 */

import { AlertTriangle, ExternalLink, FileText } from 'lucide-react';

// ─── Constants ──────────────────────────────────────────────────────────────

/**
 * Link to the local Sentry project for audit log triage.
 * Replace `SENTRY_PROJECT_SLUG` and `SENTRY_ORG_SLUG` with the
 * organization's actual values once the Sentry project is provisioned.
 */
const SENTRY_AUDIT_TRIAGE_URL =
  'https://sentry.io/organizations/SENTRY_ORG_SLUG/projects/quiz-audit-log/';

/**
 * Path to the in-repo audit log endpoint contract documentation.
 * Used in the "Documentation" link.
 */
const AUDIT_DOC_PATH = 'src/features/admin/audit-admin/docs/AUDIT_ENDPOINT_CONTRACT.md';

// ─── Component ──────────────────────────────────────────────────────────────

export function AuditLogNotExposedNotice(): React.ReactElement {
  return (
    <section
      role="alert"
      aria-labelledby="audit-log-not-exposed-title"
      className="rounded-md border border-amber-300/60 bg-amber-50 p-6 dark:border-amber-700/40 dark:bg-amber-950/30"
      data-testid="audit-log-not-exposed-notice"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle
          aria-hidden="true"
          className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-400"
        />
        <div className="flex-1 space-y-3">
          <div>
            <h2
              id="audit-log-not-exposed-title"
              className="text-sm font-semibold text-foreground"
              data-testid="audit-log-not-exposed-title"
            >
              Audit log endpoint not exposed by backend
            </h2>
            <p
              className="mt-1 text-sm text-muted-foreground"
              data-testid="audit-log-not-exposed-body"
            >
              The Phase 7 admin audit log surface requires{' '}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
                GET /admin/audit
              </code>{' '}
              and{' '}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
                GET /admin/audit/:entryId
              </code>
              . The backend has not exposed these endpoints. Admin actions
              continue to be recorded in Sentry breadcrumbs for triage.
            </p>
          </div>

          <div className="flex flex-col gap-2 text-sm">
            <a
              href={SENTRY_AUDIT_TRIAGE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary"
              data-testid="audit-log-not-exposed-sentry-link"
            >
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
              View audit-related Sentry breadcrumbs
            </a>
            <a
              href={`https://github.com/example/quiz/blob/main/${AUDIT_DOC_PATH}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary"
              data-testid="audit-log-not-exposed-docs-link"
            >
              <FileText className="h-4 w-4" aria-hidden="true" />
              Audit endpoint contract documentation
            </a>
          </div>

          <p
            className="text-xs text-muted-foreground/70"
            data-testid="audit-log-not-exposed-footnote"
          >
            When the backend exposes the audit endpoints, this notice is
            replaced by the full audit log viewer automatically.
          </p>
        </div>
      </div>
    </section>
  );
}