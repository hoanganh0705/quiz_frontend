"use client";

import { useCallback } from "react";
import { AlertCircle, Info, X } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/shared/utils/merge-class-names";
import { getUserCopy } from "@/lib/api/error-codes";
import type { ApiError } from "@/lib/api/core/ApiError";

import type { RegistrationErrorCode } from "@/features/tournaments/types";

export interface RegistrationErrorBannerProps {

error: ApiError | null;

onDismiss?: () => void;

className?: string;
}

function isInformationalCode(code: string | undefined): boolean {
return code === "ALREADY_REGISTERED";
}

export function RegistrationErrorBanner({
error,
onDismiss,
className,
}: RegistrationErrorBannerProps) {

const handleDismiss = useCallback(() => {
onDismiss?.();
  }, [onDismiss]);

if (error === null || error === undefined) {
return null;
  }

const code = error.code as RegistrationErrorCode | undefined;
const copy = getUserCopy(code ?? "");
const isInformational = isInformationalCode(code);

const title = copy.title;
const body = copy.body;

return (
<div
role="alert"
aria-live="assertive"
data-testid="registration-error-banner"
data-error-code={code ?? "unknown"}
className={cn(
"flex items-start gap-2 rounded-md border p-3 text-sm",
isInformational
? "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200"
: "border-destructive/40 bg-destructive/10 text-destructive dark:border-destructive/60 dark:bg-destructive/20 dark:text-destructive",
className,
      )}
    >
{isInformational ? (
<Info
className="h-4 w-4 mt-0.5 shrink-0"
aria-hidden="true"
        />
      ) : (
<AlertCircle
className="h-4 w-4 mt-0.5 shrink-0"
aria-hidden="true"
        />
      )}
<div className="flex-1 space-y-1">
<p
className={cn(
"font-semibold leading-none",
isInformational ? "text-blue-900 dark:text-blue-100" : "text-destructive",
          )}
data-testid="registration-error-banner-title"
        >
{title}
</p>
<p
className={cn(
"text-xs",
isInformational
? "text-blue-700 dark:text-blue-300"
: "text-destructive/90 dark:text-destructive",
          )}
data-testid="registration-error-banner-body"
        >
{body}
</p>
</div>
{onDismiss && (
<Button
type="button"
variant="ghost"
size="icon"
aria-label="Dismiss error"
onClick={handleDismiss}
className={cn(
"h-6 w-6 shrink-0",
isInformational
? "text-blue-600 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-900"
: "text-destructive hover:bg-destructive/20",
          )}
data-testid="registration-error-banner-dismiss"
        >
<X className="h-4 w-4" aria-hidden="true" />
</Button>
      )}
</div>
  );
}
