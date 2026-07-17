import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export const NavBar = () => {
	const { user, logout } = useAuth()
	const navigate = useNavigate()

	if (!user) return null

	const handleLogout = async () => {
		await logout()
		navigate('/login')
	}

	return (
		<nav className="nav-bar">
			<Link to="/dashboard">Dashboard</Link>
			<Link to="/library">Library</Link>
			<Link to="/board">Board</Link>
			<span className="nav-bar__spacer" />
			<span className="nav-bar__user">{user.username}</span>
			<button onClick={handleLogout}>Log out</button>
		</nav>
	)
}
