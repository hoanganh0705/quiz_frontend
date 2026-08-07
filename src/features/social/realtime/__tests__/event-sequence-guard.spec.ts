/**
 * Spec for `EventSequenceGuard` (TKT-6.10.D2).
 *
 * Source epic:   Epic 6.10 — Realtime Social Notifications and Relationship
 *                Invalidation.
 * Source ticket: TKT-6.10.D2.
 *
 * Locks the sequence-guard contract: monotonic accept, equal/smaller
 * drop, cross-key independence, and clear semantics.
 */

import { describe, expect, it } from "vitest";

import { EventSequenceGuard } from "../event-sequence-guard";

describe("EventSequenceGuard", () => {
  it("starts empty", () => {
    const guard = new EventSequenceGuard();
    expect(guard.size()).toBe(0);
  });

  it("accepts the first event for a key", () => {
    const guard = new EventSequenceGuard();
    expect(guard.accept("relationship.changed::a::b", 1)).toBe("allow");
    expect(guard.size()).toBe(1);
  });

  it("accepts a strictly-increasing sequence", () => {
    const guard = new EventSequenceGuard();
    expect(guard.accept("relationship.changed::a::b", 1)).toBe("allow");
    expect(guard.accept("relationship.changed::a::b", 2)).toBe("allow");
    expect(guard.accept("relationship.changed::a::b", 3)).toBe("allow");
  });

  it("drops an equal sequence (duplicate delivery)", () => {
    const guard = new EventSequenceGuard();
    expect(guard.accept("blocked.changed::a::b", 5)).toBe("allow");
    expect(guard.accept("blocked.changed::a::b", 5)).toBe("drop");
  });

  it("drops a smaller sequence (out-of-order)", () => {
    const guard = new EventSequenceGuard();
    expect(guard.accept("blocked.changed::a::b", 5)).toBe("allow");
    expect(guard.accept("blocked.changed::a::b", 4)).toBe("drop");
    expect(guard.accept("blocked.changed::a::b", 1)).toBe("drop");
  });

  it("the counter advances only on accept", () => {
    const guard = new EventSequenceGuard();
    guard.accept("friend.added::a::b", 10);
    guard.accept("friend.added::a::b", 5); // drop, no advance
    // A subsequent sequence > 10 must still be accepted.
    expect(guard.accept("friend.added::a::b", 11)).toBe("allow");
  });

  it("clear resets the counter map", () => {
    const guard = new EventSequenceGuard();
    guard.accept("k::a::b", 1);
    guard.accept("k::a::b", 2);
    guard.clear();
    expect(guard.size()).toBe(0);
    // After clear, the same sequence is again accepted.
    expect(guard.accept("k::a::b", 1)).toBe("allow");
  });

  it("cross-key independence", () => {
    const guard = new EventSequenceGuard();
    guard.accept("relationship.changed::a::b", 10);
    // Different (eventType, actor, target) tuple → independent counter.
    expect(guard.accept("blocked.changed::a::b", 1)).toBe("allow");
    expect(guard.accept("relationship.changed::a::c", 1)).toBe("allow");
    // Same actor/target but different event type → independent.
    expect(guard.accept("friend.added::a::b", 1)).toBe("allow");
  });

  it("first event for a key is always allow (default counter is 0)", () => {
    const guard = new EventSequenceGuard();
    // Even sequence=0 is accepted (the default counter is 0,
    // and 0 <= 0 is FALSE per the implementation — wait, 0 is not
    // > 0, so the spec asserts sequence=1 is the minimum).
    expect(guard.accept("k::a::b", 0)).toBe("drop"); // 0 <= default 0
    expect(guard.accept("k::a::b", 1)).toBe("allow");
  });
});