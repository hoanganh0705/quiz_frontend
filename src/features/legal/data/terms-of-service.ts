import { LEGAL_ROUTES } from "@/shared/config/routes";

import type { LegalDocument } from "../types/legal-document.types";

export const TERMS_OF_SERVICE_DOCUMENT: LegalDocument = {
  id: "terms",
  badge: "Legal · Terms",
  title: "Terms of Service",
  subtitle:
    "The rules governing your QuizHub account, community-authored quizzes, competitive leaderboards, and fair play across the platform.",
  version: "v2.0",
  effectiveDate: "2026-01-01",
  lastUpdated: "2026-11-27",
  summaryPoints: [
    "You retain ownership of original quizzes, comments, and reviews you author while granting QuizHub a license to host and display them.",
    "Automated score farming, multi-account manipulation, and harassment violate our fair-play and community standards.",
    "You may revoke active sessions or permanently delete your account at any time from Security Settings.",
  ],
  sections: [
    {
      id: "acceptance",
      number: "01",
      title: "Acceptance of Terms & Eligibility",
      paragraphs: [
        "By accessing or using QuizHub, creating an account, playing quizzes, or publishing content, you agree to be bound by these Terms of Service and our Privacy Policy.",
        "You must be at least 13 years old (or the minimum digital consent age in your jurisdiction) to register an account. If you use QuizHub on behalf of a school, team, or organization, you represent that you have authority to bind that organization to these Terms.",
      ],
    },
    {
      id: "accounts-and-security",
      number: "02",
      title: "Accounts, Authentication & Security",
      paragraphs: [
        "You are responsible for maintaining the confidentiality of your credentials and for all activity conducted under your account. When registering with email and password, you must provide a valid email address and maintain a password meeting our security policy (8–128 characters with mixed complexity).",
        "You may also sign in using Google Identity Services where enabled. You can review active browser sessions, revoke individual devices, or sign out of all other sessions at any time from your Security Settings.",
      ],
      bullets: [
        "Do not share account credentials or impersonate another player, creator, or moderator.",
        "Notify us promptly via Support if you suspect unauthorized access to your account.",
        "We may temporarily lock or invalidate sessions if we detect automated credential stuffing or suspicious activity.",
      ],
    },
    {
      id: "user-generated-content",
      number: "03",
      title: "User-Generated Quizzes, Comments & Reviews",
      paragraphs: [
        "QuizHub allows registered users to author quizzes, publish versioned question sets, post reviews on completed quizzes, and participate in quiz comment threads. You retain ownership of the original content you create.",
        "By publishing content on QuizHub, you grant us a worldwide, non-exclusive, royalty-free license to host, store, index, display, and distribute that content as necessary to operate and improve the platform.",
      ],
      bullets: [
        "Only publish quizzes, images, and explanations you have the right to share without infringing copyright or third-party intellectual property.",
        "Do not post spam, hate speech, personal data of others, malicious links, or deliberately misleading quiz metadata.",
        "Published quiz versions are snapshotted so in-progress and historical attempts remain accurate for players.",
      ],
    },
    {
      id: "fair-play",
      number: "04",
      title: "Fair Play, Daily Challenges & Leaderboards",
      paragraphs: [
        "QuizHub tracks scores, completion times, XP, streaks, achievements, and rankings across public quizzes, Daily Challenges, and tournaments. Competitive integrity depends on every participant playing honestly.",
      ],
      bullets: [
        "No scripted solvers, browser automation, API tampering, or artificial score inflation.",
        "No coordinated boosting, alt-account farming, or exploiting timing/rate-limit mechanics.",
        "Scores or leaderboard entries obtained through unfair means may be invalidated without notice.",
      ],
      callout: {
        label: "Fair-play enforcement",
        body: "Repeated or severe attempts to manipulate Daily Challenge rankings, XP, or tournament outcomes may result in leaderboard exclusion or permanent account suspension.",
      },
    },
    {
      id: "virtual-rewards",
      number: "05",
      title: "XP, Streaks, Coins & Achievements",
      paragraphs: [
        "Experience points (XP), streaks, badges, and virtual coins earned through gameplay have no cash value, cannot be redeemed for fiat currency, and are non-transferable outside QuizHub.",
        "We reserve the right to rebalance scoring formulas, XP rewards, and achievement criteria to maintain fair progression across the platform.",
      ],
    },
    {
      id: "moderation",
      number: "06",
      title: "Reporting, Moderation & Enforcement",
      paragraphs: [
        "Community members may report comments, reviews, or quizzes that violate these Terms. Moderators review reports and may hide content, restore content after appeal, issue warnings, or restrict accounts.",
        "We reserve the right to remove any content or suspend access that threatens platform stability, user safety, or legal compliance.",
      ],
    },
    {
      id: "termination",
      number: "07",
      title: "Account Deletion & Termination",
      paragraphs: [
        "You may permanently delete your account at any time through Settings. Account deletion immediately invalidates your active tokens, clears local client caches across open tabs, and removes your personal account profile according to our Privacy Policy.",
        "Sections regarding intellectual property licenses for remaining aggregated records, disclaimers, and limitation of liability survive account termination.",
      ],
    },
    {
      id: "disclaimers-and-contact",
      number: "08",
      title: "Disclaimers, Changes & Contact",
      paragraphs: [
        "QuizHub is provided on an \"as is\" and \"as available\" basis without warranties of uninterrupted availability or error-free scoring. To the maximum extent permitted by law, QuizHub is not liable for indirect or consequential damages arising from your use of the service.",
        "We may update these Terms from time to time. Material updates will be reflected by the revision date above. Questions, appeals, or legal notices can be submitted through our Support center.",
      ],
    },
  ],
  relatedLinks: [
    {
      label: "Privacy Policy",
      description:
        "See how we collect, use, protect, and delete your account and gameplay data.",
      href: LEGAL_ROUTES.privacy,
    },
    {
      label: "Support Center",
      description:
        "Report an issue, appeal a moderation action, or ask a question about these Terms.",
      href: "/support",
    },
  ],
};
