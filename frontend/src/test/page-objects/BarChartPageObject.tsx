import { BarChart } from '../../components/BarChart'
import { renderWithProviders } from '../render'

interface BarChartProps {
	data: { label: string; value: number }[]
	emptyMessage?: string
}

export class BarChartPageObject {
	private container: HTMLElement

	constructor(props: BarChartProps) {
		const { container } = renderWithProviders(<BarChart {...props} />, {
			withAuth: false,
		})
		this.container = container
	}

	get emptyMessage(): string | null {
		return (
			this.container.querySelector('.bar-chart__empty')?.textContent ?? null
		)
	}

	get rows(): HTMLElement[] {
		return Array.from(this.container.querySelectorAll('.bar-chart__row'))
	}

	barWidth(label: string): string | null {
		const row = this.rows.find(
			(r) => r.querySelector('.bar-chart__label')?.textContent === label,
		)
		const bar = row?.querySelector('.bar-chart__bar') as HTMLElement | undefined
		return bar?.style.width || null
	}
}
