"use client";

import type React from "react";
import { useState, useMemo, useEffect } from "react";
import { Input } from "@/components/ui/Input";
import { TextSkeleton } from "@/components/ui/loading-states/Skeletons";
import { Button } from "@/components/ui/Button";
import {
  Search,
  ArrowRight,
  BookOpen,
  User,
  CreditCard,
  PlusCircle,
  Trophy,
  Shield,
  Settings,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import type { ArticleIconName } from "@/features/support/types/articles";
import { getSupportArticles } from "@/features/support/api";
import type { SupportArticle } from "@/features/support/api";

const iconMap: Record<
  ArticleIconName,
  React.ComponentType<{ className?: string }>
> = {
  "book-open": BookOpen,
  user: User,
  "credit-card": CreditCard,
  "plus-circle": PlusCircle,
  trophy: Trophy,
  shield: Shield,
  settings: Settings,
};

type FetchState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok"; articles: SupportArticle[] }
  | { kind: "error"; error: Error };

/**
 * `KnowledgeBase` — searchable article grid.
 *
 * Data source is exclusively `getSupportArticles()`. If the backend
 * fails (network error, 5xx, etc.) the component surfaces an error
 * state with a retry button. There is **no** silent fallback to a
 * static fixture. If the backend isn't reachable we say so.
 *
 * State management is intentionally a discriminated union rather
 * than the shared `useAsyncAction` helper so that the success / error
 * / loading / idle branches are exhaustive at the type level.
 */
export function KnowledgeBase({
  category,
}: {
  category?: string;
}): React.ReactElement {
  const [searchQuery, setSearchQuery] = useState("");
  const [state, setState] = useState<FetchState>({ kind: "idle" });
  const [selectedArticle, setSelectedArticle] = useState<SupportArticle | null>(
    null,
  );

  const fetchArticles = () => {
    setState({ kind: "loading" });
    void getSupportArticles()
      .then((articles) => {
        setState({ kind: "ok", articles });
      })
      .catch((error: unknown) => {
        setState({
          kind: "error",
          error: error instanceof Error ? error : new Error(String(error)),
        });
      });
  };

  useEffect(() => {
    fetchArticles();
    // Intentional: fetch once on mount. `fetchArticles` is a stable
    // closure-local function (defined inline above) so we ignore
    // the eslint warning deliberately.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRetry = () => {
    fetchArticles();
  };

  const displayArticles: SupportArticle[] =
    state.kind === "ok" ? state.articles : [];

  const filteredArticles = useMemo(() => {
    const byCategory =
      category && category !== "all"
        ? displayArticles.filter(
            (a) => a.category.toLowerCase().replace(/\s+/g, "-") === category,
          )
        : displayArticles;

    if (!searchQuery.trim()) return byCategory;

    const query = searchQuery.toLowerCase();
    return byCategory.filter(
      (a) =>
        a.title.toLowerCase().includes(query) ||
        a.excerpt?.toLowerCase().includes(query) ||
        a.category.toLowerCase().includes(query),
    );
  }, [displayArticles, category, searchQuery]);

  const isLoading = state.kind === "loading" || state.kind === "idle";
  const error = state.kind === "error" ? state.error : null;

  const categoryTitle =
    category && category !== "all"
      ? `${category
          .split("-")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ")} Knowledge Base`
      : "Knowledge Base";

  return (
    <div className="space-y-6 rounded-xl border border-border/80 bg-card p-6 shadow-xs sm:p-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center mb-8">
        <h2 className="text-2xl font-bold text-foreground">{categoryTitle}</h2>
        <div className="relative w-full sm:w-80">
          <label htmlFor="kb-search" className="sr-only">
            Search articles
          </label>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="kb-search"
            aria-label="Search articles"
            placeholder="Search articles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border-border bg-transparent pl-10 pr-9 text-foreground placeholder:text-muted-foreground"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="border border-border rounded-lg p-6 space-y-3"
            >
              <div className="flex items-center gap-2">
                <TextSkeleton lines={1} className="w-20" />
                <TextSkeleton lines={1} className="w-16" />
              </div>
              <TextSkeleton lines={2} />
              <TextSkeleton lines={1} />
            </div>
          ))}
        </div>
      )}

      {error && (
        <div
          className="text-center py-12 space-y-4"
          role="alert"
          data-testid="kb-error"
        >
          <p className="text-destructive text-sm font-medium">
            Failed to load articles. Please try again.
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={handleRetry}
            data-testid="kb-retry"
          >
            Retry
          </Button>
        </div>
      )}

      {state.kind === "ok" && filteredArticles.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredArticles.map((article) => {
            const IconComponent =
              iconMap[article.icon as ArticleIconName] ?? BookOpen;
            const readTime = article.readTime ?? "5 min read";
            return (
              <div
                key={article.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedArticle(article)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedArticle(article);
                  }
                }}
                className="group cursor-pointer rounded-xl border border-border/80 bg-card p-6 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="rounded-md bg-primary/10 p-1.5 text-primary">
                      <IconComponent className="h-4 w-4" />
                    </div>
                    <Badge variant="outline" className="font-mono text-xs">
                      {article.category}
                    </Badge>
                  </div>
                  <span className="text-xs font-mono text-muted-foreground">
                    {readTime}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2 transition-colors group-hover:text-primary">
                  {article.title}
                </h3>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {article.excerpt ?? article.content ?? ""}
                </p>
                <div className="flex items-center text-sm font-medium text-foreground transition-colors group-hover:text-primary">
                  <span>Read article</span>
                  <ArrowRight className="h-4 w-4 ml-1 transition-transform duration-200 group-hover:translate-x-1" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {state.kind === "ok" && filteredArticles.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground text-sm">
            No articles found matching your search.
          </p>
        </div>
      )}

      {/* Article Reader Dialog */}
      <Dialog
        open={Boolean(selectedArticle)}
        onOpenChange={(open) => !open && setSelectedArticle(null)}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="font-mono text-xs">
                {selectedArticle?.category}
              </Badge>
              <span className="text-xs font-mono text-muted-foreground">
                {selectedArticle?.readTime ?? "5 min read"}
              </span>
            </div>
            <DialogTitle className="text-xl font-bold text-foreground">
              {selectedArticle?.title}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {selectedArticle?.excerpt}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-4 border-t border-border pt-4 text-sm leading-relaxed text-foreground/90">
            {selectedArticle?.content ? (
              <p className="whitespace-pre-line">{selectedArticle.content}</p>
            ) : (
              <p>
                This article provides comprehensive guidance on {selectedArticle?.title.toLowerCase()}.
                For further technical or billing questions, reach out via the Contact Support tab.
              </p>
            )}
          </div>
          <DialogFooter className="mt-6 border-t border-border pt-4 sm:flex sm:items-center sm:justify-between">
            <span className="font-mono text-xs text-muted-foreground">
              QuizHub Help Docs
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSelectedArticle(null)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
