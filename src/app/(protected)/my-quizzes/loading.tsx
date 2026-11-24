import { MyQuizzesSkeleton } from "@/features/quizzes/components/MyQuizzesSkeleton";

export default function Loading(): React.ReactElement {
  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1.5">
          <div className="h-4 w-28 rounded bg-muted/60 animate-pulse" />
          <div className="h-8 w-44 rounded-md bg-muted animate-pulse" />
          <div className="h-4 w-72 rounded-md bg-muted/60 animate-pulse" />
        </div>
        <div className="h-10 w-32 rounded-md bg-muted animate-pulse" />
      </div>
      <div className="h-10 w-80 rounded-md bg-muted animate-pulse" />
      <MyQuizzesSkeleton />
    </div>
  );
}
