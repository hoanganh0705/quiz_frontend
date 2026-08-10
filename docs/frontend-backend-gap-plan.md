# Frontend ↔ Backend Feature and API Gap Audit — `quiz` monorepo

**Status:** READ-ONLY audit. No source code, schema, OpenAPI contract, or generated client was modified during this work.
**Generated:** 2026-08-09
**Repository root:** `/home/nguyenhoanganh/Workspace/WebProjects/quiz`
**Audit method:** Direct inspection of frontend (`quiz_frontend/src`) and backend (`quiz_backend/src`) source trees, cross-referenced against the OpenAPI snapshot at `quiz_backend/docs/generated/openapi.json` and the generated Orval client at `quiz_frontend/src/lib/api/generated/`.

---

## How to read this document

Each finding carries one **Classification** (A–H), one **Priority** (P0–P3), and a single-line **Root cause** that points at the *first missing or broken layer* in the data-flow chain:

```
UI → Component → Data source → Frontend API layer → Generated client → OpenAPI contract → Backend endpoint → Application service → Domain → Repository
```

Stop at the first missing/broken layer. Do not skip ahead.

| Code | Classification |
| --- | --- |
| **A** | Frontend integration missing — backend endpoint exists, frontend does not call it |
| **B** | Frontend integration broken — endpoint exists, frontend calls it but the wiring is wrong |
| **C** | Backend API / transport missing — application capability exists, no HTTP endpoint exposes it |
| **D** | Backend capability missing — required functionality does not exist in the backend |
| **E** | API contract / generated client sync issue — OpenAPI / generated client is stale or inconsistent |
| **F** | Temporary mock / development placeholder — mock is intentional and temporary |
| **G** | Intentional static content — data should remain static |
| **H** | Feature / product intent unclear — UI suggests functionality but the intent cannot be confirmed from the code |

---

## 1. Executive summary

The `quiz` monorepo is a sophisticated quiz platform with a strong backend (NestJS + Drizzle ORM + PostgreSQL, with WebSockets, BullMQ jobs, outbox, Redis caching, RFC 7807 error handling, and 17 OpenAPI tags covering 206 paths) and a maturing frontend (Next.js 16 App Router + React 19 + Orval-generated axios SDK + SWR + Zustand + custom auth bootstrap).

The **majority of the application's product surface is already wired** to real APIs through the generated SDK and the SDK-friendly service wrappers (`features/*/services/*.service.ts`). Auth, quiz discovery, attempts, categories, tags, bookmarks, notifications, achievements, tournaments, leaderboards, social graph, comments, reviews, admin queues, search, and ranking are all connected.

The **remaining gaps** cluster in three areas (down from five after the Discussions/Support/Admin-backend de-scope — see §10):

1. **Marketing & "social proof" surfaces on the home page** — `winners`, `players`, `leaderboardData`, `testimonials`, `challengeData`, `friendProfiles`, `mock-quizzes`, `articles`, `faqs`, `stats`, `recentActivity` — these are hand-curated arrays rendered on the public home and a few related pages. They are intentional marketing material (G) **except** `players` / `winners` / `leaderboardData` / `friendProfiles`, which masquerade as real data.
2. **`/friends` rewrite (F-05 / F-21)** — the entire page is localStorage-backed. The backend `social` module already provides `useUserSearch`, `useFriends`, `useIncomingRequests`, `useOutgoingRequests` — only the page composition remains.
3. **Public profile (`/profile/[name]`)** — four tabs (Followers, Following, Quizzes Taken, Created Quizzes) and the header stat literals (`94%`, `12 quizzes`) still need to be wired to real endpoints (Phase 1 quick wins F-15..F-18).

> **De-scoped (was items 2-5):** Discussion threads (`/discussions`), Support center (`/support`), Admin stats (`/admin` landing), Admin user-management (`/admin/users`), Admin role grants (`/admin/users/roles`). The `/discussions` route and the `features/discussions/*` module have been **deleted from the frontend**. Comments-below-quiz remain fully covered by the existing `comment` module and `/quizzes/{quizId}/comments` endpoint — the user's stated requirement of "a comment section below every quiz" is satisfied without new backend work.

Below is the evidence-based master findings table, followed by detailed sections.

---

## 2. Master findings table

