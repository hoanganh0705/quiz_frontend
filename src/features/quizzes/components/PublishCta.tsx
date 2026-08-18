

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

export interface PublishCtaProps {

quizId: string;

versionId: string;

slug: string;

isReady: boolean;

tooltipContent: string | null;

isLoading?: boolean;

className?: string;

onPublishStart?: () => void;
}

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
