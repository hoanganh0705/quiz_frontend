'use client';

/**
 * `CommentsWidget` — top-level comments section for the quiz detail
 * page.
 *
 * Source epic:   Epic 4.12 — Comments on a quiz.
 * Source ticket: T-4.12.19.
 *
 * Wraps `<CommentThreadList />` with:
 *   - Auth context (`useAuth()`) → `currentUserId`, `isAuthenticated`
 *   - A section heading ("Comments" + optional count badge)
 *   - An inline error boundary that renders a friendly retry panel
 *     when a descendant throws during render
 *   - A skeleton fallback while the auth state is loading
 *
 * ## Error boundary
 *
 * The boundary is class-component-based (React requires that for
 * `componentDidCatch`). It wraps the heavy `<CommentThreadList />` so
 * the rest of the page (header, metadata, stats, related quizzes)
 * stays interactive even if the comment tree throws.
 *
 * ## Comment count badge
 *
 * The backend's quiz stats endpoint does NOT expose `commentsCount`
 * at the moment (searched Phase 4 spec). The widget therefore renders
 * the heading without a numeric badge; once stats is wired up the
 * badge can be added without API changes.
 */

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, MessageSquare, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/shared/utils/merge-class-names';
import { logger } from '@/shared/log';
import { isApiError } from '@/lib/api';
import { getUserCopy } from '@/lib/api/error-codes';

import { CommentThreadList } from './CommentThreadList';
import { useAuth } from '@/features/auth/hooks/use-auth';

// ─── Public types ─────────────────────────────────────────────────────────

export interface CommentsWidgetProps {
  /** Quiz id to render the comments for. */
  quizId: string;
  /** Optional className for the wrapping section. */
  className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────

export function CommentsWidget({ quizId, className }: CommentsWidgetProps) {
  return (
    <section
      aria-label='Comments'
      data-testid='comments-widget'
      data-quiz-id={quizId}
      className={cn('mt-12 pt-6 border-t border-border', className)}
    >
      <WidgetBody quizId={quizId} />
    </section>
  );
}

// ─── Inner body ───────────────────────────────────────────────────────────

function WidgetBody({ quizId }: { quizId: string }) {
  const { currentUser, isLoading: isAuthLoading } = useAuth();

  if (isAuthLoading) {
    return (
      <div data-testid='comments-widget-auth-skeleton' className='flex flex-col gap-4'>
        <Skeleton className='h-7 w-32' />
        <Skeleton className='h-20 w-full' />
        <Skeleton className='h-32 w-full' />
      </div>
    );
  }

  return (
    <CommentsErrorBoundary>
      <div className='mb-6 flex items-center gap-3'>
        <MessageSquare size={22} aria-hidden className='text-primary' />
        <h2 className='text-xl font-semibold'>Comments</h2>
      </div>
      <CommentThreadList
        quizId={quizId}
        currentUserId={currentUser?.userId ?? null}
        isAuthenticated={Boolean(currentUser)}
      />
    </CommentsErrorBoundary>
  );
}

// ─── Error boundary ───────────────────────────────────────────────────────

interface CommentsErrorBoundaryProps {
  children: ReactNode;
}

interface CommentsErrorBoundaryState {
  error: Error | null;
}

/**
 * Inline error boundary for the comments tree. Renders a friendly
 * retry panel when a descendant throws during render; re-mounts the
 * children on `Retry` via `reset()`.
 */
class CommentsErrorBoundary extends Component<
  CommentsErrorBoundaryProps,
  CommentsErrorBoundaryState
> {
  state: CommentsErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): CommentsErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Surface to the dev console; production telemetry is wired in a
    // separate ticket (T-4.12.19 follow-up).
    logger.error('comments.widget', 'render error', { error, componentStack: info.componentStack });
  }

  reset = (): void => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      const copy = isApiError(this.state.error)
        ? getUserCopy(this.state.error.code)
        : null;
      return (
        <div
          role='alert'
          data-testid='comments-widget-error'
          className='flex flex-col items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-5 text-sm text-destructive'
        >
          <div className='flex items-center gap-2'>
            <AlertTriangle size={18} aria-hidden />
            <p className='font-medium text-foreground'>
              {copy?.title ?? 'Comments failed to load'}
            </p>
          </div>
          <p className='text-xs text-muted-foreground'>
            {copy?.body ??
              'Something went wrong rendering the comments section.'}
          </p>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={this.reset}
            data-testid='comments-widget-retry'
          >
            <RefreshCw size={14} aria-hidden />
            Retry
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}