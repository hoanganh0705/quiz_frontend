'use client';

/**
 * `<BookmarkButton />` — the controlled bookmark icon button primitive.
 *
 * Source epic:   Story 3.10 — Bookmarks add / remove + membership lookup.
 * Source ticket: TKT-3.10.D1.
 *
 * ## What this primitive owns
 *
 *   - The disabled / aria / `data-testid` shape so the same primitive
 *     can be reused by the Phase 3 card surfaces (Epic 3.1) and the
 *     detail CTA strip (Epic 3.6).
 *   - The five document branches:
 *       1. **Unauthenticated** — disabled, "Sign in to bookmark" tooltip.
 *       2. **Loading / unknown** — neutral outline, non-clickable,
 *          subtle pulse, no spinner.
 *       3. **Bookmarked** — filled icon, `aria-pressed=true`, label
 *          matches the resolved state.
 *       4. **Unbookmarked** — outlined icon, `aria-pressed=false`.
 *       5. **Pending** — keeps the optimistic icon, prevents a second
 *          native click; text from the *previous* state (no flicker).
 *   - The inline `<BookmarkButtonErrorNotice />` rendered in the same
 *     DOM region above the button — no CLS.
 *   - Two visual variants (`icon` and `iconWithLabel`).
 *
 * ## What this primitive does NOT own
 *
 *   - The optimistic update + rollback discipline — the slot (D4)
 *     instantiates the C1/C2 action hooks via `useOptimisticToggle`
 *     and forwards the resolved pending state + lastError via props.
 *   - The auth state — the slot (D4) passes `isAuthenticated` as a
 *     prop so this primitive remains reusable outside the auth-aware
 *     composition (mirroring the FollowButton B2 discipline).
 *   - The setup prompt — the slot (D4) reacts to a `no_collection`
 *     outcome by opening `<BookmarksSetupPrompt />`; the primitive
 *     does not know that outcome exists.
 *   - SWR, the wrapper, or generated SDK — this primitive has zero
 *     network knowledge (D1 AC #6).
 *
 * @see useOptimisticToggle (Story 3.9 B1)
 * @see useBookmarkQuiz / useUnbookmarkQuiz (C1 / C2 — the writers)
 * @see BookmarkButtonSlot (D4 — the consumer)
 */

import { Bookmark } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { cn } from '@/shared/utils/merge-class-names';
import type {
  BookmarkMutationErrorState,
  BookmarkMutationErrorStateKind,
} from '@/features/bookmarks/utils';

import { BookmarkButtonErrorNotice } from './BookmarkButtonErrorNotice';

const SIGN_IN_TOOLTIP = 'Sign in to bookmark';

const BOOKMARKED_TEST_ID = 'bookmark-button-bookmarked';
const NOT_BOOKMARKED_TEST_ID = 'bookmark-button-not-bookmarked';
const SIGN_IN_TEST_ID = 'bookmark-button-signin-tooltip';
const LOADING_TEST_ID = 'bookmark-button-loading';

/**
 * The visual variant for the bookmark button primitive.
 *
 *   - `icon` — square icon-only button used by `<QuizCard />` and
 *     other card surfaces.
 *   - `iconWithLabel` — wider button rendered with a visible label
 *     ("Bookmark" / "Bookmarked"), used by `<QuizCtaStrip />` on the
 *     quiz detail surface.
 */
export type BookmarkButtonVariant = 'icon' | 'iconWithLabel';

const BASE_BUTTON_CLASS =
  'h-9 min-w-28 px-4 text-sm font-medium transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

const ICON_BUTTON_CLASS = 'h-9 w-9 p-0';

const LOADING_PULSE_CLASS =
  'animate-pulse text-muted-foreground';

