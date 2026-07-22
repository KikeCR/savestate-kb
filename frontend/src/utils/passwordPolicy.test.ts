import { describe, expect, it } from 'vitest'
import { passwordPolicyError } from './passwordPolicy'

describe('passwordPolicyError', () => {
	it('rejects a password that is too short', () => {
		expect(passwordPolicyError('Sh0rt!')).toContain('password must contain')
	})

	it('rejects a password missing an uppercase letter', () => {
		expect(passwordPolicyError('lowercase123!')).toContain(
			'password must contain',
		)
	})

	it('rejects a password missing a special character', () => {
		expect(passwordPolicyError('NoSpecial123')).toContain(
			'password must contain',
		)
	})

	it('accepts a password meeting all requirements', () => {
		expect(passwordPolicyError('ValidPass123!')).toBeNull()
	})
})
