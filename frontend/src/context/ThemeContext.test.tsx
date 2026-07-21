import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ThemeProvider, useTheme } from './ThemeContext'
import { setStoredTheme } from '../test/render'

describe('ThemeContext', () => {
	it('throws when useTheme is called outside a ThemeProvider', () => {
		expect(() => renderHook(() => useTheme())).toThrow(
			'useTheme must be used within ThemeProvider',
		)
	})

	it('defaults isDarkMode to false', () => {
		const { result } = renderHook(() => useTheme(), { wrapper: ThemeProvider })

		expect(result.current.isDarkMode).toBe(false)
		expect(document.documentElement.classList.contains('dark')).toBe(false)
	})

	it('respects a seeded theme value in localStorage', () => {
		setStoredTheme(true)

		const { result } = renderHook(() => useTheme(), { wrapper: ThemeProvider })

		expect(result.current.isDarkMode).toBe(true)
	})

	it('toggleTheme flips state and toggles the dark class on <html>', () => {
		const { result } = renderHook(() => useTheme(), { wrapper: ThemeProvider })

		act(() => {
			result.current.toggleTheme()
		})

		expect(result.current.isDarkMode).toBe(true)
		expect(document.documentElement.classList.contains('dark')).toBe(true)

		act(() => {
			result.current.toggleTheme()
		})

		expect(result.current.isDarkMode).toBe(false)
		expect(document.documentElement.classList.contains('dark')).toBe(false)
	})
})
