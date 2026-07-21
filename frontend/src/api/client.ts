const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
const SAFE_METHODS = new Set(['GET', 'HEAD'])

interface RequestOptions extends RequestInit {
	headers?: Record<string, string>
}

let csrfTokenPromise: Promise<string> | null = null

async function getCsrfToken(): Promise<string> {
	if (!csrfTokenPromise) {
		csrfTokenPromise = fetch(`${API_URL}/api/auth/csrf`, {
			credentials: 'include',
		})
			.then((res) => res.json())
			.then((body) => body.csrf_token as string)
			.catch((err) => {
				// Don't cache a failure — a transient blip on page load would
				// otherwise permanently break every mutating request for the
				// rest of the session.
				csrfTokenPromise = null
				throw err
			})
	}
	return csrfTokenPromise
}

export function _resetCsrfTokenCache() {
	csrfTokenPromise = null
}

async function request<T>(
	path: string,
	options: RequestOptions = {},
): Promise<T> {
	const method = (options.method || 'GET').toUpperCase()
	const headers: Record<string, string> = {
		'Content-Type': 'application/json',
		...options.headers,
	}
	if (!SAFE_METHODS.has(method)) {
		headers['X-CSRFToken'] = await getCsrfToken()
	}

	const res = await fetch(`${API_URL}${path}`, {
		...options,
		credentials: 'include',
		headers,
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
