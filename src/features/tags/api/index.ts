// Re-export from wrappers (wrappers use generated SDK)
export {
  listTags,
  getTagBySlug,
  createTag,
  updateTag,
  deleteTag,
} from '@/features/tags/wrappers/tag.wrapper';

export type { ListTagsParams } from '@/features/tags/wrappers/tag.wrapper';

// Admin functions (deprecated - use wrappers instead)
export { getTagsAdmin } from './tags-admin'
