import { buildMetadata } from "@/shared/lib/seo";

import { SearchPage } from "@/features/search";

export const metadata = buildMetadata({
  title: "Search | QuizHub",
  description:
    "Search quizzes, players, categories, tags, and tournaments on QuizHub.",
  path: "/search",
});

export default function SearchRoute(): React.ReactElement {
  return <SearchPage />;
}
