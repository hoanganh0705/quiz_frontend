

import type { SearchUserResultDto } from './searchUserResultDto';
import type { SearchQuizResultDto } from './searchQuizResultDto';
import type { SearchCommentResultDto } from './searchCommentResultDto';
import type { SearchCategoryResultDto } from './searchCategoryResultDto';
import type { SearchTagResultDto } from './searchTagResultDto';

export interface SearchResponseDto {

query: string;

limit: number;

nextCursor: string | null;

hasNextPage: boolean;

users: SearchUserResultDto[];

quizzes: SearchQuizResultDto[];

comments: SearchCommentResultDto[];

categories: SearchCategoryResultDto[];

tags: SearchTagResultDto[];
}
