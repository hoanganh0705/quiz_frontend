import { buildMetadata } from "@/shared/lib/seo";

import { TagsDirectoryPage } from "@/features/tags";

export const metadata = buildMetadata({
  title: "Tags | QuizHub",
  description: "Browse tags to discover quizzes by topic.",
  path: "/tags",
});

export default function TagsPage() {
  return <TagsDirectoryPage />;
}
