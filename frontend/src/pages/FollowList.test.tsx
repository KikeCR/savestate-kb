import { waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import { authMeRoute, mockGetRoutes, mockUser } from '../test/mockApi'
import { FollowListPageObject } from '../test/page-objects/FollowListPageObject'
import { FollowersList, FollowingList } from './FollowList'
import type { FollowListEntry, PublicUser } from '../types'

vi.mock('../api/client', () => ({
	api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), del: vi.fn() },
}))

const mockedApi = vi.mocked(api)
const followersPath = '/api/users/sam/followers'
const followingPath = '/api/users/sam/following'

const makePublicUser = (overrides: Partial<PublicUser> = {}): PublicUser => ({
	id: 100,
	username: 'other',
	profile_visibility: 'public',
	avatar_url: null,
	preferred_platforms: [],
	created_at: '2024-01-01T00:00:00.000Z',
	...overrides,
})

const makeFollowEntry = (
	overrides: Partial<FollowListEntry> = {},
): FollowListEntry => ({
	user: makePublicUser(),
	is_following: false,
	...overrides,
})

beforeEach(() => {
	mockedApi.get.mockReset()
	mockedApi.post.mockReset()
})

describe('FollowersList / FollowingList', () => {
	it('shows a loading state, then the followers list once it resolves', async () => {
		mockGetRoutes(mockedApi, {
			...authMeRoute(mockUser),
			[followersPath]: { results: [makeFollowEntry()] },
		})
		const list = new FollowListPageObject(FollowersList)

		expect(list.isLoading).toBe(true)
		await waitFor(() => expect(list.rows).toHaveLength(1))
		expect(list.heading).toContain('Followers')
	})

	it('links back to the profile even before the list has loaded', async () => {
		mockGetRoutes(mockedApi, {
			...authMeRoute(mockUser),
			[followersPath]: { results: [] },
		})
		const list = new FollowListPageObject(FollowersList)

		expect(list.backLinkHref).toBe('/profile/sam')
		await waitFor(() => expect(list.emptyText).toBe('No followers yet.'))
		expect(list.backLinkHref).toBe('/profile/sam')
	})

	it('shows an error message when the fetch fails', async () => {
		mockGetRoutes(mockedApi, {
			...authMeRoute(mockUser),
			[followersPath]: new Error('User not found'),
		})
		const list = new FollowListPageObject(FollowersList)

		await waitFor(() => expect(list.errorText).toBe('User not found'))
	})

	it('shows the empty-state copy for an empty followers list', async () => {
		mockGetRoutes(mockedApi, {
			...authMeRoute(mockUser),
			[followersPath]: { results: [] },
		})
		const list = new FollowListPageObject(FollowersList)

		await waitFor(() => expect(list.emptyText).toBe('No followers yet.'))
	})

	it('shows the empty-state copy for an empty following list', async () => {
		mockGetRoutes(mockedApi, {
			...authMeRoute(mockUser),
			[followingPath]: { results: [] },
		})
		const list = new FollowListPageObject(FollowingList)

		await waitFor(() =>
			expect(list.emptyText).toBe('Not following anyone yet.'),
		)
	})

	it("hides the FollowButton for the current user's own row", async () => {
		mockGetRoutes(mockedApi, {
			...authMeRoute(mockUser),
			[followersPath]: {
				results: [
					makeFollowEntry({
						user: makePublicUser({
							id: mockUser.id,
							username: mockUser.username,
						}),
					}),
					makeFollowEntry(),
				],
			},
		})
		const list = new FollowListPageObject(FollowersList)

		await waitFor(() => expect(list.rows).toHaveLength(2))
		expect(list.followButtonAt(0)).toBeNull()
		expect(list.followButtonAt(1)).not.toBeNull()
	})

	it('updates only the toggled row when a follow action resolves', async () => {
		mockGetRoutes(mockedApi, {
			...authMeRoute(mockUser),
			[followersPath]: {
				results: [
					makeFollowEntry({
						user: makePublicUser({ id: 10, username: 'first' }),
					}),
					makeFollowEntry({
						user: makePublicUser({ id: 11, username: 'second' }),
					}),
				],
			},
		})
		mockedApi.post.mockResolvedValueOnce({
			is_following: true,
			follower_count: 1,
		})
		const list = new FollowListPageObject(FollowersList)

		await waitFor(() => expect(list.rows).toHaveLength(2))
		await list.clickFollowButtonAt(0)

		await waitFor(() =>
			expect(list.followButtonAt(0)?.textContent).toBe('Unfollow'),
		)
		expect(list.followButtonAt(1)?.textContent).toBe('Follow')
	})
})
