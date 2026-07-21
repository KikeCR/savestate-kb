import { describe, expect, it } from 'vitest'
import { AvatarPageObject } from '../../test/page-objects/AvatarPageObject'

describe('Avatar', () => {
	it('renders initials when no avatarUrl is given', () => {
		const avatar = new AvatarPageObject({ username: 'jane' })

		expect(avatar.image).toBeNull()
		expect(avatar.initialsText).toBe('JA')
	})

	it('renders an image when avatarUrl is given', () => {
		const avatar = new AvatarPageObject({
			username: 'jane',
			avatarUrl: 'https://example.com/a.png',
		})

		expect(avatar.image?.src).toBe('https://example.com/a.png')
		expect(avatar.image?.alt).toBe('jane')
	})

	it('falls back to initials when the image fails to load', () => {
		const avatar = new AvatarPageObject({
			username: 'jane',
			avatarUrl: 'https://example.com/broken.png',
		})

		avatar.simulateImageError()

		expect(avatar.image).toBeNull()
		expect(avatar.initialsText).toBe('JA')
	})

	it('uses a deterministic color for the same username', () => {
		const first = new AvatarPageObject({ username: 'jane' })
		const second = new AvatarPageObject({ username: 'jane' })

		expect(first.backgroundColor).not.toBeNull()
		expect(first.backgroundColor).toBe(second.backgroundColor)
	})
})
