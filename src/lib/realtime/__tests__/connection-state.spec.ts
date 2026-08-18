

import { describe, expect, it } from "vitest";

import type {
ConnectionStateContext,
ConnectionStateEvent,
SocketConnectionState,
} from "../connection-state";

import {
ConnectionStateReducer,
INITIAL_CONNECTION_CONTEXT,
MAX_RETRY_COUNT,
} from "../connection-state";

function transition(
ctx: ConnectionStateContext,
event: ConnectionStateEvent,
): ConnectionStateContext {
return ConnectionStateReducer(ctx, event);
}

function makeError(authRequired = false, code = "TEST_ERROR") {
return { code, message: "Test error", authRequired, retryable: !authRequired };
}

const ALL_STATES: SocketConnectionState[] = [
"idle",
"connecting",
"connected",
"reconnecting",
"disconnected",
"auth_required",
];

describe("INITIAL_CONNECTION_CONTEXT", () => {
it("state is 'idle'", () => {
expect(INITIAL_CONNECTION_CONTEXT.state).toBe("idle");
  });

it("retryCount is 0", () => {
expect(INITIAL_CONNECTION_CONTEXT.retryCount).toBe(0);
  });

it("lastError is null", () => {
expect(INITIAL_CONNECTION_CONTEXT.lastError).toBeNull();
  });

it("startedAt and connectedAt are null", () => {
expect(INITIAL_CONNECTION_CONTEXT.startedAt).toBeNull();
expect(INITIAL_CONNECTION_CONTEXT.connectedAt).toBeNull();
  });
});

describe("TRANSITION: CONNECT", () => {
it("from idle → connecting, sets startedAt", () => {
const next = transition(INITIAL_CONNECTION_CONTEXT, { type: "CONNECT" });
expect(next.state).toBe("connecting");
expect(next.startedAt).toBeInstanceOf(Date);
expect(next.connectedAt).toBeNull();
expect(next.retryCount).toBe(0);
expect(next.lastError).toBeNull();
  });

it("from connecting → connecting (restart), resets startedAt", () => {
const ctx: ConnectionStateContext = {
...INITIAL_CONNECTION_CONTEXT,
state: "connecting",
startedAt: new Date("2025-01-01"),
    };
const next = transition(ctx, { type: "CONNECT" });
expect(next.state).toBe("connecting");
expect(next.startedAt).not.toEqual(new Date("2025-01-01"));
expect(next.retryCount).toBe(0);
  });

it("from connected → connecting (reconnect intent), resets retryCount", () => {
const ctx: ConnectionStateContext = {
state: "connected",
retryCount: 3,
lastError: null,
startedAt: new Date(),
connectedAt: new Date(),
    };
const next = transition(ctx, { type: "CONNECT" });
expect(next.state).toBe("connecting");
expect(next.retryCount).toBe(0);
  });
});

describe("TRANSITION: OPEN", () => {
it("from connecting → connected, resets retryCount and sets connectedAt", () => {
const ctx: ConnectionStateContext = {
state: "connecting",
retryCount: 0,
lastError: null,
startedAt: new Date(),
connectedAt: null,
    };
const next = transition(ctx, { type: "OPEN" });
expect(next.state).toBe("connected");
expect(next.retryCount).toBe(0);
expect(next.connectedAt).toBeInstanceOf(Date);
expect(next.lastError).toBeNull();
  });

it("from reconnecting → connected, resets retryCount", () => {
const ctx: ConnectionStateContext = {
state: "reconnecting",
retryCount: 2,
lastError: makeError(),
startedAt: new Date(),
connectedAt: null,
    };
const next = transition(ctx, { type: "OPEN" });
expect(next.state).toBe("connected");
expect(next.retryCount).toBe(0);
expect(next.lastError).toBeNull();
  });

it("OPEN clears lastError", () => {
const ctx: ConnectionStateContext = {
state: "reconnecting",
retryCount: 1,
lastError: makeError(false, "SERVER_ERROR"),
startedAt: new Date(),
connectedAt: null,
    };
const next = transition(ctx, { type: "OPEN" });
expect(next.lastError).toBeNull();
  });
});

