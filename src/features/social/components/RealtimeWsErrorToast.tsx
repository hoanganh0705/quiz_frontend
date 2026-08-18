

"use client";

import { useSocket, NOTIFICATIONS_NAMESPACE } from "@/lib/realtime";

import {
getRealtimeWsErrorCopy,
mapWsErrorToRealtimeCode,
type RealtimeWsErrorCode,
} from "@/features/social/realtime/realtime-ws-error-copy";

const AUTH_REAUTH_HREF = "/login?reason=session-expired" as const;

function isPersistentCode(code: RealtimeWsErrorCode): boolean {
return code === "WS_AUTH_EXPIRED";
}

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