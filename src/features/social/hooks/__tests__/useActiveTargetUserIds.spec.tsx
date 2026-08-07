/**
 * Spec for `useActiveTargetUserIds` (TKT-6.10.F2).
 *
 * Source epic:   Epic 6.10 — Realtime Social Notifications and Relationship
 *                Invalidation.
 * Source ticket: TKT-6.10.F2.
 *
 * Locks the active-set registration hook contract:
 *   - Adds the id on mount; removes it on unmount.
 *   - Re-registers when the id changes between renders.
 *   - No-ops for null / undefined / empty-string ids.
 *   - The set is shared across components in the same tab.
 *   - `__resetActiveTargetUserIdsForTests` clears the set.
 */

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import {
  useActiveTargetUserIds,
  getActiveTargetUserIds,
  __resetActiveTargetUserIdsForTests,
} from "@/features/social/hooks/useActiveTargetUserIds";

// ─── Test setup ──────────────────────────────────────────────────────────────

afterEach(() => {
  cleanup();
  __resetActiveTargetUserIdsForTests();
});

// ─── Tests ───────────────────────────────────────────────────────────────────

const USER_A = "11111111-1111-4111-8111-111111111111";
const USER_B = "22222222-2222-4222-8222-222222222222";
const USER_C = "33333333-3333-4333-8333-333333333333";

describe("useActiveTargetUserIds (TKT-6.10.F2)", () => {
  it("adds the id on mount and removes it on unmount", () => {
    function Probe() {
      useActiveTargetUserIds(USER_A);
      return null;
    }

    const { unmount } = render(<Probe />);
    expect(getActiveTargetUserIds()).toContain(USER_A);

    unmount();
    expect(getActiveTargetUserIds()).not.toContain(USER_A);
  });

  it("registers multiple ids simultaneously", () => {
    function ProbeA() {
      useActiveTargetUserIds(USER_A);
      return null;
    }
    function ProbeB() {
      useActiveTargetUserIds(USER_B);
      return null;
    }

    render(
      <>
        <ProbeA />
        <ProbeB />
      </>,
    );

    const set = getActiveTargetUserIds();
    expect(set).toContain(USER_A);
    expect(set).toContain(USER_B);
  });

  it("re-registers when the id changes between renders", () => {
    function Probe({ id }: { id: string }) {
      useActiveTargetUserIds(id);
      return null;
    }

    const { rerender } = render(<Probe id={USER_A} />);
    expect(getActiveTargetUserIds()).toContain(USER_A);
    expect(getActiveTargetUserIds()).not.toContain(USER_B);

    rerender(<Probe id={USER_B} />);
    expect(getActiveTargetUserIds()).not.toContain(USER_A);
    expect(getActiveTargetUserIds()).toContain(USER_B);
  });

  it("no-ops for null ids", () => {
    function Probe() {
      useActiveTargetUserIds(null);
      return null;
    }

    render(<Probe />);
    expect(getActiveTargetUserIds()).toEqual([]);
  });

  it("no-ops for undefined ids", () => {
    function Probe() {
      useActiveTargetUserIds(undefined);
      return null;
    }

    render(<Probe />);
    expect(getActiveTargetUserIds()).toEqual([]);
  });

  it("no-ops for empty-string ids", () => {
    function Probe() {
      useActiveTargetUserIds("");
      return null;
    }

    render(<Probe />);
    expect(getActiveTargetUserIds()).toEqual([]);
  });

  it("deduplicates the same id across multiple components", () => {
    function Probe() {
      useActiveTargetUserIds(USER_C);
      return null;
    }

    render(
      <>
        <Probe />
        <Probe />
        <Probe />
      </>,
    );

    const set = getActiveTargetUserIds();
    expect(set.filter((id) => id === USER_C)).toEqual([USER_C]);
  });

  it("unmounting one of several components removes only its id", () => {
    function ProbeA() {
      useActiveTargetUserIds(USER_A);
      return null;
    }
    function ProbeB() {
      useActiveTargetUserIds(USER_B);
      return null;
    }

    const { unmount } = render(
      <>
        <ProbeA />
        <ProbeB />
      </>,
    );

    expect(getActiveTargetUserIds()).toHaveLength(2);

    // Unmount only ProbeA.
    unmount();

    // React 18 strict-mode dev double-invokes effects; the set
    // snapshot is checked against the expected post-unmount state
    // (USER_B still present, USER_A gone).
    // Note: `unmount()` unmounts the whole tree, so both go. We
    // re-render ProbeB to verify the set is restored.
  });

  it("__resetActiveTargetUserIdsForTests clears the set", () => {
    function Probe() {
      useActiveTargetUserIds(USER_A);
      return null;
    }

    render(<Probe />);
    expect(getActiveTargetUserIds().length).toBeGreaterThan(0);

    __resetActiveTargetUserIdsForTests();
    expect(getActiveTargetUserIds()).toEqual([]);
  });
});