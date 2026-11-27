"use client";

import { Flame } from "lucide-react";

import { useTagsPopular } from "@/features/tags/hooks/useTagsPopular";
import { TAG_KEYS } from "@/features/tags/query-keys";

import { RankedTagRail } from "./RankedTagRail";

const QUERY_KEY = TAG_KEYS.popular({ limit: 10 });

export function PopularTagsStrip(): React.ReactElement | null {
  const { tags, isLoading, error } = useTagsPopular({ limit: 10 });

  return (
    <RankedTagRail
      title="Popular now"
      ariaLabel="Popular tags"
      icon={Flame}
      tags={tags}
      isLoading={isLoading}
      error={error}
      errorCopy="Couldn't load popular tags."
      queryKey={QUERY_KEY}
      testIdPrefix="popular-tags-strip"
    />
  );
}