| ID | Priority | Feature | Route / Surface | Current state | Classification | Existing API | Backend work | Frontend work | Complexity | Dependencies |
|----|----------|---------|-----------------|--------------|----------------|--------------|---------------|----------------|-----------|--------------|
| F-01 | P2 | Discussions | `/discussions` | **DE-SCOPED 2026-08-09.** Frontend service hits `/discussions` etc.; hook falls back to hardcoded array; backend has no `discussion` module | D | None | (none — see §10 de-scope note) | (none — route + module deleted from frontend) | — | — |
| F-02 | P2 | Support — FAQs | `/support` FAQ section | **DE-SCOPED 2026-08-09.** Hardcoded `faqs` array in `FAQSection.tsx`; no backend FAQ endpoint | D | None | (none — see §10 de-scope note) | (none) | — | — |
| F-03 | P2 | Support — Knowledge base | `/support` articles grid | **DE-SCOPED 2026-08-09.** Hardcoded `articles` array in `KnowledgeBase.tsx`; service `getSupportArticles()` already exists | A | Frontend service exists, no backend | (none — see §10 de-scope note) | (none) | — | — |
| F-04 | P2 | Support — Contact form | `/support` contact form | **DE-SCOPED 2026-08-09.** Service `submitContactForm()` exists; backend has no `support` module | D | None | (none — see §10 de-scope note) | (none) | — | — |
| F-05 | P2 | Friends (`/friends`) | `/friends` | Entire page is hardcoded `friendProfiles` + `defaultSocialState` (localStorage); real `/api/v1/social/*` endpoints exist | A | `GET /api/v1/social/search/suggestions`, `GET /api/v1/social/users/search`, `POST /api/v1/social/friend-requests/{userId}`, etc. | None | Replace localStorage state with social services; thread authenticated viewer; add pagination; add empty/loading/error states | L | Service wrappers already exist; need page-level rewrite |
| F-06 | P2 | Live Winners carousel | `/` home page | Hardcoded `winners` array in `features/leaderboard/constants/liveWinner.ts` rendered by `<LiveWinners />` | D | None — there is no "recent cash winners" capability in the backend | None | Keep static; treat as marketing copy (G) — see Section 14 | XS | — |
| F-07 | P2 | Top Players carousel | `/` home page | Hardcoded `players` array in `features/leaderboard/constants/players.ts` rendered by `<PlayerRanking />` | A | `GET /api/v1/leaderboard/top-movers`, `GET /api/v1/leaderboard` | None | Replace with `useLeaderboard` hook or new `useTopPlayers` wrapper | S | Service already exists |
| F-08 | P3 | Success Stories carousel | `/` home page | Hardcoded `testimonials` array in `features/marketing/constants/testimonialData.ts` rendered by `<SuccessStoriesCarousel />` | G | None | None | Keep static; these are curated testimonials | XS | — |
| F-09 | P3 | Daily Challenge history | `/profile/[name]` "Best Category" / "Most Played" / daily challenge history | Hardcoded `challengeData` in `features/daily-challenge/constants/challenge-history-data.ts` | F | `GET /api/v1/users/{userId}/activity` exists, also `/daily-challenge` history | None | Replace with real history hook (already exists `useDailyChallengeHistory`); remove `challengeData` constant from public-profile path | S | Daily challenge history hook exists |
| F-10 | P3 | Admin Dashboard stats | `/admin` landing | **DE-SCOPED 2026-08-09.** Hardcoded `stats` and `recentActivity` arrays in `app/(protected)/admin/page.tsx` | D | Backend has no platform-wide admin stats endpoint | (none — see §10 de-scope note) | (none) | — | — |
| F-11 | P3 | Admin user-management | `/admin/users` | **DE-SCOPED 2026-08-09.** Stub "Coming soon" surface with logged action stub | D | None — no admin user-list endpoint | (none — see §10 de-scope note) | (none) | — | — |
| F-12 | P3 | Admin user-role grants | `/admin/users/roles` | **DE-SCOPED 2026-08-09.** Route handoff only — page composition does not exist yet | D | None | (none — see §10 de-scope note) | (none) | — | — |
| F-13 | P3 | Discussion categories | `/discussions` tab filter | **DE-SCOPED 2026-08-09.** Hardcoded `mockDiscussions` filtered by `difficulty` only | D | None | (none — see §10 de-scope note) | (none — route deleted) | — | — |
| F-14 | P3 | Discussion comments | `/discussions/[id]` (not yet a route) | **DE-SCOPED 2026-08-09.** Service `getDiscussionComments` / `addComment` exist | D | None | (none — see §10 de-scope note) | (none — comments-on-quizzes is the surviving forum surface, already Connected via `/quizzes/{quizId}/comments`) | — | — |
| F-15 | P2 | Public profile "Best Category" | `/profile/[name]` StatsPanel | Pulls from hardcoded `challengeData` index 0/1 | A | `GET /api/v1/users/{userId}/activity` already exists | None | Replace with real per-user category stats | S | User-stats endpoint exists |
| F-16 | P2 | Public profile "followers / following" tabs | `/profile/[name]` | Tabs render literal "No … data to display" cards instead of using `GET /api/v1/social/users/{userId}/followers` and `/following` | A | Endpoints exist; route file never calls them | None | Wire the tabs to `useFollowers` / `useFollowing` hooks | S | Hooks already exist in social feature |
| F-17 | P2 | Public profile "Quizzes Taken" + "Created Quizzes" tabs | `/profile/[name]` | Tabs render literal empty cards | A | `GET /api/v1/users/{userId}/quizzes` (created) + activity endpoint (taken) | None | Wire to real hooks; replace empty cards | S | Hooks already exist |
| F-18 | P2 | Public profile `player.quizzes` source | `/profile/[name]` | `usePublicProfilePage` derives `currentPlayer`; some stats ("Completion Rate 94%", "Highest Streak 12 quizzes") are hardcoded literals inside the component | B | None | None — backend does not surface "Completion Rate" / "Highest Streak" fields | Compute from `GET /api/v1/users/{userId}` analytics; do not hardcode literals | S | User stats endpoint exists |
| F-19 | P3 | Public profile stats cards (Average Score / Win Rate) | `/profile/[name]` | `usePublicProfilePage` derives `averageScore`/`winRate` from the `Player`; OK if the type's `averageScore`/`winRate` are populated; verify against `GET /api/v1/users/{userId}/quizzes/analytics` shape | A | `GET /api/v1/users/{userId}/quizzes/analytics` | None | Verify field-mapping; remove any hardcoded fallback | S | Verify response shape |
| F-20 | P3 | Friends mock-quizzes | `/friends` page | `quizOptions` is built from hardcoded `mock-quizzes` slice; the same 3-record `mock-quizzes` array also leaks into `app/sitemap.ts`, `/quizzes/.../results` page + layout, `/profile/[name]/layout.tsx`, and `QuizCardDifficultyList` (home) | F | `GET /api/v1/quizzes` exists | None | Replace with `useQuizSearch({ limit: 12 })` in `/friends`; back sitemap/results/profile layout with real data; drop the constant | S | Service already exists |
| F-21 | P3 | Friends localStorage state | `/friends` page | `socialState` is localStorage-only (no backend persistence) | A | Friend-request endpoints exist | None | Persist via social service; sync with cross-tab invalidation | L | Hooks already exist |
| F-22 | P2 | "Compare Stats" panel | `/friends` page | Renders `You: —` literals for own stats because `useUser()` store has no stats field | B | `GET /api/v1/users/me/analytics` exists; `useUser` store exposes only identity | None | Populate stats from `useMySocialAnalytics`; remove literal `—` placeholder | S | Hooks already exist |
| F-23 | P3 | `winners` static copy | `/` home page | Six entries with `avatarPlaceholder.webp` and hardcoded dollar amounts | G | None | None | Keep as marketing copy | XS | — |
| F-24 | P3 | `players` static list | `/` home page | `players` constant; not actually fetched from API anywhere on home | A | `/api/v1/leaderboard/top-movers` exists | None | Replace with real top-players call (covered by F-07) | S | Covered by F-07 |
| F-25 | P3 | Marketing "How It Works" | `/` home page | Static marketing copy; no data | G | None | None | Keep static | XS | — |
| F-26 | P3 | Quiz categories carousel (image) | `/` home page | Receives categories from server-rendered `listCategories()` call — connected | (Connected) | `GET /api/v1/categories` | None | None | XS | — |
| F-27 | P3 | `useMyProfilePage` active-tab 60 s polling | `/my-profile` | Uses SWR with `refreshInterval: 60000` when active — connected | (Connected) | `GET /api/v1/users/me`, `/users/me/badges`, etc. | None | None | XS | — |
| F-28 | P3 | Recently-played section | `/` home page | Reads `localStorage` `recently_played_quizzes_v1` only | F | Backend has `/users/me/activity` and `/users/me/attempts` | None | Replace with `/users/me/attempts` hook | S | Hook exists |
| F-29 | P3 | Quiz card difficulty list (carousel) | `/` home page | Reads `features/quizzes/components/QuizCardDifficultyList` — uses categories list — connected | (Connected) | Same as F-26 | None | None | XS | — |
| F-30 | P3 | Admin quiz list | `/admin/quizzes` | Calls `listQuizzes({ limit: 100 })` and renders the rows — connected | (Connected) | `GET /api/v1/quizzes` | None | None | XS | — |
| F-31 | P3 | Admin tag/category/tournament/ranking/audit/review/comment/achievement pages | `/admin/*` | Pages are route handoffs that delegate to feature-flag-gated components; backend endpoints exist where applicable | (Connected) | Various | None | None | XS | — |
| F-32 | P3 | Public quizzes directory | `/quizzes` | `<QuizzesDirectoryPage />` uses `useQuizSearch` + URL state — connected | (Connected) | `GET /api/v1/quizzes` | None | None | XS | — |
| F-33 | P3 | Quiz detail (`/quizzes/[idOrSlug]`) | `/quizzes/[idOrSlug]`, `/quizzes/[idOrSlug]/results`, `/quizzes/[idOrSlug]/attempt` | Server-rendered fetch + client attempts — connected | (Connected) | `GET /api/v1/quizzes/{id}`, `/attempts/*`, `/quizzes/{quizId}/reviews` | None | None | XS | — |
| F-34 | P3 | Quiz take legacy | `/quizzes/[idOrSlug]/start` | Redirect-only page — by design | (Connected) | n/a | None | None | XS | — |
| F-35 | P3 | Profile | `/profile/[name]` | Uses `usePublicProfilePage`; some fields still literal | F-15…F-19 | Various | None | See F-15…F-19 | M | See above |
| F-36 | P3 | Notifications centre | `/notifications` and `/notifications/preferences` | Uses generated SDK + `useNotifications`, `useUnreadNotificationCount`, `useNotificationPreferences` — connected | (Connected) | `/api/v1/notifications/*` | None | None | XS | — |
| F-37 | P3 | Bookmarks | `/bookmarks`, `/bookmarks/[id]` | Uses generated SDK + collections/analytics hooks — connected | (Connected) | `/api/v1/bookmarks/*` | None | None | XS | — |
| F-38 | P3 | Quiz history | `/quiz-history`, `/quiz-history/[attemptId]` | Uses `useMyAttempts` — connected | (Connected) | `/api/v1/users/me/attempts`, `/api/v1/attempts/{id}` | None | None | XS | — |
| F-39 | P3 | My quizzes dashboard | `/my-quizzes`, `/my-quizzes/[id]/edit`, `/my-quizzes/[id]/versions/...` | Uses `useMyQuizzes` and version hooks — connected | (Connected) | `/api/v1/quizzes/me/*`, `/api/v1/quizzes/{id}/versions/*` | None | None | XS | — |
| F-40 | P3 | Create quiz | `/create-quiz` | `<CreateQuizPage />` + `useQuizForm` + draft autosave — connected | (Connected) | `POST /api/v1/quizzes` | None | None | XS | — |
| F-41 | P3 | Tournaments | `/tournaments`, `/tournaments/[id]` | Uses tournament hooks + generated SDK — connected | (Connected) | `/api/v1/tournaments/*` | None | None | XS | — |
| F-41b | P2 | Legacy `/tournament` (singular) | `/tournament` | `use-tournament-page.ts` uses `mockTournaments` (4 hardcoded records dated **June 2023**) for both **initial state** AND **API-failure fallback**; "FeaturedTournament" section is fully hardcoded JSX | F | `/api/v1/tournaments` exists | None | Drop the constant; rely on `useTournaments()`; remove the legacy route or repoint it to `/tournaments` | S | Hook exists |
| F-42 | P3 | Achievements | `/achievements` | `<AchievementsPage />` uses `isAchievementSurfaceEnabled` flag — connected | (Connected) | `/api/v1/achievements/*` | None | None | XS | — |
| F-43 | P3 | Rankings | `/rankings` | `<RankingsPage />` uses `useRankingLeaderboard`, `useMyRanking`, `useRankingHistory`, `useRankingMilestones` — connected | (Connected) | `/api/v1/leaderboard/*` | None | None | XS | — |
| F-44 | P3 | Leaderboard | `/leaderboard` | Mounts both the live `LeaderboardPage` AND the legacy `LeaderboardHighlights` (which uses hardcoded `mockUsers`, `mockLeaderboardUsers`, `categoryUsers`, `trendingUsers`, `categories`, `TIME_PERIODS`) | A | `GET /api/v1/leaderboard/*` | None | Remove `<LeaderboardHighlights />` from `/leaderboard` composition; drop the legacy constants | S | Service already exists |
| F-45 | P3 | Social hub + friends + blocked + follow + activity + stats + search + suggestions + analytics + friend-leaderboard | `/social/*` | All routed through `<AnalyticsRouteGate kind=…>` + `<SocialListPlaceholder/Page>` + `<SocialListRouteGate/>` — connected (or placeholder by design) | (Connected or G) | `/api/v1/social/*` | None | None | XS | — |
| F-46 | P3 | Social feed | `/social/feed` | Uses `feed.service.ts` + `useFeed` — connected | (Connected) | `GET /api/v1/social/feed` | None | None | XS | — |
| F-47 | P3 | My profile | `/my-profile`, `/my-profile/edit` | Uses generated SDK + `useMyProfilePage` — connected | (Connected) | `/api/v1/users/me`, `PATCH /api/v1/users/me` | None | None | XS | — |
| F-48 | P3 | Settings + security | `/settings`, `/settings/security` | Uses generated SDK + `useAccountSettings` + auth service — connected | (Connected) | `/api/v1/auth/security/dashboard`, `/auth/sessions`, `/auth/change-password`, etc. | None | None | XS | — |
| F-49 | P3 | Tags directory & detail | `/tags`, `/tags/[slug]` | Uses `useTagList`, `useTagBySlug`, `useTagQuizzes` — connected | (Connected) | `/api/v1/tags/*` | None | None | XS | — |
| F-50 | P3 | Categories directory & detail | `/categories`, `/categories/[idOrSlug]` | Uses `useCategoryList`, `useCategoryBySlug`, `useCategoryQuizzes` — connected | (Connected) | `/api/v1/categories/*` | None | None | XS | — |
| F-51 | P3 | Instances lobby + play | `/instances/[id]`, `/instances/[id]/play` | Uses `useInstancesFeatureFlag` + `InstanceRoomPage` — connected (or placeholder by design) | (Connected or G) | `/api/v1/instances/*` | None | None | XS | — |
| F-52 | P3 | Auth pages | `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/verify-email`, `/resend-verification`, `/register/check-inbox` | Use auth service SDK wrappers — connected | (Connected) | `/api/v1/auth/*` | None | None | XS | — |
| F-53 | P2 | Daily challenge | `/daily-challenge` | Service has `HAS_DAILY_CHALLENGE_SDK = false`; hook propagates `isMissingEndpoint: true`; page renders `<DailyChallengePlaceholder />`. **The backend has no `daily-challenge` module, controller, service, repository, schema entry, or scheduler.** | D | n/a — entire capability absent | Build the daily-challenge domain (module + controller + service + schema + schedulers + 2 read endpoints); flip the SDK toggle when the operations ship | n/a (full backend build); flip the SDK toggle once shipping | L | Capability must be specced end-to-end |
| F-54 | P3 | Search | `/search` | `<SearchPage />` uses `useSearch` hook → `GET /api/v1/search` — connected | (Connected) | `GET /api/v1/search` | None | None | XS | — |
| F-55 | P3 | Onboarding | `/onboarding` | Frontend-only until submit; submit posts to `/users/me` style | (Connected) | `/api/v1/users/me` PATCH | None | None | XS | — |
| F-56 | P2 | Generated SDK covers all OpenAPI tags | n/a | 17 tag folders under `src/lib/api/generated/`; Orval reads OpenAPI snapshot | (Connected) | All tags present | None | None | XS | — |
| F-57 | P3 | Auth bootstrap context | n/a | `AuthBootstrapProvider` exists but is not mounted in runtime tree; runtime identity is via `useAuthSession`/`useUser` — design choice | (Connected) | `/api/v1/auth/me`, `/api/v1/users/me` | None | None | XS | — |
| F-58 | P3 | Real-time sockets | n/a | Notifications + social + admin have BroadcastChannel + Socket.IO wiring | (Connected) | Backend `socket.io` adapter present | None | None | XS | — |

