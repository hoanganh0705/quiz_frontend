# 🚨 CRITICAL BUGS - Fix Immediately

## 🔴 Critical Bugs (Blockers)

- [ ] **Login form schema includes `firstName`/`lastName`** — copy-pasted from signup form ([src/app/login/page.tsx](src/app/login/page.tsx))
- [ ] **`difficultyColor[difficulty]` used incorrectly** — returns object with `.bg` sub-property, but code uses it directly as CSS class, rendering `[object Object]` ([src/components/QuizCardDifficulty.tsx](src/components/QuizCardDifficulty.tsx))
- [ ] **Score bar in leaderboard uses Tailwind class names as inline `style` values** — `backgroundColor: "bg-yellow-500"` won't render any color ([src/components/GlobalLeaderboard.tsx](src/components/GlobalLeaderboard.tsx))
- [ ] **`<Suspense>` used in Server Components** — has no effect in RSC; only works in client components ([src/app/daily-challenge/page.tsx](src/app/daily-challenge/page.tsx), [src/app/discussions/page.tsx](src/app/discussions/page.tsx), [src/app/leaderboard/page.tsx](src/app/leaderboard/page.tsx))
- [ ] **CSS class typo** — `"bg-muted/50rounded-lg"` (missing space) ([src/app/discussions/page.tsx](src/app/discussions/page.tsx))
- [ ] **`<Link>` wrapping a `<Button>`** — invalid HTML nesting (`<a>` inside `<button>`) ([src/components/QuizCard.tsx](src/components/QuizCard.tsx))
- [ ] **Correct answers exposed to client** — `correctAnswer` field in `Quiz` type is sent to browser, enabling cheating via DevTools ([src/types/quiz.ts](src/types/quiz.ts))

---

# 🟡 CODE QUALITY ISSUES - Technical Debt

## Architecture & Types

- [ ] **Decompose `Quiz` god type** (29+ fields) — split into smaller interfaces: `QuizMetadata`, `QuizQuestion`, `QuizReview`, `QuizLeaderboardEntry`, etc.
- [ ] **Remove duplicate type declarations** — `Bookmark` and `BookmarkCollection` defined in both [src/types/bookmarks.ts](src/types/bookmarks.ts) and [src/hooks/use-bookmarks.ts](src/hooks/use-bookmarks.ts)
- [ ] **Fix inconsistent `id` typing** — `id` is `number` in `QuizCategoriesCard` but `string` in `QuizCategory` type
- [ ] **Fix `Article.icon` storing React components** — makes articles non-serializable; use string icon names instead
- [ ] **Unify 3 overlapping quiz card components** — `QuizCard`, `QuizCardDetail`, `QuizCardDifficulty` should use variants instead

## Custom Hooks

- [ ] **Add missing `'use client'` directive** to 10+ hooks using React hooks/browser APIs
- [ ] **Add abort/cancellation support** to `use-async-action` — prevent stale closures setting state on unmounted components
- [ ] **Fix timer drift in `use-countdown-timer`** — use `Date.now()`-based approach instead of `setInterval`
- [ ] **Add cross-tab synchronization** to `use-local-storage` — listen for `storage` event
- [ ] **Add unmount cleanup** to `use-clipboard` timer
- [ ] **Fix swipe gesture bug** — reset `touchStartX`/`touchStartY` on new touches to prevent phantom swipe detection
- [ ] **Fix hydration mismatch** in `use-mobile` — returns `false` during SSR causing layout flash on mobile

## Page Components

- [ ] **Refactor oversized page files** — extract business logic from pages into hooks/utils:
  - [ ] bookmarks (~468 lines)
  - [ ] profile/[name] (~431 lines)
  - [ ] tournament (~358 lines)
  - [ ] my-profile (~256 lines)
  - [ ] discussions (~215 lines)

---

# 🟠 SEO & METADATA - Critical for Production

## Zero Metadata Exports (18 pages affected)

- [ ] **Add `metadata` export to all pages** — titles, descriptions, Open Graph tags
- [ ] **Add `generateMetadata` to dynamic routes** — `/quizzes/[id]`, `/profile/[name]`
- [ ] **Fix client component metadata limitation** — login, signup, forgot-password need server wrappers or layout metadata
- [ ] **Add `robots.txt` and `sitemap.xml` generation**
- [ ] **Add structured data (JSON-LD)** for quizzes and user profiles

---

