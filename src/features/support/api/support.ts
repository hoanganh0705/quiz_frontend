import { customInstance } from '@/lib/api'

export type ContactCategory =
  | 'general'
  | 'account'
  | 'billing'
  | 'quiz-creation'
  | 'tournaments'
  | 'privacy'
  | 'technical'

export interface ContactFormRequest {
  name: string
  email: string
  subject: string
  category: ContactCategory
  message: string
  attachmentUrl?: string
}

export interface ContactFormResponse {
  message: string
  ticketId: string
}

export interface FAQCategory {
  id: string
  title: string
  faqs: FAQ[]
}

export interface FAQ {
  id: string
  question: string
  answer: string
}

export interface SupportArticle {
  id: string
  title: string
  slug: string
  category: string
  excerpt: string
  content: string
  updatedAt: string
}

// Phase 1: migrated from `@/shared/lib/api/client` to `@/lib/api`.
// See docs/frontend-cleanup-audit.md Phase 1.
//
// The response interceptor in `custom-instance.ts` does NOT unwrap
// the `{ data, meta }` envelope (see the long-form comment on the
// interceptor for the rationale). The wire response is therefore
// the wrapped envelope; each helper below reads `.data` at the call
// boundary to extract the inner payload.
export async function submitContactForm(payload: ContactFormRequest) {
  const response = await customInstance.request<{ data: ContactFormResponse }>({
    url: '/api/v1/support/contact',
    method: 'POST',
    data: payload,
  })
  return response.data.data
}

export async function getFAQs() {
  const response = await customInstance.request<{ data: FAQCategory[] }>({
    url: '/api/v1/support/faqs',
    method: 'GET',
  })
  return response.data.data
}

export async function getSupportArticles() {
  const response = await customInstance.request<{ data: SupportArticle[] }>({
    url: '/api/v1/support/articles',
    method: 'GET',
  })
  return response.data.data
}

export async function getSupportArticle(slug: string) {
  const response = await customInstance.request<{ data: SupportArticle }>({
    url: `/api/v1/support/articles/${slug}`,
    method: 'GET',
  })
  return response.data.data
}