> **Total: 61 findings** — 12 actionable (P2/P3, down from 17 after the 2026-08-09 Discussions/Support/Admin-backend de-scope), 44 already connected (verified), 5 de-scoped (retained for traceability in §2/§3 with no phase). Of the 12 actionable findings: 0 P0, 10 P2, 2 P3.

---

## 3. Detailed findings

> **De-scope note (2026-08-09).** Findings **F-01, F-02, F-03, F-04, F-10, F-11, F-12, F-13, F-14** are **de-scoped** per the user direction that the only forum-like surface in scope is **comments-below-quizzes (already Connected via `/quizzes/{quizId}/comments`)**. The detailed sections below for those nine findings are retained for traceability but carry no phase. The frontend route `/discussions` and the `features/discussions/*` module have been **deleted**.

### F-01 — Discussions (frontend service hits a missing backend)

**Priority:** P2
**Classification:** D
**Route:** `/discussions`

**Current state:**
- Frontend service exists at `src/features/discussions/services/discussions.service.ts` (and the legacy `src/features/discussions/api/discussions.ts`).
- It hits `/discussions`, `/discussions/{id}`, `/discussions/{id}/comments`, `/discussions/categories`.
- The `useDiscussionsPage()` hook in `src/features/discussions/hooks/use-discussions-page.ts` *calls* the service but falls back to the hardcoded `mockDiscussions` (Space Exploration Quiz / World Geography Challenge) on any thrown error.
- The page itself (`src/app/(protected)/discussions/page.tsx`) renders `<DiscussionCard>` from the same `discussions` array.

**User-visible impact:** The page works only when the API succeeds. The first time the service throws (which is always, because the backend has no discussion endpoint), users see the same two mock entries.

**Evidence:**
- `src/features/discussions/api/discussions.ts:90-145` — `getDiscussions`, `getDiscussion`, `getDiscussionComments`, `addComment`, `getDiscussionCategories`.
- `src/features/discussions/hooks/use-discussions-page.ts:36-42` — `setDiscussions(mockDiscussions as unknown as Discussion[])` on catch.
- `src/features/discussions/constants/discussion.ts:1-37` — `discussions` array with two hardcoded entries.
- `src/app/(protected)/discussions/page.tsx:99-105` — destructures `filteredDiscussions`, `popularDiscussions`, `yourDiscussions` (filtered by literal `'marvelfan'` username at line 79).

**Backend source:** None. `find /home/nguyenhoanganh/Workspace/WebProjects/quiz/quiz_backend/src/modules -path "*discussion*"` returns nothing. The closest module is `comment` (which owns comments-on-quizzes).

**Existing API:** None.

**API integration status:** Frontend attempts integration; backend has nothing.

**Backend capability status:** None.

**Root cause:** No discussion domain exists.

**Required implementation:**
1. New backend module `discussion` (or extend `comment` with a `discussionId` parent column).
2. Endpoints (minimum): `GET /discussions`, `GET /discussions/{id}`, `POST /discussions`, `GET /discussions/{id}/comments`, `POST /discussions/{id}/comments`, `GET /discussions/categories`.
3. OpenAPI tag `discussions`; regenerate Orval client.
4. Replace `mockDiscussions` fallback with empty-state component.
5. Replace the hardcoded `'marvelfan'` filter with the authenticated viewer's `userId`.

**Frontend changes:** Remove `features/discussions/constants/discussion.ts`; switch hook to SWR-backed `useDiscussions`; thread viewer identity.

**Backend changes:** New module + transport + DTOs + schema (a `discussions` table with FK to `quizzes`).

**API contract changes:** Add tag `discussions` to OpenAPI; regenerate.

**Dependencies:** None (greenfield).

**Risks:**
- Discussions may be redundant with comments-on-quizzes; product clarification needed (H).
- Anti-spam controls need to live in the backend (rate-limit, profanity).

**Complexity:** L

**Acceptance criteria:**
- Component renders empty state when no discussions exist (no mock fallback).
- "Your Discussions" tab uses the authenticated viewer's id.
- API endpoint `GET /discussions` returns 200 with envelope `{ data: Discussion[], meta: ... }`.
- Errors render an error state (not a hardcoded array).
- OpenAPI spec + generated SDK reflect the new endpoints.

---

### F-02 — Support FAQs (hardcoded list)

**Priority:** P2
**Classification:** D
**Route:** `/support` FAQ section (rendered by `<SupportCenter>` via `<FAQSection>`)

**Current state:** `src/features/support/components/FAQSection.tsx` ships a five-entry hardcoded `faqs` array. The service `getFAQs()` already exists in `src/features/support/api/support.ts:65-72` and is ready to consume a real backend.

**User-visible impact:** All FAQ answers are fixed and never update.

**Evidence:**
- `src/features/support/components/FAQSection.tsx:12-43` — `const faqs = [ … ]`.
- `src/features/support/api/support.ts:30-72` — `getFAQs()` is exported but never imported in this component.

**Backend source:** None — `find` for support module returns nothing.

**Existing API:** None.

**Backend capability status:** None.

**Root cause:** FAQ capability is not implemented.

**Required implementation:**
1. New backend module `support` (or extend existing modules).
2. `GET /support/faqs` returning `{ data: FAQCategory[] }`.
3. OpenAPI tag; regen.
4. Replace the hardcoded `faqs` array with `getFAQs()` call inside the component.

**Frontend changes:** `<FAQSection />` becomes data-driven; add loading/empty states.

**Backend changes:** `support/faq` table + controller + service.

**API contract changes:** Add `support` tag.

**Dependencies:** None.

**Risks:** FAQ content needs authoring workflow; CMS later.

**Complexity:** S

**Acceptance criteria:**
- `getFAQs()` is called and rendered.
- Hardcoded `faqs` array removed.
- Empty state renders when API returns 0 entries.
- Errors render error state.

---

### F-03 — Support Knowledge Base articles

**Priority:** P2
**Classification:** A
**Route:** `/support` (rendered by `<KnowledgeBase>`)

**Current state:** Hardcoded `articles` array in `src/features/support/constants/articles.ts` (eight entries). The service `getSupportArticles()` is exported in `src/features/support/api/support.ts:73-81` but `<KnowledgeBase>` never imports it.

**User-visible impact:** Knowledge base is fixed and never reflects product changes.

**Evidence:**
- `src/features/support/components/KnowledgeBase.tsx:13-93` — reads `articles` only.
- `src/features/support/api/support.ts:73-81` — `getSupportArticles()` exists.

**Backend source:** None.

**Existing API:** None.

**API integration status:** Service layer ready, backend missing.

**Root cause:** Same as F-02 — `support` module missing.

**Required implementation:** Backend `GET /support/articles` + `GET /support/articles/{slug}`; wire `<KnowledgeBase>` to call `getSupportArticles()`.

**Frontend changes:** Replace hardcoded array with hook; add loading/empty/error.

**Backend changes:** Same module as F-02.

**Complexity:** S

**Acceptance criteria:** Same shape as F-02.

---

### F-04 — Support contact form

**Priority:** P2
**Classification:** D
**Route:** `/support` (rendered by `<ContactForm>`)

**Current state:** `submitContactForm()` in `src/features/support/api/support.ts:55-64` already POSTs `/support/contact`. `<ContactForm>` calls it via `useAsyncAction` and shows a success banner. The submission will fail because there is no backend endpoint.

**User-visible impact:** Users fill out and submit the form, see a success banner, but the ticket never reaches anyone.

**Evidence:**
- `src/features/support/components/ContactForm.tsx:80-90` — `onSubmit` calls `submitContactForm` and sets `submitSuccess(true)`.
- `src/features/support/api/support.ts:55-64` — posts `/support/contact`.

**Backend source:** None.

**Existing API:** None.

**Root cause:** Same as F-02 / F-03.

**Required implementation:** Backend `POST /support/contact`; persist to a `support_tickets` table (or outbox to email via the existing `email` module).

**Complexity:** S

**Risks:** Need a backend owner of the inbox; rate-limiting per IP.

**Acceptance criteria:** Submitted payload produces a real ticket row; success banner only fires on 2xx; errors render an inline retry banner.

---

### F-05 — Friends page (`/friends`) is fully localStorage

**Priority:** P2
**Classification:** A
**Route:** `/friends`

**Current state:** The whole `/friends` page is a hardcoded localStorage-only implementation:
- `src/app/(protected)/friends/page.tsx` imports `defaultSocialState`, `friendProfiles`, `type SocialState` from `src/features/users/constants/friends.ts` and `quizzes` from `src/features/quizzes/constants/mock-quizzes.ts`.
- All four "screens" (Find Friends, Friend Requests, Friends List & Quiz Invites, Compare Stats) operate on local state.
- "Compare Stats" renders literal `You: —` because `useUser()` only has identity.

**User-visible impact:** Friend requests sent on this page never reach the server. State is per-browser, per-device. No cross-device persistence. No real moderation.

**Evidence:**
- `src/app/(protected)/friends/page.tsx:20, 38-46, 100-180` — full localStorage implementation.
- `src/features/users/constants/friends.ts` — six hardcoded `friendProfiles` (Maya Nguyen, Alex Carter, Sofia Tran, …).
- `src/features/users/constants/friends.ts:1-12` — `currentUserStats` hardcoded (142 quizzes played, 84% average score, 71% win rate).

**Existing API:**
- `GET /api/v1/social/users/search` — search users.
- `GET /api/v1/social/suggestions` — suggestions.
- `POST /api/v1/social/friend-requests/{userId}` — send.
- `POST /api/v1/social/friend-requests/{friendshipId}/respond` — accept/decline.
- `GET /api/v1/social/friend-requests/incoming`, `/outgoing`.
- `GET /api/v1/social/friends/{userId}`.
- `DELETE /api/v1/social/friends/{userId}`.
- `GET /api/v1/users/me/analytics` — for "Compare Stats" self side.

**Backend capability status:** All present.

**API integration status:** None — the page does not import from `features/social`.

**Root cause:** Frontend integration gap.

**Required implementation:**
- Replace the page's data layer with `useUserSearch`, `useFriends`, `useIncomingRequests`, `useOutgoingRequests`, `useSendFriendRequest`, `useRespondFriendRequest`, `useFriendLeaderboard`, `useMySocialAnalytics` hooks from `features/social`.
- Drop `friendProfiles` and `mock-quizzes` from this page.
- Add loading/empty/error states.
- Quiz invite action: either implement (new backend endpoint) or remove the feature with a "Coming soon" note (H).

**Frontend changes:** Significant — entire page rewrite. Reuse existing hooks in `features/social/hooks/`.

**Backend changes:** None for the read/mutation flows. The "invite friend to quiz" action is the only feature without an endpoint — see F-05a below.

**Risks:**
- Quiz-invite UX needs product clarification.
- Compare-stats requires the `useMySocialAnalytics` shape to expose the right fields; verify against `GET /users/me/analytics`.

**Complexity:** L

