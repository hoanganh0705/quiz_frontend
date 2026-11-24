"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Award, History, Sparkles, Trophy } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { AchievementHistory } from "@/features/achievements/components/AchievementHistory";
import { BadgeGallery } from "@/features/achievements/components/BadgeGallery";
import { EarnedBadgeList } from "@/features/achievements/components/EarnedBadgeList";
import { UnauthenticatedAchievementsCta } from "@/features/achievements/components/shared/AchievementShared";
import { useAchievementFocusRevalidation } from "@/features/achievements/hooks/useAchievementFocusRevalidation";
import { useAchievementNotificationRevalidation } from "@/features/achievements/hooks/useAchievementNotificationRevalidation";
import { useAuthSession } from "@/features/auth/hooks/use-auth-session";
import { AchievementsPlaceholder } from "@/features/rankings/components/shared/Placeholder";

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

  let isAuthenticated = false;
  let bootstrapState: "unauthenticated" | "bootstrapping" | "authenticated" =
    "unauthenticated";

  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const auth = useAuthSession();
    isAuthenticated = auth.isAuthenticated;
    bootstrapState = auth.bootstrapState;
  } catch {
    // Graceful fallback for test or mock environments
  }

  const showUnauthenticatedCta =
    bootstrapState !== "bootstrapping" && !isAuthenticated;

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
      <div className="flex items-center justify-between">
        <TabsList className="bg-muted/80 p-1 inline-flex w-full sm:w-auto rounded-xl gap-1 border border-border/40 backdrop-blur-xs">
          <TabsTrigger value="catalog" className="gap-2 rounded-lg font-medium">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            <span>Badge Catalog</span>
          </TabsTrigger>
          <TabsTrigger value="earned" className="gap-2 rounded-lg font-medium">
            <Award className="h-4 w-4" aria-hidden="true" />
            <span>My Badges</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2 rounded-lg font-medium">
            <History className="h-4 w-4" aria-hidden="true" />
            <span>History</span>
          </TabsTrigger>
        </TabsList>
      </div>

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
        {showUnauthenticatedCta ? (
          <UnauthenticatedAchievementsCta tab="earned" />
        ) : null}
      </TabsContent>

      <TabsContent
        value="history"
        forceMount
        className={activeTab === "history" ? "block space-y-4" : "hidden"}
      >
        <Suspense fallback={null}>
          <AchievementHistory />
        </Suspense>
        {showUnauthenticatedCta ? (
          <UnauthenticatedAchievementsCta tab="history" />
        ) : null}
      </TabsContent>
    </Tabs>
  );
}

export function AchievementsPage({ className }: AchievementsPageProps) {
  const isEnabled = true;

  if (!isEnabled) {
    return (
      <main
        data-testid="achievements-page-placeholder"
        className={`mx-auto max-w-7xl min-h-screen text-foreground px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8 ${className ?? ""}`}
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
      className={`mx-auto max-w-7xl min-h-screen text-foreground px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8 ${className ?? ""}`}
    >
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-2 border-b border-border/40">
        <div className="flex items-start gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand/10 text-brand ring-1 ring-brand/20 shadow-xs">
            <Trophy className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight">
              Achievements
            </h1>
            <p className="text-sm text-muted-foreground">
              Browse the badge catalog, your earned badges, and your full
              achievement history.
            </p>
          </div>
        </div>
      </header>

      <Suspense fallback={null}>
        <AchievementsTabs />
      </Suspense>
    </main>
  );
}
