

import type { WsError } from "./ws-error";

export type SocketConnectionState =
| "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected"
  | "auth_required";

export interface ConnectionStateContext {

state: SocketConnectionState;

retryCount: number;

lastError: WsError | null;

startedAt: Date | null;

connectedAt: Date | null;
}

export type ConnectionStateEvent =
| { type: "CONNECT" }
  | { type: "OPEN" }
  | { type: "ERROR"; error: WsError }
  | { type: "RETRY" }
  | { type: "DISCONNECT" }
  | { type: "AUTH_REQUIRED" }
  | { type: "RESET" };

export const MAX_RETRY_COUNT = 5;

export const INITIAL_CONNECTION_CONTEXT: ConnectionStateContext = {
state: "idle",
retryCount: 0,
lastError: null,
startedAt: null,
connectedAt: null,
};

export function ConnectionStateReducer(
context: ConnectionStateContext,
event: ConnectionStateEvent,
): ConnectionStateContext {
const now = new Date();

switch (event.type) {
case "CONNECT":
return {
...INITIAL_CONNECTION_CONTEXT,
state: "connecting",
startedAt: now,
connectedAt: null,
lastError: null,
retryCount: 0,
      };

case "OPEN":
return {
...context,
state: "connected",
connectedAt: now,
retryCount: 0,
lastError: null,
      };

case "ERROR": {
if (event.error.authRequired) {
return {
...context,
state: "auth_required",
lastError: event.error,
        };
      }

const nextRetryCount = context.retryCount + 1;

if (nextRetryCount >= MAX_RETRY_COUNT) {
return {
...context,
state: "disconnected",
retryCount: nextRetryCount,
lastError: event.error,
        };
      }

return {
...context,
state: "reconnecting",
retryCount: nextRetryCount,
lastError: event.error,
      };
    }

case "RETRY": {
if (context.retryCount >= MAX_RETRY_COUNT) {
return {
...context,
state: "disconnected",
        };
      }
return {
...context,
state: "reconnecting",
retryCount: context.retryCount + 1,
      };
    }

case "AUTH_REQUIRED":
return {
...context,
state: "auth_required",
lastError: context.lastError ?? null,
      };

case "DISCONNECT":
return {
...context,
state: "disconnected",
lastError: null,
      };

case "RESET":
return { ...INITIAL_CONNECTION_CONTEXT };

default: {

const _exhaustive: never = event;
return context;
    }
  }
}
