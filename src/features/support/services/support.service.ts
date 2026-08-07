/**
 * `support.service.ts` — Support / contact / FAQ service (Phase 1 migration).
 *
 * Source epic: Phase 1 — HTTP layer unification.
 * Source ticket: TKT-Phase-1.S1.
 *
 * ## Purpose
 *
 * Replaces `features/support/api/support.ts` (which imported the legacy
 * `apiClient` from `@/shared/lib/api/client`) with a service that uses the
 * canonical `customInstance` from `@/lib/api`. There is no generated SDK
 * for `support` (the backend does not expose a `SupportController` in
 * OpenAPI yet), so the service hits the wire directly via `customInstance`.
 *
 * ## Same surface as the legacy module
 *
 * The exported function names, parameter shapes, and return types are
 * intentionally identical to `features/support/api/support.ts` so
 * consumers (`ContactForm.tsx`, `KnowledgeBase.tsx`, `FAQSection.tsx`,
 * `SupportCenter.tsx`, the `(public)/support` pages) can migrate without
 * code churn.
 */
import * as Sentry from "@sentry/nextjs";

import { customInstance } from "@/lib/api";

// ─── Types (preserved from the legacy module) ──────────────────────────────

export type ContactCategory =
  | "general"
  | "account"
  | "billing"
  | "quiz-creation"
  | "tournaments"
  | "privacy"
  | "technical";

export interface ContactFormRequest {
  name: string;
  email: string;
  subject: string;
  category: ContactCategory;
  message: string;
  attachmentUrl?: string;
}

export interface ContactFormResponse {
  message: string;
  ticketId: string;
}

export interface FAQCategory {
  id: string;
  title: string;
  faqs: FAQ[];
}

export interface FAQ {
  id: string;
  question: string;
  answer: string;
}

export interface SupportArticle {
  id: string;
  title: string;
  slug: string;
  category: string;
  excerpt: string;
  content: string;
  updatedAt: string;
}

// ─── Internal helpers ─────────────────────────────────────────────────────

async function request<T>(config: Parameters<typeof customInstance.request>[0]): Promise<T> {
  const response = await customInstance.request<T>(config);
  return response.data;
}

// ─── Reads ────────────────────────────────────────────────────────────────

export async function getFAQs(): Promise<FAQCategory[]> {
  Sentry.addBreadcrumb({ category: "phase1:service", message: "support.getFAQs" });
  return request<FAQCategory[]>({ url: "/support/faqs", method: "GET" });
}

export async function getSupportArticles(): Promise<SupportArticle[]> {
  Sentry.addBreadcrumb({ category: "phase1:service", message: "support.getSupportArticles" });
  return request<SupportArticle[]>({ url: "/support/articles", method: "GET" });
}

export async function getSupportArticle(slug: string): Promise<SupportArticle> {
  Sentry.addBreadcrumb({
    category: "phase1:service",
    message: `support.getSupportArticle(${slug})`,
  });
  return request<SupportArticle>({
    url: `/support/articles/${slug}`,
    method: "GET",
  });
}

// ─── Writes ───────────────────────────────────────────────────────────────

export async function submitContactForm(payload: ContactFormRequest): Promise<ContactFormResponse> {
  Sentry.addBreadcrumb({ category: "phase1:service", message: "support.submitContactForm" });
  return request<ContactFormResponse>({
    url: "/support/contact",
    method: "POST",
    data: payload,
  });
}