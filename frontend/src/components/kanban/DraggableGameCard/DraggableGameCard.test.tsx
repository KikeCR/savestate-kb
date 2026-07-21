import { describe, expect, it } from 'vitest'
import { DraggableGameCardPageObject } from '../../../test/page-objects/DraggableGameCardPageObject'
import { makeEntry } from '../../../test/fixtures'

describe('DraggableGameCard', () => {
	it('renders the wrapped GameCard', () => {
		const card = new DraggableGameCardPageObject(makeEntry())

		expect(card.title).toBe('Celeste')
	})

	// The `--dragging` modifier only appears while dnd-kit's PointerSensor is
	// mid-drag, which requires realistic pointer geometry jsdom doesn't
	// provide — so only the static, non-dragging render is covered here.
	it('does not apply the dragging modifier when idle', () => {
		const card = new DraggableGameCardPageObject(makeEntry())

		expect(card.isDragging).toBe(false)
	})
})
