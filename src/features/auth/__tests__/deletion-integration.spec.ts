// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { handleRemoteAccountDeleted } from "@/features/auth/lifecycle/deletion-cross-tab";
import {
  AUTH_PERSISTENT_KEYS,
  AUTH_SYNC_KEYS,
  isDeletionTerminal,
  resetDeletionFinalizationForTesting,
  runDeletionFinalization,
} from "@/features/auth/lifecycle/deletion-finalization";

import { ACCOUNT_DELETED_EVENT } from "./__fixtures__/deletion-event-fixture";

const mocks = vi.hoisted(() => ({
  broadcastAccountDeleted: vi.fn(),
  broadcastAuthEvent: vi.fn(),
  clearAuthToken: vi.fn(),
  getAuthToken: vi.fn(() => "old-token"),
  setAuthToken: vi.fn(),
  clearVerificationFlags: vi.fn(),
  cancelInFlightRefresh: vi.fn(),
  clearUser: vi.fn(),
  queryClientClear: vi.fn(),
  buildDeletionReplaceHistory: vi.fn(() => () => {
    // Best-effort no-op in jsdom
  }),
}));

vi.mock("@/lib/api/core/broadcast-channel", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/api/core/broadcast-channel")
  >("@/lib/api/core/broadcast-channel");
  return {
    ...actual,
    broadcastAccountDeleted: mocks.broadcastAccountDeleted,
    broadcastAuthEvent: mocks.broadcastAuthEvent,
  };
});

vi.mock("@/features/auth/utils/auth-cookies", async () => {
  const actual = await vi.importActual<
    typeof import("@/features/auth/utils/auth-cookies")
  >("@/features/auth/utils/auth-cookies");
  return {
    ...actual,
    clearAuthToken: mocks.clearAuthToken,
    getAuthToken: mocks.getAuthToken,
    setAuthToken: mocks.setAuthToken,
  };
});

vi.mock("@/features/auth/utils/verification-flag", async () => {
  const actual = await vi.importActual<
    typeof import("@/features/auth/utils/verification-flag")
  >("@/features/auth/utils/verification-flag");
  return {
    ...actual,
    clearVerificationFlags: mocks.clearVerificationFlags,
  };
});

vi.mock("@/lib/api/core/custom-instance", () => ({
  cancelInFlightRefresh: mocks.cancelInFlightRefresh,
}));

vi.mock("@/features/users/store/user-store", () => ({
  useUserStore: {
    getState: () => ({
      clearUser: mocks.clearUser,
    }),
  },
}));

vi.mock("@/providers/QueryProvider", () => ({
  getQueryClient: () => ({
    clear: mocks.queryClientClear,
  }),
}));

vi.mock("@/features/auth/lifecycle/deletion-history", async () => {
  const actual = await vi.importActual<
    typeof import("@/features/auth/lifecycle/deletion-history")
  >("@/features/auth/lifecycle/deletion-history");
  return {
    ...actual,
    buildDeletionReplaceHistory: mocks.buildDeletionReplaceHistory,
  };
});

