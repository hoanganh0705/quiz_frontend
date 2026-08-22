"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { useAuthState } from "@/features/auth/hooks/use-auth-state";

export function HomeHeroAuthCTA() {
  const { isAuthenticated } = useAuthState();

  return (
    <div className="flex items-center gap-3">
      <Link href="/create-quiz">
        <Button
          size="lg"
          className="text-white bg-brand hover:bg-brand-hover w-full sm:w-auto"
        >
          Create Quiz
        </Button>
      </Link>
      {!isAuthenticated ? (
        <p className="text-xs text-muted-foreground">
          No login needed to start playing. Save progress later.
        </p>
      ) : null}
    </div>
  );
}