"use client";

import { type ReactElement } from "react";

import type { ErrorCode } from "@/lib/api/error-codes";

type SearchErrorCode =
| "GLOBAL_UNAUTHENTICATED"
  | "GLOBAL_FORBIDDEN"
  | "GLOBAL_NOT_FOUND"
  | "GLOBAL_INTERNAL_ERROR"
  | "GLOBAL_BAD_REQUEST"
  | "GLOBAL_VALIDATION_FAILED";

interface SearchErrorStateProps {

errorCode: SearchErrorCode;

onRetry?: () => void;
}

function buildCopy(code: SearchErrorStateProps["errorCode"]): {
title: string;
body: string;
} {
switch (code) {
case "GLOBAL_UNAUTHENTICATED":
return {
title: "Sign in required",
body: "Sign in to see social suggestions and search results.",
      };
case "GLOBAL_FORBIDDEN":
return {
title: "Access denied",
body: "You don't have permission to view this content.",
      };
case "GLOBAL_NOT_FOUND":
return {
title: "Not found",
body: "We couldn't find what you were looking for.",
      };
case "GLOBAL_BAD_REQUEST":
return {
title: "Invalid search",
body: "Your search query is invalid. Try a different search.",
      };
case "GLOBAL_VALIDATION_FAILED":
return {
title: "Invalid search",
body: "Your search query contains invalid characters. Try a different search.",
      };
case "GLOBAL_INTERNAL_ERROR":
default:
return {
title: "Something went wrong",
body: "We couldn't load results. Please try again.",
      };
  }
}

export function SearchErrorState({
errorCode,
onRetry,
}: SearchErrorStateProps): ReactElement {
const copy = buildCopy(errorCode);
return (
<div
role="alert"
aria-live="assertive"
data-testid="search-error-state"
data-error-code={errorCode}
className="flex flex-col gap-2 p-6 text-center"
    >
<p className="text-base font-semibold">{copy.title}</p>
<p className="text-sm text-muted-foreground">{copy.body}</p>
{onRetry ? (
<button
type="button"
onClick={onRetry}
className="mt-2 mx-auto rounded-md border border-border px-4 py-2 text-sm hover:bg-muted transition-colors"
data-testid="search-error-retry"
        >
Try again
        </button>
      ) : null}
</div>
  );
}
