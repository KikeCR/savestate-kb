import { Gamepad2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import './Logo.css'

export const Logo = () => {
	const { user } = useAuth()

	return (
		<Link
			to={user ? '/dashboard' : '/login'}
			className="logo"
			aria-label="SaveState home"
		>
			<Gamepad2 size={24} className="logo__icon" />
			<span className="logo__text">SaveState</span>
		</Link>
	)
}
