import { describe, expect, it } from 'vitest'
import { StatusBadgePageObject } from '../../test/page-objects/StatusBadgePageObject'
import { ENTRY_STATUSES, STATUS_LABELS } from '../../types'

describe('StatusBadge', () => {
	it.each(ENTRY_STATUSES)(
		'renders the %s label and modifier class',
		(status) => {
			const badge = new StatusBadgePageObject(status)

			expect(badge.text).toBe(STATUS_LABELS[status])
			expect(badge.className).toContain(`status-badge--${status}`)
		},
	)
})
