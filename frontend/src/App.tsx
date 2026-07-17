import { Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Board } from './pages/Board'
import { Dashboard } from './pages/Dashboard'
import { Home } from './pages/Home'
import { Library } from './pages/Library'
import { Login } from './pages/Login'
import { Register } from './pages/Register'

export const App = () => {
	return (
		<div className="app">
			<Routes>
				<Route path="/" element={<Home />} />
				<Route path="/login" element={<Login />} />
				<Route path="/register" element={<Register />} />
				<Route
					path="/dashboard"
					element={
						<ProtectedRoute>
							<Dashboard />
						</ProtectedRoute>
					}
				/>
				<Route
					path="/library"
					element={
						<ProtectedRoute>
							<Library />
						</ProtectedRoute>
					}
				/>
				<Route
					path="/board"
					element={
						<ProtectedRoute>
							<Board />
						</ProtectedRoute>
					}
				/>
			</Routes>
		</div>
	)
}
