import { LEGAL_ROUTES } from "@/shared/config/routes";

import type { LegalDocument } from "../types/legal-document.types";

export const PRIVACY_POLICY_DOCUMENT: LegalDocument = {
  id: "privacy",
  badge: "Legal · Privacy",
  title: "Privacy Policy",
  subtitle:
    "How QuizHub collects, uses, stores, and safeguards your account information, gameplay telemetry, cookies, and authentication sessions.",
  version: "v2.0",
  effectiveDate: "2026-01-01",
  lastUpdated: "2026-11-27",
  summaryPoints: [
    "We collect only the information needed to authenticate your account, score quiz attempts, personalize discovery, and prevent abuse.",
    "Refresh tokens are stored in HttpOnly cookies; we never sell your personal information to third-party data brokers.",
    "You can manage active sessions, update profile visibility, or permanently delete your account from Settings.",
  ],
  sections: [
    {
      id: "information-collected",
      number: "01",
      title: "Information We Collect",
      paragraphs: [
        "When you create an account or play on QuizHub, we collect information directly provided by you as well as operational data generated during gameplay.",
      ],
      bullets: [
        "Account details: username, display name, email address, hashed password (never stored in plaintext), avatar, and optional bio.",
        "Gameplay & learning activity: quiz attempts, submitted answers, scores, completion times, XP, streaks, bookmarks, followed categories/tags, and tournament participation.",
        "Community contributions: authored quizzes, published versions, quiz reviews, helpful votes, comments, and moderation reports.",
        "Security & session metadata: session identifiers, user-agent/device summaries, timestamps, and rate-limit signals used to protect accounts.",
      ],
    },
    {
      id: "how-we-use-data",
      number: "02",
      title: "How We Use Your Information",
      paragraphs: [
        "We process your data strictly to deliver, secure, and improve QuizHub features:",
      ],
      bullets: [
        "Authenticate your identity, verify email ownership, and complete password recovery requests.",
        "Grade attempts, resume interrupted quizzes, compute Daily Challenge rankings, and maintain accurate quiz history.",
        "Surface relevant quizzes, categories, tags, and social discovery suggestions.",
        "Enforce rate limits, detect abuse, investigate moderation reports, and maintain platform reliability.",
      ],
    },
    {
      id: "cookies-and-storage",
      number: "03",
      title: "Cookies, Tokens & Local Browser Storage",
      paragraphs: [
        "QuizHub uses essential authentication cookies and minimal browser storage to keep your session secure and responsive across tabs.",
      ],
      bullets: [
        "Authentication cookies: short-lived access tokens and HttpOnly refresh cookies maintain authenticated sessions and protect against unauthorized script access.",
        "Cross-tab synchronization: BroadcastChannel messages coordinate logout, token refresh, attempt updates, and account deletion across open browser tabs without storing raw JWTs in localStorage.",
        "UI preferences & drafts: theme selection, quiz authoring drafts, and local search history may be stored in your browser and cleared at any time.",
      ],
      callout: {
        label: "Essential cookies only",
        body: "QuizHub does not embed third-party ad-tracking pixels or sell cookie profiles to advertising networks.",
      },
    },
    {
      id: "google-oauth",
      number: "04",
      title: "Google Sign-In (OAuth) Data",
      paragraphs: [
        "If you choose to sign in with Google Identity Services, Google provides a signed ID token containing your verified Google account identifier, email address, display name, and profile picture URL.",
        "We use these fields solely to authenticate or create your QuizHub account and never request access to your Google Drive, Gmail, Calendar, or contacts.",
      ],
    },
    {
      id: "public-visibility",
      number: "05",
      title: "Public Profiles, Leaderboards & Community Content",
      paragraphs: [
        "Certain information on QuizHub is intentionally public so players can discover creators and compete on leaderboards:",
      ],
      bullets: [
        "Your username, display name, avatar, public bio, authored quizzes, reviews, and comments may be visible to other visitors.",
        "Leaderboard rankings, Daily Challenge ranks, and earned achievements display your public handle and score metrics.",
        "Your email address, password hash, active session metadata, and private bookmarks are never displayed publicly.",
      ],
    },
    {
      id: "retention-and-deletion",
      number: "06",
      title: "Data Retention & Permanent Account Deletion",
      paragraphs: [
        "We retain your account and gameplay history for as long as your account remains active so you can review past attempts, maintain streaks, and manage authored quizzes.",
        "When you trigger account deletion in Settings, your active sessions are immediately revoked, local browser state and query caches are wiped across tabs, and personal account identifiers are scheduled for permanent removal except where minimal audit logs are required for security or legal compliance.",
      ],
    },
    {
      id: "security-controls",
      number: "07",
      title: "Security Safeguards & Session Controls",
      paragraphs: [
        "We employ industry-standard technical safeguards including HTTPS transport encryption, salted password hashing, scoped rate limiting, CSRF/open-redirect protections, and role-based access controls for administrative operations.",
        "You can inspect all active sessions and revoke unfamiliar devices immediately from your Security Settings page.",
      ],
    },
    {
      id: "your-rights-and-contact",
      number: "08",
      title: "Your Privacy Rights & Contact",
      paragraphs: [
        "Depending on your region, you may have the right to access, correct, export, or delete your personal data, or object to specific processing activities. Most profile, password, session, and deletion controls are available directly in your account Settings.",
        "For privacy inquiries, data access requests, or questions about this Privacy Policy, please reach out through our Support center.",
      ],
    },
  ],
  relatedLinks: [
    {
      label: "Terms of Service",
      description:
        "Review the rules for using QuizHub, authoring quizzes, and competing on leaderboards.",
      href: LEGAL_ROUTES.terms,
    },
    {
      label: "Support Center",
      description:
        "Contact our team with privacy questions, data requests, or security concerns.",
      href: "/support",
    },
  ],
};
