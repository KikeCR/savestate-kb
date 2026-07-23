import { vi } from 'vitest'
import type { api } from '../api/client'
import type { User } from '../types'

type ApiClient = typeof api
type MockedFn = (...args: never[]) => Promise<unknown>

// `vi.mock('.../api/client')` must stay a per-file call for Vitest's hoisting
// to work at each import depth (page tests vs. component tests vs. kanban/
// subfolder tests all resolve to the same mocked module regardless of how
// deep their relative import is). Centralizing that call here instead would
// auto-mock api.get/post/patch/del for every test file, including ones that
// never render through AuthProvider, and any test that forgot to queue a
// resolved value before mounting it would crash on `undefined.then(...)`
// instead of failing with a clear "unmocked path" error. So this file only
// centralizes the repetitive fixtures/wiring that sits on top of each file's
// own vi.mock() call.

export const mockUser: User = {
	id: 1,
	email: 'jane@example.com',
	username: 'jane',
	profile_visibility: 'public',
	avatar_url: null,
	preferred_platforms: [],
	created_at: '2024-01-01T00:00:00.000Z',
}

export const mockPrivateUser: User = {
	...mockUser,
	id: 2,
	username: 'privatejane',
	profile_visibility: 'private',
}

export const mockOtherUser: User = {
	id: 3,
	email: 'sam@example.com',
	username: 'sam',
	profile_visibility: 'public',
	avatar_url: null,
	preferred_platforms: [],
	created_at: '2024-02-01T00:00:00.000Z',
}

// Registers a path -> response dispatcher on api.get. A single
// mockImplementation (rather than chained mockResolvedValueOnce calls) avoids
// relying on the order in which requests actually fire: React runs effects
// bottom-up on mount, so a page's own on-mount fetch can resolve before or
// after AuthProvider's `/api/auth/me` fetch depending on where in the tree it
// sits. Queuing responses by call order would silently hand the wrong
// response to the wrong caller whenever a test wraps a page that fetches on
// its own mount in AuthProvider (Profile, FollowList, Dashboard all do this).
export const mockGetRoutes = (
	client: ApiClient,
	routes: Record<string, unknown>,
) => {
	vi.mocked(client.get).mockImplementation(((path: string) => {
		if (path in routes) {
			const value = routes[path]
			return value instanceof Error
				? Promise.reject(value)
				: Promise.resolve(value)
		}
		return Promise.reject(new Error(`Unmocked GET ${path}`))
	}) as ApiClient['get'])
}

export const authMeRoute = (user: User | null = mockUser) => ({
	'/api/auth/me': { user },
})

// Wires the `/api/auth/me` call every AuthProvider mount makes. Pass
// user: null to simulate a logged-out session. For a page that also fetches
// its own data on mount, use mockGetRoutes({ ...authMeRoute(user), ... })
// instead so both routes are dispatched by path rather than call order.
export const mockAuthMe = (client: ApiClient, user: User | null = mockUser) => {
	mockGetRoutes(client, authMeRoute(user))
}

export const mockApiSuccess = (fn: MockedFn, data: unknown) =>
	vi.mocked(fn).mockResolvedValueOnce(data)

export const mockApiError = (fn: MockedFn, message: string) =>
	vi.mocked(fn).mockRejectedValueOnce(new Error(message))
