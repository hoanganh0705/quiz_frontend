

import type { WsError } from "@/lib/realtime/ws-error";

export const REALTIME_WS_ERROR_CODES = [
"WS_RECONNECT_FAILED",
"WS_AUTH_EXPIRED",
"WS_RATE_LIMITED",
"WS_INTERNAL",
] as const;

export type RealtimeWsErrorCode = (typeof REALTIME_WS_ERROR_CODES)[number];

export interface RealtimeWsErrorCopy {

title: string;

description: string;

actionLabel?: string;

dataTestid: string;
}

export const REALTIME_WS_ERROR_COPY: Readonly<
Record<RealtimeWsErrorCode, RealtimeWsErrorCopy>
> = {
WS_RECONNECT_FAILED: {
title: "Live updates paused",
description: "We'll keep trying in the background.",
dataTestid: "realtime-ws-error-toast-reconnect-failed",
  },
WS_AUTH_EXPIRED: {
title: "Sign in again to see live updates",
description: "Your session expired. Re-authenticate to resume notifications.",
actionLabel: "Sign in",
dataTestid: "realtime-ws-error-toast-auth-expired",
  },
WS_RATE_LIMITED: {
title: "Live updates paused",
description: "Too many events. Updates will resume shortly.",
dataTestid: "realtime-ws-error-toast-rate-limited",
  },
WS_INTERNAL: {
title: "Live updates unavailable",
description: "Something went wrong on our end. Try refreshing the page.",
dataTestid: "realtime-ws-error-toast-internal",
  },
};

export function getRealtimeWsErrorCopy(code: string | null | undefined): RealtimeWsErrorCopy {
if (code !== null && code !== undefined && isRealtimeWsErrorCode(code)) {
return REALTIME_WS_ERROR_COPY[code];
  }
return REALTIME_WS_ERROR_COPY.WS_INTERNAL;
}

export function isRealtimeWsErrorCode(code: string): code is RealtimeWsErrorCode {
return (REALTIME_WS_ERROR_CODES as readonly string[]).includes(code);
}

export function mapWsErrorToRealtimeCode(error: WsError | null | undefined): RealtimeWsErrorCode {
if (error === null || error === undefined) return "WS_INTERNAL";
const code = error.code;
if (code === "AUTH_TOKEN_EXPIRED" || code === "AUTH_INVALID_TOKEN" || code === "AUTH_FORBIDDEN") {
return "WS_AUTH_EXPIRED";
  }
if (code === "RATE_LIMITED") return "WS_RATE_LIMITED";
return "WS_INTERNAL";
}