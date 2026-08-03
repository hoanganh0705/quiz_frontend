/**
 * `use-my-quizzes-tab-store.spec.ts` — unit tests for the zustand tab store.
 *
 * Source epic:   Epic 4.4 — Authored quizzes list + analytics.
 * Source ticket: TKT-4.4.E8.
 *
 * Mirrors `use-quiz-filters-store.spec.ts` (TKT-3.5.C4) in pattern.
 * Note: `useMyQuizzesActiveTab` (the React hook) is tested in the
 * integration spec — it requires a DOM environment. These unit tests
 * exercise the store's imperative API in node.
 */

import { afterEach, describe, expect, it } from "vitest";

import {
  setMyQuizzesTab,
  useMyQuizzesTabStore,
} from "@/features/quizzes/store/use-my-quizzes-tab-store";

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

afterEach(() => {
  // Reset to default state after each test.
  useMyQuizzesTabStore.setState({ activeTab: "all" });
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("MyQuizzesTabStore — initial state", () => {
  it('defaults to "all"', () => {
    expect(useMyQuizzesTabStore.getState().activeTab).toBe("all");
  });
});

describe("MyQuizzesTabStore — setMyQuizzesTab", () => {
  it('setMyQuizzesTab("drafts") updates to "drafts"', () => {
    setMyQuizzesTab("drafts");
    expect(useMyQuizzesTabStore.getState().activeTab).toBe("drafts");
  });

  it('setMyQuizzesTab("published") updates to "published"', () => {
    setMyQuizzesTab("published");
    expect(useMyQuizzesTabStore.getState().activeTab).toBe("published");
  });

  it('setMyQuizzesTab("analytics") updates to "analytics"', () => {
    setMyQuizzesTab("analytics");
    expect(useMyQuizzesTabStore.getState().activeTab).toBe("analytics");
  });

  it('setMyQuizzesTab("all") resets back to "all"', () => {
    setMyQuizzesTab("analytics");
    setMyQuizzesTab("all");
    expect(useMyQuizzesTabStore.getState().activeTab).toBe("all");
  });
});

describe("MyQuizzesTabStore — getState()", () => {
  it("getState() returns a stable snapshot with activeTab", () => {
    setMyQuizzesTab("published");
    const snapshot = useMyQuizzesTabStore.getState();
    expect(snapshot.activeTab).toBe("published");
    expect(typeof snapshot.activeTab).toBe("string");
  });
});
