/**
 * `howItWorksData` — three-step explainer for the marketing home page.
 *
 * Phase 4.4 (F-8): the per-step `imageSrc` and `altText` fields were
 * removed because the referenced `/step1.jpg`, `/step2.jpg`, `/step3.jpg`
 * assets never existed and `next/image` rendered broken placeholders.
 * The data now contains only the title + description, and the consumer
 * (`HowItWorks.tsx`) renders a clean text panel.
 */
export const howItWorksData = [
  {
    id: 'browse-categories',
    title: 'Browse Categories',
    description:
      'Explore our diverse range of quiz categories to find topics that interest you.',
  },
  {
    id: 'take-quizzes',
    title: 'Take Quizzes',
    description:
      'Challenge yourself with many quizzes of varying difficulty levels and formats.',
  },
  {
    id: 'earn-rewards',
    title: 'Earn Rewards',
    description:
      'Collect points, badges, and climb the leaderboards as you complete quizzes.',
  },
]
