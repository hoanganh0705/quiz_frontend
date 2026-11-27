"use client";

import { EntityCard } from "@/components/primitives/EntityCard";

import {
  gradientFromId,
  initialsFromId,
} from "@/shared/utils/entity-decoration";

import type { CategoryResponseDto } from "@/lib/api/generated/schemas";

export type CategoryCardItem = Pick<
  CategoryResponseDto,
  "categoryId" | "name" | "slug" | "description" | "imageUrl"
>;

export interface CategoryCardProps {
  category: CategoryCardItem;
  className?: string;
  titleHeadingLevel?: 2 | 3 | 4;
}

export function CategoryCard({
  category,
  className,
  titleHeadingLevel,
}: CategoryCardProps) {
  const href = `/categories/${category.slug || category.categoryId}`;

  return (
    <EntityCard
      href={href}
      title={category.name}
      description={category.description}
      imageUrl={category.imageUrl}
      initials={initialsFromId(category.categoryId)}
      fallbackBackground={gradientFromId(category.categoryId)}
      aspectRatio="4/3"
      coverSize="lg"
      className={className}
      titleHeadingLevel={titleHeadingLevel}
      linkProps={{
        "data-testid": "category-card",
        "data-category-id": category.categoryId,
        "data-category-slug": category.slug,
      }}
      meta={
        <span className="tabular-nums font-mono text-xs text-muted-foreground/75 group-hover:text-muted-foreground transition-colors">
          /{category.slug}
        </span>
      }
    />
  );
}
