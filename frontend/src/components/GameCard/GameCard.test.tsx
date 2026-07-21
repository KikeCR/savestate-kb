import { describe, expect, it } from 'vitest'
import { GameCardPageObject } from '../../test/page-objects/GameCardPageObject'
import { makeEntry } from '../../test/fixtures'

describe('GameCard', () => {
	it('renders the game title and status badge', () => {
		const card = new GameCardPageObject({
			entry: makeEntry({ status: 'completed' }),
		})

		expect(card.title).toBe('Celeste')
		expect(card.statusText).toBe('Completed')
	})

	it('shows a placeholder when the game has no cover image', () => {
		const card = new GameCardPageObject({ entry: makeEntry() })

		expect(card.hasCoverPlaceholder).toBe(true)
		expect(card.coverImage).toBeNull()
	})

	it('shows the cover image when the game has one', () => {
		const card = new GameCardPageObject({
			entry: makeEntry({
				game: { ...makeEntry().game, cover_image_url: 'https://x/cover.png' },
			}),
		})

		expect(card.hasCoverPlaceholder).toBe(false)
		expect(card.coverImage?.src).toBe('https://x/cover.png')
	})

	it('shows the rating badge only when rating is set', () => {
		expect(
			new GameCardPageObject({ entry: makeEntry({ rating: null }) }).ratingText,
		).toBeNull()
		expect(
			new GameCardPageObject({ entry: makeEntry({ rating: 8 }) }).ratingText,
		).toContain('8/10')
	})

	it('shows the favorite icon only when favorite is true', () => {
		expect(
			new GameCardPageObject({ entry: makeEntry({ favorite: false }) })
				.hasFavoriteIcon,
		).toBe(false)
		expect(
			new GameCardPageObject({ entry: makeEntry({ favorite: true }) })
				.hasFavoriteIcon,
		).toBe(true)
	})

	it('applies the dragging class when dragging is true', () => {
		expect(
			new GameCardPageObject({ entry: makeEntry(), dragging: true }).isDragging,
		).toBe(true)
		expect(new GameCardPageObject({ entry: makeEntry() }).isDragging).toBe(
			false,
		)
	})
})
