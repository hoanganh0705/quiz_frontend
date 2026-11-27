"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Flag,
  Hourglass,
  Swords,
  Users,
} from "lucide-react";

import { isApiError } from "@/lib/api";

import {
  completeAttempt,
  getAttemptAnswers,
  startAttempt,
  submitAnswer,
  withdrawAnswer,
} from "@/features/attempts/services/attempts.service";
import { useAuthSession } from "@/features/auth/hooks/use-auth-session";
import {
  useInstanceGameSocket,
  useInstanceLifecycle,
  useQuestionRevealed,
  useQuestionTimer,
  useSubmitInstanceAnswer,
} from "@/features/instances/play/hooks";
import {
  finishInstancePlayer,
  getInstance,
  getInstanceLeaderboard,
} from "@/features/instances/services";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/AlertDialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";

import { cn } from "@/shared/utils/merge-class-names";

import {
  selectAllQuestions,
  selectAttemptId,
  selectBattlePlayers,
  selectCurrentQuestionIndex,
  selectHostUserId,
  selectPlayerSubmitted,
  selectQuizTitle,
  selectSelectedAnswers,
  useInstanceGameplayStore,
} from "../stores/instanceGameplay.store";
import { AnswerOptions } from "./AnswerOptions";
import { GameResult } from "./GameResult";
import { InstanceClosedSummary } from "./InstanceClosedSummary";
import { LiveLeaderboard } from "./LiveLeaderboard";
import { PlayerProgressPanel } from "./PlayerProgressPanel";
import { QuestionCard } from "./QuestionCard";
import { formatBattleCountdown } from "./QuestionTimer";
import { ReconnectDuringGameNotice } from "./ReconnectDuringGameNotice";
import { GameConnectionStatus } from "./shared/GameConnectionStatus";

import type {
  BattlePlayerStatus,
  PlayerBattleOutcome,
} from "../stores/instanceGameplay.store";

interface InstanceGameViewProps {
  instanceId: string;
  className?: string;
}

