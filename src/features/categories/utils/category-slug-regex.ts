

export const CATEGORY_SLUG_REGEX: RegExp =
/^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isValidCategorySlug(value: string): boolean {
return CATEGORY_SLUG_REGEX.test(value);
}