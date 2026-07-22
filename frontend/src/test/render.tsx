import type { ReactElement } from 'react'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import { AuthProvider } from '../context/AuthContext'
import { ThemeProvider } from '../context/ThemeContext'
import { ToastProvider } from '../context/ToastContext'

interface RenderOptions {
	route?: string
	withAuth?: boolean
}

// AuthProvider fires a real `api.get('/api/auth/me')` unconditionally on
// mount, so `withAuth` defaults to true but must be turned off for anything
// that doesn't call useAuth() — otherwise every such test would need an
// api/client mock it doesn't actually care about.
export const renderWithProviders = (
	ui: ReactElement,
	{ route = '/', withAuth = true }: RenderOptions = {},
) => {
	const tree = withAuth ? <AuthProvider>{ui}</AuthProvider> : ui

	return render(
		<ThemeProvider>
			<MemoryRouter initialEntries={[route]}>
				<ToastProvider>{tree}</ToastProvider>
			</MemoryRouter>
		</ThemeProvider>,
	)
}

export const setStoredTheme = (isDarkMode: boolean) => {
	localStorage.setItem('theme', JSON.stringify(isDarkMode))
}
