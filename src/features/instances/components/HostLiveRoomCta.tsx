"use client";

import * as React from "react";
import { Loader2, Swords } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { useAuthSession } from "@/features/auth/hooks/use-auth-session";
import { useCreateInstance } from "@/features/instances/hooks/useCreateInstance";
import { useInstancesFeatureFlag } from "@/features/instances/hooks/useInstancesFeatureFlag";
import { cn } from "@/shared/utils/merge-class-names";

export interface HostLiveRoomCtaProps {
  quizId: string;
  idOrSlug?: string | null;
  className?: string;
}

export function HostLiveRoomCta({
  quizId,
  idOrSlug,
  className,
}: HostLiveRoomCtaProps) {
  let router: ReturnType<typeof useRouter> | null = null;
  try {
    router = useRouter();
  } catch {
    router = null;
  }

  const { isPlaceholder } = useInstancesFeatureFlag();
  const { bootstrapState, currentUser } = useAuthSession();
  const isAuthenticated =
    bootstrapState === "authenticated" && currentUser !== null;

  const { create, isCreating, error } = useCreateInstance();

  if (isPlaceholder) {
    return null;
  }

  const returnPath = idOrSlug ? `/quizzes/${idOrSlug}` : `/quizzes/${quizId}`;

  if (!isAuthenticated) {
    return (
      <Button
        asChild
        variant="outline"
        className={cn(
          "h-10 w-full min-w-40 border-brand/40 text-brand hover:bg-brand/10 hover:text-brand sm:w-44",
          className,
        )}
        data-testid="quiz-signin-to-host"
      >
        <Link href={`/login?returnUrl=${encodeURIComponent(returnPath)}`}>
          <Swords aria-hidden="true" className="mr-2 h-4 w-4" />
          Host Live Battle
        </Link>
      </Button>
    );
  }

  const handleHost = async () => {
    try {
      const res = await create({ quizId });
      if (res?.instanceId) {
        if (router) {
          router.push(`/instances/${res.instanceId}`);
        } else if (typeof window !== "undefined") {
          window.location.assign(`/instances/${res.instanceId}`);
        }
      }
    } catch {
      // Error is captured in useCreateInstance state
    }
  };

  return (
    <div className="flex flex-col items-center">
      <Button
        type="button"
        variant="outline"
        className={cn(
          "h-10 w-full min-w-40 border-brand/40 text-brand hover:bg-brand/10 hover:text-brand font-medium sm:w-44",
          className,
        )}
        onClick={handleHost}
        disabled={isCreating}
        data-testid="quiz-host-live-battle-button"
        aria-label="Host live multiplayer battle for this quiz"
      >
        {isCreating ? (
          <>
            <Loader2 aria-hidden="true" className="mr-2 h-4 w-4 animate-spin" />
            Creating Room…
          </>
        ) : (
          <>
            <Swords aria-hidden="true" className="mr-2 h-4 w-4" />
            Host Live Battle
          </>
        )}
      </Button>
      {error && (
        <span
          className="mt-1 text-xs text-destructive"
          role="alert"
          data-testid="host-live-battle-error"
        >
          {error.message || "Failed to create room. Please try again."}
        </span>
      )}
    </div>
  );
}
