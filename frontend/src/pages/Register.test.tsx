import { waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import { mockAuthMe, mockUser } from '../test/mockApi'
import { RegisterPageObject } from '../test/page-objects/RegisterPageObject'

vi.mock('../api/client', () => ({
	api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), del: vi.fn() },
}))

const mockedApi = vi.mocked(api)

beforeEach(() => {
	mockedApi.get.mockReset()
	mockedApi.post.mockReset()
})

describe('Register', () => {
	it('marks the password field with a minimum length of 8', () => {
		mockAuthMe(mockedApi, null)
		const register = new RegisterPageObject()

		expect(register.passwordInput.minLength).toBe(8)
	})

	it('registers and navigates to /dashboard on success', async () => {
		mockAuthMe(mockedApi, null)
		mockedApi.post.mockResolvedValueOnce(mockUser)
		const register = new RegisterPageObject()

		await register.fillEmail('jane@example.com')
		await register.fillUsername('jane')
		await register.fillPassword('password123')
		await register.submit()

		expect(mockedApi.post).toHaveBeenCalledWith('/api/auth/register', {
			email: 'jane@example.com',
			username: 'jane',
			password: 'password123',
		})
		await waitFor(() => expect(register.isOnDashboard).toBe(true))
	})

	it('shows an error message on failure', async () => {
		mockAuthMe(mockedApi, null)
		mockedApi.post.mockRejectedValueOnce(new Error('Email already registered'))
		const register = new RegisterPageObject()

		await register.fillEmail('jane@example.com')
		await register.fillUsername('jane')
		await register.fillPassword('password123')
		await register.submit()

		await waitFor(() =>
			expect(register.errorMessage).toBe('Email already registered'),
		)
	})
})
