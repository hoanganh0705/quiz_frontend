

import type {
CategoryResponseDto,
RankedCategoryResponseDto,
} from '@/lib/api/generated/schemas'

export function rankedCategoryToCategoryResponse(
ranked: RankedCategoryResponseDto,
): CategoryResponseDto {
return {
categoryId: ranked.categoryId,
name: ranked.name,
slug: ranked.slug,
description: ranked.description ?? null,
imageUrl: ranked.imageUrl ?? null,
createdAt: '',
updatedAt: '',
  }
}
