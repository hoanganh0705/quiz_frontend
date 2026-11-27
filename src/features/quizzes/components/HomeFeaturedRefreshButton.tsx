"use client";

import { useCallback, useState } from "react";
import { getQueryClient } from "@/providers/QueryProvider";
import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/Button";

import { QUIZ_KEYS } from "@/features/quizzes/query-keys";
import {
  refreshHomeBundle,
  type FeaturedRefreshHandle,
} from "@/features/quizzes/services/quizzes.service";

export function HomeFeaturedRefreshButton({
  onRefreshed,
  className,
}: {
  onRefreshed?: FeaturedRefreshHandle;
  className?: string;
}) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleClick = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const data = await refreshHomeBundle();
      getQueryClient().setQueryData(QUIZ_KEYS.homeBundle(), data);
      onRefreshed?.(data);
    } catch {
      // Fail gracefully without unhandled promise rejection
    } finally {
      setIsRefreshing(false);
    }
  }, [onRefreshed]);

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => {
        void handleClick();
      }}
      disabled={isRefreshing}
      aria-label="Refresh featured quizzes"
      data-testid="home-featured-rail-refresh"
      className={className}
    >
      <RefreshCw
        className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
        aria-hidden="true"
      />
      <span className="ml-2">{isRefreshing ? "Refreshing…" : "Refresh"}</span>
    </Button>
  );
}