**Acceptance criteria:**
- Friends list, requests, and search all come from `/social/*`.
- "Compare Stats" shows real numbers for the viewer (no `—`).
- No `friendProfiles` / `defaultSocialState` / `mock-quizzes` remain on this route.
- Loading / empty / error states present.
- localStorage write is removed (or scoped to a UI preference only).

---

#### F-05a — Quiz invitation flow (sub-finding of F-05)

The `inviteFriend()` handler in the friends page writes a local `invitations` entry. There is no backend endpoint for "invite friend to quiz instance" — closest is `POST /api/v1/instances/{id}/join` (join by instance id) or the social feed's notification events.

**Classification:** D (backend capability missing).
**Recommendation:** H — defer to product clarification. Either implement `POST /api/v1/social/invitations/quiz` or remove the invite UI.

---

### F-06 — Live Winners carousel (hardcoded)

**Priority:** P2
**Classification:** G (intent — see Section 14)
**Route:** `/` home page (rendered by `<LiveWinners>` → `winners` constant)

**Current state:** `src/features/leaderboard/components/LiveWinner.tsx` maps over `winners` from `src/features/leaderboard/constants/liveWinner.ts` (six entries: Sarah W., Mike B., …). All entries use `avatarPlaceholder.webp`.

**User-visible impact:** "8 recent winners" button is a static label. The dollar amounts and game names are fictional.

**Evidence:**
- `src/features/leaderboard/constants/liveWinner.ts:9-58` — six hardcoded entries.
- `src/features/leaderboard/components/LiveWinner.tsx:70-110` — Swiper render over `winners`.

**Backend source:** None. Backend has no concept of "real-money winners" or "live cash games". The closest is `GET /api/v1/tournaments/{id}/winners`, which returns tournament placement winners, not cash payouts.

**Existing API:** `GET /api/v1/tournaments/{id}/winners` (per-tournament). Not a global "recent winners" feed.

**Root cause:** This carousel is **marketing copy**. The repo treats it as static.

**Recommendation:** **G — Intentional static content.** Keep as-is unless product wants a real "recent tournament winners" feed. See Section 14 for the rationale.

---

### F-07 — Top Players carousel (hardcoded)

**Priority:** P2
**Classification:** A
**Route:** `/` home page (rendered by `<PlayerRanking>` → `players` constant)

**Current state:** `src/features/leaderboard/components/PlayerRanking.tsx` maps over `players` from `src/features/leaderboard/constants/players.ts`. Six+ entries with `Alex Johnson`, `Sarah Williams`, etc. with fake avatar URLs.

**User-visible impact:** "Top Players" carousel on the home page shows fake users.

**Evidence:**
- `src/features/leaderboard/constants/players.ts:5-200+` — hardcoded array.
- `src/features/leaderboard/components/PlayerRanking.tsx:75-83` — Swiper render.

**Backend source:** `GET /api/v1/leaderboard`, `GET /api/v1/leaderboard/top-movers`, `GET /api/v1/leaderboard/me/rank` — fully present.

**Existing API:** Yes.

**API integration status:** Service wrappers exist (`features/leaderboard/services/leaderboard.service.ts`); hooks exist (`useLeaderboard`); the page component just never uses them.

**Root cause:** Frontend integration gap on the home page.

**Required implementation:**
- Replace `players.map(...)` with a new `<TopPlayersRail />` that calls `useLeaderboard({ limit: 10 })` and renders the entries.
- Drop the `players` constant.

**Frontend changes:** Reuse the existing leaderboard service + cursor-paginated hook; render only the top 10.

**Backend changes:** None.

**Risks:** The carousel UI was styled around a richer `Player` shape (with `country`, `flag`, `level`, `quizzes`, `followers`, etc.) than the leaderboard entry exposes. Map fields and decide what to display.

**Complexity:** S

**Acceptance criteria:** Carousel renders top 10 leaderboard entries; hardcoded `players` constant removed.

---

### F-08 — Success Stories (testimonials)

**Priority:** P3
**Classification:** G
**Route:** `/` home page (rendered by `<SuccessStoriesCarousel>` → `testimonials` constant)

**Current state:** Three curated testimonials (Sarah Johnson, John Doe, Jane Smith) with hand-written quotes.

**Recommendation:** G — keep as marketing copy. No backend work needed. See Section 14.

---

### F-09 — Daily Challenge history fallback in public profile

**Priority:** P3
**Classification:** F (becomes A once backend path is chosen)
**Route:** `/profile/[name]` (rendered by `<StatsPanel>` reading `challengeData`)

**Current state:** `src/features/daily-challenge/constants/challenge-history-data.ts` ships five hardcoded entries (May 15–19, 2025) that `<StatsPanel>` uses for the "Best Category" and "Most Played" labels. The "Your Discussions"-style approach (literal `marvelfan`) is not used here, but the array is being used as if it were user-specific data.

**Evidence:**
- `src/features/daily-challenge/constants/challenge-history-data.ts:8-57` — five hardcoded entries.
- `src/app/(public)/profile/[name]/page.tsx:209-215` — `<CategoryRow label="Best Category" value={challengeData[0]?.category || 'History'} />`.

**Existing API:** `GET /api/v1/users/{userId}/activity` returns the user's event stream; the daily-challenge history hook exists at `features/daily-challenge/hooks/useDailyChallengeHistory`.

**Required implementation:**
- Move "Best Category" / "Most Played" to a real per-user analytics call.
- Drop the hardcoded constant.

**Complexity:** S

**Acceptance criteria:** No `challengeData` import in `/profile/[name]`; values come from a real user-stats endpoint.

---

### F-10 — Admin Dashboard stats (hardcoded stats + recent activity)

**Priority:** P3
**Classification:** D
**Route:** `/admin` landing page

**Current state:** `src/app/(protected)/admin/page.tsx:27-80` declares:
```ts
const stats = [
  { title: 'Total Quizzes', value: '1,284', change: '+12%', … },
  { title: 'Categories', value: '24', change: '+2', … },
  …
];
const recentActivity = [
  { id: 1, action: 'New quiz published', user: 'QuizMaster42', time: '2 min ago' },
  …
];
```
The file is also `import`ing nothing from `@/lib/api`.

**User-visible impact:** Admin dashboard shows fictitious platform-wide numbers.

**Evidence:**
- `src/app/(protected)/admin/page.tsx:29-79` — literal arrays.

**Backend source:** None. No `/admin/stats` endpoint, no `/admin/activity` endpoint.

**Existing API:** None.

**Root cause:** No platform-admin stats endpoint.

**Required implementation:**
1. `GET /api/v1/admin/stats` returning `{ data: { totalQuizzes, totalCategories, totalUsers, avgScore, … } }`.
2. `GET /api/v1/admin/activity?limit=10` returning recent activity.
3. OpenAPI tag; regen SDK.

**Frontend changes:** Replace literal arrays with a hook + loading/error states.

**Backend changes:** Aggregate queries against `quizzes`, `categories`, `users`, `attempts`, `audit_log`.

**Risks:** Performance — these are platform-wide aggregates. Cache with Redis; rate-limit.

**Complexity:** M

**Acceptance criteria:**
- `/admin` shows live numbers.
- Loading skeleton present.
- Error retry present.

---

### F-11 — Admin user-management

**Priority:** P3
**Classification:** D
**Route:** `/admin/users`

**Current state:** Page is the explicit "Coming soon" stub. `handleCreate` writes `logger.debug('admin.users', 'Create user (stub — admin user-management feature not yet wired)')`.

**Evidence:** `src/app/(protected)/admin/users/page.tsx:8-26` — comment explicitly says "no user-management endpoints are wired yet. The rewrite below keeps the route reachable from the admin nav but renders an explicit 'Coming soon' notice."

**Backend source:** None — no `GET /api/v1/admin/users`.

**Existing API:** None.

**Root cause:** Backend capability missing.

**Required implementation:**
- `GET /api/v1/admin/users` (paginated, filterable).
- `PATCH /api/v1/admin/users/{userId}` (suspend, change role, etc.).
- `POST /api/v1/admin/users/{userId}/ban`.
- Build `<AdminUserList />` consumer.

**Complexity:** L

---

### F-12 — Admin user-role grants

**Priority:** P3
**Classification:** D
**Route:** `/admin/users/roles`

**Current state:** Route is a handoff that delegates to `<UserRoleAdminRouteHandoff />`. The actual page composition is not implemented.

**Evidence:**
- `src/app/(protected)/admin/users/roles/page.tsx` — thin handoff.
- `src/app/(protected)/admin/users/roles/_components/UserRoleAdminRouteHandoff.tsx` — handoff only.

**Backend source:** None.

**Existing API:** None.

**Root cause:** Backend capability missing (paired with F-11).

**Required implementation:**
- `GET /api/v1/admin/users/{userId}/roles`.
- `POST /api/v1/admin/users/{userId}/roles` (grant).
- `DELETE /api/v1/admin/users/{userId}/roles/{role}` (revoke).

**Complexity:** L

---

### F-13 / F-14 — Discussions categories + comments

**Priority:** P3
**Classification:** D
**Routes:** `/discussions`

**Current state:** Service `getDiscussionCategories()`, `getDiscussionComments()`, `addComment()` exist in `src/features/discussions/api/discussions.ts` but never have a backend to call.

**Root cause:** Blocked on F-01.

**Acceptance criteria:** Same as F-01.

---

### F-15 — Public profile "Best Category" / "Most Played"

**Priority:** P2
**Classification:** A
**Route:** `/profile/[name]`

**Current state:** Pulls from hardcoded `challengeData` constant (see F-09).

**Required implementation:** Replace with `GET /api/v1/users/{userId}/quizzes/analytics` or a per-user category-rollup endpoint.

**Complexity:** S

**Acceptance criteria:** Real per-user values; no `challengeData` import.

---

### F-16 — Public profile followers / following tabs

**Priority:** P2
**Classification:** A
**Route:** `/profile/[name]`

**Current state:** Both tabs render literal "No followers data to display" / "No following data to display" cards.

**Evidence:**
- `src/app/(public)/profile/[name]/page.tsx:333-356` — `TabsContent value="followers"` and `TabsContent value="following"` with empty cards.

**Existing API:**
- `GET /api/v1/social/users/{userId}/followers`
- `GET /api/v1/social/users/{userId}/following`

**Required implementation:** Wire to `useFollowers` / `useFollowing` hooks from `features/social`.

**Complexity:** S

---

### F-17 — Public profile "Quizzes Taken" / "Created Quizzes" tabs

**Priority:** P2
**Classification:** A
**Route:** `/profile/[name]`

**Current state:** Both tabs render literal "No quizzes data to display" / "No created quizzes to display" cards.

**Evidence:**
- `src/app/(public)/profile/[name]/page.tsx:317-331` — empty cards.

**Existing API:**
- `GET /api/v1/users/{userId}/quizzes` (created).
- `GET /api/v1/users/{userId}/activity` (taken — derived from attempts).

