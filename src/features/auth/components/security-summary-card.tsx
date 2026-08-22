"use client";

/**
 * `SecuritySummaryCard` — renders every `AccountSecurityDto` field
 * with null-aware labels.
 *
 * Source epic: Epic 2.8 — Security dashboard and active-session management.
 * Source ticket: 2.8.T10.
 *
 * ## Composition contract
 *
 * This card owns the US-2.8.1 visual contract:
 *
 *   - **Email verification** — boolean badge ("Verified" /
 *     "Not verified").
 *   - **Active session count** — number with pluralised label
 *     ("1 device" / "5 devices").
 *   - **Last successful sign-in** — `Intl.DateTimeFormat` localised
 *     timestamp, or the null-fallback copy ("No sign-ins recorded
 *     yet").
 *   - **Password age** — either "1 day" / "N days", the
 *     "Not available" null-fallback, or the "Never changed"
 *     fallback (which is keyed off `lastPasswordChangeAt`, not
 *     `passwordAgeDays`, per the backend's derivation contract).
 *
 * ## Null-handling discipline
 *
 * Two distinct null cases must NOT collapse to the same label:
 *
 *   1. `lastPasswordChangeAt: null` AND `passwordAgeDays: null`
 *      ⇒ "Never changed" — the password has never been changed.
 *   2. `lastPasswordChangeAt: <date>` AND `passwordAgeDays: null`
 *      ⇒ "Not available" — the change was recorded but the
 *      derived value wasn't computed (server cache miss).
 *
 * The first case is *informative* (telling the user they should
 * change their password); the second case is a *neutral* data
 * gap. Rendering both as "0 days" or "Never changed" would
 * collapse the user-facing distinction and break the
 * US-2.8.1 acceptance criterion.
 *
 * ## Status states
 *
 *   - `loading` → renders `<SecuritySummarySkeleton />` (T11). No
 *     spinner (skeletons are stable footprints).
 *   - `error`   → renders an inline error banner with a Retry
 *     button that calls `refetch()`. Uses copy from
 *     `security-copy.dashboard.error.loadFailed`.
 *   - `success` → renders the populated card.
 *
 * ## Locale resolution
 *
 * `Intl.DateTimeFormat` accepts either an empty string (the
 * runtime default) or a BCP-47 tag. The project does not yet ship
 * a `useLocale()` hook, so this component falls back to
 * `navigator.language` (browser default) at the time of render.
 * That fallback will be replaced by `useLocale()` once T-LOCALE
 * lands, with no API change to this card.
 *
 * @see AccountSecurityDto
 * @see SecuritySummarySkeleton (2.8.T11)
 * @see useSecurityDashboard (2.8.T7)
 */

