"use client";

import "swiper/css";
import "swiper/css/free-mode";
import "swiper/css/scrollbar";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { difficultyColors } from "@/features/quizzes/constants/difficulty-color";
import { QuizCardDifficulty } from "@/features/quizzes/components/QuizCard";
import { useState, useMemo, useRef } from "react";
import { SwiperSlide, Swiper } from "swiper/react";
import type { Swiper as SwiperType } from "swiper";
import { Autoplay, Navigation } from "swiper/modules";
import { useQuizzesList } from "@/features/quizzes/hooks";
import type { QuizDifficulty } from "@/features/quizzes/types";
import { LoadingSpinner } from "@/components/ui/loading-states/LoadingSpinner";

const DIFFICULTIES: QuizDifficulty[] = ["easy", "medium", "hard"];

const QuizCardDifficultyList = () => {
  const [selectedDifficulty, setSelectedDifficulty] =
    useState<QuizDifficulty>("easy");
  const [isBeginning, setIsBeginning] = useState(true);
  const [isEnd, setIsEnd] = useState(false);

  // Fetch all quizzes (we filter by difficulty client-side)
  const { items: quizzes, isLoading } = useQuizzesList({ filters: {} });

  const filteredQuizzes = useMemo(() => {
    return quizzes.filter((quiz) => {
      const difficulty = quiz.publishedVersion?.difficulty;
      return difficulty === selectedDifficulty;
    });
  }, [quizzes, selectedDifficulty]);

  const swiperRef = useRef<SwiperType | null>(null);

  const handlePrevClick = () => {
    swiperRef.current?.slidePrev();
  };

  const handleNextClick = () => {
    swiperRef.current?.slideNext();
  };

  if (isLoading) {
    return (
      <div className="mt-20 flex items-center justify-center min-h-100">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (filteredQuizzes.length === 0) {
    return (
      <div className="mt-20 text-center min-h-100 flex flex-col items-center justify-center">
        <p className="text-muted-foreground text-lg">
          No {selectedDifficulty} quizzes available yet.
        </p>
        <p className="text-muted-foreground text-sm mt-2">
          Check back soon for new content.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-20">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground md:text-2xl">
            Quizzes by Difficulty
          </h1>
          <p className="text-md text-muted-foreground md:text-base">
            Choose challenges according to your skill level
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg bg-muted p-1">
            {DIFFICULTIES.map((level) => (
              <Button
                key={level}
                onClick={() => setSelectedDifficulty(level)}
                className={`rounded-sm px-4 py-1 text-sm transition ${
                  selectedDifficulty === level
                    ? `${difficultyColors[level].bg} pointer-events-none text-white dark:text-foreground`
                    : `bg-transparent text-foreground dark:text-foreground/70 ${difficultyColors[level].hover}`
                }`}
              >
                {level}
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              onClick={handlePrevClick}
              disabled={isBeginning}
              aria-label="Previous quiz"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              onClick={handleNextClick}
              disabled={isEnd}
              aria-label="Next quiz"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="xl:w-full container">
        <Swiper
          spaceBetween={30}
          slidesPerView={4}
          pagination={{ clickable: true }}
          modules={[Navigation, Autoplay]}
          autoplay={{
            delay: 3000,
            disableOnInteraction: true,
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
              slidesPerView: 1,
              spaceBetween: 10,
            },
            640: {
              slidesPerView: 2,
              spaceBetween: 15,
            },
            768: {
              slidesPerView: 3,
              spaceBetween: 20,
            },
            1024: {
              slidesPerView: 4,
              spaceBetween: 25,
            },
          }}
        >
          {filteredQuizzes.map((quiz) => (
            <SwiperSlide key={quiz.quizId} className="w-full">
              <QuizCardDifficulty
                id={quiz.quizId}
                imageSrc={quiz.imageUrl ?? "/placeholder.svg"}
                difficulty={
                  (quiz.publishedVersion?.difficulty as QuizDifficulty) ??
                  "medium"
                }
                creatorImageURL={quiz.creator?.avatarUrl ?? ""}
                creatorName={
                  quiz.creator?.displayName ??
                  quiz.creator?.username ??
                  "Unknown"
                }
                reward={0}
                category={quiz.categoryName ?? "General"}
                duration={Math.round(
                  (quiz.publishedVersion?.durationMs ?? 600000) / 60000,
                )}
                title={quiz.title}
                currentPlayers={0}
                spotsAvailable={100}
                maxPlayers={100}
              />
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </div>
  );
};

export default QuizCardDifficultyList;
