"use client";

import { useState, useEffect, memo } from "react";
import { Clock, Calendar, Trophy, Flame } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { CardContent } from "@/components/ui/Card";

import { useDailyChallengeToday } from "@/features/daily-challenge/hooks/useDailyChallengeToday";
import { useDailyChallengeStreakView } from "@/features/daily-challenge/hooks/useDailyChallengeStreakView";

/**
 * `<InfoCard />` — daily-challenge page chrome (top-of-page summary).
 *
 * Source epic:   Epic 3.12 — `/daily-challenge` read-only render.
 * Source story:  Story 3.12.
 * Source ticket: TKT-3.12.D1 + Phase 8 (coin economy).
 *
 * Phase 8 change (coin economy design §16):
 *
 *   - The hardcoded "500 Coins" prize label was removed
 *     (see `QUIZ_COIN_ECONOMY_DESIGN.md` line 991 and the deleted
 *     `constants/streak-rewards.ts`). The coin economy now mints
 *     coins via the live `dailyChallengeControllerGetToday`
 *     pipeline, so the prize card now reads `todayRewardXp` from
 *     the same hook the rest of the page uses
 *     (`useDailyChallengeToday`).
 *
 *   - The streak copy used to read "4 Days" hardcoded; it now reads
 *     `currentStreak` from `useDailyChallengeStreakView` (the same
 *     field the `<DailyChallengeCard />` and
 *     `<DailyChallengeHistoryList />` consume).
 *
 *   - The time-remaining and theme cards already were live-derived
 *     in earlier phases; no change.
 *
 * ## Loading state
 *
 * `useDailyChallengeToday().isLoading` is exposed as a Skeleton on
 * the prize card so the outer dimensions match the route-level
 * skeleton in `app/(public)/daily-challenge/loading.tsx` — CLS-zero
 * is preserved.
 *
 * The streak card shows "0 Days" while the user store hydrates (a
 * freshly-registered user genuinely has 0). The time-remaining
 * card is live by construction.
 */
const InfoCard = memo(function InfoCard() {
  const [timeRemaining, setTimeRemaining] = useState<string>("");

  useEffect(() => {
    const updateTimer = () => {
      const now: Date = new Date();
      const endOfDay: Date = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        23,
        59,
        59,
        999,
      );
      const diff: number = endOfDay.getTime() - now.getTime();

      const hours: number = Math.floor(diff / (1000 * 60 * 60));
      const minutes: number = Math.floor(
        (diff % (1000 * 60 * 60)) / (1000 * 60),
      );
      const seconds: number = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeRemaining(
        `${hours.toString().padStart(2, "0")}:${minutes
          .toString()
          .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`,
      );
    };

    updateTimer();
    const interval: NodeJS.Timeout = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, []);

  // ── Live read-side ──────────────────────────────────────────────────
  // The challenge hooks read from the same SWR cache the rest of the
  // page consumes, so the InfoCard renders the same numbers the
  // challenge card and history list do — no duplicate fetch.
  const { challenge, isLoading: isChallengeLoading } =
    useDailyChallengeToday();
  const { streak, isAuthenticated } = useDailyChallengeStreakView();

  // When the today hook is loading or the wrapper reports
  // `missing-endpoint`, fall back to an en-dash so the outer
  // dimensions match the route-level skeleton (CLS-zero invariant).
  const prizeLabel = isChallengeLoading || challenge === null
    ? "—"
    : `+${challenge.rewardXp} XP`;

  const streakLabel = !isAuthenticated || streak === null
    ? "Login to track"
    : `${streak} ${streak === 1 ? "Day" : "Days"}`;

  return (
    <section
      className="grid grid-cols-1 lg:grid-cols-4 gap-4 mt-6 pb-10"
      aria-label="Challenge information"
    >
      <Card className="bg-purple-100 border-purple-200 py-6">
        <CardContent className="p-4 flex items-center space-x-3">
          <div className="p-2 bg-purple-200 rounded-full" aria-hidden="true">
            <Clock className="h-5 w-5 text-purple-700" />
          </div>
          <div>
            <p className="text-sm text-purple-600 font-medium">
              Time Remaining
            </p>
            <p className="text-xl font-bold text-purple-900" aria-live="polite">
              {timeRemaining}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-blue-100 border-blue-200 py-6">
        <CardContent className="p-4 flex items-center space-x-3">
          <div className="p-2 bg-blue-200 rounded-full" aria-hidden="true">
            <Calendar className="h-5 w-5 text-blue-700" />
          </div>
          <div>
            <p className="text-sm text-blue-600 font-medium">
              Today&apos;s Theme
            </p>
            <p className="text-lg font-bold text-blue-900">
              {challenge?.category ?? "—"}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-yellow-100 border-yellow-200 py-6">
        <CardContent className="p-4 flex items-center space-x-3">
          <div className="p-2 bg-yellow-200 rounded-full" aria-hidden="true">
            <Trophy className="h-5 w-5 text-yellow-700" />
          </div>
          <div>
            <p className="text-sm text-yellow-600 font-medium">Top Prize</p>
            <p className="text-xl font-bold text-yellow-900">{prizeLabel}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-red-50 border-red-200 py-6">
        <CardContent className="p-4 flex items-center space-x-3">
          <div className="p-2 bg-red-100 rounded-full" aria-hidden="true">
            <Flame className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <p className="text-sm text-red-600 font-medium">Your Streak</p>
            <p className="text-xl font-bold text-red-900">{streakLabel}</p>
          </div>
        </CardContent>
      </Card>
    </section>
  );
});

export default InfoCard;
