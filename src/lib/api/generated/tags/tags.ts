

import type {
CreateTagDto,
TagControllerCreateTag201,
TagControllerDeleteTag200,
TagControllerGetPopularTags200,
TagControllerGetPopularTagsParams,
TagControllerGetRelatedTags200,
TagControllerGetRelatedTagsParams,
TagControllerGetTagAnalytics200,
TagControllerGetTagById200,
TagControllerGetTagBySlug200,
TagControllerGetTagQuizzes200,
TagControllerGetTagQuizzesParams,
TagControllerGetTagsBySlugs200,
TagControllerGetTagsBySlugsParams,
TagControllerGetTrendingTags200,
TagControllerGetTrendingTagsParams,
TagControllerListTags200,
TagControllerListTagsParams,
TagControllerRestoreTag200,
TagControllerUpdateTag200,
UpdateTagDto,
UserTagControllerListFollowedTags200,
UserTagControllerListFollowedTagsParams
} from '.././schemas';

import { orvalCustomInstance } from '../../core/custom-instance';

export const getTags = () => {

const tagControllerGetPopularTags = (
params?: TagControllerGetPopularTagsParams,
 ) => {
return orvalCustomInstance<TagControllerGetPopularTags200>(
{url: `/api/v1/tags/popular`, method: 'GET',
params
    },
      );
    }

const tagControllerGetTrendingTags = (
params?: TagControllerGetTrendingTagsParams,
 ) => {
return orvalCustomInstance<TagControllerGetTrendingTags200>(
{url: `/api/v1/tags/trending`, method: 'GET',
params
    },
      );
    }

const tagControllerGetTagsBySlugs = (
params?: TagControllerGetTagsBySlugsParams,
 ) => {
return orvalCustomInstance<TagControllerGetTagsBySlugs200>(
{url: `/api/v1/tags/by-slugs`, method: 'GET',
params
    },
      );
    }

const tagControllerGetTagQuizzes = (
slug: string,
params?: TagControllerGetTagQuizzesParams,
 ) => {
return orvalCustomInstance<TagControllerGetTagQuizzes200>(
{url: `/api/v1/tags/${slug}/quizzes`, method: 'GET',
params
    },
      );
    }

const tagControllerGetRelatedTags = (
slug: string,
params?: TagControllerGetRelatedTagsParams,
 ) => {
return orvalCustomInstance<TagControllerGetRelatedTags200>(
{url: `/api/v1/tags/${slug}/related`, method: 'GET',
params
    },
      );
    }

const tagControllerGetTagAnalytics = (
id: string,
 ) => {
return orvalCustomInstance<TagControllerGetTagAnalytics200>(
{url: `/api/v1/tags/${id}/analytics`, method: 'GET'
    },
      );
    }

const tagControllerGetTagById = (
id: string,
 ) => {
return orvalCustomInstance<TagControllerGetTagById200>(
{url: `/api/v1/tags/${id}`, method: 'GET'
    },
      );
    }

const tagControllerUpdateTag = (
id: string,
updateTagDto: UpdateTagDto,
 ) => {
return orvalCustomInstance<TagControllerUpdateTag200>(
{url: `/api/v1/tags/${id}`, method: 'PATCH',
headers: {'Content-Type': 'application/json', },
data: updateTagDto
    },
      );
    }

const tagControllerDeleteTag = (
id: string,
 ) => {
return orvalCustomInstance<TagControllerDeleteTag200>(
{url: `/api/v1/tags/${id}`, method: 'DELETE'
    },
      );
    }

const tagControllerFollowTag = (
id: string,
 ) => {
return orvalCustomInstance<void>(
{url: `/api/v1/tags/${id}/follow`, method: 'POST'
    },
      );
    }

const tagControllerUnfollowTag = (
id: string,
 ) => {
return orvalCustomInstance<void>(
{url: `/api/v1/tags/${id}/follow`, method: 'DELETE'
    },
      );
    }

const tagControllerRestoreTag = (
id: string,
 ) => {
return orvalCustomInstance<TagControllerRestoreTag200>(
{url: `/api/v1/tags/${id}/restore`, method: 'POST'
    },
      );
    }

const tagControllerListTags = (
params?: TagControllerListTagsParams,
 ) => {
return orvalCustomInstance<TagControllerListTags200>(
{url: `/api/v1/tags`, method: 'GET',
params
    },
      );
    }

const tagControllerCreateTag = (
createTagDto: CreateTagDto,
 ) => {
return orvalCustomInstance<TagControllerCreateTag201>(
{url: `/api/v1/tags`, method: 'POST',
headers: {'Content-Type': 'application/json', },
data: createTagDto
    },
      );
    }

const tagControllerGetTagBySlug = (
slug: string,
 ) => {
return orvalCustomInstance<TagControllerGetTagBySlug200>(
{url: `/api/v1/tags/${slug}`, method: 'GET'
    },
      );
    }

const userTagControllerListFollowedTags = (
params?: UserTagControllerListFollowedTagsParams,
 ) => {
return orvalCustomInstance<UserTagControllerListFollowedTags200>(
{url: `/api/v1/users/me/followed-tags`, method: 'GET',
params
    },
      );
    }
return {tagControllerGetPopularTags,tagControllerGetTrendingTags,tagControllerGetTagsBySlugs,tagControllerGetTagQuizzes,tagControllerGetRelatedTags,tagControllerGetTagAnalytics,tagControllerGetTagById,tagControllerUpdateTag,tagControllerDeleteTag,tagControllerFollowTag,tagControllerUnfollowTag,tagControllerRestoreTag,tagControllerListTags,tagControllerCreateTag,tagControllerGetTagBySlug,userTagControllerListFollowedTags}};
export type TagControllerGetPopularTagsResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getTags>['tagControllerGetPopularTags']>>>
export type TagControllerGetTrendingTagsResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getTags>['tagControllerGetTrendingTags']>>>
export type TagControllerGetTagsBySlugsResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getTags>['tagControllerGetTagsBySlugs']>>>
export type TagControllerGetTagQuizzesResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getTags>['tagControllerGetTagQuizzes']>>>
export type TagControllerGetRelatedTagsResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getTags>['tagControllerGetRelatedTags']>>>
export type TagControllerGetTagAnalyticsResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getTags>['tagControllerGetTagAnalytics']>>>
export type TagControllerGetTagByIdResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getTags>['tagControllerGetTagById']>>>
export type TagControllerUpdateTagResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getTags>['tagControllerUpdateTag']>>>
export type TagControllerDeleteTagResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getTags>['tagControllerDeleteTag']>>>
export type TagControllerFollowTagResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getTags>['tagControllerFollowTag']>>>
export type TagControllerUnfollowTagResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getTags>['tagControllerUnfollowTag']>>>
export type TagControllerRestoreTagResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getTags>['tagControllerRestoreTag']>>>
export type TagControllerListTagsResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getTags>['tagControllerListTags']>>>
export type TagControllerCreateTagResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getTags>['tagControllerCreateTag']>>>
export type TagControllerGetTagBySlugResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getTags>['tagControllerGetTagBySlug']>>>
export type UserTagControllerListFollowedTagsResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getTags>['userTagControllerListFollowedTags']>>>
