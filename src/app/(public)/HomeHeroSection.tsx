"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { useAuthState } from "@/features/auth/hooks/use-auth-state";

export function HomeHeroSection() {
const { isAuthenticated } = useAuthState();

return (
<div className="relative bg-linear-to-br from-secondary to-muted rounded-xl p-6 sm:p-8 lg:p-12 mb-6 sm:mb-8 border border-border">
<div className="relative z-10 max-w-full sm:max-w-lg lg:max-w-2xl">
<h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4 leading-tight text-foreground">
Your Quiz Adventure
          <br />
Starts Here:
          <br />
<span className="text-brand">Play, Share, Earn!</span>
</h1>
<p className="text-base sm:text-lg lg:text-xl text-muted-foreground mb-6 sm:mb-8">
Build engaging quizzes, challenge others, and earn rewards
          <br className="hidden sm:inline" />
for your knowledge.
        </p>

<div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
<Link href="/quizzes">
<Button
size="lg"
className="text-brand bg-background hover:bg-muted border border-brand-hover dark:text-brand dark:bg-transparent dark:hover:bg-muted/40 dark:border-brand-hover w-full sm:w-auto"
            >
Play a Quiz
            </Button>
</Link>

{isAuthenticated ? (
<>
<Link href="/create-quiz">
<Button
size="lg"
className="text-white bg-brand hover:bg-brand-hover w-full sm:w-auto"
                >
Create Quiz
                </Button>
</Link>
</>
          ) : (
<div className="flex items-center gap-3">
<Link href="/create-quiz">
<Button
size="lg"
className="text-white bg-brand hover:bg-brand-hover w-full sm:w-auto"
                >
Create Quiz
                </Button>
</Link>
</div>
          )}
</div>

{!isAuthenticated && (
<p className="text-xs text-muted-foreground mt-3">
No login needed to start playing. Save progress later.
          </p>
        )}
</div>
</div>
  );
}
