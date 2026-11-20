import { getQueryClient } from "@/providers/QueryProvider";

export const CATEGORY_ADMIN_LIST_KEY = "category-admin:list" as const;

export const PUBLIC_CATEGORIES_DIRECTORY_KEY = "categories:directory" as const;

export const PUBLIC_CATEGORIES_PREFIX = "categories:" as const;

export function categorySlugKey(slug: string): string {
  return `categories:slug:${slug}`;
}

export async function invalidateCategoryAdminList(
  mutate?: (key: unknown) => unknown,
): Promise<void> {
  const qc = getQueryClient();
  await qc.invalidateQueries({ queryKey: [CATEGORY_ADMIN_LIST_KEY] });
  if (mutate) {
    await mutate(CATEGORY_ADMIN_LIST_KEY);
  }
}

export function publicCategoriesKeyMatcher(key: unknown): boolean {
  if (typeof key === "string") {
    return key.startsWith(PUBLIC_CATEGORIES_PREFIX);
  }
  if (Array.isArray(key)) {
    const head = key[0];
    if (
      typeof head === "string" &&
      (head === "categories" || head === "category")
    ) {
      return true;
    }
    return key.some(
      (segment) =>
        typeof segment === "string" &&
        segment.startsWith(PUBLIC_CATEGORIES_PREFIX),
    );
  }
  return false;
}

export async function invalidatePublicCategoryCaches(
  mutate?: (matcher: (key: unknown) => boolean) => unknown,
): Promise<void> {
  const qc = getQueryClient();
  await qc.invalidateQueries({
    predicate: (query) => publicCategoriesKeyMatcher(query.queryKey),
  });
  if (mutate) {
    await mutate(publicCategoriesKeyMatcher);
  }
}
