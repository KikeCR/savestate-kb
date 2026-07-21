import { waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import { mockAuthMe, mockUser } from '../test/mockApi'
import { HomePageObject } from '../test/page-objects/HomePageObject'

vi.mock('../api/client', () => ({
	api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), del: vi.fn() },
	API_URL: 'http://localhost:5000',
}))

const mockedApi = vi.mocked(api)
const healthPayload = { status: 'ok', postgres: 'ok', redis: 'ok' }

beforeEach(() => {
	mockedApi.get.mockReset()
	vi.unstubAllGlobals()
})

describe('Home', () => {
	it('shows login/register links when logged out', async () => {
		mockAuthMe(mockedApi, null)
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({ json: async () => healthPayload }),
		)

		const home = new HomePageObject()

		await waitFor(() => expect(home.hasLoginLink).toBe(true))
		expect(home.hasDashboardLink).toBe(false)
		expect(home.showsWelcomeBack).toBe(false)
	})

	it('shows a welcome message and dashboard link when logged in', async () => {
		mockAuthMe(mockedApi, mockUser)
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({ json: async () => healthPayload }),
		)

		const home = new HomePageObject()

		await waitFor(() => expect(home.hasDashboardLink).toBe(true))
		expect(home.showsWelcomeBack).toBe(true)
	})

	it('shows the health payload once the fetch resolves', async () => {
		mockAuthMe(mockedApi, null)
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({ json: async () => healthPayload }),
		)

		const home = new HomePageObject()

		await waitFor(() => expect(home.healthJsonText).toContain('"status": "ok"'))
	})

	it('shows an error message when the health fetch rejects', async () => {
		mockAuthMe(mockedApi, null)
		vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network down')))

		const home = new HomePageObject()

		await waitFor(() => expect(home.healthErrorText).toBe('Network down'))
	})
})