export interface BookmarkButtonProps {
  /**
   * Whether the authenticated user currently has the quiz
   * bookmarked. The slot (D4) reads this from `useIsBookmarked`
   * (B4).
   */
  isBookmarked: boolean;
  /**
   * Whether the membership is currently hydrating. The slot (D4)
   * forwards the union of `useIsBookmarked().isLoading` plus the
   * initial SWR hydration. Renders the loading branch.
   */
  isLoading: boolean;
  /**
   * Whether the user is authenticated. `false` renders the
   * disabled branch (no click action).
   */
  isAuthenticated: boolean;
  /**
   * Whether the most recent `bookmark()` / `unbookmark()` call is
   * in-flight. The primitive renders the busy state with the icon
   * from the *previous* state (no flicker).
   */
  isPending: boolean;
  /**
   * The discriminated error state from the C3 mapper. `null`
   * renders no inline notice. `kind === 'setup-prompt'` is the
   * non-error signal the slot should react to; the primitive
   * renders no inline copy for that kind (the slot opens the
   * setup prompt directly).
   */
  errorState: BookmarkMutationErrorState | null;
  /**
   * The click handler. The slot (D4) wires
   * `onToggle={isBookmarked ? unbookmark : bookmark}` and forwards
   * the action hooks' Promise-resolved callbacks.
   */
  onToggle: () => void;
  /**
   * The visual variant. Defaults to `'icon'`. The slot (D4)
   * chooses between card mode (`'icon'`) and detail-strip mode
   * (`'iconWithLabel'`).
   */
  variant?: BookmarkButtonVariant;
  /**
   * Optional className applied to the outer flex column wrapper.
   */
  className?: string;
}

/**
 * Resolve the visual attributes of the button for the
 * `(isBookmarked, isAuthenticated, isLoading, isPending)` tuple.
 *
 * The label is the text from the *previous* state when `isPending`
 * is `true` (no flicker — Story 3.9 AC #3 mirrors to D1 AC #4).
 */
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
  // 1. Unauthenticated branch — disabled + tooltip.
  if (!isAuthenticated) {
    return {
      disabled: true,
      ariaBusy: false,
      label: variant === 'iconWithLabel' ? 'Bookmark' : '',
      testId: SIGN_IN_TEST_ID,
      ariaPressed: undefined,
      title: SIGN_IN_TOOLTIP,
      ariaDescribedBy: 'bookmark-button-signin-tooltip-description',
      testIdSuffix: 'signin',
      iconClassName: 'text-muted-foreground',
      iconWrapperClassName:
        variant === 'iconWithLabel' ? 'mr-2 h-4 w-4' : 'h-4 w-4',
    };
  }

  // 2. Loading branch — neutral, non-clickable, subtle pulse.
  //    Renders the outline icon (the resolved state is unknown).
  if (isLoading) {
    return {
      disabled: true,
      ariaBusy: false,
      label: variant === 'iconWithLabel' ? 'Loading…' : '',
      testId: LOADING_TEST_ID,
      ariaPressed: undefined,
      title: undefined,
      ariaDescribedBy: undefined,
      testIdSuffix: 'loading',
      iconClassName: LOADING_PULSE_CLASS,
      iconWrapperClassName:
        variant === 'iconWithLabel' ? 'mr-2 h-4 w-4' : 'h-4 w-4',
    };
  }

  // 3. Pending branch — keeps the optimistic icon from the previous
  //    state, prevents a second click. Text and icon are from
  //    `isBookmarked` at the moment the toggle was issued.
  if (isPending) {
    return {
      disabled: true,
      ariaBusy: true,
      label: isBookmarked ? 'Bookmarked' : 'Bookmark',
      testId: isBookmarked ? BOOKMARKED_TEST_ID : NOT_BOOKMARKED_TEST_ID,
      ariaPressed: isBookmarked,
      title: undefined,
      ariaDescribedBy: undefined,
      testIdSuffix: isBookmarked ? 'bookmarked' : 'not-bookmarked',
      iconClassName: isBookmarked
        ? 'fill-current text-current'
        : 'text-current',
      iconWrapperClassName:
        variant === 'iconWithLabel' ? 'mr-2 h-4 w-4' : 'h-4 w-4',
    };
  }

  // 4. Resolved bookmarked state.
  if (isBookmarked) {
    return {
      disabled: false,
      ariaBusy: false,
      label: variant === 'iconWithLabel' ? 'Bookmarked' : '',
      testId: BOOKMARKED_TEST_ID,
      ariaPressed: true,
      title: undefined,
      ariaDescribedBy: undefined,
      testIdSuffix: 'bookmarked',
      iconClassName: 'fill-current text-current',
      iconWrapperClassName:
        variant === 'iconWithLabel' ? 'mr-2 h-4 w-4' : 'h-4 w-4',
    };
  }

  // 5. Resolved unbookmarked state.
  return {
    disabled: false,
    ariaBusy: false,
    label: variant === 'iconWithLabel' ? 'Bookmark' : '',
    testId: NOT_BOOKMARKED_TEST_ID,
    ariaPressed: false,
    title: undefined,
    ariaDescribedBy: undefined,
    testIdSuffix: 'not-bookmarked',
    iconClassName: 'text-muted-foreground',
    iconWrapperClassName:
      variant === 'iconWithLabel' ? 'mr-2 h-4 w-4' : 'h-4 w-4',
  };
}

