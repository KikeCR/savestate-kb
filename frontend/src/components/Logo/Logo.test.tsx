import { waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../../api/client'
import { authMeRoute, mockGetRoutes, mockUser } from '../../test/mockApi'
import { LogoPageObject } from '../../test/page-objects/LogoPageObject'

vi.mock('../../api/client', () => ({
	api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), del: vi.fn() },
}))

const mockedApi = vi.mocked(api)

beforeEach(() => {
	mockedApi.get.mockReset()
})

describe('Logo', () => {
	it('renders the SaveState wordmark', () => {
		mockGetRoutes(mockedApi, authMeRoute(null))
		const logo = new LogoPageObject()

		expect(logo.text).toBe('SaveState')
	})

	it('links to login when logged out', async () => {
		mockGetRoutes(mockedApi, authMeRoute(null))
		const logo = new LogoPageObject()

		await waitFor(() => expect(logo.href).toBe('/login'))
	})

	it('links to the dashboard when logged in', async () => {
		mockGetRoutes(mockedApi, authMeRoute(mockUser))
		const logo = new LogoPageObject()

		await waitFor(() => expect(logo.href).toBe('/dashboard'))
	})
})
