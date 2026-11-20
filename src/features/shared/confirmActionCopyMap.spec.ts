import { describe, expect, it } from "vitest";

import {
  CONFIRM_ACTION_NAMES,
  CONFIRM_ACTION_KIND,
  actionsForKind,
  getConfirmKind,
  type ConfirmAction,
} from "./confirmActionCopyMap";
import type { ConfirmKind } from "@/components/primitives/ConfirmDialog/confirm-copy";

describe("confirmActionCopyMap", () => {
  it("CONFIRM_ACTION_NAMES lists every destructive action", () => {
    expect(CONFIRM_ACTION_NAMES.length).toBeGreaterThanOrEqual(5);

    expect(CONFIRM_ACTION_NAMES).toContain("bookmark.collection.delete");
    expect(CONFIRM_ACTION_NAMES).toContain("attempt.submit-and-complete");
    expect(CONFIRM_ACTION_NAMES).toContain("collection.bulk-remove");
    expect(CONFIRM_ACTION_NAMES).toContain("quiz.publish");
    expect(CONFIRM_ACTION_NAMES).toContain("review.delete");
  });

  it("every ConfirmAction has a kind assigned (exhaustive map)", () => {
    const seenKinds = new Set<ConfirmKind>();
    for (const action of CONFIRM_ACTION_NAMES) {
      const kind = CONFIRM_ACTION_KIND[action];
      expect(kind).toBeTruthy();
      seenKinds.add(kind);
    }

    expect(seenKinds.size).toBeGreaterThan(1);
  });

  it("bookmark.collection.delete is destructive-permanent", () => {
    expect(CONFIRM_ACTION_KIND["bookmark.collection.delete"]).toBe(
      "destructive-permanent",
    );
  });

  it("attempt.submit-and-complete is state-changing", () => {
    expect(CONFIRM_ACTION_KIND["attempt.submit-and-complete"]).toBe(
      "state-changing",
    );
  });

  it("collection.bulk-remove is destructive-idempotent", () => {
    expect(CONFIRM_ACTION_KIND["collection.bulk-remove"]).toBe(
      "destructive-idempotent",
    );
  });

  it("quiz.publish is state-changing", () => {
    expect(CONFIRM_ACTION_KIND["quiz.publish"]).toBe("state-changing");
  });

  it("review.delete is destructive-permanent", () => {
    expect(CONFIRM_ACTION_KIND["review.delete"]).toBe("destructive-permanent");
  });

  it("account.delete is typed-confirm", () => {
    expect(CONFIRM_ACTION_KIND["account.delete"]).toBe("typed-confirm");
  });

  it("getConfirmKind returns the mapped kind for known actions", () => {
    expect(getConfirmKind("quiz.publish")).toBe("state-changing");
    expect(getConfirmKind("account.delete")).toBe("typed-confirm");
    expect(getConfirmKind("collection.bulk-remove")).toBe(
      "destructive-idempotent",
    );
  });

  it("getConfirmKind falls back to destructive-permanent for unknown actions", () => {
    expect(getConfirmKind("not.a.real.action")).toBe("destructive-permanent");
    expect(getConfirmKind("")).toBe("destructive-permanent");
  });

  it("actionsForKind returns the reverse mapping", () => {
    const permanentActions = actionsForKind("destructive-permanent");
    expect(permanentActions).toContain("bookmark.collection.delete");
    expect(permanentActions).toContain("review.delete");
    expect(permanentActions).toContain("quiz.version.delete");

    const bulkActions = actionsForKind("destructive-idempotent");
    expect(bulkActions).toContain("collection.bulk-remove");

    const typedActions = actionsForKind("typed-confirm");
    expect(typedActions).toContain("account.delete");
  });

  it("every ConfirmAction is well-typed against the map (compile-time)", () => {
    const all: ConfirmAction[] = [...CONFIRM_ACTION_NAMES];
    expect(all.length).toBe(CONFIRM_ACTION_NAMES.length);
  });

  it("CONFIRM_ACTION_KIND is frozen (immutability)", () => {
    expect(Object.isFrozen(CONFIRM_ACTION_KIND)).toBe(true);
  });
});
