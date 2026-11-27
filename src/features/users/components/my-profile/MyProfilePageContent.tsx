"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { ArrowLeft, Pencil } from "lucide-react";

import { ActivityTimeline } from "@/features/users/components/my-profile/ActivityTimeline";
import { ProfileHeader } from "@/features/users/components/my-profile/ProfileHeader";
import { QuickActions } from "@/features/users/components/my-profile/QuickActions";
import { QuickStatsSidebar } from "@/features/users/components/my-profile/QuickStatsSidebar";
import { AchievementsTab } from "@/features/users/components/my-profile/tabs/AchievementsTab";
import { OverviewTab } from "@/features/users/components/my-profile/tabs/OverviewTab";
import { QuizzesTab } from "@/features/users/components/my-profile/tabs/QuizzesTab";
import { StatisticsTab } from "@/features/users/components/my-profile/tabs/StatisticsTab";
import { useMyProfileBundlePage } from "@/features/users/hooks/use-my-profile-page-bundle";

import { Button } from "@/components/ui/Button";
import {
  ProfileHeaderSkeleton,
  StatsCardSkeleton,
} from "@/components/ui/loading-states";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";

import { PAGE_CONTAINER_CLASS } from "@/shared/layout/constants";

export function MyProfilePageContent() {
  const router = useRouter();
  const {
    activeTab,
    setActiveTab,
    currentUser,
    isLoading,
    me: meData,
    summary,
    joinedAt,
    currentLevelXP,
    nextLevelXP,
    levelProgress,
  } = useMyProfileBundlePage();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const tabParam = new URLSearchParams(window.location.search).get("tab");
    if (tabParam === "edit") {
      router.replace("/settings?tab=account");
    }
  }, [router]);

  if (!currentUser) {
    if (isLoading) {
      return (
        <main className={`${PAGE_CONTAINER_CLASS} space-y-8`}>
          <ProfileHeaderSkeleton />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <StatsCardSkeleton key={i} />
            ))}
          </div>
        </main>
      );
    }

    return (
      <main
        className={`${PAGE_CONTAINER_CLASS} flex items-center justify-center`}
      >
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Profile unavailable
          </h1>
          <p className="text-sm text-muted-foreground">
            Sign in to view your profile and stats.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className={`${PAGE_CONTAINER_CLASS} space-y-6`}>
      {/* Top Actions */}
      <div className="flex items-center justify-between gap-3">
        <Button size="sm" asChild>
          <Link href="/" aria-label="Back to home page">
            <ArrowLeft className="w-5 h-5 mr-2" aria-hidden="true" />
            Back to Home
          </Link>
        </Button>
        <Button size="sm" variant="outline" asChild>
          <Link href="/settings?tab=account">
            <Pencil className="w-4 h-4 mr-1.5" aria-hidden="true" />
            Edit Profile
          </Link>
        </Button>
      </div>

      {/* Profile Header */}
      <ProfileHeader
        user={
          meData ?? {
            userId: currentUser.id,
            username: currentUser.name,
            email: "",
            xpTotal: 0,
            currentStreak: 0,
            longestStreak: 0,
            settings: {
              emailNotifications: true,
              pushNotifications: true,
              leaderboardVisible: true,
            },
            createdAt: joinedAt ?? new Date().toISOString(),
            updatedAt: joinedAt ?? new Date().toISOString(),
          }
        }
        summary={summary}
        joinedAt={joinedAt}
      />

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Tabs */}
        <div className="lg:col-span-2">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full text-sm"
          >
            <TabsList
              className="border border-border w-full justify-start"
              role="tablist"
              aria-label="Profile sections"
            >
              <TabsTrigger
                value="overview"
                className="text-sm font-semibold data-[state=active]:bg-brand dark:data-[state=active]:text-brand text-muted-foreground data-[state=active]:text-foreground transition-transform"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="activity"
                className="text-sm font-semibold data-[state=active]:bg-brand dark:data-[state=active]:text-brand text-muted-foreground data-[state=active]:text-foreground transition-transform"
              >
                Activity
              </TabsTrigger>
              <TabsTrigger
                value="quizzes"
                className="text-sm font-semibold data-[state=active]:bg-brand dark:data-[state=active]:text-brand text-muted-foreground data-[state=active]:text-foreground transition-transform"
              >
                My Quizzes
              </TabsTrigger>
              <TabsTrigger
                value="achievements"
                className="text-sm font-semibold data-[state=active]:bg-brand dark:data-[state=active]:text-brand text-muted-foreground data-[state=active]:text-foreground transition-transform"
              >
                Achievements
              </TabsTrigger>
              <TabsTrigger
                value="stats"
                className="text-sm font-semibold data-[state=active]:bg-brand dark:data-[state=active]:text-brand text-muted-foreground data-[state=active]:text-foreground transition-transform"
              >
                Statistics
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview">
              <OverviewTab
                level={currentUser.level ?? 1}
                currentLevelXP={currentLevelXP}
                nextLevelXP={nextLevelXP}
                levelProgress={levelProgress}
                totalXP={meData?.xpTotal ?? currentLevelXP}
              />
            </TabsContent>

            {/* Activity Tab */}
            <TabsContent value="activity" className="space-y-4 mt-6">
              <ActivityTimeline />
            </TabsContent>

            {/* My Quizzes Tab */}
            <TabsContent value="quizzes">
              <QuizzesTab />
            </TabsContent>

            {/* Achievements Tab */}
            <TabsContent value="achievements">
              <AchievementsTab
                refreshInterval={
                  activeTab === "achievements" ? 60000 : undefined
                }
              />
            </TabsContent>

            {/* Statistics Tab */}
            <TabsContent value="stats">
              <StatisticsTab />
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column - Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <QuickStatsSidebar />
          <QuickActions />
        </div>
      </div>
    </main>
  );
}
