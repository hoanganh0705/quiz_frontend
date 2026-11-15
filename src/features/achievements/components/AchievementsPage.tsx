"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Award, History, Sparkles } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { AchievementsPlaceholder } from "@/features/rankings/components/shared/Placeholder";
import { isAchievementSurfaceEnabled } from "@/features/achievements/flags";
import { BadgeGallery } from "@/features/achievements/components/BadgeGallery";
import { EarnedBadgeList } from "@/features/achievements/components/EarnedBadgeList";
import { AchievementHistory } from "@/features/achievements/components/AchievementHistory";
import { useAchievementNotificationRevalidation } from "@/features/achievements/hooks/useAchievementNotificationRevalidation";
import { useAchievementFocusRevalidation } from "@/features/achievements/hooks/useAchievementFocusRevalidation";

interface AchievementsPageProps {
  className?: string;
}

const QUERY_TAB = "tab";
type AchievementTab = "catalog" | "earned" | "history";

function parseTab(value: string | null): AchievementTab {
  if (value === "earned" || value === "history") {
    return value;
  }
  return "catalog";
}

function AchievementsTabs() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const tabParam = searchParams?.get(QUERY_TAB) ?? null;
  const currentTab = parseTab(tabParam);
  const [activeTab, setActiveTab] = useState<AchievementTab>(currentTab);

  useEffect(() => {
    setActiveTab(currentTab);
  }, [currentTab]);

  const handleTabChange = useCallback(
    (value: string) => {
      const nextTab = parseTab(value);
      setActiveTab(nextTab);
      try {
        const params = new URLSearchParams(
          searchParams ? Array.from(searchParams.entries()) : [],
        );
        if (nextTab === "catalog") {
          params.delete(QUERY_TAB);
        } else {
          params.set(QUERY_TAB, nextTab);
        }
        const qs = params.toString();
        router.replace(qs.length > 0 ? `${pathname}?${qs}` : pathname, {
          scroll: false,
        });
      } catch {
        // Fallback for isolated test environments
      }
    },
    [searchParams, router, pathname],
  );

  return (
    <Tabs
      value={activeTab}
      onValueChange={handleTabChange}
      className="space-y-6"
    >
      <TabsList className="bg-muted p-1 inline-flex w-auto gap-1">
        <TabsTrigger value="catalog" className="gap-2">
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          <span>Badge Catalog</span>
        </TabsTrigger>
        <TabsTrigger value="earned" className="gap-2">
          <Award className="h-4 w-4" aria-hidden="true" />
          <span>My Badges</span>
        </TabsTrigger>
        <TabsTrigger value="history" className="gap-2">
          <History className="h-4 w-4" aria-hidden="true" />
          <span>History</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent
        value="catalog"
        forceMount
        className={activeTab === "catalog" ? "block space-y-4" : "hidden"}
      >
        <Suspense fallback={null}>
          <BadgeGallery />
        </Suspense>
      </TabsContent>

      <TabsContent
        value="earned"
        forceMount
        className={activeTab === "earned" ? "block space-y-4" : "hidden"}
      >
        <EarnedBadgeList />
      </TabsContent>

      <TabsContent
        value="history"
        forceMount
        className={activeTab === "history" ? "block space-y-4" : "hidden"}
      >
        <Suspense fallback={null}>
          <AchievementHistory />
        </Suspense>
      </TabsContent>
    </Tabs>
  );
}

export function AchievementsPage({ className }: AchievementsPageProps) {
  const isLive = isAchievementSurfaceEnabled();

  if (!isLive) {
    return (
      <main
        data-testid="achievements-page-placeholder"
        className={`mx-auto max-w-4xl p-4 sm:p-6 lg:p-8 ${className ?? ""}`}
      >
        <AchievementsPlaceholder />
      </main>
    );
  }

  return <AchievementsPageLive className={className} />;
}

function AchievementsPageLive({ className }: AchievementsPageProps) {
  useAchievementNotificationRevalidation();
  useAchievementFocusRevalidation();

  return (
    <main
      data-testid="achievements-page"
      className={`mx-auto max-w-4xl space-y-6 p-4 sm:p-6 lg:p-8 ${className ?? ""}`}
    >
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Achievements</h1>
        <p className="text-sm text-muted-foreground">
          Browse the badge catalog, your earned badges, and your full
          achievement history.
        </p>
      </header>

      <Suspense fallback={null}>
        <AchievementsTabs />
      </Suspense>
    </main>
  );
}
