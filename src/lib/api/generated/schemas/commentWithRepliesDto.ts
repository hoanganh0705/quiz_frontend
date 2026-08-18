

import type { AuthorDto } from './authorDto';
import type { CommentDto } from './commentDto';
import type { CommentWithRepliesDtoUserVote } from './commentWithRepliesDtoUserVote';

export interface CommentWithRepliesDto {

id: string;

quizId: string;

authorId: string;

author: AuthorDto;

parentCommentId?: string | null;

body: string;

isHidden: boolean;

hiddenById: string | null;

hiddenAt: string | null;

votesCount: number;

upvotesCount: number;

downvotesCount: number;

repliesCount: number;

createdAt: string;

updatedAt: string;

deletedAt: string | null;

replies: CommentDto[];

userVote?: CommentWithRepliesDtoUserVote;
}
