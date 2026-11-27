/**
 * Bookmarks page — `/bookmarks`
 *
 * Renders the `BookmarksDashboardPage` component which handles:
 * - Collection grid with CRUD operations
 * - Create/rename/delete dialogs
 * - Loading and empty states
 *
 * P2-21: this page is a thin server-component pass-through that
 * delegates rendering to the `BookmarksDashboardPage` client
 * component. The `'use client'` directive was previously applied
 * here, which forced the entire page tree into the client
 * bundle. We drop it now so the page is a server component and
 * only the leaf component is hydrated.
 */

import { BookmarksDashboardPage } from "@/features/bookmarks";

import { PAGE_CONTAINER_CLASS } from "@/shared/layout/constants";
import { buildMetadata } from "@/shared/lib/seo";

export const metadata = buildMetadata({
  title: "Saved Quizzes | QuizHub",
  description: "Manage your bookmarked quizzes and custom collections.",
  path: "/bookmarks",
  noIndex: true,
});

export default function BookmarksPage() {
  return (
    <div className={PAGE_CONTAINER_CLASS}>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Saved Quizzes
        </h1>
        <p className="text-muted-foreground text-base">
          Manage your bookmarked quizzes and collections
        </p>
      </div>

      {/* Collections Dashboard */}
      <BookmarksDashboardPage />
    </div>
  );
}
