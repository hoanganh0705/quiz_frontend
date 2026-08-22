import * as Sentry from '@sentry/nextjs'
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
  excerpt?: string
  content?: string
  updatedAt?: string
  icon?: string
  readTime?: string
}

async function requestEnveloped<T>(config: Parameters<typeof customInstance.request>[0]): Promise<{ data: T }> {
  const response = await customInstance.request<{ data: T }>(config)
  return response.data
}

export async function submitContactForm(payload: ContactFormRequest): Promise<ContactFormResponse> {
  Sentry.addBreadcrumb({ category: 'phase1:service', message: 'support.submitContactForm' })
  const wire = await requestEnveloped<ContactFormResponse>({
    url: '/api/v1/support/contact',
    method: 'POST',
    data: payload
  })
  return wire.data
}

export async function getFAQs(): Promise<FAQCategory[]> {
  Sentry.addBreadcrumb({ category: 'phase1:service', message: 'support.getFAQs' })
  const wire = await requestEnveloped<FAQCategory[]>({
    url: '/api/v1/support/faqs',
    method: 'GET'
  })
  return wire.data
}

export async function getSupportArticles(): Promise<SupportArticle[]> {
  Sentry.addBreadcrumb({ category: 'phase1:service', message: 'support.getSupportArticles' })
  const wire = await requestEnveloped<SupportArticle[]>({
    url: '/api/v1/support/articles',
    method: 'GET'
  })
  return wire.data
}

export async function getSupportArticle(slug: string): Promise<SupportArticle> {
  Sentry.addBreadcrumb({
    category: 'phase1:service',
    message: `support.getSupportArticle(${slug})`
  })
  const wire = await requestEnveloped<SupportArticle>({
    url: `/api/v1/support/articles/${slug}`,
    method: 'GET'
  })
  return wire.data
}