import { memo, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { InlineError } from "@/components/ui/loading-states/ErrorState";
import { Button } from "@/components/ui/Button";
import { COPY_KEYS, resolveCopy } from "@/features/auth/copy/security-copy";
import type { SecurityDashboardStatus } from "@/features/auth/hooks/use-security-dashboard";
import type { AccountSecurityDto } from "@/lib/api";
import { SecuritySummarySkeleton } from "./security-summary-skeleton";

export interface SecuritySummaryCardProps {
  data: AccountSecurityDto | null;
  status: SecurityDashboardStatus;
  error: { code?: string; message?: string } | null;
  refetch: () => Promise<void> | void;
}

/**
 * Format a timestamp using `Intl.DateTimeFormat` with the runtime
 * locale. Returns `null` for an unparseable input — callers must
 * handle null themselves (they typically render the null-fallback
 * copy from `security-copy.ts`).
 *
 * Pure function (no React state) so it can be hoisted and tested
 * in isolation.
 */
function formatTimestamp(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;

  const locale =
    typeof navigator !== "undefined" && navigator.language
      ? navigator.language
      : undefined;

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

/**
 * Resolve the password-age label per the null-handling discipline
 * documented in the file header.
 *
 * - `lastPasswordChangeAt == null && passwordAgeDays == null`
 *   → "Never changed" (informative)
 * - `lastPasswordChangeAt != null && passwordAgeDays == null`
 *   → "Not available" (neutral data gap)
 * - `passwordAgeDays == 1`
 *   → "1 day"
 * - `passwordAgeDays >= 2`
 *   → "N days"
 */
function resolvePasswordAge(
  passwordAgeDays: number | null,
  lastPasswordChangeAt: string | null,
): string {
  if (passwordAgeDays === null && lastPasswordChangeAt === null) {
    return resolveCopy(COPY_KEYS.dashboard.passwordAge.unknown);
  }
  if (passwordAgeDays === null) {
    return resolveCopy(COPY_KEYS.dashboard.passwordAge.notAvailable);
  }
  if (passwordAgeDays === 1) {
    return resolveCopy(COPY_KEYS.dashboard.passwordAge.daysSingular);
  }
  return resolveCopy(
    COPY_KEYS.dashboard.passwordAge.daysPlural(passwordAgeDays),
  );
}

/**
 * Pluralised device-count label.
 */
function resolveSessionCountLabel(activeSessionCount: number): string {
  if (activeSessionCount === 1) {
    return resolveCopy(COPY_KEYS.dashboard.activeSessionCount.singular);
  }
  return resolveCopy(
    COPY_KEYS.dashboard.activeSessionCount.plural(activeSessionCount),
  );
}

function SecuritySummaryCardInner({
  data,
  status,
  error,
  refetch,
}: SecuritySummaryCardProps) {
  // Loading branch — stable footprint, no spinner.
  if (status === "loading") {
    return (
      <Card data-testid="security-summary-card" data-status="loading">
        <CardHeader>
          <CardTitle>{resolveCopy(COPY_KEYS.dashboard.title)}</CardTitle>
        </CardHeader>
        <CardContent>
          <SecuritySummarySkeleton />
        </CardContent>
      </Card>
    );
  }

  // Error branch — inline banner with Retry button.
  if (status === "error" || !data) {
    const inlineMessage = error?.message
      ? `${resolveCopy(COPY_KEYS.dashboard.error.loadFailed.body)} (${error.message})`
      : resolveCopy(COPY_KEYS.dashboard.error.loadFailed.body);

    return (
      <Card data-testid="security-summary-card" data-status="error">
        <CardHeader>
          <CardTitle>{resolveCopy(COPY_KEYS.dashboard.title)}</CardTitle>
        </CardHeader>
        <CardContent>
          <InlineError
            message={`${resolveCopy(COPY_KEYS.dashboard.error.loadFailed.title)} — ${inlineMessage}`}
          />
          <div className="mt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void refetch();
              }}
            >
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Success branch — render every AccountSecurityDto field.
  return (
    <Card data-testid="security-summary-card" data-status="success">
      <CardHeader>
        <CardTitle>{resolveCopy(COPY_KEYS.dashboard.title)}</CardTitle>
      </CardHeader>
      <CardContent>
        <SuccessFields data={data} />
      </CardContent>
    </Card>
  );
}

/**
 * The populated-fields panel, split out so the parent card
 * structure can stay memo-stable across loading/error/success.
 */
function SuccessFields({ data }: { data: AccountSecurityDto }) {
  const lastLoginText = useMemo(
    () => formatTimestamp(data.lastSuccessfulLoginAt),
    [data.lastSuccessfulLoginAt],
  );

  const passwordAgeText = useMemo(
    () => resolvePasswordAge(data.passwordAgeDays, data.lastPasswordChangeAt),
    [data.passwordAgeDays, data.lastPasswordChangeAt],
  );

  const sessionCountLabel = useMemo(
    () => resolveSessionCountLabel(data.activeSessionCount),
    [data.activeSessionCount],
  );

  const emailVerifiedLabel = data.emailVerified
    ? resolveCopy(COPY_KEYS.dashboard.emailVerified.verified)
    : resolveCopy(COPY_KEYS.dashboard.emailVerified.unverified);

  return (
    <dl
      className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5"
      data-testid="security-summary-fields"
    >
      <Field
        label={resolveCopy(COPY_KEYS.dashboard.emailVerified.label)}
        testId="security-summary-email-verified"
        className={
          data.emailVerified
            ? "text-success dark:text-green-400"
            : "text-amber-600 dark:text-amber-400"
        }
      >
        {emailVerifiedLabel}
      </Field>

      <Field
        label={resolveCopy(COPY_KEYS.dashboard.activeSessionCount.label)}
        testId="security-summary-session-count"
      >
        {sessionCountLabel}
      </Field>

      <Field
        label={resolveCopy(COPY_KEYS.dashboard.lastLogin.label)}
        testId="security-summary-last-login"
      >
        {lastLoginText ?? resolveCopy(COPY_KEYS.dashboard.lastLogin.unknown)}
      </Field>

      <Field
        label={resolveCopy(COPY_KEYS.dashboard.passwordAge.label)}
        testId="security-summary-password-age"
      >
        {passwordAgeText}
      </Field>
    </dl>
  );
}

function Field({
  label,
  testId,
  className,
  children,
}: {
  label: string;
  testId: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-sm text-foreground-secondary mb-1">{label}</dt>
      <dd
        className={`text-base font-medium ${className ?? ""}`}
        data-testid={testId}
      >
        {children}
      </dd>
    </div>
  );
}

export const SecuritySummaryCard = memo(SecuritySummaryCardInner);
