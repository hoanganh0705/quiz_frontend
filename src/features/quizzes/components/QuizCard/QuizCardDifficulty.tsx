import Image from "next/image";
import Link from "next/link";
import { Clock, Users, Zap } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { QuizDifficulty } from "@/features/quizzes/types";
import { QuizCardDifficultyBadge } from "./shared/QuizCardDifficultyBadge";
import { QuizCardCreator } from "./shared/QuizCardCreator";

export interface QuizCardDifficultyProps {
  id?: string;
  slug?: string;
  imageSrc: string;
  difficulty: QuizDifficulty;
  creatorImageURL?: string;
  creatorName?: string;
  reward?: number;
  category?: string;
  duration?: number;
  title: string;
  currentPlayers?: number;
}

export function QuizCardDifficulty({
  id,
  slug,
  imageSrc,
  difficulty,
  creatorImageURL,
  creatorName = "QuizHub Creator",
  reward = 100,
  category = "General",
  duration = 1,
  title,
  currentPlayers = 0,
}: QuizCardDifficultyProps) {
  const quizHref = `/quizzes/${slug || id || ""}`;

  return (
    <div className="group flex flex-col justify-between w-full h-full overflow-hidden rounded-xl border border-border/70 bg-card text-foreground shadow-xs hover:shadow-md hover:border-brand/40 transition-all duration-200">
      <Link href={quizHref} className="block relative aspect-video w-full overflow-hidden bg-muted">
        <Image
          src={imageSrc || "/placeholder.svg"}
          alt={title}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
        />
        <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/25 to-transparent" />
        <QuizCardDifficultyBadge
          difficulty={difficulty}
          asDiv
          className="absolute top-3 right-3 text-white capitalize shadow-xs"
        />
        {creatorName ? (
          <QuizCardCreator
            imageURL={creatorImageURL ?? ""}
            name={creatorName}
            avatarClassName="h-8 w-8 border-2 border-white/80 shadow-xs"
            nameClassName="text-xs font-medium text-white drop-shadow-xs truncate max-w-[140px]"
            containerClassName="absolute bottom-3 left-3 flex items-center gap-2"
          />
        ) : null}
        <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-full bg-black/60 backdrop-blur-xs px-2 py-0.5 text-xs font-semibold text-amber-300 border border-white/10">
          <Zap className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
          <span className="font-mono tabular-nums">+{reward} XP</span>
        </div>
      </Link>

      <div className="flex flex-col flex-1 justify-between p-4 bg-card text-foreground">
        <div>
          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
            <span className="rounded-full bg-muted border border-border px-2 py-0.5 font-medium text-foreground">
              {category}
            </span>
            <div className="flex items-center gap-1 font-mono tabular-nums">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
              <span>{Math.max(1, duration)} min</span>
            </div>
          </div>

          <Link href={quizHref} className="block group-hover:text-brand transition-colors">
            <h3 className="line-clamp-2 text-base font-bold text-foreground tracking-tight leading-snug mb-2">
              {title}
            </h3>
          </Link>
        </div>

        <div className="pt-3 border-t border-border/60 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono tabular-nums">
            <Users className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{currentPlayers.toLocaleString()} plays</span>
          </div>

          <Button
            asChild
            size="sm"
            className="rounded-lg bg-brand hover:bg-brand-hover text-brand-foreground font-semibold px-4 cursor-pointer"
          >
            <Link href={quizHref}>Start Quiz</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
