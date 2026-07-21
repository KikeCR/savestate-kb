import { waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../../api/client'
import { FollowButtonPageObject } from '../../test/page-objects/FollowButtonPageObject'

vi.mock('../../api/client', () => ({
	api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), del: vi.fn() },
}))

const mockedApi = vi.mocked(api)

beforeEach(() => {
	mockedApi.get.mockReset()
	mockedApi.post.mockReset()
	mockedApi.patch.mockReset()
	mockedApi.del.mockReset()
})

describe('FollowButton', () => {
	it('shows Follow and posts to the follow endpoint when clicked', async () => {
		mockedApi.post.mockResolvedValueOnce({
			is_following: true,
			follower_count: 5,
		})
		const onToggle = vi.fn()
		const button = new FollowButtonPageObject({
			username: 'jane',
			isFollowing: false,
			onToggle,
		})

		expect(button.label).toBe('Follow')
		await button.click()

		expect(mockedApi.post).toHaveBeenCalledWith('/api/users/jane/follow')
		expect(onToggle).toHaveBeenCalledWith({
			is_following: true,
			follower_count: 5,
		})
	})

	it('shows Unfollow and deletes the follow relationship when clicked', async () => {
		mockedApi.del.mockResolvedValueOnce({
			is_following: false,
			follower_count: 4,
		})
		const onToggle = vi.fn()
		const button = new FollowButtonPageObject({
			username: 'jane',
			isFollowing: true,
			onToggle,
		})

		expect(button.label).toBe('Unfollow')
		await button.click()

		expect(mockedApi.del).toHaveBeenCalledWith('/api/users/jane/follow')
		expect(onToggle).toHaveBeenCalledWith({
			is_following: false,
			follower_count: 4,
		})
	})

	it('disables the button while pending and re-enables once the request settles', async () => {
		let resolveRequest!: (value: {
			is_following: boolean
			follower_count: number
		}) => void
		mockedApi.post.mockReturnValueOnce(
			new Promise((resolve) => {
				resolveRequest = resolve
			}),
		)
		const button = new FollowButtonPageObject({
			username: 'jane',
			isFollowing: false,
			onToggle: vi.fn(),
		})

		await button.click()
		expect(button.isDisabled).toBe(true)

		resolveRequest({ is_following: true, follower_count: 5 })
		await waitFor(() => expect(button.isDisabled).toBe(false))
	})

	it('calls onError with the failure message and still re-enables the button', async () => {
		mockedApi.post.mockRejectedValueOnce(new Error('Already following'))
		const onError = vi.fn()
		const button = new FollowButtonPageObject({
			username: 'jane',
			isFollowing: false,
			onToggle: vi.fn(),
			onError,
		})

		await button.click()

		await waitFor(() =>
			expect(onError).toHaveBeenCalledWith('Already following'),
		)
		expect(button.isDisabled).toBe(false)
	})
})
