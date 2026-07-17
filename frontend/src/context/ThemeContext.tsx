import { createContext, useContext, useEffect, type ReactNode } from 'react'
import { useToggleState } from '../hooks/useToggleState'

interface ThemeContextValue {
	isDarkMode: boolean
	toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
	const [isDarkMode, toggleTheme] = useToggleState('theme', false)

	useEffect(() => {
		document.documentElement.classList.toggle('dark', isDarkMode)
	}, [isDarkMode])

	return (
		<ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
			{children}
		</ThemeContext.Provider>
	)
}

export const useTheme = () => {
	const ctx = useContext(ThemeContext)
	if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
	return ctx
}
