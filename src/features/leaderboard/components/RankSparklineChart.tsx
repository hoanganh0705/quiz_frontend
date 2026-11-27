"use client";

import { memo, useId, useMemo } from "react";

import { cn } from "@/shared/utils/merge-class-names";

import type { RankingHistoryPoint } from "@/features/leaderboard/hooks/useMyRankInsights";

export interface RankSparklineChartProps {
  readonly points: readonly RankingHistoryPoint[];
  readonly className?: string;
  readonly ariaLabel?: string;
}

const VIEWBOX_WIDTH = 320;
const VIEWBOX_HEIGHT = 104;
const PAD_X = 12;
const PAD_TOP = 14;
const PAD_BOTTOM = 16;

function formatShortDate(raw: string): string {
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export const RankSparklineChart = memo(function RankSparklineChart({
  points,
  className,
  ariaLabel = "Historical rank progression",
}: RankSparklineChartProps) {
  const gradientId = useId();

  const sorted = useMemo(() => {
    return [...points].sort((a, b) => a.date.localeCompare(b.date));
  }, [points]);

  const geometry = useMemo(() => {
    if (sorted.length === 0) return null;

    const ranks = sorted.map((p) => p.rank);
    const bestRank = Math.min(...ranks);
    const worstRank = Math.max(...ranks);
    const span = Math.max(1, worstRank - bestRank);

    const innerW = VIEWBOX_WIDTH - PAD_X * 2;
    const innerH = VIEWBOX_HEIGHT - PAD_TOP - PAD_BOTTOM;

    const coords = sorted.map((point, index) => {
      const x =
        sorted.length === 1
          ? VIEWBOX_WIDTH / 2
          : PAD_X + (index / (sorted.length - 1)) * innerW;
      const normalized =
        worstRank === bestRank ? 0.35 : (point.rank - bestRank) / span;
      const y = PAD_TOP + normalized * innerH;
      return { x, y, rank: point.rank, date: point.date };
    });

    const linePath = coords
      .map(
        (c, idx) => `${idx === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`,
      )
      .join(" ");

    const first = coords[0]!;
    const last = coords[coords.length - 1]!;
    const areaPath =
      coords.length > 1
        ? `${linePath} L ${last.x.toFixed(1)} ${(VIEWBOX_HEIGHT - PAD_BOTTOM).toFixed(1)} L ${first.x.toFixed(1)} ${(VIEWBOX_HEIGHT - PAD_BOTTOM).toFixed(1)} Z`
        : "";

    return {
      coords,
      linePath,
      areaPath,
      bestRank,
      worstRank,
      first,
      last,
    };
  }, [sorted]);

  if (!geometry) {
    return (
      <div
        className={cn(
          "rounded-lg border border-border/60 bg-muted/25 px-3.5 py-6 text-center",
          className,
        )}
      >
        <p className="text-xs font-medium text-foreground">
          No daily snapshots recorded yet
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Complete ranked quizzes across multiple days to chart rank trajectory.
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-lg border border-border/60 bg-muted/20 p-3 space-y-2",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="text-muted-foreground">
          Peak{" "}
          <strong className="font-mono font-semibold tabular-nums text-foreground">
            #{geometry.bestRank}
          </strong>
        </span>
        <span className="text-muted-foreground">
          Latest{" "}
          <strong className="font-mono font-semibold tabular-nums text-brand">
            #{geometry.last.rank}
          </strong>
        </span>
      </div>

      <svg
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
        role="img"
        aria-label={`${ariaLabel}: best rank #${geometry.bestRank}, latest rank #${geometry.last.rank}`}
        className="h-24 w-full overflow-visible"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor="var(--color-brand, currentColor)"
              stopOpacity="0.22"
            />
            <stop
              offset="100%"
              stopColor="var(--color-brand, currentColor)"
              stopOpacity="0.0"
            />
          </linearGradient>
        </defs>

        <line
          x1={PAD_X}
          y1={PAD_TOP}
          x2={VIEWBOX_WIDTH - PAD_X}
          y2={PAD_TOP}
          className="stroke-border/60"
          strokeDasharray="3 3"
          strokeWidth="1"
        />
        <line
          x1={PAD_X}
          y1={(PAD_TOP + VIEWBOX_HEIGHT - PAD_BOTTOM) / 2}
          x2={VIEWBOX_WIDTH - PAD_X}
          y2={(PAD_TOP + VIEWBOX_HEIGHT - PAD_BOTTOM) / 2}
          className="stroke-border/40"
          strokeDasharray="3 3"
          strokeWidth="1"
        />
        <line
          x1={PAD_X}
          y1={VIEWBOX_HEIGHT - PAD_BOTTOM}
          x2={VIEWBOX_WIDTH - PAD_X}
          y2={VIEWBOX_HEIGHT - PAD_BOTTOM}
          className="stroke-border/60"
          strokeWidth="1"
        />

        {geometry.areaPath ? (
          <path d={geometry.areaPath} fill={`url(#${gradientId})`} />
        ) : null}

        {geometry.coords.length > 1 ? (
          <path
            d={geometry.linePath}
            fill="none"
            className="stroke-brand"
            strokeWidth="2.25"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}

        {geometry.coords.map((pt, idx) => {
          const isLast = idx === geometry.coords.length - 1;
          const isBest = pt.rank === geometry.bestRank;
          if (!isLast && !isBest && geometry.coords.length > 8) return null;
          return (
            <circle
              key={`${pt.date}-${idx}`}
              cx={pt.x}
              cy={pt.y}
              r={isLast ? 4 : 2.75}
              className={cn(
                isLast
                  ? "fill-brand stroke-background"
                  : "fill-background stroke-brand",
              )}
              strokeWidth="1.75"
            />
          );
        })}
      </svg>

      <div className="flex items-center justify-between font-mono text-xs tabular-nums text-muted-foreground">
        <span>{formatShortDate(geometry.first.date)}</span>
        <span>
          {sorted.length} {sorted.length === 1 ? "snapshot" : "snapshots"}
        </span>
        <span>{formatShortDate(geometry.last.date)}</span>
      </div>
    </div>
  );
});
