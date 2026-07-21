import { waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import { makeEntry } from '../test/fixtures'
import { authMeRoute, mockGetRoutes, mockUser } from '../test/mockApi'
import { DashboardPageObject } from '../test/page-objects/DashboardPageObject'
import type { ActivityEvent, DashboardSummary } from '../types'

vi.mock('../api/client', () => ({
	api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), del: vi.fn() },
}))

const mockedApi = vi.mocked(api)

const summaryPath = '/api/dashboard/summary'
const activityPath = '/api/activity?limit=5'

const baseSummary: DashboardSummary = {
	status_counts: {
		backlog: 3,
		playing: 2,
		completed: 5,
		dropped: 1,
		replaying: 0,
	},
	completed_this_year: 4,
	total_hours_played: 42.4,
	currently_playing: [],
}

const emptyActivity = { results: [] as ActivityEvent[] }

beforeEach(() => {
	mockedApi.get.mockReset()
	mockedApi.patch.mockReset()
})

describe('Dashboard', () => {
	it('renders stat tiles from the summary response', async () => {
		mockGetRoutes(mockedApi, {
			...authMeRoute(mockUser),
			[summaryPath]: baseSummary,
			[activityPath]: emptyActivity,
		})
		const dashboard = new DashboardPageObject()

		await waitFor(() =>
			expect(dashboard.statTileValues).toEqual(['3', '2', '4', '42 hrs']),
		)
	})

	it('shows the empty currently-playing message when there is nothing in progress', async () => {
		mockGetRoutes(mockedApi, {
			...authMeRoute(mockUser),
			[summaryPath]: baseSummary,
			[activityPath]: emptyActivity,
		})
		const dashboard = new DashboardPageObject()

		await waitFor(() => expect(dashboard.currentlyPlayingEmptyText).toBe(true))
	})

	it('renders one GameCard per currently-playing entry', async () => {
		mockGetRoutes(mockedApi, {
			...authMeRoute(mockUser),
			[summaryPath]: {
				...baseSummary,
				currently_playing: [makeEntry({ id: 1 }), makeEntry({ id: 2 })],
			},
			[activityPath]: emptyActivity,
		})
		const dashboard = new DashboardPageObject()

		await waitFor(() => expect(dashboard.gameCardCount).toBe(2))
	})

	it('shows the empty recent-activity message when there is none', async () => {
		mockGetRoutes(mockedApi, {
			...authMeRoute(mockUser),
			[summaryPath]: baseSummary,
			[activityPath]: emptyActivity,
		})
		const dashboard = new DashboardPageObject()

		await waitFor(() => expect(dashboard.recentActivityEmptyText).toBe(true))
	})

	it('renders recent activity events', async () => {
		const event: ActivityEvent = {
			user_id: 1,
			username: 'jane',
			game_id: 1,
			game_title: 'Celeste',
			game_cover_image_url: null,
			action: 'added',
			created_at: '2024-01-01T00:00:00.000Z',
		}
		mockGetRoutes(mockedApi, {
			...authMeRoute(mockUser),
			[summaryPath]: baseSummary,
			[activityPath]: { results: [event] },
		})
		const dashboard = new DashboardPageObject()

		await waitFor(() => expect(dashboard.activityItems).toHaveLength(1))
	})

	it('does not patch when choosing the already-selected visibility', async () => {
		mockGetRoutes(mockedApi, {
			...authMeRoute(mockUser),
			[summaryPath]: baseSummary,
			[activityPath]: emptyActivity,
		})
		const dashboard = new DashboardPageObject()
		await waitFor(() =>
			expect(dashboard.statTileValues.length).toBeGreaterThan(0),
		)

		await dashboard.choosePublic()

		expect(mockedApi.patch).not.toHaveBeenCalled()
	})

	it('patches profile visibility when choosing a different value', async () => {
		mockGetRoutes(mockedApi, {
			...authMeRoute(mockUser),
			[summaryPath]: baseSummary,
			[activityPath]: emptyActivity,
		})
		mockedApi.patch.mockResolvedValueOnce({
			...mockUser,
			profile_visibility: 'private',
		})
		const dashboard = new DashboardPageObject()
		await waitFor(() =>
			expect(dashboard.statTileValues.length).toBeGreaterThan(0),
		)

		await dashboard.choosePrivate()

		expect(mockedApi.patch).toHaveBeenCalledWith('/api/auth/me', {
			profile_visibility: 'private',
		})
	})

	it('saves a trimmed avatar url', async () => {
		mockGetRoutes(mockedApi, {
			...authMeRoute(mockUser),
			[summaryPath]: baseSummary,
			[activityPath]: emptyActivity,
		})
		mockedApi.patch.mockResolvedValueOnce({
			...mockUser,
			avatar_url: 'https://x/a.png',
		})
		const dashboard = new DashboardPageObject()
		await waitFor(() =>
			expect(dashboard.statTileValues.length).toBeGreaterThan(0),
		)

		await dashboard.setAvatarUrl('  https://x/a.png  ')
		await dashboard.clickSave()

		expect(mockedApi.patch).toHaveBeenCalledWith('/api/auth/me', {
			avatar_url: 'https://x/a.png',
		})
	})

	it('clears the avatar url', async () => {
		mockGetRoutes(mockedApi, {
			...authMeRoute(mockUser),
			[summaryPath]: baseSummary,
			[activityPath]: emptyActivity,
		})
		mockedApi.patch.mockResolvedValueOnce({ ...mockUser, avatar_url: null })
		const dashboard = new DashboardPageObject()
		await waitFor(() =>
			expect(dashboard.statTileValues.length).toBeGreaterThan(0),
		)

		await dashboard.clickClear()

		expect(mockedApi.patch).toHaveBeenCalledWith('/api/auth/me', {
			avatar_url: null,
		})
	})
})
