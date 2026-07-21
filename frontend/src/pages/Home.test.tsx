import { waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import { mockAuthMe, mockUser } from '../test/mockApi'
import { HomePageObject } from '../test/page-objects/HomePageObject'

vi.mock('../api/client', () => ({
	api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), del: vi.fn() },
}))

const mockedApi = vi.mocked(api)

beforeEach(() => {
	mockedApi.get.mockReset()
})

describe('Home', () => {
	it('shows login/register links when logged out', async () => {
		mockAuthMe(mockedApi, null)

		const home = new HomePageObject()

		await waitFor(() => expect(home.hasLoginLink).toBe(true))
		expect(home.hasDashboardLink).toBe(false)
		expect(home.showsWelcomeBack).toBe(false)
	})

	it('shows a welcome message and dashboard link when logged in', async () => {
		mockAuthMe(mockedApi, mockUser)

		const home = new HomePageObject()

		await waitFor(() => expect(home.hasDashboardLink).toBe(true))
		expect(home.showsWelcomeBack).toBe(true)
	})
})
