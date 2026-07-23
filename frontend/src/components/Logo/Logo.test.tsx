import { describe, expect, it } from 'vitest'
import { LogoPageObject } from '../../test/page-objects/LogoPageObject'

describe('Logo', () => {
	it('renders the SaveState wordmark', () => {
		const logo = new LogoPageObject()

		expect(logo.text).toBe('SaveState')
	})

	it('always links to home, regardless of auth state', () => {
		const logo = new LogoPageObject()

		expect(logo.href).toBe('/')
	})
})
