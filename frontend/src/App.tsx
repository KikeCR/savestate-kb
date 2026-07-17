import { Route, Routes } from 'react-router-dom'
import { Footer } from './components/Footer'
import { NavBar } from './components/NavBar'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Activity } from './pages/Activity'
import { Board } from './pages/Board'
import { Dashboard } from './pages/Dashboard'
import { Home } from './pages/Home'
import { Leaderboards } from './pages/Leaderboards'
import { Library } from './pages/Library'
import { Login } from './pages/Login'
import { Profile } from './pages/Profile'
import { Register } from './pages/Register'

export const App = () => {
	return (
		<div className="app">
			<NavBar />
			<Routes>
				<Route path="/" element={<Home />} />
				<Route path="/login" element={<Login />} />
				<Route path="/register" element={<Register />} />
				<Route path="/profile/:username" element={<Profile />} />
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
				<Route
					path="/leaderboards"
					element={
						<ProtectedRoute>
							<Leaderboards />
						</ProtectedRoute>
					}
				/>
				<Route
					path="/activity"
					element={
						<ProtectedRoute>
							<Activity />
						</ProtectedRoute>
					}
				/>
			</Routes>
			<Footer />
		</div>
	)
}
