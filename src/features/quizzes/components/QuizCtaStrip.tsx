"use client";

import { Loader2, Play } from "lucide-react";
import Link from "next/link";

import {
  AttemptContinueCta,
  AttemptStartCta,
} from "@/features/attempts/components";
import { useActiveAttempt } from "@/features/attempts/hooks/useActiveAttempt";
import { BookmarkButtonSlot } from "@/components/primitives/BookmarkButton";
import { Button } from "@/components/ui/Button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/Tooltip";
import { cn } from "@/shared/utils/merge-class-names";
import { useAuthSession } from "@/features/auth/hooks/use-auth-session";
import { TipAuthorButton } from "@/features/coins/components/TipAuthorButton";
import { SuppressRecommendedControl } from "@/features/coins/components/SuppressRecommendedControl";
import { HostLiveRoomCta } from "@/features/instances";

const START_TOOLTIP = "Starting attempts opens in a later release";
const BUTTON_SIZE = "h-10 w-full min-w-40 sm:w-44";

export interface QuizCtaStripProps {
  quizId: string;

  quizVersionId?: string | null;

  idOrSlug?: string;

  authorUserId?: string | null;

  authorDisplayName?: string | null;

  quizTitle?: string | null;

  alreadySuppressed?: boolean;
  className?: string;
}

export function QuizCtaStrip({
  quizId,
  quizVersionId,
  idOrSlug,
  authorUserId,
  authorDisplayName,
  quizTitle,
  alreadySuppressed,
  className,
}: QuizCtaStripProps) {
  const isAttemptsLive = true;
  const { bootstrapState, currentUser } = useAuthSession();
  const isAuthenticated =
    bootstrapState === "authenticated" && currentUser !== null;

  const {
    attempt: activeAttempt,
    isLoading,
    error,
    retry,
  } = useActiveAttempt({
    quizId: isAuthenticated ? quizId : null,
  });

  if (!isAttemptsLive) {
    return <PlaceholderStrip quizId={quizId} className={className} />;
  }

  const showLoading = isAuthenticated && isLoading;
  const hasActive = activeAttempt !== null;
  const hasError = error !== null && activeAttempt === null;
  const isEmptyResolved =
    isAuthenticated && !isLoading && activeAttempt === null;

  let attemptSlot: React.ReactNode;

  if (showLoading) {
    attemptSlot = (
      <span
        className="inline-flex h-10 w-full min-w-40 items-center justify-center rounded-md border bg-card sm:w-44"
        data-testid="quiz-attempt-loading"
      >
        <Loader2 aria-hidden="true" className="animate-spin" />
      </span>
    );
  } else if (hasActive) {
    attemptSlot = (
      <AttemptContinueCta
        activeAttempt={activeAttempt}
        idOrSlug={idOrSlug ?? null}
      />
    );
  } else if (isEmptyResolved) {
    attemptSlot = (
      <AttemptStartCta
        quizId={quizId}
        quizVersionId={quizVersionId ?? null}
        idOrSlug={idOrSlug ?? null}
        isActiveResolvedEmpty
      />
    );
  } else if (hasError) {
    attemptSlot = (
      <Button
        type="button"
        variant="outline"
        size="default"
        onClick={() => void retry()}
        data-testid="quiz-attempt-retry"
        aria-label="Retry loading active attempt"
      >
        Retry
      </Button>
    );
  } else if (!isAuthenticated) {
    const returnPath = idOrSlug ? `/quizzes/${idOrSlug}` : `/quizzes/${quizId}`;
    attemptSlot = (
      <Button
        asChild
        className={cn(BUTTON_SIZE, "bg-brand text-white hover:bg-brand-hover")}
        data-testid="quiz-signin-to-play"
      >
        <Link href={`/login?returnUrl=${encodeURIComponent(returnPath)}`}>
          <Play aria-hidden="true" className="mr-2 h-4 w-4 fill-current" />
          Sign in to play
        </Link>
      </Button>
    );
  } else {
    attemptSlot = <DisabledStartTooltip />;
  }

  return (
    <section
      className={cn(
        "flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
      aria-label="Quiz actions"
      data-testid="quiz-cta-strip"
    >
      <div className="order-2 flex flex-wrap items-center gap-2 sm:order-1 sm:gap-3">
        <BookmarkButtonSlot
          quizId={quizId}
          variant="detail"
          className="contents"
        />
        {isAuthenticated &&
        authorUserId &&
        authorUserId !== currentUser?.userId ? (
          <TipAuthorButton
            recipientUserId={authorUserId}
            currentUserId={currentUser?.userId ?? null}
            recipientDisplayName={authorDisplayName ?? null}
            quizId={quizId}
          />
        ) : null}
        {isAuthenticated ? (
          <SuppressRecommendedControl
            quizId={quizId}
            quizTitle={quizTitle ?? "this quiz"}
            alreadySuppressed={alreadySuppressed === true}
          />
        ) : null}
      </div>

      <div className="order-1 flex w-full flex-col gap-2.5 sm:order-2 sm:w-auto sm:flex-row sm:items-center sm:gap-3">
        {quizVersionId ? (
          <HostLiveRoomCta quizId={quizId} idOrSlug={idOrSlug} />
        ) : null}
        {attemptSlot}
      </div>
    </section>
  );
}

function PlaceholderStrip({
  quizId,
  className,
}: {
  quizId: string;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
      aria-label="Quiz actions"
      data-testid="quiz-cta-strip"
    >
      <div className="order-2 flex flex-wrap items-center gap-2 sm:order-1 sm:gap-3">
        <BookmarkButtonSlot
          quizId={quizId}
          variant="detail"
          className="contents"
        />
      </div>
      <div className="order-1 flex w-full flex-col gap-2 sm:order-2 sm:w-auto sm:flex-row sm:items-center sm:gap-3">
        <DisabledStartTooltip />
      </div>
    </section>
  );
}

function DisabledStartTooltip() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className="inline-flex w-full rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-auto"
          tabIndex={0}
          data-testid="quiz-start-tooltip-trigger"
        >
          <Button
            type="button"
            className={BUTTON_SIZE}
            disabled
            aria-label="Start attempt (unavailable)"
            data-testid="quiz-start-attempt-button"
          >
            <Play aria-hidden="true" />
            Start attempt
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent sideOffset={6}>{START_TOOLTIP}</TooltipContent>
    </Tooltip>
  );
}

export { START_TOOLTIP as QUIZ_START_ATTEMPT_TOOLTIP };
