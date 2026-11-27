import { getHome } from "@/lib/api";

import { buildMetadata } from "@/shared/lib/seo";

import { HomePage } from "@/features/quizzes";

import type { Category } from "@/features/categories/types";
import type { HomeControllerGetBundle200 } from "@/lib/api/generated/schemas";

export const metadata = buildMetadata({
  title: "QuizHub — Interactive Trivia & Knowledge Arenas",
  description:
    "Discover trending quizzes, compete on live leaderboards, and sharpen your skills with daily challenges on QuizHub.",
  path: "/",
});

export default async function QuizHubDashboard() {
  let bundle: HomeControllerGetBundle200["data"] | null = null;

  try {
    const envelope = await getHome().homeControllerGetBundle();
    bundle =
      (envelope?.data as HomeControllerGetBundle200["data"] | undefined) ??
      null;
  } catch {
    bundle = null;
  }

  const categories: Category[] = (bundle?.categories ?? []) as Category[];

  return (
    <HomePage
      categories={categories}
      featured={bundle?.featured ?? []}
      trending={bundle?.trending ?? []}
      popular={bundle?.popular ?? []}
      recentWinners={bundle?.recentWinners ?? null}
      topPlayers={bundle?.topPlayers ?? []}
    />
  );
}
