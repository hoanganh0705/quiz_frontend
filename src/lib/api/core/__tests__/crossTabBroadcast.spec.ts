import { describe, expect, it, vi } from "vitest";
import {
  ATTEMPTS_CHANNEL_NAME,
  PROFILE_CHANNEL_NAME,
  emitCrossTabBroadcast,
} from "../cross-tab-broadcast";

describe("cross-tab-broadcast facade", () => {
  it("re-exports the per-feature channel name constants", () => {
    expect(ATTEMPTS_CHANNEL_NAME).toBe("attempts");
    expect(PROFILE_CHANNEL_NAME).toBe("profile");
  });

  it("routes attempts/changed to broadcastAttemptsChanged", async () => {
    const attempts = await import("../attempts-broadcast-channel");
    const spy = vi
      .spyOn(attempts, "broadcastAttemptsChanged")
      .mockImplementation(() => {});
    emitCrossTabBroadcast({
      type: "attempts/changed",
      userId: "u-1",
      attemptId: "att-1",
      kind: "complete",
      tabId: "t-1",
      timestamp: 0,
    });
    expect(spy).toHaveBeenCalledWith({
      userId: "u-1",
      attemptId: "att-1",
      kind: "complete",
    });
    spy.mockRestore();
  });

  it("routes profile/updated to broadcastProfileUpdated", async () => {
    const profile = await import("../profile-broadcast-channel");
    const spy = vi
      .spyOn(profile, "broadcastProfileUpdated")
      .mockImplementation(() => {});
    emitCrossTabBroadcast({
      type: "profile/updated",
      userId: "u-1",
      kind: "settings",
      tabId: "t-1",
      timestamp: 0,
    });
    expect(spy).toHaveBeenCalledWith({
      userId: "u-1",
      kind: "settings",
    });
    spy.mockRestore();
  });
});
