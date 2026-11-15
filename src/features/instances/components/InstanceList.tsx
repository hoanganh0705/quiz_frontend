"use client";

import * as React from "react";
import Link from "next/link";
import { Gamepad2, Compass } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { InstanceCard } from "./InstanceCard";
import { InstanceListSkeleton } from "./InstanceListSkeleton";
import { cn } from "@/shared/utils/merge-class-names";
import type { InstanceListItemDto } from "@/lib/api/generated/schemas";

export interface InstanceListProps {
  instances: InstanceListItemDto[];
  isLoading?: boolean;
  className?: string;
}

export function InstanceList({
  instances,
  isLoading = false,
  className,
}: InstanceListProps) {
  if (isLoading) {
    return <InstanceListSkeleton className={className} />;
  }

  if (instances.length === 0) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 p-12 text-center bg-card/40 my-4",
          className,
        )}
        data-testid="instance-list-empty"
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand/10 text-brand mb-4">
          <Gamepad2 className="h-8 w-8" />
        </div>
        <h3 className="text-xl font-bold tracking-tight">No Active Live Battles</h3>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          There are no open multiplayer rooms right now. Pick any quiz and host your own live battle to compete with friends!
        </p>
        <Button asChild className="mt-6 bg-brand text-white hover:bg-brand-hover shadow-sm">
          <Link href="/quizzes">
            <Compass className="mr-2 h-4 w-4" />
            Explore Quizzes to Host
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6",
        className,
      )}
      data-testid="instance-list"
    >
      {instances.map((instance) => (
        <InstanceCard key={instance.instanceId} instance={instance} />
      ))}
    </div>
  );
}
