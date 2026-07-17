import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { API_URL } from '../api/client'
import { useAuth } from '../context/AuthContext'

interface HealthStatus {
	status: string
	postgres: string
	redis: string
}

export const Home = () => {
	const { user } = useAuth()
	const [health, setHealth] = useState<HealthStatus | null>(null)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		fetch(`${API_URL}/health`)
			.then((res) => res.json())
			.then(setHealth)
			.catch((err) =>
				setError(err instanceof Error ? err.message : String(err)),
			)
	}, [])

	return (
		<div>
			<h1>SaveState</h1>
			{user ? (
				<p>
					Welcome back, <strong>{user.username}</strong>.{' '}
					<Link to="/dashboard">Go to dashboard</Link>
				</p>
			) : (
				<p>
					<Link to="/login">Log in</Link> or{' '}
					<Link to="/register">register</Link> to start tracking.
				</p>
			)}
			<p>Backend health check:</p>
			{error && <pre className="error">{error}</pre>}
			{!error && !health && <p>Loading...</p>}
			{health && <pre>{JSON.stringify(health, null, 2)}</pre>}
		</div>
	)
}
