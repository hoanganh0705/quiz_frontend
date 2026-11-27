import { Suspense } from "react";

import { CollectionDetailPage } from "@/features/bookmarks/components/CollectionDetailPage";

import { buildMetadata } from "@/shared/lib/seo";

import CollectionDetailLoading from "./loading";

export const metadata = buildMetadata({
  title: "Bookmark Collection | QuizHub",
  description: "Manage saved quizzes and collection analytics.",
  path: "/bookmarks",
  noIndex: true,
});

export default async function CollectionDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.ReactElement> {
  const { id } = await params;

  return (
    <Suspense fallback={<CollectionDetailLoading />}>
      <CollectionDetailPage collectionId={id} />
    </Suspense>
  );
}
