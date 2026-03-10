# 🔍 QuizHub Frontend — Project Audit Report

> **Date:** March 9, 2026  
> **Stack:** Next.js 16.1 · React 19 · TypeScript 5.9 · Tailwind CSS 4 · ShadCN/UI

---

## Table of Contents

1. [🏗️ Architecture & Structure](#1--architecture--structure)
2. [🧩 Code Quality & Duplication](#2--code-quality--duplication)
3. [🔐 Type Safety & Data Modeling](#3--type-safety--data-modeling)
4. [🎨 Styling & Theming](#4--styling--theming)
5. [🧪 Testing](#5--testing)
6. [⚡ Performance](#6--performance)
7. [🔒 Security & Auth](#7--security--auth)
8. [🐳 DevOps & Deployment](#8--devops--deployment)
9. [♿ Accessibility](#9--accessibility)
10. [📦 Miscellaneous](#10--miscellaneous)

---

## 1. 🏗️ Architecture & Structure

### 1.1 No API/Service Layer

| Severity    | Category     |
| ----------- | ------------ |
| 🔴 Critical | Architecture |

All data is hardcoded in `src/constants/` as mock data. There is **no API service layer**, no `fetch`/`axios` wrappers, and no SWR/React Query data-fetching patterns despite `swr` being listed as a dependency in `package.json`.

**Files affected:** All page components consume data directly from constants.

**Recommendation:** Create a `src/services/` or `src/api/` layer with typed fetch functions, and use `swr` (already installed) for client-side data fetching with caching.

---

### 1.2 No Authentication or Middleware

| Severity    | Category     |
| ----------- | ------------ |
| 🔴 Critical | Architecture |

- No `middleware.ts` file exists — no route protection.
- Login/signup pages use `console.log()` as the "submit" handler. There is no actual auth flow.
- `LayoutShell` checks for auth pages by pathname string matching, but there's no auth state or session management.
- The header displays a hardcoded user avatar (`JD`) and wallet balance (`$124.50`).

**Recommendation:** Implement NextAuth.js or a similar auth solution with proper middleware for route guards.

---

### 1.3 No Environment Variable Configuration

| Severity  | Category     |
| --------- | ------------ |
| 🟡 Medium | Architecture |

No `.env`, `.env.local`, or `.env.example` files exist. When an API layer is added, there will be no pattern for managing API URLs, secrets, or feature flags.

**Recommendation:** Create a `.env.example` documenting all expected environment variables.

---

### 1.4 Missing Barrel Exports for Components

| Severity  | Category     |
| --------- | ------------ |
| 🟡 Medium | Organization |

The `src/hooks/` directory has a proper `index.ts` barrel file, but `src/components/`, `src/types/`, and `src/constants/` do not. This leads to inconsistent import patterns across the project.

---

### 1.5 Constants Use `.tsx` Extension Without JSX

| Severity | Category     |
| -------- | ------------ |
| 🟢 Low   | Organization |

All 18 files in `src/constants/` use the `.tsx` extension (e.g., `categories.tsx`, `players.tsx`, `leaderBoard.tsx`) even though they contain pure data — no JSX. They should use `.ts`.

**Exception:** Files like `sideBarItems.tsx` that import React icons are valid as `.tsx`.

---

## 2. 🧩 Code Quality & Duplication

### 2.1 Duplicate `QuizResult` Interface

| Severity    | Category    |
| ----------- | ----------- |
| 🔴 Critical | Duplication |

The `QuizResult` interface is defined **twice** with identical fields:

- `src/types/quizResults.ts` — the canonical type file
- `src/components/PlayQuizClient.tsx` (lines 41–49) — re-declared locally

**Recommendation:** Remove the local interface from `PlayQuizClient.tsx` and import from `@/types/quizResults`.

---

### 2.2 Duplicate Utility Functions

| Severity    | Category    |
| ----------- | ----------- |
| 🔴 Critical | Duplication |

| Function          | Location 1                   | Location 2                                          |
| ----------------- | ---------------------------- | --------------------------------------------------- |
| `getStorageKey()` | `PlayQuizClient.tsx:26`      | `lib/quizResultsUtils.ts:2`                         |
| `getResultsKey()` | `PlayQuizClient.tsx:27`      | `lib/quizResultsUtils.ts:3`                         |
| `formatTime()`    | `PlayQuizClient.tsx:337-344` | `lib/quizResultsUtils.ts:6-10`                      |
| `QuizProgress`    | `PlayQuizClient.tsx:30-38`   | `hooks/use-local-storage.ts:76` (`useQuizProgress`) |

**Recommendation:** Consolidate all quiz utility functions in `lib/quizResultsUtils.ts` and remove duplicates from `PlayQuizClient.tsx`.

---

### 2.3 Inconsistent Mobile Detection

| Severity  | Category      |
| --------- | ------------- |
| 🟡 Medium | Inconsistency |

Two different mobile detection strategies are used:

| Approach                              | File                  | Method                                         |
| ------------------------------------- | --------------------- | ---------------------------------------------- |
| Custom hook                           | `hooks/use-mobile.ts` | `useIsMobile()` — used in `PlayQuizClient.tsx` |
| Manual `useState` + `resize` listener | `AppHeader.tsx:13-20` | Raw `window.innerWidth < 768`                  |

**Recommendation:** Use `useIsMobile()` everywhere. Remove the manual implementation in `AppHeader.tsx`.

---

### 2.4 Excessive `eslint-disable` Comments

| Severity  | Category     |
| --------- | ------------ |
| 🟡 Medium | Code Quality |

**11 instances** of `eslint-disable` found, 8 of which are in `PlayQuizClient.tsx` alone, all suppressing `react-hooks/exhaustive-deps`. This hides real dependency bugs.

**Other files:**

- `ShareModal.tsx` — disables `@next/next/no-img-element`
- `LeaderboardHeader.tsx` — disables `@typescript-eslint/no-unused-vars` (file-wide!)
- `use-keyboard-shortcut.ts` — disables exhaustive-deps

**Recommendation:** Fix the underlying dependency arrays instead of suppressing warnings. Refactor `PlayQuizClient.tsx` to use `useCallback` properly with correct dependency lists.

---

### 2.5 `console.log` Statements in Production Code

| Severity  | Category     |
| --------- | ------------ |
| 🟡 Medium | Code Quality |

**6 `console.log` statements** found in source code:

| File                       | Line   | Content                                        |
| -------------------------- | ------ | ---------------------------------------------- |
| `login/page.tsx`           | 54     | `console.log('Login attempt:', data)`          |
| `login/page.tsx`           | 60     | `console.log('Login with ${provider}')`        |
| `signup/page.tsx`          | 62, 67 | Similar login/signup logs                      |
| `forgot-password/page.tsx` | 39     | `console.log('Password reset request:', data)` |
| `support/ContactForm.tsx`  | 83     | `console.log('Form submitted:', ...)`          |

**Recommendation:** Remove all `console.log` statements. Add an ESLint rule (`no-console`) to prevent future occurrences.

---

### 2.6 Oversized Component: `PlayQuizClient.tsx`

| Severity  | Category     |
| --------- | ------------ |
| 🟡 Medium | Code Quality |

At **568 lines**, `PlayQuizClient.tsx` is a god component handling:

- Quiz state management
- Timer logic
- Keyboard shortcuts (7 separate `useKeyboardShortcut` calls)
- Swipe gesture handling
- Fullscreen management
- Answer selection
- Score calculation
- `localStorage` persistence
- Navigation

**Recommendation:** Extract into smaller modules: `useQuizState`, `useQuizKeyboardShortcuts`, `QuizHeader`, `QuizQuestionCard`, `QuizNavigation`.

---

### 2.7 Direct `localStorage.setItem` Bypassing Hook

| Severity  | Category      |
| --------- | ------------- |
| 🟡 Medium | Inconsistency |

`PlayQuizClient.tsx:194` directly calls `localStorage.setItem(resultsKey, JSON.stringify(result))` instead of using the `useLocalStorage` hook that exists in the project. This creates an inconsistency in state management.

---

## 3. 🔐 Type Safety & Data Modeling

### 3.1 `score` Field Has Inconsistent Type

| Severity    | Category    |
| ----------- | ----------- |
| 🔴 Critical | Type Safety |

In `types/quiz.ts:46`, the leaderboard `score` field is typed as `number | string`:

```typescript
score: number | string // '98%' in some places, 95 in others
```

In the mock data (`mockQuizzes.tsx`), some quizzes use numeric scores (`95`, `90`) while others use string scores (`'98%'`, `'95%'`). This will cause runtime bugs when sorting or comparing scores.

**Recommendation:** Standardize to `number` and format for display.

---

### 3.2 Redundant Fields in `Quiz` Type

| Severity  | Category      |
| --------- | ------------- |
| 🟡 Medium | Data Modeling |

The `Quiz` interface has several redundant field pairs:

| Field 1            | Field 2           | Issue                         |
| ------------------ | ----------------- | ----------------------------- |
| `creator.name`     | `authorName`      | Duplicate author name         |
| `creator.imageURL` | `authorAvatarSrc` | Duplicate avatar URL          |
| `currentPlayers`   | `players`         | Always identical in mock data |
| `spots`            | `maxPlayers`      | Same concept, different names |

**Recommendation:** Remove `authorName`, `authorAvatarSrc`, `players`, and derive/rename as needed.

---

### 3.3 Default Data Mixed Into Type Files

| Severity  | Category               |
| --------- | ---------------------- |
| 🟡 Medium | Separation of Concerns |

`src/types/settings.ts` contains both type definitions AND runtime data:

- `defaultSettings` — hardcoded user defaults (lines 65–108)
- `languages`, `timezones`, `dateFormats` — static reference data (lines 110–143)

**Recommendation:** Move runtime data to `src/constants/settings.ts`. Keep only interfaces and types in the type file.

---

### 3.4 Mock Quizzes With Empty Data

| Severity | Category     |
| -------- | ------------ |
| 🟢 Low   | Data Quality |

Quizzes with IDs `3` and `4` have:

- `questionCount: 0` with `questions: []` — will cause division-by-zero on percentage calculations
- `description: ''` — empty descriptions
- `bgGradient: ''` — empty gradient values

This could cause runtime errors in components that don't null-check these values.

---

## 4. 🎨 Styling & Theming

### 4.1 Hardcoded Dark Theme Classes on `<body>`

| Severity    | Category |
| ----------- | -------- |
| 🔴 Critical | Theming  |

In `layout.tsx:27`, the `<body>` has hardcoded dark-theme classes:

```tsx
className={`${inter.className} antialiased bg-slate-900 text-white overflow-x-hidden`}
```

This **conflicts with the `ThemeProvider`** which manages light/dark themes dynamically. The `bg-slate-900 text-white` will always apply regardless of the selected theme.

**Recommendation:** Remove `bg-slate-900 text-white` and rely on the CSS variables (`bg-background text-foreground`) that are already defined in `globals.css`.

---

### 4.2 Inconsistent Border Styling

| Severity  | Category    |
| --------- | ----------- |
| 🟡 Medium | Consistency |

Border colors are inconsistently applied across components:

- Some use theme tokens: `border-border`
- Most hardcode: `border-gray-300 dark:border-slate-700`

This appears in virtually every component and means border styling won't automatically adapt to theme changes.

**Recommendation:** Define a consistent border color in CSS variables and use `border-border` everywhere.

---

### 4.3 Unused CSS Custom Property

| Severity | Category |
| -------- | -------- |
| 🟢 Low   | Cleanup  |

`globals.css:143` defines `--font-primary: "var(--font-inter)"` but this is never referenced anywhere in the codebase. The Inter font is applied directly via `className` in `layout.tsx`.

---

### 4.4 Non-Standard Breakpoint

| Severity | Category  |
| -------- | --------- |
| 🟢 Low   | Standards |

`globals.css:141` defines `--breakpoint-xxl: 1536px`, but `xxl` is not a standard Tailwind breakpoint. The standard is `2xl`. If this is intentional, it should be documented.

---

## 5. 🧪 Testing

### 5.1 Zero Test Files

| Severity    | Category |
| ----------- | -------- |
| 🔴 Critical | Testing  |

There are **no test files** in the entire project — no `*.test.ts`, `*.test.tsx`, `*.spec.ts`, or `*.spec.tsx` files. No testing framework (Jest, Vitest, Playwright, Cypress) is configured.

**Recommendation:** At minimum, set up Vitest for unit/component tests and Playwright for E2E tests. Priority areas:

1. `PlayQuizClient` — quiz state transitions and scoring
2. `useLocalStorage` / `useCountdownTimer` hooks
3. Login/signup form validation
4. Score calculation utilities in `lib/quizResultsUtils.ts`

---

## 6. ⚡ Performance

### 6.1 `use client` Overuse

| Severity  | Category    |
| --------- | ----------- |
| 🟡 Medium | Performance |

**65+ files** use the `'use client'` directive, including many components that could be Server Components with light client interactivity extracted into smaller client components.

Examples of components that could be Server Components:

- `QuizCard.tsx` — purely presentational
- `QuizCategoriesCard.tsx` — purely presentational
- `HowItWorks.tsx` — static content
- `StarRating.tsx` — purely presentational

**Recommendation:** Audit `'use client'` usage and push interactivity to the smallest possible leaf components.

---

### 6.2 Unused `swr` Dependency

| Severity | Category    |
| -------- | ----------- |
| 🟢 Low   | Bundle Size |

`swr` (v2.4.0) is listed in `package.json` but never imported anywhere. It increases the install footprint needlessly.

**Recommendation:** Remove `swr` from dependencies or start using it for data fetching.

---

### 6.3 Large Mock Data Files

| Severity | Category    |
| -------- | ----------- |
| 🟢 Low   | Bundle Size |

`constants/mockQuizzes.tsx` is **567 lines / 14.4 KB** of hardcoded quiz data, all of which is bundled into the client. Several other constant files (`players.tsx`, `quizHistory.tsx`, `leaderBoard.tsx`) add to this.

**Recommendation:** When moving to API-driven data, remove these files. For development, use MSW (Mock Service Worker) or a JSON file loaded on demand.

---

## 7. 🔒 Security & Auth

### 7.1 Login Schema Mismatch

| Severity  | Category |
| --------- | -------- |
| 🟡 Medium | Bug      |

The login form has a `loginSchema` that requires `firstName` and `lastName` fields:

```typescript
const loginSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  ...
})
```

But the login **form UI only shows email and password inputs** — no first/last name fields. This means the form will never validate successfully because the required first/last name fields are empty (hidden but required).

**Recommendation:** Remove `firstName` and `lastName` from the login schema (they belong in the signup schema).

---

### 7.2 No CSRF or Rate-Limiting Setup

| Severity  | Category |
| --------- | -------- |
| 🟡 Medium | Security |

No CSRF protection or rate-limiting patterns are in place. When the API layer is added, this will be critical for auth endpoints.

---

## 8. 🐳 DevOps & Deployment

### 8.1 Dockerfile is Well-Structured ✅

The multi-stage Dockerfile is well done — proper `standalone` output, non-root user, multi-lockfile detection. No significant issues found.

### 8.2 No CI/CD Pipeline

| Severity  | Category |
| --------- | -------- |
| 🟡 Medium | DevOps   |

The `.github/` directory exists but no CI/CD workflow was observed for lint, build, or test automation.

**Recommendation:** Add a GitHub Actions workflow that runs `pnpm lint`, `pnpm build`, and tests on every PR.

---

## 9. ♿ Accessibility

### 9.1 Keyboard-only Shortcut: ⌘K Displayed on All Platforms

| Severity | Category      |
| -------- | ------------- |
| 🟢 Low   | Accessibility |

`AppHeader.tsx:59` shows `⌘K` for the search shortcut, but this is macOS-specific. On Linux/Windows, it should show `Ctrl+K`.

---

### 9.2 Hardcoded Notification Count in Messages Button

| Severity | Category                    |
| -------- | --------------------------- |
| 🟢 Low   | Accessibility / Correctness |

`AppHeader.tsx:72` — The messages button has `aria-label='Messages (2 unread)'` with a hardcoded `2`, and the badge also shows a hardcoded `2`. This should be driven by actual data.

---

## 10. 📦 Miscellaneous

### 10.1 Relative Import in `not-found.tsx`

| Severity | Category    |
| -------- | ----------- |
| 🟢 Low   | Consistency |

`not-found.tsx:4` uses a relative import:

```typescript
import { GoBackButton } from '../components/GoBackButton'
```

All other files consistently use the `@/` alias. This should be `@/components/GoBackButton`.

---

### 10.2 Named + Default Export Conflict

| Severity | Category    |
| -------- | ----------- |
| 🟢 Low   | Consistency |

`constants/mockQuizzes.tsx` exports `quizzes` twice:

```typescript
export const quizzes: Quiz[] = [ ... ]  // named export (line 3)
export default quizzes                    // default export (line 566)
```

Consumers are split: `page.tsx` uses `{ quizzes }` (named), some may use the default. Pick one convention.

---

### 10.3 `useQuizProgress` Hook Is Never Used

| Severity | Category  |
| -------- | --------- |
| 🟢 Low   | Dead Code |

`hooks/use-local-storage.ts` exports a `useQuizProgress` helper hook (lines 76–88), but `PlayQuizClient.tsx` directly uses `useLocalStorage` with a manual storage key instead of using this hook.

**Recommendation:** Either use `useQuizProgress` in `PlayQuizClient.tsx` or remove the dead code.

---

### 10.4 `QuizProgress` Interface Not Exported

| Severity | Category    |
| -------- | ----------- |
| 🟢 Low   | Reusability |

The `QuizProgress` interface is defined locally inside `PlayQuizClient.tsx` and never exported. This makes it impossible to reuse in other components (e.g., resume-quiz dialogs).

---

## Summary

| Severity    | Count |
| ----------- | ----- |
| 🔴 Critical | 7     |
| 🟡 Medium   | 12    |
| 🟢 Low      | 10    |

### Top Priority Fixes

1. **Remove hardcoded `bg-slate-900 text-white` from `layout.tsx`** — theming is broken
2. **Fix login schema** (`firstName`/`lastName` required but no UI fields)
3. **Consolidate duplicate code** (QuizResult interface, utility functions)
4. **Standardize `score` type** to `number` across all interfaces and data
5. **Add at least basic test coverage** for critical paths
6. **Create an API/services layer** to replace hardcoded mock data
7. **Remove `eslint-disable` comments** and fix actual dependency issues
