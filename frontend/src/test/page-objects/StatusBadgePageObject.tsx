import { StatusBadge } from '../../components/StatusBadge'
import { renderWithProviders } from '../render'
import type { EntryStatus } from '../../types'

export class StatusBadgePageObject {
	private container: HTMLElement

	constructor(status: EntryStatus) {
		const { container } = renderWithProviders(<StatusBadge status={status} />, {
			withAuth: false,
		})
		this.container = container
	}

	get text(): string | null {
		return this.container.querySelector('.status-badge')?.textContent ?? null
	}

	get className(): string {
		return this.container.querySelector('.status-badge')?.className ?? ''
	}
}
