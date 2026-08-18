

export {

CATEGORY_SLUG_REGEX,

isValidCategorySlug,
} from '@/features/categories/utils/category-slug-regex';

export function deriveCategorySlug(name: string): string {
return (
name
      // Step 1-2: Decompose and strip diacritical marks.
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      // Step 3: Lowercase.
      .toLowerCase()
      // Step 4: Replace whitespace / underscore with `-`.
      .replace(/[\s_]+/g, '-')
      // Step 5: Strip anything that is not a letter, digit, or hyphen.
      .replace(/[^a-z0-9-]/g, '')
      // Step 6: Collapse consecutive hyphens.
      .replace(/-{2,}/g, '-')
      // Step 7: Trim leading / trailing hyphens.
      .replace(/^-+|-+$/g, '')
  );
}