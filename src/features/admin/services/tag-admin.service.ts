

import { getTags } from '@/lib/api';
import type {
CreateTagDto,
TagResponseDto,
UpdateTagDto,
} from '@/lib/api/generated/schemas';

export type {
TagControllerCreateTagResult,
TagControllerUpdateTagResult,
TagControllerDeleteTagResult,
TagControllerRestoreTagResult,
TagControllerGetTagByIdResult,
} from '@/lib/api/generated/tags/tags';

export type TagDto = TagResponseDto;

export async function createTag(input: CreateTagDto): Promise<TagDto> {
const sdk = getTags();
const wrapped = await sdk.tagControllerCreateTag(input);
return (wrapped.data.data as TagDto) ?? (wrapped.data as unknown as TagDto);
}

export async function updateTag(
id: string,
input: UpdateTagDto,
): Promise<TagDto> {
const sdk = getTags();
const wrapped = await sdk.tagControllerUpdateTag(id, input);
return (wrapped.data.data as TagDto) ?? (wrapped.data as unknown as TagDto);
}

export async function deleteTag(id: string): Promise<void> {
const sdk = getTags();
await sdk.tagControllerDeleteTag(id);
}

export async function restoreTag(id: string): Promise<TagDto> {
const sdk = getTags();
const wrapped = await sdk.tagControllerRestoreTag(id);
return (wrapped.data.data as TagDto) ?? (wrapped.data as unknown as TagDto);
}

export async function getTag(id: string): Promise<TagDto> {
const sdk = getTags();
const wrapped = await sdk.tagControllerGetTagById(id);
return (wrapped.data.data as TagDto) ?? (wrapped.data as unknown as TagDto);
}
