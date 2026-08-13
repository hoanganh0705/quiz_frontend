import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/Avatar";
import { CardContent } from "@/components/ui/Card";
import { Users } from "lucide-react";
import { cn } from "@/shared/utils/merge-class-names";
import type { Player } from "@/features/users/types";

/**
 * `PlayerCard` — top-players carousel card.
 *
 * Source epic:   Phase 1 (F-07) — home page quick-win.
 * Source ticket: F-07.
 *
 * Phase 6 (W-17): removed the `bgImageUrl`, `flag`, `country`, and
 * `wins` consumers. None of those fields were ever populated by the
 * backend; the card rendered placeholder `N/A` copy for each. The
 * remaining fields are the live `LeaderboardEntryDto` projection
 * plus the optional gamification fields the leaderboard UI does
 * actually render.
 */
export function PlayerCard({
  name,
  rank,
  earned,
  followers,
  following,
  levelString,
  avatarUrl,
}: Player) {
  const levelColorClass: Record<string, string> = {
    Advanced: "bg-pink-500",
    Grandmaster: "bg-purple-500",
    Master: "bg-red-500",
    default: "bg-gray-500",
  };

  return (
    <div className="relative overflow-hidden rounded-lg bg-main border border-border text-foreground shadow-lg h-full">
      <div className="relative h-32 w-full bg-linear-to-br from-muted/40 to-muted/10">
        {levelString && (
          <div
            className={cn(
              "absolute right-3 top-3 rounded-full px-3 py-1 text-xs font-semibold",
              levelColorClass[levelString] || levelColorClass.default,
            )}
          >
            {levelString}
          </div>
        )}
      </div>

      <div className="relative -mt-12 flex flex-col items-center px-4 pb-4">
        <Avatar className="h-20 w-20 border-4 border-[#2a2a4a] bg-gray-700">
          <AvatarImage src={avatarUrl || "/placeholder.svg"} alt={name} />
          <AvatarFallback>
            {name
              .split(" ")
              .map((n) => n[0])
              .join("")}
          </AvatarFallback>
        </Avatar>

        <h3 className="mt-2 text-lg font-semibold">{name}</h3>

        <CardContent className="mt-4 grid w-full grid-cols-3 gap-2 p-0 text-center">
          <div className="flex flex-col items-center">
            <span className="text-base font-bold">{rank}</span>
            <span className="text-xs text-gray-400">Rank</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-base font-bold">
              {earned !== undefined ? (
                `$${earned.toLocaleString(undefined, {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 2,
                })}`
              ) : (
                <MissingField />
              )}
            </span>
            <span className="text-xs text-gray-400">Earned</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-base font-bold text-green-400">
              <MissingField />
            </span>
            <span className="text-xs text-gray-400">XP</span>
          </div>
        </CardContent>

        <div className="mt-4 flex w-full justify-around gap-2">
          <div className="flex flex-1 flex-col items-center rounded-md dark:bg-main bg-[#e2e8f0] p-2 border border-border">
            <Users className="h-4 w-4 text-gray-400" />
            <span className="mt-1 text-sm font-semibold">
              {followers === undefined ? <MissingField /> : followers}
            </span>
            <span className="text-xs text-gray-400">Followers</span>
          </div>
          <div className="flex flex-1 flex-col items-center rounded-md dark:bg-main bg-[#e2e8f0] p-2 border border-border">
            <Users className="h-4 w-4 text-gray-400" />
            <span className="mt-1 text-base font-semibold">
              {following === undefined ? <MissingField /> : following}
            </span>
            <span className="text-xs text-gray-400">Following</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Inline element rendered when the wire payload does not expose a
 * given leaderboard field. The original implementation rendered a
 * literal `'N/A'` string; the dash makes the gap obvious to the user
 * without claiming we know the value.
 */
function MissingField() {
  return <span aria-label="Not available">—</span>;
}
