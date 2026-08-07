/**
 * Spec for `EventDeduplicator` (TKT-6.10.D1).
 *
 * Source epic:   Epic 6.10 — Realtime Social Notifications and Relationship
 *                Invalidation.
 * Source ticket: TKT-6.10.D1.
 *
 * Locks the dedup contract: `has` / `add` / `clear` / `size`
 * semantics, the 200-key FIFO eviction, and the strict-LRU position
 * refresh on re-add.
 */

import { describe, expect, it } from "vitest";

import { EventDeduplicator, EVENT_DEDUP_CAP } from "../event-deduplicator";

describe("EventDeduplicator", () => {
  it("starts empty", () => {
    const dedup = new EventDeduplicator();
    expect(dedup.size()).toBe(0);
    expect(dedup.has("any-key")).toBe(false);
  });

  it("add then has returns true", () => {
    const dedup = new EventDeduplicator();
    dedup.add("a::b::c::d");
    expect(dedup.has("a::b::c::d")).toBe(true);
    expect(dedup.size()).toBe(1);
  });

  it("clear resets the set", () => {
    const dedup = new EventDeduplicator();
    dedup.add("a");
    dedup.add("b");
    dedup.clear();
    expect(dedup.size()).toBe(0);
    expect(dedup.has("a")).toBe(false);
    expect(dedup.has("b")).toBe(false);
  });

  it("evicts the oldest entry when the cap is reached", () => {
    const dedup = new EventDeduplicator();
    for (let i = 0; i < EVENT_DEDUP_CAP; i += 1) {
      dedup.add(`key-${i}`);
    }
    expect(dedup.size()).toBe(EVENT_DEDUP_CAP);
    dedup.add("key-overflow");
    expect(dedup.size()).toBe(EVENT_DEDUP_CAP);
    expect(dedup.has("key-0")).toBe(false); // oldest evicted
    expect(dedup.has("key-overflow")).toBe(true);
  });

  it("re-adding an existing key moves it to the back of the queue", () => {
    const dedup = new EventDeduplicator();
    dedup.add("a");
    dedup.add("b");
    dedup.add("c");
    // Re-add 'a' — it should now be the most recent, and adding
    // enough keys should evict 'b' (now the oldest), not 'a'.
    dedup.add("a");
    // Fill to the cap, then add one more.
    for (let i = 3; i < EVENT_DEDUP_CAP; i += 1) {
      dedup.add(`key-${i}`);
    }
    expect(dedup.has("a")).toBe(true);
    // The overflow entry should evict the new oldest, which is now
    // 'b' (not 'a').
    dedup.add("overflow");
    expect(dedup.has("a")).toBe(true);
  });

  it("keys are exact-match strings (the class does not normalise)", () => {
    const dedup = new EventDeduplicator();
    dedup.add("A::B::C::D");
    expect(dedup.has("A::B::C::D")).toBe(true);
    expect(dedup.has("a::b::c::d")).toBe(false);
  });
});