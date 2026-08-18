

import type { MyCommentDto } from './myCommentDto';
import type { ListMyComments200AllOfMeta } from './listMyComments200AllOfMeta';

export type ListMyComments200AllOf = {
data?: MyCommentDto[];
meta?: ListMyComments200AllOfMeta;
};
