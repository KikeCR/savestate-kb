import { waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import { mockAuthMe } from '../test/mockApi'
import { ForgotPasswordPageObject } from '../test/page-objects/ForgotPasswordPageObject'

vi.mock('../api/client', () => ({
	api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), del: vi.fn() },
}))

const mockedApi = vi.mocked(api)

beforeEach(() => {
	mockedApi.get.mockReset()
	mockedApi.post.mockReset()
})

describe('ForgotPassword', () => {
	it('submits the email and shows a generic confirmation on success', async () => {
		mockAuthMe(mockedApi, null)
		mockedApi.post.mockResolvedValueOnce(undefined)
		const page = new ForgotPasswordPageObject()

		await page.fillEmail('jane@example.com')
		await page.submit()

		expect(mockedApi.post).toHaveBeenCalledWith('/api/auth/forgot-password', {
			email: 'jane@example.com',
		})
		await waitFor(() => expect(page.confirmationText).not.toBeNull())
	})

	it('shows an error message on failure', async () => {
		mockAuthMe(mockedApi, null)
		mockedApi.post.mockRejectedValueOnce(new Error('something went wrong'))
		const page = new ForgotPasswordPageObject()

		await page.fillEmail('jane@example.com')
		await page.submit()

		await waitFor(() => expect(page.errorMessage).toBe('something went wrong'))
	})

	it('shows "Sending..." and disables the button while submitting', async () => {
		mockAuthMe(mockedApi, null)
		let resolveRequest!: (value: unknown) => void
		mockedApi.post.mockReturnValueOnce(
			new Promise((resolve) => {
				resolveRequest = resolve
			}),
		)
		const page = new ForgotPasswordPageObject()

		await page.fillEmail('jane@example.com')
		await page.submit()

		expect(page.submitButtonText).toBe('Sending...')

		resolveRequest(undefined)
	})
})
