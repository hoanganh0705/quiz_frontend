"use client";

import { LogIn } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/shared/utils/merge-class-names";

import { useInstanceSocket } from "@/features/instances/hooks/useInstanceSocket";
import { InstanceConnectionStatus } from "./shared";

export interface ConnectionBannerProps {

instanceId: string | null;

signInPath?: string;
className?: string;
}

export function ConnectionBanner({
instanceId,
signInPath = "/sign-in",
className,
}: ConnectionBannerProps) {
const { connectionState } = useInstanceSocket(instanceId);

if (instanceId === null) return null;

if (connectionState === "connected" || connectionState === "idle") {
return null;
  }

const showReauthPrompt = connectionState === "auth_failed";

return (
<div
className={cn("flex flex-col gap-2", className)}
data-testid="connection-banner"
data-state={connectionState}
role="region"
aria-label="Realtime connection status"
    >
<InstanceConnectionStatus connectionState={connectionState} />

{showReauthPrompt && (
<div
className="flex items-center gap-2 px-4 py-2 rounded-lg border border-red-200 dark:border-red-800 bg-red-50/60 dark:bg-red-950/20 text-sm text-red-700 dark:text-red-300"
role="alert"
data-testid="connection-banner-reauth"
        >
<span className="flex-1">
Please sign in again to rejoin the realtime channel.
          </span>
<Button
type="button"
variant="outline"
size="sm"
onClick={() => {
if (typeof window !== "undefined") {
const returnUrl = encodeURIComponent(window.location.pathname);
window.location.href = `${signInPath}?returnUrl=${returnUrl}`;
              }
            }}
className="gap-1.5"
          >
<LogIn className="h-3.5 w-3.5" aria-hidden />
Sign in
          </Button>
</div>
      )}
</div>
  );
}