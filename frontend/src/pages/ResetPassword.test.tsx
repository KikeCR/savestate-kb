import { waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import { mockAuthMe, mockUser } from '../test/mockApi'
import { ResetPasswordPageObject } from '../test/page-objects/ResetPasswordPageObject'

vi.mock('../api/client', () => ({
	api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), del: vi.fn() },
}))

const mockedApi = vi.mocked(api)

beforeEach(() => {
	mockedApi.get.mockReset()
	mockedApi.post.mockReset()
})

describe('ResetPassword', () => {
	it('resets the password and navigates to /dashboard on success', async () => {
		mockAuthMe(mockedApi, null)
		mockedApi.post.mockResolvedValueOnce(mockUser)
		const page = new ResetPasswordPageObject('abc123')

		await page.fillPassword('NewPass123!')
		await page.fillConfirmPassword('NewPass123!')
		await page.submit()

		expect(mockedApi.post).toHaveBeenCalledWith('/api/auth/reset-password', {
			token: 'abc123',
			password: 'NewPass123!',
		})
		await waitFor(() => expect(page.isOnDashboard).toBe(true))
	})

	it('rejects mismatched passwords without calling the API', async () => {
		mockAuthMe(mockedApi, null)
		const page = new ResetPasswordPageObject('abc123')

		await page.fillPassword('NewPass123!')
		await page.fillConfirmPassword('Mismatch123!')
		await page.submit()

		expect(page.errorMessage).toContain('do not match')
		expect(mockedApi.post).not.toHaveBeenCalled()
	})

	it('rejects a policy-violating password without calling the API', async () => {
		mockAuthMe(mockedApi, null)
		const page = new ResetPasswordPageObject('abc123')

		await page.fillPassword('weakpass')
		await page.fillConfirmPassword('weakpass')
		await page.submit()

		expect(page.errorMessage).toContain('password must contain')
		expect(mockedApi.post).not.toHaveBeenCalled()
	})

	it('shows the server error for an expired or invalid token', async () => {
		mockAuthMe(mockedApi, null)
		mockedApi.post.mockRejectedValueOnce(
			new Error('this reset link is invalid or has expired'),
		)
		const page = new ResetPasswordPageObject('expired-token')

		await page.fillPassword('NewPass123!')
		await page.fillConfirmPassword('NewPass123!')
		await page.submit()

		await waitFor(() =>
			expect(page.errorMessage).toBe(
				'this reset link is invalid or has expired',
			),
		)
	})
})
