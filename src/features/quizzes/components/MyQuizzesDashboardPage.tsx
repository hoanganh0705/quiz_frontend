"use client";

import Link from "next/link";
import { Plus, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { MyQuizzesAnalyticsTab } from "./MyQuizzesAnalyticsTab";
import { MyQuizzesTable } from "./MyQuizzesTable";
import { MyQuizzesTabs } from "./MyQuizzesTabs";

import { useMyQuizzesActiveTab } from "@/features/quizzes/store";

import { useMyQuizzes } from "@/features/quizzes/hooks/useMyQuizzes";
import { useMyQuizzesAnalytics } from "@/features/quizzes/hooks/useMyQuizzesAnalytics";
import { useMyQuizzesDrafts } from "@/features/quizzes/hooks/useMyQuizzesDrafts";
import { useMyQuizzesPublished } from "@/features/quizzes/hooks/useMyQuizzesPublished";

export function MyQuizzesDashboardPage(): React.ReactElement {
  const activeTab = useMyQuizzesActiveTab();

  const isAll = activeTab === "all";
  const isDrafts = activeTab === "drafts";
  const isPublished = activeTab === "published";
  const isAnalytics = activeTab === "analytics";

  const allResult = useMyQuizzes({ enabled: isAll });
  const draftsResult = useMyQuizzesDrafts({ enabled: isDrafts });
  const publishedResult = useMyQuizzesPublished({ enabled: isPublished });
  const analyticsResult = useMyQuizzesAnalytics({ enabled: isAnalytics });

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-mono font-medium tracking-wider uppercase text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Creator Studio</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            My Quizzes
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage your created quizzes, draft edits, and view performance analytics.
          </p>
        </div>
        <div>
          <Button
            asChild
            className="w-full shadow-xs transition-all duration-200 hover:-translate-y-0.5 sm:w-auto"
          >
            <Link href="/create-quiz">
              <Plus className="mr-1.5 h-4 w-4" />
              Create Quiz
            </Link>
          </Button>
        </div>
      </div>

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
    </div>
  );
}
