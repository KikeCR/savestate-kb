import { waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import { makeGame } from '../test/fixtures'
import { authMeRoute, mockGetRoutes, mockUser } from '../test/mockApi'
import { HomePageObject } from '../test/page-objects/HomePageObject'
import type { PopularGamesResponse } from '../types'

vi.mock('../api/client', () => ({
	api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), del: vi.fn() },
}))

const mockedApi = vi.mocked(api)
const popularGamesPath = '/api/games/popular'

const emptyPopularResponse: PopularGamesResponse = {
	community_available: false,
	community: [],
	critics: [],
}

beforeEach(() => {
	mockedApi.get.mockReset()
})

describe('Home', () => {
	it('shows login/register links when logged out', async () => {
		mockGetRoutes(mockedApi, {
			...authMeRoute(null),
			[popularGamesPath]: emptyPopularResponse,
		})

		const home = new HomePageObject()

		await waitFor(() => expect(home.hasLoginLink).toBe(true))
		expect(home.hasDashboardLink).toBe(false)
		expect(home.showsWelcomeBack).toBe(false)
	})

	it('shows a welcome message and dashboard link when logged in', async () => {
		mockGetRoutes(mockedApi, {
			...authMeRoute(mockUser),
			[popularGamesPath]: emptyPopularResponse,
		})

		const home = new HomePageObject()

		await waitFor(() => expect(home.hasDashboardLink).toBe(true))
		expect(home.showsWelcomeBack).toBe(true)
	})

	it('shows the Popular With Players section when community data is available', async () => {
		mockGetRoutes(mockedApi, {
			...authMeRoute(mockUser),
			[popularGamesPath]: {
				community_available: true,
				community: [makeGame({ id: 1, title: 'Hades' })],
				critics: [],
			} satisfies PopularGamesResponse,
		})

		const home = new HomePageObject()

		await waitFor(() =>
			expect(home.sectionHeadings).toContain('Popular With Players'),
		)
		expect(home.popularCardTitles).toContain('Hades')
	})

	it('hides the Popular With Players section when community data is unavailable', async () => {
		mockGetRoutes(mockedApi, {
			...authMeRoute(mockUser),
			[popularGamesPath]: {
				community_available: false,
				community: [],
				critics: [makeGame({ id: 2, title: 'Celeste' })],
			} satisfies PopularGamesResponse,
		})

		const home = new HomePageObject()

		await waitFor(() =>
			expect(home.sectionHeadings).toContain('Critically Acclaimed'),
		)
		expect(home.sectionHeadings).not.toContain('Popular With Players')
	})

	it('shows the Critically Acclaimed section', async () => {
		mockGetRoutes(mockedApi, {
			...authMeRoute(mockUser),
			[popularGamesPath]: {
				community_available: false,
				community: [],
				critics: [makeGame({ id: 3, title: 'Portal' })],
			} satisfies PopularGamesResponse,
		})

		const home = new HomePageObject()

		await waitFor(() => expect(home.popularCardTitles).toContain('Portal'))
	})

	it('shows neither section when both lists are empty', async () => {
		mockGetRoutes(mockedApi, {
			...authMeRoute(mockUser),
			[popularGamesPath]: emptyPopularResponse,
		})

		const home = new HomePageObject()

		await waitFor(() => expect(home.showsWelcomeBack).toBe(true))
		expect(home.sectionHeadings).toEqual([])
	})

	it('shows an error message when the popular games fetch fails', async () => {
		mockGetRoutes(mockedApi, {
			...authMeRoute(mockUser),
			[popularGamesPath]: new Error('server exploded'),
		})

		const home = new HomePageObject()

		await waitFor(() => expect(home.errorText).toBe('server exploded'))
	})
})
