"use client";

import { useCallback, useState } from "react";
import { mutate } from "swr";
import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/Button";
import {
  refreshHomeBundle,
  type FeaturedRefreshHandle,
} from "./refresh-home-bundle";

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
      await mutate(["home", "bundle"], data, { revalidate: false });
      onRefreshed?.(data);
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