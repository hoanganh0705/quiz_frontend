"use client";

/**
 * `<PlayerRanking />` — top-players carousel on the home page.
 *
 * Uses a live `useLeaderboard('all-time')` query. The carousel preserves
 * the Swiper aesthetic (5 cards desktop / 1 mobile), the
 * "Top Players" badge, and the "View Full Leaderboard" CTA.
 */
import { ChevronLeft, ChevronRight, Pause, Play, Swords } from "lucide-react";
import { useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";
import type { Swiper as SwiperType } from "swiper";
import { PlayerCard } from "@/features/leaderboard/components/PlayerCard";
import { useLeaderboard } from "@/features/leaderboard/hooks/useLeaderboard";
import type { LeaderboardEntryDto } from "@/lib/api/generated/schemas";
import type { Player } from "@/features/users/types";

export interface PlayerRankingProps {
  initialPlayers?: readonly LeaderboardEntryDto[];
}

const SKELETON_COUNT = 5;

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

const PlayerRanking = ({ initialPlayers }: PlayerRankingProps) => {
  const swiperRef = useRef<SwiperType | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isBeginning, setIsBeginning] = useState(true);
  const [isEnd, setIsEnd] = useState(false);
  const hasSsrPlayers = Boolean(initialPlayers && initialPlayers.length > 0);
  const { entries, isLoading, error } = useLeaderboard("all_time", {
    enabled: !hasSsrPlayers,
  });

  const activeEntries = hasSsrPlayers ? (initialPlayers ?? []) : entries;
  const players: Player[] = activeEntries.map((entry) =>
    projectEntryToPlayer({
      userId: entry.userId,
      rank: Number(entry.rank),
      displayName: entry.displayName,
      avatarUrl: entry.avatarUrl,
      xp: Number(entry.xp),
    }),
  );

  const showEmptyState = !isLoading && !error && players.length === 0;
  const showSkeleton = isLoading && players.length === 0;

  const handleTogglePlay = () => {
    if (!swiperRef.current) return;
    if (isPlaying) {
      swiperRef.current.autoplay?.stop();
      setIsPlaying(false);
    } else {
      swiperRef.current.autoplay?.start();
      setIsPlaying(true);
    }
  };

  return (
    <section
      className="bg-linear-to-b from-card/90 to-card/50 border border-border/70 p-4 sm:p-6 text-foreground rounded-2xl shadow-xs backdrop-blur-sm"
      aria-busy={isLoading}
      role="region"
      aria-roledescription="carousel"
      aria-label="Top players leaderboard"
    >
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <Swords className="h-5 w-5" aria-hidden="true" />
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
            className="h-9 w-9 sm:h-10 sm:w-10 rounded-full border-border/80 bg-background/80 hover:bg-main-hover transition-all cursor-pointer"
            onClick={handleTogglePlay}
            aria-label={
              isPlaying
                ? "Pause top players carousel auto-play"
                : "Resume top players carousel auto-play"
            }
          >
            {isPlaying ? (
              <Pause className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Play className="h-4 w-4" aria-hidden="true" />
            )}
          </Button>
          <Button
            size="icon"
            variant="outline"
            className="h-9 w-9 sm:h-10 sm:w-10 rounded-full border-border/80 bg-background/80 hover:bg-main-hover transition-all cursor-pointer"
            aria-label="Previous player"
            disabled={isBeginning}
            onClick={() => swiperRef.current?.slidePrev()}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            className="h-9 w-9 sm:h-10 sm:w-10 rounded-full border-border/80 bg-background/80 hover:bg-main-hover transition-all cursor-pointer"
            aria-label="Next player"
            disabled={isEnd}
            onClick={() => swiperRef.current?.slideNext()}
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
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
            <p className="text-sm text-foreground-secondary">
              No players ranked yet.
            </p>
          </div>
        ) : (
          <Swiper
            onBeforeInit={(swiper) => {
              swiperRef.current = swiper;
            }}
            onInit={(swiper) => {
              setIsBeginning(swiper.isBeginning);
              setIsEnd(swiper.isEnd);
            }}
            onSlideChange={(swiper) => {
              setIsBeginning(swiper.isBeginning);
              setIsEnd(swiper.isEnd);
            }}
            modules={[Autoplay]}
            autoplay={{
              delay: 4500,
              disableOnInteraction: false,
              pauseOnMouseEnter: true,
            }}
            breakpoints={{
              0: { slidesPerView: 1.15, spaceBetween: 12 },
              640: { slidesPerView: 2.1, spaceBetween: 16 },
              768: { slidesPerView: 3.1, spaceBetween: 20 },
              1024: { slidesPerView: 4, spaceBetween: 24 },
              1280: { slidesPerView: 5, spaceBetween: 24 },
            }}
          >
            {showSkeleton
              ? Array.from({ length: SKELETON_COUNT }, (_, i) => (
                  <SwiperSlide key={`skeleton-${i}`} className="w-full">
                    <div
                      className="h-64 rounded-xl border border-border bg-muted/30 animate-pulse"
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
        <Button
          asChild
          className="rounded-full px-6 bg-brand hover:bg-brand-hover text-brand-foreground font-semibold shadow-xs transition-all hover:shadow-brand/20 cursor-pointer"
        >
          <Link href="/rankings">View Full Leaderboard</Link>
        </Button>
      </div>
    </section>
  );
};

export default PlayerRanking;
