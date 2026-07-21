import { Logo } from '../../components/Logo'
import { renderWithProviders } from '../render'

export class LogoPageObject {
	private container: HTMLElement

	constructor() {
		const { container } = renderWithProviders(<Logo />)
		this.container = container
	}

	get text(): string | null {
		return this.container.querySelector('.logo__text')?.textContent ?? null
	}

	get link(): HTMLAnchorElement | null {
		return this.container.querySelector('.logo')
	}

	get href(): string | null {
		return this.link?.getAttribute('href') ?? null
	}
}