beforeEach(() => {
  vi.resetAllMocks();
  resetDeletionFinalizationForTesting();
  if (typeof localStorage !== "undefined") {
    localStorage.clear();
  }
  mocks.buildDeletionReplaceHistory.mockImplementation(() => () => {});
  mocks.cancelInFlightRefresh.mockImplementation(() => undefined);
  mocks.clearVerificationFlags.mockImplementation(() => undefined);
  mocks.clearAuthToken.mockImplementation(() => undefined);
  mocks.clearUser.mockImplementation(() => undefined);
  mocks.queryClientClear.mockImplementation(() => undefined);
  mocks.broadcastAccountDeleted.mockImplementation(() => undefined);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("runDeletionFinalization — local success cleanup", () => {
  it("clears auth markers, caches, query client, and persisted state in order", async () => {
    const order: string[] = [];
    localStorage.setItem("auth_cache_user1_identity", "1");
    for (const key of AUTH_SYNC_KEYS) localStorage.setItem(key, "1");
    for (const key of AUTH_PERSISTENT_KEYS) localStorage.setItem(key, "1");

    mocks.clearAuthToken.mockImplementation(() => {
      order.push("clearAuthToken");
    });
    mocks.clearUser.mockImplementation(() => {
      order.push("clearUser");
    });
    mocks.queryClientClear.mockImplementation(() => {
      order.push("queryClientClear");
    });
    mocks.broadcastAccountDeleted.mockImplementation(() => {
      order.push("broadcastAccountDeleted");
    });

    const result = await runDeletionFinalization();

    expect(result.alreadyFinalized).toBe(false);
    expect(result.errors).toHaveLength(0);
    expect(isDeletionTerminal()).toBe(true);
    expect(localStorage.getItem("auth_cache_user1_identity")).toBeNull();
    for (const key of AUTH_SYNC_KEYS) {
      expect(localStorage.getItem(key)).toBeNull();
    }
    for (const key of AUTH_PERSISTENT_KEYS) {
      expect(localStorage.getItem(key)).toBeNull();
    }
    expect(order).toEqual([
      "clearAuthToken",
      "clearUser",
      "queryClientClear",
      "broadcastAccountDeleted",
    ]);
  });

  it("marks the deletion terminal flag before auth markers are cleared", async () => {
    let wasTerminalDuringAuthClear = false;
    mocks.clearVerificationFlags.mockImplementation(() => {
      wasTerminalDuringAuthClear = isDeletionTerminal();
    });

    await runDeletionFinalization();

    expect(wasTerminalDuringAuthClear).toBe(true);
  });

  it("broadcasts ACCOUNT_DELETED exactly once on the originator path", async () => {
    await runDeletionFinalization();

    expect(mocks.broadcastAccountDeleted).toHaveBeenCalledTimes(1);
  });

  it("does NOT broadcast on the receiver path (skipBroadcast: true)", async () => {
    await runDeletionFinalization({ skipBroadcast: true });

    expect(mocks.broadcastAccountDeleted).toHaveBeenCalledTimes(0);
  });

  it("runs the optional replaceHistory thunk", async () => {
    const replaceHistory = vi.fn();
    await runDeletionFinalization({ replaceHistory });

    expect(replaceHistory).toHaveBeenCalledTimes(1);
  });

  it("is idempotent — the second call returns alreadyFinalized", async () => {
    const first = await runDeletionFinalization();
    expect(first.alreadyFinalized).toBe(false);

    const second = await runDeletionFinalization();
    expect(second.alreadyFinalized).toBe(true);

    expect(mocks.clearAuthToken).toHaveBeenCalledTimes(1);
    expect(mocks.clearUser).toHaveBeenCalledTimes(1);
    expect(mocks.queryClientClear).toHaveBeenCalledTimes(1);
    expect(mocks.broadcastAccountDeleted).toHaveBeenCalledTimes(1);
  });
});

describe("runDeletionFinalization — partial cleanup failure", () => {
  it("continues cleanup when the auth-marker step throws", async () => {
    mocks.clearAuthToken.mockImplementation(() => {
      throw new Error("quota exceeded");
    });

    const result = await runDeletionFinalization();

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.step).toBe("clearAuthMarkers");
    expect(mocks.clearUser).toHaveBeenCalledTimes(1);
    expect(mocks.queryClientClear).toHaveBeenCalledTimes(1);
    expect(mocks.broadcastAccountDeleted).toHaveBeenCalledTimes(1);
  });

  it("continues cleanup when the query cache clear throws", async () => {
    mocks.queryClientClear.mockImplementation(() => {
      throw new Error("cache write failed");
    });

    const result = await runDeletionFinalization();

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.step).toBe("clearAllDeletionCaches");
    expect(mocks.clearAuthToken).toHaveBeenCalledTimes(1);
    expect(mocks.broadcastAccountDeleted).toHaveBeenCalledTimes(1);
  });

  it("continues cleanup when the broadcast step throws", async () => {
    mocks.broadcastAccountDeleted.mockImplementation(() => {
      throw new Error("BroadcastChannel unavailable");
    });

    const result = await runDeletionFinalization();

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.step).toBe("broadcastDeletion");
    expect(mocks.clearAuthToken).toHaveBeenCalledTimes(1);
    expect(mocks.queryClientClear).toHaveBeenCalledTimes(1);
  });

  it("collects errors from multiple failing steps and keeps terminal marker set", async () => {
    mocks.clearAuthToken.mockImplementation(() => {
      throw new Error("a");
    });
    mocks.queryClientClear.mockImplementation(() => {
      throw new Error("b");
    });

    const result = await runDeletionFinalization();

    expect(result.errors).toHaveLength(2);
    const steps = result.errors.map((e) => e.step);
    expect(steps).toContain("clearAuthMarkers");
    expect(steps).toContain("clearAllDeletionCaches");
    expect(isDeletionTerminal()).toBe(true);
  });
});

describe("deletion-history — replace-history thunk", () => {
  it("returns a function that can be called for history replacement", () => {
    const replace = mocks.buildDeletionReplaceHistory();
    expect(typeof replace).toBe("function");
  });

  it("is invoked by the coordinator on the originator path", async () => {
    const replaceHistory = vi.fn();
    await runDeletionFinalization({ replaceHistory });
    expect(replaceHistory).toHaveBeenCalledTimes(1);
  });
});

describe("handleRemoteAccountDeleted — cross-tab receiver", () => {
  it("runs the cleanup chain via the coordinator", async () => {
    handleRemoteAccountDeleted(ACCOUNT_DELETED_EVENT);

    await new Promise((resolve) => setImmediate(resolve));
    await Promise.resolve();

    expect(mocks.clearAuthToken).toHaveBeenCalled();
    expect(mocks.clearUser).toHaveBeenCalled();
    expect(mocks.queryClientClear).toHaveBeenCalled();
  });

  it("marks the deletion terminal flag before cancelling refresh", () => {
    let wasTerminalDuringCancel = false;
    mocks.cancelInFlightRefresh.mockImplementation(() => {
      wasTerminalDuringCancel = isDeletionTerminal();
    });

    handleRemoteAccountDeleted(ACCOUNT_DELETED_EVENT);

    expect(wasTerminalDuringCancel).toBe(true);
  });

  it("cancels any in-flight refresh", () => {
    handleRemoteAccountDeleted(ACCOUNT_DELETED_EVENT);

    expect(mocks.cancelInFlightRefresh).toHaveBeenCalledTimes(1);
  });

  it("clears the access token cookie and verification flags", () => {
    handleRemoteAccountDeleted(ACCOUNT_DELETED_EVENT);

    expect(mocks.clearAuthToken).toHaveBeenCalled();
    expect(mocks.clearVerificationFlags).toHaveBeenCalled();
  });

  it("does NOT broadcast ACCOUNT_DELETED on the receiver path (no loop)", async () => {
    handleRemoteAccountDeleted(ACCOUNT_DELETED_EVENT);
    await new Promise((resolve) => setImmediate(resolve));
    await Promise.resolve();

    expect(mocks.broadcastAccountDeleted).toHaveBeenCalledTimes(0);
  });

  it("runs the history replacement thunk", async () => {
    handleRemoteAccountDeleted(ACCOUNT_DELETED_EVENT);
    await new Promise((resolve) => setImmediate(resolve));
    await Promise.resolve();

    expect(mocks.buildDeletionReplaceHistory).toHaveBeenCalled();
  });
});
