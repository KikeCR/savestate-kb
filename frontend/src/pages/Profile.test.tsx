import { waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import { makeEntry } from '../test/fixtures'
import {
	authMeRoute,
	mockGetRoutes,
	mockOtherUser,
	mockUser,
} from '../test/mockApi'
import { ProfilePageObject } from '../test/page-objects/ProfilePageObject'
import type { ProfileResponse } from '../types'

vi.mock('../api/client', () => ({
	api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), del: vi.fn() },
}))

const mockedApi = vi.mocked(api)

const baseProfile: ProfileResponse = {
	user: {
		id: mockOtherUser.id,
		username: mockOtherUser.username,
		profile_visibility: 'public',
		avatar_url: null,
		created_at: '2024-01-01T00:00:00.000Z',
	},
	is_owner: false,
	is_following: false,
	follower_count: 3,
	following_count: 2,
	entries: [],
	stats: {
		completions_per_year: [],
		games_per_year: [],
		genre_breakdown: [],
		rating_distribution: [],
	},
}

const profilePath = `/api/users/${baseProfile.user.username}`

beforeEach(() => {
	mockedApi.get.mockReset()
})

describe('Profile', () => {
	it('shows a loading state, then the profile once it resolves', async () => {
		mockGetRoutes(mockedApi, {
			...authMeRoute(mockUser),
			[profilePath]: baseProfile,
		})
		const profile = new ProfilePageObject(baseProfile.user.username)

		expect(profile.isLoading).toBe(true)
		await waitFor(() => expect(profile.heading).toBe(baseProfile.user.username))
	})

	it('shows an error message when the fetch fails', async () => {
		mockGetRoutes(mockedApi, {
			...authMeRoute(mockUser),
			'/api/users/missing': new Error('User not found'),
		})
		const profile = new ProfilePageObject('missing')

		await waitFor(() => expect(profile.errorText).toBe('User not found'))
	})

	it("shows the owner banner only when viewing one's own profile", async () => {
		mockGetRoutes(mockedApi, {
			...authMeRoute(mockUser),
			[profilePath]: { ...baseProfile, is_owner: true },
		})
		const profile = new ProfilePageObject(baseProfile.user.username)

		await waitFor(() => expect(profile.isOwnerBanner).toBe(true))
	})

	it('renders the follower and following counts from the response', async () => {
		mockGetRoutes(mockedApi, {
			...authMeRoute(mockUser),
			[profilePath]: baseProfile,
		})
		const profile = new ProfilePageObject(baseProfile.user.username)

		await waitFor(() => expect(profile.followRowText).toContain('3 Followers'))
		expect(profile.followRowText).toContain('2 Following')
	})

	it('shows a FollowButton for a logged-in visitor viewing someone else', async () => {
		mockGetRoutes(mockedApi, {
			...authMeRoute(mockUser),
			[profilePath]: baseProfile,
		})
		const profile = new ProfilePageObject(baseProfile.user.username)

		await waitFor(() => expect(profile.hasFollowButton).toBe(true))
	})

	it('hides the FollowButton for the profile owner', async () => {
		mockGetRoutes(mockedApi, {
			...authMeRoute(mockUser),
			[profilePath]: { ...baseProfile, is_owner: true },
		})
		const profile = new ProfilePageObject(baseProfile.user.username)

		await waitFor(() => expect(profile.heading).toBe(baseProfile.user.username))
		expect(profile.hasFollowButton).toBe(false)
	})

	it('shows "No games tracked yet." when entries is empty', async () => {
		mockGetRoutes(mockedApi, {
			...authMeRoute(mockUser),
			[profilePath]: baseProfile,
		})
		const profile = new ProfilePageObject(baseProfile.user.username)

		await waitFor(() => expect(profile.emptyLibraryText).toBe(true))
	})

	it('renders one GameCard per tracked entry', async () => {
		mockGetRoutes(mockedApi, {
			...authMeRoute(mockUser),
			[profilePath]: {
				...baseProfile,
				entries: [makeEntry({ id: 1 }), makeEntry({ id: 2 })],
			},
		})
		const profile = new ProfilePageObject(baseProfile.user.username)

		await waitFor(() => expect(profile.gameCardCount).toBe(2))
	})
})
