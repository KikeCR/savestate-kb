import { waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import { makeGameDetail } from '../test/fixtures'
import { authMeRoute, mockGetRoutes, mockUser } from '../test/mockApi'
import { GameDetailPageObject } from '../test/page-objects/GameDetailPageObject'

vi.mock('../api/client', () => ({
	api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), del: vi.fn() },
}))

const mockedApi = vi.mocked(api)

beforeEach(() => {
	mockedApi.get.mockReset()
})

describe('GameDetail', () => {
	it('shows a loading state, then the game once it resolves', async () => {
		mockGetRoutes(mockedApi, {
			...authMeRoute(mockUser),
			'/api/games/1': makeGameDetail({ title: 'Hollow Knight' }),
		})
		const detail = new GameDetailPageObject('1')

		expect(detail.isLoading).toBe(true)
		await waitFor(() => expect(detail.heading).toBe('Hollow Knight'))
	})

	it('shows an error message when the fetch fails', async () => {
		mockGetRoutes(mockedApi, {
			...authMeRoute(mockUser),
			'/api/games/999': new Error('game not found'),
		})
		const detail = new GameDetailPageObject('999')

		await waitFor(() => expect(detail.errorText).toBe('game not found'))
	})

	it('renders platforms, genres, and description', async () => {
		mockGetRoutes(mockedApi, {
			...authMeRoute(mockUser),
			'/api/games/1': makeGameDetail({
				platforms: ['PC', 'Nintendo Switch'],
				genres: ['Metroidvania'],
				description: 'A challenging Metroidvania set in Hallownest.',
			}),
		})
		const detail = new GameDetailPageObject('1')

		await waitFor(() =>
			expect(detail.platformTags).toEqual(['PC', 'Nintendo Switch']),
		)
		expect(detail.genreTags).toEqual(['Metroidvania'])
		expect(detail.description).toBe(
			'A challenging Metroidvania set in Hallownest.',
		)
	})

	it('renders ### section headers as headings, not literal text', async () => {
		mockGetRoutes(mockedApi, {
			...authMeRoute(mockUser),
			'/api/games/1': makeGameDetail({
				description: 'Intro paragraph.\n\n###Key features\nFeature text here.',
			}),
		})
		const detail = new GameDetailPageObject('1')

		await waitFor(() =>
			expect(detail.description).toContain('Intro paragraph.'),
		)
		expect(detail.description).toContain('Feature text here.')
		expect(detail.description).not.toContain('###')
		expect(detail.descriptionHeadings).toEqual(['Key features'])
	})

	it('shows a placeholder when the game has no cover image', async () => {
		mockGetRoutes(mockedApi, {
			...authMeRoute(mockUser),
			'/api/games/1': makeGameDetail({ cover_image_url: null }),
		})
		const detail = new GameDetailPageObject('1')

		await waitFor(() => expect(detail.hasCoverPlaceholder).toBe(true))
		expect(detail.coverImage).toBeNull()
	})

	it('shows the cover image when the game has one', async () => {
		mockGetRoutes(mockedApi, {
			...authMeRoute(mockUser),
			'/api/games/1': makeGameDetail({
				cover_image_url: 'https://x/cover.png',
			}),
		})
		const detail = new GameDetailPageObject('1')

		await waitFor(() =>
			expect(detail.coverImage?.src).toBe('https://x/cover.png'),
		)
	})

	it('shows "No ratings yet" when no local ratings exist', async () => {
		mockGetRoutes(mockedApi, {
			...authMeRoute(mockUser),
			'/api/games/1': makeGameDetail({
				local_average_rating: null,
				local_ratings_count: 0,
			}),
		})
		const detail = new GameDetailPageObject('1')

		await waitFor(() => expect(detail.scoresText).toContain('No ratings yet'))
	})

	it('shows the local average rating and count when ratings exist', async () => {
		mockGetRoutes(mockedApi, {
			...authMeRoute(mockUser),
			'/api/games/1': makeGameDetail({
				local_average_rating: 8.5,
				local_ratings_count: 4,
			}),
		})
		const detail = new GameDetailPageObject('1')

		await waitFor(() => expect(detail.scoresText).toContain('8.5/10'))
		expect(detail.scoresText).toContain('4 ratings')
	})

	it('renders gracefully when optional fields are missing', async () => {
		mockGetRoutes(mockedApi, {
			...authMeRoute(mockUser),
			'/api/games/1': makeGameDetail({
				description: null,
				esrb_rating: null,
				developers: [],
				publishers: [],
				website: null,
				metacritic: null,
				rawg_rating: null,
			}),
		})
		const detail = new GameDetailPageObject('1')

		await waitFor(() => expect(detail.heading).toBe('Celeste'))
		expect(detail.description).toBeNull()
	})

	it('shows an "Add to Library" button when logged in', async () => {
		mockGetRoutes(mockedApi, {
			...authMeRoute(mockUser),
			'/api/games/1': makeGameDetail(),
		})
		const detail = new GameDetailPageObject('1')

		await waitFor(() =>
			expect(detail.addButtonText).toContain('Add to Library'),
		)
	})

	it('shows a login link when logged out', async () => {
		mockGetRoutes(mockedApi, {
			...authMeRoute(null),
			'/api/games/1': makeGameDetail(),
		})
		const detail = new GameDetailPageObject('1')

		await waitFor(() => expect(detail.addButtonText).toContain('Log in to add'))
	})
})
