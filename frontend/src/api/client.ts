const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

interface RequestOptions extends RequestInit {
	headers?: Record<string, string>
}

async function request<T>(
	path: string,
	options: RequestOptions = {},
): Promise<T> {
	const res = await fetch(`${API_URL}${path}`, {
		credentials: 'include',
		headers: {
			'Content-Type': 'application/json',
			...options.headers,
		},
		...options,
	})

	let body: unknown = null
	const contentType = res.headers.get('content-type') || ''
	if (contentType.includes('application/json')) {
		body = await res.json()
	}

	if (!res.ok) {
		const message = (body as { error?: string } | null)?.error || res.statusText
		throw new Error(message)
	}

	return body as T
}

export const api = {
	get: <T>(path: string) => request<T>(path),
	post: <T>(path: string, data?: unknown) =>
		request<T>(path, { method: 'POST', body: JSON.stringify(data) }),
	patch: <T>(path: string, data?: unknown) =>
		request<T>(path, { method: 'PATCH', body: JSON.stringify(data) }),
	del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}

export { API_URL }