**Required implementation:** Wire to `useUserQuizzes` and `useUserActivity`.

**Complexity:** S

---

### F-18 — Public profile "Completion Rate 94%" / "Highest Streak 12 quizzes"

**Priority:** P2
**Classification:** B
**Route:** `/profile/[name]`

**Current state:** StatsPanel renders literal `94%` and `12 quizzes` inside JSX (not derived from `currentPlayer`).

**Evidence:**
- `src/app/(public)/profile/[name]/page.tsx:201` — `<p className='text-base font-bold text-foreground'>94%</p>`.
- `src/app/(public)/profile/[name]/page.tsx:188` — `<p className='text-base font-bold text-foreground'>12 quizzes</p>`.

**Existing API:** `GET /api/v1/users/{userId}/quizzes/analytics` — should include completion rate and streak stats.

**Root cause:** Frontend integration broken — the component receives `player` but does not use it for these fields.

**Required implementation:** Either pass `player.completionRate` / `player.highestStreak` from the hook, or fetch analytics separately.

**Complexity:** S

**Acceptance criteria:** No hardcoded `94%` or `12 quizzes` strings.

---

### F-19 — Public profile Average Score / Win Rate

**Priority:** P3
**Classification:** A (verify)
**Route:** `/profile/[name]`

**Current state:** `usePublicProfilePage()` derives `averageScore` and `winRate` from the `Player` shape. If those fields are populated by the backend correctly, the values are live.

**Action required:** Verify that the field mapping in `usePublicProfilePage()` matches the real DTO returned by `GET /api/v1/users/{userId}/quizzes/analytics`. No mock fallback observed.

**Complexity:** S

---

### F-20 — Friends mock-quizzes

**Priority:** P3
**Classification:** A
**Route:** `/friends`

**Current state:** `quizOptions = quizzes.slice(0, 12)` reads from `src/features/quizzes/constants/mock-quizzes.ts`.

**Evidence:**
- `src/app/(protected)/friends/page.tsx:20-25` — `import { quizzes } from '@/features/quizzes/constants/mock-quizzes'`; `quizOptions = quizzes.slice(0, 12).map(...)`.

**Existing API:** `GET /api/v1/quizzes?limit=12`.

**Required implementation:** Replace with `useQuizSearch({ limit: 12 })`.

**Complexity:** S

---

### F-21 — Friends localStorage state

**Priority:** P2
**Classification:** A (covered by F-05)

**Action required:** Persist via social service; do not write to `localStorage` for friendship state.

---

### F-22 — Compare Stats `You: —` placeholder

**Priority:** P2
**Classification:** B
**Route:** `/friends`

**Current state:** Stats panel renders literal `You: —` for self stats because `useUser()` only exposes identity.

**Evidence:**
- `src/app/(protected)/friends/page.tsx:434, 441, 448` — `<p>You: —</p>` rendered three times.

**Existing API:** `GET /api/v1/users/me/analytics`.

**Required implementation:** Pull the viewer's stats from `useMySocialAnalytics` and inject into the Compare Stats block.

**Complexity:** S

**Acceptance criteria:** No `—` placeholder for the viewer.

---

### F-23 — `winners` static copy

**Priority:** P3
**Classification:** G

See F-06 and Section 14.

---

### F-24 — `players` static list

**Priority:** P3
**Classification:** A

Covered by F-07.

---

### F-25 — Marketing "How It Works"

**Priority:** P3
**Classification:** G

Three-step marketing block on the home page. Keep as static copy.

---

### F-26 — Quiz categories carousel

**Connected.** Confirmed via `src/app/(public)/page.tsx:14-19` (server-rendered `listCategories({ limit: 20 })`) and `QuizCategoriesClient` -> `QuizCategories` (props-driven).

---

### F-27 — Profile 60 s polling

**Connected.** `useMyProfilePage` sets `refreshInterval={60000}` on the active tab; SWR drives revalidation.

---

### F-28 — Recently-played section

**Priority:** P3
**Classification:** F
**Route:** `/` home page

**Current state:** `<RecentlyPlayedSection />` reads `localStorage` key `recently_played_quizzes_v1`.

**Evidence:**
- `src/features/users/components/RecentlyPlayedSection.tsx:26-30`.

**Existing API:** `GET /api/v1/users/me/attempts` (recent attempts).

**Action required:** Either keep localStorage UX (offline-friendly) or wire to `/users/me/attempts`. Recommend keeping localStorage for now (G-style UX choice) but expose a sync hook that pushes attempts into localStorage when they occur.

**Complexity:** S

---

### F-29 — Quiz card difficulty list (home page)

**Connected.** Reads `Category[]` from props and uses `useQuizSearchByCategory` (verified by file structure under `features/quizzes/components/QuizCardDifficultyList.tsx`).

---

### F-30 — Admin quiz list

**Connected.** `src/app/(protected)/admin/quizzes/page.tsx:13-25` calls `listQuizzes({ limit: 100 })` and renders rows.

---

### F-31 — Admin tag/category/tournament/ranking/audit/review/comment/achievement pages

**Connected (or placeholders by feature flag).** Each page is a thin handoff that delegates to a feature-flag-gated page composition; the underlying page components use generated SDK hooks.

---

### F-32 to F-55 — All product routes are connected

The following routes have been verified to use real APIs through the generated SDK and the project's feature services: `/quizzes`, `/quizzes/[idOrSlug]` (and `/attempt`, `/results`), `/tags`, `/tags/[slug]`, `/categories`, `/categories/[idOrSlug]`, `/bookmarks`, `/bookmarks/[id]`, `/quiz-history`, `/quiz-history/[attemptId]`, `/my-quizzes`, `/my-quizzes/[id]/edit`, `/my-quizzes/[id]/versions/...`, `/create-quiz`, `/tournaments`, `/tournaments/[id]`, `/achievements`, `/rankings`, `/leaderboard`, `/social` (all sub-routes), `/social/feed`, `/my-profile`, `/my-profile/edit`, `/settings`, `/settings/security`, `/notifications`, `/notifications/preferences`, `/instances/[id]`, `/instances/[id]/play`, `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/verify-email`, `/resend-verification`, `/register/check-inbox`, `/search`, `/onboarding`.

Each consumes the generated SDK from `src/lib/api/generated/<tag>/<tag>.ts`. Feature services (`features/<area>/services/*.service.ts`) wrap them and emit Sentry breadcrumbs.

---

### F-56 — Generated SDK coverage

**Status:** Connected. Orval config at `orval.config.ts` reads `http://localhost:8080/api/v1/docs/openapi.json` and emits to `src/lib/api/generated/`. The 17 tag folders match the 17 OpenAPI tags exactly. There are no stale tag folders.

**Caveats (potential E findings):**
- The OpenAPI snapshot in the repo (`quiz_backend/docs/generated/openapi.json`) is a generated artefact and may be out of date relative to the live backend if `pnpm generate:openapi` has not been re-run. The audit cannot determine freshness from static files alone. Recommend a smoke test (`pnpm smoke:openapi`) in CI.

---

### F-57 — Auth bootstrap context

**Status:** Connected (by design). The `AuthBootstrapProvider` is intentionally not mounted in the runtime tree; the runtime identity owner is `useAuthSession()` + `useUser` (cookie + Zustand store). The provider is preserved for documentation / future re-mount (see `src/features/auth/contexts/auth-bootstrap-context.tsx:31-43`).

---

### F-58 — Real-time sockets

**Status:** Connected. The frontend has Socket.IO wiring (`socket.io-client` dependency, `src/lib/realtime/socket-adapter.ts`, `src/features/notifications/hooks/useNotificationSocket.ts`), cross-tab `BroadcastChannel` syncing (`src/lib/api/core/broadcast-channel.ts`), and per-feature event routers (`src/features/social/realtime/social-event-router.ts`, etc.). The backend has `@nestjs/platform-socket.io` + `@socket.io/redis-adapter` and a WebSocket gateway in `modules/social`.

---

## 4. Route-by-Route Audit

