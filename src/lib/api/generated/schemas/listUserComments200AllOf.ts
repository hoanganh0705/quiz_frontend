

import type { MyCommentDto } from './myCommentDto';
import type { ListUserComments200AllOfMeta } from './listUserComments200AllOfMeta';

export type ListUserComments200AllOf = {
data?: MyCommentDto[];
meta?: ListUserComments200AllOfMeta;
};
