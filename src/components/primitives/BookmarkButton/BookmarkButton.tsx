"use client";

import { Bookmark } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/shared/utils/merge-class-names";
import type {
BookmarkMutationErrorState,
BookmarkMutationErrorStateKind,
} from "@/features/bookmarks/utils";

import { BookmarkButtonErrorNotice } from "./BookmarkButtonErrorNotice";

const SIGN_IN_TOOLTIP = "Sign in to bookmark";
const BOOKMARKED_TEST_ID = "bookmark-button-bookmarked";
const NOT_BOOKMARKED_TEST_ID = "bookmark-button-not-bookmarked";
const SIGN_IN_TEST_ID = "bookmark-button-signin-tooltip";
const LOADING_TEST_ID = "bookmark-button-loading";

export type BookmarkButtonVariant = "icon" | "iconWithLabel";

const BASE_BUTTON_CLASS =
"h-9 min-w-28 px-4 text-sm font-medium transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

const ICON_BUTTON_CLASS = "h-9 w-9 p-0";

const LOADING_PULSE_CLASS = "animate-pulse text-muted-foreground";

export interface BookmarkButtonProps {
isBookmarked: boolean;
isLoading: boolean;
isAuthenticated: boolean;
isPending: boolean;
errorState: BookmarkMutationErrorState | null;
onToggle: () => void;
variant?: BookmarkButtonVariant;
className?: string;
}

function resolveVisualState(
isBookmarked: boolean,
isAuthenticated: boolean,
isLoading: boolean,
isPending: boolean,
variant: BookmarkButtonVariant,
): {
disabled: boolean;
ariaBusy: boolean;
label: string;
testId: string;
ariaPressed: boolean | undefined;
title: string | undefined;
ariaDescribedBy: string | undefined;
testIdSuffix: BookmarkButtonVisualTestId;
iconClassName: string;
iconWrapperClassName: string;
} {
if (!isAuthenticated) {
return {
disabled: true,
ariaBusy: false,
label: variant === "iconWithLabel" ? "Bookmark" : "",
testId: SIGN_IN_TEST_ID,
ariaPressed: undefined,
title: SIGN_IN_TOOLTIP,
ariaDescribedBy: "bookmark-button-signin-tooltip-description",
testIdSuffix: "signin",
iconClassName: "text-muted-foreground",
iconWrapperClassName:
variant === "iconWithLabel" ? "mr-2 h-4 w-4" : "h-4 w-4",
    };
  }

if (isLoading) {
return {
disabled: true,
ariaBusy: false,
label: variant === "iconWithLabel" ? "Loading…" : "",
testId: LOADING_TEST_ID,
ariaPressed: undefined,
title: undefined,
ariaDescribedBy: undefined,
testIdSuffix: "loading",
iconClassName: LOADING_PULSE_CLASS,
iconWrapperClassName:
variant === "iconWithLabel" ? "mr-2 h-4 w-4" : "h-4 w-4",
    };
  }

if (isPending) {
return {
disabled: true,
ariaBusy: true,
label: isBookmarked ? "Bookmarked" : "Bookmark",
testId: isBookmarked ? BOOKMARKED_TEST_ID : NOT_BOOKMARKED_TEST_ID,
ariaPressed: isBookmarked,
title: undefined,
ariaDescribedBy: undefined,
testIdSuffix: isBookmarked ? "bookmarked" : "not-bookmarked",
iconClassName: isBookmarked
? "fill-current text-current"
: "text-current",
iconWrapperClassName:
variant === "iconWithLabel" ? "mr-2 h-4 w-4" : "h-4 w-4",
    };
  }

if (isBookmarked) {
return {
disabled: false,
ariaBusy: false,
label: variant === "iconWithLabel" ? "Bookmarked" : "",
testId: BOOKMARKED_TEST_ID,
ariaPressed: true,
title: undefined,
ariaDescribedBy: undefined,
testIdSuffix: "bookmarked",
iconClassName: "fill-current text-current",
iconWrapperClassName:
variant === "iconWithLabel" ? "mr-2 h-4 w-4" : "h-4 w-4",
    };
  }

return {
disabled: false,
ariaBusy: false,
label: variant === "iconWithLabel" ? "Bookmark" : "",
testId: NOT_BOOKMARKED_TEST_ID,
ariaPressed: false,
title: undefined,
ariaDescribedBy: undefined,
testIdSuffix: "not-bookmarked",
iconClassName: "text-muted-foreground",
iconWrapperClassName:
variant === "iconWithLabel" ? "mr-2 h-4 w-4" : "h-4 w-4",
  };
}

type BookmarkButtonVisualTestId =
| "signin"
  | "loading"
  | "bookmarked"
  | "not-bookmarked";

function shouldRenderInlineNotice(
kind: BookmarkMutationErrorStateKind | null,
): boolean {
if (kind === null) return false;
if (kind === "ok") return false;
if (kind === "setup-prompt") return false;
return true;
}

export function BookmarkButton({
isBookmarked,
isLoading,
isAuthenticated,
isPending,
errorState,
onToggle,
variant = "icon",
className,
}: BookmarkButtonProps) {
const visual = resolveVisualState(
isBookmarked,
isAuthenticated,
isLoading,
isPending,
variant,
  );

const handleClick = () => {
if (!isAuthenticated || isLoading || isPending) return;
onToggle();
  };

const tooltipDescriptionId = "bookmark-button-signin-tooltip-description";
const showSignInTooltip = !isAuthenticated;
const inlineNotice = shouldRenderInlineNotice(errorState?.kind ?? null)
? errorState
: null;

return (
<div
className={cn("flex flex-col items-start gap-1", className)}
data-testid="bookmark-button-slot"
data-variant={variant}
data-state={visual.testIdSuffix}
data-authenticated={isAuthenticated ? "true" : "false"}
data-pending={isPending ? "true" : "false"}
    >
{inlineNotice !== null ? (
<BookmarkButtonErrorNotice errorState={inlineNotice} />
      ) : null}
<Button
type="button"
size={variant === "iconWithLabel" ? "default" : "icon"}
disabled={visual.disabled}
aria-busy={visual.ariaBusy ? "true" : undefined}
aria-pressed={visual.ariaPressed}
aria-disabled={visual.disabled ? "true" : undefined}
aria-describedby={
visual.ariaDescribedBy ? tooltipDescriptionId : undefined
        }
aria-label={
variant === "icon"
? isBookmarked
? "Remove bookmark"
: "Add bookmark"
: undefined
        }
title={visual.title}
data-testid={visual.testId}
data-bookmarked={isBookmarked ? "true" : "false"}
onClick={handleClick}
className={cn(
variant === "iconWithLabel"
? BASE_BUTTON_CLASS
: cn(
ICON_BUTTON_CLASS,
"bg-transparent text-muted-foreground",
"hover:bg-default/10 hover:text-default",
              ),
        )}
      >
<Bookmark
aria-hidden="true"
className={cn(visual.iconWrapperClassName, visual.iconClassName)}
        />
{variant === "iconWithLabel" ? visual.label : null}
</Button>
{showSignInTooltip ? (
<span
id={tooltipDescriptionId}
className="sr-only"
data-testid="bookmark-button-signin-tooltip-description"
        >
{SIGN_IN_TOOLTIP}
</span>
      ) : null}
</div>
  );
}