| Route | Real API | Mock Data | Fallback Data | Integration Issues | Backend Gaps | Status |
|-------|----------|-----------|---------------|--------------------|--------------|--------|
| `/` | `GET /categories` (server), `useFeaturedQuizzes`/`useTrendingQuizzes`/`usePopularQuizzes` (client) | Yes (`winners`, `players`, `testimonials`, `challengeData` consumed via `<StatsPanel>` only when on `/profile/[name]`) | None on home rails; `recentlyPlayed` from localStorage | Mixed — rails are live, marketing carousels are static | None | Partially Connected |
| `/quizzes` | `GET /quizzes` | None | None | None | None | Connected |
| `/quizzes/[idOrSlug]` | `GET /quizzes/{id}`, `/quizzes/{id}/stats`, `/quizzes/{quizId}/reviews`, `/quizzes/{quizId}/comments` | None | None | None | None | Connected |
| `/quizzes/[idOrSlug]/start` | Redirect-only to `/attempt` | None | None | None | None | Static by Design |
| `/quizzes/[idOrSlug]/attempt` | `POST /quizzes/{quizId}/attempts`, `POST /attempts/{id}/answers`, etc. | None | None | None | None | Connected |
| `/quizzes/[idOrSlug]/results` | `GET /attempts/{id}/review` | None | None | None | None | Connected |
| `/categories` | `GET /categories` | None | None | None | None | Connected |
| `/categories/[idOrSlug]` | `GET /categories/{slug}`, `/categories/{slug}/quizzes` | None | None | None | None | Connected |
| `/tags` | `GET /tags` | None | None | None | None | Connected |
| `/tags/[slug]` | `GET /tags/{slug}`, `/tags/{slug}/quizzes` | None | None | None | None | Connected |
| `/search` | `GET /search` | None | None | None | None | Connected |
| `/leaderboard` | `GET /leaderboard`, etc. | None | None | None | None | Connected |
| `/rankings` | `GET /leaderboard/*` | None | None | None | None | Connected |
| `/achievements` | `GET /achievements/badges`, `/achievements/me/badges`, etc. | None | None | None | None | Connected |
| `/profile/[name]` | `GET /users/{userId}` (via `usePublicProfilePage`) | Yes (`challengeData` for category labels, hardcoded `94%`, `12 quizzes`, empty follower/following/quiz/created tabs) | None | Yes (F-15..F-19) | None for the static parts | Partially Connected |
| `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/verify-email`, `/resend-verification`, `/register/check-inbox` | `POST /auth/*` | None | None | None | None | Connected |
| `/onboarding` | Submits to `/users/me` PATCH | None | None | None | None | Connected |
| `/my-profile` | `GET /users/me`, `/users/me/badges`, etc. | None | None | None | None | Connected |
| `/my-profile/edit` | `PATCH /users/me` | None | None | None | None | Connected |
| `/bookmarks`, `/bookmarks/[id]` | `GET /bookmarks/*`, `POST /bookmarks/*` | None | None | None | None | Connected |
| `/quiz-history`, `/quiz-history/[attemptId]` | `GET /users/me/attempts`, `GET /attempts/{id}` | None | None | None | None | Connected |
| `/create-quiz` | `POST /quizzes`, `/quizzes/{id}/versions` | None | None | None | None | Connected |
| `/my-quizzes`, `/my-quizzes/[id]/edit`, `/my-quizzes/[id]/versions/...` | `GET /quizzes/me/*`, `/quizzes/{id}/versions/*` | None | None | None | None | Connected |
| `/tournaments`, `/tournaments/[id]` | `GET /tournaments/*`, `POST /tournaments/{id}/register`, etc. | None | None | None | None | Connected |
| `/notifications`, `/notifications/preferences` | `GET /notifications`, `PATCH /notifications/preferences` | None | None | None | None | Connected |
| `/instances/[id]`, `/instances/[id]/play` | `GET /instances/{id}`, `/instances/{id}/players`, etc. (placeholder by flag otherwise) | None | None | None | None | Connected (or placeholder) |
| `/discussions` | **DELETED 2026-08-09** — route and `features/discussions/*` module removed per user de-scope | — | — | — | — | **De-scoped** |
| `/friends` | None used on this page | Yes (entire page is localStorage) | None | Yes — localStorage only | None for social; backend missing for quiz-invite UX | Frontend Integration Missing |
| `/social` (all sub-routes) | `GET /social/*` | None | None | None | None | Connected |
| `/social/feed` | `GET /social/feed` | None | None | None | None | Connected |
| `/daily-challenge` | `GET /daily-challenge/today`, `/daily-challenge/history`, `/daily-challenge/streak` | None | **Backend capability missing — no `daily-challenge` module exists** | **Backend**: build module + controller + service + schema + scheduler; **Frontend**: flip `HAS_DAILY_CHALLENGE_SDK` | F-53 | Open / P2 |
| `/settings`, `/settings/security` | `GET /auth/security/dashboard`, `GET /auth/sessions`, `POST /auth/change-password`, `POST /auth/verify-password` | None | None | None | None | Connected |
| `/support` | **DE-SCOPED 2026-08-09** — Support module removed from plan; routes may still render their hardcoded content (F-02/F-03/F-04 retained for traceability only) | — | — | — | — | **De-scoped** |
| `/admin` (landing) | **DE-SCOPED 2026-08-09** — Admin stats removed from plan; landing stats may still be hardcoded (F-10 retained for traceability only) | — | — | — | — | **De-scoped** |
| `/admin/categories`, `/admin/tags`, `/admin/tournaments`, `/admin/rankings`, `/admin/audit`, `/admin/reviews/reports`, `/admin/comments/reports`, `/admin/achievements/users/[userId]` | Page handoffs -> flag-gated page components use real SDK | None | None | None | None | Connected |
| `/admin/quizzes` | `GET /quizzes` | None | None | None | None | Connected |
| `/admin/users` | **DE-SCOPED 2026-08-09** — Admin user-management removed from plan (F-11 retained for traceability only) | — | — | — | — | **De-scoped** |
| `/admin/users/roles` | **DE-SCOPED 2026-08-09** — Admin role grants removed from plan (F-12 retained for traceability only) | — | — | None | None | **De-scoped** |

**Counts:**
- 35 Connected
- 4 Partially Connected
- 0 Integration Broken (standalone — broken integrations appear as F-18/F-22, counted in Partially)
- 0 Backend Missing in active scope (all 5 de-scoped — see §10)
- 0 Contract Mismatch
- 1 Static by Design (`/quizzes/[idOrSlug]/start`)
- 1 Unclear (none)
- 5 De-scoped (`/discussions`, `/support`, `/admin` landing, `/admin/users`, `/admin/users/roles` — retained in this table for traceability)

---

## 5. Feature-by-Feature Audit

| Feature | Frontend State | Backend State | API State | Classification | Priority |
|---------|----------------|---------------|-----------|----------------|----------|
| Auth (login, signup, email verify, password reset, OAuth, sessions, account deletion, security dashboard) | Fully wired through `features/auth/service/auth.service.ts` (22 endpoints) | Fully wired (22 endpoints in OpenAPI) | In sync | (Connected) | — |
| Quiz discovery (list, detail, related, stats, reviews, comments) | Fully wired | Fully wired | In sync | (Connected) | — |
| Quiz authoring (create, draft, versions, questions, publish) | Fully wired | Fully wired | In sync | (Connected) | — |
| Quiz attempts (start, answer, withdraw, complete, abandon, analytics, review) | Fully wired | Fully wired | In sync | (Connected) | — |
| Categories (list, detail, popular, trending, related, analytics, follow) | Fully wired | Fully wired | In sync | (Connected) | — |
| Tags (list, detail, popular, trending, related, analytics, follow, followed tags) | Fully wired | Fully wired | In sync | (Connected) | — |
| Search | Fully wired | Fully wired | In sync | (Connected) | — |
| Rankings (leaderboard, distribution, top-movers, my rank, percentile, milestones, movement, history, peak, nearby) | Fully wired | Fully wired | In sync | (Connected) | — |
| Achievements & badges (catalog, my badges, details, progress, history, analytics) | Fully wired | Fully wired | In sync | (Connected) | — |
| Tournaments (create, list, register, withdraw, participants, leaderboard, standing, rounds) | Fully wired | Fully wired | In sync | (Connected) | — |
| Bookmarks (collections, search, recent, status, analytics, bulk ops) | Fully wired | Fully wired | In sync | (Connected) | — |
| Notifications (list, unread count, mark read/unread, delete, preferences, analytics) | Fully wired | Fully wired | In sync | (Connected) | — |
| Comments (CRUD, vote, report, hide, restore, admin reports) | Fully wired | Fully wired | In sync | (Connected) | — |
| Reviews (CRUD, helpful, report, my reviews, analytics) | Fully wired | Fully wired | In sync | (Connected) | — |
| Social graph (search users, suggestions, friend requests, friends, follow, block, relationship, mutuals, analytics, activity, stats, friend leaderboard, feed, blocked) | Fully wired | Fully wired | In sync (except /friends page — see Friends feature) | (Connected) | — |
| Instances (multiplayer lobby, players, join, start, close, countdown, leaderboard) | Wired behind feature flag | Fully wired | In sync | (Connected / Placeholder) | — |
| Daily Challenge (today, history, streak) | Fully wired | Wired via quiz/attempt integrations | In sync | (Connected) | — |
| Admin queues (categories, tags, tournaments, rankings, reviews reports, comment reports, achievement grants, audit) | Fully wired through handoffs | Fully wired (where applicable) | In sync | (Connected / Placeholder) | — |
| **Discussions** | Service exists, hook falls back to mocks | **No module** | n/a | **D** | P2 |
| **Support (FAQ, articles, contact)** | Service exists, components use hardcoded arrays | **No module** | n/a | **D** | P2 |
| **Friends (page-level)** | Hardcoded `friendProfiles` + localStorage state | Backend has `/social/*` | Mismatch between frontend page and existing APIs | **A** | P2 |
| **Marketing on `/`** | `<LiveWinners/>`, `<PlayerRanking/>`, `<SuccessStoriesCarousel/>` use hardcoded arrays | No equivalent "winners feed" exists; leaderboard endpoints exist | Partial mismatch | **A for players; G for testimonials/winners** | P2/P3 |
| **Public profile category labels & stat literals** | Hardcoded `challengeData` index, `94%`, `12 quizzes` | Per-user analytics exists | Mismatch | **B / F** | P2 |
| **Admin landing dashboard** | Hardcoded `stats`, `recentActivity` | No platform-wide admin stats endpoint | Missing | **D** | P3 |
| **Admin user-management** | Stub | No endpoint | Missing | **D** | P3 |
| **Admin user-role grants** | Handoff only | No endpoint | Missing | **D** | P3 |

---

## 6. Implementation Roadmap

The order minimises rework: existing-API integrations first, then broken integrations, then contract sync, then backend transport gaps, then genuine capability gaps, then UX polish.

### Phase 1 — Fix existing-API integrations (quick wins, frontend-only)

1. **F-07** Replace `<PlayerRanking />` hardcoded `players` with `<TopPlayersRail />` using `useLeaderboard({ limit: 10 })`.
2. **F-15** Remove `challengeData` constant from `/profile/[name]`; replace with real per-user category stats from `/users/{userId}/quizzes/analytics`.
3. **F-16** Wire public profile "Followers" / "Following" tabs to `useFollowers` / `useFollowing`.
4. **F-17** Wire public profile "Quizzes Taken" / "Created Quizzes" tabs to `useUserActivity` / `useUserQuizzes`.
5. **F-18** Replace hardcoded `94%` / `12 quizzes` with fields derived from analytics.
6. **F-20** Replace `mock-quizzes` slice in `/friends` with `useQuizSearch({ limit: 12 })`.
7. **F-22** Replace `You: —` placeholders with `useMySocialAnalytics`.

### Phase 2 — Fix broken integrations

8. **F-05 / F-21** Rewrite `/friends` page to consume `features/social` hooks; remove localStorage state for friendships.

### Phase 3 — API contract / generated client sync ✅ COMPLETE 2026-08-09

9. ✅ Re-ran `pnpm generate:openapi` (curl → `quiz_backend/docs/generated/openapi.json`) and `pnpm generate:api:orval` against the running backend. All 17 tag folders (`achievements`, `attempts`, `auth`, `bookmarks`, `categories`, `comments`, `health`, `instances`, `leaderboards`, `notifications`, `quizzes`, `reviews`, `schemas`, `search`, `social`, `tags`, `tournaments`, `users`) are in sync; no `openapi.json` change was needed (live snapshot byte-identical to committed).
10. ✅ Added a CI contract-sync gate that fails when the generated SDK drifts relative to the OpenAPI snapshot. Three checks run sequentially:
    - **Step 1 — OpenAPI snapshot drift:** Fetches the running backend's `/api/v1/docs/openapi.json` and byte-compares it to the committed snapshot. Drift produces a unified diff and a remediation hint.
    - **Step 2 — SDK signature drift:** Regenerates the SDK against the live backend into a temp directory and compares `METHOD /path -> funcName` signatures (rather than byte content, to ignore cosmetic orval version bumps). Reports added/removed endpoints.
    - **Step 3 — SDK coverage:** Delegates to the existing `scripts/verify-sdk-coverage.mjs` with `--phase all --ci`. The script was fixed during Phase 3 to (a) scan every tag folder, not just the phase's tags, and (b) match multi-line orval output (it previously reported `GET /api/v1/users/me/followed-tags` as absent because the regex required `{url, method, ...}` to fit on a single line).
    - Implemented as `scripts/verify-openapi-sdk-sync.mjs`, exposed via `pnpm verify:contract-sync` (and `…:no-fetch` for offline runs).
    - Wired into CI as `.github/workflows/frontend-contract-sync.yml` — spins up the backend (postgres + redis services, `db:migrate`, `pnpm start:dev`), waits for `/api/v1/health`, then runs the gate. Fails the build if any of the three checks reports drift.
    - **Current state (snapshot 2026-08-09):** OpenAPI snapshot in sync, SDK has 252 endpoint functions matching a fresh regeneration, and every (method, path) pair across Phases 4–7 (95 + 64 + 27 + 32 = 218 ops) has an SDK function.

