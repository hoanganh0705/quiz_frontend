"use client";

import * as React from "react";
import Link from "next/link";

import { ArrowLeft, History, Trophy } from "lucide-react";

import { PAGE_CONTAINER_CLASS } from "@/shared/layout/constants";

import { AttemptResultView } from "@/features/attempts/pages/AttemptResultView";
import {
  useAttemptsStore,
  type AttemptEntry,
} from "@/features/attempts/stores/useAttemptsStore";

import { Button } from "@/components/ui/Button";

export function QuizResultsClientFallback({ idOrSlug }: { idOrSlug: string }) {
  const [resolvedAttemptId, setResolvedAttemptId] = React.useState<
    string | null
  >(null);
  const [checkedStore, setCheckedStore] = React.useState(false);

  React.useEffect(() => {
    const store = useAttemptsStore.getState();
    const attempts = Object.entries(store.attemptsById) as [
      string,
      AttemptEntry,
    ][];
    const completed = attempts.filter(([, entry]) => {
      if (entry.status !== "completed") return false;
      const snapshot = entry.completedSnapshot as
        | { quizId?: string; quizSlug?: string }
        | undefined;
      if (!snapshot) return false;
      return snapshot.quizId === idOrSlug || snapshot.quizSlug === idOrSlug;
    });
    if (completed.length > 0) {
      const [latestId] = completed[completed.length - 1]!;
      setResolvedAttemptId(latestId);
    }
    setCheckedStore(true);
  }, [idOrSlug]);

  if (resolvedAttemptId) {
    return <AttemptResultView mode="result" attemptId={resolvedAttemptId} />;
  }

  if (!checkedStore) {
    return (
      <div className={`${PAGE_CONTAINER_CLASS} flex flex-col gap-4`}>
        <div className="h-8 w-1/3 animate-pulse rounded bg-muted" />
        <div className="h-40 w-full animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  return (
    <div
      className={`${PAGE_CONTAINER_CLASS} flex min-h-[60vh] flex-col items-center justify-center text-center`}
    >
      <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-brand/10 text-brand">
        <Trophy className="size-7" />
      </div>
      <h1 className="mb-2 text-2xl font-bold tracking-tight text-foreground">
        Quiz Results
      </h1>
      <p className="mb-6 max-w-md text-sm leading-relaxed text-muted-foreground">
        We could not find an active completed attempt in this session. If you
        recently took this quiz, you can review your complete score history in
        your account.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button
          variant="default"
          asChild
          className="rounded-md bg-brand text-brand-foreground hover:bg-brand-hover"
        >
          <Link href={`/quizzes/${encodeURIComponent(idOrSlug)}`}>
            <ArrowLeft className="mr-1.5 size-4" />
            Back to Quiz
          </Link>
        </Button>
        <Button variant="outline" asChild className="rounded-md">
          <Link href="/quiz-history">
            <History className="mr-1.5 size-4" />
            View Quiz History
          </Link>
        </Button>
      </div>
    </div>
  );
}
