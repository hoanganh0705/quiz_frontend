'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, MessageSquare, RefreshCw, Radio } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/shared/utils/merge-class-names';
import { logger } from '@/shared/log';
import { isApiError } from '@/lib/api';
import { getUserCopy } from '@/lib/api/error-codes';

import { CommentThreadList } from './CommentThreadList';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { useCommentRealtime } from '@/features/comments/hooks/useCommentRealtime';

export interface CommentsWidgetProps {

quizId: string;

className?: string;
}

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

function WidgetBody({ quizId }: { quizId: string }) {
const { currentUser, isLoading: isAuthLoading } = useAuth();

const { isConnected } = useCommentRealtime(quizId, currentUser?.userId ?? null);

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
{isConnected && (
<span
className='flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700'
title='Live updates enabled'
          >
<Radio size={10} className='animate-pulse' aria-hidden />
Live
          </span>
        )}
</div>
<CommentThreadList
quizId={quizId}
currentUserId={currentUser?.userId ?? null}
isAuthenticated={Boolean(currentUser)}
      />
</CommentsErrorBoundary>
  );
}

interface CommentsErrorBoundaryProps {
children: ReactNode;
}

interface CommentsErrorBoundaryState {
error: Error | null;
}

class CommentsErrorBoundary extends Component<
CommentsErrorBoundaryProps,
CommentsErrorBoundaryState
> {
state: CommentsErrorBoundaryState = { error: null };

static getDerivedStateFromError(error: Error): CommentsErrorBoundaryState {
return { error };
  }

componentDidCatch(error: Error, info: ErrorInfo): void {

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