"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { AdminPageHeader } from "../_components";
import { listQuizzes } from "@/features/quizzes/services/quizzes.service";
import type { QuizResponseDto } from "@/lib/api/generated/schemas";
import { logger } from "@/shared/log";

export default function AdminQuizzesPage() {
  const [quizzes, setQuizzes] = useState<QuizResponseDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchQuizzes() {
      try {
        const data = await listQuizzes({ limit: 100 });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setQuizzes((data as any).data ?? []);
      } catch (error) {
        logger.error('admin.quizzes', 'Failed to fetch quizzes', error);
      } finally {
        setLoading(false);
      }
    }
    fetchQuizzes();
  }, []);

  // Phase 11 / P2-114: stub admin handlers. The wired paths will
  // arrive with the upcoming admin quiz-management feature; for now
  // we route to the centralized logger so the action is observable
  // instead of vanishing into `console.log`.
  const handleCreate = () => {
    logger.debug('admin.quizzes', 'Create quiz (stub)');
  };

  const handleEdit = (id: string) => {
    logger.debug('admin.quizzes', 'Edit quiz (stub)', { id });
  };

  const handleDelete = (id: string) => {
    logger.debug('admin.quizzes', 'Delete quiz (stub)', { id });
  };

  if (loading) {
    return (
      <div className="px-4 sm:px-6 pb-8">
        <AdminPageHeader
          title="Quizzes"
          description="Review, moderate, and manage quizzes on the platform."
          actionLabel="Create Quiz"
          actionIcon={Plus}
          onAction={handleCreate}
        />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-lg border border-border p-4 animate-pulse"
            >
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 bg-muted rounded" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/3 bg-muted rounded" />
                  <div className="h-3 w-1/2 bg-muted rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 pb-8">
      <AdminPageHeader
        title="Quizzes"
        description="Review, moderate, and manage quizzes on the platform."
        actionLabel="Create Quiz"
        actionIcon={Plus}
        onAction={handleCreate}
      />

      {quizzes.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">
          No quizzes found.
        </p>
      ) : (
        <div className="space-y-3">
          {quizzes.map((quiz) => (
            <div
              key={quiz.quizId}
              className="rounded-lg border border-border p-4 hover:border-brand/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="p-2 rounded-lg bg-muted shrink-0">
                    {quiz.imageUrl ? (
                      <Image
                        src={quiz.imageUrl}
                        alt=""
                        width={20}
                        height={20}
                        className="h-5 w-5 rounded object-cover"
                      />
                    ) : (
                      <div className="h-5 w-5 bg-muted-foreground/50 rounded-sm" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-foreground">
                        {quiz.title}
                      </h3>
                      {quiz.isFeatured && (
                        <Badge variant="secondary" className="text-xs">
                          Featured
                        </Badge>
                      )}
                      {quiz.isHidden && (
                        <Badge className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 text-xs">
                          Hidden
                        </Badge>
                      )}
                      {quiz.isVerified && (
                        <Badge className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 text-xs">
                          Verified
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-xs text-muted-foreground">
                        Created {new Date(quiz.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleEdit(quiz.quizId)}
                    className="px-3 py-1.5 text-xs font-medium rounded-md border border-border hover:bg-muted transition-colors text-foreground"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(quiz.quizId)}
                    className="px-3 py-1.5 text-xs font-medium rounded-md border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
