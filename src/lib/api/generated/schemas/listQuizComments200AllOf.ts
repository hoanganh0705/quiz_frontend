

import type { CommentWithRepliesDto } from './commentWithRepliesDto';
import type { ListQuizComments200AllOfMeta } from './listQuizComments200AllOfMeta';

export type ListQuizComments200AllOf = {
data?: CommentWithRepliesDto[];
meta?: ListQuizComments200AllOfMeta;
};
