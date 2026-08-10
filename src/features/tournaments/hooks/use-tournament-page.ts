'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { tournaments as mockTournaments } from '@/features/tournaments/constants/tournament'
import {
  getTournaments,
  type Tournament,
  type GetTournamentsParams
} from '@/features/tournaments/api'

const TOURNAMENT_NOW = new Date('2025-08-01')

export function useTournamentPage() {
  const [filter, setFilter] = useState<string>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [tournaments, setTournaments] = useState<Tournament[]>(mockTournaments)
  const [isLoading, setIsLoading] = useState(true)

  // Fetch tournaments from API
  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        const params: GetTournamentsParams = {}
        if (selectedCategory !== 'all') {
          params.categoryId = selectedCategory
        }
        if (filter !== 'all') {
          params.status = filter as GetTournamentsParams['status']
        }

        const data = await getTournaments(params)
        setTournaments((data as unknown as { data?: Tournament[] }).data ?? [])
      } catch {
        // Use mock data if API fails
        setTournaments(mockTournaments)
      } finally {
        setIsLoading(false)
      }
    }

    fetchTournaments()
  }, [filter, selectedCategory])

  const uniqueCategories = useMemo(
    () => ['all', ...new Set(tournaments.map((tournament) => tournament.categoryId ?? 'General'))],
    [tournaments]
  )

  const filteredTournaments = useMemo(() => {
    let filtered = [...tournaments]

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(
        (tournament) => tournament.categoryId === selectedCategory
      )
    }

    switch (filter) {
      case 'upcoming':
        return filtered.filter(
          (tournament) => new Date(tournament.startAt) > TOURNAMENT_NOW
        )
      case 'ongoing':
        return filtered.filter(
          (tournament) =>
            new Date(tournament.startAt) <= TOURNAMENT_NOW &&
            new Date(tournament.endAt) >= TOURNAMENT_NOW
        )
      case 'completed':
        return filtered.filter(
          (tournament) => new Date(tournament.endAt) < TOURNAMENT_NOW
        )
      case 'registration':
        return filtered.filter((tournament) => tournament.status === 'registration')
      default:
        return filtered
    }
  }, [filter, selectedCategory, tournaments])

  const handleFilterChange = useCallback((value: string) => {
    setFilter(value)
  }, [])

  const handleCategoryChange = useCallback((value: string) => {
    setSelectedCategory(value)
  }, [])

  return {
    filter,
    selectedCategory,
    uniqueCategories,
    filteredTournaments,
    handleFilterChange,
    handleCategoryChange,
    isLoading
  }
}
