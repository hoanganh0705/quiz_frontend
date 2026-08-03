/**
 * `MyQuizzesDashboardPage` — orchestrating container for the `/my-quizzes` page.
 *
 * Source epic:   Epic 4.4 — Authored quizzes list + analytics.
 * Source ticket: TKT-4.4.E1.
 *
 * Reads `activeTab` from `MyQuizzesTabStore`, calls the corresponding hook,
 * and renders the appropriate UI. Aborts in-flight fetches when the user
 * switches tabs by calling `refresh()` on the previous tab's hook result.
 *
 * ## Hook ↔ component wiring
 *
 * Each list tab (All / Drafts / Published) is backed by its own hook.
 * Only the hook for the active tab is called (React renders the matching
 * `<TabsContent>`). When the tab changes, the previous tab's `refresh()`
 * aborts any in-flight request so the SWR cache stays clean.
 *
 * The analytics tab is backed by `useMyQuizzesAnalytics`, which is not
 * cursor-paginated — it is a simple single-fetch hook.
 */

"use client";

import { useEffect, useRef } from "react";

import { MyQuizzesAnalyticsTab } from "./MyQuizzesAnalyticsTab";
import { MyQuizzesSkeleton } from "./MyQuizzesSkeleton";
import { MyQuizzesTable } from "./MyQuizzesTable";
import { MyQuizzesTabs } from "./MyQuizzesTabs";

import { useMyQuizzesActiveTab } from "@/features/quizzes/store";

import { useMyQuizzes } from "@/features/quizzes/hooks/useMyQuizzes";
import { useMyQuizzesAnalytics } from "@/features/quizzes/hooks/useMyQuizzesAnalytics";
import { useMyQuizzesDrafts } from "@/features/quizzes/hooks/useMyQuizzesDrafts";
import { useMyQuizzesPublished } from "@/features/quizzes/hooks/useMyQuizzesPublished";

import type { MyQuizzesTab } from "@/features/quizzes/types/my-quizzes";

const LIST_TABS: MyQuizzesTab[] = ["all", "drafts", "published"];

/**
 * Dashboard page for the author's quizzes.
 */
export function MyQuizzesDashboardPage(): React.ReactElement {
  const activeTab = useMyQuizzesActiveTab();

  // Per-tab hook calls — each is only rendered when its tab is active.
  const allResult = useMyQuizzes();
  const draftsResult = useMyQuizzesDrafts();
  const publishedResult = useMyQuizzesPublished();
  const analyticsResult = useMyQuizzesAnalytics();

  // Track the previous tab to abort its in-flight request on tab switch.
  const prevTabRef = useRef<MyQuizzesTab>(activeTab);

  useEffect(() => {
    if (prevTabRef.current !== activeTab) {
      // Abort any in-flight request for the previous tab.
      if (prevTabRef.current === "all") allResult.refresh();
      if (prevTabRef.current === "drafts") draftsResult.refresh();
      if (prevTabRef.current === "published") publishedResult.refresh();
      prevTabRef.current = activeTab;
    }
  }, [activeTab, allResult, draftsResult, publishedResult]);

  // Derive the result for the active tab.
  const activeListResult =
    activeTab === "all"
      ? allResult
      : activeTab === "drafts"
        ? draftsResult
        : publishedResult;

  const isActiveListTab = LIST_TABS.includes(activeTab);

  return (
    <MyQuizzesTabs
      analyticsContent={
        <MyQuizzesAnalyticsTab
          analytics={analyticsResult.analytics}
          isLoading={analyticsResult.isLoading}
        />
      }
    >
      {(tab) => {
        const result =
          tab === "all"
            ? allResult
            : tab === "drafts"
              ? draftsResult
              : publishedResult;

        // Only the active tab is rendered; isLoading covers the initial fetch.
        return (
          <MyQuizzesTable
            items={result.items}
            isLoading={result.isLoading}
            isLoadingMore={result.isLoadingMore}
            hasMore={result.hasMore}
            loadMore={result.loadMore}
            retryBannerVisible={result.retryBannerVisible ?? false}
            refresh={result.refresh}
            tab={tab}
          />
        );
      }}
    </MyQuizzesTabs>
  );
}
