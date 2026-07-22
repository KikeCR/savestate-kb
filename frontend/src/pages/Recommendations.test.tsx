import { waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import {
	makeGame,
	makeRecommendation,
	makeRecommendationsResponse,
} from '../test/fixtures'
import { authMeRoute, mockGetRoutes, mockUser } from '../test/mockApi'
import { RecommendationsPageObject } from '../test/page-objects/RecommendationsPageObject'
import { MIN_REFRESH_ANIMATION_MS } from './Recommendations'

// The refresh flow deliberately keeps the "thinking" animation up for at
// least MIN_REFRESH_ANIMATION_MS even once the response has arrived, so any
// waitFor spanning a refresh needs headroom beyond the default 1000ms.
const REFRESH_WAIT_TIMEOUT = MIN_REFRESH_ANIMATION_MS + 1000

vi.mock('../api/client', () => ({
	api: {
		get: vi.fn(),
		post: vi.fn(),
		put: vi.fn(),
		patch: vi.fn(),
		del: vi.fn(),
	},
}))

const mockedApi = vi.mocked(api)

const recommendationsPath = '/api/recommendations'

beforeEach(() => {
	mockedApi.get.mockReset()
	mockedApi.post.mockReset()
	mockedApi.put.mockReset()
})

describe('Recommendations', () => {
	it('shows the thinking animation before the initial response resolves', () => {
		mockGetRoutes(mockedApi, {
			...authMeRoute(mockUser),
			[recommendationsPath]: new Promise(() => {}),
		})
		const page = new RecommendationsPageObject()

		expect(page.isThinking).toBe(true)
	})

	it('shows a cold-start message for a user with no taste signals yet', async () => {
		mockGetRoutes(mockedApi, {
			...authMeRoute(mockUser),
			[recommendationsPath]: makeRecommendationsResponse({
				cold_start: true,
				recommendations: [],
			}),
		})
		const page = new RecommendationsPageObject()

		await waitFor(() =>
			expect(page.emptyText).toContain('Rate or favorite a few games'),
		)
	})

	it('shows an empty message when there are no candidates yet', async () => {
		mockGetRoutes(mockedApi, {
			...authMeRoute(mockUser),
			[recommendationsPath]: makeRecommendationsResponse({
				cold_start: false,
				recommendations: [],
			}),
		})
		const page = new RecommendationsPageObject()

		await waitFor(() =>
			expect(page.emptyText).toContain('No recommendations available'),
		)
	})

	it('renders one RecommendationCard per recommendation', async () => {
		mockGetRoutes(mockedApi, {
			...authMeRoute(mockUser),
			[recommendationsPath]: makeRecommendationsResponse({
				recommendations: [
					makeRecommendation({ game: makeGame({ id: 1, title: 'Celeste' }) }),
					makeRecommendation({ game: makeGame({ id: 2, title: 'Hades' }) }),
				],
			}),
		})
		const page = new RecommendationsPageObject()

		await waitFor(() => expect(page.cardCount).toBe(2))
		expect(page.cardTitles).toEqual(['Celeste', 'Hades'])
	})

	it('staggers each card entrance by its position in the list', async () => {
		mockGetRoutes(mockedApi, {
			...authMeRoute(mockUser),
			[recommendationsPath]: makeRecommendationsResponse({
				recommendations: [
					makeRecommendation({ game: makeGame({ id: 1, title: 'Celeste' }) }),
					makeRecommendation({ game: makeGame({ id: 2, title: 'Hades' }) }),
				],
			}),
		})
		const page = new RecommendationsPageObject()

		await waitFor(() => expect(page.cardCount).toBe(2))
		expect(page.cardStaggerIndexes).toEqual(['0', '1'])
	})

	it('shows a source label distinguishing AI-curated from algorithm picks', async () => {
		mockGetRoutes(mockedApi, {
			...authMeRoute(mockUser),
			[recommendationsPath]: makeRecommendationsResponse({
				source: 'deepseek',
			}),
		})
		const page = new RecommendationsPageObject()

		await waitFor(() => expect(page.sourceText).toContain('DeepSeek'))
	})

	it('shows an error message when the initial fetch fails', async () => {
		mockGetRoutes(mockedApi, {
			...authMeRoute(mockUser),
			[recommendationsPath]: new Error('server exploded'),
		})
		const page = new RecommendationsPageObject()

		await waitFor(() => expect(page.errorText).toBe('server exploded'))
	})

	it('stops showing the thinking animation once the initial fetch has failed', async () => {
		mockGetRoutes(mockedApi, {
			...authMeRoute(mockUser),
			[recommendationsPath]: new Error('server exploded'),
		})
		const page = new RecommendationsPageObject()

		await waitFor(() => expect(page.errorText).toBe('server exploded'))
		expect(page.isThinking).toBe(false)
	})

	it('refreshes and replaces the recommendation list', async () => {
		mockGetRoutes(mockedApi, {
			...authMeRoute(mockUser),
			[recommendationsPath]: makeRecommendationsResponse({
				recommendations: [
					makeRecommendation({ game: makeGame({ id: 1, title: 'Old Pick' }) }),
				],
			}),
		})
		mockedApi.post.mockResolvedValueOnce(
			makeRecommendationsResponse({
				recommendations: [
					makeRecommendation({ game: makeGame({ id: 2, title: 'New Pick' }) }),
				],
			}),
		)
		const page = new RecommendationsPageObject()
		await waitFor(() => expect(page.cardTitles).toEqual(['Old Pick']))

		await page.clickRefresh()

		expect(mockedApi.post).toHaveBeenCalledWith('/api/recommendations/refresh')
		expect(page.isThinking).toBe(true)
		await waitFor(() => expect(page.cardTitles).toEqual(['New Pick']), {
			timeout: REFRESH_WAIT_TIMEOUT,
		})
	})

	it('shows the rate-limit error message when refresh is on cooldown', async () => {
		mockGetRoutes(mockedApi, {
			...authMeRoute(mockUser),
			[recommendationsPath]: makeRecommendationsResponse(),
		})
		mockedApi.post.mockRejectedValueOnce(
			new Error('you can refresh again in 45 seconds'),
		)
		const page = new RecommendationsPageObject()
		await waitFor(() => expect(page.cardCount).toBe(1))

		await page.clickRefresh()

		await waitFor(() =>
			expect(page.errorText).toBe('you can refresh again in 45 seconds'),
		)
	})

	it('disables the refresh button while a refresh is in flight', async () => {
		mockGetRoutes(mockedApi, {
			...authMeRoute(mockUser),
			[recommendationsPath]: makeRecommendationsResponse(),
		})
		let resolveRequest!: (value: unknown) => void
		mockedApi.post.mockReturnValueOnce(
			new Promise((resolve) => {
				resolveRequest = resolve
			}),
		)
		const page = new RecommendationsPageObject()
		await waitFor(() => expect(page.cardCount).toBe(1))

		await page.clickRefresh()
		expect(page.refreshButton).toBeDisabled()
		expect(page.isThinking).toBe(true)

		resolveRequest(makeRecommendationsResponse())
		await waitFor(() => expect(page.refreshButton).not.toBeDisabled(), {
			timeout: REFRESH_WAIT_TIMEOUT,
		})
	})

	it('shows only the first VISIBLE_RECOMMENDATION_COUNT recommendations, holding the rest in reserve', async () => {
		const recommendations = Array.from({ length: 15 }, (_, i) =>
			makeRecommendation({
				game: makeGame({ id: i + 1, title: `Game ${i + 1}` }),
			}),
		)
		mockGetRoutes(mockedApi, {
			...authMeRoute(mockUser),
			[recommendationsPath]: makeRecommendationsResponse({ recommendations }),
		})
		const page = new RecommendationsPageObject()

		await waitFor(() => expect(page.cardCount).toBe(10))
		expect(page.cardTitles).not.toContain('Game 11')
	})

	it('replaces an added card with the next reserved one, without a network round-trip', async () => {
		const recommendations = Array.from({ length: 11 }, (_, i) =>
			makeRecommendation({
				game: makeGame({ id: i + 1, title: `Game ${i + 1}` }),
			}),
		)
		mockGetRoutes(mockedApi, {
			...authMeRoute(mockUser),
			[recommendationsPath]: makeRecommendationsResponse({ recommendations }),
		})
		mockedApi.post.mockImplementation(((path: string) => {
			if (path === '/api/entries') return Promise.resolve({ id: 1 })
			return Promise.reject(new Error(`Unmocked POST ${path}`))
		}) as typeof api.post)
		const page = new RecommendationsPageObject()
		await waitFor(() => expect(page.cardCount).toBe(10))
		expect(page.cardTitles).not.toContain('Game 11')

		await page.clickAddOnCard('Game 1')

		await waitFor(() => expect(page.cardTitles).toContain('Game 11'), {
			timeout: 1000,
		})
		expect(page.cardCount).toBe(10)
		expect(page.cardTitles).not.toContain('Game 1')
		expect(mockedApi.post).not.toHaveBeenCalledWith(
			'/api/recommendations/topup',
			expect.anything(),
		)
	})

	it('requests a topup once the reserve is exhausted and fills the gap it left', async () => {
		const recommendations = Array.from({ length: 10 }, (_, i) =>
			makeRecommendation({
				game: makeGame({ id: i + 1, title: `Game ${i + 1}` }),
			}),
		)
		mockGetRoutes(mockedApi, {
			...authMeRoute(mockUser),
			[recommendationsPath]: makeRecommendationsResponse({ recommendations }),
		})
		mockedApi.post.mockImplementation(((path: string) => {
			if (path === '/api/entries') return Promise.resolve({ id: 1 })
			if (path === '/api/recommendations/topup') {
				return Promise.resolve(
					makeRecommendationsResponse({
						recommendations: [
							makeRecommendation({
								game: makeGame({ id: 99, title: 'Topped Up' }),
							}),
						],
					}),
				)
			}
			return Promise.reject(new Error(`Unmocked POST ${path}`))
		}) as typeof api.post)
		const page = new RecommendationsPageObject()
		await waitFor(() => expect(page.cardCount).toBe(10))

		await page.clickAddOnCard('Game 1')

		await waitFor(() =>
			expect(mockedApi.post).toHaveBeenCalledWith(
				'/api/recommendations/topup',
				{
					exclude_game_ids: [2, 3, 4, 5, 6, 7, 8, 9, 10],
				},
			),
		)
		await waitFor(() => expect(page.cardTitles).toContain('Topped Up'), {
			timeout: 1000,
		})
		expect(page.cardCount).toBe(10)
	})

	it('keeps the thinking indicator visible for a minimum duration even after the response arrives', async () => {
		mockGetRoutes(mockedApi, {
			...authMeRoute(mockUser),
			[recommendationsPath]: makeRecommendationsResponse(),
		})
		// Resolves on the same tick — simulates a very fast API response, which
		// is exactly the case the minimum-duration padding exists for.
		mockedApi.post.mockResolvedValueOnce(makeRecommendationsResponse())
		const page = new RecommendationsPageObject()
		await waitFor(() => expect(page.cardCount).toBe(1))

		await page.clickRefresh()

		expect(page.isThinking).toBe(true)
		expect(page.cardCount).toBe(0)
	})
})
