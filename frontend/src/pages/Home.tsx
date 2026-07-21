import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export const Home = () => {
	const { user } = useAuth()

	return (
		<div>
			<h1>Track your backlog. Beat your games. Compare with friends.</h1>
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
		</div>
	)
}