export function InstanceGameView({
  instanceId,
  className,
}: InstanceGameViewProps) {
  const { currentUser } = useAuthSession();
  const currentPlayerId = currentUser?.userId ?? null;

  const { closure } = useInstanceLifecycle(instanceId);
  const { connectionState, emitPlayerFinished, emitEndGame } =
    useInstanceGameSocket(instanceId);
  const { bundle } = useQuestionRevealed(instanceId);
  const { remainingMs, totalMs, isWindowOpen } = useQuestionTimer(instanceId);

  const allQuestions = useInstanceGameplayStore((s) =>
    selectAllQuestions(s, instanceId),
  );
  const currentIndex = useInstanceGameplayStore((s) =>
    selectCurrentQuestionIndex(s, instanceId),
  );
  const selectedAnswers = useInstanceGameplayStore((s) =>
    selectSelectedAnswers(s, instanceId),
  );
  const quizTitle = useInstanceGameplayStore((s) =>
    selectQuizTitle(s, instanceId),
  );
  const attemptId = useInstanceGameplayStore((s) =>
    selectAttemptId(s, instanceId),
  );
  const hostUserId = useInstanceGameplayStore((s) =>
    selectHostUserId(s, instanceId),
  );
  const playerSubmitted = useInstanceGameplayStore((s) =>
    selectPlayerSubmitted(s, instanceId),
  );
  const players = useInstanceGameplayStore((s) =>
    selectBattlePlayers(s, instanceId),
  );
  const isHost = Boolean(
    currentPlayerId && hostUserId && currentPlayerId === hostUserId,
  );

  const goToQuestion = useInstanceGameplayStore((s) => s.goToQuestion);
  const submitPlayerBattle = useInstanceGameplayStore(
    (s) => s.submitPlayerBattle,
  );
  const finishBattle = useInstanceGameplayStore((s) => s.finishBattle);
  const setPlayers = useInstanceGameplayStore((s) => s.setPlayers);

  const currentQuestionId = bundle?.question.id ?? null;
  const { submit } = useSubmitInstanceAnswer(instanceId, currentQuestionId);

  const [showIncompleteDialog, setShowIncompleteDialog] = useState(false);
  const completedAttemptRef = useRef(false);

  const isClosed =
    closure !== null &&
    (closure.status === "closed" ||
      closure.status === "cancelled" ||
      closure.status === "finished");

  const refreshServerFinalLeaderboard = useCallback(() => {
    void getInstanceLeaderboard(instanceId)
      .then((lbData) => {
        type RawLbRow = {
          userId: string;
          displayName?: string | null;
          username?: string;
          avatarUrl?: string | null;
          scorePercent?: number | null;
          rank: number;
          correctCount?: number | null;
          answeredCount?: number | null;
          timeTakenMs?: number | null;
        };
        const rawItems: RawLbRow[] = Array.isArray(lbData)
          ? (lbData as unknown as RawLbRow[])
          : ((lbData as unknown as { items?: RawLbRow[] })?.items ?? []);
        if (rawItems.length === 0) return;
        const lastSeq =
          useInstanceGameplayStore.getState().entries[instanceId]
            ?.lastEventSequence?.instance_final_leaderboard ?? 0;
        const nowSeq = Math.max(Date.now(), lastSeq) + 1;
        const entries = rawItems.map((r) => ({
          playerId: r.userId,
          displayName: r.displayName || r.username || "Player",
          avatarUrl: r.avatarUrl ?? undefined,
          score: Math.round(r.scorePercent ?? 0),
          rank: r.rank,
          answeredCount: r.answeredCount ?? r.correctCount ?? 0,
          correctCount: r.correctCount ?? null,
          timeTakenMs: r.timeTakenMs ?? null,
          lastAwardedAt: null,
          eventSequence: nowSeq,
        }));
        useInstanceGameplayStore.getState().applyFinalLeaderboard({
          event: "instance_final_leaderboard",
          instanceId,
          eventSequence: nowSeq,
          emittedAt: new Date().toISOString(),
          payloadVersion: 1,
          data: {
            instanceId,
            entries,
            winnerPlayerId: entries[0]?.playerId ?? "",
            closedAt: new Date().toISOString(),
            totalQuestions: allQuestions.length,
          },
        });
      })
      .catch(() => {
        // Local fallback standings are already displayed.
      });
  }, [instanceId, allQuestions.length]);

  const completeRealAttemptOnce = useCallback(async (): Promise<
    PlayerBattleOutcome & { resolvedAttemptId?: string | null }
  > => {
    if (completedAttemptRef.current) return {};
    completedAttemptRef.current = true;

    const store = useInstanceGameplayStore.getState();
    const entry = store.entries[instanceId];
    let activeAttemptId = entry?.attemptId ?? attemptId;
    const localAnswers = entry?.selectedAnswers ?? {};

    // Lazily start the attempt if `/play` mounted while status was still `countdown`.
    if (!activeAttemptId && entry?.quizId) {
      try {
        const started = (await startAttempt(entry.quizId, {
          contextType: "solo",
          contextRefId: instanceId,
        })) as unknown as {
          attemptId?: string;
          data?: { attemptId?: string };
        };
        const createdId =
          started?.attemptId ?? started?.data?.attemptId ?? null;
        if (createdId) {
          activeAttemptId = createdId;
          store.setAttemptId(instanceId, createdId);
        }
      } catch {
        // Ignore if already started or completed
      }
    }

    if (!activeAttemptId) return {};

    // Flush any local selections that haven't been persisted to the attempt yet
    // so `completeAttempt` scores 100% of the player's answers.
    try {
      const localEntries = Object.entries(localAnswers);
      if (localEntries.length > 0) {
        const savedMap = new Map<string, string | null>();
        try {
          const rawAnswers = await getAttemptAnswers(activeAttemptId);
          const wrapped = rawAnswers as unknown as {
            answers?: Array<{
              questionId?: string;
              selectedOptionId?: string | null;
            }>;
            data?:
              | {
                  answers?: Array<{
                    questionId?: string;
                    selectedOptionId?: string | null;
                  }>;
                }
              | Array<{
                  questionId?: string;
                  selectedOptionId?: string | null;
                }>;
          };
          const list = Array.isArray(wrapped?.answers)
            ? wrapped.answers
            : Array.isArray(wrapped?.data)
              ? wrapped.data
              : Array.isArray(wrapped?.data?.answers)
                ? wrapped.data.answers
                : [];
          for (const item of list) {
            if (item.questionId) {
              savedMap.set(item.questionId, item.selectedOptionId ?? null);
            }
          }
        } catch {
          // If reading answers fails, we still attempt submitting each answer below
        }

        await Promise.all(
          localEntries.map(async ([qId, optId]) => {
            if (!optId) return;
            const prevSaved = savedMap.get(qId);
            if (prevSaved === optId) return;
            try {
              if (prevSaved !== undefined) {
                await withdrawAnswer(activeAttemptId!, qId);
              }
              await submitAnswer(activeAttemptId!, {
                questionId: qId,
                selectedOptionId: optId,
                timeTakenMs: 1000,
              });
            } catch (err: unknown) {
              if (
                isApiError(err) &&
                err.status === 409 &&
                err.code === "ATTEMPT_QUESTION_ALREADY_ANSWERED"
              ) {
                try {
                  await withdrawAnswer(activeAttemptId!, qId);
                  await submitAnswer(activeAttemptId!, {
                    questionId: qId,
                    selectedOptionId: optId,
                    timeTakenMs: 1000,
                  });
                } catch {
                  // Best-effort sync
                }
              }
            }
          }),
        );
      }
    } catch {
      // Non-fatal
    }

    try {
      const completed = await completeAttempt(activeAttemptId);
      const localCount = Object.keys(localAnswers).length;
      return {
        resolvedAttemptId: activeAttemptId,
        score:
          typeof completed.scorePercent === "number"
            ? Math.round(completed.scorePercent)
            : null,
        answeredCount:
          localCount > 0
            ? localCount
            : typeof completed.correctCount === "number"
              ? completed.correctCount
              : null,
      };
    } catch {
      return { resolvedAttemptId: activeAttemptId };
    }
  }, [attemptId, instanceId]);

  const syncFinishedToBackend = useCallback(
    async (resolvedAttemptId?: string | null) => {
      const targetAttemptId =
        resolvedAttemptId ??
        useInstanceGameplayStore.getState().entries[instanceId]?.attemptId ??
        attemptId;

      void emitPlayerFinished(targetAttemptId);

      try {
        const res = await finishInstancePlayer(instanceId, targetAttemptId);
        if (res.allFinished || res.status === "finished") {
          finishBattle(instanceId, "normal");
          refreshServerFinalLeaderboard();
        }
      } catch {
        // WS and 3s polling continue to reconcile
      }
    },
    [
      instanceId,
      attemptId,
      emitPlayerFinished,
      finishBattle,
      refreshServerFinalLeaderboard,
    ],
  );

  const handleSubmitOwnAnswers = useCallback(() => {
    // Check immediately whether other players are still active; if so, enter
    // the waiting room instead of showing premature "Battle Complete!" results.
    const { allPlayersFinished } = submitPlayerBattle(instanceId);

    void completeRealAttemptOnce().then((outcome) => {
      if (
        typeof outcome.score === "number" ||
        typeof outcome.answeredCount === "number"
      ) {
        // Re-apply authoritative backend score onto progress/leaderboard.
        submitPlayerBattle(instanceId, outcome);
      }
      if (allPlayersFinished) {
        refreshServerFinalLeaderboard();
      }
      void syncFinishedToBackend(outcome.resolvedAttemptId);
    });

    if (allPlayersFinished) {
      refreshServerFinalLeaderboard();
    }
  }, [
    instanceId,
    submitPlayerBattle,
    completeRealAttemptOnce,
    syncFinishedToBackend,
    refreshServerFinalLeaderboard,
  ]);

  const handleTimeoutFinish = useCallback(() => {
    finishBattle(instanceId, "timeout");
    void completeRealAttemptOnce().then((outcome) => {
      if (typeof outcome.score === "number") {
        const store = useInstanceGameplayStore.getState();
        const entry = store.entries[instanceId];
        if (entry?.progress) {
          store.applyPlayerProgress({
            ...entry.progress,
            currentScore: Math.max(entry.progress.currentScore, outcome.score),
            eventSequence: Date.now(),
          });
        }
      }
      void syncFinishedToBackend(outcome.resolvedAttemptId);
      refreshServerFinalLeaderboard();
    });
    refreshServerFinalLeaderboard();
  }, [
    instanceId,
    finishBattle,
    completeRealAttemptOnce,
    syncFinishedToBackend,
    refreshServerFinalLeaderboard,
  ]);

  // Ensure authoritative server standings are fetched whenever the battle
  // transitions to closed (e.g., via realtime player_finished or instance_finished).
  const fetchedFinalOnCloseRef = useRef(false);
  useEffect(() => {
    if (!isClosed) {
      fetchedFinalOnCloseRef.current = false;
      return;
    }
    if (!fetchedFinalOnCloseRef.current) {
      fetchedFinalOnCloseRef.current = true;
      refreshServerFinalLeaderboard();
    }
  }, [isClosed, refreshServerFinalLeaderboard]);

  // Immediately exit the live battle and show results the instant the timer hits 0.
  const wasOpenRef = useRef(false);
  useEffect(() => {
    if (isWindowOpen) {
      wasOpenRef.current = true;
      return;
    }
    if (wasOpenRef.current && !isWindowOpen && !isClosed && totalMs > 0) {
      wasOpenRef.current = false;
      handleTimeoutFinish();
    }
  }, [isWindowOpen, isClosed, totalMs, handleTimeoutFinish]);

  // While waiting for other players to finish, poll instance state every 3s
  // so we pick up finished players or server closure even if a WS event is missed.
  useEffect(() => {
    if (!playerSubmitted || isClosed) return;

    let cancelled = false;
    const poll = async () => {
      try {
        const latest = await getInstance(instanceId);
        if (cancelled || !latest) return;

        if (Array.isArray(latest.players) && latest.players.length > 0) {
          setPlayers(
            instanceId,
            latest.players.map((p) => ({
              userId: p.userId,
              displayName: p.displayName || p.username,
              avatarUrl: p.avatarUrl ?? null,
              status: p.status,
            })),
          );
        }

        if (latest.status === "closed" || latest.status === "finished") {
          finishBattle(instanceId, "normal");
          refreshServerFinalLeaderboard();
          return;
        }

        // If `setPlayers` detected all active players finished and closed the battle,
        // pull authoritative server standings.
        const currentClosure =
          useInstanceGameplayStore.getState().entries[instanceId]?.closure;
        if (currentClosure !== null) {
          refreshServerFinalLeaderboard();
        }
      } catch {
        // Keep waiting and retry next interval.
      }
    };

    const intervalId = setInterval(() => {
      void poll();
    }, 3000);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [
    playerSubmitted,
    isClosed,
    instanceId,
    setPlayers,
    finishBattle,
    refreshServerFinalLeaderboard,
  ]);

  const totalQuestions = allQuestions.length || bundle?.question.total || 0;
  const answeredCount = allQuestions.length
    ? allQuestions.filter((q) => Boolean(selectedAnswers[q.questionId])).length
    : currentQuestionId && selectedAnswers[currentQuestionId]
      ? 1
      : 0;
  const remainingCount = Math.max(0, totalQuestions - answeredCount);
  const allAnswered = totalQuestions > 0 && remainingCount === 0;
  const isCurrentAnswered = Boolean(
    currentQuestionId && selectedAnswers[currentQuestionId],
  );

  const handleHostEndBattle = useCallback(() => {
    void emitEndGame();
    finishBattle(instanceId, "normal");
    refreshServerFinalLeaderboard();
  }, [emitEndGame, finishBattle, instanceId, refreshServerFinalLeaderboard]);

  const handleRequestFinish = useCallback(() => {
    if (!allAnswered) {
      setShowIncompleteDialog(true);
      return;
    }
    handleSubmitOwnAnswers();
  }, [allAnswered, handleSubmitOwnAnswers]);

  // Keyboard shortcuts matching AttemptRunner: 1-4 pick option, arrows nav, Enter next/finish
  useEffect(() => {
    if (isClosed || playerSubmitted || !bundle) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "BUTTON" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        if (allQuestions.length > 1) {
          e.preventDefault();
          goToQuestion(
            instanceId,
            Math.min(currentIndex + 1, allQuestions.length - 1),
          );
        }
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        if (allQuestions.length > 1) {
          e.preventDefault();
          goToQuestion(instanceId, Math.max(currentIndex - 1, 0));
        }
      } else if (["1", "2", "3", "4"].includes(e.key)) {
        const optionIdx = parseInt(e.key, 10) - 1;
        const opt = bundle.options[optionIdx];
        if (opt && isWindowOpen) {
          e.preventDefault();
          void submit(opt.id);
        }
      } else if (e.key === "Enter") {
        if (allQuestions.length > 0 && currentIndex < allQuestions.length - 1) {
          e.preventDefault();
          goToQuestion(instanceId, currentIndex + 1);
        } else if (allAnswered) {
          e.preventDefault();
          handleSubmitOwnAnswers();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    isClosed,
    playerSubmitted,
    bundle,
    allQuestions.length,
    currentIndex,
    instanceId,
    goToQuestion,
    isWindowOpen,
    submit,
    allAnswered,
    handleSubmitOwnAnswers,
  ]);

  if (isClosed) {
    return (
      <div className={className} data-testid="instance-game-view">
        <InstanceClosedSummary
          instanceId={instanceId}
          currentPlayerId={currentPlayerId}
        />
      </div>
    );
  }

  // Player finished their questions, but other players are still playing!
  if (playerSubmitted) {
    return (
      <div className={className} data-testid="instance-game-view">
        <BattleWaitingForPlayers
          instanceId={instanceId}
          quizTitle={
            quizTitle || bundle?.question.quizTitle || "Live Quiz Battle"
          }
          players={players}
          currentPlayerId={currentPlayerId}
          answeredCount={answeredCount}
          totalQuestions={totalQuestions}
          remainingMs={remainingMs}
          totalMs={totalMs}
          isHost={isHost}
          onHostEndBattle={handleHostEndBattle}
        />
      </div>
    );
  }

  const isCriticalTime = isWindowOpen && totalMs > 0 && remainingMs <= 10_000;
  const isWarningTime =
    isWindowOpen && totalMs > 0 && !isCriticalTime && remainingMs <= 30_000;
  const answerProgressPct =
    totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;

  return (
    <div
      className={cn("space-y-6", className)}
      data-testid="instance-game-view"
      aria-label="Live battle session"
    >
      {/* Connection / reconnect alerts (only rendered when degraded) */}
      <GameConnectionStatus connectionState={connectionState} />
      <ReconnectDuringGameNotice instanceId={instanceId} />

      {/* Battle header — mirrors AttemptHeader + compact live countdown */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-4">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-semibold text-brand">
              <Swords className="h-3.5 w-3.5" aria-hidden="true" />
              Live Battle
            </span>
          </div>
          <h1 className="truncate text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            {quizTitle || bundle?.question.quizTitle || "Live Quiz Battle"}
          </h1>
        </div>

        {/* Live countdown pill */}
        {totalMs > 0 ? (
          <div
            role="timer"
            aria-label="Battle time remaining"
            aria-live="off"
            data-testid="question-timer"
            className={cn(
              "inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 font-mono text-sm sm:text-base font-bold tabular-nums shadow-2xs transition-colors",
              isCriticalTime
                ? "border-destructive/40 bg-destructive/10 text-destructive"
                : isWarningTime
                  ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                  : "border-border/80 bg-card text-foreground",
            )}
          >
            <Clock className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span data-testid="timer-remaining">
              {formatBattleCountdown(remainingMs)}
            </span>
          </div>
        ) : null}
      </header>

      {/* Two-column responsive arena: normal quiz flow + live standings sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Main quiz column (mirrors AttemptRunner) */}
        <div className="lg:col-span-2 space-y-4">
          {/* Progress indicator */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-mono text-xs sm:text-sm font-medium tabular-nums text-foreground">
                {answeredCount} / {totalQuestions} answered
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-brand transition-[width] duration-300"
                style={{ width: `${answerProgressPct}%` }}
              />
            </div>
          </div>

          {/* Question minimap stepper — identical to AttemptRunner */}
          {allQuestions.length > 1 ? (
            <nav
              aria-label="Question Navigator"
              className="flex flex-wrap items-center gap-1.5 rounded-xl border border-border/80 bg-card p-2.5 shadow-2xs"
            >
              <span className="mr-1 hidden font-mono text-xs text-muted-foreground sm:inline">
                Questions:
              </span>
              {allQuestions.map((q, idx) => {
                const isAnswered = Boolean(selectedAnswers[q.questionId]);
                const isActive = idx === currentIndex;
                return (
                  <button
                    key={q.questionId}
                    type="button"
                    onClick={() => goToQuestion(instanceId, idx)}
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-md font-mono text-xs transition-all cursor-pointer",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      isActive &&
                        "bg-brand text-white font-bold ring-2 ring-brand/40",
                      !isActive &&
                        isAnswered &&
                        "border border-emerald-500/30 bg-emerald-500/15 font-medium text-emerald-700 dark:text-emerald-300",
                      !isActive &&
                        !isAnswered &&
                        "border border-border/70 bg-muted/50 text-muted-foreground hover:bg-muted",
                    )}
                    aria-label={`Question ${idx + 1}${isAnswered ? " (Answered)" : ""}`}
                    aria-current={isActive ? "step" : undefined}
                  >
                    {idx + 1}
                  </button>
                );
              })}

              <div className="ml-auto hidden items-center gap-2 text-xs text-muted-foreground xl:flex">
                <span className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs">
                  1-4
                </span>
                <span>Pick</span>
                <span className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs">
                  ←/→
                </span>
                <span>Nav</span>
                <span className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs">
                  ↵
                </span>
                <span>Next</span>
              </div>
            </nav>
          ) : null}

          {/* Unified Question + Answer Options Card (mirrors AttemptQuestionCard) */}
          <article
            className={cn(
              "rounded-2xl border bg-card p-5 sm:p-7 space-y-5 shadow-sm transition-colors",
              isCurrentAnswered
                ? "border-emerald-500/40 bg-emerald-500/5 dark:border-emerald-500/30"
                : "border-border/80",
            )}
          >
            <QuestionCard instanceId={instanceId} />
            <AnswerOptions instanceId={instanceId} />
          </article>

          {/* Previous / Next navigation row (mirrors AttemptRunner) */}
          {allQuestions.length > 1 ? (
            <div className="flex items-center justify-between gap-3 pt-1">
              <Button
                type="button"
                variant="outline"
                disabled={currentIndex <= 0}
                onClick={() =>
                  goToQuestion(instanceId, Math.max(currentIndex - 1, 0))
                }
                data-testid="instance-prev-question-btn"
                className="h-10 sm:h-9 rounded-xl px-5"
              >
                Previous
              </Button>

              <span className="font-mono text-xs tabular-nums text-muted-foreground">
                {currentIndex + 1} / {allQuestions.length}
              </span>

              <Button
                type="button"
                variant="outline"
                disabled={currentIndex >= allQuestions.length - 1}
                onClick={() =>
                  goToQuestion(
                    instanceId,
                    Math.min(currentIndex + 1, allQuestions.length - 1),
                  )
                }
                data-testid="advance-question-btn"
                className="h-10 sm:h-9 rounded-xl px-5"
              >
                Next
              </Button>
            </div>
          ) : null}

          {/* Sticky Finish Battle CTA (mirrors AttemptRunner CompleteQuizButton) */}
          <div className="sticky bottom-3 z-20 mt-2 rounded-2xl border border-border/80 bg-card/95 p-4 shadow-lg backdrop-blur-md">
            <Button
              type="button"
              variant="default"
              size="lg"
              className="w-full rounded-xl bg-default py-3 font-semibold text-default-foreground shadow-sm hover:bg-default-hover"
              onClick={handleRequestFinish}
              data-testid="finish-battle-btn"
            >
              Finish Battle
            </Button>
            {remainingCount > 0 ? (
              <p className="mt-2 text-center font-mono text-xs tabular-nums text-muted-foreground">
                {remainingCount} question{remainingCount !== 1 ? "s" : ""}{" "}
                remaining
              </p>
            ) : null}
          </div>
        </div>

        {/* Live Battle Sidebar: your progress + live standings */}
        <aside className="space-y-4 lg:sticky lg:top-24">
          <section
            aria-label="Your progress"
            className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-2xs"
          >
            <PlayerProgressPanel instanceId={instanceId} />
          </section>

          <section
            aria-label="Leaderboard"
            className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-2xs"
          >
            <LiveLeaderboard
              instanceId={instanceId}
              currentPlayerId={currentPlayerId}
            />
          </section>
        </aside>
      </div>

      {/* Confirm early finish if unanswered questions remain */}
      <AlertDialog
        open={showIncompleteDialog}
        onOpenChange={setShowIncompleteDialog}
      >
        <AlertDialogContent data-testid="battle-incomplete-submit-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Finish battle early?</AlertDialogTitle>
            <AlertDialogDescription>
              You still have{" "}
              <span className="font-semibold text-foreground">
                {remainingCount} unanswered question
                {remainingCount !== 1 ? "s" : ""}
              </span>
              . Unanswered questions will earn 0 points. Do you want to submit
              now?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setShowIncompleteDialog(false);
                const firstUnanswered = allQuestions.findIndex(
                  (q) => !selectedAnswers[q.questionId],
                );
                if (firstUnanswered !== -1) {
                  goToQuestion(instanceId, firstUnanswered);
                }
              }}
            >
              Keep playing
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowIncompleteDialog(false);
                handleSubmitOwnAnswers();
              }}
              className="bg-default text-default-foreground hover:bg-default-hover"
            >
              Submit answers
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Post-game result overlay fallback */}
      {closure && !isClosed && closure.finalLeaderboard ? (
        <div className="mt-6 pt-6 border-t">
          <GameResult
            instanceId={instanceId}
            currentPlayerId={currentPlayerId}
          />
        </div>
      ) : null}
    </div>
  );
}

