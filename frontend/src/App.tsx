import { Route, Routes } from 'react-router-dom'
import './App.css'
import { Footer } from './components/Footer'
import { Logo } from './components/Logo'
import { NavBar } from './components/NavBar'
import { ProtectedRoute } from './components/ProtectedRoute'
import { ThemeToggle } from './components/ThemeToggle'
import { Activity } from './pages/Activity'
import { Board } from './pages/Board'
import { Dashboard } from './pages/Dashboard'
import { FollowersList, FollowingList } from './pages/FollowList'
import { ForgotPassword } from './pages/ForgotPassword'
import { GameDetail } from './pages/GameDetail'
import { Home } from './pages/Home'
import { Leaderboards } from './pages/Leaderboards'
import { Library } from './pages/Library'
import { Login } from './pages/Login'
import { Profile } from './pages/Profile'
import { Recommendations } from './pages/Recommendations'
import { Register } from './pages/Register'
import { ResetPassword } from './pages/ResetPassword'

export const App = () => {
	return (
		<div className="app">
			<div className="top-bar">
				<Logo />
				<ThemeToggle />
			</div>
			<NavBar />
			<main className="app__content">
				<Routes>
					<Route path="/" element={<Home />} />
					<Route path="/login" element={<Login />} />
					<Route path="/register" element={<Register />} />
					<Route path="/forgot-password" element={<ForgotPassword />} />
					<Route path="/reset-password/:token" element={<ResetPassword />} />
					<Route path="/profile/:username" element={<Profile />} />
					<Route
						path="/profile/:username/followers"
						element={<FollowersList />}
					/>
					<Route
						path="/profile/:username/following"
						element={<FollowingList />}
					/>
					<Route path="/games/:id" element={<GameDetail />} />
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
					<Route
						path="/recommendations"
						element={
							<ProtectedRoute>
								<Recommendations />
							</ProtectedRoute>
						}
					/>
				</Routes>
			</main>
			<Footer />
		</div>
	)
}
