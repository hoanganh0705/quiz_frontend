"use client";
import { useId } from "react";
import * as React from "react";

import { cn } from "@/shared/utils/merge-class-names";
import { QuizCardGrid } from "@/components/primitives/QuizCard/QuizCardGrid";
import type { QuizListItemDto } from "@/lib/api/generated/schemas";

export type QuizRailLayout = "scroller" | "grid";

export interface QuizRailProps<T = QuizListItemDto> {
  title: string;
  subtitle?: string;
  filter?: React.ReactNode;
  children: React.ReactNode;
  layout?: QuizRailLayout;
  gridItems?: readonly T[];
  toQuiz?: (item: T) => QuizListItemDto;
  className?: string;
}

const SCROLLER_OUTER =
  "flex flex-row gap-4 overflow-x-auto snap-x snap-mandatory pb-2";
const SCROLLER_CARD = "snap-start shrink-0 basis-[260px] sm:basis-[280px]";

function wrapChildrenInScroller(children: React.ReactNode): React.ReactElement {
  return (
    <>
      {React.Children.map(children, (child, index) => (
        <div
          key={index}
          className={SCROLLER_CARD}
          data-testid="quiz-rail-scroller-cell"
        >
          {child}
        </div>
      ))}
    </>
  );
}

export function QuizRail<T = QuizListItemDto>({
  title,
  subtitle,
  filter,
  children,
  layout = "scroller",
  gridItems,
  toQuiz,
  className,
}: QuizRailProps<T>): React.ReactElement {
  const headingId = useId();

  return (
    <section
      aria-labelledby={headingId}
      data-testid="quiz-rail"
      data-layout={layout}
      className={cn("flex flex-col gap-3", className)}
    >
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col">
          <h2
            id={headingId}
            className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl"
          >
            {title}
          </h2>
          {subtitle ? (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
        {filter ? (
          <div data-testid="quiz-rail-filter-slot">{filter}</div>
        ) : null}
      </header>

      {layout === "grid" ? (
        <QuizCardGrid items={gridItems} toQuiz={toQuiz as never} />
      ) : (
        <div className={SCROLLER_OUTER} data-testid="quiz-rail-scroller">
          {wrapChildrenInScroller(children)}
        </div>
      )}
    </section>
  );
}
