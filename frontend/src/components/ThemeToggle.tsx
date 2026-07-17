import { useTheme } from '../context/ThemeContext'

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
			{isDarkMode ? '☀️' : '🌙'}
		</button>
	)
}