type BookmarkButtonVisualTestId =
  | 'signin'
  | 'loading'
  | 'bookmarked'
  | 'not-bookmarked';

/**
 * The primitive renders `setup-prompt` (a non-error signal) as
 * `null` — the slot (D4) reacts to that kind by opening the setup
 * prompt; the primitive's role is the button + inline notice only.
 */
function shouldRenderInlineNotice(
  kind: BookmarkMutationErrorStateKind | null,
): boolean {
  if (kind === null) return false;
  if (kind === 'ok') return false;
  if (kind === 'setup-prompt') return false;
  return true;
}

export function BookmarkButton({
  isBookmarked,
  isLoading,
  isAuthenticated,
  isPending,
  errorState,
  onToggle,
  variant = 'icon',
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

  const tooltipDescriptionId = 'bookmark-button-signin-tooltip-description';
  const showSignInTooltip = !isAuthenticated;
  const inlineNotice = shouldRenderInlineNotice(errorState?.kind ?? null)
    ? errorState
    : null;

  return (
    <div
      className={cn('flex flex-col items-start gap-1', className)}
      data-testid='bookmark-button-slot'
      data-variant={variant}
      data-state={visual.testIdSuffix}
      data-authenticated={isAuthenticated ? 'true' : 'false'}
      data-pending={isPending ? 'true' : 'false'}
    >
      {inlineNotice !== null ? (
        <BookmarkButtonErrorNotice errorState={inlineNotice} />
      ) : null}
      <Button
        type='button'
        variant={
          variant === 'iconWithLabel'
            ? isBookmarked
              ? 'default'
              : 'outline'
            : 'ghost'
        }
        size={variant === 'iconWithLabel' ? 'default' : 'icon'}
        disabled={visual.disabled}
        aria-busy={visual.ariaBusy ? 'true' : undefined}
        aria-pressed={visual.ariaPressed}
        aria-disabled={visual.disabled ? 'true' : undefined}
        aria-describedby={
          visual.ariaDescribedBy ? tooltipDescriptionId : undefined
        }
        aria-label={
          variant === 'icon'
            ? isBookmarked
              ? 'Remove bookmark'
              : 'Add bookmark'
            : undefined
        }
        title={visual.title}
        data-testid={visual.testId}
        data-bookmarked={isBookmarked ? 'true' : 'false'}
        onClick={handleClick}
        className={
          variant === 'iconWithLabel' ? BASE_BUTTON_CLASS : ICON_BUTTON_CLASS
        }
      >
        <Bookmark
          aria-hidden='true'
          className={cn(visual.iconWrapperClassName, visual.iconClassName)}
        />
        {variant === 'iconWithLabel' ? visual.label : null}
      </Button>
      {/* The hidden description node for the sign-in tooltip —
          referenced by the button's `aria-describedby`. */}
      {showSignInTooltip ? (
        <span
          id={tooltipDescriptionId}
          className='sr-only'
          data-testid='bookmark-button-signin-tooltip-description'
        >
          {SIGN_IN_TOOLTIP}
        </span>
      ) : null}
    </div>
  );
}