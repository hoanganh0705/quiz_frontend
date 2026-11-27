"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";

import { getQueryClient } from "@/providers/QueryProvider";

import { TagPill } from "@/components/primitives/TagPill/TagPill";
import { TagPillSkeleton } from "@/components/primitives/TagPill/TagPillSkeleton";
import { Button } from "@/components/ui/Button";

import { cn } from "@/shared/utils/merge-class-names";

import type { ApiError } from "@/lib/api";
import type { RankedTagResponseDto } from "@/lib/api/generated/schemas";
import type { LucideIcon } from "lucide-react";

const SKELETON_WIDTHS = [
  "w-28",
  "w-32",
  "w-24",
  "w-36",
  "w-28",
  "w-32",
] as const;

const RAIL_SCROLLER =
  "-mx-1 flex gap-2.5 overflow-x-auto px-1 py-1.5 snap-x snap-proximity scroll-mt-16 scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden";

function formatPlayCount(raw: string): string | undefined {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }
  if (parsed >= 1_000) {
    const rounded =
      parsed >= 10_000
        ? Math.round(parsed / 1_000)
        : Math.round((parsed / 1_000) * 10) / 10;
    const formatted =
      rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1);
    return `${formatted}k plays`;
  }
  const whole = Math.trunc(parsed);
  return `${whole} ${whole === 1 ? "play" : "plays"}`;
}

export interface RankedTagRailProps {
  title: string;
  ariaLabel: string;
  icon: LucideIcon;
  tags: readonly RankedTagResponseDto[];
  isLoading: boolean;
  error: ApiError | null;
  errorCopy: string;
  queryKey: readonly unknown[];
  testIdPrefix: "popular-tags-strip" | "trending-tags-strip";
  className?: string;
}

export function RankedTagRail({
  title,
  ariaLabel,
  icon: Icon,
  tags,
  isLoading,
  error,
  errorCopy,
  queryKey,
  testIdPrefix,
  className,
}: RankedTagRailProps): React.ReactElement | null {
  const headingId = useId();
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollEdges = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const maxScrollLeft = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(maxScrollLeft - el.scrollLeft > 4);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    updateScrollEdges();

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(() => {
        updateScrollEdges();
      });
      observer.observe(el);
      return () => {
        observer.disconnect();
      };
    }

    if (typeof window !== "undefined") {
      window.addEventListener("resize", updateScrollEdges);
      return () => {
        window.removeEventListener("resize", updateScrollEdges);
      };
    }
    return undefined;
  }, [tags.length, isLoading, updateScrollEdges]);

  const scrollByDirection = useCallback((direction: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const step = Math.max(180, Math.round(el.clientWidth * 0.72));
    const reducedMotion =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({
      left: direction * step,
      behavior: reducedMotion ? "auto" : "smooth",
    });
  }, []);

  const maskClass =
    canScrollLeft && canScrollRight
      ? "[mask-image:linear-gradient(to_right,transparent,black_24px,black_calc(100%-24px),transparent)]"
      : canScrollLeft
        ? "[mask-image:linear-gradient(to_right,transparent,black_24px,black)]"
        : canScrollRight
          ? "[mask-image:linear-gradient(to_right,black,black_calc(100%-24px),transparent)]"
          : "";

  if (isLoading) {
    return (
      <section
        className={cn("space-y-1.5", className)}
        aria-label={ariaLabel}
        aria-busy="true"
        data-testid={`${testIdPrefix}-loading`}
      >
        <div className="flex min-h-8 items-center gap-2">
          <Icon className="h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
          <h2
            id={headingId}
            className="text-base font-semibold tracking-tight text-foreground"
          >
            {title}
          </h2>
        </div>
        <div className={RAIL_SCROLLER}>
          {SKELETON_WIDTHS.map((widthClass, i) => (
            <div
              key={i}
              className="shrink-0 snap-start"
              data-testid={`${testIdPrefix}-skeleton`}
            >
              <TagPillSkeleton className={widthClass} />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section
        className={cn(
          "flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/70 bg-muted/40 px-4 py-2.5",
          className,
        )}
        aria-labelledby={headingId}
        data-testid={`${testIdPrefix}-error`}
      >
        <div className="flex min-w-0 items-center gap-2">
          <Icon
            className="h-4 w-4 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
          <h2
            id={headingId}
            className="text-base font-semibold tracking-tight text-foreground"
          >
            {title}
          </h2>
          <span className="text-sm text-muted-foreground" role="status">
            — {errorCopy}
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="min-h-9 sm:min-h-8"
          onClick={() => void getQueryClient().invalidateQueries({ queryKey })}
          data-testid={`${testIdPrefix}-retry`}
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          Retry
        </Button>
      </section>
    );
  }

  if (tags.length === 0) {
    return null;
  }

  const hasOverflowControls = canScrollLeft || canScrollRight;

  return (
    <section
      className={cn("space-y-1.5", className)}
      aria-labelledby={headingId}
      data-testid={testIdPrefix}
    >
      <div className="flex min-h-8 items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
          <h2
            id={headingId}
            className="text-base font-semibold tracking-tight text-foreground"
          >
            {title}
          </h2>
        </div>

        {hasOverflowControls ? (
          <div
            role="group"
            aria-label={`${ariaLabel} scroll controls`}
            className="hidden md:flex items-center gap-1.5"
          >
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 rounded-full border border-border/60 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-35"
              disabled={!canScrollLeft}
              onClick={() => scrollByDirection(-1)}
              aria-label={`Scroll ${ariaLabel.toLowerCase()} left`}
              data-testid={`${testIdPrefix}-scroll-left`}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 rounded-full border border-border/60 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-35"
              disabled={!canScrollRight}
              onClick={() => scrollByDirection(1)}
              aria-label={`Scroll ${ariaLabel.toLowerCase()} right`}
              data-testid={`${testIdPrefix}-scroll-right`}
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        ) : null}
      </div>

      <div
        ref={scrollerRef}
        onScroll={updateScrollEdges}
        className={cn(RAIL_SCROLLER, maskClass)}
      >
        {tags.map((tag) => (
          <div key={tag.tagId} className="shrink-0 snap-start">
            <TagPill
              tag={tag}
              rank={tag.rank}
              countLabel={formatPlayCount(tag.totalAttempts)}
              variant="clickable"
            />
          </div>
        ))}
      </div>
    </section>
  );
}
