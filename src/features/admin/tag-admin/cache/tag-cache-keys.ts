

import { mutate as globalMutate, type ScopedMutator } from 'swr';

export const TAG_ADMIN_LIST_KEY = 'tag-admin:list' as const;

export const PUBLIC_TAGS_DIRECTORY_KEY = 'tags:directory' as const;

export const PUBLIC_TAGS_PREFIX = 'tags:' as const;

export function tagSlugKey(slug: string): string {
return `tags:slug:${slug}`;
}

export function invalidateTagAdminList(
mutate: ScopedMutator = globalMutate,
): Promise<unknown> {
return mutate(TAG_ADMIN_LIST_KEY) as Promise<unknown>;
}

export function publicTagsKeyMatcher(key: unknown): boolean {
if (typeof key === 'string') {
return key.startsWith(PUBLIC_TAGS_PREFIX);
  }
if (Array.isArray(key)) {
const head = key[0];
if (typeof head === 'string' && (head === 'tags' || head === 'tag')) {
return true;
    }
return key.some(
(segment) =>
typeof segment === 'string' && segment.startsWith(PUBLIC_TAGS_PREFIX),
    );
  }
return false;
}

export function invalidatePublicTagCaches(
mutate: ScopedMutator = globalMutate,
): Promise<unknown[]> {
return (mutate(publicTagsKeyMatcher) as unknown) as Promise<unknown[]>;
}
