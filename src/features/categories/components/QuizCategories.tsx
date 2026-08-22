"use client";

import "swiper/css";
import "swiper/css/free-mode";
import "swiper/css/scrollbar";
import Image from "next/image";
import Link from "next/link";
import { Swiper, SwiperSlide } from "swiper/react";
import { Button } from "@/components/ui/Button";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { Autoplay, Navigation } from "swiper/modules";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { Swiper as SwiperType } from "swiper";

interface CategoryCardProps {
  categoryId: string;
  name: string;
  description?: string | null;
  slug: string;
  imageUrl?: string | null;
}

function CategoryCard({ name, slug, imageUrl }: CategoryCardProps) {
  return (
    <Link
      href={`/quizzes?category=${encodeURIComponent(slug)}`}
      className="block w-full h-45 sm:h-50 overflow-hidden max-w-full min-w-0"
    >
      <div className="relative w-full h-full rounded-xl overflow-hidden shadow-lg transition-transform duration-300">
        <Image
          src={imageUrl || "/placeholder.svg"}
          alt={`${name} Quiz Background`}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 40vw, 25vw"
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-linear-to-t from-black/70 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-3 left-3 sm:top-4 sm:left-4 bg-gray-800/70 text-white px-2 py-1 sm:px-3 rounded-full text-xs sm:text-sm font-medium z-10">
          {name}
        </div>
      </div>
    </Link>
  );
}

const AUTOPLAY_DELAY_MS = 3000;

function subscribeReducedMotion(): () => void {
  if (typeof window === "undefined") return () => undefined;
  const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
  const handler = (): void => {
    mql.dispatchEvent(new Event("change"));
  };
  mql.addEventListener("change", handler);
  return () => mql.removeEventListener("change", handler);
}

function getReducedMotionSnapshot(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getReducedMotionServerSnapshot(): boolean {
  return false;
}

export default function QuizCategories({
  categories,
}: {
  categories: CategoryCardProps[];
}) {
  const swiperRef = useRef<SwiperType | null>(null);
  const [isBeginning, setIsBeginning] = useState(true);
  const [isEnd, setIsEnd] = useState(false);
  const prefersReducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot,
  );
  const [userAutoplay, setUserAutoplay] = useState(false);

  const autoplayEnabled = !prefersReducedMotion && userAutoplay;

  // If the user toggles OS reduced-motion on after mount, force-pause.
  useEffect(() => {
    if (prefersReducedMotion && userAutoplay) {
      setUserAutoplay(false);
    }
  }, [prefersReducedMotion, userAutoplay]);

  return (
    <section
      className="w-full max-w-full overflow-hidden mb-10"
      role="region"
      aria-roledescription="carousel"
      aria-label="Quiz categories carousel"
    >
      <div className="flex items-center justify-between mb-4 sm:mb-6 px-4 sm:px-6">
        <h2 className="text-xl sm:text-2xl font-bold text-foreground">
          Quiz Categories
        </h2>
        <div className="flex gap-2">
          <Button
            size="icon"
            className="h-10 w-10"
            disabled={isBeginning}
            onClick={() => swiperRef.current?.slidePrev()}
            aria-label="Previous category"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            size="icon"
            className="h-10 w-10"
            disabled={isEnd}
            onClick={() => swiperRef.current?.slideNext()}
            aria-label="Next category"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            size="icon"
            className="h-10 w-10"
            onClick={() => setUserAutoplay((v) => !v)}
            aria-pressed={autoplayEnabled}
            aria-label={
              autoplayEnabled
                ? "Pause carousel auto-play"
                : "Resume carousel auto-play"
            }
            disabled={prefersReducedMotion}
          >
            {autoplayEnabled ? (
              <Pause className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Play className="h-4 w-4" aria-hidden="true" />
            )}
          </Button>
        </div>
      </div>
      <div className="w-full overflow-x-hidden px-4 sm:px-6">
        <Swiper
          onBeforeInit={(swiper) => {
            swiperRef.current = swiper;
          }}
          onSlideChange={(swiper) => {
            setIsBeginning(swiper.isBeginning);
            setIsEnd(swiper.isEnd);
          }}
          onInit={(swiper) => {
            setIsBeginning(swiper.isBeginning);
            setIsEnd(swiper.isEnd);
          }}
          pagination={{ clickable: true }}
          modules={[Navigation, Autoplay]}
          autoplay={
            autoplayEnabled
              ? { delay: AUTOPLAY_DELAY_MS, disableOnInteraction: true }
              : false
          }
          watchOverflow={true}
          centerInsufficientSlides={true}
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
              slidesPerView: 2.5,
              spaceBetween: 20,
            },
            1024: {
              slidesPerView: 3,
              spaceBetween: 25,
            },
            1280: {
              slidesPerView: 4,
              spaceBetween: 30,
            },
          }}
          className="w-full max-w-full"
        >
          {(categories ?? []).map((category) => (
            <SwiperSlide
              key={category.categoryId}
              className="min-w-0 max-w-full"
            >
              <CategoryCard
                categoryId={category.categoryId}
                name={category.name}
                slug={category.slug}
                imageUrl={category.imageUrl}
              />
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </section>
  );
}
