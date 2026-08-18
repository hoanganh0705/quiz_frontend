

"use client";

import { useSocket, NOTIFICATIONS_NAMESPACE } from "@/lib/realtime";
import type { SocketConnectionState } from "@/lib/realtime";

const AUTH_REAUTH_HREF = "/login?reason=session-expired" as const;

export interface ConnectionStatusBadgeCopy {

label: string;

tone: "informational" | "warning" | "error";

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

export function shouldRenderStatusBadge(state: SocketConnectionState): boolean {
return STATUS_COPY[state] !== null;
}

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