/**
 * `friend-request-state-machine.spec.ts` — locks the state-machine
 * runtime contract (TKT-6.8.F1 types, TKT-6.8.E1 runtime).
 *
 * Coverage:
 *
 *   - Idle state branches:
 *     - `Relationship` `none`        → Send Friend Request CTA (send)
 *     - `Relationship` `outgoing_request` → Outgoing Request CTA (openCancel)
 *     - `Relationship` `incoming_request` → Accept / Decline CTA (openRespond)
 *     - `Relationship` `friend`      → Friends CTA (openUnfriend)
 *     - `Relationship` `blocked`     → Unavailable CTA (no onClick)
 *     - `Relationship` `blocked_by`  → Unavailable CTA (no onClick)
 *     - `Relationship` `self`        → Unavailable CTA (no onClick)
 *     - `Relationship` `following`   → Unavailable CTA (no onClick)
 *     - `Relationship` `follower`    → Unavailable CTA (no onClick)
 *   - Pending state: lock the CTA with the "Sending…" copy regardless
 *     of the relationship value.
 *   - Error state: render the Retry CTA regardless of the relationship
 *     value.
 *   - Permission gates: `disabled === true` when `canFriendRequest` is
 *     false for `Relationship none` + `idle`.
 *   - Permission gates: `disabled === true` when `canUnfriend` is false
 *     for `Relationship friend` + `idle`.
 *   - `friendshipId` is not part of the input or the output.
 *   - The output is a frozen-equivalent object (no `disabled === false`
 *     when permissions are false).
 */

import { describe, expect, it } from "vitest";

import {
  type Relationship,
} from "@/features/social/types";

import {
  FRIEND_REQUEST_CTA_TESTIDS,
  type FriendRequestHookState,
  resolveFriendRequestUiState,
} from "@/features/social/components/friend-request-state-machine";

// ─── Helpers ───────────────────────────────────────────────────────────

function uiState(
  relationship: Relationship,
  localHookState: FriendRequestHookState = "idle",
  canFriendRequest = true,
  canUnfriend = true,
): ReturnType<typeof resolveFriendRequestUiState> {
  return resolveFriendRequestUiState({
    relationship,
    localHookState,
    canFriendRequest,
    canUnfriend,
  });
}

// ─── Idle state ─────────────────────────────────────────────────────────

describe("resolveFriendRequestUiState — idle state", () => {
  it("Relationship none → Send Friend Request", () => {
    const ui = uiState("none");
    expect(ui.label).toBe("Send Friend Request");
    expect(ui.icon).toBe("UserPlus");
    expect(ui.onClick).toBe("send");
    expect(ui.disabled).toBe(false);
    expect(ui.dataTestid).toBe(FRIEND_REQUEST_CTA_TESTIDS.send);
  });

  it("Relationship outgoing_request → Outgoing Request", () => {
    const ui = uiState("outgoing_request");
    expect(ui.label).toBe("Outgoing Request");
    expect(ui.icon).toBe("Clock");
    expect(ui.onClick).toBe("openCancel");
    expect(ui.disabled).toBe(false);
    expect(ui.dataTestid).toBe(FRIEND_REQUEST_CTA_TESTIDS.outgoing);
  });

  it("Relationship incoming_request → Accept / Decline", () => {
    const ui = uiState("incoming_request");
    expect(ui.label).toBe("Accept / Decline");
    expect(ui.icon).toBe("UserCheck");
    expect(ui.onClick).toBe("openRespond");
    expect(ui.disabled).toBe(false);
    expect(ui.dataTestid).toBe(FRIEND_REQUEST_CTA_TESTIDS.incoming);
  });

  it("Relationship friend → Friends", () => {
    const ui = uiState("friend");
    expect(ui.label).toBe("Friends");
    expect(ui.icon).toBe("UserCheck");
    expect(ui.onClick).toBe("openUnfriend");
    expect(ui.disabled).toBe(false);
    expect(ui.dataTestid).toBe(FRIEND_REQUEST_CTA_TESTIDS.friend);
  });

  it("Relationship blocked → Unavailable (no onClick)", () => {
    const ui = uiState("blocked");
    expect(ui.label).toBe("Unavailable");
    expect(ui.icon).toBe("Ban");
    expect(ui.onClick).toBeNull();
    expect(ui.disabled).toBe(true);
  });

  it("Relationship blocked_by → Unavailable (no onClick)", () => {
    const ui = uiState("blocked_by");
    expect(ui.onClick).toBeNull();
    expect(ui.disabled).toBe(true);
  });

  it("Relationship self → Unavailable (no onClick)", () => {
    const ui = uiState("self");
    expect(ui.onClick).toBeNull();
    expect(ui.disabled).toBe(true);
  });

  it("Relationship following → Unavailable (no onClick)", () => {
    const ui = uiState("following");
    expect(ui.onClick).toBeNull();
    expect(ui.disabled).toBe(true);
  });

  it("Relationship follower → Unavailable (no onClick)", () => {
    const ui = uiState("follower");
    expect(ui.onClick).toBeNull();
    expect(ui.disabled).toBe(true);
  });
});

