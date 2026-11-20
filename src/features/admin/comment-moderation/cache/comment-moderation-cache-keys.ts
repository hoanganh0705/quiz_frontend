import { getQueryClient } from "@/providers/QueryProvider";

import { commentIdKeyMatcher } from "../hooks/commentIdKeys";
import { commentReportsKeyMatcher } from "../hooks/useCommentReports";

export { commentReportsKeyMatcher, commentIdKeyMatcher };

export function commentKey(
  commentId: string,
): readonly ["comments", "byId", string] {
  return ["comments", "byId", commentId] as const;
}

export function publicCommentsKeyMatcher(key: unknown): boolean {
  if (!Array.isArray(key)) return false;
  return key[0] === "comments";
}

export function commentThreadKeyMatcher(key: unknown): boolean {
  if (!Array.isArray(key)) return false;
  return key[0] === "comments" && key[1] === "thread";
}

export async function invalidateCommentReportsList(
  mutate?: (matcher: (key: unknown) => boolean) => unknown,
): Promise<unknown> {
  try {
    const qc = getQueryClient();
    void qc.invalidateQueries({
      predicate: (query) => commentReportsKeyMatcher(query.queryKey),
    });
  } catch {}
  if (mutate) {
    return mutate(commentReportsKeyMatcher);
  }
}

export async function invalidateCommentById(
  commentId: string,
  mutate?: (key: unknown) => unknown,
): Promise<unknown[]> {
  if (typeof commentId !== "string" || commentId.trim().length === 0) {
    return [];
  }
  try {
    const qc = getQueryClient();
    void qc.invalidateQueries({ queryKey: commentKey(commentId) });
    void qc.invalidateQueries({
      predicate: (query) => commentIdKeyMatcher(query.queryKey, commentId),
    });
    void qc.invalidateQueries({
      predicate: (query) => publicCommentsKeyMatcher(query.queryKey),
    });
  } catch {}
  if (mutate) {
    const promises: unknown[] = [];
    promises.push(mutate(commentKey(commentId)));
    promises.push(
      (mutate as (fn: unknown) => unknown)(
        (candidate: unknown) => commentIdKeyMatcher(candidate, commentId),
      ),
    );
    promises.push(mutate(publicCommentsKeyMatcher));
    return Promise.all(promises);
  }
  return [];
}
