"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useMutation, useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  AlertTriangle,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Loader2,
  Pencil,
  Plus,
  RotateCw,
  Search,
  Trash2,
  X,
} from "lucide-react";

import { DEFAULT_TOAST_DURATION_MS, useToast } from "@/lib/forms/useToast";
import { getQueryClient } from "@/providers/QueryProvider";

import {
  adminUpdateQuiz,
  deleteQuiz,
  listQuizzes,
  updateQuiz,
} from "@/features/quizzes/services/quizzes.service";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/AlertDialog";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Skeleton } from "@/components/ui/Skeleton";
import { Switch } from "@/components/ui/Switch";
import { Textarea } from "@/components/ui/Textarea";

import { PAGE_CONTAINER_CLASS } from "@/shared/layout/constants";
import { cn } from "@/shared/utils/merge-class-names";

import type {
  AdminUpdateQuizDto,
  QuizControllerListQuizzes200,
  QuizResponseDto,
  UpdateQuizDto,
} from "@/lib/api/generated/schemas";

type StatusFilter = "all" | "featured" | "hidden";

const PAGE_SIZE = 20;
const QUIZ_ADMIN_QUERY_KEY = "admin-quizzes";
const DESKTOP_ROW_GRID_CLASS =
  "lg:grid lg:grid-cols-[minmax(0,1fr)_172px_140px_112px_136px] lg:items-center lg:gap-4";

const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "2-digit",
});

function formatCreatedDate(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return "—";
  return DATE_FORMATTER.format(parsed);
}

function extractQuizItems(
  response: QuizControllerListQuizzes200 | undefined,
): QuizResponseDto[] {
  if (!response || !Array.isArray(response.data)) return [];
  return response.data as unknown as QuizResponseDto[];
}

interface EditQuizDialogProps {
  quiz: QuizResponseDto | null;
  onClose: () => void;
  onSaved: (quizTitle: string) => void;
}

