"use client";

/**
 * `SessionRow` — renders a single `SessionListItemDto` row.
 *
 * Source epic: Epic 2.8 — Security dashboard and active-session management.
 * Source ticket: 2.8.T13.
 *
 * ## Composition contract
 *
 * The row is the leaf unit of the active-sessions list (US-2.8.2).
 * It owns:
 *
 *   - Every field on `SessionListItemDto` with null-fallback copy
 *     ("Unknown browser", "Unknown OS", "Unknown IP", "Unknown
 *     device") — pulled from `security-copy.ts`.
 *   - The "This device" badge for the row where `isCurrentSession`
 *     is true.
 *   - The per-row revoke button — disabled on the current session
 *     row (the row has nothing to revoke; revoking the current
 *     session through the list UI is handled by `useRevokeSession`
 *     → `revokeCurrentSession` in T17).
 *   - An *isolated* `pending` flag — clicking Revoke on row A does
 *     not grey out the button on row B.
 *
 * ## Null discipline
 *
 * The backend marks `deviceBrowser`, `deviceOs`, `ipAddress` as
 * `@nullable` because user-agent parsing can fail (e.g. unfamiliar
 * bots, malformed headers). The row NEVER renders an empty string
 * for any of those fields — `security-copy.ts` carries the
 * fallback strings so the registry is the single source of truth
 * for "Unknown X".
 *
 * `deviceType` is non-nullable (the backend always emits at least
 * `"unknown"`). The row surfaces it lower in the device line
 * (e.g. "Chrome on macOS · desktop") so the user has the
 * distinguishing information first.
 *
 * ## Current-session treatment
 *
 * Two visual contracts:
 *
 *   1. The "This device" badge — anchored at the right edge so
 *      the row aligns with sibling rows.
 *   2. The revoke button is replaced by an inert marker ("This is
 *      your current session") so the row is non-actionable but
 *      still visibly distinct.
 *
 * The row NEVER decides on its own what to do when revoke is
 * clicked on the current session — that path is upstream (the
 * parent list passes a no-op or hides the button). The row just
 * renders the disabled state.
 */

import { memo, useMemo } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { COPY_KEYS, resolveCopy } from "@/features/auth/copy/security-copy";
import type { SessionListItemDto } from "@/lib/api";

export interface SessionRowProps {
  session: SessionListItemDto;
  /**
   * Pending flag for THIS row only. The parent tracks per-row
   * state so a pending revoke on row A does not grey out row B.
   */
  pending?: boolean;
  /**
   * Per-row revoke callback. Fired when the user clicks the row's
   * Revoke button. The parent owns confirmation, optimistic
   * updates, and revalidation.
   */
  onRevoke?: (sessionId: string) => void;
}

/**
 * Format the `lastActiveAt` timestamp using `Intl.DateTimeFormat`.
 * Returns `null` for an unparseable input — callers render the
 * raw timestamp in that case (rare; the backend's RFC 3339 is the
 * only emitted shape).
 */
function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
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
 * Build the human-readable device line.
 *   "Chrome on macOS · desktop"
 * Falls back per-field via `security-copy.ts` when any nullable
 * field is missing.
 */
function buildDeviceLine(session: SessionListItemDto): string {
  const browser =
    session.deviceBrowser ?? resolveCopy(COPY_KEYS.sessionList.browserFallback);
  const os = session.deviceOs ?? resolveCopy(COPY_KEYS.sessionList.osFallback);
  return `${browser} on ${os} · ${session.deviceType}`;
}

function SessionRowInner({
  session,
  pending = false,
  onRevoke,
}: SessionRowProps) {
  const deviceLine = useMemo(() => buildDeviceLine(session), [session]);
  const lastActiveText = useMemo(
    () => formatTimestamp(session.lastActiveAt),
    [session.lastActiveAt],
  );
  const ipDisplay = useMemo(
    () => session.ipAddress ?? resolveCopy(COPY_KEYS.sessionList.ipFallback),
    [session.ipAddress],
  );

  const handleRevoke = () => {
    if (session.isCurrentSession || pending || !onRevoke) return;
    onRevoke(session.sessionId);
  };

  return (
    <div
      className="flex items-start gap-4 py-4 border-b border-border last:border-b-0"
      data-testid="session-row"
      data-current={session.isCurrentSession}
      data-session-id={session.sessionId}
    >
      {/* Device summary column */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span
            className="text-base font-medium truncate"
            data-testid="session-row-device"
          >
            {deviceLine}
          </span>
          {session.isCurrentSession && (
            <Badge
              variant="secondary"
              data-testid="session-row-current-badge"
              aria-label={resolveCopy(COPY_KEYS.sessionList.currentBadge)}
            >
              {resolveCopy(COPY_KEYS.sessionList.currentBadge)}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3 text-sm text-foreground-secondary flex-wrap">
          <span data-testid="session-row-ip">
            <span className="sr-only">IP address: </span>
            {ipDisplay}
          </span>
          <span aria-hidden="true">·</span>
          <span data-testid="session-row-last-active">
            <span className="sr-only">Last active: </span>
            {lastActiveText}
          </span>
        </div>
      </div>

      {/* Action column — current-session row is non-actionable. */}
      <div className="shrink-0">
        {session.isCurrentSession ? (
          <span
            className="text-sm text-foreground-secondary italic"
            data-testid="session-row-current-marker"
          >
            {/* Inert marker so the layout reserves the same
                column width as the revoke button on sibling rows. */}
            This is your current session
          </span>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={handleRevoke}
            disabled={pending || !onRevoke}
            aria-busy={pending}
            data-testid="session-row-revoke-button"
            data-pending={pending}
          >
            {pending ? "Revoking…" : "Revoke"}
          </Button>
        )}
      </div>
    </div>
  );
}

export const SessionRow = memo(SessionRowInner);
