

import { describe, expect, it } from "vitest";

import {
CONFIRM_DIALOGS,
getConfirmDialogCopy,
type DialogVocabulary,
} from "@/features/social/components/confirm-dialog-vocabulary";

function assertNonEmpty(value: string, fieldName: string): void {
expect(typeof value).toBe("string");
expect(value.trim().length).toBeGreaterThan(
0,
`${fieldName} must be a non-empty string`,
  );
}

describe("confirm-dialog-vocabulary — TKT-6.6.F1", () => {
describe("CONFIRM_DIALOGS.unfollow", () => {
const entry: DialogVocabulary = CONFIRM_DIALOGS.unfollow;

it("has a non-empty title", () => {
assertNonEmpty(entry.title, "title");
    });

it("has a non-empty body", () => {
assertNonEmpty(entry.body, "body");
    });

it("has a non-empty confirmLabel", () => {
assertNonEmpty(entry.confirmLabel, "confirmLabel");
    });

it("has a non-empty cancelLabel", () => {
assertNonEmpty(entry.cancelLabel, "cancelLabel");
    });

it("has a non-empty dataTestid", () => {
assertNonEmpty(entry.dataTestid, "dataTestid");
    });

it("dataTestid is 'confirm-dialog.unfollow'", () => {
expect(entry.dataTestid).toBe("confirm-dialog.unfollow");
    });

it("body mentions 'cannot be undone' or equivalent irreversibility language", () => {
const body = entry.body.toLowerCase();
const irreversible =
body.includes("cannot be undone") ||
body.includes("cannot be reversed") ||
body.includes("irreversible") ||
body.includes("not reversible");
expect(
irreversible,
"body must contain irreversibility language (cannot be undone / irreversible / etc.)",
      ).toBe(true);
    });

it("body mentions notification loss or equivalent consequence", () => {
const body = entry.body.toLowerCase();
const consequence =
body.includes("not receive notifications") ||
body.includes("will no longer receive") ||
body.includes("stop receiving") ||
body.includes("no longer receive") ||
body.includes("notifications about");
expect(
consequence,
"body must mention notification/consequence (will no longer receive notifications / etc.)",
      ).toBe(true);
    });

it("body does not mention HTTP status codes or error codes", () => {
const body = entry.body;
expect(body).not.toMatch(/404/);
expect(body).not.toMatch(/SOCIAL_FOLLOW_NOT_FOUND/);
expect(body).not.toMatch(/error/i);
expect(body).not.toMatch(/status code/i);
    });

it("has a dataTestid suitable for QA automation", () => {
expect(entry.dataTestid).toMatch(/^confirm-dialog\.\w+$/);
    });
  });

describe("CONFIRM_DIALOGS", () => {
it("is a frozen object (no accidental mutation)", () => {
expect(Object.isFrozen(CONFIRM_DIALOGS)).toBe(true);
    });

it("contains entries for unfollow (TKT-6.6.F1)", () => {
expect("unfollow" in CONFIRM_DIALOGS).toBe(true);
    });

it("contains entries for unfollow (TKT-6.6.F1), block/unblock (TKT-6.7.F1), and unfriend/cancel_friend_request (TKT-6.8.F2)", () => {
expect("unfollow" in CONFIRM_DIALOGS).toBe(true);
expect("block" in CONFIRM_DIALOGS).toBe(true);
expect("unblock" in CONFIRM_DIALOGS).toBe(true);
expect("unfriend" in CONFIRM_DIALOGS).toBe(true);
expect("cancel_friend_request" in CONFIRM_DIALOGS).toBe(true);
    });

it("does not contain 'scaffold' markers (Epic 6.8 replaced the scaffolds)", () => {

const serialized = JSON.stringify(CONFIRM_DIALOGS);
expect(serialized).not.toMatch(/scaffold/i);
    });

it("each entry is a frozen object", () => {
for (const entry of Object.values(CONFIRM_DIALOGS)) {
expect(Object.isFrozen(entry)).toBe(true);
      }
    });
  });

describe("getConfirmDialogCopy", () => {
it("returns the unfollow entry for 'unfollow' action", () => {
const copy = getConfirmDialogCopy("unfollow");
expect(copy).toBe(CONFIRM_DIALOGS.unfollow);
    });

it("returns the unblock entry for 'unblock' action", () => {
const copy = getConfirmDialogCopy("unblock");
expect(copy).toBe(CONFIRM_DIALOGS.unblock);
    });

it("returns the unfriend entry for 'unfriend' action", () => {
const copy = getConfirmDialogCopy("unfriend");
expect(copy).toBe(CONFIRM_DIALOGS.unfriend);
    });

it("returns the cancel_friend_request entry for 'cancel_friend_request' action", () => {
const copy = getConfirmDialogCopy("cancel_friend_request");
expect(copy).toBe(CONFIRM_DIALOGS.cancel_friend_request);
    });
  });

describe("CONFIRM_DIALOGS.unfriend (Epic 6.8 / TKT-6.8.F2)", () => {
const entry: DialogVocabulary = CONFIRM_DIALOGS.unfriend;

it("has distinct copy from CONFIRM_DIALOGS.unfollow", () => {

expect(entry).not.toBe(CONFIRM_DIALOGS.unfollow);
    });

it("dataTestid is 'confirm-dialog.unfriend'", () => {
expect(entry.dataTestid).toBe("confirm-dialog.unfriend");
    });

it("icon is 'UserMinus'", () => {
expect(entry.icon).toBe("UserMinus");
    });

it("body mentions pending friend request side effect", () => {
const body = entry.body.toLowerCase();
expect(
body.includes("pending friend request") ||
body.includes("cancel any pending"),
"body must mention the friend-request lifecycle side effect",
      ).toBe(true);
    });

it("body mentions the visibility side effect", () => {
const body = entry.body.toLowerCase();
expect(
body.includes("friend-only content") ||
body.includes("will no longer see"),
"body must mention the visibility side effect",
      ).toBe(true);
    });

it("body mentions irreversibility language", () => {
expect(entry.body.toLowerCase()).toMatch(
/cannot be undone|irreversible|cannot be reversed/,
      );
    });
  });

describe("CONFIRM_DIALOGS.cancel_friend_request (Epic 6.8 / TKT-6.8.F2)", () => {
const entry: DialogVocabulary = CONFIRM_DIALOGS.cancel_friend_request;

it("has distinct copy from CONFIRM_DIALOGS.unfollow", () => {
expect(entry).not.toBe(CONFIRM_DIALOGS.unfollow);
    });

it("dataTestid is 'confirm-dialog.cancel-friend-request'", () => {
expect(entry.dataTestid).toBe("confirm-dialog.cancel-friend-request");
    });

it("icon is 'XCircle'", () => {
expect(entry.icon).toBe("XCircle");
    });

it("body mentions recipient-side visibility side effect", () => {
const body = entry.body.toLowerCase();
expect(
body.includes("recipient") && body.includes("incoming list"),
"body must mention that the recipient will no longer see the request",
      ).toBe(true);
    });

it("body mentions irreversibility language", () => {
expect(entry.body.toLowerCase()).toMatch(
/cannot be undone|irreversible|cannot be reversed/,
      );
    });
  });

describe("DialogVocabulary type — structural", () => {
it("every entry in CONFIRM_DIALOGS conforms to DialogVocabulary (all fields present)", () => {
for (const [action, entry] of Object.entries(CONFIRM_DIALOGS)) {
expect(entry.title, `${action}: title must be present`).toBeDefined();
expect(entry.body, `${action}: body must be present`).toBeDefined();
expect(entry.confirmLabel, `${action}: confirmLabel must be present`).toBeDefined();
expect(entry.cancelLabel, `${action}: cancelLabel must be present`).toBeDefined();
expect(entry.dataTestid, `${action}: dataTestid must be present`).toBeDefined();
      }
    });
  });
});
