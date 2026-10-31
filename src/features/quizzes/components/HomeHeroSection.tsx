import Link from "next/link";
import { Button } from "@/components/ui/Button";
import {
  Play,
  Sparkles,
  CheckCircle2,
  Timer,
  Flame,
} from "lucide-react";

export function HomeHeroSection() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-br from-card via-card/95 to-secondary/30 p-5 sm:p-7 lg:p-8 shadow-md backdrop-blur-xl">
      {/* Decorative ambient background glows */}
      <div
        className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full bg-brand/15 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-purple-500/10 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative z-10 grid gap-6 lg:grid-cols-12 lg:items-center">
        {/* Left Column: Headline and Call-to-actions */}
        <div className="lg:col-span-7 flex flex-col items-start">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight mb-3 leading-[1.2] text-foreground">
            Test Your Knowledge,{" "}
            <span className="text-brand">Compete Live</span>{" "}
            & Earn Rewards
          </h1>

          <p className="text-sm sm:text-base text-muted-foreground mb-6 max-w-xl leading-relaxed">
            Dive into community-crafted challenges across science, history, tech,
            and sports. Level up your rank, challenge friends, and collect verifiable
            achievements.
          </p>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <Link href="/quizzes" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="h-10 px-6 rounded-full bg-brand text-brand-foreground hover:bg-brand-hover shadow-sm hover:shadow-brand/20 transition-all font-semibold flex items-center justify-center gap-2 group w-full sm:w-auto cursor-pointer"
              >
                <Play className="h-4 w-4 fill-current transition-transform group-hover:translate-x-0.5" />
                <span>Explore Quizzes</span>
              </Button>
            </Link>
            <Link href="/create-quiz" className="w-full sm:w-auto">
              <Button
                variant="outline"
                size="lg"
                className="h-10 px-5 rounded-full border-border/80 bg-background/60 hover:bg-main-hover backdrop-blur-sm transition-all font-medium flex items-center justify-center gap-2 w-full sm:w-auto cursor-pointer"
              >
                <Sparkles className="h-4 w-4 text-brand" />
                <span>Create a Quiz</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Right Column: Live Interactive Quiz Card Visual */}
        <div className="lg:col-span-5 hidden lg:block">
          <div className="relative mx-auto max-w-sm rounded-2xl border border-border/80 bg-background/90 p-4 sm:p-5 shadow-xl backdrop-blur-md transition-transform hover:-translate-y-1 duration-300">
            {/* Card Header */}
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-brand/15 px-2 py-0.5 text-[11px] font-medium text-brand">
                  Science & Nature
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Q 3 of 5
                </span>
              </div>
              <div className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                <Timer className="h-3 w-3" />
                <span>00:15s</span>
              </div>
            </div>

            {/* Question */}
            <div className="my-4">
              <p className="text-sm font-semibold text-foreground leading-snug">
                Which organelle is recognized as the powerhouse of eukaryotic cells?
              </p>
            </div>

            {/* Options */}
            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-lg border border-border/70 bg-card p-2.5 text-xs text-foreground/80 hover:bg-muted/50 transition-colors">
                <span className="font-medium">A. Ribosome</span>
              </div>

              <div className="relative flex items-center justify-between rounded-lg border-2 border-emerald-500/80 bg-emerald-500/10 p-2.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 shadow-xs">
                <span>B. Mitochondrion</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border/70 bg-card p-2.5 text-xs text-foreground/80 hover:bg-muted/50 transition-colors">
                <span className="font-medium">C. Endoplasmic reticulum</span>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border/70 bg-card p-2.5 text-xs text-foreground/80 hover:bg-muted/50 transition-colors">
                <span className="font-medium">D. Golgi apparatus</span>
              </div>
            </div>

            {/* Card Footer Badge */}
            <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1 text-amber-500 font-semibold">
                <Flame className="h-3.5 w-3.5 fill-current" />
                <span>3x Streak Bonus!</span>
              </span>
              <span className="font-medium text-brand">+180 XP Earned</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
