import { screen } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from '../../components/ProtectedRoute'
import { renderWithProviders } from '../render'

export class ProtectedRoutePageObject {
	constructor(route = '/protected') {
		renderWithProviders(
			<Routes>
				<Route
					path="/protected"
					element={
						<ProtectedRoute>
							<p>Secret content</p>
						</ProtectedRoute>
					}
				/>
				<Route path="/login" element={<p>Login page</p>} />
			</Routes>,
			{ route },
		)
	}

	get isLoading() {
		return screen.queryByText('Loading...') !== null
	}

	get isRedirectedToLogin() {
		return screen.queryByText('Login page') !== null
	}

	get showsProtectedContent() {
		return screen.queryByText('Secret content') !== null
	}
}
