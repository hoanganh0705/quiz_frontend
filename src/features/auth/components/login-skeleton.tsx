import { Skeleton } from "@/components/ui/Skeleton";

export function LoginSkeleton() {
  return (
    <div className="min-h-screen flex bg-background">
      {/* Left Side — Visual (hidden on mobile, shown on large screens) */}
      <aside
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden p-2"
        aria-hidden="true"
      >
        <div className="relative w-full h-full rounded-2xl overflow-hidden bg-muted" />
      </aside>

      {/* Right Side — Form skeleton */}
      <main className="w-full lg:w-1/2 flex items-center justify-center px-8">
        <div className="w-full max-w-md space-y-8">
          <div className="lg:hidden flex items-center justify-center gap-3">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-8 w-24" />
          </div>

          <div className="space-y-2">
            <Skeleton className="h-9 w-48" />
            <Skeleton className="h-4 w-40" />
          </div>

          <div className="space-y-5">
            <div className="space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-12 w-full rounded-md" />
            </div>

            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-12 w-full rounded-md" />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-4 w-28" />
              </div>
              <Skeleton className="h-4 w-24" />
            </div>

            <Skeleton className="h-12 w-full rounded-xl" />
          </div>

          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4 mx-auto" />
          </div>
        </div>
      </main>
    </div>
  );
}
