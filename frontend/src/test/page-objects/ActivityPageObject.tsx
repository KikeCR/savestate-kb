import { Activity } from '../../pages/Activity'
import { renderWithProviders } from '../render'

export class ActivityPageObject {
	private container: HTMLElement

	constructor() {
		const result = renderWithProviders(<Activity />, { withAuth: false })
		this.container = result.container
	}

	get errorText(): string | null {
		return this.container.querySelector('.error')?.textContent ?? null
	}

	get emptyText(): boolean {
		return this.container.textContent?.includes('No activity yet.') ?? false
	}

	get items(): HTMLElement[] {
		return Array.from(this.container.querySelectorAll('.activity-feed li'))
	}

	hasCoverImage(index: number): boolean {
		return this.items[index]?.querySelector('img') !== null
	}

	hasCoverPlaceholder(index: number): boolean {
		return (
			this.items[index]?.querySelector('.activity-feed__cover-placeholder') !==
			null
		)
	}
}
