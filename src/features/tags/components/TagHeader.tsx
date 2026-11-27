import { formatShortDate } from "@/shared/utils/date-utils";

import type { TagResponseDto } from "@/lib/api/generated/schemas";

export interface TagHeaderProps {
  tag: TagResponseDto;

  locale?: string;
}

export function TagHeader({
  tag,
  locale = "en-US",
}: TagHeaderProps): React.ReactElement {
  return (
    <header className="mb-8" data-testid="tag-header">
      <div className="flex items-baseline gap-3">
        <h1
          className="text-3xl font-bold text-foreground"
          data-testid="tag-header-title"
        >
          {tag.name}
        </h1>
        <span
          className="text-sm text-muted-foreground font-mono tabular-nums"
          data-testid="tag-header-slug"
        >
          {tag.slug}
        </span>
      </div>

      <p
        className="mt-2 text-xs text-muted-foreground"
        data-testid="tag-header-created-at"
      >
        Created {formatShortDate(tag.createdAt, locale)}
      </p>
    </header>
  );
}
