import { describe, expect, it } from "vitest";

import { ATTEMPT_KEYS } from "@/features/attempts/query-keys";
import { REVIEW_KEYS } from "@/features/reviews/query-keys";

import type { ReviewGateState } from "@/features/reviews/types";

describe("reviews/query-keys — cache key factories", () => {
  it('REVIEW_KEYS.list starts with the "reviews" + "quiz" discriminators', () => {
    const key = REVIEW_KEYS.list("quiz-1");
    expect(key[0]).toBe("reviews");
    expect(key[1]).toBe("quiz");
    expect(key[2]).toBe("quiz-1");
  });

  it("REVIEW_KEYS.list embeds the normalized cursor + limit tuple", () => {
    const key = REVIEW_KEYS.list("quiz-1", { cursor: "p2", limit: 10 });
    expect(key[3]).toEqual(["p2", 10]);
  });

  it("equal inputs produce equal REVIEW_KEYS.list values", () => {
    const a = REVIEW_KEYS.list("quiz-1", { limit: 5 });
    const b = REVIEW_KEYS.list("quiz-1", { limit: 5 });
    expect(a).toEqual(b);
  });

  it("different quiz IDs produce different REVIEW_KEYS.list values", () => {
    const a = REVIEW_KEYS.list("quiz-1");
    const b = REVIEW_KEYS.list("quiz-2");
    expect(a).not.toEqual(b);
  });

  it("different filter shapes are reflected in the key tuple", () => {
    const a = REVIEW_KEYS.list("quiz-1", { limit: 5 });
    const b = REVIEW_KEYS.list("quiz-1", { limit: 10 });
    expect(a[3]).not.toEqual(b[3]);
  });

  it("semantically equivalent filter shapes produce the same key tuple", () => {
    const a = REVIEW_KEYS.list("quiz-1", { cursor: undefined, limit: undefined });
    const b = REVIEW_KEYS.list("quiz-1");
    expect(a[3]).toEqual(b[3]);
  });

  it("REVIEW_KEYS.mine is session-scoped", () => {
    const a = REVIEW_KEYS.mine("quiz-1", "user-1");
    const b = REVIEW_KEYS.mine("quiz-1", "user-2");
    expect(a).not.toEqual(b);
    expect(a[3]).toBe("user-1");
  });

  it("ATTEMPT_KEYS.completedCheck is session-scoped", () => {
    const a = ATTEMPT_KEYS.completedCheck("quiz-1", "user-1");
    const b = ATTEMPT_KEYS.completedCheck("quiz-1", "user-2");
    expect(a).not.toEqual(b);
    expect(a[3]).toBe("quiz-1");
  });
});

describe("reviews/types — gate state union is exhaustive at compile time", () => {
  function assertNever(x: never): never {
    throw new Error(`unhandled gate kind: ${JSON.stringify(x)}`);
  }

  function describeGate(state: ReviewGateState): string {
    switch (state.kind) {
      case "loading":
        return "loading";
      case "unauthenticated":
        return "unauthenticated";
      case "existing-review":
        return `existing:${state.review.reviewId}`;
      case "eligible":
        return "eligible";
      case "attempt-required":
        return "attempt-required";
      case "error":
        return "error";
      default:
        return assertNever(state);
    }
  }

  it("covers every gate branch", () => {
    const samples: ReviewGateState[] = [
      { kind: "loading" },
      { kind: "unauthenticated" },
      { kind: "existing-review", review: { reviewId: "r1" } as never },
      { kind: "eligible" },
      { kind: "attempt-required" },
      { kind: "error", error: new Error("boom") },
    ];

    const labels = samples.map(describeGate);
    expect(labels).toEqual([
      "loading",
      "unauthenticated",
      "existing:r1",
      "eligible",
      "attempt-required",
      "error",
    ]);
  });
});
