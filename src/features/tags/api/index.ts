export { getTags, getTagBySlug } from './tags'
export { getTagsServer, getTagBySlugServer } from './tags-server'

// Admin functions (deprecated - use wrappers instead)
export {
  getTags as getTagsAdmin,
  createTag,
  updateTag,
  deleteTag,
} from './tags-admin'
export type { ListTagsParams } from './tags-admin'
