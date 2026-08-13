/**
 * `exportQuizHistory` — stream a CSV/JSON file from the backend export endpoint.
 *
 * Phase 5 (S-30): replaces the legacy `entriesToCSV` client-side
 * workaround. We call `GET /users/me/quiz-history/export` directly
 * with a Bearer token, then trigger a browser download from the
 * streamed blob. Backend honours the same `format`, `status`,
 * `fromDate`, and `toDate` filters as the history list.
 */
'use client';

import { getAuthToken } from '@/features/auth/utils/auth-cookies';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export interface ExportQuizHistoryOptions {
  format?: 'csv' | 'json';
  status?: 'started' | 'completed' | 'abandoned';
  fromDate?: string;
  toDate?: string;
  filename?: string;
}

export async function exportQuizHistory(
  options: ExportQuizHistoryOptions = {},
): Promise<void> {
  const format = options.format ?? 'csv';
  const params = new URLSearchParams();
  params.set('format', format);
  if (options.status) params.set('status', options.status);
  if (options.fromDate) params.set('fromDate', options.fromDate);
  if (options.toDate) params.set('toDate', options.toDate);

  const url = `${API_BASE_URL}/api/v1/users/me/quiz-history/export?${params.toString()}`;

  const token = getAuthToken();
  const response = await fetch(url, {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Export failed: ${response.status} ${response.statusText}`);
  }

  const blob = await response.blob();
  const contentDisposition = response.headers.get('Content-Disposition') ?? '';
  const serverFilename = contentDisposition.match(/filename="([^"]+)"/i)?.[1];
  const fallbackName = `quiz-history-${new Date().toISOString().split('T')[0]}.${format}`;
  const filename = options.filename ?? serverFilename ?? fallbackName;

  const downloadUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(downloadUrl);
}
