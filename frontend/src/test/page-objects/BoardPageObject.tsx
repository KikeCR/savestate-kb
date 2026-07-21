import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Board } from '../../pages/Board'
import { renderWithProviders } from '../render'
import { STATUS_LABELS, type EntryStatus } from '../../types'

export class BoardPageObject {
	// Radix sets `pointer-events: none` on <body> while the YearSelect popover
	// is open, which would otherwise block userEvent's default click check.
	private user = userEvent.setup({ pointerEventsCheck: 0 })
	private container: HTMLElement

	constructor() {
		const result = renderWithProviders(<Board />, { withAuth: false })
		this.container = result.container
	}

	get errorText(): string | null {
		return this.container.querySelector('.error')?.textContent ?? null
	}

	private columnFor(status: EntryStatus): HTMLElement | undefined {
		return Array.from(
			this.container.querySelectorAll<HTMLElement>('.kanban-column'),
		).find(
			(col) => col.querySelector('h2')?.textContent === STATUS_LABELS[status],
		)
	}

	cardCountFor(status: EntryStatus): number {
		return (
			this.columnFor(status)?.querySelectorAll('.kanban-card-wrapper').length ??
			0
		)
	}

	get yearFilterVisible(): boolean {
		return this.container.querySelector('.year-filter') !== null
	}

	async selectYearFilter(label: string) {
		await this.user.click(
			screen.getByRole('combobox', { name: 'Year played filter' }),
		)
		await this.user.click(await screen.findByRole('option', { name: label }))
	}
}
