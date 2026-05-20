import { apiClient } from '@/shared/lib/api/client'

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

export async function submitContactForm(payload: ContactFormRequest) {
  const response = await apiClient.post<ContactFormResponse>(
    '/support/contact',
    payload
  )
  return response.data
}

export async function getFAQs() {
  const response = await apiClient.get<FAQCategory[]>('/support/faqs')
  return response.data
}

export async function getSupportArticles() {
  const response = await apiClient.get<SupportArticle[]>('/support/articles')
  return response.data
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

export async function getSupportArticle(slug: string) {
  const response = await apiClient.get<SupportArticle>(
    `/support/articles/${slug}`
  )
  return response.data
}
