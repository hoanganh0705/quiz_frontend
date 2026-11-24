"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { cn } from "@/shared/utils/merge-class-names";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Trophy } from "lucide-react";

import { useLeaderboard, useTopMovers } from "@/features/leaderboard/hooks";
import type { LeaderboardPeriod } from "@/features/leaderboard/services/leaderboard.service";
import type { LeaderboardEntryDto } from "@/lib/api/generated/schemas";
import type { TopMoverDto } from "@/lib/api/generated/schemas";

import GlobalTab from "./GlobalTab";
import CategoryTab from "./CategoryTab";
import TrendingTab from "./TrendingTab";

const TIME_PERIODS: ReadonlyArray<{
  value: LeaderboardPeriod;
  label: string;
  disabled: boolean;
}> = [
  { value: "all_time", label: "All Time", disabled: false },
  { value: "monthly", label: "Monthly", disabled: false },
  { value: "weekly", label: "Weekly", disabled: false },
];

function toTopMoversPeriod(period: LeaderboardPeriod): "weekly" | "monthly" {
  if (period === "all_time") return "monthly";
  return period;
}

type ActiveTab = "global" | "category" | "trending";

/**
 * `LeaderboardHighlights` — top-level leaderboard preview on the home page.
 *
 * The per-category tab now includes a visible,
 * **disabled** category `<Select>` wrapped in a `<Tooltip>` with the
 * message "Per-category leaderboard is on the roadmap". This makes
 * the roadmap intent explicit to users rather than silently functional.
 */
const HIGHLIGHT_TABS = [
  { value: "global", label: "Global" },
  { value: "category", label: "By Category" },
  { value: "trending", label: "Trending" },
] as const;

