'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Play } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import {
Tooltip,
TooltipContent,
TooltipTrigger,
} from '@/components/ui/Tooltip';

import type { AttemptSummaryResponseDto } from '@/lib/api/generated/schemas';

export interface AttemptContinueCtaProps {

activeAttempt: AttemptSummaryResponseDto | null;

idOrSlug: string | null;

isPending?: boolean;

className?: string;
}

const BUTTON_CLASS = 'h-10 w-full min-w-40 sm:w-44';

export function AttemptContinueCta(
props: AttemptContinueCtaProps,
): React.ReactElement | null {
const { activeAttempt, idOrSlug, isPending = false, className } = props;

const router = useRouter();
const navigatingRef = React.useRef(false);

const attemptId = activeAttempt?.attemptId ?? null;
const status = activeAttempt?.status ?? null;
const isStarted = status === 'started';

if (attemptId === null || !isStarted) return null;

const handleClick = () => {
if (navigatingRef.current) return;
if (!idOrSlug) return;
navigatingRef.current = true;
router.push(`/quizzes/${encodeURIComponent(idOrSlug)}/attempt`);
  };

return (
<Tooltip>
<TooltipTrigger asChild>
<span
className="inline-flex w-full rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-auto"
tabIndex={0}
data-testid="quiz-continue-tooltip-trigger"
        >
<Button
type="button"
className={className ?? BUTTON_CLASS}
disabled={isPending}
onClick={handleClick}
aria-label="Continue attempt"
data-testid="quiz-continue-attempt-button"
          >
<Play aria-hidden="true" />
Continue attempt
          </Button>
</span>
</TooltipTrigger>
<TooltipContent sideOffset={6}>
You have an in-progress attempt for this quiz.
      </TooltipContent>
</Tooltip>
  );
}