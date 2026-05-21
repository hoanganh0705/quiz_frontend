// Tags types — aligned with backend TagResponseDto
export interface Tag {
  tagId: string
  name: string
  slug: string
  createdAt: string
  updatedAt: string
}

export interface TagListResponse {
  items: Tag[]
  pagination: {
    limit: number
    nextCursor: string | null
    hasNextPage: boolean
  }
}

export interface DeleteTagResponse {
  message: string
}
