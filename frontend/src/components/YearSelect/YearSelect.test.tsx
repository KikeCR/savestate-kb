import { describe, expect, it, vi } from 'vitest'
import { YearSelectPageObject } from '../../test/page-objects/YearSelectPageObject'

const options = [
	{ value: '2023', label: '2023' },
	{ value: '2022', label: '2022' },
]

describe('YearSelect', () => {
	it('shows the label for the currently selected value', () => {
		const select = new YearSelectPageObject({
			value: '2023',
			onValueChange: vi.fn(),
			options,
		})

		expect(select.selectedLabel).toBe('2023')
	})

	it('calls onValueChange with the newly selected option', async () => {
		const onValueChange = vi.fn()
		const select = new YearSelectPageObject({
			value: '2023',
			onValueChange,
			options,
		})

		await select.selectOption('2022')

		expect(onValueChange).toHaveBeenCalledWith('2022')
	})

	it('shows an "All years" option when includeAllOption is true', async () => {
		const withAll = new YearSelectPageObject({
			value: 'all',
			onValueChange: vi.fn(),
			options,
			includeAllOption: true,
		})

		expect(await withAll.hasOption('All years')).toBe(true)
	})

	it('hides the "All years" option when includeAllOption is false', async () => {
		const withoutAll = new YearSelectPageObject({
			value: '2023',
			onValueChange: vi.fn(),
			options,
		})

		expect(await withoutAll.hasOption('All years')).toBe(false)
	})
})
