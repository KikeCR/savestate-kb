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

vi.mock('../api/client', () => ({
	api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), del: vi.fn() },
}))

const mockedApi = vi.mocked(api)

const recommendationsPath = '/api/recommendations'

beforeEach(() => {
	mockedApi.get.mockReset()
	mockedApi.post.mockReset()
})

describe('Recommendations', () => {
	it('shows a loading state before the response resolves', () => {
		mockGetRoutes(mockedApi, {
			...authMeRoute(mockUser),
			[recommendationsPath]: new Promise(() => {}),
		})
		const page = new RecommendationsPageObject()

		expect(page.loadingText).toBe(true)
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
		await waitFor(() => expect(page.cardTitles).toEqual(['New Pick']))
	})

	it('shows the rate-limit error message when refresh is on cooldown', async () => {
		mockGetRoutes(mockedApi, {
			...authMeRoute(mockUser),
			[recommendationsPath]: makeRecommendationsResponse(),
		})
		mockedApi.post.mockRejectedValueOnce(
			new Error('refresh is rate-limited, try again later'),
		)
		const page = new RecommendationsPageObject()
		await waitFor(() => expect(page.cardCount).toBe(1))

		await page.clickRefresh()

		await waitFor(() =>
			expect(page.errorText).toBe('refresh is rate-limited, try again later'),
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

		resolveRequest(makeRecommendationsResponse())
		await waitFor(() => expect(page.refreshButton).not.toBeDisabled())
	})
})