describe("TRANSITION: ERROR", () => {
describe("authRequired = true", () => {
it("from connecting → auth_required", () => {
const ctx: ConnectionStateContext = {
state: "connecting",
retryCount: 0,
lastError: null,
startedAt: new Date(),
connectedAt: null,
      };
const next = transition(ctx, { type: "ERROR", error: makeError(true, "AUTH_TOKEN_EXPIRED") });
expect(next.state).toBe("auth_required");
expect(next.retryCount).toBe(0);
    });

it("from connected → auth_required", () => {
const ctx: ConnectionStateContext = {
state: "connected",
retryCount: 0,
lastError: null,
startedAt: new Date(),
connectedAt: new Date(),
      };
const next = transition(ctx, { type: "ERROR", error: makeError(true) });
expect(next.state).toBe("auth_required");
    });

it("from reconnecting → auth_required (stops retry)", () => {
const ctx: ConnectionStateContext = {
state: "reconnecting",
retryCount: 3,
lastError: makeError(false),
startedAt: new Date(),
connectedAt: null,
      };
const next = transition(ctx, { type: "ERROR", error: makeError(true, "AUTH_FORBIDDEN") });
expect(next.state).toBe("auth_required");
expect(next.lastError?.code).toBe("AUTH_FORBIDDEN");
    });
  });

describe("authRequired = false (retryable)", () => {
it("from connected → reconnecting, increments retryCount", () => {
const ctx: ConnectionStateContext = {
state: "connected",
retryCount: 0,
lastError: null,
startedAt: new Date(),
connectedAt: new Date(),
      };
const next = transition(ctx, { type: "ERROR", error: makeError(false, "SERVER_ERROR") });
expect(next.state).toBe("reconnecting");
expect(next.retryCount).toBe(1);
    });

it("retryCount increments cumulatively", () => {
let ctx: ConnectionStateContext = {
state: "connected",
retryCount: 0,
lastError: null,
startedAt: new Date(),
connectedAt: new Date(),
      };

for (let i = 1; i < MAX_RETRY_COUNT; i++) {
ctx = transition(ctx, { type: "ERROR", error: makeError(false) });
expect(ctx.state).toBe("reconnecting");
expect(ctx.retryCount).toBe(i);
      }
    });

it("at MAX_RETRY_COUNT → disconnected", () => {
const ctx: ConnectionStateContext = {
state: "reconnecting",
retryCount: MAX_RETRY_COUNT - 1,
lastError: makeError(false),
startedAt: new Date(),
connectedAt: null,
      };
const next = transition(ctx, { type: "ERROR", error: makeError(false, "SERVER_ERROR") });
expect(next.state).toBe("disconnected");
expect(next.retryCount).toBe(MAX_RETRY_COUNT);
expect(next.lastError?.code).toBe("SERVER_ERROR");
    });

it("beyond MAX_RETRY_COUNT → disconnected (idempotent)", () => {
const ctx: ConnectionStateContext = {
state: "disconnected",
retryCount: MAX_RETRY_COUNT,
lastError: makeError(false),
startedAt: new Date(),
connectedAt: null,
      };
const next = transition(ctx, { type: "ERROR", error: makeError(false) });
expect(next.state).toBe("disconnected");
    });
  });
});

describe("TRANSITION: RETRY", () => {
it("below MAX_RETRY_COUNT → reconnecting, increments retryCount", () => {
const ctx: ConnectionStateContext = {
state: "disconnected",
retryCount: MAX_RETRY_COUNT - 1,
lastError: makeError(false),
startedAt: new Date(),
connectedAt: null,
    };
const next = transition(ctx, { type: "RETRY" });
expect(next.state).toBe("reconnecting");
expect(next.retryCount).toBe(MAX_RETRY_COUNT);
  });

it("at MAX_RETRY_COUNT → disconnected", () => {
const ctx: ConnectionStateContext = {
state: "disconnected",
retryCount: MAX_RETRY_COUNT,
lastError: makeError(false),
startedAt: new Date(),
connectedAt: null,
    };
const next = transition(ctx, { type: "RETRY" });
expect(next.state).toBe("disconnected");
  });
});

describe("TRANSITION: AUTH_REQUIRED", () => {
it("from idle → auth_required", () => {
const next = transition(INITIAL_CONNECTION_CONTEXT, { type: "AUTH_REQUIRED" });
expect(next.state).toBe("auth_required");
  });

it("from connected → auth_required", () => {
const ctx: ConnectionStateContext = {
state: "connected",
retryCount: 0,
lastError: null,
startedAt: new Date(),
connectedAt: new Date(),
    };
const next = transition(ctx, { type: "AUTH_REQUIRED" });
expect(next.state).toBe("auth_required");
  });
});

describe("TRANSITION: DISCONNECT", () => {
it("from any state → disconnected, clears lastError", () => {
for (const state of ALL_STATES) {
const ctx: ConnectionStateContext = {
state,
retryCount: 3,
lastError: makeError(true),
startedAt: new Date(),
connectedAt: new Date(),
      };
const next = transition(ctx, { type: "DISCONNECT" });
expect(next.state).toBe("disconnected");
expect(next.lastError).toBeNull();
    }
  });
});

describe("TRANSITION: RESET", () => {
it("from any state → idle, restores initial values", () => {
for (const state of ALL_STATES) {
const ctx: ConnectionStateContext = {
state,
retryCount: 999,
lastError: makeError(true),
startedAt: new Date(),
connectedAt: new Date(),
      };
const next = transition(ctx, { type: "RESET" });
expect(next.state).toBe("idle");
expect(next.retryCount).toBe(0);
expect(next.lastError).toBeNull();
expect(next.startedAt).toBeNull();
expect(next.connectedAt).toBeNull();
    }
  });
});

describe("MAX_RETRY_COUNT boundary", () => {
it("MAX_RETRY_COUNT is 5", () => {
expect(MAX_RETRY_COUNT).toBe(5);
  });

it("at MAX_RETRY_COUNT - 1, one more ERROR goes to disconnected", () => {
const ctx: ConnectionStateContext = {
state: "reconnecting",
retryCount: MAX_RETRY_COUNT - 1,
lastError: makeError(false),
startedAt: new Date(),
connectedAt: null,
    };
const next = transition(ctx, { type: "ERROR", error: makeError(false) });
expect(next.state).toBe("disconnected");
expect(next.retryCount).toBe(MAX_RETRY_COUNT);
  });
});
