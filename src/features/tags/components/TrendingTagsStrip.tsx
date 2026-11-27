"use client";

import { TrendingUp } from "lucide-react";

import { useTagsTrending } from "@/features/tags/hooks/useTagsTrending";
import { TAG_KEYS } from "@/features/tags/query-keys";

import { RankedTagRail } from "./RankedTagRail";

const QUERY_KEY = TAG_KEYS.trending({ limit: 10 });

export function TrendingTagsStrip(): React.ReactElement | null {
  const { tags, isLoading, error } = useTagsTrending({ limit: 10 });

  return (
    <RankedTagRail
      title="Trending now"
      ariaLabel="Trending tags"
      icon={TrendingUp}
      tags={tags}
      isLoading={isLoading}
      error={error}
      errorCopy="Couldn't load trending tags."
      queryKey={QUERY_KEY}
      testIdPrefix="trending-tags-strip"
    />
  );
}
