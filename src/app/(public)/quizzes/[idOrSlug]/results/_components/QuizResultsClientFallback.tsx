"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, History, Trophy } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { AttemptResultPage } from "@/features/attempts/components/AttemptResultPage";
import {
  useAttemptsStore,
  type AttemptEntry,
} from "@/features/attempts/stores/useAttemptsStore";

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
    const completed = attempts.filter(
      ([, entry]) => entry.status === "completed",
    );
    if (completed.length > 0) {
      const [latestId] = completed[completed.length - 1]!;
      setResolvedAttemptId(latestId);
    }
    setCheckedStore(true);
  }, []);

  if (resolvedAttemptId) {
    return <AttemptResultPage attemptId={resolvedAttemptId} />;
  }

  if (!checkedStore) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-6">
        <div className="h-8 w-1/3 animate-pulse rounded bg-muted" />
        <div className="h-40 w-full animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center p-6 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-brand/10 text-brand mb-4">
        <Trophy className="size-7" />
      </div>
      <h1 className="text-2xl font-bold tracking-tight text-foreground mb-2">
        Quiz Results
      </h1>
      <p className="text-sm text-muted-foreground max-w-md mb-6 leading-relaxed">
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
            <ArrowLeft className="size-4 mr-1.5" />
            Back to Quiz
          </Link>
        </Button>
        <Button variant="outline" asChild className="rounded-md">
          <Link href="/quiz-history">
            <History className="size-4 mr-1.5" />
            View Quiz History
          </Link>
        </Button>
      </div>
    </div>
  );
}