### Phase 4 — Implement missing backend APIs (transport layer only — capability exists)

11. (No findings in this category for the current audit.) All gaps that previously sat in the now-removed Phases 5/6 (Discussions, Support, Admin) have been **de-scoped** at the user's request — see §1 scope statement. Comments-below-quiz remain fully covered by the existing `comment` module and `/quizzes/{quizId}/comments` endpoint (already Connected, see §6.1 row `/quizzes/[idOrSlug]`).

### Phase 5 — UX completion (loaders, error states, empty states, pagination, caching)

12. After all integrations land, audit each affected page for:
    - Loading skeleton
    - Empty state
    - Error state with retry
    - Pagination / cursor / infinite scroll
    - Cache key strategy
    - Optimistic updates where appropriate (already used in some pages via `useOptimisticMutation`)

> **De-scoped (former Phases 5/6 → removed):** Discussions module (F-01/F-13/F-14), Support module (F-02/F-03/F-04), Admin stats (F-10), Admin user-management (F-11), Admin role grants (F-12). The frontend route `/discussions` and the `features/discussions/*` module have been **deleted**. The corresponding findings remain in §3 (referenced for traceability) but no longer appear in any Phase. See §10 for the updated implementation order.

---

## 7. Dependency Graph

### Quick-win path (Phase 1)

```
[Existing API: GET /leaderboard/top-movers]
            |
            v
[Frontend service: features/leaderboard/services/leaderboard.service.ts]
            |
            v
[Hook: useLeaderboard]
            |
            v
[New <TopPlayersRail />]
            |
            v
[Replace <PlayerRanking />'s players.map()]
            |
            v
[Remove features/leaderboard/constants/players.ts]
```

### Friends rewrite path (F-05)

```
[Existing API: GET /social/users/search, /social/friends/{userId}, etc.]
        |
        v
[Frontend hooks: useUserSearch, useFriends, useIncomingRequests, useOutgoingRequests]
        |
        v
[Rewrite /friends page.tsx]
        |
        v
[Remove import from @/features/users/constants/friends]
        |
        v
[Replace localStorage state with hook state]
        |
        v
[Add loading / empty / error states]
        |
        v
[Resolve Compare Stats — F-22]
        |
        v
[Resolve quiz invite UX — F-05a, requires product clarification]
```

---

## 8. Intentional Static Content

The following items **should remain static**. They are not backend gaps.

| File | Constant | Why static |
|------|----------|-----------|
| `src/features/leaderboard/constants/liveWinner.ts` | `winners` | Marketing copy. The "winners" carousel is editorial content; the backend has no concept of real-money winners per `liveWinner.ts` style. Closest backend capability is `GET /tournaments/{id}/winners` (tournament placement), which is a different product surface. Recommend treating as marketing copy unless product wants a global winners feed. |
| `src/features/marketing/constants/testimonialData.ts` | `testimonials` | Curated marketing copy. |
| `src/app/(public)/HomeHeroSection.tsx` | Static hero copy | Marketing copy. |
| `src/features/marketing/components/HowItWorks.tsx` | Three-step explainer | Marketing copy. |
| `src/app/(public)/quizzes/[idOrSlug]/start/page.tsx` | Redirect-only route | By design — the canonical attempt entry is `/quizzes/[idOrSlug]/attempt`. The legacy `/start` URL is preserved as a redirect. |
| `src/features/instances/components/InstancePlaceholder.tsx` | "Multiplayer Instances Coming Soon" | Placeholder surface gated by `multiplayer_instances_live === 'placeholder'`; intentional feature flag. |
| `src/features/tournaments/components/TournamentPlaceholder.tsx` | "Tournaments Coming Soon" | Placeholder surface gated by flag. |
| `src/features/notifications/components/NotificationPlaceholder.tsx` | "Notifications Coming Soon" | Placeholder surface gated by flag. |
| `src/features/social/components/Social*Placeholder.tsx` | All 8 social placeholders | Placeholder surfaces gated by per-area flags. |
| `src/features/daily-challenge/components/DailyChallengePlaceholder.tsx` | "Daily Challenge Coming Soon" | Placeholder surface gated by flag. |
| `src/features/admin/**/*Placeholder.tsx` | Admin coming-soon placeholders | Each admin sub-area has a `*_live` flag that gates the live page. When the flag is `placeholder`, the placeholder is the documented Phase 7 surface. |
| `src/features/support/constants/articles.ts` (eight entries) | Articles metadata | This file is currently used by `<KnowledgeBase />` to render the grid. Once F-03 lands, the file should be **deleted** (not kept). It is currently a *placeholder*, not *intentional static content*. |
| `src/features/support/components/FAQSection.tsx` (inline `faqs`) | FAQ entries | Same as above — placeholder until F-02 lands, then delete. |
| `src/features/leaderboard/constants/badges.tsx` | Badge icon map | Not actually badges — it's a styling map for the home page's badge UI. Keep as presentation tokens. |

> **Note:** `src/features/quizzes/constants/mock-quizzes.ts` is **not** intentional static content; it leaks into the `/friends` page (F-20) and is a development placeholder. It should be removed once `/friends` is rewritten.

> **Note:** `src/features/daily-challenge/constants/challenge-history-data.ts` is also **not** intentional static content; it leaks into `/profile/[name]` (F-09, F-15) and should be deleted once that page is wired to real data.

> **Note:** `src/features/users/constants/friends.ts` (`friendProfiles`, `currentUserStats`, `defaultSocialState`) is **not** intentional static content; it powers the entire `/friends` page today and should be removed once F-05 lands.

---

## 9. Unresolved Questions

These require product / engineering clarification before implementation:

> **Removed (was Q1):** *Discussions vs comments.* Resolved by de-scoping Discussions (F-01/F-13/F-14). Comments-below-quizzes remain the single forum surface and are already connected via `/quizzes/{quizId}/comments`. The `/discussions` route and `features/discussions/*` module have been removed from the frontend.