# 🟠 ACCESSIBILITY (A11Y) ISSUES - Legal Compliance

## Screen Reader & Keyboard Navigation

- [ ] **Add `aria-label` to `StarRating`** — screen readers see 5 empty SVGs with no text
- [ ] **Add `aria-label` to `SpotAvailabilityIndicator`** — SVG rings are invisible to assistive tech
- [ ] **Convert leaderboard div grid to proper `<table>`** — screen readers can't interpret data as table
- [ ] **Add `aria-roledescription="carousel"`** to carousels: `QuizCategories`, `LiveWinner`, `SuccessStoryCarousel`
- [ ] **Add pause controls to auto-playing carousels** — violates WCAG 2.2.2 (Pause, Stop, Hide)
- [ ] **Add `aria-pressed` to theme toggle** — indicate current theme state
- [ ] **Fix `QuizCategoriesCard`** — looks clickable but has no link/button
- [ ] **Fix quiz answer options** — use `role="radio"` instead of `role="option"` for single-select

---

# 🔵 MISSING UI FEATURES - High Priority

## Core Infrastructure

- [ ] **🔐 Authentication integration** — no auth provider (NextAuth, Clerk, etc.) — all user data is mock
- [ ] **📡 API layer / Server Actions** — no API routes, no data fetching — everything is hardcoded constants
- [ ] **🔍 Functional search backend** — `QuickSearch` (⌘K) exists but has no real search
- [ ] **📊 Real-time features** — no WebSocket/SSE for live winner feed, notifications, tournament updates
- [ ] **🔔 Push notifications** — `NotificationDropdown` is mock-only; no service worker or push API

## Missing Pages/Features

- [ ] **User registration email verification** — no verification flow after signup
- [ ] **Password strength meter** — signup form validates but has no visual strength indicator
- [ ] **Two-factor authentication (2FA)** — settings page has no 2FA option
- [ ] **Notification preferences granularity** — settings exist but aren't wired to real channels

---

# 🌟 MEDIUM PRIORITY - Enhanced UX Features

## Friends/Social System

- [ ] Find friends page (search users)
- [ ] Friend requests management
- [ ] Friends list with online status
- [ ] Invite friends to quizzes
- [ ] Compare stats with friends

## Advanced Search & Filters

Enhance your existing search:

- [ ] Filter by difficulty, duration, category, rating
- [ ] Sort options (newest, most popular, trending)
- [ ] Search suggestions/autocomplete
- [ ] Recent searches history

---

# 💡 NICE TO HAVE - Engagement Features

## Quiz Draft/My Quizzes Management

Enhance create-quiz with:

- [ ] Draft quizzes list
- [ ] Published vs Draft tabs
- [ ] Edit existing quizzes
- [ ] Quiz analytics (plays, ratings, completion rate)
- [ ] Duplicate quiz functionality

## UX Enhancements

- [ ] **🦴 Skeleton loading states** — most card components have no skeleton/loading state
- [ ] **📱 PWA support** — add `manifest.json`, service worker for offline quiz capability
- [ ] **🎯 Confirmation dialogs** — no confirmation before quiz submit, account deletion, destructive actions
- [ ] **📈 Progress indicators** — no progress bar during quiz creation (multi-tab form)
- [ ] **🌍 i18n / Internationalization** — no internationalization despite `LanguageSettings` component
- [ ] **♿ Skip navigation link** — no "Skip to main content" link for keyboard users
- [ ] **🎨 Animation/transitions** — no page transition animations; theme toggle has no transition
- [ ] **📋 Breadcrumbs** — no breadcrumb navigation on nested pages
- [ ] **🔄 Infinite scroll or virtual lists** — leaderboard and quiz listing use basic pagination (non-functional)
- [ ] **💬 Real-time quiz discussion** — discussions page exists but has no real-time commenting
- [ ] **🏆 Achievement unlock animations** — achievements tab exists but no celebratory micro-interactions
- [ ] **📊 Quiz attempt comparison** — no way to compare past attempts on same quiz
- [ ] **🔗 Deep linking for quiz sharing** — share modal exists but URLs are title-slugified (fragile) instead of ID-based
- [ ] **📱 Native share API** — `use-share` hook doesn't use Web Share API — better mobile experience
- [ ] **⌛ "Recently played" section** — no homepage section showing recently played quizzes
- [ ] **🎵 Sound effects** — no audio feedback during quiz (correct/incorrect sounds, timer warning)
