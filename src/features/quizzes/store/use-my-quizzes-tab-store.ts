/**
 * `useMyQuizzesTabStore` — zustand store for the active tab in `/my-quizzes`.
 *
 * Source epic:   Epic 4.4 — Authored quizzes list + analytics.
 * Source ticket: TKT-4.4.B1.
 *
 * Mirrors the pattern from `use-quiz-filters-store.ts` (TKT-3.5.C1):
 * state is a scalar value; actions are standalone functions outside the state.
 *
 * ## Why zustand (not React context)
 *
 * - The project already uses `zustand` (see `package.json`).
 * - `MyQuizzesTabs` and `MyQuizzesDashboardPage` are not in the same
 *   component subtree — zustand avoids prop-drilling.
 * - Tab state should reset on navigation; no `persist` middleware.
 *
 * ## Design — actions outside the data state
 *
 * The store holds only `activeTab`. Actions are exported as named functions
 * so `getState()` returns the data state only; `reset()` can replace the
 * data state without losing the actions.
 */

import { create } from "zustand";

import type { MyQuizzesTab } from "@/features/quizzes/types/my-quizzes";

type MyQuizzesTabState = {
  activeTab: MyQuizzesTab;
};

/**
 * The store. State is the scalar `activeTab` value only — no actions in state.
 */
export const useMyQuizzesTabStore = create<MyQuizzesTabState>()(
  () => ({ activeTab: "all" }),
);

/** Standalone action: update the active tab. */
export function setMyQuizzesTab(tab: MyQuizzesTab): void {
  useMyQuizzesTabStore.setState({ activeTab: tab }, true);
}

/**
 * Scalar selector: subscribe to the active tab reactively.
 *
 * Per the cross-story contract rule, scalar selectors are stable references.
 */
export const useMyQuizzesActiveTab = () =>
  useMyQuizzesTabStore((state) => state.activeTab);
