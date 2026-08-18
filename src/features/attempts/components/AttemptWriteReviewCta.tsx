"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { StarIcon } from "lucide-react";
import { cn } from "@/shared/utils/merge-class-names";

import { useReviewGate } from "@/features/reviews/hooks/useReviewGate";

export interface AttemptWriteReviewCtaProps {

quizId: string | null;

quizSlug: string | null;

className?: string;
}

export function AttemptWriteReviewCta(
props: AttemptWriteReviewCtaProps,
): React.ReactElement | null {
const { quizId, quizSlug, className } = props;

const router = useRouter();
const { state } = useReviewGate({ quizId });

if (quizId === null || quizSlug === null) return null;
if (
state.kind !== "eligible" &&
state.kind !== "existing-review"
  ) {
return null;
  }

const label =
state.kind === "existing-review"
? "Edit your review"
: "Write a review";

const onActivate = (): void => {
router.push(`/quizzes/${encodeURIComponent(quizSlug)}`);
  };

return (
<div
className={cn("flex items-center justify-end", className)}
data-testid="attempt-write-review-cta"
    >
<Button
type="button"
variant="default"
onClick={onActivate}
data-testid="attempt-write-review-cta-button"
      >
<StarIcon className="mr-2 h-4 w-4" aria-hidden />
{label}
</Button>
</div>
  );
}