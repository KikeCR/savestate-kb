import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'
import './ThemeToggle.css'

export const ThemeToggle = () => {
	const { isDarkMode, toggleTheme } = useTheme()

	return (
		<button
			type="button"
			className="theme-toggle"
			onClick={toggleTheme}
			aria-label={isDarkMode ? 'Switch to light theme' : 'Switch to dark theme'}
			title={isDarkMode ? 'Switch to light theme' : 'Switch to dark theme'}
		>
			{isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
		</button>
	)
}
