"use client";

import "swiper/css";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { difficultyColors } from "@/features/quizzes/constants/difficulty-color";
import { QuizCardDifficulty } from "@/features/quizzes/components/QuizCard";
import { useState, useMemo, useRef } from "react";
import { SwiperSlide, Swiper } from "swiper/react";
import type { Swiper as SwiperType } from "swiper";
import { Autoplay } from "swiper/modules";
import { useQuizzesList } from "@/features/quizzes/hooks";
import type { QuizDifficulty } from "@/features/quizzes/types";
import { LoadingSpinner } from "@/components/ui/loading-states/LoadingSpinner";

const DIFFICULTIES: QuizDifficulty[] = ["easy", "medium", "hard"];

const QuizCardDifficultyList = () => {
const [selectedDifficulty, setSelectedDifficulty] =
useState<QuizDifficulty>("easy");
const [isBeginning, setIsBeginning] = useState(true);
const [isEnd, setIsEnd] = useState(false);

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
    <div className="w-full">
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
                onClick={() => setSelectedDifficulty(level)}
                className={`rounded-full px-4 py-1 text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                  selectedDifficulty === level
                    ? `${difficultyColors[level].bg} pointer-events-none text-white dark:text-foreground shadow-xs font-semibold`
                    : `bg-transparent text-foreground dark:text-foreground-secondary ${difficultyColors[level].hover}`
                }`}
              >
                {level}
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <Button
              size="icon"
              variant="outline"
              className="h-9 w-9 rounded-full border-border/80 bg-background/80 hover:bg-main-hover transition-all"
              onClick={handlePrevClick}
              disabled={isBeginning}
              aria-label="Previous quiz"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="outline"
              className="h-9 w-9 rounded-full border-border/80 bg-background/80 hover:bg-main-hover transition-all"
              onClick={handleNextClick}
              disabled={isEnd}
              aria-label="Next quiz"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

<div>
<Swiper
spaceBetween={30}
slidesPerView={4}
pagination={{ clickable: true }}
modules={[Autoplay]}
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
