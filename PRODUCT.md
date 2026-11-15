# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Trivia Enthusiasts & Casual Learners:** Users seeking quick, engaging knowledge checks, discovering trivia across categories, and playing daily challenges.
- **Community Quiz Creators:** Users authoring and sharing custom quizzes with diverse question formats, custom timers, and category tags.
- **Competitive Players:** Users participating in tournaments, climbing global and friend leaderboards, and earning achievements and coins.

## Product Purpose

QuizHub exists to make learning and trivia engaging, competitive, and social ("Play, Share, Earn!"). Success means visitors quickly discover compelling quizzes, return for daily challenges, author quality community content, and stay engaged through achievements, rankings, and reward coins.

## Positioning

A community-driven, gamified social quiz platform that pairs user-generated quiz authoring with competitive features (daily challenges, tournaments, leaderboards, coin rewards, and social activity) rather than dry assessment or isolated flashcard drills.

## Operating Context

- **Environment:** Responsive desktop and mobile web, optimized for both touch and desktop devices with PWA support.
- **Session Types:** Fast micro-sessions (3–5 minute daily challenges, quick trivia runs) and deeper engagement (authoring multi-question quizzes, participating in multi-round tournaments).
- **Backend Architecture:** Integrates with NestJS API backend via Orval-generated TypeScript SDK, WebSockets for real-time interactions, and RFC 7807 problem details.

## Capabilities and Constraints

- **Confirmed Capabilities:**
  - Quiz discovery: categorized browsing, search, tags, featured/trending/popular bundles.
  - Quiz play: timed questions, instant scoring, attempt reviews, bookmarking, and comment discussions.
  - Authoring: quiz creation workflow with question configuration, time limits, and category assignment.
  - Gamification & Social: coins economy, daily challenges, achievements, leaderboards, rankings, tournaments, friends list, and user profiles.
  - Administration: management queue, content review, and platform moderation.
- **Technical Constraints:**
  - Next.js 16 App Router with React 19.
  - Strict contract alignment with backend OpenAPI schema via generated SDK.
  - Dark/light mode theme support (`next-themes`).
  - Accessible keyboard navigation and ARIA support via Radix UI primitives.

## Brand Commitments

- **Name:** QuizHub
- **Tagline:** "Play, Share, Earn!"
- **Voice & Tone:** Energetic, encouraging, community-focused, and clear.
- **Typography & Assets:** Outfit for display/body text, JetBrains Mono for numbers/code, Lucide icon system.

## Evidence on Hand

- Functional frontend codebase in `src/` with feature-sliced modular architecture (`src/features/`).
- OpenAPI contract audit and frontend-backend plan documented in `docs/frontend-backend-gap-plan.md`.
- Live API service integration layer in `src/lib/api/` and `src/features/*/services/`.
- App assets and PWA manifests in `public/`.

## Product Principles

- **Gamification Rewards Curiosity:** Achievements, coins, and streaks should motivate learning and play without feeling exploitative or noisy.
- **Creation Is as First-Class as Playing:** Authoring a quiz must feel intuitive, flexible, and rewarding.
- **Social Connection Fuels Momentum:** Quizzing is elevated through friendly rivalry, leaderboards, shared quizzes, and community commentary.
- **Uncompromising Responsiveness & Polish:** Timers, answer selections, and score reveals must be instantaneous, reliable, and accessible on any device.

## Accessibility & Inclusion

- Adherence to WCAG 2.1 AA standards for color contrast and font legibility.
- Comprehensive keyboard navigation with skip links and accessible Radix UI dialogs, menus, and controls.
- Full support for `prefers-reduced-motion` and system-level dark/light mode preferences.
