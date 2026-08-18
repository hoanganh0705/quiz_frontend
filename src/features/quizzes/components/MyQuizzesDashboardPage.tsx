

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

export function MyQuizzesDashboardPage(): React.ReactElement {
const activeTab = useMyQuizzesActiveTab();

const allResult = useMyQuizzes();
const draftsResult = useMyQuizzesDrafts();
const publishedResult = useMyQuizzesPublished();
const analyticsResult = useMyQuizzesAnalytics();

const prevTabRef = useRef<MyQuizzesTab>(activeTab);

useEffect(() => {
if (prevTabRef.current !== activeTab) {

if (prevTabRef.current === "all") allResult.refresh();
if (prevTabRef.current === "drafts") draftsResult.refresh();
if (prevTabRef.current === "published") publishedResult.refresh();
prevTabRef.current = activeTab;
    }
  }, [activeTab, allResult, draftsResult, publishedResult]);

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
