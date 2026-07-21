import { describe, expect, it } from 'vitest'
import { ENTRY_STATUSES, STATUS_LABELS } from './types'

describe('ENTRY_STATUSES / STATUS_LABELS', () => {
	it('has a label for every entry status', () => {
		for (const status of ENTRY_STATUSES) {
			expect(STATUS_LABELS[status]).toEqual(expect.any(String))
		}
	})

	it('has no extraneous labels beyond the known statuses', () => {
		expect(Object.keys(STATUS_LABELS).sort()).toEqual(
			[...ENTRY_STATUSES].sort(),
		)
	})
})
