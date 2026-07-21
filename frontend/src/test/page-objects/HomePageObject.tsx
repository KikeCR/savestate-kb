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
}
