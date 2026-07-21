import { describe, expect, it } from 'vitest'
import { KanbanColumnPageObject } from '../../../test/page-objects/KanbanColumnPageObject'
import { makeEntry } from '../../../test/fixtures'
import { STATUS_LABELS } from '../../../types'

describe('KanbanColumn', () => {
	it('renders the status label and entry count', () => {
		const column = new KanbanColumnPageObject({
			status: 'playing',
			entries: [makeEntry({ id: 1 }), makeEntry({ id: 2 })],
		})

		expect(column.heading).toBe(STATUS_LABELS.playing)
		expect(column.count).toBe('2')
		expect(column.cards).toHaveLength(2)
	})

	it('renders zero cards when there are no entries', () => {
		const column = new KanbanColumnPageObject({
			status: 'backlog',
			entries: [],
		})

		expect(column.count).toBe('0')
		expect(column.cards).toHaveLength(0)
	})
})
