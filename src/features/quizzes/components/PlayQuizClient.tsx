"use client";

import { QuizResult, QuizProgress } from "@/features/quizzes/types";
import {
  getStorageKey,
  getResultsKey,
} from "@/features/quizzes/lib/quiz-results-utils";
import Image from "next/image";
import Link from "next/link";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/Card";
import { ArrowLeft, RotateCcw, Maximize, Minimize } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Progress } from "@/components/ui/Progress";
import {
  useLocalStorage,
  useIsMobile,
  useSwipeGesture,
  useFullscreen,
} from "@/shared/hooks";
import { useCountdownTimer } from "@/features/quizzes/hooks";
import { useAuthState } from "@/features/auth/hooks";
import { useKeyboardShortcut } from "@/shared/hooks/use-keyboard-shortcut";
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
import { MobileQuizTimer } from "@/features/quizzes/components/QuizPlayer/MobileQuizTimer";
import { SwipeIndicator } from "@/features/quizzes/components/QuizPlayer/SwipeIndicator";
import { cn } from "@/shared/utils/merge-class-names";
import { AuthNudgeDialog } from "@/features/auth/components/AuthNudgeDialog";
import { Quiz } from "@/features/quizzes/types/quiz";

export default function PlayQuizClient({ quiz }: { quiz: Quiz }) {
  const router = useRouter();
  const isSubmittedRef = useRef(false);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
  const warningSecondRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const { isAuthenticated } = useAuthState();

  const [, setRecentlyPlayed] = useLocalStorage<
    { quizId: string; title: string; playedAt: string }[]
  >("recently_played_quizzes_v1", []);

  const [progress, setProgress, removeProgress] = useLocalStorage<QuizProgress>(
    getStorageKey(quiz.id),
    {
      currentQuestion: 0,
      answers: {},
      timeLeft: quiz.duration,
      timerStarted: false,
      startedAt: null,
      timePerQuestion: {},
      questionStartTime: null,
    },
  );

  const [, setResults] = useLocalStorage<QuizResult | null>(
    getResultsKey(quiz.id),
    null,
  );

  const [dismissedNudges, setDismissedNudges] = useLocalStorage<string[]>(
    "auth_nudge_dismissed_v1",
    [],
  );
  const [authNudgeOpen, setAuthNudgeOpen] = useState(false);
  const authNudgeKey = `play-${quiz.id}`;
  const hasDismissedNudge = dismissedNudges.includes(authNudgeKey);

  const [isLoaded, setIsLoaded] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(
    progress.currentQuestion,
  );
  const [answers, setAnswers] = useState(progress.answers);
  const [timePerQuestion, setTimePerQuestion] = useState(
    progress.timePerQuestion,
  );
  const [questionStartTime, setQuestionStartTime] = useState(
    progress.questionStartTime,
  );

  const initialProgressRef = useRef(progress);

  const handleSubmitRef = useRef<() => void>(() => {});
  const {
    timeLeft,
    isRunning: timerStarted,
    start: startTimer,
    setTime: setTimeLeft,
  } = useCountdownTimer({
    initialTime: progress.timeLeft,
    onComplete: () => {
      if (!isSubmittedRef.current) {
        handleSubmitRef.current();
      }
    },
    autoStart: false,
  });

  const [startedAt, setStartedAt] = useState<number | null>(progress.startedAt);

  const playTone = useCallback((frequency: number, durationMs: number) => {
    if (typeof window === "undefined") return;

    const AudioContextConstructor =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;

    if (!AudioContextConstructor) return;

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContextConstructor();
    }

    const context = audioContextRef.current;
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    gain.gain.value = 0.04;

    oscillator.connect(gain);
    gain.connect(context.destination);

    oscillator.start();
    oscillator.stop(context.currentTime + durationMs / 1000);
  }, []);

  useEffect(() => {
    const prog = initialProgressRef.current;
    if (prog.timerStarted && prog.startedAt) {
      const elapsedSeconds = Math.floor((Date.now() - prog.startedAt) / 1000);
      const adjustedTimeLeft = Math.max(0, prog.timeLeft - elapsedSeconds);

      setTimeLeft(adjustedTimeLeft);

      if (adjustedTimeLeft > 0) {
        startTimer();
      }
    }
    setIsLoaded(true);
  }, [setTimeLeft, startTimer]);

  useEffect(() => {
    if (!isLoaded || isSubmittedRef.current) return;

    setProgress({
      currentQuestion,
      answers,
      timeLeft,
      timerStarted,
      startedAt,
      timePerQuestion,
      questionStartTime,
    });
  }, [
    currentQuestion,
    answers,
    timeLeft,
    timerStarted,
    startedAt,
    timePerQuestion,
    questionStartTime,
    isLoaded,
    setProgress,
  ]);

  const clearProgress = useCallback(() => {
    removeProgress();
    isSubmittedRef.current = true;
  }, [removeProgress]);

  const updateQuestionTime = useCallback(() => {
    if (questionStartTime !== null) {
      const timeSpent = Math.floor((Date.now() - questionStartTime) / 1000);
      setTimePerQuestion((prev) => ({
        ...prev,
        [currentQuestion]: (prev[currentQuestion] || 0) + timeSpent,
      }));
    }
    setQuestionStartTime(Date.now());
  }, [questionStartTime, currentQuestion]);

  const handleSubmit = useCallback(() => {
    if (questionStartTime !== null) {
      const timeSpent = Math.floor((Date.now() - questionStartTime) / 1000);
      const finalTimePerQuestion = {
        ...timePerQuestion,
        [currentQuestion]: (timePerQuestion[currentQuestion] || 0) + timeSpent,
      };

      let correctCount = 0;
      quiz.questions.forEach((q, index) => {
        if (answers[index] === q.correctAnswer) {
          correctCount++;
        }
      });

      const totalTimeTaken = startedAt
        ? Math.floor((Date.now() - startedAt) / 1000)
        : 0;

      const result: QuizResult = {
        answers,
        timeTaken: totalTimeTaken,
        completedAt: Date.now(),
        score: Math.round((correctCount / quiz.questions.length) * 100),
        correctCount,
        incorrectCount: quiz.questions.length - correctCount,
        timePerQuestion: finalTimePerQuestion,
      };

      setResults(result);
    }

    clearProgress();

    setRecentlyPlayed((prev) =>
      [
        {
          quizId: quiz.id,
          title: quiz.title,
          playedAt: new Date().toISOString(),
        },
        ...prev.filter((item) => item.quizId !== quiz.id),
      ].slice(0, 8),
    );

    router.push(`/quizzes/${quiz.id}/results`);
  }, [
    answers,
    clearProgress,
    currentQuestion,
    questionStartTime,
    quiz.id,
    quiz.questions,
    router,
    setResults,
    startedAt,
    timePerQuestion,
    setRecentlyPlayed,
    quiz.title,
  ]);

  const handleAnswer = (answer: string) => {
    if (!timerStarted) {
      startTimer();
      setStartedAt(Date.now());
      setQuestionStartTime(Date.now());
    }

    if (answer === currentQ.correctAnswer) {
      playTone(880, 110);
    } else {
      playTone(220, 150);
    }

    setAnswers({ ...answers, [currentQuestion]: answer });
  };

  const handleNextQuestion = () => {
    if (currentQuestion === quiz.questions.length - 1) return;
    updateQuestionTime();
    setCurrentQuestion((prev) => prev + 1);
  };

  const handlePreviousQuestion = () => {
    if (currentQuestion === 0) return;
    updateQuestionTime();
    setCurrentQuestion((prev) => prev - 1);
  };

  const handleRestart = () => {
    clearProgress();
    setCurrentQuestion(0);
    setAnswers({});
    setTimeLeft(quiz.duration);
    setStartedAt(null);
    setTimePerQuestion({});
    setQuestionStartTime(null);
    isSubmittedRef.current = false;
  };

  const currentQ =
    quiz.questions[Math.min(currentQuestion, quiz.questions.length - 1)];
  const isLastQuestion = currentQuestion === quiz.questions.length - 1;

  const handleNextRef = useRef(handleNextQuestion);
  const handlePrevRef = useRef(handlePreviousQuestion);
  const handleAnswerRef = useRef(handleAnswer);
  const handleSubmitRef2 = useRef(handleSubmit);
  const currentQRef = useRef(currentQ);
  const answersRef = useRef(answers);
  const currentQuestionRef = useRef(currentQuestion);
  const isLastQuestionRef = useRef(isLastQuestion);

  useEffect(() => {
    handleNextRef.current = handleNextQuestion;
    handlePrevRef.current = handlePreviousQuestion;
    handleAnswerRef.current = handleAnswer;
    handleSubmitRef2.current = handleSubmit;
    currentQRef.current = currentQ;
    answersRef.current = answers;
    currentQuestionRef.current = currentQuestion;
    isLastQuestionRef.current = isLastQuestion;
  });

  handleSubmitRef.current = handleSubmit;

  useKeyboardShortcut(
    "arrowright",
    useCallback(() => {
      handleNextRef.current();
    }, []),
    { meta: false, preventDefault: true },
  );

  useKeyboardShortcut(
    "arrowleft",
    useCallback(() => {
      handlePrevRef.current();
    }, []),
    { meta: false, preventDefault: true },
  );

  useKeyboardShortcut(
    "1",
    useCallback(() => {
      if (currentQRef.current.answers[0])
        handleAnswerRef.current(currentQRef.current.answers[0].value);
    }, []),
    { meta: false, preventDefault: true },
  );

  useKeyboardShortcut(
    "2",
    useCallback(() => {
      if (currentQRef.current.answers[1])
        handleAnswerRef.current(currentQRef.current.answers[1].value);
    }, []),
    { meta: false, preventDefault: true },
  );

  useKeyboardShortcut(
    "3",
    useCallback(() => {
      if (currentQRef.current.answers[2])
        handleAnswerRef.current(currentQRef.current.answers[2].value);
    }, []),
    { meta: false, preventDefault: true },
  );

  useKeyboardShortcut(
    "4",
    useCallback(() => {
      if (currentQRef.current.answers[3])
        handleAnswerRef.current(currentQRef.current.answers[3].value);
    }, []),
    { meta: false, preventDefault: true },
  );

  useKeyboardShortcut(
    "enter",
    useCallback(() => {
      if (answersRef.current[currentQuestionRef.current]) {
        if (isLastQuestionRef.current) {
          setConfirmSubmitOpen(true);
        } else {
          handleNextRef.current();
        }
      }
    }, []),
    { meta: false, preventDefault: true },
  );

  const isMobile = useIsMobile();
  const quizContainerRef = useRef<HTMLDivElement>(null);
  const { isFullscreen, toggleFullscreen } = useFullscreen();

  useSwipeGesture(
    {
      onSwipeLeft: handleNextQuestion,
      onSwipeRight: handlePreviousQuestion,
    },
    { threshold: 50, enabled: isMobile === true },
    quizContainerRef,
  );

  useEffect(() => {
    if (!timerStarted || timeLeft > 10 || timeLeft <= 0) return;
    if (warningSecondRef.current === timeLeft) return;

    warningSecondRef.current = timeLeft;
    playTone(540, 90);
  }, [playTone, timeLeft, timerStarted]);

  useEffect(() => {
    if (isAuthenticated) return;
    if (hasDismissedNudge) return;
    if (currentQuestion < 2) return;
    setAuthNudgeOpen(true);
  }, [currentQuestion, hasDismissedNudge, isAuthenticated]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground" role="status" aria-live="polite">
          Loading quiz\u2026
        </div>
      </div>
    );
  }

  return (
    <main
      ref={quizContainerRef}
      className={cn(
        "min-h-screen bg-background text-foreground p-4",
        isFullscreen && "p-2 md:p-4",
      )}
    >
      <div className="max-w-7xl mx-auto">
        {!isAuthenticated && (
          <div className="mb-4 rounded-lg border border-border bg-muted/40 p-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-semibold">Playing as guest</div>
              <div className="text-xs text-muted-foreground">
                Progress is saved on this device only.
              </div>
            </div>
            <Button asChild size="sm">
              <Link href="/login">Sign in to save</Link>
            </Button>
          </div>
        )}
        <div className="flex items-center justify-between gap-3 mb-4 md:mb-8">
          <Button
            size="sm"
            className="text-foreground/70 dark:text-foreground/70 bg-transparent p-0 hover:bg-transparent hover:text-foreground dark:hover:text-foreground shadow-none"
            asChild
          >
            <Link href="/quizzes" aria-label="Back to explore quizzes">
              <ArrowLeft className="w-5 h-5 mr-2" aria-hidden="true" />
              <span className="hidden sm:inline">Back to Explore</span>
              <span className="sm:hidden">Back</span>
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => toggleFullscreen(quizContainerRef.current)}
              className="border-border text-foreground"
              aria-label={
                isFullscreen ? "Exit full screen" : "Enter full screen"
              }
            >
              {isFullscreen ? (
                <Minimize className="w-4 h-4" aria-hidden="true" />
              ) : (
                <Maximize className="w-4 h-4" aria-hidden="true" />
              )}
              <span className="hidden sm:inline ml-2">
                {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              </span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleRestart}
              className="border-border text-foreground"
              aria-label="Restart this quiz"
            >
              <RotateCcw className="w-4 h-4 md:mr-2" aria-hidden="true" />
              <span className="hidden md:inline">Restart Quiz</span>
            </Button>
          </div>
        </div>

        <div className="mb-4 md:mb-8">
          <h1 className="text-2xl md:text-4xl font-bold mb-2 md:mb-4">
            {quiz.title}
          </h1>
          <div className="flex flex-wrap gap-2">
            {quiz.tags.map((tag) => (
              <Badge
                key={tag}
                className="bg-background text-foreground border border-border text-xs md:text-sm"
              >
                {tag}
              </Badge>
            ))}
            <Badge className="bg-yellow-500 text-foreground font-medium border border-border text-xs md:text-sm">
              {quiz.difficulty}
            </Badge>
          </div>
        </div>

        <div className="flex justify-between items-center mb-4 md:mb-8">
          <div
            className="text-foreground font-semibold text-xs md:text-sm"
            aria-live="polite"
          >
            Question {currentQuestion + 1} of {quiz.questions.length}
          </div>
          <MobileQuizTimer timeLeft={timeLeft} totalTime={quiz.duration} />
        </div>

        <div className="mb-4 md:mb-8">
          <Progress
            value={
              quiz.questions.length > 0
                ? ((currentQuestion + 1) / quiz.questions.length) * 100
                : 0
            }
            className="h-1.5 md:h-2"
          />
        </div>

        <SwipeIndicator
          currentQuestion={currentQuestion}
          totalQuestions={quiz.questions.length}
        />

        <Card className="bg-background border border-border text-foreground">
          <CardContent className="p-4 md:p-8">
            <div className="grid md:grid-cols-2 gap-4 md:gap-8 items-center">
              <div className="order-2 md:order-1">
                <Image
                  src={currentQ.image || "/placeholder.jpg"}
                  alt={`Illustration for: ${currentQ.question}`}
                  width={400}
                  height={300}
                  className="rounded-lg object-cover w-full"
                />
              </div>

              <div className="order-1 md:order-2 space-y-4 md:space-y-6">
                <h2 className="text-lg md:text-2xl font-semibold text-foreground leading-tight">
                  {currentQ.question}
                </h2>

                <div
                  className="space-y-2 md:space-y-3"
                  role="radiogroup"
                  aria-label="Answer options"
                >
                  {currentQ.answers.map((answer) => {
                    const isSelected =
                      answers[currentQuestion] === answer.value;
                    return (
                      <Button
                        key={answer.label}
                        variant={isSelected ? "default" : "outline"}
                        role="radio"
                        aria-checked={isSelected}
                        className={cn(
                          "w-full justify-start text-left h-auto transition-all duration-150",
                          "p-3 md:p-4 min-h-12 md:min-h-0",
                          "active:scale-[0.98] active:brightness-95",
                          isSelected
                            ? "bg-brand dark:bg-white text-white dark:text-black border-primary ring-2 ring-primary/20"
                            : "border-border dark:hover:bg-slate-600 hover:bg-gray-200 text-foreground",
                        )}
                        onClick={() => handleAnswer(answer.value)}
                      >
                        <span
                          className={cn(
                            "rounded-full flex items-center justify-center font-medium mr-3 md:mr-4 shrink-0",
                            "w-8 h-8 text-sm",
                            isSelected
                              ? "dark:bg-gray-600 bg-gray-200 text-primary"
                              : "bg-muted text-foreground",
                          )}
                        >
                          {answer.label}
                        </span>
                        <span className="text-sm md:text-base">
                          {answer.value}
                        </span>
                      </Button>
                    );
                  })}
                  <div className="flex justify-between pt-2">
                    <Button
                      onClick={handlePreviousQuestion}
                      className={cn(
                        "text-white",
                        "min-h-11 px-4 md:px-6 active:scale-[0.97]",
                      )}
                      disabled={currentQuestion === 0}
                    >
                      Previous
                    </Button>
                    <Button
                      onClick={
                        isLastQuestion
                          ? () => setConfirmSubmitOpen(true)
                          : handleNextQuestion
                      }
                      className={cn(
                        "text-white",
                        "min-h-11 px-4 md:px-6 active:scale-[0.97]",
                        isLastQuestion &&
                          "bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700",
                      )}
                    >
                      {isLastQuestion ? "Submit" : "Next"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {isMobile && currentQuestion === 0 && !answers[0] && (
          <p className="text-center text-xs text-muted-foreground mt-3 animate-pulse">
            Swipe left or right to navigate questions
          </p>
        )}
      </div>

      <AlertDialog open={confirmSubmitOpen} onOpenChange={setConfirmSubmitOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit quiz now?</AlertDialogTitle>
            <AlertDialogDescription>
              Once submitted, your answers will be finalized and scored.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Review answers</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmit}>
              Submit quiz
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AuthNudgeDialog
        open={authNudgeOpen}
        onOpenChange={setAuthNudgeOpen}
        title="Save your progress?"
        description="Create a free account to save results, track streaks, and join leaderboards."
        primaryLabel="Save and sign in"
        primaryHref="/login"
        secondaryLabel="Continue as guest"
        onSecondary={() => {
          setDismissedNudges((prev) =>
            prev.includes(authNudgeKey) ? prev : [...prev, authNudgeKey],
          );
        }}
      />
    </main>
  );
}
