"use client";

import * as React from "react";
import Link from "next/link";

import { BookOpen, User, Trophy, Award, BarChart2, Hash, FolderOpen, MessageSquare, Users, ChevronRight } from "lucide-react";
import { cn } from "@/shared/utils/merge-class-names";

import type {
QuizResultDto,
UserResultDto,
TournamentResultDto,
AchievementResultDto,
RankingResultDto,
TagResultDto,
CategoryResultDto,
CommentResultDto,
SocialReadResultDto,
} from "@/features/search/types/search.types";

function BaseCardRow({
icon: Icon,
iconClassName,
title,
subtitle,
href,
className,
}: {
icon: React.ElementType;
iconClassName?: string;
title: React.ReactNode;
subtitle?: React.ReactNode;
href: string;
className?: string;
}) {
return (
<Link
href={href}
className={cn(
"flex items-center gap-3 py-2.5 px-1",
"hover:bg-muted/40 transition-colors rounded-md",
"group",
className,
      )}
    >
{/* Icon */}
<div
className={cn(
"shrink-0 flex items-center justify-center",
"h-8 w-8 rounded-full bg-muted",
iconClassName,
        )}
      >
<Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
</div>

{/* Text */}
<div className="flex-1 min-w-0">
<span className="block truncate text-sm font-medium text-foreground group-hover:text-primary transition-colors">
{title}
</span>
{subtitle && (
<span className="block truncate text-xs text-muted-foreground">
{subtitle}
</span>
        )}
</div>

{/* Navigation chevron */}
<ChevronRight
className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
aria-hidden="true"
      />
</Link>
  );
}

export function QuizResultCard({ item }: { item: QuizResultDto }) {
return (
<BaseCardRow
icon={BookOpen}
iconClassName="bg-blue-50 dark:bg-blue-950/30"
title={item.displayName}
subtitle={item.subtitle}
href={item.href}
    />
  );
}

export function UserResultCard({ item }: { item: UserResultDto }) {
return (
<BaseCardRow
icon={User}
iconClassName="bg-purple-50 dark:bg-purple-950/30"
title={item.displayName}
subtitle={item.subtitle}
href={item.href}
    />
  );
}

export function TournamentResultCard({ item }: { item: TournamentResultDto }) {
return (
<BaseCardRow
icon={Trophy}
iconClassName="bg-amber-50 dark:bg-amber-950/30"
title={item.displayName}
subtitle={
item.subtitle ??
(item.status ? `Status: ${item.status}` : undefined) ??
(item.participantCount !== undefined
? `${item.participantCount.toLocaleString()} participants`
: undefined)
      }
href={item.href}
    />
  );
}

export function AchievementResultCard({ item }: { item: AchievementResultDto }) {
return (
<BaseCardRow
icon={Award}
iconClassName="bg-emerald-50 dark:bg-emerald-950/30"
title={item.displayName}
subtitle={item.subtitle ?? item.tier}
href={item.href}
    />
  );
}

export function RankingResultCard({ item }: { item: RankingResultDto }) {
const subtitle = item.subtitle ?? (item.score !== undefined ? `${item.score.toLocaleString()} pts` : undefined);

return (
<BaseCardRow
icon={BarChart2}
iconClassName="bg-indigo-50 dark:bg-indigo-950/30"
title={item.displayName}
subtitle={subtitle}
href={item.href}
    />
  );
}

export function TagResultCard({ item }: { item: TagResultDto }) {
return (
<BaseCardRow
icon={Hash}
iconClassName="bg-cyan-50 dark:bg-cyan-950/30"
title={`#${item.displayName}`}
subtitle={item.subtitle}
href={item.href}
    />
  );
}

export function CategoryResultCard({ item }: { item: CategoryResultDto }) {
return (
<BaseCardRow
icon={FolderOpen}
iconClassName="bg-orange-50 dark:bg-orange-950/30"
title={item.displayName}
subtitle={item.subtitle}
href={item.href}
    />
  );
}

export function CommentResultCard({ item }: { item: CommentResultDto }) {
return (
<BaseCardRow
icon={MessageSquare}
iconClassName="bg-muted dark:bg-muted/50"
title={item.displayName}
subtitle={item.subtitle}
href={item.href}
    />
  );
}

export function SocialReadResultCard({ item }: { item: SocialReadResultDto }) {
return (
<BaseCardRow
icon={Users}
iconClassName="bg-pink-50 dark:bg-pink-950/30"
title={item.displayName}
subtitle={item.subtitle}
href={item.href}
    />
  );
}
