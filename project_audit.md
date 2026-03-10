# 🔍 QuizHub Frontend — Project Audit Report

> **Date:** March 9, 2026  
> **Stack:** Next.js 16.1 · React 19 · TypeScript 5.9 · Tailwind CSS 4 · ShadCN/UI

---

## Table of Contents

1. [🏗️ Architecture & Structure](#1--architecture--structure)
2. [🔐 Type Safety & Data Modeling](#2--type-safety--data-modeling)
3. [🎨 Styling & Theming](#3--styling--theming)
4. [🧪 Testing](#4--testing)
5. [⚡ Performance](#5--performance)
6. [🔒 Security & Auth](#6--security--auth)
7. [🐳 DevOps & Deployment](#7--devops--deployment)
8. [♿ Accessibility](#8--accessibility)

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
- Login/signup pages have no actual auth flow.
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

## 2. 🔐 Type Safety & Data Modeling

### 2.1 `score` Field Has Inconsistent Type

| Severity    | Category    |
| ----------- | ----------- |
| 🔴 Critical | Type Safety |

In `types/quiz.ts:46`, the leaderboard `score` field is typed as `number | string`:

```typescript
score: number | string // '98%' in some places, 95 in others
```

In the mock data (`mockQuizzes.ts`), some quizzes use numeric scores (`95`, `90`) while others use string scores (`'98%'`, `'95%'`). This will cause runtime bugs when sorting or comparing scores.

**Recommendation:** Standardize to `number` and format for display.

---

### 2.2 Redundant Fields in `Quiz` Type

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

### 2.3 Default Data Mixed Into Type Files

| Severity  | Category               |
| --------- | ---------------------- |
| 🟡 Medium | Separation of Concerns |

`src/types/settings.ts` contains both type definitions AND runtime data:

- `defaultSettings` — hardcoded user defaults (lines 65–108)
- `languages`, `timezones`, `dateFormats` — static reference data (lines 110–143)

**Recommendation:** Move runtime data to `src/constants/settings.ts`. Keep only interfaces and types in the type file.

---

### 2.4 Mock Quizzes With Empty Data

| Severity | Category     |
| -------- | ------------ |
| 🟢 Low   | Data Quality |

Quizzes with IDs `3` and `4` have:

- `questionCount: 0` with `questions: []` — will cause division-by-zero on percentage calculations
- `description: ''` — empty descriptions
- `bgGradient: ''` — empty gradient values

This could cause runtime errors in components that don't null-check these values.

---

## 3. 🎨 Styling & Theming

### 3.1 Hardcoded Dark Theme Classes on `<body>`

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

### 3.2 Inconsistent Border Styling

| Severity  | Category    |
| --------- | ----------- |
| 🟡 Medium | Consistency |

Border colors are inconsistently applied across components:

- Some use theme tokens: `border-border`
- Most hardcode: `border-gray-300 dark:border-slate-700`

This appears in virtually every component and means border styling won't automatically adapt to theme changes.

**Recommendation:** Define a consistent border color in CSS variables and use `border-border` everywhere.

---

### 3.3 Unused CSS Custom Property

| Severity | Category |
| -------- | -------- |
| 🟢 Low   | Cleanup  |

`globals.css:143` defines `--font-primary: "var(--font-inter)"` but this is never referenced anywhere in the codebase. The Inter font is applied directly via `className` in `layout.tsx`.

---

### 3.4 Non-Standard Breakpoint

| Severity | Category  |
| -------- | --------- |
| 🟢 Low   | Standards |

`globals.css:141` defines `--breakpoint-xxl: 1536px`, but `xxl` is not a standard Tailwind breakpoint. The standard is `2xl`. If this is intentional, it should be documented.

---

## 4. 🧪 Testing

### 4.1 Zero Test Files

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

## 5. ⚡ Performance

### 5.1 `use client` Overuse

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

### 5.2 Unused `swr` Dependency

| Severity | Category    |
| -------- | ----------- |
| 🟢 Low   | Bundle Size |

`swr` (v2.4.0) is listed in `package.json` but never imported anywhere. It increases the install footprint needlessly.

**Recommendation:** Remove `swr` from dependencies or start using it for data fetching.

---

### 5.3 Large Mock Data Files

| Severity | Category    |
| -------- | ----------- |
| 🟢 Low   | Bundle Size |

`constants/mockQuizzes.ts` is **567 lines / 14.4 KB** of hardcoded quiz data, all of which is bundled into the client. Several other constant files (`players.ts`, `quizHistory.ts`, `leaderBoard.ts`) add to this.

**Recommendation:** When moving to API-driven data, remove these files. For development, use MSW (Mock Service Worker) or a JSON file loaded on demand.

---

## 6. 🔒 Security & Auth

### 6.1 No CSRF or Rate-Limiting Setup

| Severity  | Category |
| --------- | -------- |
| 🟡 Medium | Security |

No CSRF protection or rate-limiting patterns are in place. When the API layer is added, this will be critical for auth endpoints.

---

## 7. 🐳 DevOps & Deployment

### 7.1 Dockerfile is Well-Structured ✅

The multi-stage Dockerfile is well done — proper `standalone` output, non-root user, multi-lockfile detection. No significant issues found.

### 7.2 No CI/CD Pipeline

| Severity  | Category |
| --------- | -------- |
| 🟡 Medium | DevOps   |

The `.github/` directory exists but no CI/CD workflow was observed for lint, build, or test automation.

**Recommendation:** Add a GitHub Actions workflow that runs `pnpm lint`, `pnpm build`, and tests on every PR.

---

## 8. ♿ Accessibility

### 8.1 Keyboard-only Shortcut: ⌘K Displayed on All Platforms

| Severity | Category      |
| -------- | ------------- |
| 🟢 Low   | Accessibility |

`AppHeader.tsx:59` shows `⌘K` for the search shortcut, but this is macOS-specific. On Linux/Windows, it should show `Ctrl+K`.

---

### 8.2 Hardcoded Notification Count in Messages Button

| Severity | Category                    |
| -------- | --------------------------- |
| 🟢 Low   | Accessibility / Correctness |

`AppHeader.tsx:72` — The messages button has `aria-label='Messages (2 unread)'` with a hardcoded `2`, and the badge also shows a hardcoded `2`. This should be driven by actual data.

---

## Summary

| Severity    | Count |
| ----------- | ----- |
| 🔴 Critical | 5     |
| 🟡 Medium   | 8     |
| 🟢 Low      | 7     |

### Top Priority Fixes

1. **Remove hardcoded `bg-slate-900 text-white` from `layout.tsx`** — theming is broken
2. **Standardize `score` type** to `number` across all interfaces and data
3. **Add at least basic test coverage** for critical paths
4. **Create an API/services layer** to replace hardcoded mock data
5. **Implement authentication** with proper middleware