function EditQuizDialog({ quiz, onClose, onSaved }: EditQuizDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isFeatured, setIsFeatured] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!quiz) return;
    /* eslint-disable react-hooks/set-state-in-effect */
    setTitle(quiz.title);
    setDescription(quiz.description ?? "");
    setIsFeatured(Boolean(quiz.isFeatured));
    setIsHidden(Boolean(quiz.isHidden));
    setErrorMessage(null);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [quiz]);

  const mutation = useMutation(
    {
      mutationFn: async (payload: {
        quizId: string;
        dto: UpdateQuizDto;
        adminDto?: AdminUpdateQuizDto;
      }) => {
        await updateQuiz(payload.quizId, payload.dto);
        if (payload.adminDto) {
          await adminUpdateQuiz(payload.quizId, payload.adminDto);
        }
      },
      onSuccess: () => {
        void getQueryClient().invalidateQueries({
          queryKey: [QUIZ_ADMIN_QUERY_KEY],
        });
        onSaved(title.trim() || quiz?.title || "Quiz");
        onClose();
      },
      onError: (err: unknown) => {
        setErrorMessage(
          err instanceof Error
            ? err.message
            : "Failed to update quiz. Please try again.",
        );
      },
    },
    getQueryClient(),
  );

  const isDirty = useMemo(() => {
    if (!quiz) return false;
    return (
      title.trim() !== quiz.title ||
      (description.trim() || "") !== (quiz.description ?? "") ||
      isFeatured !== Boolean(quiz.isFeatured) ||
      isHidden !== Boolean(quiz.isHidden)
    );
  }, [quiz, title, description, isFeatured, isHidden]);

  const handleSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!quiz) return;
      const trimmedTitle = title.trim();
      if (trimmedTitle.length < 3) {
        setErrorMessage("Title must be at least 3 characters.");
        return;
      }
      setErrorMessage(null);
      const flagsChanged =
        isFeatured !== Boolean(quiz.isFeatured) ||
        isHidden !== Boolean(quiz.isHidden);
      mutation.mutate({
        quizId: quiz.quizId,
        dto: {
          title: trimmedTitle,
          description: description.trim() || null,
        },
        ...(flagsChanged ? { adminDto: { isFeatured, isHidden } } : {}),
      });
    },
    [quiz, title, description, isFeatured, isHidden, mutation],
  );

  return (
    <Dialog
      open={quiz !== null}
      onOpenChange={(open) => {
        if (!open && !mutation.isPending) onClose();
      }}
    >
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="space-y-5">
          <DialogHeader>
            <DialogTitle>Edit &amp; Moderate Quiz</DialogTitle>
            <DialogDescription>
              Update quiz details or toggle visibility and featured placement.
            </DialogDescription>
          </DialogHeader>

          {errorMessage && (
            <div
              className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive"
              role="alert"
            >
              {errorMessage}
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="admin-quiz-title">Title</Label>
              <Input
                id="admin-quiz-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={mutation.isPending}
                required
                minLength={3}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="admin-quiz-description">Description</Label>
              <Textarea
                id="admin-quiz-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={mutation.isPending}
                rows={3}
                placeholder="Brief summary shown on quiz cards"
              />
            </div>

            <div className="rounded-xl border border-border bg-muted/20 p-4 divide-y divide-border/60">
              <div className="flex items-center justify-between gap-4 pb-3">
                <div className="space-y-0.5">
                  <Label
                    htmlFor="admin-quiz-featured"
                    className="text-sm font-medium cursor-pointer"
                  >
                    Featured Quiz
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Highlight this quiz in featured discovery rails.
                  </p>
                </div>
                <Switch
                  id="admin-quiz-featured"
                  checked={isFeatured}
                  onCheckedChange={setIsFeatured}
                  disabled={mutation.isPending}
                  aria-label="Toggle featured status"
                />
              </div>

              <div className="flex items-center justify-between gap-4 pt-3">
                <div className="space-y-0.5">
                  <Label
                    htmlFor="admin-quiz-hidden"
                    className="text-sm font-medium cursor-pointer"
                  >
                    Hide from Public Catalog
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Remove this quiz from public search and discovery.
                  </p>
                </div>
                <Switch
                  id="admin-quiz-hidden"
                  checked={isHidden}
                  onCheckedChange={setIsHidden}
                  disabled={mutation.isPending}
                  aria-label="Toggle hidden status"
                />
              </div>
            </div>

            {isFeatured && isHidden && (
              <div
                className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300"
                role="status"
              >
                <AlertTriangle
                  className="h-4 w-4 shrink-0 mt-0.5"
                  aria-hidden="true"
                />
                <span>
                  This quiz is marked both Featured and Hidden. Hidden quizzes
                  will not appear in public featured rails until unhidden.
                </span>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={mutation.isPending}
              className="h-10 sm:h-9"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={mutation.isPending || !isDirty}
              aria-busy={mutation.isPending}
              className="h-10 sm:h-9 gap-2 bg-default text-default-foreground hover:bg-default-hover"
            >
              {mutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function QuizAdminPage() {
  const { push } = useToast();

  const [searchInput, setSearchInput] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [editingQuiz, setEditingQuiz] = useState<QuizResponseDto | null>(null);
  const [deletingQuiz, setDeletingQuiz] = useState<QuizResponseDto | null>(
    null,
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const qParam = params.get("q") ?? "";
    const statusParam = params.get("status");
    if (qParam) {
      /* eslint-disable react-hooks/set-state-in-effect */
      setSearchInput(qParam);
      setDebouncedQuery(qParam.trim());
    }
    if (
      statusParam === "all" ||
      statusParam === "featured" ||
      statusParam === "hidden"
    ) {
      setStatusFilter(statusParam);
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = searchInput.trim();
      setDebouncedQuery(trimmed);
      setCurrentPage(1);
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        if (trimmed) {
          url.searchParams.set("q", trimmed);
        } else {
          url.searchParams.delete("q");
        }
        window.history.replaceState(null, "", url.toString());
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleFilterChange = useCallback((next: StatusFilter) => {
    setStatusFilter(next);
    setCurrentPage(1);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (next === "all") {
        url.searchParams.delete("status");
      } else {
        url.searchParams.set("status", next);
      }
      window.history.replaceState(null, "", url.toString());
    }
  }, []);

  const query = useQuery<QuizControllerListQuizzes200>(
    {
      queryKey: [
        QUIZ_ADMIN_QUERY_KEY,
        {
          q: debouncedQuery,
          statusFilter,
        },
      ],
      queryFn: ({ signal }) =>
        listQuizzes({
          limit: 100,
          q: debouncedQuery || undefined,
          featured: statusFilter === "featured" ? true : undefined,
          isHidden: statusFilter === "hidden" ? true : undefined,
          signal,
        }),
      refetchOnWindowFocus: false,
    },
    getQueryClient(),
  );

  const deleteMutation = useMutation(
    {
      mutationFn: (quizId: string) => deleteQuiz(quizId),
      onSuccess: () => {
        const deletedTitle = deletingQuiz?.title ?? "Quiz";
        setDeletingQuiz(null);
        void getQueryClient().invalidateQueries({
          queryKey: [QUIZ_ADMIN_QUERY_KEY],
        });
        push({
          title: "Quiz deleted",
          body: `"${deletedTitle}" has been removed.`,
          durationMs: DEFAULT_TOAST_DURATION_MS,
        });
      },
      onError: (err: unknown) => {
        push({
          title: "Delete failed",
          body:
            err instanceof Error
              ? err.message
              : "Could not delete quiz. Please try again.",
          durationMs: DEFAULT_TOAST_DURATION_MS,
        });
      },
    },
    getQueryClient(),
  );

  const allQuizzes = useMemo(() => extractQuizItems(query.data), [query.data]);
  const totalPages = Math.max(1, Math.ceil(allQuizzes.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const rangeStart = allQuizzes.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(safePage * PAGE_SIZE, allQuizzes.length);

  const quizzes = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return allQuizzes.slice(start, start + PAGE_SIZE);
  }, [allQuizzes, safePage]);

  const hasActiveFilters = debouncedQuery.length > 0 || statusFilter !== "all";

  const handleClearFilters = useCallback(() => {
    setSearchInput("");
    setDebouncedQuery("");
    setStatusFilter("all");
    setCurrentPage(1);
  }, []);

  const handleQuizSaved = useCallback(
    (quizTitle: string) => {
      push({
        title: "Quiz updated",
        body: `"${quizTitle}" has been updated.`,
        durationMs: DEFAULT_TOAST_DURATION_MS,
      });
    },
    [push],
  );

  return (
    <div
      className={cn(PAGE_CONTAINER_CLASS, "space-y-6")}
      data-testid="quiz-admin-page"
    >
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-border pb-6">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Quizzes
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl">
            Review, moderate, and manage quizzes across the platform.
          </p>
        </div>

        <Button
          asChild
          className="h-10 sm:h-9 gap-2 self-start sm:self-auto shrink-0 bg-default text-default-foreground hover:bg-default-hover"
        >
          <Link href="/create-quiz">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Create Quiz
          </Link>
        </Button>
      </header>

      <section
        aria-label="Quiz moderation list"
        className="rounded-xl border border-border bg-card overflow-hidden shadow-xs"
      >
        {/* Integrated Toolbar */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between border-b border-border bg-muted/20 px-4 py-3">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center flex-1 min-w-0">
            <div className="relative w-full sm:max-w-xs">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search quizzes by title..."
                aria-label="Search quizzes by title"
                className="pl-9 pr-9 h-10 sm:h-9 bg-background"
              />
              {searchInput.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSearchInput("")}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer rounded-sm p-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              )}
            </div>

            <div
              className="flex items-center gap-1.5 flex-wrap"
              role="group"
              aria-label="Filter quizzes by status"
            >
              {(
                [
                  { id: "all", label: "All" },
                  { id: "featured", label: "Featured" },
                  { id: "hidden", label: "Hidden" },
                ] as const
              ).map((item) => (
                <Button
                  key={item.id}
                  type="button"
                  size="sm"
                  variant={statusFilter === item.id ? "default" : "outline"}
                  aria-pressed={statusFilter === item.id}
                  onClick={() => handleFilterChange(item.id)}
                  className={cn(
                    "h-9 sm:h-8",
                    statusFilter === item.id &&
                      "bg-brand text-brand-foreground hover:bg-brand-hover",
                  )}
                >
                  {item.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between lg:justify-end gap-3 shrink-0">
            {query.isLoading ? (
              <Skeleton className="h-4 w-20" />
            ) : (
              <span
                className="text-xs font-mono tabular-nums text-muted-foreground"
                role="status"
                aria-live="polite"
              >
                {allQuizzes.length}{" "}
                {allQuizzes.length === 1 ? "quiz" : "quizzes"}
              </span>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 sm:h-8 gap-1.5"
              disabled={query.isFetching}
              onClick={() => {
                void query.refetch();
              }}
              aria-label="Refresh quizzes"
            >
              <RotateCw
                className={cn("h-3.5 w-3.5", query.isFetching && "animate-spin")}
                aria-hidden="true"
              />
              Refresh
            </Button>
          </div>
        </div>

        {/* Desktop Column Header */}
        <div
          className={cn(
            "hidden border-b border-border/80 bg-muted/30 px-4 py-2.5 text-xs font-mono uppercase tracking-wider text-muted-foreground",
            DESKTOP_ROW_GRID_CLASS,
          )}
          aria-hidden="true"
        >
          <span>Quiz</span>
          <span>Status</span>
          <span>Category</span>
          <span>Created</span>
          <span className="text-right">Actions</span>
        </div>

        {query.isLoading ? (
          <div
            className="divide-y divide-border/60"
            role="status"
            aria-busy="true"
            aria-label="Loading quizzes"
          >
            {Array.from({ length: 8 }).map((_, index) => (
              <div
                key={index}
                className={cn(
                  "px-4 py-3 flex flex-col gap-3",
                  DESKTOP_ROW_GRID_CLASS,
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
                  <div className="flex-1 space-y-1.5 min-w-0">
                    <Skeleton className="h-4 w-48 max-w-full" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                </div>
                <Skeleton className="h-5 w-20 rounded-md" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
                <div className="flex items-center lg:justify-end gap-2">
                  <Skeleton className="h-9 sm:h-8 w-16 rounded-md" />
                  <Skeleton className="h-9 sm:h-8 w-16 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        ) : query.isError ? (
          <div
            className="p-6 space-y-4"
            role="alert"
            data-testid="quiz-admin-error"
          >
            <div className="flex items-start gap-3">
              <AlertCircle
                className="h-5 w-5 text-destructive shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <div className="space-y-1">
                <h2 className="text-base font-semibold text-foreground">
                  Failed to load quizzes
                </h2>
                <p className="text-sm text-muted-foreground">
                  {query.error instanceof Error
                    ? query.error.message
                    : "An unexpected error occurred while fetching quizzes."}
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              className="h-10 sm:h-9 gap-2"
              onClick={() => {
                void query.refetch();
              }}
            >
              <RotateCw className="h-4 w-4" aria-hidden="true" />
              Try Again
            </Button>
          </div>
        ) : quizzes.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            headingLevel="h2"
            title={
              hasActiveFilters
                ? "No quizzes match your filters"
                : "No quizzes found"
            }
            description={
              hasActiveFilters
                ? "Try adjusting your search term or status filter."
                : "Create the first quiz to populate the catalog."
            }
            actions={
              hasActiveFilters
                ? [
                    {
                      label: "Clear Filters",
                      variant: "outline",
                      onClick: handleClearFilters,
                    },
                  ]
                : [
                    {
                      label: "Create Quiz",
                      href: "/create-quiz",
                      icon: Plus,
                    },
                  ]
            }
          />
        ) : (
          <>
            <div
              className={cn(
                "divide-y divide-border/60 transition-opacity duration-150",
                query.isFetching && !query.isLoading && "opacity-65",
              )}
              data-testid="quiz-admin-list"
            >
              {quizzes.map((quiz) => {
                const creatorName =
                  quiz.creator?.displayName || quiz.creator?.username || null;
                const hasSpecialStatus =
                  quiz.isFeatured || quiz.isHidden || quiz.isVerified;

                return (
                  <article
                    key={quiz.quizId}
                    className={cn(
                      "px-4 py-3 flex flex-col gap-3 transition-colors hover:bg-muted/35",
                      DESKTOP_ROW_GRID_CLASS,
                    )}
                  >
                    {/* Quiz column */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border/60 bg-muted">
                        {quiz.imageUrl ? (
                          <Image
                            src={quiz.imageUrl}
                            alt=""
                            width={40}
                            height={40}
                            sizes="40px"
                            className="h-10 w-10 object-cover"
                          />
                        ) : (
                          <BookOpen
                            className="h-4 w-4 text-muted-foreground"
                            aria-hidden="true"
                          />
                        )}
                      </div>

                      <div className="min-w-0 flex-1 space-y-0.5">
                        <h2 className="text-sm font-semibold text-foreground leading-snug min-w-0">
                          <Link
                            href={`/quizzes/${quiz.slug}`}
                            title={quiz.title}
                            className="group/link inline-flex items-center gap-1 max-w-full hover:text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                          >
                            <span className="truncate">{quiz.title}</span>
                            <ExternalLink
                              className="h-3 w-3 text-muted-foreground opacity-55 transition-opacity group-hover/link:opacity-100 shrink-0"
                              aria-hidden="true"
                            />
                          </Link>
                        </h2>
                        <p className="text-xs text-muted-foreground truncate">
                          {creatorName ? `By ${creatorName}` : "Unknown creator"}
                        </p>
                      </div>
                    </div>

                    {/* Status column */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {quiz.isFeatured && (
                        <Badge
                          variant="outline"
                          className="border-brand/25 bg-brand/15 text-brand text-xs"
                        >
                          Featured
                        </Badge>
                      )}
                      {quiz.isHidden && (
                        <Badge
                          variant="outline"
                          className="border-amber-500/25 bg-amber-500/15 text-amber-700 dark:text-amber-300 text-xs"
                        >
                          Hidden
                        </Badge>
                      )}
                      {quiz.isVerified && (
                        <Badge
                          variant="outline"
                          className="border-emerald-500/25 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-xs"
                        >
                          Verified
                        </Badge>
                      )}
                      {!hasSpecialStatus && (
                        <Badge
                          variant="outline"
                          className="border-border bg-muted/50 text-muted-foreground text-xs"
                        >
                          Public
                        </Badge>
                      )}
                    </div>

                    {/* Category column */}
                    <div className="text-xs text-muted-foreground truncate">
                      <span className="lg:hidden font-medium text-foreground/70 mr-1">
                        Category:
                      </span>
                      {quiz.categoryName || "—"}
                    </div>

                    {/* Created column */}
                    <div className="text-xs font-mono tabular-nums text-muted-foreground">
                      <span className="lg:hidden font-sans font-medium text-foreground/70 mr-1">
                        Created:
                      </span>
                      {formatCreatedDate(quiz.createdAt)}
                    </div>

                    {/* Actions column */}
                    <div className="flex items-center lg:justify-end gap-1.5 shrink-0">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-9 sm:h-8 gap-1.5"
                        onClick={() => setEditingQuiz(quiz)}
                        aria-label={`Edit ${quiz.title}`}
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-9 sm:h-8 gap-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => setDeletingQuiz(quiz)}
                        aria-label={`Delete ${quiz.title}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        Delete
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>

            {totalPages > 1 && (
              <nav
                aria-label="Quizzes pagination"
                className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-border bg-muted/20 px-4 py-3"
              >
                <span className="text-xs font-mono tabular-nums text-muted-foreground">
                  Showing {rangeStart}–{rangeEnd} of {allQuizzes.length} quizzes
                </span>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 sm:h-8 gap-1"
                    disabled={safePage <= 1 || query.isFetching}
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(1, prev - 1))
                    }
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                    Previous
                  </Button>

                  <span className="px-2 text-xs font-mono tabular-nums text-muted-foreground">
                    Page {safePage} of {totalPages}
                  </span>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 sm:h-8 gap-1"
                    disabled={safePage >= totalPages || query.isFetching}
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                    }
                  >
                    Next
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </nav>
            )}
          </>
        )}
      </section>

      <EditQuizDialog
        quiz={editingQuiz}
        onClose={() => setEditingQuiz(null)}
        onSaved={handleQuizSaved}
      />

      <AlertDialog
        open={deletingQuiz !== null}
        onOpenChange={(open) => {
          if (!open && !deleteMutation.isPending) setDeletingQuiz(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Quiz</AlertDialogTitle>
            <AlertDialogDescription>
              Permanently delete{" "}
              <span className="font-semibold text-foreground">
                {deletingQuiz?.title}
              </span>
              ? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteMutation.isPending}
              aria-busy={deleteMutation.isPending}
              onClick={(event) => {
                event.preventDefault();
                if (deletingQuiz) {
                  deleteMutation.mutate(deletingQuiz.quizId);
                }
              }}
              className="gap-2 bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              )}
              {deleteMutation.isPending ? "Deleting…" : "Delete Quiz"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
