'use client'

import { useCallback, useMemo, useEffect, useState } from 'react'
import { useLocalStorage } from '@/shared/hooks/use-local-storage'
import {
listCollections,
createCollection as apiCreateCollection,
updateCollection as apiUpdateCollection,
deleteCollection as apiDeleteCollection,
addBookmark as apiAddBookmark,
removeBookmark as apiRemoveBookmark,
} from '@/features/bookmarks/api'
import type {
BookmarkCollectionResponseDto,
BookmarkedQuizResponseDto,
} from '@/lib/api/generated/schemas'

interface BookmarksState {
collections: BookmarkCollectionResponseDto[]
bookmarks: BookmarkedQuizResponseDto[]
}

const INITIAL_STATE: BookmarksState = {
collections: [],
bookmarks: []
}

export function useBookmarks() {
const [state, setState] = useLocalStorage<BookmarksState>(
'quiz_bookmarks',
INITIAL_STATE
  )
const [loading, setLoading] = useState(false)

useEffect(() => {
const syncWithServer = async () => {
try {
setLoading(true)
const collectionsData = await listCollections()
setState({
collections: collectionsData.data?.items ?? [],
bookmarks: [] // Bookmarks are fetched per collection
        })
      } catch {
        // Use local state if server is unavailable
      } finally {
setLoading(false)
      }
    }

syncWithServer()
  }, [setState])

const isBookmarked = useCallback(
(quizId: string) => {
return state.bookmarks.some((b) => b.quizId === quizId)
    },
[state.bookmarks]
  )

const getBookmark = useCallback(
(quizId: string) => {
return state.bookmarks.find((b) => b.quizId === quizId)
    },
[state.bookmarks]
  )

const addBookmark = useCallback(
async (quizId: string, collectionId: string | null = null) => {
const tempId = `temp-${Date.now()}`
const tempBookmark: BookmarkedQuizResponseDto = {
bookmarkId: tempId,
quizId,
collectionId,
bookmarkedAt: new Date().toISOString(),
      } as unknown as BookmarkedQuizResponseDto

setState((prev) => ({
...prev,
bookmarks: [...prev.bookmarks, tempBookmark]
      }))

try {
const serverBookmark = (collectionId
? await apiAddBookmark(collectionId, { quizId })
: await apiAddBookmark('default', { quizId })) as unknown as BookmarkedQuizResponseDto;

setState((prev) => ({
...prev,
bookmarks: prev.bookmarks.map((b) =>
b.bookmarkId === tempId ? serverBookmark : b
          )
        }))
      } catch {

setState((prev) => ({
...prev,
bookmarks: prev.bookmarks.filter((b) => b.bookmarkId !== tempId)
        }))
      }
    },
[setState]
  )

const removeBookmark = useCallback(
async (quizId: string) => {
const bookmark = state.bookmarks.find((b) => b.quizId === quizId)
const collectionId = (bookmark as unknown as { collectionId?: string }).collectionId ?? 'default'

setState((prev) => ({
...prev,
bookmarks: prev.bookmarks.filter((b) => b.quizId !== quizId)
      }))

try {
await apiRemoveBookmark(collectionId, quizId)
      } catch {

setState((prev) => ({
...prev,
bookmarks: [...prev.bookmarks, bookmark!]
        }))
      }
    },
[state.bookmarks, setState]
  )

const toggleBookmark = useCallback(
async (quizId: string, collectionId: string | null = null) => {
if (isBookmarked(quizId)) {
await removeBookmark(quizId)
      } else {
await addBookmark(quizId, collectionId)
      }
    },
[isBookmarked, addBookmark, removeBookmark]
  )

const addCollection = useCallback(
async (
name: string,
description?: string,
color: string = '#6b7280'
    ) => {
const tempId = `temp-${Date.now()}`
const tempCollection: BookmarkCollectionResponseDto = {
collectionId: tempId,
name,
description,
createdAt: new Date().toISOString(),
quizCount: 0,
      } as unknown as BookmarkCollectionResponseDto

setState((prev) => ({
...prev,
collections: [...prev.collections, tempCollection]
      }))

try {
const serverCollection = (await apiCreateCollection({
name,
description,
        })) as unknown as BookmarkCollectionResponseDto

setState((prev) => ({
...prev,
collections: prev.collections.map((c) =>
c.collectionId === tempId ? serverCollection : c
          )
        }))

return serverCollection.collectionId
      } catch {

setState((prev) => ({
...prev,
collections: prev.collections.filter((c) => c.collectionId !== tempId)
        }))
return null
      }
    },
[setState]
  )

const updateCollection = useCallback(
async (
collectionId: string,
updates: { name?: string; description?: string; color?: string }
    ) => {
const previousCollections = state.collections

setState((prev) => ({
...prev,
collections: prev.collections.map((c) =>
c.collectionId === collectionId ? { ...c, ...updates } : c
        )
      }))

try {
await apiUpdateCollection(collectionId, updates)
      } catch {

setState({ ...state, collections: previousCollections })
      }
    },
[state, setState]
  )

const deleteCollection = useCallback(
async (collectionId: string) => {
const previousState = state

setState((prev) => ({
collections: prev.collections.filter((c) => c.collectionId !== collectionId),
bookmarks: prev.bookmarks.map((b) =>
(b as unknown as { collectionId?: string }).collectionId === collectionId
? { ...b }
: b
        )
      }))

try {
await apiDeleteCollection(collectionId)
      } catch {

setState(previousState)
      }
    },
[state, setState]
  )

const getBookmarksByCollection = useCallback(
(collectionId: string | null) => {
return state.bookmarks.filter((b) => (b as unknown as { collectionId?: string }).collectionId === collectionId)
    },
[state.bookmarks]
  )

const getCollection = useCallback(
(collectionId: string) => {
return state.collections.find((c) => c.collectionId === collectionId)
    },
[state.collections]
  )

const getCollectionCounts = useMemo(() => {
const counts: Record<string, number> = { uncategorized: 0 }

state.collections.forEach((c) => {
counts[c.collectionId] = 0
    })

state.bookmarks.forEach((b) => {
const key = (b as unknown as { collectionId?: string }).collectionId ?? 'uncategorized'
if (counts[key] !== undefined) {
counts[key]++
      }
    })

return counts
  }, [state.bookmarks, state.collections])

return {
collections: state.collections,
bookmarks: state.bookmarks,
isBookmarked,
getBookmark,
addBookmark,
removeBookmark,
toggleBookmark,
addCollection,
updateCollection,
deleteCollection,
getBookmarksByCollection,
getCollection,
getCollectionCounts,
loading,
  }
}
