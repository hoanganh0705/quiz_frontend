"use client";

import { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import {
ChartConfig,
ChartContainer,
ChartTooltip,
ChartTooltipContent,
} from "@/components/ui/Chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import {
Trophy,
Target,
Flame,
Zap,
BookOpen,
CheckCircle,
TrendingUp,
} from "lucide-react";
import { Progress } from "@/components/ui/Progress";

import {
useQuizHistoryStats,
type QuizHistoryStatsData,
} from "@/features/quizzes/hooks/useQuizHistoryStats";

interface HistoryStatsDashboardProps {

stats?: QuizHistoryStatsData | null;
}

function StatCard({
icon: Icon,
label,
value,
sub,
color,
}: {
icon: React.ElementType;
label: string;
value: string | number;
sub?: string;
color: string;
}) {
return (
<Card className="bg-background border border-border">
<CardContent className="p-4 flex items-center gap-4">
<div className={`p-3 rounded-xl ${color}`}>
<Icon className="h-5 w-5 text-white" />
</div>
<div className="flex-1 min-w-0">
<p className="text-sm text-muted-foreground truncate">{label}</p>
<p className="text-2xl font-bold">{value}</p>
{sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
</div>
</CardContent>
</Card>
  );
}

const weeklyChartConfig = {
quizzes: { label: "Quizzes" },
} satisfies ChartConfig;

function formatPlaytime(seconds: number) {
const hrs = Math.floor(seconds / 3600);
const mins = Math.floor((seconds % 3600) / 60);
return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
}

export const HistoryStatsDashboard = memo(function HistoryStatsDashboard({
stats: statsOverride,
}: HistoryStatsDashboardProps) {
const fetched = useQuizHistoryStats();
const stats = statsOverride ?? fetched.stats;

if (fetched.isLoading && !stats) {
return (
<div className="space-y-4">
<div className="h-24 rounded-lg bg-muted animate-pulse" />
<div className="h-24 rounded-lg bg-muted animate-pulse" />
</div>
    );
  }

if (!stats) {
return null;
  }

const accuracy =
stats.completedAttempts > 0 ? Math.round(stats.averageScore) : 0;

const weeklyActivity: Array<{ day: string; quizzes: number }> = [];

return (
<div className="space-y-6">
{/* KPI Stat Cards */}
<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
<StatCard
icon={BookOpen}
label="Total Attempts"
value={stats.totalAttempts}
sub={`${stats.completedAttempts} completed`}
color="bg-purple-500"
        />
<StatCard
icon={Target}
label="Average Score"
value={`${accuracy}%`}
color="bg-blue-500"
        />
<StatCard
icon={Flame}
label="Abandoned"
value={`${stats.abandonedAttempts}`}
color="bg-orange-500"
        />
<StatCard
icon={Zap}
label="Total Time"
value={formatPlaytime(stats.totalTimeSpentSeconds)}
sub={
stats.lastAttemptAt
? `Last: ${new Date(stats.lastAttemptAt).toLocaleDateString()}`
: undefined
          }
color="bg-emerald-500"
        />
</div>

{/* Accuracy & Favorites */}
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
<Card className="bg-background border border-border">
<CardHeader className="pb-2">
<CardTitle className="text-base flex items-center gap-2">
<CheckCircle className="h-4 w-4 text-green-500" />
Accuracy Overview
            </CardTitle>
</CardHeader>
<CardContent className="space-y-4">
<div className="text-center">
<span className="text-4xl font-bold">{accuracy}%</span>
<p className="text-sm text-muted-foreground mt-1">
{stats.completedAttempts} of {stats.totalAttempts} completed
              </p>
</div>
<Progress value={accuracy} className="h-3" />
</CardContent>
</Card>

<Card className="bg-background border border-border">
<CardHeader className="pb-2">
<CardTitle className="text-base flex items-center gap-2">
<TrendingUp className="h-4 w-4 text-purple-500" />
Favorites
            </CardTitle>
</CardHeader>
<CardContent className="space-y-3">
<div>
<p className="text-sm text-muted-foreground">Favorite Category</p>
<p className="font-semibold">
{stats.favoriteCategory?.name ?? "—"}
</p>
</div>
<div>
<p className="text-sm text-muted-foreground">Favorite Tag</p>
<p className="font-semibold">{stats.favoriteTag?.name ?? "—"}</p>
</div>
</CardContent>
</Card>
</div>

{/* Weekly activity (skeleton until backend exposes bucketed data) */}
<Card className="bg-background border border-border py-6">
<CardHeader>
<CardTitle className="flex items-center gap-2">
<Trophy className="h-5 w-5 text-yellow-500" />
Weekly Activity
          </CardTitle>
</CardHeader>
<CardContent>
{weeklyActivity.length === 0 ? (
<div className="text-center text-sm text-muted-foreground py-8">
Weekly activity chart will populate when the backend exposes
              bucketed activity.
            </div>
          ) : (
<ChartContainer config={weeklyChartConfig} className="min-h-20">
<BarChart
data={weeklyActivity}
margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
<CartesianGrid strokeDasharray="3 3" stroke="#374151" />
<XAxis
dataKey="day"
axisLine={false}
tickLine={false}
tick={{ fill: "#9CA3AF", fontSize: 14 }}
                />
<YAxis
axisLine={false}
tickLine={false}
tick={{ fill: "#9CA3AF", fontSize: 14 }}
                />
<ChartTooltip content={<ChartTooltipContent />} />
<Bar
dataKey="quizzes"
fill="rgb(168 85 247)"
radius={[4, 4, 0, 0]}
                />
</BarChart>
</ChartContainer>
          )}
</CardContent>
</Card>
</div>
  );
});

export type { QuizHistoryStatsData };
