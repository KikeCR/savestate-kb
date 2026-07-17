import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export const Dashboard = () => {
	const { user, logout } = useAuth()
	const navigate = useNavigate()

	if (!user) return null

	const handleLogout = async () => {
		await logout()
		navigate('/login')
	}

	return (
		<div>
			<h1>Dashboard</h1>
			<p>
				Logged in as <strong>{user.username}</strong> ({user.email})
			</p>
			<p>
				<Link to="/library">Go to my library</Link>
			</p>
			<button onClick={handleLogout}>Log out</button>
		</div>
	)
}
