import { getQueryClient } from "@/providers/QueryProvider";

export const TAG_ADMIN_LIST_KEY = "tag-admin:list" as const;

export const PUBLIC_TAGS_DIRECTORY_KEY = "tags:directory" as const;

export const PUBLIC_TAGS_PREFIX = "tags:" as const;

export function tagSlugKey(slug: string): string {
  return `tags:slug:${slug}`;
}

export async function invalidateTagAdminList(
  mutate?: (key: unknown) => unknown,
): Promise<unknown> {
  const qc = getQueryClient();
  await qc.invalidateQueries({ queryKey: [TAG_ADMIN_LIST_KEY] });
  if (mutate) {
    return mutate(TAG_ADMIN_LIST_KEY);
  }
}

export function publicTagsKeyMatcher(key: unknown): boolean {
  if (typeof key === "string") {
    return key.startsWith(PUBLIC_TAGS_PREFIX);
  }
  if (Array.isArray(key)) {
    const head = key[0];
    if (typeof head === "string" && (head === "tags" || head === "tag")) {
      return true;
    }
    return key.some(
      (segment) =>
        typeof segment === "string" && segment.startsWith(PUBLIC_TAGS_PREFIX),
    );
  }
  return false;
}

export async function invalidatePublicTagCaches(
  mutate?: (matcher: (key: unknown) => boolean) => unknown,
): Promise<unknown> {
  const qc = getQueryClient();
  await qc.invalidateQueries({
    predicate: (query) => publicTagsKeyMatcher(query.queryKey),
  });
  if (mutate) {
    return mutate(publicTagsKeyMatcher);
  }
}
