import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Library } from '../../pages/Library'
import { STATUS_LABELS, type EntryStatus } from '../../types'
import { renderWithProviders } from '../render'

export class LibraryPageObject {
	// Radix sets `pointer-events: none` on <body> while a Select popover is
	// open, which would otherwise block userEvent's default click check.
	private user = userEvent.setup({ pointerEventsCheck: 0 })
	private container: HTMLElement

	constructor() {
		const result = renderWithProviders(<Library />, { withAuth: false })
		this.container = result.container
	}

	get searchInput() {
		return screen.getByPlaceholderText('Search for a game...')
	}

	get searchButton() {
		return screen.getByRole('button', { name: /Search/ })
	}

	async search(query: string) {
		await this.user.type(this.searchInput, query)
		await this.user.click(this.searchButton)
	}

	get searchResults(): HTMLElement[] {
		return Array.from(this.container.querySelectorAll('.search-results li'))
	}

	async addResult(index: number) {
		const button = this.searchResults[index]?.querySelector('button')
		if (button) await this.user.click(button)
	}

	get errorText(): string | null {
		return this.container.querySelector('.error')?.textContent ?? null
	}

	get entryRows(): HTMLElement[] {
		return Array.from(this.container.querySelectorAll('.entry-list li'))
	}

	get emptyText(): boolean {
		return (
			this.container.textContent?.includes(
				'Nothing tracked yet — search for a game above to get started.',
			) ?? false
		)
	}

	isRemoving(i: number): boolean {
		return this.entryRows[i]?.classList.contains('removing') ?? false
	}

	get toastText(): string | null {
		return this.container.querySelector('.toast__message')?.textContent ?? null
	}

	get toastActionButton(): HTMLButtonElement | null {
		return this.container.querySelector('.toast__action')
	}

	async clickUndo() {
		if (this.toastActionButton) await this.user.click(this.toastActionButton)
	}

	private yearInputAt(i: number): HTMLInputElement {
		return this.entryRows[i]?.querySelector(
			'input[type="number"]',
		) as HTMLInputElement
	}

	private deleteButtonAt(i: number): HTMLButtonElement {
		return this.entryRows[i]?.querySelector(
			'.entry-list__remove',
		) as HTMLButtonElement
	}

	async changeStatus(i: number, status: string) {
		const trigger = within(this.entryRows[i] as HTMLElement).getByRole(
			'combobox',
			{ name: 'Status' },
		)
		await this.user.click(trigger)
		await this.user.click(
			await screen.findByRole('option', {
				name: STATUS_LABELS[status as EntryStatus],
			}),
		)
	}

	async changeRating(i: number, rating: string) {
		const trigger = within(this.entryRows[i] as HTMLElement).getByRole(
			'combobox',
			{ name: 'Rating' },
		)
		await this.user.click(trigger)
		await this.user.click(
			await screen.findByRole('option', {
				name: rating === '' ? 'Unrated' : `${rating}/10`,
			}),
		)
	}

	async changeYear(i: number, year: string) {
		const input = this.yearInputAt(i)
		await this.user.clear(input)
		if (year) await this.user.type(input, year)
		await this.user.tab()
	}

	async deleteAt(i: number) {
		await this.user.click(this.deleteButtonAt(i))
	}

	get yearFilterVisible(): boolean {
		return this.container.querySelector('.year-filter') !== null
	}

	async selectYearFilter(label: string) {
		// Native <select> elements also carry an implicit "combobox" role, so
		// the YearSelect trigger must be looked up by its accessible name to
		// avoid matching the per-row status/rating <select>s too.
		await this.user.click(
			screen.getByRole('combobox', { name: 'Year played filter' }),
		)
		await this.user.click(await screen.findByRole('option', { name: label }))
	}
}
