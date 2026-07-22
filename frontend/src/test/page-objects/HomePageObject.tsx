import { Home } from '../../pages/Home'
import { renderWithProviders } from '../render'

export class HomePageObject {
	private container: HTMLElement

	constructor() {
		const result = renderWithProviders(<Home />)
		this.container = result.container
	}

	get heading(): string | null {
		return this.container.querySelector('h1')?.textContent ?? null
	}

	get hasLoginLink(): boolean {
		return this.container.querySelector('a[href="/login"]') !== null
	}

	get hasDashboardLink(): boolean {
		return this.container.querySelector('a[href="/dashboard"]') !== null
	}

	get showsWelcomeBack(): boolean {
		return this.container.textContent?.includes('Welcome back') ?? false
	}

	get sectionHeadings(): string[] {
		return Array.from(this.container.querySelectorAll('.home-section h2')).map(
			(el) => el.textContent ?? '',
		)
	}

	get popularCardTitles(): string[] {
		return Array.from(
			this.container.querySelectorAll('.popular-game-card__title'),
		).map((el) => el.textContent ?? '')
	}

	get errorText(): string | null {
		return this.container.querySelector('.error')?.textContent ?? null
	}
}
