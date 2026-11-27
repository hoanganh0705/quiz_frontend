import { memo } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Progress } from "@/components/ui/Progress";

export interface OverviewTabProps {
  level?: number;

  currentLevelXP?: number;

  nextLevelXP?: number;

  levelProgress?: number;

  totalXP?: number;
}

function formatXP(xp: number): string {
  return xp.toLocaleString();
}

export const OverviewTab = memo(function OverviewTab({
  level = 1,
  currentLevelXP = 0,
  nextLevelXP = 100,
  levelProgress = 0,
  totalXP = 0,
}: OverviewTabProps) {
  const xpToNextLevel = Math.max(0, nextLevelXP - currentLevelXP);

  return (
    <div className="space-y-6 mt-6">
      {/* Level Progress Card */}
      <Card className="p-4">
        <CardHeader>
          <CardTitle className="text-base flex items-center">
            Level Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Level {level}</span>
              <span className="font-mono tabular-nums text-muted-foreground">
                {formatXP(currentLevelXP)} / {formatXP(nextLevelXP)} XP
              </span>
            </div>
            <Progress
              value={levelProgress}
              className="h-2"
              aria-label={`Level progress: ${levelProgress.toFixed(1)}%`}
            />
            <p className="text-xs text-muted-foreground">
              {formatXP(xpToNextLevel)} XP to reach Level {level + 1}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <Card className="p-4">
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            Quick Stats
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="font-mono tabular-nums text-2xl font-bold text-foreground">
                {formatXP(totalXP)}
              </p>
              <p className="text-xs text-muted-foreground">Total XP</p>
            </div>
            <div>
              <p className="font-mono tabular-nums text-2xl font-bold text-foreground">
                {level}
              </p>
              <p className="text-xs text-muted-foreground">Level</p>
            </div>
            <div>
              <p className="font-mono tabular-nums text-2xl font-bold text-foreground">
                -
              </p>
              <p className="text-xs text-muted-foreground">Badges</p>
            </div>
            <div>
              <p className="font-mono tabular-nums text-2xl font-bold text-foreground">
                -
              </p>
              <p className="text-xs text-muted-foreground">Rank</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});
