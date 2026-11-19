import { getHome } from "@/lib/api";
import { HomePage } from "@/features/quizzes";
import type { HomeControllerGetBundle200 } from "@/lib/api/generated/schemas";
import type { Category } from "@/features/categories/types";

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
