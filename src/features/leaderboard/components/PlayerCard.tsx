import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/Avatar";
import { CardContent } from "@/components/ui/Card";
import { Users } from "lucide-react";
import { cn } from "@/shared/utils/merge-class-names";
import type { Player } from "@/features/users/types";

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
    <div className="relative overflow-hidden rounded-xl bg-card/80 border border-border/70 text-foreground shadow-xs hover:shadow-md hover:border-primary/40 transition-all duration-200 h-full backdrop-blur-xs">
      <div className="relative h-28 w-full bg-linear-to-br from-primary/10 via-primary/5 to-muted/20">
        {levelString && (
          <div
            className={cn(
              "absolute right-3 top-3 rounded-full px-2.5 py-0.5 text-xs font-semibold text-white shadow-xs",
              levelColorClass[levelString] || levelColorClass.default,
            )}
          >
            {levelString}
          </div>
        )}
      </div>

      <div className="relative -mt-10 flex flex-col items-center px-4 pb-4">
        <Avatar className="h-20 w-20 border-4 border-background bg-muted shadow-sm">
          <AvatarImage src={avatarUrl || "/placeholder.svg"} alt={name} />
          <AvatarFallback className="font-semibold text-muted-foreground">
            {name
              .split(" ")
              .map((n) => n[0])
              .join("")}
          </AvatarFallback>
        </Avatar>

        <h3 className="mt-2 text-base font-semibold tracking-tight">{name}</h3>

        <CardContent className="mt-4 grid w-full grid-cols-3 gap-2 p-0 text-center">
          <div className="flex flex-col items-center">
            <span className="text-base font-bold font-mono tabular-nums">
              {rank}
            </span>
            <span className="text-xs text-muted-foreground">Rank</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-base font-bold font-mono tabular-nums">
              {earned !== undefined ? (
                `$${earned.toLocaleString(undefined, {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 2,
                })}`
              ) : (
                <MissingField />
              )}
            </span>
            <span className="text-xs text-muted-foreground">Earned</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-base font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
              <MissingField />
            </span>
            <span className="text-xs text-muted-foreground">XP</span>
          </div>
        </CardContent>

        <div className="mt-4 flex w-full justify-around gap-2">
          <div className="flex flex-1 flex-col items-center rounded-lg bg-muted/40 p-2 border border-border/50">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="mt-1 text-xs font-semibold font-mono tabular-nums">
              {followers === undefined ? <MissingField /> : followers}
            </span>
            <span className="text-xs text-muted-foreground">Followers</span>
          </div>
          <div className="flex flex-1 flex-col items-center rounded-lg bg-muted/40 p-2 border border-border/50">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="mt-1 text-xs font-semibold font-mono tabular-nums">
              {following === undefined ? <MissingField /> : following}
            </span>
            <span className="text-xs text-muted-foreground">Following</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function MissingField() {
  return <span aria-label="Not available">—</span>;
}
