'use client';

export type SentryBreadcrumbType = 'api-call' | 'error' | 'user-action';

interface SentryBreadcrumb {
category: string;
message: string;
level: 'info' | 'error';
data: Record<string, unknown>;
}

interface SentryLike {
addBreadcrumb?: (crumb: SentryBreadcrumb) => void;
}

declare global {
interface Window {
Sentry?: SentryLike;
  }
}

export interface AddSentryBreadcrumbOptions {
categoryPrefix: string;
quizId?: string | null;
versionId?: string | null;
}

export function addSentryBreadcrumb(
type: SentryBreadcrumbType,
message: string,
data: Record<string, unknown> = {},
options: AddSentryBreadcrumbOptions,
): void {
if (typeof window === 'undefined') return;
const sentry = window.Sentry;
const baseData: Record<string, unknown> = { ...data };

if (options.quizId) baseData.quizId = options.quizId;
if (options.versionId) baseData.versionId = options.versionId;
sentry?.addBreadcrumb?.({
category: `${options.categoryPrefix}.${type}`,
message,
level: type === 'error' ? 'error' : 'info',
data: baseData,
  });
}