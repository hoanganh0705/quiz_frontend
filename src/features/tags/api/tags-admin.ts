/**
 * Tags Admin API layer.
 *
 * @deprecated Use wrappers instead:
 * - import { listTags, createTag, ... } from '@/features/tags/wrappers/tag.wrapper'
 */

import {
  listTags,
  getTagBySlug,
  createTag,
  updateTag,
  deleteTag,
  type ListTagsParams,
} from '@/features/tags/wrappers/tag.wrapper';

export {
  listTags,
  getTagBySlug,
  createTag,
  updateTag,
  deleteTag,
};
export type { ListTagsParams };

// Backward-compatible aliases
export async function getTags(params?: ListTagsParams) {
  return listTags(params);
}
