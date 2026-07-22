import {
	Activity as ActivityIcon,
	Home as HomeIcon,
	KanbanSquare,
	LayoutDashboard,
	Library as LibraryIcon,
	LogOut,
	Sparkles,
	Trophy,
} from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Avatar } from '../Avatar'
import './NavBar.css'

const navLinkClassName = ({ isActive }: { isActive: boolean }) =>
	isActive ? 'active' : undefined

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
			<NavLink to="/" end aria-label="Home" className={navLinkClassName}>
				<HomeIcon size={16} /> <span>Home</span>
			</NavLink>
			<NavLink
				to="/dashboard"
				aria-label="Dashboard"
				className={navLinkClassName}
			>
				<LayoutDashboard size={16} /> <span>Dashboard</span>
			</NavLink>
			<NavLink to="/library" aria-label="Library" className={navLinkClassName}>
				<LibraryIcon size={16} /> <span>Library</span>
			</NavLink>
			<NavLink to="/board" aria-label="Board" className={navLinkClassName}>
				<KanbanSquare size={16} /> <span>Board</span>
			</NavLink>
			<NavLink
				to="/leaderboards"
				aria-label="Leaderboards"
				className={navLinkClassName}
			>
				<Trophy size={16} /> <span>Leaderboards</span>
			</NavLink>
			<NavLink
				to="/activity"
				aria-label="Activity"
				className={navLinkClassName}
			>
				<ActivityIcon size={16} /> <span>Activity</span>
			</NavLink>
			<NavLink
				to="/recommendations"
				aria-label="Recommendations"
				className={navLinkClassName}
			>
				<Sparkles size={16} /> <span>For You</span>
			</NavLink>
			<span className="nav-bar__spacer" />
			<NavLink
				to={`/profile/${user.username}`}
				className={({ isActive }) =>
					isActive ? 'nav-bar__user active' : 'nav-bar__user'
				}
				aria-label={user.username}
			>
				<Avatar
					username={user.username}
					avatarUrl={user.avatar_url}
					size={20}
				/>{' '}
				<span>{user.username}</span>
			</NavLink>
			<button onClick={handleLogout} aria-label="Log out">
				<LogOut size={14} /> <span>Log out</span>
			</button>
		</nav>
	)
}
