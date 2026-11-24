import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

export interface QuizGridLoadMoreProps {
  hasMore: boolean;
  isLoading: boolean;
  onLoadMore: () => void;
}

export function QuizGridLoadMore({
  hasMore,
  isLoading,
  onLoadMore,
}: QuizGridLoadMoreProps): React.ReactElement | null {
  if (!hasMore) {
    return null;
  }

  return (
    <div
      className="mt-6 flex flex-col items-center gap-2"
      role="status"
      aria-live="polite"
      data-testid="quiz-grid-load-more"
    >
      <Button
        variant="outline"
        onClick={onLoadMore}
        disabled={isLoading}
        aria-disabled={isLoading}
        data-testid="quiz-grid-load-more-button"
        className="min-w-[180px] transition-all duration-200 hover:border-brand/40"
      >
        {isLoading && (
          <Loader2
            className="mr-2 h-4 w-4 animate-spin text-brand"
            aria-hidden="true"
          />
        )}
        {isLoading ? "Loading more quizzes…" : "Load more quizzes"}
      </Button>
    </div>
  );
}
