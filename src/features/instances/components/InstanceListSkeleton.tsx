"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/shared/utils/merge-class-names";

export interface InstanceListSkeletonProps {
  count?: number;
  className?: string;
}

export function InstanceListSkeleton({
  count = 6,
  className,
}: InstanceListSkeletonProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6",
        className,
      )}
      data-testid="instance-list-skeleton"
    >
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index} className="overflow-hidden bg-card">
          <CardContent className="p-5 flex flex-col justify-between gap-4 min-h-[224px]">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-24 rounded-full" />
                <Skeleton className="h-4 w-14" />
              </div>
              <Skeleton className="h-6 w-4/5" />
              <div className="flex items-center gap-4 pt-1">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
            <Skeleton className="h-9 w-full rounded-md" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
