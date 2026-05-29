/**
 * Tags API layer.
 *
 * @deprecated Use wrappers instead:
 * - import { listTags, getTagBySlug, ... } from '@/features/tags/wrappers/tag.wrapper'
 */

import {
  listTags,
  getTagBySlug,
  type ListTagsParams,
} from '@/features/tags/wrappers/tag.wrapper';

export { listTags, getTagBySlug };
export type { ListTagsParams };

export async function getTags(params?: ListTagsParams) {
  return listTags(params);
}