export function LeaderboardHighlights() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("global");
  const [timePeriod, setTimePeriod] = useState<LeaderboardPeriod>("weekly");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        const nextIndex = (index + 1) % HIGHLIGHT_TABS.length;
        setActiveTab(HIGHLIGHT_TABS[nextIndex].value);
        tabRefs.current[nextIndex]?.focus();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        const prevIndex =
          (index - 1 + HIGHLIGHT_TABS.length) % HIGHLIGHT_TABS.length;
        setActiveTab(HIGHLIGHT_TABS[prevIndex].value);
        tabRefs.current[prevIndex]?.focus();
      } else if (e.key === "Home") {
        e.preventDefault();
        setActiveTab(HIGHLIGHT_TABS[0].value);
        tabRefs.current[0]?.focus();
      } else if (e.key === "End") {
        e.preventDefault();
        setActiveTab(HIGHLIGHT_TABS[HIGHLIGHT_TABS.length - 1].value);
        tabRefs.current[HIGHLIGHT_TABS.length - 1]?.focus();
      }
    },
    [],
  );

  const { entries: topEntries, isLoading: isLeaderboardLoading } =
    useLeaderboard(timePeriod);

  const topFive: readonly LeaderboardEntryDto[] = useMemo(
    () => topEntries.slice(0, 5),
    [topEntries],
  );

  const { movers, isLoading: isMoversLoading } = useTopMovers(
    toTopMoversPeriod(timePeriod),
  );

  const topMovers: readonly TopMoverDto[] = useMemo(
    () => movers.slice(0, 10),
    [movers],
  );

  const isLoading = isLeaderboardLoading || isMoversLoading;

  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value as ActiveTab);
  }, []);

  const handleTimePeriodChange = useCallback((value: LeaderboardPeriod) => {
    setTimePeriod(value);
  }, []);

  const handleCategoryChange = useCallback((value: string) => {
    setSelectedCategory(value);
  }, []);

  return (
    <Card className="bg-card/80 border-border/70 col-span-1 lg:col-span-2 p-5 sm:p-6 rounded-2xl shadow-xs backdrop-blur-xs flex flex-col justify-between">
      <CardHeader className="p-0 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-foreground text-lg sm:text-xl font-bold">
              <h2 className="flex items-center gap-2">
                <Trophy
                  className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500"
                  aria-hidden="true"
                />
                Leaderboard Highlights
              </h2>
            </CardTitle>
            <CardDescription className="text-muted-foreground text-sm">
              Top performers across different categories and time periods
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0 pt-2 space-y-5">
        {/* Tab strip */}
        <div
          className="inline-flex items-center rounded-xl bg-muted/60 p-1 border border-border/60 backdrop-blur-xs w-full max-w-sm"
          role="tablist"
          aria-label="Leaderboard views"
        >
          {HIGHLIGHT_TABS.map(({ value, label }, index) => (
            <button
              key={value}
              ref={(el) => {
                tabRefs.current[index] = el;
              }}
              type="button"
              role="tab"
              id={`highlights-tab-${value}`}
              aria-selected={activeTab === value}
              aria-controls={`highlights-panel-${value}`}
              tabIndex={activeTab === value ? 0 : -1}
              onClick={() => handleTabChange(value)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className={cn(
                "flex-1 text-xs sm:text-sm font-medium rounded-lg px-3 py-1.5 transition-all duration-150 text-center",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                activeTab === value
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Time-period filters */}
        <div
          className="flex flex-wrap gap-2"
          role="toolbar"
          aria-label="Time period filters"
        >
          {TIME_PERIODS.map(({ value, label, disabled }) => (
            <Button
              key={value}
              variant="ghost"
              size="sm"
              disabled={disabled}
              aria-pressed={timePeriod === value}
              onClick={() => handleTimePeriodChange(value)}
              className={cn(
                "text-xs sm:text-sm rounded-lg px-3 py-1.5 transition-all font-medium border",
                timePeriod === value
                  ? "bg-primary/20 text-primary border-primary/40 shadow-xs font-semibold"
                  : "border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/50",
              )}
            >
              {label}
            </Button>
          ))}
        </div>

        {/* Category filter — disabled with roadmap tooltip (F-9) */}
        {activeTab === "category" && (
          <div
            className="flex flex-col gap-1"
            aria-label="Category filter (placeholder)"
          >
            {/*
             * sr-only description: accessible tooltip for the disabled Select.
             * The text is visually hidden but announced by screen readers via
             * aria-describedby on the trigger. This is the same pattern used
             * by BookmarkButton for sign-in prompts.
             */}
            <span
              id="category-select-tooltip"
              className="sr-only"
              data-testid="category-select-tooltip"
            >
              Per-category leaderboard is on the roadmap
            </span>
            <Select
              value={selectedCategory}
              onValueChange={handleCategoryChange}
              disabled
            >
              <SelectTrigger
                aria-label="Category"
                aria-describedby="category-select-tooltip"
                className="w-full max-w-xs"
                data-testid="category-select"
              >
                <SelectValue placeholder="All categories (coming soon)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  All categories (coming soon)
                </SelectItem>
                <SelectItem value="coding">Coding</SelectItem>
                <SelectItem value="design">Design</SelectItem>
                <SelectItem value="marketing">Marketing</SelectItem>
                <SelectItem value="science">Science</SelectItem>
                <SelectItem value="history">History</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-foreground-secondary">
              The leaderboard API does not slice per category yet. The top-3
              below are the global podium — a per-category filter is on the
              roadmap.
            </p>
          </div>
        )}

        {/* Tab content panels */}
        <div
          role="tabpanel"
          id={`highlights-panel-${activeTab}`}
          aria-labelledby={`highlights-tab-${activeTab}`}
          tabIndex={0}
          className="focus:outline-none"
        >
          {activeTab === "global" && (
            <GlobalTab users={topFive} isLoading={isLoading} />
          )}
          {activeTab === "category" && (
            <CategoryTab
              users={topFive}
              isLoading={isLoading}
              category={selectedCategory}
            />
          )}
          {activeTab === "trending" && (
            <TrendingTab users={topMovers} isLoading={isLoading} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