interface BattleWaitingForPlayersProps {
  instanceId: string;
  quizTitle: string;
  players: BattlePlayerStatus[];
  currentPlayerId: string | null;
  answeredCount: number;
  totalQuestions: number;
  remainingMs: number;
  totalMs: number;
  isHost?: boolean;
  onHostEndBattle?: () => void;
}

function BattleWaitingForPlayers({
  instanceId,
  quizTitle,
  players,
  currentPlayerId,
  answeredCount,
  totalQuestions,
  remainingMs,
  totalMs,
  isHost = false,
  onHostEndBattle,
}: BattleWaitingForPlayersProps) {
  const [showEndBattleDialog, setShowEndBattleDialog] = useState(false);
  const activePlayers = players.filter((p) => p.status !== "disconnected");
  const finishedCount = activePlayers.filter(
    (p) => p.status === "finished",
  ).length;
  const stillPlayingCount = Math.max(0, activePlayers.length - finishedCount);

  return (
    <div
      className="mx-auto max-w-2xl rounded-2xl border border-border/80 bg-card p-6 sm:p-8 shadow-sm space-y-6"
      data-testid="battle-waiting-for-players"
      role="status"
      aria-live="polite"
    >
      <div className="text-center space-y-3">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-brand/25 bg-brand/10 text-brand">
          <Hourglass className="h-7 w-7" aria-hidden="true" />
        </div>
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand">
            {quizTitle}
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Battle Still in Progress
          </h1>
          <p className="mx-auto max-w-md text-sm text-muted-foreground">
            You&apos;ve submitted your answers
            {answeredCount > 0 && totalQuestions > 0
              ? ` (${answeredCount}/${totalQuestions})`
              : ""}
            . Waiting for{" "}
            {stillPlayingCount === 1
              ? "1 player"
              : `${stillPlayingCount} players`}{" "}
            to finish before final results are revealed.
          </p>
        </div>
      </div>

      {/* Live status metrics */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border/70 bg-muted/30 p-3.5 text-center">
          <p className="font-mono text-lg sm:text-xl font-bold tabular-nums text-foreground">
            {finishedCount} / {activePlayers.length}
          </p>
          <p className="mt-0.5 inline-flex items-center justify-center gap-1 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5" aria-hidden="true" />
            Players finished
          </p>
        </div>

        <div className="rounded-xl border border-border/70 bg-muted/30 p-3.5 text-center">
          <p
            className="font-mono text-lg sm:text-xl font-bold tabular-nums text-foreground"
            data-testid="waiting-timer-remaining"
          >
            {totalMs > 0 ? formatBattleCountdown(remainingMs) : "—"}
          </p>
          <p className="mt-0.5 inline-flex items-center justify-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            Time remaining
          </p>
        </div>
      </div>

      {/* Player completion checklist */}
      {players.length > 0 ? (
        <div className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Player Status
          </h2>
          <ul className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border/70 bg-background/60 list-none">
            {players.map((player) => {
              const isMe = player.userId === currentPlayerId;
              const isDone = player.status === "finished";
              const isOffline = player.status === "disconnected";
              const initial = (player.displayName || "?")[0]?.toUpperCase();

              return (
                <li
                  key={player.userId}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar className="h-8 w-8 shrink-0">
                      {player.avatarUrl ? (
                        <AvatarImage src={player.avatarUrl} alt="" />
                      ) : null}
                      <AvatarFallback className="text-xs font-semibold">
                        {initial}
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate text-sm font-medium text-foreground">
                      {player.displayName}
                      {isMe ? (
                        <span className="ml-1.5 text-xs font-semibold text-brand">
                          (You)
                        </span>
                      ) : null}
                    </span>
                  </div>

                  {isDone ? (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/12 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                      Finished
                    </span>
                  ) : isOffline ? (
                    <span className="inline-flex shrink-0 items-center rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                      Disconnected
                    </span>
                  ) : (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/12 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
                      <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                      Still playing…
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <Button variant="outline" asChild className="h-10 sm:h-9 gap-2">
          <Link href={`/instances/${instanceId}`}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Return to Lobby
          </Link>
        </Button>

        {isHost && onHostEndBattle ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowEndBattleDialog(true)}
            data-testid="host-end-battle-btn"
            className="h-10 sm:h-9 gap-2 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <Flag className="h-4 w-4" aria-hidden="true" />
            End Battle Now
          </Button>
        ) : null}
      </div>

      {isHost && onHostEndBattle ? (
        <AlertDialog
          open={showEndBattleDialog}
          onOpenChange={setShowEndBattleDialog}
        >
          <AlertDialogContent data-testid="host-end-battle-dialog">
            <AlertDialogHeader>
              <AlertDialogTitle>End battle for everyone?</AlertDialogTitle>
              <AlertDialogDescription>
                {stillPlayingCount === 1
                  ? "1 player is still answering."
                  : `${stillPlayingCount} players are still answering.`}{" "}
                Ending the battle now will finalize scores and show the final
                standings to all players.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep waiting</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  setShowEndBattleDialog(false);
                  onHostEndBattle();
                }}
                data-testid="host-confirm-end-battle-btn"
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                End battle
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </div>
  );
}
