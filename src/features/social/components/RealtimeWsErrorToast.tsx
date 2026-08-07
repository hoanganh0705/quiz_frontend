/**
 * `RealtimeWsErrorToast` — small inline toast that surfaces the most
 * recent Phase 5 WebSocket error using the Epic 6.10 user-copy
 * registry.
 *
 * Source epic:   Epic 6.10 — Realtime Social Notifications and Relationship
 *                Invalidation.
 * Source ticket: TKT-6.10.F1.
 *
 * ## Purpose
 *
 * Mounts in `RealtimeSocialShell` (TKT-6.10.G1) and renders a single
 * accessibility-friendly toast with the copy for the most recent WS
 * error. The toast reads `useSocket(NOTIFICATIONS_NAMESPACE)` and
 * reads the most recent `WsError` from the connection state.
 *
 * The component:
 *
 *   1. Renders nothing when there is no current `WsError` (success
 *      case — the socket is either connected or no error has fired
 *      yet).
 *   2. Renders the user-copy for the error code, sourced from
 *      `realtime-ws-error-copy.ts` (TKT-6.10.F1).
 *   3. Coerces Phase 5 error codes (e.g. `AUTH_TOKEN_EXPIRED`,
 *      `RATE_LIMITED`, `SERVER_ERROR`) into the Epic 6.10 code
 *      family via `mapWsErrorToRealtimeCode`.
 *   4. Does NOT auto-dismiss `WS_AUTH_EXPIRED` — the user must
 *      re-authenticate. Other codes are dismissible via the
 *      `actionLabel` button (which currently links to the re-auth
 *      route for `WS_AUTH_EXPIRED`).
 *   5. Carries `role="status"` and `aria-live="polite"` so screen
 *      readers announce transitions without grabbing focus.
 *
 * ## Transport-decoupling
 *
 * The toast never renders the raw `WsError.message` field — only the
 * curated copy from the registry. Transport details (codes, raw
 * messages, request ids) are intentionally hidden from the user.
 *
 * ## `friendshipId` / `followId` hygiene
 *
 * The toast's rendered text never includes `friendshipId` or
 * `followId`; the registry guards against accidental leakage.
 */

"use client";

import { useSocket, NOTIFICATIONS_NAMESPACE } from "@/lib/realtime";

import {
  getRealtimeWsErrorCopy,
  mapWsErrorToRealtimeCode,
  type RealtimeWsErrorCode,
} from "@/features/social/realtime/realtime-ws-error-copy";

/**
 * The re-auth route the action button links to.
 */
const AUTH_REAUTH_HREF = "/login?reason=session-expired" as const;

function isPersistentCode(code: RealtimeWsErrorCode): boolean {
  return code === "WS_AUTH_EXPIRED";
}

/**
 * The `RealtimeWsErrorToast` component.
 *
 * Renders nothing visually when there is no current WS error. When
 * an error is present, renders a `<div role="status">` with the
 * user-copy for the error.
 *
 * The component is keyboard-accessible — the action button is a real
 * `<a>` element with `href` so Tab / Enter navigate to the re-auth
 * route.
 */
export function RealtimeWsErrorToast(): React.ReactElement | null {
  const { error } = useSocket(NOTIFICATIONS_NAMESPACE);

  if (error === null) {
    return null;
  }

  const code = mapWsErrorToRealtimeCode(error);
  const copy = getRealtimeWsErrorCopy(code);
  const persistent = isPersistentCode(code);

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid={copy.dataTestid}
      data-persistent={persistent ? "true" : "false"}
      className="realtime-ws-error-toast"
    >
      <strong className="realtime-ws-error-toast__title">{copy.title}</strong>
      <p className="realtime-ws-error-toast__description">{copy.description}</p>
      {copy.actionLabel !== undefined ? (
        <a
          href={AUTH_REAUTH_HREF}
          className="realtime-ws-error-toast__action"
        >
          {copy.actionLabel}
        </a>
      ) : null}
    </div>
  );
}