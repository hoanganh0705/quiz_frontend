import { cache } from "react";

import { getQuizByIdOrSlug } from "./quizzes.service";

/**
 * Per-request memoized quiz detail fetcher for Next.js Server Components.
 * Deduplicates identical `getQuizByIdOrSlug` calls across `generateMetadata`
 * and route `page.tsx` within the same RSC render pass.
 */
export const getQuizByIdOrSlugCached = cache(getQuizByIdOrSlug);
