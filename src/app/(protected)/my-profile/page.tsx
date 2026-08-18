"use client";

import { Button } from "@/components/ui/Button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { ActivityTimeline } from "@/features/users/components/my-profile/ActivityTimeline";
import { ProfileHeader } from "@/features/users/components/my-profile/ProfileHeader";
import { QuickStatsSidebar } from "@/features/users/components/my-profile/QuickStatsSidebar";
import { QuickActions } from "@/features/users/components/my-profile/QuickActions";
import { OverviewTab } from "@/features/users/components/my-profile/tabs/OverviewTab";
import { QuizzesTab } from "@/features/users/components/my-profile/tabs/QuizzesTab";
import { AchievementsTab } from "@/features/users/components/my-profile/tabs/AchievementsTab";
import { StatisticsTab } from "@/features/users/components/my-profile/tabs/StatisticsTab";
import { ProfileEditTab } from "@/features/users/components/my-profile/ProfileEditTab";
import {
ProfileHeaderSkeleton,
StatsCardSkeleton,
} from "@/components/ui/loading-states";
import { Pencil } from "lucide-react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useMyProfileBundlePage } from "@/features/users/hooks/use-my-profile-page-bundle";

export default function MyProfilePage() {
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

if (!currentUser) {
if (isLoading) {
return (
<main className="min-h-screen text-foreground p-4 md:p-8 lg:p-12">
<div className="max-w-4xl mx-auto mb-8">
<ProfileHeaderSkeleton />
</div>
<div className="max-w-4xl mx-auto mb-8">
<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
{Array.from({ length: 4 }).map((_, i) => (
<StatsCardSkeleton key={i} />
              ))}
</div>
</div>
</main>
      );
    }

return (
<main className="min-h-screen flex items-center justify-center px-6">
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
<main className="min-h-screen flex items-start justify-center pt-10 pb-20">
<div className="w-full max-w-7xl">
{/* Back Button */}
<Button
size="sm"
asChild
        >
<Link href="/" aria-label="Back to home page">
<ArrowLeft className="w-5 h-5 mr-2" aria-hidden="true" />
Back to Home
          </Link>
</Button>

{/* Profile Header */}
<ProfileHeader
user={meData ?? {
userId: currentUser.id,
username: currentUser.name,
email: '',
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
          }}
summary={summary}
joinedAt={joinedAt}
        />

{/* Main Content */}
<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
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
className=" text-sm font-semibold data-[state=active]:bg-brand dark:data-[state=active]:text-brand text-muted-foreground data-[state=active]:text-foreground transition-transform"
                >
Overview
                </TabsTrigger>
<TabsTrigger
value="activity"
className=" text-sm font-semibold data-[state=active]:bg-brand dark:data-[state=active]:text-brand text-muted-foreground data-[state=active]:text-foreground transition-transform"
                >
Activity
                </TabsTrigger>
<TabsTrigger
value="quizzes"
className=" text-sm font-semibold data-[state=active]:bg-brand dark:data-[state=active]:text-brand text-muted-foreground data-[state=active]:text-foreground transition-transform"
                >
My Quizzes
                </TabsTrigger>
<TabsTrigger
value="achievements"
className=" text-sm font-semibold data-[state=active]:bg-brand dark:data-[state=active]:text-brand text-muted-foreground data-[state=active]:text-foreground transition-transform"
                >
Achievements
                </TabsTrigger>
<TabsTrigger
value="stats"
className=" text-sm font-semibold data-[state=active]:bg-brand dark:data-[state=active]:text-brand text-muted-foreground data-[state=active]:text-foreground transition-transform"
                >
Statistics
                </TabsTrigger>
<TabsTrigger
value="edit"
className=" text-sm font-semibold data-[state=active]:bg-brand dark:data-[state=active]:text-brand text-muted-foreground data-[state=active]:text-foreground transition-transform"
                >
<Pencil className="w-4 h-4 mr-1" aria-hidden="true" />
Edit
                </TabsTrigger>
</TabsList>

{/* Overview Tab */}
<TabsContent value="overview">
<OverviewTab
level={currentUser.level ?? 1}
currentLevelXP={currentLevelXP}
nextLevelXP={nextLevelXP}
levelProgress={levelProgress}
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
refreshInterval={activeTab === 'achievements' ? 60000 : undefined}
                />
</TabsContent>

{/* Statistics Tab */}
<TabsContent value="stats">
<StatisticsTab />
</TabsContent>

{/* Edit Tab — TKT-4.3.D2 */}
<TabsContent value="edit">
<ProfileEditTab />
</TabsContent>
</Tabs>
</div>

{/* Right Column - Sidebar */}
<div className="lg:col-span-1 space-y-6">
<QuickStatsSidebar />
<QuickActions />
</div>
</div>
</div>
</main>
  );
}
