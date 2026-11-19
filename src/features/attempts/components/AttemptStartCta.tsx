"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Play, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/Button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/Tooltip";
import { useToast } from "@/lib/forms/useToast";
import { getUserCopy } from "@/lib/api/error-codes";

import { useAuthSession } from "@/features/auth/hooks/use-auth-session";
import { useStartAttempt } from "@/features/attempts/hooks/useStartAttempt";
import { ApiError } from "@/lib/api";

export interface AttemptStartCtaProps {
  quizId: string | null;
  quizVersionId?: string | null;
  idOrSlug: string | null;
  isActiveResolvedEmpty: boolean;
  onAlreadyStarted?: () => void;
  disabledTooltip?: string | null;
  className?: string;
}

const BUTTON_CLASS = "h-10 w-full min-w-40 sm:w-44";

export function AttemptStartCta(
  props: AttemptStartCtaProps,
): React.ReactElement | null {
  const {
    quizId,
    quizVersionId,
    idOrSlug,
    isActiveResolvedEmpty,
    onAlreadyStarted,
    disabledTooltip,
    className,
  } = props;

  const router = useRouter();
  const { push } = useToast();
  const { bootstrapState, currentUser } = useAuthSession();

  const isAuthenticated =
    bootstrapState === "authenticated" && currentUser !== null;

  const startHook = useStartAttempt({
    quizId,
    quizVersionId,
  });

  if (!isActiveResolvedEmpty) return null;
  if (!isAuthenticated) return null;

  const isPending = startHook.isPending;
  const error = startHook.error;
  const tooltip = error
    ? getUserCopy((error as ApiError).code ?? "GLOBAL_INTERNAL_ERROR").body
    : (disabledTooltip ?? null);

  const handleClick = async () => {
    const outcome = await startHook.start();
    if (outcome.kind === "success") {
      if (idOrSlug) {
        router.push(`/quizzes/${encodeURIComponent(idOrSlug)}/attempt`);
      }
      return;
    }
    if (outcome.kind === "already_started") {
      const copy = getUserCopy("ATTEMPT_ALREADY_STARTED");
      push({ title: copy.title, body: copy.body, durationMs: 5000 });
      onAlreadyStarted?.();
      return;
    }
    if (outcome.kind === "quiz_unpublished") {
      const copy = getUserCopy("ATTEMPT_QUIZ_NOT_PUBLISHED");
      push({ title: copy.title, body: copy.body, durationMs: 5000 });
      if (idOrSlug) {
        router.replace(`/quizzes/${encodeURIComponent(idOrSlug)}`);
      }
      return;
    }
    if (outcome.kind === "retryable") {
      const apiError = outcome.error as ApiError;
      const copy = getUserCopy(apiError.code ?? "GLOBAL_INTERNAL_ERROR");
      push({ title: copy.title, body: copy.body, durationMs: 5000 });
      return;
    }
  };

  const buttonNode = (
    <Button
      type="button"
      className={className ?? BUTTON_CLASS}
      disabled={isPending || startHook.isCoolingDown}
      onClick={handleClick}
      aria-label={isPending ? "Starting attempt…" : "Start attempt"}
      data-testid="quiz-start-attempt-button"
    >
      {isPending ? (
        <>
          <Loader2 aria-hidden="true" className="animate-spin" />
          Starting…
        </>
      ) : (
        <>
          <Play aria-hidden="true" />
          Start attempt
        </>
      )}
    </Button>
  );

  if (!tooltip) {
    return (
      <span
        className="inline-flex w-full rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-auto"
        tabIndex={0}
        data-testid="quiz-start-tooltip-trigger"
      >
        {buttonNode}
      </span>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className="inline-flex w-full rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-auto"
          tabIndex={0}
          data-testid="quiz-start-tooltip-trigger"
        >
          {buttonNode}
        </span>
      </TooltipTrigger>
      <TooltipContent sideOffset={6}>{tooltip}</TooltipContent>
    </Tooltip>
  );
}
