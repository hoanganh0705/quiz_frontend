"use client";

import "swiper/css";
import "swiper/css/navigation";
import Image from "next/image";
import Link from "next/link";
import { Swiper, SwiperSlide } from "swiper/react";
import { Button } from "@/components/ui/Button";
import { ChevronLeft, ChevronRight, Compass } from "lucide-react";
import { Navigation } from "swiper/modules";
import { useRef, useState } from "react";
import type { Swiper as SwiperType } from "swiper";

interface CategoryCardProps {
  categoryId: string;
  name: string;
  description?: string | null;
  slug: string;
  imageUrl?: string | null;
}

const CATEGORY_EMOJIS: Record<string, string> = {
  geography: "🌍",
  history: "📜",
  science: "🔬",
  technology: "💻",
  mathematics: "📐",
  sports: "⚽",
};

function CategoryCard({ name, slug, imageUrl }: CategoryCardProps) {
  const emoji = CATEGORY_EMOJIS[slug.toLowerCase()] ?? "✨";

  return (
    <Link
      href={`/quizzes?category=${encodeURIComponent(slug)}`}
      className="group block w-full h-48 sm:h-52 overflow-hidden max-w-full min-w-0 rounded-2xl border border-border/70 hover:border-brand/40 shadow-sm hover:shadow-lg transition-all duration-300"
    >
      <div className="relative w-full h-full rounded-2xl overflow-hidden bg-muted">
        <Image
          src={imageUrl || "/placeholder.svg"}
          alt={`${name} Quiz Background`}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 40vw, 25vw"
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-110"
          priority
        />
        {/* Subtle dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/30 pointer-events-none transition-opacity group-hover:opacity-90" />

        {/* Category Pill Tag */}
        <div className="absolute top-3.5 left-3.5 flex items-center gap-1.5 rounded-full bg-black/50 backdrop-blur-md border border-white/15 px-3 py-1 text-xs font-semibold text-white shadow-xs z-10">
          <span className="text-sm" aria-hidden="true">
            {emoji}
          </span>
          <span>{name}</span>
        </div>

        {/* Hover footer reveal */}
        <div className="absolute inset-x-0 bottom-0 p-3.5 flex items-center justify-between text-white/90 z-10 translate-y-1 group-hover:translate-y-0 transition-transform">
          <span className="text-xs font-medium tracking-wide">
            Explore quizzes
          </span>
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/20 backdrop-blur-xs text-xs font-bold transition-transform group-hover:translate-x-1 group-hover:bg-brand">
            →
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function QuizCategories({
  categories,
}: {
  categories: CategoryCardProps[];
}) {
  const swiperRef = useRef<SwiperType | null>(null);
  const [isBeginning, setIsBeginning] = useState(true);
  const [isEnd, setIsEnd] = useState(false);

  return (
    <section
      className="w-full max-w-full overflow-hidden"
      role="region"
      aria-roledescription="carousel"
      aria-label="Quiz categories carousel"
    >
      <div className="flex items-center justify-between mb-5 px-1 sm:px-2">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand/10 text-brand border border-brand/20">
            <Compass className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Quiz Categories
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Browse arenas tailored to your curiosity and passions
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            size="icon"
            variant="outline"
            className="h-9 w-9 rounded-full border-border/80 bg-background/80 hover:bg-main-hover transition-all"
            disabled={isBeginning}
            onClick={() => swiperRef.current?.slidePrev()}
            aria-label="Previous category"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            className="h-9 w-9 rounded-full border-border/80 bg-background/80 hover:bg-main-hover transition-all"
            disabled={isEnd}
            onClick={() => swiperRef.current?.slideNext()}
            aria-label="Next category"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>

      <div className="w-full overflow-x-hidden px-1 sm:px-2">
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
          modules={[Navigation]}
          watchOverflow={true}
          centerInsufficientSlides={true}
          breakpoints={{
            0: {
              slidesPerView: 1.2,
              spaceBetween: 12,
            },
            480: {
              slidesPerView: 2.1,
              spaceBetween: 14,
            },
            768: {
              slidesPerView: 3.1,
              spaceBetween: 16,
            },
            1024: {
              slidesPerView: 4,
              spaceBetween: 20,
            },
          }}
          className="w-full max-w-full pb-4!"
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
