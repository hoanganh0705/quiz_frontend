"use client";

/**
 * `AttemptWriteReviewCta` — result-page "Write a review" CTA.
 *
 * Source epic:   Epic 4.1 — SDK coverage & cross-cutting contracts.
 * Source story:  4.15 — Attempt complete + score breakdown + my-attempts page.
 * Source ticket: T-4.15.11.
 *
 * ## What this component owns
 *
 *   - Renders a CTA that links to the quiz detail page where the
 *     Story 4.13 review authoring form is mounted.
 *   - Consumes the Story 4.13 review gate via `useReviewGate`
 *     (T-4.13.7). The CTA renders only when the gate resolves to
 *     `eligible` or `existing-review`. For `attempt-required`,
 *     `loading`, `unauthenticated`, or `error` the component renders
 *     nothing (those states are not the result page's concern).
 *
 * ## What this component does NOT own
 *
 *   - No review-create mutation. The CTA never invokes
 *     `createReview` directly — that is the Story 4.13 form's
 *     responsibility on the quiz detail page.
 *   - No duplication of the review form internals from Story 4.13.
 *   - No service or store code beyond the gate hook import.
 *
 * ## Activation
 *
 * Activation navigates to the canonical quiz detail page
 * (`/quizzes/[idOrSlug]`) where the Story 4.13 review form is
 * mounted. The quiz identity is preserved in the route so the form
 * receives the right `quizId` via the page's URL-driven gate.
 */

import * as React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { StarIcon } from "lucide-react";
import { cn } from "@/shared/utils/merge-class-names";

import { useReviewGate } from "@/features/reviews/hooks/useReviewGate";

// ─── Public types ────────────────────────────────────────────────────────────

export interface AttemptWriteReviewCtaProps {
  /**
   * Quiz identifier (canonical) the completed attempt belongs to.
   * Pass `null` to disable the gate (no CTA renders).
   */
  quizId: string | null;
  /** Quiz slug used for the canonical quiz detail URL. */
  quizSlug: string | null;
  /** Optional class name applied to the wrapper. */
  className?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function AttemptWriteReviewCta(
  props: AttemptWriteReviewCtaProps,
): React.ReactElement | null {
  const { quizId, quizSlug, className } = props;

  const router = useRouter();
  const { state } = useReviewGate({ quizId });

  // Disabled / non-rendering states (gate rules per Story 4.13):
  //   - `attempt-required` — gate said no review, no completed attempt;
  //     this branch is unreachable because the result page is rendered
  //     ONLY for completed attempts, but defensive rendering keeps the
  //     CTA invisible if a stale tab broadcasts an inconsistent gate.
  //   - `loading` / `unauthenticated` / `error` — not the result
  //     page's concern.
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