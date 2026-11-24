import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

export default function FriendsLoading() {
  return (
    <main
      className="mx-auto max-w-7xl min-h-screen text-foreground px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8"
      role="status"
      aria-label="Loading friends and social"
    >
      {/* Header Skeleton */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-border/40">
        <div className="flex items-start gap-3.5">
          <Skeleton className="h-12 w-12 rounded-2xl shrink-0" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-4 w-96 max-w-full" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-7 w-24 rounded-full" />
        </div>
      </header>

      {/* 12-Column Responsive Layout: 8-Col Main Area + 4-Col Companion Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Main Content Area (8 Cols) */}
        <div className="lg:col-span-8 space-y-8">
          {/* Card 1: Friends List Skeleton */}
          <Card className="rounded-xl border bg-card/80 p-5 sm:p-6 backdrop-blur-xs shadow-xs">
            <CardHeader className="p-0 pb-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-5 w-8 rounded-full" />
              </div>
            </CardHeader>
            <CardContent className="p-0 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 rounded-xl border border-border bg-card/60 p-4 shadow-xs"
                >
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                    <Skeleton className="h-9 w-full sm:w-60 rounded-md" />
                    <Skeleton className="h-9 w-24 rounded-md" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Card 2: Find Friends Skeleton */}
          <Card className="rounded-xl border bg-card/80 p-5 sm:p-6 backdrop-blur-xs shadow-xs">
            <CardHeader className="p-0 pb-4">
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="p-0 space-y-4">
              <Skeleton className="h-10 w-full rounded-md" />
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-xl border border-border bg-card/60 p-3.5 shadow-xs"
                  >
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="space-y-1.5">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                    <Skeleton className="h-8 w-24 rounded-md" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Companion Sidebar (4 Cols) */}
        <div className="lg:col-span-4 space-y-8">
          {/* Card 3: Friend Requests Skeleton */}
          <Card className="rounded-xl border bg-card/80 p-5 sm:p-6 backdrop-blur-xs shadow-xs">
            <CardHeader className="p-0 pb-4">
              <Skeleton className="h-6 w-36" />
            </CardHeader>
            <CardContent className="p-0 space-y-6">
              <div className="space-y-2.5">
                <Skeleton className="h-4 w-28" />
                {Array.from({ length: 2 }).map((_, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-border bg-card/60 p-3 space-y-2.5 shadow-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <div className="space-y-1 flex-1">
                        <Skeleton className="h-3.5 w-24" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Skeleton className="h-8 flex-1 rounded-md" />
                      <Skeleton className="h-8 flex-1 rounded-md" />
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-border/40 pt-4 space-y-2.5">
                <Skeleton className="h-4 w-24" />
                <div className="rounded-xl border border-border bg-card/60 p-3 space-y-2.5 shadow-xs">
                  <div className="flex items-center gap-2.5">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="space-y-1 flex-1">
                      <Skeleton className="h-3.5 w-24" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                  <Skeleton className="h-8 w-full rounded-md" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 4: Compare Stats Skeleton */}
          <Card className="rounded-xl border bg-card/80 p-5 sm:p-6 backdrop-blur-xs shadow-xs">
            <CardHeader className="p-0 pb-4">
              <Skeleton className="h-6 w-36" />
            </CardHeader>
            <CardContent className="p-0 space-y-4">
              <Skeleton className="h-10 w-full rounded-md" />
              <div className="space-y-3 pt-1">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-border/80 bg-card/60 p-3.5 backdrop-blur-xs"
                  >
                    <Skeleton className="h-3 w-24 mb-2.5" />
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-lg bg-background/50 border border-border/40 p-2.5 space-y-1.5">
                        <Skeleton className="h-2.5 w-8" />
                        <Skeleton className="h-5 w-16" />
                      </div>
                      <div className="rounded-lg bg-background/50 border border-border/40 p-2.5 space-y-1.5">
                        <Skeleton className="h-2.5 w-12" />
                        <Skeleton className="h-5 w-16" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
