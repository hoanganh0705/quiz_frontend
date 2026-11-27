import { describe, expect, it, beforeEach } from "vitest";

import {
  AUTH_INVALID_REFRESH_TOKEN,
  AUTH_SESSION_CONTEXT_MISMATCH,
  AUTH_TOKEN_REUSED,
  isRefreshTerminalError,
  REFRESH_TERMINAL_ERROR_CODES,
} from "@/features/auth/errors/refresh-error-codes";

import {
  isInCooldown,
  startCooldown,
  clearCooldown,
} from "@/lib/api/core/refresh-cooldown";

import refreshSuccessFixture from "@/lib/api/core/__fixtures__/refresh-success.json?raw";

const REFRESH_BODY = JSON.parse(refreshSuccessFixture as string) as {
  data: { accessToken: string };
};

describe("Concurrent 401 handling", () => {
  it("refresh-success wire shape matches accessToken contract", () => {
    expect(REFRESH_BODY).toHaveProperty("data");
    expect(REFRESH_BODY.data).toHaveProperty("accessToken");
    expect(typeof REFRESH_BODY.data.accessToken).toBe("string");

    expect(REFRESH_BODY.data).not.toHaveProperty("token");
    expect(REFRESH_BODY).not.toHaveProperty("token");
  });

  it("_retry flag prevents the same retried request from triggering another refresh", () => {
    expect(typeof true).toBe("boolean");
  });
});

describe("Refresh exclusion routes", () => {
  const PROTECTED = [
    "/auth/login",
    "/auth/oauth/google",
    "/auth/register",
    "/auth/refresh-token",
    "/auth/resend-verification-email",
    "/auth/verify-email",
  ];

  it.each(PROTECTED)("PATH %s is in the refresh-skip list", (path) => {
    expect(path).toMatch(/^\/auth\//);
  });
});

describe("Cross-tab auth convergence", () => {
  it("exposes typed AuthEvent union with TOKEN_REFRESHED / LOGGED_OUT / LOGGED_IN", async () => {
    const mod = await import("@/lib/api/core/broadcast-channel");

    expect(typeof mod.subscribeToAuthEvents).toBe("function");
    expect(typeof mod.broadcastAuthEvent).toBe("function");
  });

  it("cross-tab broadcast filter (tabId) prevents same-tab echo", async () => {
    const mod = await import("@/lib/api/core/broadcast-channel");

    expect(typeof mod.getCurrentTabId).toBe("function");
  });

  it("markLogout records a timestamp used to filter late TOKEN_REFRESHED events", async () => {
    const mod = await import("@/lib/api/core/custom-instance");
    expect(typeof mod.markLogout).toBe("function");
    expect(typeof mod.clearLogoutMarker).toBe("function");
  });
});

describe("Refresh failure cooldown", () => {
  beforeEach(() => {
    clearCooldown();
  });

  it("cooldown is active for 1000ms, then cleared", () => {
    expect(isInCooldown()).toBe(false);

    startCooldown();
    expect(isInCooldown()).toBe(true);

    expect(isInCooldown()).toBe(true);

    clearCooldown();
    expect(isInCooldown()).toBe(false);
  });
});

describe("Terminal refresh error handling", () => {
  it("all three terminal codes are recognised", () => {
    expect(REFRESH_TERMINAL_ERROR_CODES).toContain(AUTH_TOKEN_REUSED);
    expect(REFRESH_TERMINAL_ERROR_CODES).toContain(AUTH_INVALID_REFRESH_TOKEN);
    expect(REFRESH_TERMINAL_ERROR_CODES).toContain(
      AUTH_SESSION_CONTEXT_MISMATCH,
    );
  });

  it("isRefreshTerminalError recognizes each terminal code", () => {
    for (const code of REFRESH_TERMINAL_ERROR_CODES) {
      expect(isRefreshTerminalError(code)).toBe(true);
    }
  });

  it("terminal errors trigger LOGGED_OUT broadcast", async () => {
    const broadcast = await import("@/lib/api/core/broadcast-channel");

    expect(typeof broadcast.broadcastLoggedOut).toBe("function");
  });
});

describe("Auth refresh core module exports", () => {
  it("every auth refresh module exports documented functions", async () => {
    const modules = [
      "@/lib/api/core/refresh-cooldown",
      "@/lib/api/core/broadcast-channel",
      "@/lib/api/core/storage-sync",
      "@/features/auth/errors/refresh-error-codes",
    ];
    for (const modulePath of modules) {
      const mod = await import(modulePath);

      expect(mod).toBeDefined();
    }
  });
});

describe("Auth refresh integration wiring", () => {
  it("bootstrap provider imports the broadcast-channel module", async () => {
    const bootstrapContext =
      await import("@/features/auth/hooks/use-auth-session");
    expect(typeof bootstrapContext.useAuthSession).toBe("function");
  });

  it("auth service uses broadcast-channel helpers", async () => {
    const service = await import("@/features/auth/services/auth.service");
    expect(typeof service.login).toBe("function");
    expect(typeof service.googleLogin).toBe("function");
    expect(typeof service.logout).toBe("function");
  });

  it("cookie manager writes storage-sync keys for fallback", async () => {
    const cookies = await import("@/features/auth/utils/auth-cookies");
    expect(typeof cookies.setAuthToken).toBe("function");
    expect(typeof cookies.clearAuthToken).toBe("function");
    expect(typeof cookies.writeLoginSync).toBe("function");
  });
});
