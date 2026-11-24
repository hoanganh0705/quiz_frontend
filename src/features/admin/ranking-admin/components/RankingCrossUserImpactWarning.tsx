"use client";

import { AlertTriangle } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { RANKING_RESET_IRREVERSIBILITY_NOTICE } from "../ranking-confirm-strings";

export interface RankingCrossUserImpactWarningProps {
  affectedUserCount?: number | null;
}

export function RankingCrossUserImpactWarning({
  affectedUserCount,
}: RankingCrossUserImpactWarningProps) {
  return (
    <div
      data-testid="ranking-cross-user-impact-warning"
      role="alert"
      className="flex flex-col gap-3 rounded-md border border-destructive/30 bg-destructive/10 dark:bg-destructive/15 p-4"
    >
      {/* Header badge */}
      <div className="flex items-center gap-2">
        <AlertTriangle
          className="h-4 w-4 text-destructive"
          aria-hidden="true"
        />
        <Badge variant="destructive">
          Cross-user impact
        </Badge>
      </div>

      {/* Irreversibility notice */}
      <p className="text-sm font-medium text-foreground">
        {RANKING_RESET_IRREVERSIBILITY_NOTICE}
      </p>

      {/* Affected user count */}
      {affectedUserCount !== undefined && affectedUserCount !== null ? (
        <p
          data-testid="ranking-affected-user-count"
          className="text-sm text-destructive"
        >
          This action affects{" "}
          <span className="font-semibold">
            {affectedUserCount.toLocaleString()}
          </span>{" "}
          user{affectedUserCount === 1 ? "" : "s"}.
        </p>
      ) : null}
    </div>
  );
}
