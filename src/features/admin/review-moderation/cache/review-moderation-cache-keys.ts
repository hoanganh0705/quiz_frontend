import { getQueryClient } from "@/providers/QueryProvider";

import { reviewReportsKeyMatcher } from "../hooks/useReviewReports";
import { REVIEW_READ_KEY } from "../hooks/useReview";

export { reviewReportsKeyMatcher };

export function reviewKey(
  reviewId: string,
): ["admin", "review-moderation", "review", string] {
  return REVIEW_READ_KEY(reviewId) as [
    "admin",
    "review-moderation",
    "review",
    string,
  ];
}

export function publicReviewsKeyMatcher(key: unknown): boolean {
  if (!Array.isArray(key)) return false;
  if (key[0] !== "reviews") return false;
  const segment = key[1];
  return segment === "quiz" || segment === "my" || segment === "eligibility";
}

export async function invalidateReviewReportsList(
  mutate?: (matcher: (key: unknown) => boolean) => unknown,
): Promise<unknown> {
  try {
    const qc = getQueryClient();
    void qc.invalidateQueries({
      predicate: (query) => reviewReportsKeyMatcher(query.queryKey),
    });
  } catch {}
  if (mutate) {
    return mutate(reviewReportsKeyMatcher);
  }
}

export async function invalidateReviewById(
  reviewId: string,
  mutate?: (key: unknown) => unknown,
): Promise<unknown[]> {
  if (!reviewId || typeof reviewId !== "string") {
    return [];
  }
  try {
    const qc = getQueryClient();
    void qc.invalidateQueries({ queryKey: reviewKey(reviewId) });
    void qc.invalidateQueries({
      predicate: (query) => publicReviewsKeyMatcher(query.queryKey),
    });
  } catch {}
  if (mutate) {
    const promises: unknown[] = [];
    promises.push(mutate(reviewKey(reviewId)));
    promises.push(mutate(publicReviewsKeyMatcher));
    return Promise.all(promises);
  }
  return [];
}
