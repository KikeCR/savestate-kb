import { waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import { makeEntry, makeGameDetail, makeReview } from '../test/fixtures'
import { authMeRoute, mockGetRoutes, mockUser } from '../test/mockApi'
import { GameDetailPageObject } from '../test/page-objects/GameDetailPageObject'

vi.mock('../api/client', () => ({
	api: {
		get: vi.fn(),
		post: vi.fn(),
		put: vi.fn(),
		patch: vi.fn(),
		del: vi.fn(),
	},
}))

const noReviewsRoutes = {
	'/api/entries?game_id=1': { results: [] },
	'/api/reviews/1': new Error('not found'),
	'/api/games/1/reviews': { results: [] },
}

const mockedApi = vi.mocked(api)

beforeEach(() => {
	mockedApi.get.mockReset()
	mockedApi.put.mockReset()
	mockedApi.del.mockReset()
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

	it('hides the reviews section when no reviews exist', async () => {
		mockGetRoutes(mockedApi, {
			...authMeRoute(mockUser),
			'/api/games/1': makeGameDetail(),
			...noReviewsRoutes,
		})
		const detail = new GameDetailPageObject('1')

		await waitFor(() => expect(detail.heading).toBe('Celeste'))
		expect(detail.hasReviewsSection).toBe(false)
	})

	it('shows the reviews section with cards when reviews exist', async () => {
		mockGetRoutes(mockedApi, {
			...authMeRoute(mockUser),
			'/api/games/1': makeGameDetail(),
			'/api/entries?game_id=1': { results: [] },
			'/api/reviews/1': new Error('not found'),
			'/api/games/1/reviews': {
				results: [makeReview({ body: 'Loved every second.' })],
			},
		})
		const detail = new GameDetailPageObject('1')

		await waitFor(() => expect(detail.hasReviewsSection).toBe(true))
		expect(detail.reviewCardBodies).toEqual(['Loved every second.'])
	})

	it('hides the review form when the viewer has not completed and rated the game', async () => {
		mockGetRoutes(mockedApi, {
			...authMeRoute(mockUser),
			'/api/games/1': makeGameDetail(),
			...noReviewsRoutes,
		})
		const detail = new GameDetailPageObject('1')

		await waitFor(() => expect(detail.heading).toBe('Celeste'))
		expect(detail.hasReviewForm).toBe(false)
	})

	it('shows an inline textarea when the viewer can review but has not yet', async () => {
		mockGetRoutes(mockedApi, {
			...authMeRoute(mockUser),
			'/api/games/1': makeGameDetail(),
			'/api/entries?game_id=1': {
				results: [makeEntry({ status: 'completed', rating: 8 })],
			},
			'/api/reviews/1': new Error('not found'),
			'/api/games/1/reviews': { results: [] },
		})
		const detail = new GameDetailPageObject('1')

		await waitFor(() => expect(detail.hasCreateReviewBox).toBe(true))
		expect(detail.myReviewBody).toBeNull()
	})

	it('saves a new review typed directly into the inline textarea, without a modal', async () => {
		mockGetRoutes(mockedApi, {
			...authMeRoute(mockUser),
			'/api/games/1': makeGameDetail(),
			'/api/entries?game_id=1': {
				results: [makeEntry({ status: 'completed', rating: 8 })],
			},
			'/api/reviews/1': new Error('not found'),
			'/api/games/1/reviews': { results: [] },
		})
		mockedApi.put.mockResolvedValueOnce(
			makeReview({ body: 'Great game overall.' }),
		)
		const detail = new GameDetailPageObject('1')
		await waitFor(() => expect(detail.hasCreateReviewBox).toBe(true))

		expect(detail.editModal).toBeNull()
		await detail.typeReviewBody('Great game overall.')
		await detail.clickPostReview()

		expect(mockedApi.put).toHaveBeenCalledWith('/api/reviews/1', {
			body: 'Great game overall.',
		})
		await waitFor(() => expect(detail.myReviewBody).toBe('Great game overall.'))
		expect(detail.editModal).toBeNull()
	})

	it('shows an existing review as read-only text with edit and delete controls', async () => {
		mockGetRoutes(mockedApi, {
			...authMeRoute(mockUser),
			'/api/games/1': makeGameDetail(),
			'/api/entries?game_id=1': {
				results: [makeEntry({ status: 'completed', rating: 8 })],
			},
			'/api/reviews/1': makeReview({ body: 'My old review.' }),
			'/api/games/1/reviews': { results: [] },
		})
		const detail = new GameDetailPageObject('1')

		await waitFor(() => expect(detail.myReviewBody).toBe('My old review.'))
		expect(detail.hasCreateReviewBox).toBe(false)
	})

	it('keeps an existing review visible to edit even if no longer eligible', async () => {
		mockGetRoutes(mockedApi, {
			...authMeRoute(mockUser),
			'/api/games/1': makeGameDetail(),
			'/api/entries?game_id=1': {
				results: [makeEntry({ status: 'playing', rating: null })],
			},
			'/api/reviews/1': makeReview({ body: 'My old review.' }),
			'/api/games/1/reviews': { results: [] },
		})
		const detail = new GameDetailPageObject('1')

		await waitFor(() => expect(detail.myReviewBody).toBe('My old review.'))
	})

	it('opens the edit modal pre-filled with the existing review text', async () => {
		mockGetRoutes(mockedApi, {
			...authMeRoute(mockUser),
			'/api/games/1': makeGameDetail(),
			'/api/entries?game_id=1': {
				results: [makeEntry({ status: 'completed', rating: 8 })],
			},
			'/api/reviews/1': makeReview({ body: 'My old review.' }),
			'/api/games/1/reviews': { results: [] },
		})
		const detail = new GameDetailPageObject('1')
		await waitFor(() => expect(detail.myReviewBody).toBe('My old review.'))

		await detail.clickEditReview()

		expect(detail.reviewTextarea?.value).toBe('My old review.')
	})

	it('saves an edited review and updates the displayed text', async () => {
		mockGetRoutes(mockedApi, {
			...authMeRoute(mockUser),
			'/api/games/1': makeGameDetail(),
			'/api/entries?game_id=1': {
				results: [makeEntry({ status: 'completed', rating: 8 })],
			},
			'/api/reviews/1': makeReview({ body: 'My old review.' }),
			'/api/games/1/reviews': { results: [] },
		})
		mockedApi.put.mockResolvedValueOnce(makeReview({ body: 'Updated text.' }))
		const detail = new GameDetailPageObject('1')
		await waitFor(() => expect(detail.myReviewBody).toBe('My old review.'))

		await detail.clickEditReview()
		await detail.typeReviewBody('Updated text.')
		await detail.clickSaveReview()

		expect(mockedApi.put).toHaveBeenCalledWith('/api/reviews/1', {
			body: 'Updated text.',
		})
		await waitFor(() => expect(detail.myReviewBody).toBe('Updated text.'))
	})

	it('cancels editing without saving changes', async () => {
		mockGetRoutes(mockedApi, {
			...authMeRoute(mockUser),
			'/api/games/1': makeGameDetail(),
			'/api/entries?game_id=1': {
				results: [makeEntry({ status: 'completed', rating: 8 })],
			},
			'/api/reviews/1': makeReview({ body: 'My old review.' }),
			'/api/games/1/reviews': { results: [] },
		})
		const detail = new GameDetailPageObject('1')
		await waitFor(() => expect(detail.myReviewBody).toBe('My old review.'))

		await detail.clickEditReview()
		await detail.typeReviewBody('Changed my mind.')
		await detail.clickCancelModal()

		expect(mockedApi.put).not.toHaveBeenCalled()
		expect(detail.editModal).toBeNull()
		expect(detail.myReviewBody).toBe('My old review.')
	})

	it('deletes the review after confirming in the modal', async () => {
		mockGetRoutes(mockedApi, {
			...authMeRoute(mockUser),
			'/api/games/1': makeGameDetail(),
			'/api/entries?game_id=1': {
				results: [makeEntry({ status: 'completed', rating: 8 })],
			},
			'/api/reviews/1': makeReview({ body: 'My old review.' }),
			'/api/games/1/reviews': { results: [] },
		})
		mockedApi.del.mockResolvedValueOnce(undefined)
		const detail = new GameDetailPageObject('1')
		await waitFor(() => expect(detail.myReviewBody).toBe('My old review.'))

		await detail.clickDeleteReview()
		expect(detail.deleteConfirmModal).not.toBeNull()
		await detail.clickConfirmDelete()

		expect(mockedApi.del).toHaveBeenCalledWith('/api/reviews/1')
		await waitFor(() => expect(detail.myReviewBody).toBeNull())
		expect(detail.deleteConfirmModal).toBeNull()
	})

	it('cancels the delete confirmation without deleting', async () => {
		mockGetRoutes(mockedApi, {
			...authMeRoute(mockUser),
			'/api/games/1': makeGameDetail(),
			'/api/entries?game_id=1': {
				results: [makeEntry({ status: 'completed', rating: 8 })],
			},
			'/api/reviews/1': makeReview({ body: 'My old review.' }),
			'/api/games/1/reviews': { results: [] },
		})
		const detail = new GameDetailPageObject('1')
		await waitFor(() => expect(detail.myReviewBody).toBe('My old review.'))

		await detail.clickDeleteReview()
		await detail.clickCancelModal()

		expect(mockedApi.del).not.toHaveBeenCalled()
		expect(detail.deleteConfirmModal).toBeNull()
		expect(detail.myReviewBody).toBe('My old review.')
	})

	it('shows "Add to Library" when the game is not yet in the viewer\'s library', async () => {
		mockGetRoutes(mockedApi, {
			...authMeRoute(mockUser),
			'/api/games/1': makeGameDetail(),
			...noReviewsRoutes,
		})
		const detail = new GameDetailPageObject('1')

		await waitFor(() =>
			expect(detail.addButtonText).toContain('Add to Library'),
		)
	})

	it('shows "In Library" when the game is already in the viewer\'s library', async () => {
		mockGetRoutes(mockedApi, {
			...authMeRoute(mockUser),
			'/api/games/1': makeGameDetail(),
			'/api/entries?game_id=1': { results: [makeEntry()] },
			'/api/reviews/1': new Error('not found'),
			'/api/games/1/reviews': { results: [] },
		})
		const detail = new GameDetailPageObject('1')

		await waitFor(() => expect(detail.addButtonText).toContain('In Library'))
	})
})