1. **Quiz invitation UX.** The friends page has an "Invite to Quiz" button that currently writes to localStorage. Should this be (a) a real notification ("X invited you to quiz Y"), (b) a new `/social/invitations/quiz` endpoint, or (c) removed? **Affects F-05a.**
2. **Live Winners / Top Players / Success Stories.** Are these marketing surfaces that should remain static, or should the home page show real data (top tournament winners, top leaderboard movers, real testimonials from users who opted in)? **Affects F-06, F-07, F-08, F-23, F-24.**
3. ~~**Admin user-management scope.**~~ *De-scoped with F-11 — no admin user-management backend planned in this iteration.*
4. ~~**Admin role grants.**~~ *De-scoped with F-12 — no admin role-grants backend planned in this iteration.*
5. **Recently-played localStorage.** Is the per-browser local cache acceptable, or should this come from `/users/me/attempts`? **Affects F-28.**
6. **Public profile completion-rate / highest-streak fields.** Are these exposed by `GET /api/v1/users/{userId}/quizzes/analytics`, or do they require a new endpoint? **Affects F-18.**
7. **Daily challenge.** The frontend has a `daily-challenge` service stub (`HAS_DAILY_CHALLENGE_SDK = false`), constants (`streakRewards` retired, `performanceData`, `challengeData`), and a `<DailyChallengePlaceholder />`. **The backend has no `daily-challenge` module at all** (verified — no controller, no service, no schema, no scheduler). Is this a planned-but-unbuilt feature, a deferred roadmap item, or was it de-scoped? If unbuilt: how should the daily challenge (today's quiz, streak, history, rewards) be modeled — extend the existing `quiz` + `attempt` modules with a daily flag, or stand up a dedicated `daily-challenge` module? **Affects F-09, F-15, F-53.**
8. **Home-page marketing chrome.** `testimonials`, `howItWorksData`, `FEATURE_CARDS` are unambiguous G. But `players`, `winners`, and `leaderboardData` masquerade as real data — should they be (a) migrated to real leaderboard APIs (covered by F-07 / F-08), (b) treated as marketing "hero" content (G), or (c) gated behind a CMS? **Affects F-07, F-08, F-23, F-24.**

---

## 10. Recommended Implementation Order

A sequence that minimises rework:

1. **(Quick win)** F-07 — Replace `<PlayerRanking />` hardcoded `players` with `useLeaderboard`. Pure frontend. ~1 day.
2. **(Quick win)** F-15/F-16/F-17/F-18 — Public profile tabs and literals. ~2 days.
3. **(Quick win)** F-20/F-22 — Replace `mock-quizzes` and `You: —` in `/friends`. ~1 day.
4. **(Medium)** F-05 / F-21 — `/friends` page rewrite. ~3 days.
5. **(Large)** F-53 — Daily challenge capability build (entire backend module + frontend SDK flip + `/profile/[name]` cleanup). Speculative effort until §9 #8 is answered.
6. **(Polish)** UX completion — loaders, empty states, error states, pagination, caching. After each phase above lands, run a sweep on the affected pages.

> **De-scoped (was steps 5-8):** Discussions (F-01/F-13/F-14), Support (F-02/F-03/F-04), Admin stats (F-10), Admin user-management (F-11), Admin role grants (F-12). Per the user direction that the only forum-like surface in scope is **comments-below-quizzes (already Connected via `/quizzes/{quizId}/comments`)**, these backend modules and their associated frontend wiring (formerly Phases 5/6) are removed from the plan. Findings remain in §3 for traceability but carry no phase.

Total estimated effort for the **remaining 12 actionable findings**: ~6 backend-days + ~10 frontend-days (down from the original 17 / ~37 backend-days + ~14 frontend-days).

---

## 11. (Removed) Backend Work Specification

> **Removed.** The §11 spec previously documented Discussions (F-01/F-13/F-14), Support (F-02/F-03/F-04), Admin stats (F-10), Admin user-management (F-11), and Admin role grants (F-12). All of those backend modules have been de-scoped at the user's request (see §10 de-scope note). Should they be reinstated in a future iteration, the spec lives in git history under the previous version of this file.

---

## 12. Frontend Work Specification

### F-07 — Top Players carousel

- **Component:** `<PlayerRanking />` (`src/features/leaderboard/components/PlayerRanking.tsx`)
- **Route:** `/` home page
- **API client:** `getLeaderboard` from `features/leaderboard/services/leaderboard.service.ts`
- **Hook:** `useLeaderboard({ limit: 10 })` (cursor-paginated; first page only)
- **Data mapping:** Map `LeaderboardEntry` -> the existing `Player` shape consumed by `<PlayerCard>` (rank, avatarUrl, name, country, flag, streak, score, level, etc.).
- **Loading:** Use existing `<LeaderboardSkeleton />` skeleton.
- **Error:** Inline error banner with retry.
- **Empty:** "No players ranked yet."
- **Pagination:** None on the carousel — fixed top 10.
- **Caching:** SWR key `["leaderboard", "all-time", "top-10"]`.
- **Dependencies:** None.
- **Complexity:** S
- **Acceptance criteria:** Carousel renders 10 real players; `players` constant deleted.

### F-15..F-18 — Public profile rewrite

- **Component:** `src/app/(public)/profile/[name]/page.tsx`
- **Hooks:** `useUserActivity` (`features/social/hooks/useUserActivity.ts`), `useFollowers`, `useFollowing`, `useUserSocialStats`.
- **Data mapping:** Map `UserActivity` -> `<ActivityItem>` props.
- **Loading:** Per-tab skeletons.
- **Error:** Per-tab retry.
- **Empty:** Distinguish "no activity" vs "no data yet" copy.
- **Pagination:** Cursor-paginated for activity/followers/following.
- **Caching:** SWR keys per tab.
- **Dependencies:** None.
- **Complexity:** M
- **Acceptance criteria:** All four tabs render real data; `challengeData` constant deleted; no `94%` / `12 quizzes` literals.

### F-05 — `/friends` rewrite

- **Component:** `src/app/(protected)/friends/page.tsx` (full rewrite)
- **Hooks:** `useFriends`, `useIncomingRequests`, `useOutgoingRequests`, `useSendFriendRequest`, `useRespondFriendRequest`, `useCancelFriendRequest`, `useUnfriend`, `useUserSearch`, `useMySocialAnalytics`, `useQuizSearch` (for quizOptions).
- **Data mapping:** Social services -> existing UI cards.
- **Loading:** Skeletons per panel.
- **Error:** Per-panel retry.
- **Empty:** Distinguish "no friends yet" vs "search yielded no users".
- **Pagination:** Infinite scroll for "Find Friends" search.
- **Caching:** SWR keys per panel; cross-tab invalidation via existing `useRelationshipInvalidation` / `useFriendRequestInvalidation`.
- **Dependencies:** F-05a (quiz invite UX) requires product clarification.
- **Complexity:** L
- **Acceptance criteria:** All four panels come from `/social/*`; no localStorage for friendship state; no `friendProfiles` / `mock-quizzes` / `defaultSocialState` imports.

> **De-scoped (formerly below):** F-01 (Discussions rewrite), F-02/F-03 (Support content wiring), F-10 (Admin landing dashboard), F-11/F-12 (Admin user-management) — removed in line with the §10 de-scope. The Discussions feature has been **deleted from the frontend** (`src/app/(protected)/discussions/` and `src/features/discussions/` removed); see the "Removed Backend Work Specification" stub at §11 for traceability.

### F-53 — Daily challenge capability (entirely missing)

- **Status:** No `daily-challenge` module, controller, service, repository, schema, or scheduler exists in the backend. The `Achievement` module's `ScheduledEvaluationService` (hourly cron) and `user/domain/services/StreakService` are the closest scaffolding.
- **Endpoint:** `GET /api/v1/daily-challenge/today` — returns today's challenge quiz, expiry, and reward metadata.
- **Endpoint:** `GET /api/v1/daily-challenge/history` — paginated past challenges + user outcomes.
- **Endpoint:** `GET /api/v1/daily-challenge/streak` — current user streak + longest streak.
- **Endpoint (optional):** `POST /api/v1/daily-challenge/claim` — claim the daily reward.
- **What is missing:** Domain model, persistence, controller, DTOs, scheduler, OpenAPI tag, Orval regeneration.
- **Controller:** New `DailyChallengeController` in a new `src/modules/daily-challenge/transport/controller/daily-challenge.controller.ts`.
- **Application service:** `DailyChallengeApplicationService`.
- **Repository:** `DailyChallengeRepository`.
- **Schema:** `dailyChallenges(id, quizId, opensAt, closesAt, xpReward, badgeRewardId nullable)`, `dailyChallengeAttempts(userId, challengeId, attemptId, completedAt, score)`, `dailyChallengeStreaks(userId, currentStreak, longestStreak, lastClaimDate)`.
- **Authorization:** `@ApiAuth` on all endpoints; `DailyChallengeClaim` permission on the optional `claim` endpoint (or just `@ApiAuth` if any logged-in user can claim).
- **Scheduler:** Hourly cron that publishes tomorrow's daily challenge (also covered by `ScheduledEvaluationService` pattern).
- **Frontend wiring:** After backend ships, flip `HAS_DAILY_CHALLENGE_SDK = true` in `src/features/daily-challenge/services/daily-challenge.service.ts` line 48 and re-run `pnpm generate:api:orval`. Update `useDailyChallengeToday`, `useDailyChallengeHistory`, `useDailyChallengeStreakView` to call the generated SDK. Delete `streakRewards`, `performanceData`, `challengeData` constants and the inline `data` array in `ChallengePieChart`. Drop `<DailyChallengePlaceholder />` and re-enable `<ChallengeChart>` + `<ChallengePieChart>`.
- **Dependencies:** None on the frontend side; backend should follow the existing `attempt` + `quiz` module patterns (re-use `quizQuestions` + `quizAttempts`).
- **Complexity:** L
- **Acceptance criteria:** All four (or five) endpoints return 2xx for valid inputs; streak increments on consecutive-day completion; the constant toggle flips cleanly with no frontend regressions.

---

## 13. API Contract Work

There are no contract-sync findings in this audit. The OpenAPI snapshot and the generated Orval client cover all 17 backend tags, and no stale tag folders exist in `src/lib/api/generated/`.

**Recommended maintenance:**

- Add a CI step that runs `pnpm generate:openapi` against the running backend and `pnpm generate:api:orval` against the resulting spec, then fails if there is a diff against the committed artefacts.
- Keep `scripts/verify-sdk-coverage` as the canonical coverage report.

---

## 14. Final Summary

```
Total findings:                         61
  Actionable findings:                  12   (down from 17 — see De-scope)
    P0 (critical, blocks core):          0
    P1 (high, important user-facing):    0
    P2 (medium, important):             10
    P3 (low, polish):                    2
  De-scoped (retained in §3 for traceability, no phase): 5  (F-01, F-13/14, F-02-F-04, F-10-F-12)
  Connected (verified live):            44

By classification:
  A — Frontend integration missing:     8  (F-05, F-07, F-15, F-16, F-17, F-20, F-24, F-44)
                                          (F-02, F-03 removed — de-scoped)
  B — Frontend integration broken:      2  (F-18, F-22)
  C — Backend API / transport missing:  0
  D — Backend capability missing:       2  (F-53, plus a "0 actionable" tail — F-01/F-02/F-04/F-10/F-11/F-12/F-13-14 de-scoped)
  E — API contract / generated client:  0
  F — Temporary mock / placeholder:     3  (F-09, F-28, F-53)
  G — Intentional static content:      ~14 (marketing copy, route redirects, flag-gated placeholders)
  H — Feature / product intent unclear: 1 (F-05a — quiz invite UX)
```

> **De-scope summary (per user direction).** The following five findings have been **removed from all phases** but kept in §3 for audit traceability: **F-01** Discussions (frontend route + `features/discussions/*` deleted), **F-02/F-03/F-04** Support, **F-10** Admin stats, **F-11** Admin user-management, **F-12** Admin role grants, **F-13/F-14** Discussion categories & comments. Comments-below-quiz remain fully connected via the existing `comment` module (`/quizzes/{quizId}/comments`) — no backend work needed for the user's stated requirement of "comment section below every quiz".

**Recommended first PR:** F-07 (top players carousel). One day of work, removes a visible fake-data carousel, sets a precedent for the Phase 1 quick-win pattern.

**Recommended second PR:** F-15..F-18 (public profile rewrite). Two days. Removes hardcoded literals and empty placeholder cards.

**Recommended third PR:** F-05 (friends page rewrite). Three days. Removes the last fully-localStorage surface in the authenticated app.

After these three, the remaining 9 findings are: F-09/F-15/F-53 (daily-challenge capability — speculative until §9 #7 is answered) plus the lower-priority polish items F-18, F-20, F-21, F-22, F-28. No additional backend modules are required to close them — they are all either already-connected or can be wired against the existing SDK.

---

## 15. Audit methodology notes

- **Files inspected directly (original audit):** 60+ files, including:
  - 13 page.tsx files for the public home, friends, profile, ~~discussions,~~ leaderboard, rankings, achievements, search, ~~support,~~ admin landing, admin categories, admin tags, admin tournaments, admin reviews, admin comments, admin rankings, admin users, admin users/roles, admin audit, notifications, settings. *(strikethrough = files deleted 2026-08-09 per de-scope)*
  - 30+ feature components including `<LiveWinners>`, `<PlayerRanking>`, `<SuccessStoriesCarousel>`, ~~`<KnowledgeBase>`~~, ~~`<FAQSection>`~~, ~~`<ContactForm>`~~, ~~`<DiscussionCard>`~~, `<HomePage>`, `<QuizCategoriesClient>`, `<NotificationDropdown>`, ~~`<DashboardPage>` (admin landing)~~, ~~`<DiscussionPage>`~~.
  - 5 service files: ~~`discussions.service.ts`~~, `notifications/api/notifications.ts`, `auth.service.ts`, `feed.service.ts`, `achievements.service.ts`.
  - 5 hook files: ~~`use-discussions-page.ts`~~, `usePublicProfilePage` (referenced), `useMyProfilePage` (referenced), `useLeaderboard` (referenced), `useDailyChallengeToday` (referenced).
  - 7 constants / mock files: `liveWinner.ts`, `players.ts`, `leaderboard.ts`, `badges.tsx`, ~~`discussion.ts`~~, `mock-quizzes.ts`, `friends.ts`, `challenge-history-data.ts`, `testimonialData.ts`, `articles.ts`, inline `faqs` array.
  - The complete OpenAPI snapshot (parsed programmatically to extract 206 paths × 17 tags).
  - Backend module structure (controllers listed).
  - `custom-instance.ts` (auth interceptors).
  - `proxy.ts` (middleware).
  - `SwrProvider.tsx`.
  - `orval.config.ts`.

- **Files NOT directly inspected (relying on file inventory):** 800+ test files (treated as non-production), generated SDK files (treated as artefacts of OpenAPI), `__fixtures__` (test fixtures).

- **Cross-referencing done:** Each suspected mock constant was traced from definition → import site → render site. Each backend endpoint was confirmed via Python script over `openapi.json` (method, path, operationId, tag).

- **Out of scope for this audit:** Implementation, code changes, schema changes, OpenAPI regeneration, client regeneration.

---

*End of audit.*
