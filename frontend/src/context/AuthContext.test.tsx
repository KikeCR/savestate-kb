import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider, useAuth } from './AuthContext'
import { api } from '../api/client'
import { mockUser } from '../test/mockApi'

vi.mock('../api/client', () => ({
	api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), del: vi.fn() },
}))

const mockedApi = vi.mocked(api)

beforeEach(() => {
	mockedApi.get.mockReset()
	mockedApi.post.mockReset()
	mockedApi.patch.mockReset()
	mockedApi.del.mockReset()
})

describe('AuthContext', () => {
	it('throws when useAuth is called outside an AuthProvider', () => {
		expect(() => renderHook(() => useAuth())).toThrow(
			'useAuth must be used within AuthProvider',
		)
	})

	it('fetches the current user on mount and flips loading false on success', async () => {
		mockedApi.get.mockResolvedValueOnce({ user: mockUser })

		const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })

		expect(result.current.loading).toBe(true)
		await waitFor(() => expect(result.current.loading).toBe(false))

		expect(mockedApi.get).toHaveBeenCalledWith('/api/auth/me')
		expect(result.current.user).toEqual(mockUser)
	})

	it('sets user to null (without throwing) when the initial fetch rejects', async () => {
		mockedApi.get.mockRejectedValueOnce(new Error('network error'))

		const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })

		await waitFor(() => expect(result.current.loading).toBe(false))
		expect(result.current.user).toBeNull()
	})

	it('register posts to /api/auth/register and sets the returned user', async () => {
		mockedApi.get.mockResolvedValueOnce({ user: null })
		mockedApi.post.mockResolvedValueOnce(mockUser)

		const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })
		await waitFor(() => expect(result.current.loading).toBe(false))

		await act(async () => {
			await result.current.register('jane@example.com', 'jane', 'password123')
		})

		expect(mockedApi.post).toHaveBeenCalledWith('/api/auth/register', {
			email: 'jane@example.com',
			username: 'jane',
			password: 'password123',
		})
		expect(result.current.user).toEqual(mockUser)
	})

	it('login posts to /api/auth/login and sets the returned user', async () => {
		mockedApi.get.mockResolvedValueOnce({ user: null })
		mockedApi.post.mockResolvedValueOnce(mockUser)

		const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })
		await waitFor(() => expect(result.current.loading).toBe(false))

		await act(async () => {
			await result.current.login('jane@example.com', 'password123')
		})

		expect(mockedApi.post).toHaveBeenCalledWith('/api/auth/login', {
			email: 'jane@example.com',
			password: 'password123',
		})
		expect(result.current.user).toEqual(mockUser)
	})

	it('logout posts to /api/auth/logout and clears the user', async () => {
		mockedApi.get.mockResolvedValueOnce({ user: mockUser })
		mockedApi.post.mockResolvedValueOnce(undefined)

		const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })
		await waitFor(() => expect(result.current.user).toEqual(mockUser))

		await act(async () => {
			await result.current.logout()
		})

		expect(mockedApi.post).toHaveBeenCalledWith('/api/auth/logout')
		expect(result.current.user).toBeNull()
	})

	it('updateProfile patches /api/auth/me with the given fields and updates the user', async () => {
		mockedApi.get.mockResolvedValueOnce({ user: mockUser })
		const updatedUser = { ...mockUser, profile_visibility: 'private' as const }
		mockedApi.patch.mockResolvedValueOnce(updatedUser)

		const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })
		await waitFor(() => expect(result.current.user).toEqual(mockUser))

		await act(async () => {
			await result.current.updateProfile({ profile_visibility: 'private' })
		})

		expect(mockedApi.patch).toHaveBeenCalledWith('/api/auth/me', {
			profile_visibility: 'private',
		})
		expect(result.current.user).toEqual(updatedUser)
	})
})
