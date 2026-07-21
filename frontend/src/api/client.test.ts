import { afterEach, describe, expect, it, vi } from 'vitest'
import { api, API_URL } from './client'

const jsonResponse = (
	body: unknown,
	init: { ok?: boolean; statusText?: string } = {},
) => ({
	ok: init.ok ?? true,
	statusText: init.statusText ?? 'OK',
	headers: new Headers({ 'content-type': 'application/json' }),
	json: async () => body,
})

const emptyResponse = (init: { ok?: boolean; statusText?: string } = {}) => ({
	ok: init.ok ?? true,
	statusText: init.statusText ?? 'No Content',
	headers: new Headers(),
	json: async () => {
		throw new Error('json() should not be called for a non-JSON response')
	},
})

describe('api client', () => {
	afterEach(() => {
		vi.unstubAllGlobals()
	})

	it('sends credentials and JSON content-type headers on every request', async () => {
		const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true }))
		vi.stubGlobal('fetch', fetchMock)

		await api.get('/api/ping')

		expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/api/ping`, {
			credentials: 'include',
			headers: { 'Content-Type': 'application/json' },
		})
	})

	it('parses and returns the JSON body on a successful response', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ id: 1 })))

		const result = await api.get<{ id: number }>('/api/thing')

		expect(result).toEqual({ id: 1 })
	})

	it('resolves to null without calling json() when the response has no JSON content-type', async () => {
		const response = emptyResponse()
		const jsonSpy = vi.spyOn(response, 'json')
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response))

		const result = await api.del('/api/thing/1')

		expect(result).toBeNull()
		expect(jsonSpy).not.toHaveBeenCalled()
	})

	it('throws the server-provided error message on a non-OK JSON response', async () => {
		vi.stubGlobal(
			'fetch',
			vi
				.fn()
				.mockResolvedValue(
					jsonResponse(
						{ error: 'Invalid credentials' },
						{ ok: false, statusText: 'Bad Request' },
					),
				),
		)

		await expect(api.get('/api/auth/login')).rejects.toThrow(
			'Invalid credentials',
		)
	})

	it('falls back to statusText when a non-OK response has no error field', async () => {
		vi.stubGlobal(
			'fetch',
			vi
				.fn()
				.mockResolvedValue(
					emptyResponse({ ok: false, statusText: 'Internal Server Error' }),
				),
		)

		await expect(api.get('/api/thing')).rejects.toThrow('Internal Server Error')
	})

	it('sends a JSON-stringified body and the right method for post/patch', async () => {
		const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: 1 }))
		vi.stubGlobal('fetch', fetchMock)

		await api.post('/api/entries', { game_id: 1 })
		expect(fetchMock).toHaveBeenLastCalledWith(
			`${API_URL}/api/entries`,
			expect.objectContaining({
				method: 'POST',
				body: JSON.stringify({ game_id: 1 }),
			}),
		)

		await api.patch('/api/entries/1', { rating: 8 })
		expect(fetchMock).toHaveBeenLastCalledWith(
			`${API_URL}/api/entries/1`,
			expect.objectContaining({
				method: 'PATCH',
				body: JSON.stringify({ rating: 8 }),
			}),
		)
	})

	it('sends the DELETE method with no body', async () => {
		const fetchMock = vi.fn().mockResolvedValue(emptyResponse())
		vi.stubGlobal('fetch', fetchMock)

		await api.del('/api/entries/1')

		expect(fetchMock).toHaveBeenLastCalledWith(
			`${API_URL}/api/entries/1`,
			expect.objectContaining({ method: 'DELETE' }),
		)
	})
})
