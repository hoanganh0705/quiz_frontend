/**
 * Social feature services barrel.
 *
 * Re-exports the social service wrappers from `social.service.ts`
 * (TKT-6.1.E1 / Batch E), `follow-mutation.service.ts`
 * (TKT-6.6.C1 / Batch C), `block-mutation.service.ts`
 * (TKT-6.7.C1 / Batch C), and `friend-request-mutation.service.ts`
 * (TKT-6.8.C1 / Batch C). Hooks and components import through this
 * barrel so the internal file layout can evolve without touching
 * every consumer.
 */

export {
  getRelationshipStatus,
  getUserFollowers,
  getUserFollowing,
  getFriendsOfUser,
  getBlockedUsers,
  getSocialCounts,
  getPendingRequests,
  getSentRequests,
  getUserSocialStats,
  getMySocialAnalytics,
  getFriendLeaderboard,
} from "./social.service";

export { followUser, unfollowUser, refreshSocialStats } from "./follow-mutation.service";

export {
  blockUser,
  unblockUser,
  type BlockUserInput,
} from "./block-mutation.service";

export {
  sendFriendRequest,
  respondFriendRequest,
  cancelFriendRequest,
  unfriend,
  type RespondFriendRequestAction,
} from "./friend-request-mutation.service";