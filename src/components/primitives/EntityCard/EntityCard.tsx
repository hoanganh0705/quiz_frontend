"use client";

import Link from "next/link";
import Image, { type ImageProps } from "next/image";
import type React from "react";

import { cn } from "@/shared/utils/merge-class-names";

const CARD_OUTER =
  "group relative flex h-full flex-col overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm transition focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 hover:shadow-md";

const COVER_BASE_BASE =
  "relative w-full overflow-hidden bg-muted";

const COVER_IMG = "h-full w-full object-cover";

const BODY = "flex flex-1 flex-col gap-2 p-4";

const TITLE = "line-clamp-2 text-base font-semibold leading-snug";

const DESCRIPTION = "line-clamp-2 text-sm text-muted-foreground";

const META_ROW =
  "mt-auto flex items-center gap-2 text-xs text-muted-foreground";

const BOOKMARK_SLOT =
  "absolute right-2 top-2 z-10 rounded-md bg-card/80 p-1 backdrop-blur-sm";

export type EntityCardAspectRatio = "16/9" | "4/3" | "1/1" | "3/4";

export type EntityCardCoverSize = "sm" | "md" | "lg";

export interface EntityCardProps {
  href: string;
  title: string;
  description?: string | null;
  /**
   * Image URL for the cover. When omitted, the card renders an initials
   * fallback inside the cover area.
   */
  imageUrl?: string | null;
  /**
   * Accessible alt for the cover image. Pass an empty string for purely
   * decorative covers (the title already labels the link).
   */
  imageAlt?: string;
  /**
   * Two-character string rendered as a fallback when `imageUrl` is missing.
   * Callers compute this from their entity (e.g. id-derived initials).
   */
  initials?: string;
  aspectRatio?: EntityCardAspectRatio;
  coverSize?: EntityCardCoverSize;
  /**
   * Optional row of badges above the meta row (right side, e.g. Verified,
   * Featured, Difficulty).
   */
  meta?: React.ReactNode;
  badges?: React.ReactNode;
  /**
   * Optional bookmark slot — rendered absolute in the cover's top-right
   * corner. Intended for `BookmarkButtonSlot` callers.
   */
  bookmarkSlot?: React.ReactNode;
  /** Extra className on the outer `<a>` element. */
  className?: string;
  /** Forwarded to the `<a>` element. `href` is replaced by `href` above. */
  linkProps?: Record<string, unknown>;
  /**
   * Heading level for the title. Default `h3`. Override to `h2` when the
   * surrounding page has no `<h2>` between its `<h1>` and this card (skipping
   * levels breaks screen-reader heading navigation).
   */
  titleHeadingLevel?: 2 | 3 | 4;
}

const COVER_SIZE_CLASSES: Record<EntityCardCoverSize, string> = {
  sm: "text-base",
  md: "text-lg",
  lg: "text-2xl",
};

const FALLBACK_BASE =
  "flex h-full w-full items-center justify-center font-semibold uppercase text-muted-foreground";

/**
 * Shared card primitive for any clickable entity (quiz, category, tag, …)
 * presented as a grid tile with a cover image, title, optional description,
 * and meta row. Renders an `<a>` so the entire tile is the navigation target.
 *
 * Wrappers (e.g. `QuizCard`, `CategoryCard`) own the entity-to-prop
 * translation; `EntityCard` only knows about the shape of a card.
 */
export function EntityCard({
  href,
  title,
  description,
  imageUrl,
  imageAlt = "",
  initials,
  aspectRatio = "16/9",
  coverSize = "md",
  meta,
  badges,
  bookmarkSlot,
  className,
  linkProps,
  titleHeadingLevel = 3,
}: EntityCardProps) {
  const coverStyle: ImageProps["style"] = {
    aspectRatio,
  };

  const TitleTag = (`h${titleHeadingLevel}` as 'h2' | 'h3' | 'h4');

  return (
    <Link
      href={href}
      className={cn(CARD_OUTER, className)}
      {...linkProps}
    >
      <div className={cn(COVER_BASE_BASE)} style={coverStyle}>
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={imageAlt}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 960px) 50vw, (max-width: 1280px) 33vw, 25vw"
            loading="lazy"
            className={COVER_IMG}
          />
        ) : initials ? (
          <span
            aria-hidden="true"
            className={cn(FALLBACK_BASE, COVER_SIZE_CLASSES[coverSize])}
          >
            {initials}
          </span>
        ) : null}
        {bookmarkSlot ? (
          <div className={BOOKMARK_SLOT}>{bookmarkSlot}</div>
        ) : null}
      </div>
      <div className={BODY}>
        <TitleTag className={TITLE}>{title}</TitleTag>
        {description ? (
          <p className={DESCRIPTION}>{description}</p>
        ) : null}
        {(badges || meta) && (
          <div className={META_ROW}>
            {badges}
            {meta ? <span className="ml-auto">{meta}</span> : null}
          </div>
        )}
      </div>
    </Link>
  );
}

export default EntityCard;