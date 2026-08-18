

import { describe, expect, it } from "vitest";

import {
FRIEND_REQUEST_ERROR_COPY,
getFriendRequestErrorCopy,
getFriendRequestErrorDescription,
getFriendRequestErrorTitle,
isFriendRequestErrorRetryable,
} from "@/features/social/components/friend-request-error-copy";

describe("friend-request-error-copy — TKT-6.8.F3", () => {
describe("FRIEND_REQUEST_ERROR_COPY registry", () => {
it("contains SOCIAL_FRIEND_REQUEST_NOT_FOUND (non-idempotent DELETE terminal state)", () => {
const entry = FRIEND_REQUEST_ERROR_COPY.SOCIAL_FRIEND_REQUEST_NOT_FOUND;
expect(entry).toBeDefined();

expect(entry!.title).toMatch(/completed|no longer/i);
expect(entry!.actionLabel).toBeNull();
    });

it("contains SOCIAL_FRIEND_REQUEST_FORBIDDEN", () => {
const entry = FRIEND_REQUEST_ERROR_COPY.SOCIAL_FRIEND_REQUEST_FORBIDDEN;
expect(entry).toBeDefined();
expect(entry!.title).toMatch(/not allowed|forbidden|permission/i);
expect(entry!.actionLabel).toBeNull();
    });

it("contains SOCIAL_SELF_FRIEND_REQUEST with canonical 'cannot send to yourself' copy", () => {
const entry = FRIEND_REQUEST_ERROR_COPY.SOCIAL_SELF_FRIEND_REQUEST;
expect(entry).toBeDefined();
expect(entry!.description.toLowerCase()).toContain(
"cannot send a friend request to yourself",
      );
expect(entry!.actionLabel).toBeNull();
    });

it("contains SOCIAL_FRIENDSHIP_NOT_FOUND (non-idempotent DELETE terminal state)", () => {
const entry = FRIEND_REQUEST_ERROR_COPY.SOCIAL_FRIENDSHIP_NOT_FOUND;
expect(entry).toBeDefined();
expect(entry!.title).toMatch(/completed|no longer/i);
expect(entry!.actionLabel).toBeNull();
    });

it("contains SOCIAL_USER_BLOCKED with bidirectional-block copy", () => {
const entry = FRIEND_REQUEST_ERROR_COPY.SOCIAL_USER_BLOCKED;
expect(entry).toBeDefined();
expect(entry!.description.toLowerCase()).toContain("blocked");
expect(entry!.actionLabel).toBeNull();
    });

it("contains SOCIAL_BLOCKED_USER with bidirectional-block copy", () => {
const entry = FRIEND_REQUEST_ERROR_COPY.SOCIAL_BLOCKED_USER;
expect(entry).toBeDefined();
expect(entry!.description.toLowerCase()).toContain("unblock");
expect(entry!.actionLabel).toBeNull();
    });

it("contains UNAUTHORIZED (translated to GLOBAL_UNAUTHENTICATED)", () => {
const entry = FRIEND_REQUEST_ERROR_COPY.GLOBAL_UNAUTHENTICATED;
expect(entry).toBeDefined();
expect(entry!.title.toLowerCase()).toContain("sign in");
    });

it("contains GLOBAL_RATE_LIMITED with retryable action label", () => {
const entry = FRIEND_REQUEST_ERROR_COPY.GLOBAL_RATE_LIMITED;
expect(entry).toBeDefined();
expect(entry!.actionLabel).not.toBeNull();
    });

it("contains GLOBAL_INTERNAL_ERROR with retryable action label", () => {
const entry = FRIEND_REQUEST_ERROR_COPY.GLOBAL_INTERNAL_ERROR;
expect(entry).toBeDefined();
expect(entry!.actionLabel).not.toBeNull();
    });

it("contains NETWORK_ERROR sentinel", () => {
const entry = FRIEND_REQUEST_ERROR_COPY.NETWORK_ERROR;
expect(entry).toBeDefined();
expect(entry!.description.toLowerCase()).toContain("connection");
expect(entry!.actionLabel).not.toBeNull();
    });

it("every entry has title, description, and dataTestid", () => {
for (const [code, entry] of Object.entries(FRIEND_REQUEST_ERROR_COPY)) {
expect(entry, `${code}: entry must exist`).toBeDefined();
expect(
entry!.title.trim().length,
`${code}: title must be non-empty`,
        ).toBeGreaterThan(0);
expect(
entry!.description.trim().length,
`${code}: description must be non-empty`,
        ).toBeGreaterThan(0);
expect(
entry!.dataTestid,
`${code}: dataTestid must be defined`,
        ).toBeDefined();
      }
    });

it("every entry's dataTestid follows friend-request-error.{code} convention", () => {
for (const [code, entry] of Object.entries(FRIEND_REQUEST_ERROR_COPY)) {
expect(
entry!.dataTestid,
`${code}: dataTestid must follow friend-request-error.X convention`,
        ).toMatch(/^friend-request-error\.[a-z0-9-]+$/);
      }
    });
  });

describe("getFriendRequestErrorCopy", () => {
it("returns the registry entry for a known code", () => {
const entry = getFriendRequestErrorCopy("SOCIAL_SELF_FRIEND_REQUEST");
expect(entry.title).toContain("yourself");
    });

it("returns the generic fallback for an unknown code", () => {
const entry = getFriendRequestErrorCopy("NOT_A_REAL_CODE_9999");
expect(entry.title.toLowerCase()).toContain("something went wrong");
expect(entry.actionLabel).toBe("Try again");
    });

it("does not return undefined for any of the 10 documented codes", () => {
const codes = [
"SOCIAL_FRIEND_REQUEST_NOT_FOUND",
"SOCIAL_FRIEND_REQUEST_FORBIDDEN",
"SOCIAL_SELF_FRIEND_REQUEST",
"SOCIAL_FRIENDSHIP_NOT_FOUND",
"SOCIAL_USER_BLOCKED",
"SOCIAL_BLOCKED_USER",
"GLOBAL_UNAUTHENTICATED",
"GLOBAL_RATE_LIMITED",
"GLOBAL_INTERNAL_ERROR",
"NETWORK_ERROR",
      ] as const;
for (const code of codes) {
const entry = getFriendRequestErrorCopy(code);
expect(entry.title, `${code} must have a title`).toBeDefined();
expect(entry.title.length, `${code} title must be non-empty`).toBeGreaterThan(0);
      }
    });
  });

describe("isFriendRequestErrorRetryable", () => {
it("returns true for retryable codes (GLOBAL_RATE_LIMITED)", () => {
expect(isFriendRequestErrorRetryable("GLOBAL_RATE_LIMITED")).toBe(true);
    });

it("returns true for the NETWORK_ERROR sentinel", () => {
expect(isFriendRequestErrorRetryable("NETWORK_ERROR")).toBe(true);
    });

it("returns false for terminal-state codes (SOCIAL_FRIEND_REQUEST_NOT_FOUND)", () => {
expect(
isFriendRequestErrorRetryable("SOCIAL_FRIEND_REQUEST_NOT_FOUND"),
      ).toBe(false);
    });

it("returns false for terminal-state codes (SOCIAL_FRIENDSHIP_NOT_FOUND)", () => {
expect(
isFriendRequestErrorRetryable("SOCIAL_FRIENDSHIP_NOT_FOUND"),
      ).toBe(false);
    });

it("returns false for permission codes (SOCIAL_SELF_FRIEND_REQUEST)", () => {
expect(
isFriendRequestErrorRetryable("SOCIAL_SELF_FRIEND_REQUEST"),
      ).toBe(false);
    });

it("returns true for unknown codes (falls back to a retryable generic fallback)", () => {

expect(isFriendRequestErrorRetryable("MADE_UP_CODE_9999")).toBe(true);
    });
  });

describe("convenience wrappers", () => {
it("getFriendRequestErrorTitle delegates to getFriendRequestErrorCopy", () => {
const title = getFriendRequestErrorTitle("SOCIAL_SELF_FRIEND_REQUEST");
expect(title).toBe(
FRIEND_REQUEST_ERROR_COPY.SOCIAL_SELF_FRIEND_REQUEST!.title,
      );
    });

it("getFriendRequestErrorDescription delegates to getFriendRequestErrorCopy", () => {
const description = getFriendRequestErrorDescription(
"SOCIAL_FRIEND_REQUEST_NOT_FOUND",
      );
expect(description).toBe(
FRIEND_REQUEST_ERROR_COPY.SOCIAL_FRIEND_REQUEST_NOT_FOUND!.description,
      );
    });
  });
});
