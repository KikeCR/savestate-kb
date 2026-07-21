import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Leaderboards } from '../../pages/Leaderboards'
import { renderWithProviders } from '../render'

export class LeaderboardsPageObject {
	// Radix sets `pointer-events: none` on <body> while the YearSelect popover
	// is open, which would otherwise block userEvent's default click check.
	private user = userEvent.setup({ pointerEventsCheck: 0 })
	private container: HTMLElement

	constructor() {
		const result = renderWithProviders(<Leaderboards />, { withAuth: false })
		this.container = result.container
	}

	get errorText(): string | null {
		return this.container.querySelector('.error')?.textContent ?? null
	}

	private get sections(): HTMLElement[] {
		return Array.from(this.container.querySelectorAll('section'))
	}

	private get completionsSection(): HTMLElement | undefined {
		return this.sections[0]
	}

	private get avgRatingSection(): HTMLElement | undefined {
		return this.sections[1]
	}

	get completionsEmptyText(): string | null {
		return this.completionsSection?.querySelector('p')?.textContent ?? null
	}

	get completionsRows(): HTMLElement[] {
		return Array.from(this.completionsSection?.querySelectorAll('li') ?? [])
	}

	get avgRatingEmptyText(): string | null {
		return this.avgRatingSection?.querySelector('p')?.textContent ?? null
	}

	get avgRatingRows(): HTMLElement[] {
		return Array.from(this.avgRatingSection?.querySelectorAll('li') ?? [])
	}

	async selectYear(label: string) {
		await this.user.click(screen.getByRole('combobox'))
		await this.user.click(await screen.findByRole('option', { name: label }))
	}
}
