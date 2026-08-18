

import type {
BlockUserDto,
RespondFriendRequestDto,
SocialControllerBlockUser201,
SocialControllerGetBlockedUsers200,
SocialControllerGetFeed200,
SocialControllerGetFeedParams,
SocialControllerGetFriendLeaderboard200,
SocialControllerGetFriendLeaderboardParams,
SocialControllerGetFriendsOfUser200,
SocialControllerGetFriendsOfUserParams,
SocialControllerGetMutualFollowers200,
SocialControllerGetMutualFollowersParams,
SocialControllerGetMutualFriends200,
SocialControllerGetMutualFriendsParams,
SocialControllerGetMySocialAnalytics200,
SocialControllerGetPendingRequests200,
SocialControllerGetRelationshipStatus200,
SocialControllerGetSearchSuggestions200,
SocialControllerGetSearchSuggestionsParams,
SocialControllerGetSentRequests200,
SocialControllerGetSocialCounts200,
SocialControllerGetSuggestions200,
SocialControllerGetSuggestionsParams,
SocialControllerGetTrendingUsers200,
SocialControllerGetTrendingUsersParams,
SocialControllerGetUserActivity200,
SocialControllerGetUserActivityParams,
SocialControllerGetUserFollowers200,
SocialControllerGetUserFollowersParams,
SocialControllerGetUserFollowing200,
SocialControllerGetUserFollowingParams,
SocialControllerGetUserSocialStats200,
SocialControllerSearchUsers200,
SocialControllerSearchUsersParams,
SocialControllerSendFriendRequest201
} from '.././schemas';

import { orvalCustomInstance } from '../../core/custom-instance';

