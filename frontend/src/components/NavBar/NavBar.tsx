import {
	Activity as ActivityIcon,
	KanbanSquare,
	LayoutDashboard,
	Library as LibraryIcon,
	LogOut,
	Sparkles,
	Trophy,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Avatar } from '../Avatar'
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
			<Link to="/dashboard" aria-label="Dashboard">
				<LayoutDashboard size={16} /> <span>Dashboard</span>
			</Link>
			<Link to="/library" aria-label="Library">
				<LibraryIcon size={16} /> <span>Library</span>
			</Link>
			<Link to="/board" aria-label="Board">
				<KanbanSquare size={16} /> <span>Board</span>
			</Link>
			<Link to="/leaderboards" aria-label="Leaderboards">
				<Trophy size={16} /> <span>Leaderboards</span>
			</Link>
			<Link to="/activity" aria-label="Activity">
				<ActivityIcon size={16} /> <span>Activity</span>
			</Link>
			<Link to="/recommendations" aria-label="Recommendations">
				<Sparkles size={16} /> <span>For You</span>
			</Link>
			<span className="nav-bar__spacer" />
			<Link
				to={`/profile/${user.username}`}
				className="nav-bar__user"
				aria-label={user.username}
			>
				<Avatar
					username={user.username}
					avatarUrl={user.avatar_url}
					size={20}
				/>{' '}
				<span>{user.username}</span>
			</Link>
			<button onClick={handleLogout} aria-label="Log out">
				<LogOut size={14} /> <span>Log out</span>
			</button>
		</nav>
	)
}
