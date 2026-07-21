import { waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../../api/client'
import { mockAuthMe, mockUser } from '../../test/mockApi'
import { ProtectedRoutePageObject } from '../../test/page-objects/ProtectedRoutePageObject'

vi.mock('../../api/client', () => ({
	api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), del: vi.fn() },
}))

const mockedApi = vi.mocked(api)

beforeEach(() => {
	mockedApi.get.mockReset()
})

describe('ProtectedRoute', () => {
	it('shows a loading state while the auth check is in flight', () => {
		mockedApi.get.mockReturnValue(new Promise(() => {}))

		const route = new ProtectedRoutePageObject()

		expect(route.isLoading).toBe(true)
	})

	it('redirects to /login when there is no authenticated user', async () => {
		mockAuthMe(mockedApi, null)

		const route = new ProtectedRoutePageObject()

		await waitFor(() => expect(route.isRedirectedToLogin).toBe(true))
		expect(route.showsProtectedContent).toBe(false)
	})

	it('renders the protected children when authenticated', async () => {
		mockAuthMe(mockedApi, mockUser)

		const route = new ProtectedRoutePageObject()

		await waitFor(() => expect(route.showsProtectedContent).toBe(true))
	})
})
