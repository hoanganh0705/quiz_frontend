"use client";

import "swiper/css";

import { useMemo, useRef, useState } from "react";

import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { Autoplay } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/loading-states/LoadingSpinner";

import { QuizCardDifficulty } from "@/features/quizzes/components/QuizCard";
import { useQuizzesList } from "@/features/quizzes/hooks";

import { DIFFICULTY_STYLES } from "@/shared/ui/DifficultyBadge";

import type { QuizDifficulty } from "@/features/quizzes/types";
import type { Swiper as SwiperType } from "swiper";

const DIFFICULTIES: QuizDifficulty[] = ["easy", "medium", "hard"];

const QuizCardDifficultyList = () => {
  const [selectedDifficulty, setSelectedDifficulty] =
    useState<QuizDifficulty>("easy");
  const [isBeginning, setIsBeginning] = useState(true);
  const [isEnd, setIsEnd] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);

  const { items: quizzes, isLoading } = useQuizzesList({
    filters: { difficulty: selectedDifficulty },
  });

  const filteredQuizzes = useMemo(() => {
    return quizzes.filter((quiz) => {
      const difficulty = quiz.publishedVersion?.difficulty;
      return !difficulty || difficulty === selectedDifficulty;
    });
  }, [quizzes, selectedDifficulty]);

  const swiperRef = useRef<SwiperType | null>(null);

  const handlePrevClick = () => {
    swiperRef.current?.slidePrev();
  };

  const handleNextClick = () => {
    swiperRef.current?.slideNext();
  };

  const handleTogglePlay = () => {
    if (!swiperRef.current) return;
    if (isPlaying) {
      swiperRef.current.autoplay?.stop();
      setIsPlaying(false);
    } else {
      swiperRef.current.autoplay?.start();
      setIsPlaying(true);
    }
  };

  return (
    <section
      className="w-full"
      role="region"
      aria-roledescription="carousel"
      aria-label="Quizzes by difficulty"
    >
      <div className="mb-6 flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-bold text-foreground sm:text-2xl tracking-tight">
            Quizzes by Difficulty
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Choose challenges tailored to your current skill and experience
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex rounded-full border border-border/80 bg-background/80 p-1 self-start sm:self-auto backdrop-blur-sm shadow-2xs">
            {DIFFICULTIES.map((level) => (
              <Button
                key={level}
                type="button"
                onClick={() => setSelectedDifficulty(level)}
                className={`rounded-full capitalize px-4 py-1 text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                  selectedDifficulty === level
                    ? `${DIFFICULTY_STYLES[level].solid} pointer-events-none shadow-xs font-semibold`
                    : `bg-transparent text-foreground dark:text-foreground-secondary ${DIFFICULTY_STYLES[level].solidHover}`
                }`}
              >
                {level}
              </Button>
            ))}
          </div>
          {filteredQuizzes.length > 0 && (
            <div className="flex items-center gap-1.5 self-end sm:self-auto">
              <Button
                size="icon"
                variant="outline"
                className="h-9 w-9 sm:h-10 sm:w-10 rounded-full border-border/80 bg-background/80 hover:bg-main-hover transition-all cursor-pointer"
                onClick={handleTogglePlay}
                aria-label={
                  isPlaying
                    ? "Pause difficulty carousel auto-play"
                    : "Resume difficulty carousel auto-play"
                }
              >
                {isPlaying ? (
                  <Pause className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Play className="h-4 w-4" aria-hidden="true" />
                )}
              </Button>
              <Button
                size="icon"
                variant="outline"
                className="h-9 w-9 sm:h-10 sm:w-10 rounded-full border-border/80 bg-background/80 hover:bg-main-hover transition-all cursor-pointer"
                onClick={handlePrevClick}
                disabled={isBeginning}
                aria-label="Previous quiz"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Button
                size="icon"
                variant="outline"
                className="h-9 w-9 sm:h-10 sm:w-10 rounded-full border-border/80 bg-background/80 hover:bg-main-hover transition-all cursor-pointer"
                onClick={handleNextClick}
                disabled={isEnd}
                aria-label="Next quiz"
              >
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-72">
          <LoadingSpinner size="lg" />
        </div>
      ) : filteredQuizzes.length === 0 ? (
        <div className="text-center min-h-72 flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 p-6">
          <p className="text-muted-foreground text-base font-medium">
            No {selectedDifficulty} quizzes available yet.
          </p>
          <p className="text-muted-foreground text-sm mt-1">
            Try switching difficulty levels or check back soon for new content.
          </p>
        </div>
      ) : (
        <div>
          <Swiper
          spaceBetween={20}
          slidesPerView={4}
          modules={[Autoplay]}
          autoplay={{
            delay: 4500,
            disableOnInteraction: false,
            pauseOnMouseEnter: true,
          }}
          onBeforeInit={(swiper) => {
            swiperRef.current = swiper;
          }}
          onInit={(swiper) => {
            setIsBeginning(swiper.isBeginning);
            setIsEnd(swiper.isEnd);
          }}
          onSlideChange={(swiper) => {
            setIsBeginning(swiper.isBeginning);
            setIsEnd(swiper.isEnd);
          }}
          breakpoints={{
            0: {
              slidesPerView: 1.15,
              spaceBetween: 12,
            },
            640: {
              slidesPerView: 2.1,
              spaceBetween: 16,
            },
            768: {
              slidesPerView: 3.1,
              spaceBetween: 20,
            },
            1024: {
              slidesPerView: 4,
              spaceBetween: 24,
            },
          }}
        >
          {filteredQuizzes.map((quiz) => (
            <SwiperSlide key={quiz.quizId} className="w-full">
              <QuizCardDifficulty
                id={quiz.quizId}
                slug={quiz.slug}
                imageSrc={quiz.imageUrl ?? "/placeholder.svg"}
                difficulty={
                  (quiz.publishedVersion?.difficulty as QuizDifficulty) ??
                  "medium"
                }
                creatorImageURL={quiz.creator?.avatarUrl ?? ""}
                creatorName={
                  quiz.creator?.displayName ??
                  quiz.creator?.username ??
                  "QuizHub Creator"
                }
                reward={quiz.publishedVersion?.rewardXp ?? 100}
                category={quiz.categoryName ?? "General"}
                duration={Math.round(
                  (quiz.publishedVersion?.durationMs ?? 60000) / 60000,
                )}
                title={quiz.title}
                currentPlayers={quiz.attemptCount ?? 0}
              />
            </SwiperSlide>
          ))}
          </Swiper>
        </div>
      )}
    </section>
  );
};

export default QuizCardDifficultyList;
