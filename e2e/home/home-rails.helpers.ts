/**
 * `home-rails.helpers.ts` — shared stubbing + fixture helpers for the
 * `home-rails.spec.ts` (E1) and `home-rails.a11y.spec.ts` (E2) suites.
 *
 * Source epic: Story 3.7 — Featured / trending / popular rails on `/`.
 * Source tickets: TKT-3.7.E1 / TKT-3.7.E2.
 *
 * The helper centralises the three quiz endpoints + the categories
 * endpoint so the spec suites stay focused on assertions instead of
 * boilerplate. All shapes mirror the SDK wire shapes
 * (TKT-3.7.A1 §3).
 */

import type { Page, Request, Route } from '@playwright/test';

// ──────────────────────────────────────────────────────────────────────
// Endpoints
// ──────────────────────────────────────────────────────────────────────

export const FEATURED_PATH = '**/api/v1/quizzes/featured*';
export const TRENDING_PATH = '**/api/v1/quizzes/trending*';
export const POPULAR_PATH = '**/api/v1/quizzes/popular*';
export const CATEGORIES_PATH = '**/api/v1/categories/popular*';

export const FEATURED_LIMIT = 6;
export const TRENDING_LIMIT = 10;
export const POPULAR_LIMIT = 10;

// ──────────────────────────────────────────────────────────────────────
// DTO fixture types
// ──────────────────────────────────────────────────────────────────────

export interface QuizItem {
  quizId: string;
  creatorId: string | null;
  title: string;
  description: string | null;
  slug: string;
  requirements: string | null;
  imageUrl: string | null;
  categoryId: string | null;
  isFeatured: boolean;
  isHidden: boolean;
  isVerified: boolean;
  publishedVersionId: string | null;
  publishedVersion: unknown | null;
  createdAt: string;
  updatedAt: string;
  tags: unknown[];
}

export interface TrendingItem extends QuizItem {
  rank: number;
  trendingScore: number;
  totalAttempts: number;
  recentAttempts: number;
}

export interface PopularItem extends QuizItem {
  rank: number;
  popularityScore: number;
  totalAttempts: number;
  averageRating: number;
  bookmarkCount: number;
}

export interface RankedCategory {
  categoryId: string;
  name: string;
  slug: string;
  rank: number;
  description: string | null;
  imageUrl: string | null;
}

// ──────────────────────────────────────────────────────────────────────
// DTO factories
// ──────────────────────────────────────────────────────────────────────

export function makeFeaturedQuiz(i: number): QuizItem {
  return {
    quizId: `0192f4d8-1000-7000-8000-${String(i).padStart(12, '0')}`,
    creatorId: 'creator-1',
    title: `Featured Quiz ${i}`,
    description: null,
    slug: `featured-quiz-${i}`,
    requirements: null,
    imageUrl: null,
    categoryId: null,
    isFeatured: true,
    isHidden: false,
    isVerified: true,
    publishedVersionId: null,
    publishedVersion: null,
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
    tags: [],
  };
}

export function makeTrendingQuiz(i: number): TrendingItem {
  return {
    rank: i,
    quizId: `0192f4d8-2000-7000-8000-${String(i).padStart(12, '0')}`,
    creatorId: 'creator-1',
    title: `Trending Quiz ${i}`,
    description: null,
    slug: `trending-quiz-${i}`,
    requirements: null,
    imageUrl: null,
    categoryId: null,
    isFeatured: false,
    isHidden: false,
    isVerified: false,
    publishedVersionId: null,
    publishedVersion: null,
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
    tags: [],
    trendingScore: 100 - i,
    totalAttempts: 1000 - i * 10,
    recentAttempts: 50 - i,
  };
}

export function makePopularQuiz(i: number): PopularItem {
  return {
    rank: i,
    quizId: `0192f4d8-3000-7000-8000-${String(i).padStart(12, '0')}`,
    creatorId: 'creator-1',
    title: `Popular Quiz ${i}`,
    description: null,
    slug: `popular-quiz-${i}`,
    requirements: null,
    imageUrl: null,
    categoryId: null,
    isFeatured: false,
    isHidden: false,
    isVerified: false,
    publishedVersionId: null,
    publishedVersion: null,
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
    tags: [],
    popularityScore: 200 - i,
    totalAttempts: 5000 - i * 10,
    averageRating: 4.5,
    bookmarkCount: 100 - i,
  };
}

export function makeCategory(i: number): RankedCategory {
  return {
    categoryId: `0192f4d8-4000-7000-8000-${String(i).padStart(12, '0')}`,
    name: `Category ${i}`,
    slug: `category-${i}`,
    rank: i,
    description: null,
    imageUrl: null,
  };
}

// ──────────────────────────────────────────────────────────────────────
// Stub router
// ──────────────────────────────────────────────────────────────────────

export interface StubOptions {
  featuredStatus?: number;
  trendingStatus?: number;
  popularStatus?: number;
  /** Empty the featured list (renders the empty-state copy). */
  featuredEmpty?: boolean;
  /** Empty the trending list (renders the empty-state copy). */
  trendingEmpty?: boolean;
  featuredItems?: QuizItem[];
  trendingItems?: TrendingItem[];
  popularItems?: PopularItem[];
  /** Categories returned by `/api/v1/categories/popular`. */
  categories?: RankedCategory[];
}

export interface StubbedHome {
  requests: Request[];
  featuredItems: QuizItem[];
  trendingItems: TrendingItem[];
  popularItems: PopularItem[];
  categories: RankedCategory[];
}

export async function stubHomeRails(
  page: Page,
  options: StubOptions = {},
): Promise<StubbedHome> {
  const featuredItems: QuizItem[] =
    options.featuredItems ??
    (options.featuredEmpty
      ? []
      : Array.from({ length: FEATURED_LIMIT }, (_, i) => makeFeaturedQuiz(i + 1)));

  const trendingItems: TrendingItem[] =
    options.trendingItems ??
    (options.trendingEmpty
      ? []
      : Array.from({ length: TRENDING_LIMIT }, (_, i) => makeTrendingQuiz(i + 1)));

  const popularItems: PopularItem[] =
    options.popularItems ??
    Array.from({ length: POPULAR_LIMIT }, (_, i) => makePopularQuiz(i + 1));

  const categories: RankedCategory[] =
    options.categories ??
    Array.from({ length: 3 }, (_, i) => makeCategory(i + 1));

  const requests: Request[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/api/v1/')) requests.push(request);
  });

  async function respond(route: Route, status: number, body: unknown) {
    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });
  }

  function errorBody(status: number) {
    return {
      type: 'about:blank',
      title: status === 503 ? 'Service Unavailable' : 'Internal Server Error',
      status,
      extensions: { code: 'GLOBAL_INTERNAL_ERROR' },
    };
  }

  await page.route(FEATURED_PATH, async (route) => {
    const status = options.featuredStatus ?? 200;
    if (status !== 200) return respond(route, status, errorBody(status));
    return respond(route, 200, { data: featuredItems });
  });

  await page.route(TRENDING_PATH, async (route) => {
    const status = options.trendingStatus ?? 200;
    if (status !== 200) return respond(route, status, errorBody(status));
    return respond(route, 200, { data: trendingItems });
  });

  await page.route(POPULAR_PATH, async (route) => {
    const status = options.popularStatus ?? 200;
    if (status !== 200) return respond(route, status, errorBody(status));
    return respond(route, 200, { data: popularItems });
  });

  await page.route(CATEGORIES_PATH, async (route) => {
    return respond(route, 200, { data: categories });
  });

  return { requests, featuredItems, trendingItems, popularItems, categories };
}
