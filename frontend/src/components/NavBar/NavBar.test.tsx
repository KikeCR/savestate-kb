import { waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../../api/client'
import { authMeRoute, mockGetRoutes, mockUser } from '../../test/mockApi'
import { NavBarPageObject } from '../../test/page-objects/NavBarPageObject'

vi.mock('../../api/client', () => ({
	api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), del: vi.fn() },
}))

const mockedApi = vi.mocked(api)

beforeEach(() => {
	mockedApi.get.mockReset()
	mockGetRoutes(mockedApi, authMeRoute(mockUser))
})

describe('NavBar', () => {
	it("marks the current route's link as active", async () => {
		const nav = new NavBarPageObject('/library')

		await waitFor(() => expect(nav.links.length).toBeGreaterThan(0))

		expect(nav.isActive('Library')).toBe(true)
		expect(nav.isActive('Dashboard')).toBe(false)
	})

	it('updates which link is active for a different route', async () => {
		const nav = new NavBarPageObject('/board')

		await waitFor(() => expect(nav.links.length).toBeGreaterThan(0))

		expect(nav.isActive('Board')).toBe(true)
		expect(nav.isActive('Library')).toBe(false)
	})

	it("marks the profile link active when viewing the logged-in user's own profile", async () => {
		const nav = new NavBarPageObject(`/profile/${mockUser.username}`)

		await waitFor(() => expect(nav.links.length).toBeGreaterThan(0))

		expect(nav.isActive(mockUser.username)).toBe(true)
		expect(nav.isActive('Dashboard')).toBe(false)
	})

	it('marks Home active only on the homepage itself, not on other routes', async () => {
		const onHome = new NavBarPageObject('/')
		await waitFor(() => expect(onHome.links.length).toBeGreaterThan(0))
		expect(onHome.isActive('Home')).toBe(true)

		const onLibrary = new NavBarPageObject('/library')
		await waitFor(() => expect(onLibrary.links.length).toBeGreaterThan(0))
		expect(onLibrary.isActive('Home')).toBe(false)
		expect(onLibrary.isActive('Library')).toBe(true)
	})
})
