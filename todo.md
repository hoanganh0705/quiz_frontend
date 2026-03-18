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
