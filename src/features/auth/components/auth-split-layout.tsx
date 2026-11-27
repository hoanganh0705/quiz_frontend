import Image from "next/image";

import { cn } from "@/shared/utils/merge-class-names";

import type { ReactNode } from "react";

export interface AuthSplitLayoutProps {
  imageAlt: string;
  imageSrc?: string;
  asideLabel?: string;
  contentClassName?: string;
  children: ReactNode;
}

export function AuthSplitLayout({
  imageAlt,
  imageSrc = "/login.jpg",
  asideLabel = "Authentication visual",
  contentClassName,
  children,
}: AuthSplitLayoutProps) {
  return (
    <div className="min-h-screen flex bg-background">
      {/* Left Side - Visual */}
      <aside
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden p-2"
        aria-label={asideLabel}
      >
        <div className="relative w-full h-full rounded-2xl overflow-hidden">
          <Image
            src={imageSrc}
            alt={imageAlt}
            fill
            sizes="(max-width: 1024px) 0vw, 50vw"
            className="object-cover"
            priority
          />
        </div>
      </aside>

      {/* Right Side - Form */}
      <main className="w-full lg:w-1/2 flex items-center justify-center px-8 py-12">
        <div className={cn("w-full max-w-md space-y-8", contentClassName)}>
          {/* Mobile Brand */}
          <div className="lg:hidden flex items-center justify-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">QuizHub</h1>
          </div>

          {children}
        </div>
      </main>
    </div>
  );
}
