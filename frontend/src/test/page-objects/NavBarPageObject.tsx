import { NavBar } from '../../components/NavBar'
import { renderWithProviders } from '../render'

export class NavBarPageObject {
	private container: HTMLElement

	constructor(route = '/dashboard') {
		const { container } = renderWithProviders(<NavBar />, { route })
		this.container = container
	}

	get links(): HTMLAnchorElement[] {
		return Array.from(this.container.querySelectorAll('.nav-bar a'))
	}

	linkFor(label: string): HTMLAnchorElement | null {
		return this.container.querySelector(`a[aria-label="${label}"]`)
	}

	isActive(label: string): boolean {
		return this.linkFor(label)?.classList.contains('active') ?? false
	}
}
