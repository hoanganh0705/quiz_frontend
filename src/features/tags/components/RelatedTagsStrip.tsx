"use client";

import { useId } from "react";

import { RotateCcw } from "lucide-react";

import { getQueryClient } from "@/providers/QueryProvider";

import { useTagRelated } from "@/features/tags/hooks/useTagRelated";
import { TAG_KEYS } from "@/features/tags/query-keys";

import { TagPill } from "@/components/primitives/TagPill/TagPill";
import { TagPillSkeleton } from "@/components/primitives/TagPill/TagPillSkeleton";
import { Button } from "@/components/ui/Button";

const STRIP_CONTAINER =
  "-mx-1 flex gap-2.5 overflow-x-auto px-1 py-1.5 snap-x snap-proximity scroll-mt-16 scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden";

export interface RelatedTagsStripProps {
  slug: string;
}

export function RelatedTagsStrip({
  slug,
}: RelatedTagsStripProps): React.ReactElement | null {
  const headingId = useId();
  const { tags, isLoading, error } = useTagRelated(slug, { limit: 10 });
  const queryKey = TAG_KEYS.related(slug, { limit: 10 });

  if (isLoading) {
    return (
      <section
        className="mt-12 pt-6 border-t border-border/60 space-y-2"
        aria-label="Related tags"
        aria-busy="true"
        data-testid="related-tags-strip-loading"
      >
        <h2
          id={headingId}
          className="text-base font-semibold tracking-tight text-foreground"
        >
          Related tags
        </h2>
        <div className={STRIP_CONTAINER}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="shrink-0 snap-start"
              data-testid="related-tags-strip-skeleton"
            >
              <TagPillSkeleton />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section
        className="mt-12 pt-6 border-t border-border/60 space-y-2"
        aria-labelledby={headingId}
        data-testid="related-tags-strip-error"
      >
        <div className="flex items-center justify-between gap-2">
          <h2
            id={headingId}
            className="text-base font-semibold tracking-tight text-foreground"
          >
            Related tags
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              void getQueryClient().invalidateQueries({ queryKey })
            }
            data-testid="related-tags-strip-retry"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Retry
          </Button>
        </div>
        <p className="text-sm text-muted-foreground" role="status">
          Couldn&apos;t load related tags.
        </p>
      </section>
    );
  }

  if (tags.length === 0) {
    return null;
  }

  return (
    <section
      className="mt-12 pt-6 border-t border-border/60 space-y-2"
      aria-labelledby={headingId}
      data-testid="related-tags-strip"
    >
      <h2
        id={headingId}
        className="text-base font-semibold tracking-tight text-foreground"
      >
        Related tags
      </h2>
      <div className={STRIP_CONTAINER}>
        {tags.map((tag) => (
          <div key={tag.tagId} className="shrink-0 snap-start">
            <TagPill tag={tag} variant="clickable" />
          </div>
        ))}
      </div>
    </section>
  );
}
