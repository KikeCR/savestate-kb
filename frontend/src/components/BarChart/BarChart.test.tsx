import { describe, expect, it } from 'vitest'
import { BarChartPageObject } from '../../test/page-objects/BarChartPageObject'

describe('BarChart', () => {
	it('shows the default empty message when there is no data', () => {
		const chart = new BarChartPageObject({ data: [] })

		expect(chart.emptyMessage).toBe('No data yet.')
	})

	it('shows a custom empty message when provided', () => {
		const chart = new BarChartPageObject({
			data: [],
			emptyMessage: 'Nothing here.',
		})

		expect(chart.emptyMessage).toBe('Nothing here.')
	})

	it('renders one row per datum with a bar width proportional to the max value', () => {
		const chart = new BarChartPageObject({
			data: [
				{ label: 'A', value: 5 },
				{ label: 'B', value: 10 },
			],
		})

		expect(chart.rows).toHaveLength(2)
		expect(chart.barWidth('A')).toBe('50%')
		expect(chart.barWidth('B')).toBe('100%')
	})
})
