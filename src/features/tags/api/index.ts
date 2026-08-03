// Re-export from wrappers (wrappers use generated SDK)
export {
  listTags,
  getTagBySlug,
  createTag,
  updateTag,
  deleteTag,
} from '@/features/tags/services/tags.service';

export type { ListTagsParams } from '@/features/tags/services/tags.service';

// Admin functions (deprecated - use wrappers instead)
export { getTagsAdmin } from './tags-admin'
