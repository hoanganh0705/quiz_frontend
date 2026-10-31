"use client";

/**
 * `<PlayerRanking />` — top-players carousel on the home page.
 *
 * Source epic:   Phase 1 (F-07) — home page quick-win.
 * Source ticket: F-07.
 *
 * Replaces the historic hardcoded `players` constant (F-24) with a
 * live `useLeaderboard('all-time')` cursor. The carousel preserves
 * the previous Swiper aesthetic (5 cards desktop / 1 mobile), the
 * "Top Players" badge, and the "View Full Leaderboard" CTA.
 *
 * ## Loading / empty / error states
 *
 * While the SWR fetch is in flight, the carousel renders a
 * skeleton-grid of 5 placeholder cards (matches the desktop
 * breakpoint). On a non-empty server response, the cards render
 * with data from the `LeaderboardEntryDto` shape projected by the
 * hook (the `userId` is aliased as `id` by the hook itself).
 *
 * On an empty server array, the carousel renders an explicit
 * "No players ranked yet" empty state — never an error.
 *
 * On a 5xx error, the entire carousel is replaced by the
 * `LeaderboardErrorState` (a single, low-prominence error card).
 * The error is otherwise surfaced through `result.error` for
 * downstream consumers that want to log it.
 *
 * ## Period choice
 *
 * The "all_time" period is the documented default for the top-
 * players carousel (Story 3.11 line 1161, period selector defaults
 * to `"all_time"`). The home page does not surface a period
 * switcher — for any non-default period, the user navigates to
 * `/leaderboard`.
 */
import { ChevronLeft, ChevronRight, Swords } from "lucide-react";
import { useRef } from "react";
import { Button } from "@/components/ui/Button";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";
import type { Swiper as SwiperType } from "swiper";
import { PlayerCard } from "@/features/leaderboard/components/PlayerCard";
import { useLeaderboard } from "@/features/leaderboard/hooks/useLeaderboard";
import type { Player } from "@/features/users/types";

const SKELETON_COUNT = 5;

/**
 * Project a `LeaderboardEntryDto` (the wire shape) into the slice of
 * the `Player` projection that `<PlayerCard />` consumes.
 *
 * Phase 6 (W-17): the projection was previously defensive — it
 * surfaced `country`, `flag`, `streak`, `level`, `quizzes`,
 * `qpsCreated`, `wins`, `bgImageUrl`, `bio` as `undefined` so the
 * card could render `N/A` placeholders. The trimmed projection
 * only carries the fields the wire actually fills.
 */
function projectEntryToPlayer(entry: {
  userId: string;
  rank: number;
  displayName: string;
  avatarUrl?: string | null;
  xp: number;
}): Player {
  return {
    id: entry.userId,
    rank: entry.rank,
    name: entry.displayName,
    avatarUrl: entry.avatarUrl ?? undefined,
    score: entry.xp,
  };
}

const PlayerRanking = () => {
  const swiperRef = useRef<SwiperType | null>(null);
  const { entries, isLoading, error } = useLeaderboard("all_time");

  // Map entries once. The hook already aliases `id` from `userId`.
  const players: Player[] = entries.map((entry) =>
    projectEntryToPlayer({
      userId: entry.userId,
      rank: entry.rank,
      displayName: entry.displayName,
      avatarUrl: entry.avatarUrl,
      xp: entry.xp,
    }),
  );

  const showEmptyState = !isLoading && !error && players.length === 0;
  const showSkeleton = isLoading && players.length === 0;

  return (
    <div
      className="bg-gradient-to-b from-card/90 to-card/50 border border-border/70 p-4 sm:p-6 text-foreground rounded-2xl shadow-xs backdrop-blur-sm"
      aria-busy={isLoading}
    >
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <Swords className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Top Players
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Global champions dominating the all-time leaderboard
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            size="icon"
            variant="outline"
            className="h-9 w-9 rounded-full border-border/80 bg-background/80 hover:bg-main-hover transition-all"
            aria-label="Previous player"
            onClick={() => swiperRef.current?.slidePrev()}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            className="h-9 w-9 rounded-full border-border/80 bg-background/80 hover:bg-main-hover transition-all"
            aria-label="Next player"
            onClick={() => swiperRef.current?.slideNext()}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="w-full">
        {error && !isLoading ? (
          <div
            className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center"
            role="status"
          >
            <p className="text-sm text-foreground/80">
              Couldn&apos;t load the leaderboard. Please try again later.
            </p>
          </div>
        ) : showEmptyState ? (
          <div
            className="rounded-lg border border-border bg-background p-6 text-center"
            role="status"
          >
            <p className="text-sm text-foreground-secondary">No players ranked yet.</p>
          </div>
        ) : (
          <Swiper
            onBeforeInit={(swiper) => {
              swiperRef.current = swiper;
            }}
            pagination={{ clickable: true }}
            modules={[Autoplay]}
            autoplay={{
              delay: 3000,
              disableOnInteraction: true,
            }}
            breakpoints={{
              0: { slidesPerView: 1, spaceBetween: 10 },
              640: { slidesPerView: 2, spaceBetween: 15 },
              768: { slidesPerView: 3, spaceBetween: 20 },
              1024: { slidesPerView: 4, spaceBetween: 25 },
              1280: { slidesPerView: 5, spaceBetween: 30 },
            }}
          >
            {showSkeleton
              ? Array.from({ length: SKELETON_COUNT }, (_, i) => (
                  <SwiperSlide key={`skeleton-${i}`} className="w-full">
                    <div
                      className="h-72 rounded-lg border border-border bg-muted/30 animate-pulse"
                      aria-hidden="true"
                    />
                  </SwiperSlide>
                ))
              : players.map((player) => (
                  <SwiperSlide key={player.id} className="w-full">
                    <PlayerCard {...player} />
                  </SwiperSlide>
                ))}
          </Swiper>
        )}
      </div>

      <div className="mt-8 flex justify-center">
        <Button className="rounded-md bg-primary hover:bg-primary/90 text-primary-foreground">
          View Full Leaderboard
        </Button>
      </div>
    </div>
  );
};

export default PlayerRanking;
