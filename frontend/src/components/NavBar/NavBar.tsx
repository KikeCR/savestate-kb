import {
	Activity as ActivityIcon,
	KanbanSquare,
	LayoutDashboard,
	Library as LibraryIcon,
	LogOut,
	Trophy,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import './NavBar.css'

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
			<Link to="/dashboard">
				<LayoutDashboard size={16} /> Dashboard
			</Link>
			<Link to="/library">
				<LibraryIcon size={16} /> Library
			</Link>
			<Link to="/board">
				<KanbanSquare size={16} /> Board
			</Link>
			<Link to="/leaderboards">
				<Trophy size={16} /> Leaderboards
			</Link>
			<Link to="/activity">
				<ActivityIcon size={16} /> Activity
			</Link>
			<span className="nav-bar__spacer" />
			<Link to={`/profile/${user.username}`} className="nav-bar__user">
				{user.username}
			</Link>
			<button onClick={handleLogout}>
				<LogOut size={14} /> Log out
			</button>
		</nav>
	)
}
