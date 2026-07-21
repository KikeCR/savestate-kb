import { describe, expect, it } from 'vitest'
import { ThemeTogglePageObject } from '../../test/page-objects/ThemeTogglePageObject'

describe('ThemeToggle', () => {
	it('defaults to a switch-to-dark label', () => {
		const toggle = new ThemeTogglePageObject()

		expect(toggle.ariaLabel).toBe('Switch to dark theme')
	})

	it('flips the label and persists the theme to localStorage on click', async () => {
		const toggle = new ThemeTogglePageObject()

		await toggle.click()

		expect(toggle.ariaLabel).toBe('Switch to light theme')
		expect(localStorage.getItem('theme')).toBe(JSON.stringify(true))
	})
})
