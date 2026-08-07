/**
 * `ConnectionStatusBadge` — small accessibility-friendly status pill
 * that surfaces the current `/notifications` socket connection state.
 *
 * Source epic:   Epic 6.10 — Realtime Social Notifications and Relationship
 *                Invalidation.
 * Source ticket: TKT-6.10.E9.
 *
 * ## Purpose
 *
 * Render a non-blocking indicator near the social feed header so users
 * understand why their notification feed may be lagging when the
 * socket is in a non-`connected` state.
 *
 * Visual contract:
 *
 *   - `connected`        — renders nothing (no visual footprint).
 *   - `connecting`       — subtle "Connecting…" pill.
 *   - `reconnecting`     — subtle "Reconnecting…" pill.
 *   - `disconnected`     — generic "Live updates unavailable" pill.
 *   - `auth_required`    — actionable "Sign in again to see live updates"
 *                          pill that links to the re-auth route.
 *   - `idle`             — renders nothing (no attempt yet).
 *
 * Accessibility:
 *
 *   - The pill carries `role="status"` and `aria-live="polite"` so
 *     screen readers announce the transition without grabbing focus.
 *   - The auth-required link is keyboard-navigable (a real `<a>`
 *     element with `href`).
 *
 * The component NEVER blocks the UI — there is no overlay, modal, or
 * full-page spinner. It is intended to live inline next to the
 * notification feed header.
 *
 * ## `friendshipId` / `followId` hygiene
 *
 * The badge text never includes `friendshipId` or `followId`. The
 * copy strings are sourced from a static registry (`STATUS_COPY`)
 * declared in the file.
 */

"use client";

import { useSocket, NOTIFICATIONS_NAMESPACE } from "@/lib/realtime";
import type { SocketConnectionState } from "@/lib/realtime";

/**
 * The auth re-auth route the badge links to when the socket has
 * reported `auth_required`. The constant is co-located with the
 * component so the link target is grep-able.
 */
const AUTH_REAUTH_HREF = "/login?reason=session-expired" as const;

/**
 * The deterministic user-copy registry keyed by `SocketConnectionState`.
 * Each entry carries:
 *
 *   - `label`     — the visible text.
 *   - `tone`      — the visual tone (informational / warning / error).
 *   - `href`      — optional link target (only set on `auth_required`).
 *
 * The registry is exported for unit-test assertions so the spec
 * does not duplicate the strings.
 */
export interface ConnectionStatusBadgeCopy {
  /** Visible text inside the pill. */
  label: string;
  /** Visual tone — informational / warning / error. */
  tone: "informational" | "warning" | "error";
  /** Optional link target. */
  href?: string;
}

export const STATUS_COPY: Record<SocketConnectionState, ConnectionStatusBadgeCopy | null> = {
  idle: null,
  connecting: { label: "Connecting…", tone: "informational" },
  connected: null,
  reconnecting: { label: "Reconnecting…", tone: "informational" },
  disconnected: { label: "Live updates unavailable", tone: "warning" },
  auth_required: {
    label: "Sign in again to see live updates",
    tone: "error",
    href: AUTH_REAUTH_HREF,
  },
};

/**
 * Determine whether the badge should render at all for a given state.
 * Returns `true` for states with copy, `false` for `idle` and `connected`.
 */
export function shouldRenderStatusBadge(state: SocketConnectionState): boolean {
  return STATUS_COPY[state] !== null;
}

/**
 * The `ConnectionStatusBadge` component.
 *
 * Renders nothing visually when the socket is `connected` or `idle`;
 * otherwise renders an inline pill with the documented copy.
 *
 * The component is intentionally pure — it does not call
 * `socket.connect()` or trigger any side effect. It is a presentational
 * wrapper around `useSocket(NOTIFICATIONS_NAMESPACE)`.
 */
export function ConnectionStatusBadge(): React.ReactElement | null {
  const { connectionState } = useSocket(NOTIFICATIONS_NAMESPACE);

  const copy = STATUS_COPY[connectionState];
  if (copy === null) {
    return null;
  }

  const dataTestId = `connection-status-badge-${connectionState}`;
  const className = `connection-status-badge connection-status-badge--${copy.tone}`;

  if (copy.href !== undefined) {
    return (
      <a
        role="status"
        aria-live="polite"
        href={copy.href}
        className={className}
        data-testid={dataTestId}
      >
        {copy.label}
      </a>
    );
  }

  return (
    <span
      role="status"
      aria-live="polite"
      className={className}
      data-testid={dataTestId}
    >
      {copy.label}
    </span>
  );
}