import { waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import { mockAuthMe, mockUser } from '../test/mockApi'
import { LoginPageObject } from '../test/page-objects/LoginPageObject'

vi.mock('../api/client', () => ({
	api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), del: vi.fn() },
}))

const mockedApi = vi.mocked(api)

beforeEach(() => {
	mockedApi.get.mockReset()
	mockedApi.post.mockReset()
})

describe('Login', () => {
	it('logs in and navigates to /dashboard on success', async () => {
		mockAuthMe(mockedApi, null)
		mockedApi.post.mockResolvedValueOnce(mockUser)
		const login = new LoginPageObject()

		await login.fillEmail('jane@example.com')
		await login.fillPassword('password123')
		await login.submit()

		expect(mockedApi.post).toHaveBeenCalledWith('/api/auth/login', {
			email: 'jane@example.com',
			password: 'password123',
		})
		await waitFor(() => expect(login.isOnDashboard).toBe(true))
	})

	it('shows an error message and re-enables the button on failure', async () => {
		mockAuthMe(mockedApi, null)
		mockedApi.post.mockRejectedValueOnce(new Error('Invalid credentials'))
		const login = new LoginPageObject()

		await login.fillEmail('jane@example.com')
		await login.fillPassword('wrong-password')
		await login.submit()

		await waitFor(() => expect(login.errorMessage).toBe('Invalid credentials'))
		expect(login.isSubmitDisabled).toBe(false)
	})

	it('shows "Logging in..." and disables the button while submitting', async () => {
		mockAuthMe(mockedApi, null)
		let resolveLogin!: (value: unknown) => void
		mockedApi.post.mockReturnValueOnce(
			new Promise((resolve) => {
				resolveLogin = resolve
			}),
		)
		const login = new LoginPageObject()

		await login.fillEmail('jane@example.com')
		await login.fillPassword('password123')
		await login.submit()

		expect(login.submitButtonText).toBe('Logging in...')
		expect(login.isSubmitDisabled).toBe(true)

		resolveLogin(mockUser)
	})

	it('links to the forgot-password page', async () => {
		mockAuthMe(mockedApi, null)
		const login = new LoginPageObject()

		expect(login.forgotPasswordLink.getAttribute('href')).toBe(
			'/forgot-password',
		)
	})
})
