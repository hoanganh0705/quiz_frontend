/**
 * `PublishCta` — publish button with disabled/tooltip state and routing on success.
 *
 * Source epic:   Epic 4.11 — Quiz publish flow + edit-published-as-new-draft.
 * Source ticket: T-4.11.7.
 *
 * ## What this component renders
 *
 * - A `<Button>` with label "Publish Quiz"
 * - Disabled state with tooltip when `isReady === false`
 * - Spinner during mutation when `isLoading === true`
 * - Routes to `/quizzes/[slug]` on success
 *
 * ## Composition
 *
 * Built on:
 * - `@/components/ui/Button` — button base
 * - `@/components/ui/Tooltip` — disabled tooltip (if available in the design system)
 * - `usePublishVersion` hook — handles the mutation
 *
 * ## Usage
 *
 * ```tsx
 * <PublishCta
 *   quizId={quizId}
 *   versionId={versionId}
 *   slug={quiz.slug}
 *   isReady={readiness.isReady}
 *   tooltipContent={readiness.tooltipContent}
 *   isLoading={publish.isLoading}
 *   onPublishStart={handlePublishStart}
 * />
 * ```
 */

'use client';

import { memo, useCallback } from 'react';

import { useRouter } from 'next/navigation';

import { Rocket } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/Tooltip';
import { LoadingSpinner } from '@/components/ui/loading-states/LoadingSpinner';

import { usePublishVersion } from '@/features/quizzes/hooks/usePublishVersion';
import type { QuizVersionSummary } from '@/features/quizzes/types/quiz-version.types';
import { ApiError } from '@/lib/api';

/**
 * Props for the `<PublishCta />` component.
 */
export interface PublishCtaProps {
  /** Quiz UUID. */
  quizId: string;
  /** Quiz version UUID. */
  versionId: string;
  /** Quiz slug for routing on success. */
  slug: string;
  /** `true` if the version has 5+ questions (ready to publish). */
  isReady: boolean;
  /** Tooltip text when disabled. Pass `null` when `isReady === true`. */
  tooltipContent: string | null;
  /** `true` while publish is in flight. */
  isLoading?: boolean;
  /** Optional className for the button. */
  className?: string;
  /** Called when publish starts (before API call). */
  onPublishStart?: () => void;
}

/**
 * Publish button CTA with disabled/tooltip state and routing on success.
 */
export const PublishCta = memo(function PublishCta({
  quizId,
  versionId,
  slug,
  isReady,
  tooltipContent,
  isLoading = false,
  className,
  onPublishStart,
}: PublishCtaProps) {
  const router = useRouter();

  const { publishVersion, error } = usePublishVersion({
    onSuccess: useCallback(
      (_result: QuizVersionSummary) => {
        // Navigate to the public quiz page on success.
        router.push(`/quizzes/${slug}`);
      },
      [router, slug],
    ),
    onError: useCallback(
      (_apiError: { code: string; message: string }) => {
        // Error handling is done by the parent (typically shows a toast).
        // The CTA stays enabled for retry after errors.
      },
      [],
    ),
  });

  const handlePublish = useCallback(() => {
    if (!isReady || isLoading) return;
    onPublishStart?.();
    void publishVersion(quizId, versionId);
  }, [isReady, isLoading, onPublishStart, publishVersion, quizId, versionId]);

  // Wrap in TooltipProvider if we have a tooltip.
  const button = (
    <Button
      variant="default"
      size="default"
      disabled={!isReady || isLoading}
      onClick={handlePublish}
      className={className}
      aria-busy={isLoading}
      aria-disabled={!isReady}
    >
      {isLoading ? (
        <>
          <LoadingSpinner size="sm" />
          <span>Publishing...</span>
        </>
      ) : (
        <>
          <Rocket className="size-4" />
          <span>Publish Quiz</span>
        </>
      )}
    </Button>
  );

  // Render with tooltip when disabled and tooltipContent is provided.
  if (!isReady && tooltipContent !== null) {
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <p>{tooltipContent}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return button;
});
