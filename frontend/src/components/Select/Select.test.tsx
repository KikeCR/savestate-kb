import { describe, expect, it, vi } from 'vitest'
import { SelectPageObject } from '../../test/page-objects/SelectPageObject'

const options = [
	{ value: 'backlog', label: 'Backlog' },
	{ value: 'playing', label: 'Playing' },
]

describe('Select', () => {
	it('shows the label for the currently selected value', () => {
		const select = new SelectPageObject({
			value: 'playing',
			onValueChange: vi.fn(),
			options,
			ariaLabel: 'Status',
		})

		expect(select.selectedLabel).toBe('Playing')
	})

	it('calls onValueChange with the newly selected option', async () => {
		const onValueChange = vi.fn()
		const select = new SelectPageObject({
			value: 'playing',
			onValueChange,
			options,
			ariaLabel: 'Status',
		})

		await select.selectOption('Backlog')

		expect(onValueChange).toHaveBeenCalledWith('backlog')
	})

	it('exposes the given aria-label on the trigger', () => {
		const select = new SelectPageObject({
			value: 'playing',
			onValueChange: vi.fn(),
			options,
			ariaLabel: 'Status',
		})

		expect(select.trigger.getAttribute('aria-label')).toBe('Status')
	})
})
