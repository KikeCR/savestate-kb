import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { NavBar } from './NavBar'

export const ProtectedRoute = ({ children }: { children: ReactNode }) => {
	const { user, loading } = useAuth()

	if (loading) return <p>Loading...</p>
	if (!user) return <Navigate to="/login" replace />

	return (
		<>
			<NavBar />
			{children}
		</>
	)
}