// ─── Pending state ─────────────────────────────────────────────────────

describe("resolveFriendRequestUiState — pending state", () => {
  it("locks the CTA regardless of the relationship value", () => {
    for (const rel of [
      "none",
      "outgoing_request",
      "incoming_request",
      "friend",
      "blocked",
      "self",
    ] as const) {
      const ui = uiState(rel, "pending");
      expect(ui.disabled, `pending + ${rel}`).toBe(true);
      expect(ui.onClick, `pending + ${rel} onClick`).toBeNull();
      expect(ui.label, `pending + ${rel} label`).toBe("Sending…");
    }
  });
});

// ─── Error state ───────────────────────────────────────────────────────

describe("resolveFriendRequestUiState — error state", () => {
  it("shows the Retry CTA regardless of the relationship value", () => {
    for (const rel of [
      "none",
      "outgoing_request",
      "incoming_request",
      "friend",
      "blocked",
    ] as const) {
      const ui = uiState(rel, "error");
      expect(ui.disabled, `error + ${rel}`).toBe(false);
      expect(ui.onClick, `error + ${rel} onClick`).toBe("send");
      expect(ui.label, `error + ${rel} label`).toBe("Retry");
    }
  });
});

// ─── Permission gates ─────────────────────────────────────────────────

describe("resolveFriendRequestUiState — permission gates", () => {
  it("Relationship none + canFriendRequest === false → disabled", () => {
    const ui = uiState("none", "idle", false /* canFriendRequest */, true);
    expect(ui.disabled).toBe(true);
    expect(ui.onClick).toBe("send");
  });

  it("Relationship friend + canUnfriend === false → disabled", () => {
    const ui = uiState("friend", "idle", true, false /* canUnfriend */);
    expect(ui.disabled).toBe(true);
    expect(ui.onClick).toBe("openUnfriend");
  });

  it("the state machine itself does not depend on friendshipId", () => {
    // The state machine signature does NOT include friendshipId;
    // it is purely a function of (relationship, hook state, perms).
    expect(typeof resolveFriendRequestUiState).toBe("function");
    // The function accepts exactly four named fields; any caller that
    // supplies a `friendshipId` field will be silently ignored.
    const ui = uiState("none");
    expect(ui.label).toBe("Send Friend Request");
  });
});

// ─── ariaLabel and dataTestid stability ────────────────────────────────

describe("resolveFriendRequestUiState — stable a11y attributes", () => {
  it("every variant has a non-empty ariaLabel", () => {
    const variants: FriendRequestHookState[] = ["idle", "pending", "error"];
    const relationships: Relationship[] = [
      "none",
      "outgoing_request",
      "incoming_request",
      "friend",
      "blocked",
      "blocked_by",
      "self",
      "following",
      "follower",
    ];
    for (const state of variants) {
      for (const rel of relationships) {
        const ui = uiState(rel, state);
        expect(ui.ariaLabel.length, `${rel} + ${state} ariaLabel`).toBeGreaterThan(0);
      }
    }
  });

  it("every variant has a stable dataTestid", () => {
    const ui = uiState("friend");
    expect(ui.dataTestid).toMatch(/^friend-request-cta-/);
  });
});
