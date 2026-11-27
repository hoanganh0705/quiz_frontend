import { Skeleton } from "@/components/ui/Skeleton";

import { PAGE_CONTAINER_CLASS } from "@/shared/layout/constants";

/**
 * Content-only loading skeleton rendered inside `AdminLayoutShell`
 * (which already mounts `AdminSidebar` and `AdminHeader`).
 */
export default function AdminLoading() {
  return (
    <div
      className={`${PAGE_CONTAINER_CLASS} space-y-6`}
      data-testid="admin-loading-boundary"
      aria-busy="true"
      aria-label="Loading admin page"
    >
      <div className="space-y-2 pb-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>

      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
