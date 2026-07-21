import { describe, expect, it } from 'vitest'
import { StatTilePageObject } from '../../test/page-objects/StatTilePageObject'

describe('StatTile', () => {
	it('renders the label and value', () => {
		const tile = new StatTilePageObject({ label: 'Backlog', value: 12 })

		expect(tile.label).toBe('Backlog')
		expect(tile.value).toBe('12')
		expect(tile.hasIcon).toBe(false)
	})

	it('renders the icon when one is given', () => {
		const tile = new StatTilePageObject({
			label: 'Backlog',
			value: 12,
			icon: <span>icon</span>,
		})

		expect(tile.hasIcon).toBe(true)
	})
})
