"use client";

import Link from "next/link";

import { cn } from "@/shared/utils/merge-class-names";

import type { TagResponseDto } from "@/lib/api/generated/schemas";

const PILL_BASE =
  "inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-foreground min-h-[30px]";
const CLICKABLE_PILL =
  "relative min-h-8 sm:min-h-[34px] px-3 py-1 shadow-2xs transition-[transform,background-color,border-color,box-shadow] duration-150 ease-out after:absolute after:-inset-y-1.5 after:inset-x-0 after:content-[''] sm:after:hidden hover:-translate-y-0.5 hover:border-brand/40 hover:bg-accent hover:shadow-xs active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:border-default focus-visible:ring-[3px] focus-visible:ring-ring/50";
const SWATCH_BASE = "inline-block h-2 w-2 shrink-0 rounded-full";

export type TagPillVariant = "default" | "clickable";

export type TagPillTag = Pick<TagResponseDto, "tagId" | "name" | "slug"> &
  Partial<Pick<TagResponseDto, "createdAt" | "updatedAt">>;

export interface TagPillProps {
  tag: TagPillTag;
  variant?: TagPillVariant;
  rank?: number;
  countLabel?: string;
  className?: string;
}

// Five swatches drawn from --tag-swatch-1..5 in globals.css.
const SWATCH_TOKEN_CLASSES = [
  "bg-tag-swatch-1",
  "bg-tag-swatch-2",
  "bg-tag-swatch-3",
  "bg-tag-swatch-4",
  "bg-tag-swatch-5",
] as const;

function swatchClassFromTag(tag: TagPillTag): string {
  let hash = 0;
  for (let i = 0; i < tag.tagId.length; i += 1) {
    hash = (hash * 31 + tag.tagId.charCodeAt(i)) >>> 0;
  }
  const idx = hash % SWATCH_TOKEN_CLASSES.length;
  return SWATCH_TOKEN_CLASSES[idx]!;
}

export function TagPill({
  tag,
  variant = "default",
  rank,
  countLabel,
  className,
}: TagPillProps) {
  const swatchClass = swatchClassFromTag(tag);

  const fullLabelTitle = tag.name.length > 18 ? tag.name : undefined;

  const inner = (
    <>
      {typeof rank === "number" ? (
        <span
          className="font-mono text-xs font-semibold tabular-nums text-muted-foreground"
          data-testid="tag-pill-rank"
        >
          #{rank}
        </span>
      ) : null}
      <span className="inline-flex min-w-0 items-center gap-1.5">
        <span aria-hidden="true" className={cn(SWATCH_BASE, swatchClass)} />
        <span className="truncate max-w-[22ch]">{tag.name}</span>
      </span>
      {countLabel ? (
        <span
          className="font-mono text-xs tabular-nums text-muted-foreground"
          data-testid="tag-pill-count"
        >
          {countLabel}
        </span>
      ) : null}
    </>
  );

  if (variant === "clickable") {
    const href = `/tags/${tag.slug || tag.tagId}`;
    return (
      <Link
        href={href}
        title={fullLabelTitle}
        className={cn(PILL_BASE, CLICKABLE_PILL, className)}
        data-testid="tag-pill"
        data-tag-id={tag.tagId}
        data-tag-slug={tag.slug}
        data-variant="clickable"
      >
        {inner}
      </Link>
    );
  }

  return (
    <span
      title={fullLabelTitle}
      className={cn(PILL_BASE, className)}
      data-testid="tag-pill"
      data-tag-id={tag.tagId}
      data-tag-slug={tag.slug}
      data-variant="default"
    >
      {inner}
    </span>
  );
}
