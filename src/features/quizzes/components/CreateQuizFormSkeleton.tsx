"use client";

import { Skeleton } from "@/components/ui/Skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";

export function CreateQuizFormSkeleton(): React.ReactElement {
  return (
    <div
      className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
      aria-busy="true"
      aria-label="Loading quiz form"
    >
      {/* Left Column (7 cols): Identity & Discovery */}
      <div className="lg:col-span-7 space-y-6">
        {/* Card 1: Identity */}
        <Card className="border-border/60 bg-card/60">
          <CardHeader className="px-6 pt-6 pb-4 border-b border-border/40 space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72" />
          </CardHeader>
          <CardContent className="p-6 space-y-5">
            {/* Title */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-full" />
            </div>

            {/* Slug */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-16" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-10 flex-1" />
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className="h-3 w-40" />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-28 w-full" />
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Discovery */}
        <Card className="border-border/60 bg-card/60">
          <CardHeader className="px-6 pt-6 pb-4 border-b border-border/40 space-y-2">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-4 w-60" />
          </CardHeader>
          <CardContent className="p-6 space-y-5">
            <div className="space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-10 w-full" />
              <div className="flex flex-wrap gap-1.5 pt-1">
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-6 w-14 rounded-full" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Column (5 cols): Media, Rules & Action */}
      <div className="lg:col-span-5 space-y-6">
        {/* Card 3: Cover Media */}
        <Card className="border-border/60 bg-card/60">
          <CardHeader className="px-6 pt-6 pb-4 border-b border-border/40 space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-52" />
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-40 w-full rounded-md" />
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Gameplay Rules */}
        <Card className="border-border/60 bg-card/60">
          <CardHeader className="px-6 pt-6 pb-4 border-b border-border/40 space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-56" />
          </CardHeader>
          <CardContent className="p-6 space-y-5">
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
              <div className="flex gap-1.5 pt-1">
                <Skeleton className="h-8 w-12 rounded-md" />
                <Skeleton className="h-8 w-12 rounded-md" />
                <Skeleton className="h-8 w-12 rounded-md" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 5: Action Card */}
        <Card className="border-border/60 bg-card/60">
          <CardHeader className="px-6 pt-6 pb-4 border-b border-border/40 space-y-2">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-4 w-52" />
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-start gap-3">
              <Skeleton className="size-4 shrink-0 rounded" />
              <div className="space-y-1 flex-1">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
            <div className="border-t border-border/40 pt-4">
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