export const getSocial = () => {

const socialControllerGetSearchSuggestions = (
params: SocialControllerGetSearchSuggestionsParams,
 ) => {
return orvalCustomInstance<SocialControllerGetSearchSuggestions200>(
{url: `/api/v1/social/search/suggestions`, method: 'GET',
params
    },
      );
    }

const socialControllerSearchUsers = (
params: SocialControllerSearchUsersParams,
 ) => {
return orvalCustomInstance<SocialControllerSearchUsers200>(
{url: `/api/v1/social/users/search`, method: 'GET',
params
    },
      );
    }

const socialControllerGetSuggestions = (
params?: SocialControllerGetSuggestionsParams,
 ) => {
return orvalCustomInstance<SocialControllerGetSuggestions200>(
{url: `/api/v1/social/suggestions`, method: 'GET',
params
    },
      );
    }

const socialControllerGetFeed = (
params?: SocialControllerGetFeedParams,
 ) => {
return orvalCustomInstance<SocialControllerGetFeed200>(
{url: `/api/v1/social/feed`, method: 'GET',
params
    },
      );
    }

const socialControllerGetMySocialAnalytics = (

 ) => {
return orvalCustomInstance<SocialControllerGetMySocialAnalytics200>(
{url: `/api/v1/social/me/analytics`, method: 'GET'
    },
      );
    }

const socialControllerGetTrendingUsers = (
params?: SocialControllerGetTrendingUsersParams,
 ) => {
return orvalCustomInstance<SocialControllerGetTrendingUsers200>(
{url: `/api/v1/social/users/trending`, method: 'GET',
params
    },
      );
    }

const socialControllerGetUserActivity = (
userId: string,
params?: SocialControllerGetUserActivityParams,
 ) => {
return orvalCustomInstance<SocialControllerGetUserActivity200>(
{url: `/api/v1/social/users/${userId}/activity`, method: 'GET',
params
    },
      );
    }

const socialControllerGetUserSocialStats = (
userId: string,
 ) => {
return orvalCustomInstance<SocialControllerGetUserSocialStats200>(
{url: `/api/v1/social/users/${userId}/stats`, method: 'GET'
    },
      );
    }

const socialControllerGetFriendLeaderboard = (
params: SocialControllerGetFriendLeaderboardParams,
 ) => {
return orvalCustomInstance<SocialControllerGetFriendLeaderboard200>(
{url: `/api/v1/social/friends/leaderboard`, method: 'GET',
params
    },
      );
    }

const socialControllerSendFriendRequest = (
userId: string,
 ) => {
return orvalCustomInstance<void | SocialControllerSendFriendRequest201>(
{url: `/api/v1/social/friend-requests/${userId}`, method: 'POST'
    },
      );
    }

const socialControllerDeprecatedFriendRequestPathGet = (

 ) => {
return orvalCustomInstance<void>(
{url: `/api/v1/social/friend-request`, method: 'GET'
    },
      );
    }

const socialControllerDeprecatedFriendRequestPathPost = (

 ) => {
return orvalCustomInstance<void>(
{url: `/api/v1/social/friend-request`, method: 'POST'
    },
      );
    }

const socialControllerDeprecatedFriendRequestPathPut = (

 ) => {
return orvalCustomInstance<void>(
{url: `/api/v1/social/friend-request`, method: 'PUT'
    },
      );
    }

const socialControllerDeprecatedFriendRequestPathDelete = (

 ) => {
return orvalCustomInstance<void>(
{url: `/api/v1/social/friend-request`, method: 'DELETE'
    },
      );
    }

const socialControllerDeprecatedFriendRequestPathPatch = (

 ) => {
return orvalCustomInstance<void>(
{url: `/api/v1/social/friend-request`, method: 'PATCH'
    },
      );
    }

const socialControllerDeprecatedFriendRequestPathHead = (

 ) => {
return orvalCustomInstance<void>(
{url: `/api/v1/social/friend-request`, method: 'HEAD'
    },
      );
    }

const socialControllerGetPendingRequests = (

 ) => {
return orvalCustomInstance<SocialControllerGetPendingRequests200>(
{url: `/api/v1/social/friend-requests/incoming`, method: 'GET'
    },
      );
    }

const socialControllerGetSentRequests = (

 ) => {
return orvalCustomInstance<SocialControllerGetSentRequests200>(
{url: `/api/v1/social/friend-requests/outgoing`, method: 'GET'
    },
      );
    }

const socialControllerRespondToFriendRequest = (
friendshipId: string,
respondFriendRequestDto: RespondFriendRequestDto,
 ) => {
return orvalCustomInstance<void>(
{url: `/api/v1/social/friend-requests/${friendshipId}/respond`, method: 'POST',
headers: {'Content-Type': 'application/json', },
data: respondFriendRequestDto
    },
      );
    }

const socialControllerCancelFriendRequest = (
friendshipId: string,
 ) => {
return orvalCustomInstance<void>(
{url: `/api/v1/social/friend-requests/${friendshipId}`, method: 'DELETE'
    },
      );
    }

const socialControllerGetFriendsOfUser = (
userId: string,
params: SocialControllerGetFriendsOfUserParams,
 ) => {
return orvalCustomInstance<SocialControllerGetFriendsOfUser200>(
{url: `/api/v1/social/friends/${userId}`, method: 'GET',
params
    },
      );
    }

const socialControllerRemoveFriend = (
userId: string,
 ) => {
return orvalCustomInstance<void>(
{url: `/api/v1/social/friends/${userId}`, method: 'DELETE'
    },
      );
    }

const socialControllerBlockUser = (
userId: string,
blockUserDto: BlockUserDto,
 ) => {
return orvalCustomInstance<SocialControllerBlockUser201 | void>(
{url: `/api/v1/social/block/${userId}`, method: 'POST',
headers: {'Content-Type': 'application/json', },
data: blockUserDto
    },
      );
    }

const socialControllerUnblockUser = (
userId: string,
 ) => {
return orvalCustomInstance<void>(
{url: `/api/v1/social/block/${userId}`, method: 'DELETE'
    },
      );
    }

const socialControllerGetBlockedUsers = (

 ) => {
return orvalCustomInstance<SocialControllerGetBlockedUsers200>(
{url: `/api/v1/social/blocked`, method: 'GET'
    },
      );
    }

const socialControllerFollowUser = (
userId: string,
 ) => {
return orvalCustomInstance<void>(
{url: `/api/v1/social/follow/${userId}`, method: 'POST'
    },
      );
    }

const socialControllerUnfollowUser = (
userId: string,
 ) => {
return orvalCustomInstance<void>(
{url: `/api/v1/social/follow/${userId}`, method: 'DELETE'
    },
      );
    }

const socialControllerGetUserFollowers = (
userId: string,
params?: SocialControllerGetUserFollowersParams,
 ) => {
return orvalCustomInstance<SocialControllerGetUserFollowers200>(
{url: `/api/v1/social/users/${userId}/followers`, method: 'GET',
params
    },
      );
    }

const socialControllerGetMutualFriends = (
userId: string,
params?: SocialControllerGetMutualFriendsParams,
 ) => {
return orvalCustomInstance<SocialControllerGetMutualFriends200>(
{url: `/api/v1/social/users/${userId}/mutual-friends`, method: 'GET',
params
    },
      );
    }

const socialControllerGetMutualFollowers = (
userId: string,
params?: SocialControllerGetMutualFollowersParams,
 ) => {
return orvalCustomInstance<SocialControllerGetMutualFollowers200>(
{url: `/api/v1/social/users/${userId}/mutual-followers`, method: 'GET',
params
    },
      );
    }

const socialControllerGetUserFollowing = (
userId: string,
params?: SocialControllerGetUserFollowingParams,
 ) => {
return orvalCustomInstance<SocialControllerGetUserFollowing200>(
{url: `/api/v1/social/users/${userId}/following`, method: 'GET',
params
    },
      );
    }

const socialControllerGetRelationshipStatus = (
userId: string,
 ) => {
return orvalCustomInstance<SocialControllerGetRelationshipStatus200>(
{url: `/api/v1/social/relationship/${userId}`, method: 'GET'
    },
      );
    }

const socialControllerGetSocialCounts = (

 ) => {
return orvalCustomInstance<SocialControllerGetSocialCounts200>(
{url: `/api/v1/social/counts`, method: 'GET'
    },
      );
    }
return {socialControllerGetSearchSuggestions,socialControllerSearchUsers,socialControllerGetSuggestions,socialControllerGetFeed,socialControllerGetMySocialAnalytics,socialControllerGetTrendingUsers,socialControllerGetUserActivity,socialControllerGetUserSocialStats,socialControllerGetFriendLeaderboard,socialControllerSendFriendRequest,socialControllerDeprecatedFriendRequestPathGet,socialControllerDeprecatedFriendRequestPathPost,socialControllerDeprecatedFriendRequestPathPut,socialControllerDeprecatedFriendRequestPathDelete,socialControllerDeprecatedFriendRequestPathPatch,socialControllerDeprecatedFriendRequestPathHead,socialControllerGetPendingRequests,socialControllerGetSentRequests,socialControllerRespondToFriendRequest,socialControllerCancelFriendRequest,socialControllerGetFriendsOfUser,socialControllerRemoveFriend,socialControllerBlockUser,socialControllerUnblockUser,socialControllerGetBlockedUsers,socialControllerFollowUser,socialControllerUnfollowUser,socialControllerGetUserFollowers,socialControllerGetMutualFriends,socialControllerGetMutualFollowers,socialControllerGetUserFollowing,socialControllerGetRelationshipStatus,socialControllerGetSocialCounts}};
export type SocialControllerGetSearchSuggestionsResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getSocial>['socialControllerGetSearchSuggestions']>>>
export type SocialControllerSearchUsersResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getSocial>['socialControllerSearchUsers']>>>
export type SocialControllerGetSuggestionsResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getSocial>['socialControllerGetSuggestions']>>>
export type SocialControllerGetFeedResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getSocial>['socialControllerGetFeed']>>>
export type SocialControllerGetMySocialAnalyticsResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getSocial>['socialControllerGetMySocialAnalytics']>>>
export type SocialControllerGetTrendingUsersResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getSocial>['socialControllerGetTrendingUsers']>>>
export type SocialControllerGetUserActivityResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getSocial>['socialControllerGetUserActivity']>>>
export type SocialControllerGetUserSocialStatsResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getSocial>['socialControllerGetUserSocialStats']>>>
export type SocialControllerGetFriendLeaderboardResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getSocial>['socialControllerGetFriendLeaderboard']>>>
export type SocialControllerSendFriendRequestResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getSocial>['socialControllerSendFriendRequest']>>>
export type SocialControllerDeprecatedFriendRequestPathGetResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getSocial>['socialControllerDeprecatedFriendRequestPathGet']>>>
export type SocialControllerDeprecatedFriendRequestPathPostResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getSocial>['socialControllerDeprecatedFriendRequestPathPost']>>>
export type SocialControllerDeprecatedFriendRequestPathPutResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getSocial>['socialControllerDeprecatedFriendRequestPathPut']>>>
export type SocialControllerDeprecatedFriendRequestPathDeleteResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getSocial>['socialControllerDeprecatedFriendRequestPathDelete']>>>
export type SocialControllerDeprecatedFriendRequestPathPatchResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getSocial>['socialControllerDeprecatedFriendRequestPathPatch']>>>
export type SocialControllerDeprecatedFriendRequestPathHeadResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getSocial>['socialControllerDeprecatedFriendRequestPathHead']>>>
export type SocialControllerGetPendingRequestsResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getSocial>['socialControllerGetPendingRequests']>>>
export type SocialControllerGetSentRequestsResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getSocial>['socialControllerGetSentRequests']>>>
export type SocialControllerRespondToFriendRequestResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getSocial>['socialControllerRespondToFriendRequest']>>>
export type SocialControllerCancelFriendRequestResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getSocial>['socialControllerCancelFriendRequest']>>>
export type SocialControllerGetFriendsOfUserResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getSocial>['socialControllerGetFriendsOfUser']>>>
export type SocialControllerRemoveFriendResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getSocial>['socialControllerRemoveFriend']>>>
export type SocialControllerBlockUserResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getSocial>['socialControllerBlockUser']>>>
export type SocialControllerUnblockUserResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getSocial>['socialControllerUnblockUser']>>>
export type SocialControllerGetBlockedUsersResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getSocial>['socialControllerGetBlockedUsers']>>>
export type SocialControllerFollowUserResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getSocial>['socialControllerFollowUser']>>>
export type SocialControllerUnfollowUserResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getSocial>['socialControllerUnfollowUser']>>>
export type SocialControllerGetUserFollowersResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getSocial>['socialControllerGetUserFollowers']>>>
export type SocialControllerGetMutualFriendsResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getSocial>['socialControllerGetMutualFriends']>>>
export type SocialControllerGetMutualFollowersResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getSocial>['socialControllerGetMutualFollowers']>>>
export type SocialControllerGetUserFollowingResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getSocial>['socialControllerGetUserFollowing']>>>
export type SocialControllerGetRelationshipStatusResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getSocial>['socialControllerGetRelationshipStatus']>>>
export type SocialControllerGetSocialCountsResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getSocial>['socialControllerGetSocialCounts']>>>
