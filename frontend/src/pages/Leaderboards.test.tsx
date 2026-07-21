import { waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import { mockGetRoutes } from '../test/mockApi'
import { LeaderboardsPageObject } from '../test/page-objects/LeaderboardsPageObject'
import type { LeaderboardEntry, PublicUser } from '../types'

vi.mock('../api/client', () => ({
	api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), del: vi.fn() },
}))

const mockedApi = vi.mocked(api)
const currentYear = new Date().getFullYear()
const avgRatingPath = '/api/leaderboards/avg-rating'
const completionsPath = (year: number) =>
	`/api/leaderboards/completions?year=${year}`

const makePublicUser = (overrides: Partial<PublicUser> = {}): PublicUser => ({
	id: 1,
	username: 'jane',
	profile_visibility: 'public',
	avatar_url: null,
	created_at: '2024-01-01T00:00:00.000Z',
	...overrides,
})

beforeEach(() => {
	mockedApi.get.mockReset()
})

describe('Leaderboards', () => {
	it('shows the empty-state copy for both lists when there is no data', async () => {
		mockGetRoutes(mockedApi, {
			[avgRatingPath]: { results: [] },
			[completionsPath(currentYear)]: { year: currentYear, results: [] },
		})
		const board = new LeaderboardsPageObject()

		await waitFor(() =>
			expect(board.completionsEmptyText).toBe(
				`No completions in ${currentYear}.`,
			),
		)
		expect(board.avgRatingEmptyText).toBe('No ratings yet.')
	})

	it('renders completions with the username and score', async () => {
		const entry: LeaderboardEntry = { user: makePublicUser(), score: 7 }
		mockGetRoutes(mockedApi, {
			[avgRatingPath]: { results: [] },
			[completionsPath(currentYear)]: { year: currentYear, results: [entry] },
		})
		const board = new LeaderboardsPageObject()

		await waitFor(() => expect(board.completionsRows).toHaveLength(1))
		expect(board.completionsRows[0]?.textContent).toContain('jane')
		expect(board.completionsRows[0]?.textContent).toContain('7')
	})

	it('renders the average rating formatted to one decimal place', async () => {
		const entry: LeaderboardEntry = { user: makePublicUser(), score: 8.456 }
		mockGetRoutes(mockedApi, {
			[avgRatingPath]: { results: [entry] },
			[completionsPath(currentYear)]: { year: currentYear, results: [] },
		})
		const board = new LeaderboardsPageObject()

		await waitFor(() => expect(board.avgRatingRows).toHaveLength(1))
		expect(board.avgRatingRows[0]?.textContent).toContain('8.5')
	})

	it('refetches completions (not avg-rating) when the year filter changes', async () => {
		mockGetRoutes(mockedApi, {
			[avgRatingPath]: { results: [] },
			[completionsPath(currentYear)]: { year: currentYear, results: [] },
			[completionsPath(currentYear - 1)]: {
				year: currentYear - 1,
				results: [],
			},
		})
		const board = new LeaderboardsPageObject()
		await waitFor(() => expect(board.completionsEmptyText).not.toBeNull())

		mockedApi.get.mockClear()
		await board.selectYear(String(currentYear - 1))

		await waitFor(() =>
			expect(mockedApi.get).toHaveBeenCalledWith(
				completionsPath(currentYear - 1),
			),
		)
		expect(mockedApi.get).not.toHaveBeenCalledWith(avgRatingPath)
	})
})
